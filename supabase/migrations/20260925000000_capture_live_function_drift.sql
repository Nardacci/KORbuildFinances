-- KORbuild Finances
-- Captures functions that exist live in production (qasjgklmivxpisqfhngx)
-- with a body/signature that diverges from -- or is entirely absent from --
-- the migration history currently committed to this repository.
--
-- Text below was extracted verbatim via pg_get_functiondef() against the
-- live database on 2026-09-25, not retyped from memory. This migration is
-- a snapshot/catch-up, not a functional change: applying it to a database
-- already running this exact code is a no-op (CREATE OR REPLACE).
--
-- Background: this project (qasjgklmivxpisqfhngx) was previously a
-- LabMedSys homologação instance, reset and rebuilt for KORbuild Finances
-- on 2026-09-22 (see docs/PROD_DATABASE_MIGRATION_BASELINE_2026-09-24.md).
-- Several functions below were created or altered directly against that
-- live database after the reset, without a corresponding migration file
-- ever being committed -- this file closes that specific gap for the 7
-- functions identified as part of the Mercado Pago recurring billing /
-- access-control audit on 2026-09-25.

-- update_commercial_pricing: gained a 3rd parameter (p_monthly_price_brl)
-- since the last committed version (which only took p_monthly_price,
-- p_currency). The old 2-argument overload may still exist as dead code;
-- this migration does not drop it.
CREATE OR REPLACE FUNCTION finances.update_commercial_pricing(p_monthly_price numeric, p_currency text, p_monthly_price_brl numeric)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'finances', 'public'
AS $function$
begin
  if not finances.is_finances_admin() then
    raise exception 'not authorized';
  end if;

  if p_monthly_price is not null and p_monthly_price <= 0 then
    raise exception 'monthly_price must be > 0';
  end if;

  if p_monthly_price_brl is not null and p_monthly_price_brl <= 0 then
    raise exception 'monthly_price_brl must be > 0';
  end if;

  insert into finances.commercial_pricing_settings (id, monthly_price, currency, monthly_price_brl, updated_by, updated_at)
  values (true, p_monthly_price, coalesce(nullif(trim(p_currency), ''), 'USD'), p_monthly_price_brl, auth.uid(), now())
  on conflict (id) do update
    set monthly_price = coalesce(p_monthly_price, finances.commercial_pricing_settings.monthly_price),
        currency = coalesce(nullif(trim(p_currency), ''), finances.commercial_pricing_settings.currency, 'USD'),
        monthly_price_brl = coalesce(p_monthly_price_brl, finances.commercial_pricing_settings.monthly_price_brl),
        updated_by = excluded.updated_by,
        updated_at = excluded.updated_at;
end;
$function$
;

-- get_workspace_access_status: gained finances.payment_subscriptions
-- awareness (active / past_due with payment_grace_days-based grace window
-- / canceled with access-until-current_period_end) ahead of the existing
-- workspace_subscriptions trial/grace flow, which remains the fallback
-- when no payment_subscriptions row exists. The committed version of this
-- function (20260915213000_get_workspace_access_status.sql) only has the
-- trial/grace flow.
CREATE OR REPLACE FUNCTION finances.get_workspace_access_status()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'finances', 'public'
AS $function$
declare
  v_workspace_id uuid;
  v_sub finances.workspace_subscriptions%rowtype;
  v_pay finances.payment_subscriptions%rowtype;
  v_now timestamptz := timezone('utc', now());
  v_days_remaining integer;
  v_grace_ends_at timestamptz;
  v_grace_days integer;
