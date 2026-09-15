-- Commercial admin screen (finances-admin.html), sections 2-5: Standard
-- pricing, Company pricing adjustments, Company access control, Manual
-- payment instructions. All gated by finances.is_finances_admin(), same
-- mold as finances.get_ai_limits()/update_ai_limit(). Tables already exist
-- (finances.commercial_pricing_settings, finances.payment_instructions,
-- finances.workspace_commercial_terms) -- this migration only adds RPCs.

-- 1. Pure helper: same trial/grace/blocked precedence as
--    finances.get_workspace_access_status(), but by parameters instead of
--    auth.uid(), so it can be evaluated per-row for every workspace in an
--    admin listing. Deliberately duplicated rather than refactoring the
--    already-approved self-service function -- keep both in sync if the
--    cycle ever changes.
create or replace function finances.compute_effective_status(
  p_status text,
  p_trial_enabled boolean,
  p_trial_started_at timestamptz,
  p_trial_ends_at timestamptz,
  p_grace_ends_at timestamptz
)
returns text
language sql
stable
as $$
  select case
    when p_status = 'ACTIVE' then 'ACTIVE'
    when p_status in ('SUSPENDED','CANCELLED') then p_status
    when not coalesce(p_trial_enabled, true) then 'TRIAL_DISABLED'
    when p_trial_started_at is null then 'SETUP_REQUIRED'
    when timezone('utc', now()) < p_trial_ends_at then 'TRIALING'
    when timezone('utc', now()) < coalesce(p_grace_ends_at, p_trial_started_at + interval '20 days') then 'GRACE_PERIOD'
    else 'BLOCKED'
  end;
$$;

-- 2/3. Standard pricing (singleton) --------------------------------------

create or replace function finances.get_commercial_settings()
returns table(monthly_price numeric, currency text, updated_at timestamptz)
language plpgsql
security definer
set search_path = finances, public
as $$
begin
  if not finances.is_finances_admin() then
    raise exception 'not authorized';
  end if;

  return query
    select s.monthly_price, s.currency, s.updated_at
    from finances.commercial_pricing_settings s
    where s.id = true;
end;
$$;

create or replace function finances.update_commercial_pricing(
  p_monthly_price numeric,
  p_currency text
)
returns void
language plpgsql
security definer
set search_path = finances, public
as $$
begin
  if not finances.is_finances_admin() then
    raise exception 'not authorized';
  end if;

  if p_monthly_price is not null and p_monthly_price <= 0 then
    raise exception 'monthly_price must be > 0';
  end if;

  insert into finances.commercial_pricing_settings (id, monthly_price, currency, updated_by, updated_at)
  values (true, p_monthly_price, coalesce(nullif(trim(p_currency), ''), 'USD'), auth.uid(), now())
  on conflict (id) do update
    set monthly_price = excluded.monthly_price,
        currency = excluded.currency,
        updated_by = excluded.updated_by,
        updated_at = excluded.updated_at;
end;
$$;

-- 4/5. Manual payment instructions (singleton) ---------------------------

create or replace function finances.get_payment_instructions()
returns table(
  method text, account_holder text, pix_key text,
  bank_name text, payment_contact text, instructions text, updated_at timestamptz
)
language plpgsql
security definer
set search_path = finances, public
as $$
begin
  if not finances.is_finances_admin() then
    raise exception 'not authorized';
  end if;

  return query
    select p.method, p.account_holder, p.pix_key, p.bank_name, p.payment_contact, p.instructions, p.updated_at
    from finances.payment_instructions p
    where p.id = true;
end;
$$;

create or replace function finances.update_payment_instructions(
  p_method text,
  p_account_holder text,
  p_pix_key text,
  p_bank_name text,
  p_payment_contact text,
  p_instructions text
)
returns void
language plpgsql
security definer
set search_path = finances, public
as $$
begin
  if not finances.is_finances_admin() then
    raise exception 'not authorized';
  end if;

  insert into finances.payment_instructions
    (id, method, account_holder, pix_key, bank_name, payment_contact, instructions, updated_by, updated_at)
  values
    (true, coalesce(nullif(trim(p_method), ''), 'PIX'), p_account_holder, p_pix_key, p_bank_name, p_payment_contact, p_instructions, auth.uid(), now())
  on conflict (id) do update
    set method = excluded.method,
        account_holder = excluded.account_holder,
        pix_key = excluded.pix_key,
        bank_name = excluded.bank_name,
        payment_contact = excluded.payment_contact,
        instructions = excluded.instructions,
        updated_by = excluded.updated_by,
        updated_at = excluded.updated_at;
end;
$$;

-- 6/7. Company pricing adjustments (per workspace) -----------------------

create or replace function finances.get_workspace_commercial_terms()
returns table(
  workspace_id uuid, display_name text, country text,
  price_adjustment_percent numeric, notes text
)
language plpgsql
security definer
set search_path = finances, public
as $$
begin
  if not finances.is_finances_admin() then
    raise exception 'not authorized';
  end if;

  return query
    select w.id, w.display_name, w.country,
           coalesce(t.price_adjustment_percent, 0),
           t.notes
    from finances.user_workspaces w
    left join finances.workspace_commercial_terms t on t.workspace_id = w.id
    order by w.display_name;
end;
$$;

