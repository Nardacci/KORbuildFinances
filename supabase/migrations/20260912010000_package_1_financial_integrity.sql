-- KORbuild Finances — Package 1: Financial Integrity
-- Safe additive changes: preserves existing rows and UI while consumers migrate.

-- New onboarding uses 0% monthly projection assumption.
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

-- Link investment cash movements to a financial account.
ALTER TABLE finances.investment_transactions ADD COLUMN IF NOT EXISTS account_id uuid;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='investment_transactions_account_id_fkey' AND conrelid='finances.investment_transactions'::regclass) THEN
    ALTER TABLE finances.investment_transactions ADD CONSTRAINT investment_transactions_account_id_fkey FOREIGN KEY (account_id) REFERENCES finances.accounts(id);
  END IF;
END $$;

CREATE OR REPLACE FUNCTION finances.validate_investment_transaction_account()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE acc finances.accounts; inv finances.investments;
BEGIN
  SELECT * INTO inv FROM finances.investments WHERE id=NEW.investment_id AND workspace_id=NEW.workspace_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'O investimento deve pertencer ao mesmo espaço financeiro.'; END IF;
  IF NEW.account_id IS NOT NULL THEN
    SELECT * INTO acc FROM finances.accounts WHERE id=NEW.account_id;
    IF NOT FOUND OR acc.workspace_id <> NEW.workspace_id THEN RAISE EXCEPTION 'A conta deve pertencer ao mesmo espaço financeiro.'; END IF;
    IF upper(split_part(trim(acc.currency),' — ',1)) <> upper(split_part(trim(NEW.currency),' — ',1)) THEN RAISE EXCEPTION 'A moeda da conta deve ser igual à moeda do investimento.'; END IF;
  END IF;
  IF lower(NEW.transaction_type) IN ('contribution','withdrawal') AND NEW.account_id IS NULL THEN
    RAISE EXCEPTION 'Informe a conta financeira usada na operação.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_investment_transaction_account ON finances.investment_transactions;
CREATE TRIGGER trg_validate_investment_transaction_account BEFORE INSERT OR UPDATE ON finances.investment_transactions FOR EACH ROW EXECUTE FUNCTION finances.validate_investment_transaction_account();

-- Canonical current balance for account consumers.
CREATE OR REPLACE VIEW finances.account_balances WITH (security_invoker=true) AS
SELECT a.id,a.workspace_id,a.name,a.account_type,a.currency,a.opening_balance
  + COALESCE((SELECT SUM(i.amount) FROM finances.incomes i WHERE i.account_id=a.id AND i.status='realized'),0)
  - COALESCE((SELECT SUM(e.amount) FROM finances.expenses e WHERE e.account_id=a.id AND e.status='realized'),0)
  - COALESCE((SELECT SUM(t.source_amount) FROM finances.transfers t WHERE t.source_account_id=a.id),0)
  + COALESCE((SELECT SUM(t.destination_amount) FROM finances.transfers t WHERE t.destination_account_id=a.id),0)
  - COALESCE((SELECT SUM(it.amount) FROM finances.investment_transactions it WHERE it.account_id=a.id AND lower(it.transaction_type) IN ('contribution','fee')),0)
  + COALESCE((SELECT SUM(it.amount) FROM finances.investment_transactions it WHERE it.account_id=a.id AND lower(it.transaction_type) IN ('withdrawal','income')),0)
  AS current_balance
FROM finances.accounts a;

COMMENT ON VIEW finances.account_balances IS 'Fonte canônica do saldo atual: saldo inicial + receitas realizadas - despesas realizadas ± transferências ± movimentos de investimento vinculados à conta.';