begin
  if auth.uid() is null then
    return jsonb_build_object('status','UNAUTHENTICATED','access','BLOCKED');
  end if;

  select id into v_workspace_id from finances.user_workspaces where user_id = auth.uid();
  if v_workspace_id is null then
    return jsonb_build_object('status','NO_WORKSPACE','access','ALLOWED');
  end if;

  select * into v_pay from finances.payment_subscriptions where workspace_id = v_workspace_id;
  if found and v_pay.status = 'active' then
    return jsonb_build_object('status','ACTIVE','access','ALLOWED','billing_status','active');
  end if;

  if found and v_pay.status = 'past_due' then
    select payment_grace_days into v_grace_days from finances.commercial_pricing_settings where id = true;
    v_grace_days := coalesce(v_grace_days, 12);
    if v_pay.past_due_since is not null and v_now < v_pay.past_due_since + make_interval(days => v_grace_days) then
      v_days_remaining := greatest(1, ceil(extract(epoch from (v_pay.past_due_since + make_interval(days => v_grace_days) - v_now)) / 86400.0)::integer);
      return jsonb_build_object('status','PAST_DUE','access','ALLOWED','billing_status','past_due','days_remaining',v_days_remaining);
    end if;
    return jsonb_build_object('status','PAST_DUE','access','BLOCKED','billing_status','past_due');
  end if;

  if found and v_pay.status = 'canceled' then
    if v_pay.current_period_end is not null and v_now < v_pay.current_period_end then
      return jsonb_build_object('status','CANCELED','access','ALLOWED','billing_status','canceled','current_period_end',v_pay.current_period_end);
    end if;
    return jsonb_build_object('status','CANCELED','access','BLOCKED','billing_status','canceled');
  end if;

  -- No payment_subscriptions row, or status in ('trial','pending','paused'):
  -- fall through to the existing trial/workspace_subscriptions flow,
  -- unchanged from before this migration.
  select * into v_sub from finances.workspace_subscriptions where workspace_id = v_workspace_id;
  if not found then
    return jsonb_build_object('status','SETUP_REQUIRED','access','ALLOWED');
  end if;

  if v_sub.status = 'ACTIVE' then
    return jsonb_build_object(
      'status','ACTIVE','access','ALLOWED',
      'trial_enabled',v_sub.trial_enabled,'activation_source',v_sub.activation_source
    );
  end if;

  if v_sub.status in ('SUSPENDED','CANCELLED') then
    return jsonb_build_object('status',v_sub.status,'access','BLOCKED','trial_enabled',v_sub.trial_enabled);
  end if;

  if not coalesce(v_sub.trial_enabled, true) then
    return jsonb_build_object('status','TRIAL_DISABLED','access','ALLOWED','trial_enabled',false);
  end if;

  if v_sub.trial_started_at is null then
    return jsonb_build_object('status','SETUP_REQUIRED','access','ALLOWED','trial_enabled',true);
  end if;

  if v_now < v_sub.trial_ends_at then
    v_days_remaining := greatest(1, ceil(extract(epoch from (v_sub.trial_ends_at - v_now)) / 86400.0)::integer);
    return jsonb_build_object(
      'status','TRIALING','access','ALLOWED','trial_enabled',true,
      'days_remaining',v_days_remaining,
      'trial_started_at',v_sub.trial_started_at,
      'trial_ends_at',v_sub.trial_ends_at,
      'grace_ends_at',v_sub.grace_ends_at
    );
  end if;

  v_grace_ends_at := coalesce(v_sub.grace_ends_at, v_sub.trial_started_at + interval '20 days');
  if v_now < v_grace_ends_at then
    v_days_remaining := greatest(1, ceil(extract(epoch from (v_grace_ends_at - v_now)) / 86400.0)::integer);
    return jsonb_build_object(
      'status','GRACE_PERIOD','access','ALLOWED','trial_enabled',true,
      'days_remaining',v_days_remaining,'grace_ends_at',v_grace_ends_at
    );
  end if;

  return jsonb_build_object('status','BLOCKED','access','BLOCKED','trial_enabled',true,'days_remaining',0);
end;
$function$
;

-- compute_effective_status: the committed version (20260915230000) only
-- takes the 5 trial-related parameters. Live, it was extended to 9
-- parameters with the same payment-awareness as get_workspace_access_status,
-- for use by the admin listing (finances-admin.html) which cannot rely on
-- auth.uid(). The old 5-argument overload may still exist as dead code;
-- this migration does not drop it.
CREATE OR REPLACE FUNCTION finances.compute_effective_status(p_status text, p_trial_enabled boolean, p_trial_started_at timestamp with time zone, p_trial_ends_at timestamp with time zone, p_grace_ends_at timestamp with time zone, p_payment_status text DEFAULT NULL::text, p_payment_past_due_since timestamp with time zone DEFAULT NULL::timestamp with time zone, p_payment_current_period_end timestamp with time zone DEFAULT NULL::timestamp with time zone, p_payment_grace_days integer DEFAULT 12)
 RETURNS text
 LANGUAGE sql
 STABLE
 SET search_path TO 'finances', 'public'
