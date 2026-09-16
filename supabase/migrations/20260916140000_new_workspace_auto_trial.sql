-- Commercial layer follow-up: every NEW workspace now starts its trial
-- clock automatically at onboarding, instead of sitting in SETUP_REQUIRED/
-- ALLOWED forever until an admin manually runs
-- finances.admin_activate_workspace_trial(). That RPC is admin-gated
-- (finances.is_finances_admin()), so the onboarding flow (finances.
-- complete_setup(), called by the end user via app.js's completeSetup())
-- could never call it directly.
--
-- 1. finances._start_trial_clock(uuid) -- private helper, no grant to
--    authenticated/public. Holds the actual trial/grace computation
--    (read trial_days/grace_days from finances.commercial_pricing_settings,
--    make_interval, upsert into finances.workspace_subscriptions) so it
--    exists in exactly one place. Both public-facing callers keep their own
--    authorization gate and only differ in that:
--      - finances.admin_activate_workspace_trial() keeps requiring
--        is_finances_admin() and its existing-row guard (status must be
--        TRIALING, trial_started_at must still be null) before calling it.
--      - finances.complete_setup() calls it inline, in the same
--        transaction/advisory-lock as the rest of onboarding, right after
--        inserting the new finances.user_workspaces row -- never on the
--        "resume an incomplete draft" branch, where the workspace (and any
--        trial clock already running on it) already exists.
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
        updated_at = excluded.updated_at;
end;
$$;

revoke all on function finances._start_trial_clock(uuid) from public, authenticated;

-- 2. finances.admin_activate_workspace_trial() -- same gate/guard as before
--    (20260916100000), now delegates the actual insert to the shared helper
--    instead of duplicating it.
create or replace function finances.admin_activate_workspace_trial(p_workspace_id uuid)
returns void
language plpgsql
security definer
set search_path = finances, public
as $$
declare
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

  perform finances._start_trial_clock(p_workspace_id);
end;
$$;

grant execute on function finances.admin_activate_workspace_trial(uuid) to authenticated;

-- 3. finances.complete_setup() -- identical to the live version in
--    20260912010000_package_1_financial_integrity.sql, with exactly one
--    addition: `perform finances._start_trial_clock(v_workspace_id);` right
--    after the INSERT that creates a brand-new finances.user_workspaces row.
--    Not added to the ELSE branch (resuming an incomplete draft on an
--    existing workspace_id) -- that workspace already went through this
--    branch once before, so its trial clock (if any) is already running.
CREATE OR REPLACE FUNCTION finances.complete_setup(payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, finances, auth
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_workspace_id uuid;
  v_goal_id uuid;
  v_existing boolean := false;
  v_target numeric;
  v_initial numeric;
  v_years integer;
  v_months integer;
  v_rate numeric := 0;
  v_monthly numeric;
  v_name text;
  v_country text;
  v_currency text;
  v_account text;
  v_account_type text;
  v_account_currency text;
  v_income numeric;
  v_income_desc text;
  v_income_category text;
  v_frequency text;
  v_goal_name text;
  v_start_date date;
  v_include_initial boolean;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Sessão não encontrada.'; END IF;
  IF payload IS NULL OR jsonb_typeof(payload) <> 'object' THEN RAISE EXCEPTION 'Dados de configuração inválidos.'; END IF;

  v_name := NULLIF(btrim(payload->>'name'),'');
  v_country := NULLIF(btrim(payload->>'country'),'');
  v_currency := NULLIF(btrim(payload->>'currency'),'');
  v_account := NULLIF(btrim(payload->>'account'),'');
  v_account_type := NULLIF(btrim(payload->>'accountType'),'');
  v_account_currency := COALESCE(NULLIF(btrim(payload->>'accountCurrency'),''),v_currency);
  v_income_desc := NULLIF(btrim(payload->>'incomeDesc'),'');
  v_income_category := NULLIF(btrim(payload->>'incomeCategory'),'');
  v_frequency := NULLIF(btrim(payload->>'frequency'),'');
  v_goal_name := NULLIF(btrim(payload->>'goalName'),'');
  v_start_date := NULLIF(btrim(payload->>'startDate'),'')::date;
  v_include_initial := COALESCE(NULLIF(btrim(payload->>'includeInitial'),'')::boolean,false);

  IF v_name IS NULL OR v_country IS NULL OR v_currency IS NULL THEN RAISE EXCEPTION 'Preencha nome, país e moeda principal.'; END IF;
  IF v_account IS NULL OR v_account_type IS NULL OR v_account_currency IS NULL THEN RAISE EXCEPTION 'Preencha os dados da conta inicial.'; END IF;
  IF v_income_desc IS NULL OR v_income_category IS NULL OR v_frequency IS NULL THEN RAISE EXCEPTION 'Preencha os dados da receita inicial.'; END IF;
  IF NULLIF(btrim(payload->>'balance'),'') IS NOT NULL AND (payload->>'balance') !~ '^[-+]?[0-9]+([.][0-9]+)?$' THEN RAISE EXCEPTION 'Saldo inicial inválido.'; END IF;
  IF NULLIF(btrim(payload->>'income'),'') IS NULL OR (payload->>'income') !~ '^[+]?[0-9]+([.][0-9]+)?$' THEN RAISE EXCEPTION 'Receita inicial inválida.'; END IF;
  IF NULLIF(btrim(payload->>'goalTarget'),'') IS NULL OR (payload->>'goalTarget') !~ '^[+]?[0-9]+([.][0-9]+)?$' THEN RAISE EXCEPTION 'Meta inválida.'; END IF;
  IF NULLIF(btrim(payload->>'goalYears'),'') IS NULL OR (payload->>'goalYears') !~ '^[0-9]+$' THEN RAISE EXCEPTION 'Prazo da meta inválido.'; END IF;
  IF v_start_date IS NULL THEN RAISE EXCEPTION 'Data inicial inválida.'; END IF;

  v_income := (payload->>'income')::numeric;
  v_target := (payload->>'goalTarget')::numeric;
  v_years := (payload->>'goalYears')::integer;
  v_initial := CASE WHEN v_include_initial THEN COALESCE(NULLIF(btrim(payload->>'initial'),'')::numeric,0) ELSE 0 END;
  IF v_income <= 0 THEN RAISE EXCEPTION 'A receita inicial deve ser maior que zero.'; END IF;
  IF v_target <= 0 THEN RAISE EXCEPTION 'A meta deve ser maior que zero.'; END IF;
  IF v_years <= 0 OR v_years > 100 THEN RAISE EXCEPTION 'O prazo da meta deve estar entre 1 e 100 anos.'; END IF;
  IF v_initial < 0 THEN RAISE EXCEPTION 'O patrimônio inicial não pode ser negativo.'; END IF;
  IF NULLIF(btrim(payload->>'balance'),'') IS NOT NULL AND (payload->>'balance')::numeric < 0 THEN RAISE EXCEPTION 'O saldo inicial não pode ser negativo.'; END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(v_user_id::text, 912345));
  SELECT id, setup_completed INTO v_workspace_id, v_existing FROM finances.user_workspaces WHERE user_id=v_user_id FOR UPDATE;
  IF v_existing THEN RETURN jsonb_build_object('workspace_id',v_workspace_id,'already_complete',true); END IF;

  IF v_workspace_id IS NULL THEN
    INSERT INTO finances.user_workspaces(user_id,display_name,country,primary_currency,setup_completed)
    VALUES(v_user_id,v_name,v_country,v_currency,false) RETURNING id INTO v_workspace_id;
    PERFORM finances._start_trial_clock(v_workspace_id);
  ELSE
    UPDATE finances.user_workspaces SET display_name=v_name,country=v_country,primary_currency=v_currency WHERE id=v_workspace_id;
  END IF;

  INSERT INTO finances.accounts(workspace_id,name,account_type,currency,opening_balance)
  VALUES(v_workspace_id,v_account,v_account_type,v_account_currency,GREATEST(0,COALESCE(NULLIF(btrim(payload->>'balance'),'')::numeric,0)));

  INSERT INTO finances.incomes(workspace_id,description,category,amount,currency,frequency,receipt_day)
  VALUES(v_workspace_id,v_income_desc,v_income_category,v_income,v_currency,v_frequency,NULLIF(payload->>'incomeDay','')::integer);

  v_months := GREATEST(1,v_years*12);
  v_monthly := GREATEST(0,(v_target-v_initial)/v_months);

  INSERT INTO finances.goals(workspace_id,name,target_amount,target_years,start_date,include_initial_wealth,initial_wealth)
  VALUES(v_workspace_id,v_goal_name,v_target,v_years,v_start_date,v_include_initial,v_initial) RETURNING id INTO v_goal_id;

  INSERT INTO finances.plans(workspace_id,goal_id,projected_monthly_contribution,projected_monthly_rate)
  VALUES(v_workspace_id,v_goal_id,v_monthly,v_rate);

  UPDATE finances.user_workspaces SET setup_completed=true WHERE id=v_workspace_id;
  DELETE FROM finances.setup_drafts WHERE user_id=v_user_id;
  RETURN jsonb_build_object('workspace_id',v_workspace_id,'goal_id',v_goal_id,'already_complete',false);
END;
$$;

GRANT EXECUTE ON FUNCTION finances.complete_setup(jsonb) TO authenticated;
