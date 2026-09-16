-- Commercial layer follow-up: trial/grace duration becomes admin-configurable
-- instead of hardcoded 14/20 days in finances.admin_activate_workspace_trial().
-- Lives on finances.commercial_pricing_settings (already the global singleton
-- for commercial config, same id=true / is_finances_admin() pattern as
-- monthly_price/currency) rather than a new table -- no reason for trial
-- config to have a different lifecycle or admin gate than pricing config.
--
-- Decision (2026-09-16): the defensive grace_ends_at fallback inside
-- finances.get_workspace_access_status() and finances.compute_effective_status()
-- stays hardcoded at interval '20 days'. That fallback only fires for a
-- workspace_subscriptions row with grace_ends_at is null, which should never
-- happen once admin_activate_workspace_trial() always stamps it -- if it
-- ever does fire, its output should look visibly different from the
-- configured default, as a signal that something bypassed the normal flow,
-- not silently blend in by mirroring the dynamic config.

-- 1. Config columns on the existing singleton.
alter table finances.commercial_pricing_settings add column if not exists trial_days integer not null default 14;
alter table finances.commercial_pricing_settings add column if not exists grace_days integer not null default 6;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'commercial_pricing_settings_trial_days_check' and conrelid = 'finances.commercial_pricing_settings'::regclass) then
    alter table finances.commercial_pricing_settings add constraint commercial_pricing_settings_trial_days_check check (trial_days > 0);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'commercial_pricing_settings_grace_days_check' and conrelid = 'finances.commercial_pricing_settings'::regclass) then
    alter table finances.commercial_pricing_settings add constraint commercial_pricing_settings_grace_days_check check (grace_days >= 0);
  end if;
end $$;

-- 2. Trial/grace duration RPCs, same admin-gated shape as
--    get_commercial_settings()/update_commercial_pricing() but kept separate
--    so the pricing form and the trial form don't have to round-trip each
--    other's fields on every save.
create or replace function finances.get_trial_settings()
returns table(trial_days integer, grace_days integer, updated_at timestamptz)
language plpgsql
security definer
set search_path = finances, public
as $$
begin
  if not finances.is_finances_admin() then
    raise exception 'not authorized';
  end if;

  return query
    select s.trial_days, s.grace_days, s.updated_at
    from finances.commercial_pricing_settings s
    where s.id = true;
end;
$$;

create or replace function finances.update_trial_settings(
  p_trial_days integer,
  p_grace_days integer
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

  if p_trial_days is null or p_trial_days <= 0 then
    raise exception 'trial_days must be > 0';
  end if;

  if p_grace_days is null or p_grace_days < 0 then
    raise exception 'grace_days must be >= 0';
  end if;

  -- currency defaulted to 'USD' only covers the case where this is the very
  -- first write ever made to the singleton (no pricing saved yet); the
  -- on conflict branch never touches monthly_price/currency, so an existing
  -- price is never clobbered by a trial-settings save.
  insert into finances.commercial_pricing_settings (id, currency, trial_days, grace_days, updated_by, updated_at)
  values (true, 'USD', p_trial_days, p_grace_days, auth.uid(), now())
  on conflict (id) do update
    set trial_days = excluded.trial_days,
        grace_days = excluded.grace_days,
        updated_by = excluded.updated_by,
        updated_at = excluded.updated_at;
end;
$$;

grant execute on function finances.get_trial_settings() to authenticated;
grant execute on function finances.update_trial_settings(integer, integer) to authenticated;

-- 3. finances.admin_activate_workspace_trial() now reads the configured
--    duration instead of hardcoding interval '14 days'/'20 days'. Same guard
--    logic as the previous version (20260916100000): status must still be
--    TRIALING and trial_started_at must still be null.
create or replace function finances.admin_activate_workspace_trial(p_workspace_id uuid)
returns void
language plpgsql
security definer
set search_path = finances, public
as $$
declare
  v_now timestamptz := timezone('utc', now());
  v_existing finances.workspace_subscriptions%rowtype;
  v_trial_days integer;
  v_grace_days integer;
begin
  if not finances.is_finances_admin() then
    raise exception 'not authorized';
  end if;

  select * into v_existing from finances.workspace_subscriptions where workspace_id = p_workspace_id;

  if found and v_existing.status <> 'TRIALING' then
    raise exception 'Trial can only be started for a workspace with TRIALING status';
  end if;

  if found and v_existing.trial_started_at is not null then
    raise exception 'Trial already started for this workspace';
  end if;

  select s.trial_days, s.grace_days into v_trial_days, v_grace_days
  from finances.commercial_pricing_settings s where s.id = true;

  v_trial_days := coalesce(v_trial_days, 14);
  v_grace_days := coalesce(v_grace_days, 6);

  insert into finances.workspace_subscriptions
    (workspace_id, status, trial_enabled, trial_started_at, trial_ends_at, grace_ends_at, updated_at)
  values
    (p_workspace_id, 'TRIALING', true, v_now,
     v_now + make_interval(days => v_trial_days),
     v_now + make_interval(days => v_trial_days + v_grace_days),
     v_now)
  on conflict (workspace_id) do update
    set status = 'TRIALING',
        trial_enabled = true,
        trial_started_at = excluded.trial_started_at,
        trial_ends_at = excluded.trial_ends_at,
        grace_ends_at = excluded.grace_ends_at,
        updated_at = excluded.updated_at;
end;
$$;

grant execute on function finances.admin_activate_workspace_trial(uuid) to authenticated;