create or replace function finances.update_workspace_commercial_terms(
  p_workspace_id uuid,
  p_price_adjustment_percent numeric,
  p_notes text
)
returns void
language plpgsql
security definer
set search_path = finances, public
as $$
begin
  if not finances.is_finances_admin() then
    raise exception 'not authorized';
  end if;

  insert into finances.workspace_commercial_terms
    (workspace_id, price_adjustment_percent, notes, created_by, updated_by, updated_at)
  values
    (p_workspace_id, coalesce(p_price_adjustment_percent, 0), p_notes, auth.uid(), auth.uid(), now())
  on conflict (workspace_id) do update
    set price_adjustment_percent = excluded.price_adjustment_percent,
        notes = excluded.notes,
        updated_by = excluded.updated_by,
        updated_at = excluded.updated_at;
end;
$$;

-- 8/9. Company access control (per workspace) -----------------------------

create or replace function finances.get_workspace_access_control()
returns table(
  workspace_id uuid, display_name text, country text,
  status text, trial_enabled boolean,
  trial_started_at timestamptz, trial_ends_at timestamptz, grace_ends_at timestamptz,
  activation_source text, activation_reason text, activated_at timestamptz,
  effective_status text
)
language plpgsql
security definer
set search_path = finances, public
as $$
begin
  if not finances.is_finances_admin() then
    raise exception 'not authorized';
  end if;

  return query
    select w.id, w.display_name, w.country,
           coalesce(s.status, 'TRIALING'),
           coalesce(s.trial_enabled, true),
           s.trial_started_at, s.trial_ends_at, s.grace_ends_at,
           s.activation_source, s.activation_reason, s.activated_at,
           finances.compute_effective_status(
             coalesce(s.status, 'TRIALING'), coalesce(s.trial_enabled, true),
             s.trial_started_at, s.trial_ends_at, s.grace_ends_at
           )
    from finances.user_workspaces w
    left join finances.workspace_subscriptions s on s.workspace_id = w.id
    order by w.display_name;
end;
$$;

create or replace function finances.update_workspace_access_control(
  p_workspace_id uuid,
  p_status text,
  p_trial_enabled boolean,
  p_activation_source text,
  p_activation_reason text
)
returns void
language plpgsql
security definer
set search_path = finances, public
as $$
begin
  if not finances.is_finances_admin() then
    raise exception 'not authorized';
  end if;

  if p_status not in ('TRIALING','ACTIVE','SUSPENDED','CANCELLED') then
    raise exception 'Invalid commercial status';
  end if;

  if p_activation_source is not null
     and p_activation_source not in ('TRIAL','MANUAL','OTHER') then
    raise exception 'Invalid activation source';
  end if;

  insert into finances.workspace_subscriptions
    (workspace_id, status, trial_enabled, activation_source, activation_reason, activated_at, activated_by, updated_at)
  values
    (p_workspace_id, p_status, coalesce(p_trial_enabled, true), p_activation_source,
     nullif(trim(coalesce(p_activation_reason,'')),''),
     case when p_status = 'ACTIVE' then now() else null end,
     case when p_status = 'ACTIVE' then auth.uid() else null end,
     now())
  on conflict (workspace_id) do update
    set status = excluded.status,
        trial_enabled = excluded.trial_enabled,
        activation_source = excluded.activation_source,
        activation_reason = excluded.activation_reason,
        activated_at = case when excluded.status = 'ACTIVE'
                             then coalesce(finances.workspace_subscriptions.activated_at, timezone('utc', now()))
                             else finances.workspace_subscriptions.activated_at end,
        activated_by = case when excluded.status = 'ACTIVE'
                             then coalesce(finances.workspace_subscriptions.activated_by, auth.uid())
                             else finances.workspace_subscriptions.activated_by end,
        updated_at = excluded.updated_at;
end;
$$;

-- 10. Manual "start trial" action -- admin-triggered equivalent of
--     korbuild's self-service activate_workspace_trial(), without the
--     setup-fee gate. Fills the gap flagged after step 2: nothing else
--     sets trial_started_at/trial_ends_at/grace_ends_at yet.
create or replace function finances.admin_activate_workspace_trial(p_workspace_id uuid)
returns void
language plpgsql
security definer
set search_path = finances, public
as $$
declare
  v_now timestamptz := timezone('utc', now());
  v_existing finances.workspace_subscriptions%rowtype;
begin
  if not finances.is_finances_admin() then
    raise exception 'not authorized';
  end if;

  select * into v_existing from finances.workspace_subscriptions where workspace_id = p_workspace_id;

  if found and v_existing.trial_started_at is not null then
    raise exception 'Trial already started for this workspace';
  end if;

  insert into finances.workspace_subscriptions
    (workspace_id, status, trial_enabled, trial_started_at, trial_ends_at, grace_ends_at, updated_at)
  values
    (p_workspace_id, 'TRIALING', true, v_now, v_now + interval '14 days', v_now + interval '20 days', v_now)
  on conflict (workspace_id) do update
    set status = 'TRIALING',
        trial_enabled = true,
        trial_started_at = excluded.trial_started_at,
        trial_ends_at = excluded.trial_ends_at,
        grace_ends_at = excluded.grace_ends_at,
        updated_at = excluded.updated_at;
end;
$$;

grant execute on function finances.get_commercial_settings() to authenticated;
grant execute on function finances.update_commercial_pricing(numeric, text) to authenticated;
grant execute on function finances.get_payment_instructions() to authenticated;
grant execute on function finances.update_payment_instructions(text, text, text, text, text, text) to authenticated;
grant execute on function finances.get_workspace_commercial_terms() to authenticated;
grant execute on function finances.update_workspace_commercial_terms(uuid, numeric, text) to authenticated;
grant execute on function finances.get_workspace_access_control() to authenticated;
grant execute on function finances.update_workspace_access_control(uuid, text, boolean, text, text) to authenticated;
grant execute on function finances.admin_activate_workspace_trial(uuid) to authenticated;
