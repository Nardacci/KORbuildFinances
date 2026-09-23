-- KORbuild Finances
-- Pin search_path on non-definer functions flagged by the security advisor.
-- This removes role-mutable name resolution without changing function logic.

ALTER FUNCTION finances.set_transfers_updated_at() SET search_path = finances, public;
ALTER FUNCTION finances.set_investments_updated_at() SET search_path = finances, public;
ALTER FUNCTION finances.set_crypto_assets_updated_at() SET search_path = finances, public;
ALTER FUNCTION finances.validate_transfer_accounts() SET search_path = finances, public;
ALTER FUNCTION finances.set_updated_at() SET search_path = finances, public;
ALTER FUNCTION finances.validate_investment_transaction_account() SET search_path = finances, public;
ALTER FUNCTION finances.compute_ai_insights() SET search_path = finances, public;
ALTER FUNCTION finances.compute_effective_status(text, boolean, timestamptz, timestamptz, timestamptz, text, timestamptz, timestamptz, integer) SET search_path = finances, public;
