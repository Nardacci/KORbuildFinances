-- Existing investment transactions without an account_id remain valid/editable.
-- New contribution/withdrawal transactions must identify the financial account.
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
  IF TG_OP='INSERT' AND lower(NEW.transaction_type) IN ('contribution','withdrawal') AND NEW.account_id IS NULL THEN
    RAISE EXCEPTION 'Informe a conta financeira usada na operação.';
  END IF;
  RETURN NEW;
END;
$$;