AS $function$
  select case
    when p_payment_status = 'active' then 'ACTIVE'
    when p_payment_status = 'past_due' and p_payment_past_due_since is not null
         and timezone('utc', now()) < p_payment_past_due_since + make_interval(days => coalesce(p_payment_grace_days, 12)) then 'PAST_DUE_GRACE'
    when p_payment_status = 'past_due' then 'BLOCKED'
    when p_payment_status = 'canceled' and p_payment_current_period_end is not null
         and timezone('utc', now()) < p_payment_current_period_end then 'CANCELED_ACTIVE'
    when p_payment_status = 'canceled' then 'BLOCKED'
    when p_status = 'ACTIVE' then 'ACTIVE'
    when p_status in ('SUSPENDED','CANCELLED') then p_status
    when not coalesce(p_trial_enabled, true) then 'TRIAL_DISABLED'
    when p_trial_started_at is null then 'SETUP_REQUIRED'
    when timezone('utc', now()) < p_trial_ends_at then 'TRIALING'
    when timezone('utc', now()) < coalesce(p_grace_ends_at, p_trial_started_at + interval '20 days') then 'GRACE_PERIOD'
    else 'BLOCKED'
  end;
$function$
;

-- get_own_exchange_rates, get_own_payment_subscription, get_payment_settings,
-- update_payment_settings: exist live and are already granted to
-- authenticated by 20260923190000_tighten_finances_function_privileges.sql,
-- but were never created by any committed migration -- that migration
-- assumed they already existed. Added here so a fresh database build
-- from this repo's migrations does not end up with dangling GRANTs on
-- functions that were never created.

CREATE OR REPLACE FUNCTION finances.get_own_exchange_rates()
 RETURNS TABLE(currency text, rate_to_brl numeric, rate_date date)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'finances', 'public'
AS $function$
  select distinct on (r.currency) r.currency, r.rate_to_brl, r.rate_date
  from finances.exchange_rates r
  where r.currency in ('USD', 'EUR')
  order by r.currency, r.rate_date desc;
$function$
;

CREATE OR REPLACE FUNCTION finances.get_own_payment_subscription()
 RETURNS TABLE(status text, amount_brl numeric, current_period_start timestamp with time zone, current_period_end timestamp with time zone, past_due_since timestamp with time zone, cancel_requested_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'finances', 'public'
AS $function$
declare
  v_workspace_id uuid;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  select id into v_workspace_id from finances.user_workspaces where user_id = auth.uid();
  if v_workspace_id is null then
    return;
  end if;

  return query
    select p.status, p.amount_brl, p.current_period_start, p.current_period_end,
           p.past_due_since, p.cancel_requested_at
    from finances.payment_subscriptions p
    where p.workspace_id = v_workspace_id;
end;
$function$
;

CREATE OR REPLACE FUNCTION finances.get_payment_settings()
 RETURNS TABLE(payment_grace_days integer, updated_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'finances', 'public'
AS $function$
begin
  if not finances.is_finances_admin() then
    raise exception 'not authorized';
  end if;

  return query
    select s.payment_grace_days, s.updated_at
    from finances.commercial_pricing_settings s
    where s.id = true;
end;
$function$
;

CREATE OR REPLACE FUNCTION finances.update_payment_settings(p_payment_grace_days integer)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'finances', 'public'
AS $function$
begin
  if not finances.is_finances_admin() then
    raise exception 'not authorized';
  end if;

  if p_payment_grace_days is null or p_payment_grace_days < 0 then
    raise exception 'payment_grace_days must be >= 0';
  end if;

  insert into finances.commercial_pricing_settings (id, payment_grace_days, updated_by, updated_at)
  values (true, p_payment_grace_days, auth.uid(), now())
  on conflict (id) do update
    set payment_grace_days = excluded.payment_grace_days,
        updated_by = excluded.updated_by,
        updated_at = excluded.updated_at;
end;
$function$
;
