-- Follow-up to 20260916140000_new_workspace_auto_trial.sql: guard
-- finances._start_trial_clock()'s ON CONFLICT against overwriting a
-- workspace that isn't already TRIALING.
--
-- The previous version unconditionally did `set status = 'TRIALING', ...`
-- on conflict, relying entirely on the caller's own guard (admin_activate_
-- workspace_trial()'s "found and status <> 'TRIALING'" check) to prevent
-- it from ever running against an ACTIVE/SUSPENDED/CANCELLED workspace.
-- A plain `do nothing` was considered instead, but that would silently
-- break the one legitimate case that needs the update: an admin manually
-- sets a workspace's status to TRIALING via update_workspace_access_control
-- (which never touches trial_started_at/trial_ends_at/grace_ends_at), then
-- clicks "Iniciar trial" -- the row already exists, both of admin_activate_
-- workspace_trial()'s guards pass, and this insert conflicts.
--
-- Decision (2026-09-16): add `where workspace_subscriptions.status =
-- 'TRIALING'` to the DO UPDATE clause itself. This keeps the legitimate
-- admin flow working (existing row already TRIALING, dates get filled)
-- while making the helper defend itself against ever touching a non-
-- TRIALING row on conflict -- even if some future caller forgets to
-- replicate admin_activate_workspace_trial()'s own guard. complete_setup()
-- is unaffected either way: it only calls this right after inserting a
-- brand-new user_workspaces row (via RETURNING), so no conflict can occur
-- there.
create or replace function finances._start_trial_clock(p_workspace_id uuid)
returns void
language plpgsql
security definer
set search_path = finances, public
as $$
declare
  v_now timestamptz := timezone('utc', now());
  v_trial_days integer;
  v_grace_days integer;
begin
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
        updated_at = excluded.updated_at
    where workspace_subscriptions.status = 'TRIALING';
end;
$$;

-- No grant statement needed -- this function already has no grant to
-- public/authenticated (revoked in 20260916140000) and CREATE OR REPLACE
-- doesn't change existing grants on a matching signature.
