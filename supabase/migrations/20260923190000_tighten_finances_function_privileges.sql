-- KORbuild Finances
-- Tighten database function privileges.
-- Client roles may execute only explicitly approved RPCs.
-- Internal/trigger functions remain server-side only.

REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA finances FROM PUBLIC;
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA finances FROM anon;
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA finances FROM authenticated;

GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA finances TO service_role;

GRANT EXECUTE ON FUNCTION finances.admin_activate_workspace_trial(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION finances.complete_setup(jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION finances.compute_effective_status(text, boolean, timestamptz, timestamptz, timestamptz, text, timestamptz, timestamptz, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION finances.delete_investment_transaction(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION finances.get_ai_limits() TO authenticated;
GRANT EXECUTE ON FUNCTION finances.get_commercial_settings() TO authenticated;
GRANT EXECUTE ON FUNCTION finances.get_own_commercial_price() TO authenticated;
GRANT EXECUTE ON FUNCTION finances.get_own_exchange_rates() TO authenticated;
GRANT EXECUTE ON FUNCTION finances.get_own_payment_instructions() TO authenticated;
GRANT EXECUTE ON FUNCTION finances.get_own_payment_subscription() TO authenticated;
GRANT EXECUTE ON FUNCTION finances.get_payment_instructions() TO authenticated;
GRANT EXECUTE ON FUNCTION finances.get_payment_settings() TO authenticated;
GRANT EXECUTE ON FUNCTION finances.get_trial_settings() TO authenticated;
GRANT EXECUTE ON FUNCTION finances.get_workspace_access_control() TO authenticated;
GRANT EXECUTE ON FUNCTION finances.get_workspace_access_status() TO authenticated;
GRANT EXECUTE ON FUNCTION finances.get_workspace_commercial_terms() TO authenticated;
GRANT EXECUTE ON FUNCTION finances.is_finances_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION finances.update_ai_limit(uuid, integer, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION finances.update_commercial_pricing(numeric, text, numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION finances.update_investment_transaction(uuid, text, date, numeric, numeric, numeric, text) TO authenticated;
GRANT EXECUTE ON FUNCTION finances.update_payment_instructions(text, text, text, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION finances.update_payment_settings(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION finances.update_trial_settings(integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION finances.update_workspace_access_control(uuid, text, boolean, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION finances.update_workspace_commercial_terms(uuid, numeric, text) TO authenticated;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA finances
  REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA finances
  REVOKE EXECUTE ON FUNCTIONS FROM anon, authenticated;
