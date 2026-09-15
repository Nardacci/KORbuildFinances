-- Commercial layer, step 1 of 6 (backfill -> RPC -> billing.html -> visual
-- confirmation -> guard -> smoke test). Isolated on purpose: this migration
-- only creates finances.workspace_subscriptions and grandfathers every
-- workspace that exists today into a safe, non-trial state, BEFORE
-- finances.get_workspace_access_status() or the auth.js guard exist. No
-- page reads this table yet, so this step has zero visible effect.
--
-- Without this, the very first workspace to get a guard-checked page load
-- after the guard ships would have no subscription row -- and while the
-- RPC (next step) is designed to treat "no row" as ALLOWED as a defensive
-- default, this table is the explicit, auditable source of truth for
-- "this workspace is grandfathered", not a behavior we want to depend on
-- silently forever.

create table finances.workspace_subscriptions (
  workspace_id uuid primary key references finances.user_workspaces(id) on delete cascade,
  status text not null default 'TRIALING' check (status in ('TRIALING','ACTIVE','SUSPENDED','CANCELLED')),
  trial_enabled boolean not null default true,
  trial_started_at timestamptz,
  trial_ends_at timestamptz,
  grace_ends_at timestamptz,
  activation_source text check (activation_source is null or activation_source in ('TRIAL','MANUAL','OTHER')),
  activation_reason text,
  activated_at timestamptz,
  activated_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (trial_ends_at is null or trial_started_at is null or trial_ends_at >= trial_started_at)
);

alter table finances.workspace_subscriptions enable row level security;
-- RLS enabled, no policies -- same pattern as finances.ai_workspace_limits /
-- finances.admins: only security-definer RPCs (added in the next step)
-- read or write this table.

-- Grandfather every workspace that exists today: ACTIVE + trial_enabled =
-- false means it never enters the trial/grace calculation at all, no
-- matter what the access-status RPC or guard eventually do with dates.
-- Idempotent (only inserts workspaces missing a row), safe to re-run.
insert into finances.workspace_subscriptions
  (workspace_id, status, trial_enabled, activation_source, activation_reason, activated_at)
select w.id, 'ACTIVE', false, 'MANUAL',
       'Grandfathered -- workspace existed before the commercial layer rollout (2026-09-15)',
       now()
from finances.user_workspaces w
left join finances.workspace_subscriptions s on s.workspace_id = w.id
where s.workspace_id is null;
