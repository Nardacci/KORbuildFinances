-- KORbuild Finances-only super admin surface for AI consumption limits.
-- Isolated on purpose from the korbuild (RH/Bonus) product: these live in
-- the finances schema and gate on finances.is_finances_admin() /
-- finances.admins, never on public.is_korbuild_super_admin() /
-- korbuild_admins (those stay untouched in the korbuild repo, still
-- powering the old commercial-admin.html AI CONSUMPTION section for
-- korbuild admins).
--
-- Same body as public.get_finances_ai_limits()/public.update_finances_ai_limit()
-- (korbuild repo, 20260914150000_finances_ai_workspace_limits.sql and
-- 20260915153000_finances_ai_limits_usage.sql) -- duplicated rather than
-- repointed, so the korbuild screen keeps working unchanged.
--
-- finances.admins and finances.is_finances_admin() were already created
-- manually via the SQL Editor before this migration (same reasoning as
-- ai_workspace_limits: not worth a migration for a one-off data/DDL step
-- that predates this file). This migration documents+recreates them
-- idempotently so the repo's schema history stays accurate, then adds the
-- two new functions.

create table if not exists finances.admins (
  user_id uuid primary key references auth.users(id),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table finances.admins enable row level security;
-- RLS enabled, no policies -- only finances.is_finances_admin() (security
-- definer) reads this table; writes are direct SQL, not client RPC.

create or replace function finances.is_finances_admin()
returns boolean
language sql
stable
security definer
set search_path = finances, public
as $$
  select exists (
    select 1 from finances.admins a
    where a.user_id = auth.uid() and a.active = true
  );
$$;

grant execute on function finances.is_finances_admin() to authenticated;

create or replace function finances.get_ai_limits()
returns table(
  workspace_id uuid,
  display_name text,
  country text,
  monthly_request_limit int,
  enabled boolean,
  used_this_month int
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
           coalesce(l.monthly_request_limit, 100),
           coalesce(l.enabled, true),
           (select count(*)::int
            from finances.ai_usage_log u
            where u.workspace_id = w.id
              and u.status = 'success'
              and u.created_at >= date_trunc('month', now() at time zone 'utc'))
    from finances.user_workspaces w
    left join finances.ai_workspace_limits l on l.workspace_id = w.id
    order by w.display_name;
end;
$$;

create or replace function finances.update_ai_limit(
  p_workspace_id uuid,
  p_monthly_request_limit int,
  p_enabled boolean
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

  if p_monthly_request_limit < 0 then
    raise exception 'monthly_request_limit must be >= 0';
  end if;

  insert into finances.ai_workspace_limits (workspace_id, monthly_request_limit, enabled, updated_by, updated_at)
  values (p_workspace_id, p_monthly_request_limit, p_enabled, auth.uid(), now())
  on conflict (workspace_id) do update
    set monthly_request_limit = excluded.monthly_request_limit,
        enabled = excluded.enabled,
        updated_by = excluded.updated_by,
        updated_at = excluded.updated_at;
end;
$$;

grant execute on function finances.get_ai_limits() to authenticated;
grant execute on function finances.update_ai_limit(uuid, int, boolean) to authenticated;
