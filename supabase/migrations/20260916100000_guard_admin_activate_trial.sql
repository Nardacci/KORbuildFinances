-- Fix: finances.admin_activate_workspace_trial() only checked
-- trial_started_at is null, not the workspace's commercial status. That
-- let an admin start a trial clock on a workspace that is already ACTIVE
-- (paid/manually liberated) or SUSPENDED/CANCELLED -- a business-rule
-- inconsistency, not just a UI gap (finances-admin.js already hides the
-- button in those cases, but the RPC itself must also refuse it).
--
-- Starting a trial only makes sense for a workspace still in TRIALING
-- (the default pre-activation state, including a workspace with no row
-- yet -- coalesced to TRIALING everywhere else in this file) that hasn't
-- had its trial clock started.

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

  if found and v_existing.status <> 'TRIALING' then
    raise exception 'Trial can only be started for a workspace with TRIALING status';
  end if;

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
