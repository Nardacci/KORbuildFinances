-- KORbuild Finances
-- Atomic onboarding completion.
-- Applied to the shared Supabase project before this repository migration was added.

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
  v_rate numeric := 1.05;
  v_monthly numeric;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Sessão não encontrada.'; END IF;
  IF payload IS NULL THEN RAISE EXCEPTION 'Dados de configuração ausentes.'; END IF;

  -- Prevent double-submit/concurrent onboarding for the same user.
  PERFORM pg_advisory_xact_lock(hashtextextended(v_user_id::text, 912345));

  SELECT id, setup_completed INTO v_workspace_id, v_existing
  FROM finances.user_workspaces
  WHERE user_id = v_user_id
  FOR UPDATE;

  IF v_existing THEN
    RETURN jsonb_build_object('workspace_id', v_workspace_id, 'already_complete', true);
  END IF;

  IF v_workspace_id IS NULL THEN
    INSERT INTO finances.user_workspaces(user_id,display_name,country,primary_currency,setup_completed)
    VALUES(
      v_user_id,
      NULLIF(btrim(payload->>'name'),''),
      NULLIF(btrim(payload->>'country'),''),
      NULLIF(btrim(payload->>'currency'),''),
      false
    )
    RETURNING id INTO v_workspace_id;
  ELSE
    UPDATE finances.user_workspaces
       SET display_name = NULLIF(btrim(payload->>'name'),''),
           country = NULLIF(btrim(payload->>'country'),''),
           primary_currency = NULLIF(btrim(payload->>'currency'),'')
     WHERE id = v_workspace_id;
  END IF;

  INSERT INTO finances.accounts(workspace_id,name,account_type,currency,opening_balance)
  VALUES(
    v_workspace_id,
    btrim(payload->>'account'),
    btrim(payload->>'accountType'),
    COALESCE(NULLIF(btrim(payload->>'accountCurrency'),''),btrim(payload->>'currency')),
    GREATEST(0,COALESCE((payload->>'balance')::numeric,0))
  );

  INSERT INTO finances.incomes(workspace_id,description,category,amount,currency,frequency,receipt_day)
  VALUES(
    v_workspace_id,
    btrim(payload->>'incomeDesc'),
    btrim(payload->>'incomeCategory'),
    (payload->>'income')::numeric,
    btrim(payload->>'currency'),
    btrim(payload->>'frequency'),
    NULLIF(payload->>'incomeDay','')::integer
  );

  v_target := (payload->>'goalTarget')::numeric;
  v_years := (payload->>'goalYears')::integer;
  v_initial := CASE
    WHEN COALESCE((payload->>'includeInitial')::boolean,false)
      THEN COALESCE((payload->>'initial')::numeric,0)
    ELSE 0
  END;
  v_months := GREATEST(1,v_years*12);
  v_monthly := CASE
    WHEN v_rate = 0 THEN GREATEST(0,(v_target-v_initial)/v_months)
    ELSE GREATEST(
      0,
      (v_target-v_initial*power(1+v_rate/100,v_months)) /
      ((power(1+v_rate/100,v_months)-1)/(v_rate/100))
    )
  END;

  INSERT INTO finances.goals(workspace_id,name,target_amount,target_years,start_date,include_initial_wealth,initial_wealth)
  VALUES(
    v_workspace_id,
    btrim(payload->>'goalName'),
    v_target,
    v_years,
    (payload->>'startDate')::date,
    COALESCE((payload->>'includeInitial')::boolean,false),
    v_initial
  )
  RETURNING id INTO v_goal_id;

  INSERT INTO finances.plans(workspace_id,goal_id,projected_monthly_contribution,projected_monthly_rate)
  VALUES(v_workspace_id,v_goal_id,v_monthly,v_rate);

  UPDATE finances.user_workspaces SET setup_completed = true WHERE id = v_workspace_id;
  DELETE FROM finances.setup_drafts WHERE user_id = v_user_id;

  RETURN jsonb_build_object(
    'workspace_id',v_workspace_id,
    'goal_id',v_goal_id,
    'already_complete',false
  );
END;
$$;

GRANT EXECUTE ON FUNCTION finances.complete_setup(jsonb) TO authenticated;
COMMENT ON FUNCTION finances.complete_setup(jsonb) IS 'Atomically completes Finances onboarding for the authenticated user; creates workspace, first account, first income, goal and plan.';
