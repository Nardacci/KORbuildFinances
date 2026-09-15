-- Commercial layer, step 2 of 6 (backfill -> RPC -> billing.html -> visual
-- confirmation -> guard -> smoke test). Still purely additive: no page
-- calls this function yet, so this step has zero visible effect on its
-- own. Simplified cycle (per decision on 2026-09-15): trial (14 days) ->
-- grace (until grace_ends_at) -> blocked. No separate setup-fee gate like
-- korbuild's get_workspace_access_status() -- that complexity was
-- explicitly dropped for this product.
--
-- Fail-safe by design, same reasoning as korbuild's version: a workspace
-- with no finances.workspace_subscriptions row is ALLOWED, never BLOCKED.
-- This is a defensive default, not a substitute for the backfill migration
-- (20260915210000) -- that migration is the actual, auditable source of
-- truth for existing workspaces; this default only protects against a
-- future gap (e.g. a workspace created between two deploys).

create or replace function finances.get_workspace_access_status()
returns jsonb
language plpgsql
security definer
set search_path = finances, public
as $$
declare
  v_workspace_id uuid;
  v_sub finances.workspace_subscriptions%rowtype;
  v_now timestamptz := timezone('utc', now());
  v_days_remaining integer;
  v_grace_ends_at timestamptz;
begin
  if auth.uid() is null then
    return jsonb_build_object('status','UNAUTHENTICATED','access','BLOCKED');
  end if;

  select id into v_workspace_id from finances.user_workspaces where user_id = auth.uid();
  if v_workspace_id is null then
    return jsonb_build_object('status','NO_WORKSPACE','access','ALLOWED');
  end if;

  select * into v_sub from finances.workspace_subscriptions where workspace_id = v_workspace_id;
  if not found then
    return jsonb_build_object('status','SETUP_REQUIRED','access','ALLOWED');
  end if;

  -- Commercial status always has precedence over trial rules.
  if v_sub.status = 'ACTIVE' then
    return jsonb_build_object(
      'status','ACTIVE','access','ALLOWED',
      'trial_enabled',v_sub.trial_enabled,'activation_source',v_sub.activation_source
    );
  end if;

  if v_sub.status in ('SUSPENDED','CANCELLED') then
    return jsonb_build_object('status',v_sub.status,'access','BLOCKED','trial_enabled',v_sub.trial_enabled);
  end if;

  -- Trial disabled means trial UI and expiration rules are fully bypassed.
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
$$;

grant execute on function finances.get_workspace_access_status() to authenticated;
