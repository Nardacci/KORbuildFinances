-- Fase 1 (aporte mensal declarado pelo usuário, não mais calculado):
-- finances.complete_setup() deixa de derivar projected_monthly_contribution
-- via (target-initial)/months e passa a gravar direto o valor que o usuário
-- informa no novo campo obrigatório da Etapa 4 do onboarding
-- ("Quanto você espera investir por mês?", payload.monthlyContribution).
-- Idêntica à versão anterior (20260916140000_new_workspace_auto_trial.sql)
-- em tudo mais. projected_monthly_rate permanece 0 (Fase 2, não aqui).
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
  IF NULLIF(btrim(payload->>'monthlyContribution'),'') IS NULL OR (payload->>'monthlyContribution') !~ '^[+]?[0-9]+([.][0-9]+)?$' THEN RAISE EXCEPTION 'Informe quanto pretende investir por mês.'; END IF;
  IF v_start_date IS NULL THEN RAISE EXCEPTION 'Data inicial inválida.'; END IF;

  v_income := (payload->>'income')::numeric;
  v_target := (payload->>'goalTarget')::numeric;
  v_years := (payload->>'goalYears')::integer;
  v_monthly := (payload->>'monthlyContribution')::numeric;
  v_initial := CASE WHEN v_include_initial THEN COALESCE(NULLIF(btrim(payload->>'initial'),'')::numeric,0) ELSE 0 END;
  IF v_income <= 0 THEN RAISE EXCEPTION 'A receita inicial deve ser maior que zero.'; END IF;
  IF v_target <= 0 THEN RAISE EXCEPTION 'A meta deve ser maior que zero.'; END IF;
  IF v_years <= 0 OR v_years > 100 THEN RAISE EXCEPTION 'O prazo da meta deve estar entre 1 e 100 anos.'; END IF;
  IF v_monthly <= 0 THEN RAISE EXCEPTION 'O aporte mensal deve ser maior que zero.'; END IF;
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
