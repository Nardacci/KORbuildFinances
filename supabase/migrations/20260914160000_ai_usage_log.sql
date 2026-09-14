-- Usage log for the finances-ai Edge Function. One row per request
-- attempt (allowed or blocked), used to enforce
-- finances.ai_workspace_limits.monthly_request_limit and to feed the
-- "AI CONSUMPTION" admin section (korbuild repo, commercial-admin.html)
-- with real usage numbers later.
--
-- RLS enabled with no policies: only the finances-ai Edge Function
-- (service role) reads/writes this table -- same reasoning as
-- ai_workspace_limits (cost/billing-adjacent, no direct client access).

create table finances.ai_usage_log (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references finances.user_workspaces(id),
  created_at timestamptz not null default now(),
  feature text not null default 'chat',
  model text,
  input_tokens int,
  output_tokens int,
  latency_ms int,
  status text not null,          -- 'success' | 'error' | 'blocked_budget'
  error_message text
);

alter table finances.ai_usage_log enable row level security;

create index ai_usage_log_workspace_month_idx
  on finances.ai_usage_log (workspace_id, created_at);
