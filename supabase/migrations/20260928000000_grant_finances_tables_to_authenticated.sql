-- Achado durante investigação de um bug de saudação no dashboard: o
-- Promise.all de dashboard.js falha com "permission denied" nas queries de
-- expense_categories e investment_closings, o que interrompe a função ANTES
-- de chegar na linha que atualiza "Olá, <nome>" -- deixando visível o
-- placeholder estático do HTML. A causa raiz não é a saudação; é que a role
-- `authenticated` nunca recebeu GRANT nessas tabelas no projeto novo (RLS já
-- está correto e filtra por auth.uid() via user_workspaces -- confirmado
-- antes de aplicar este grant, para não abrir acesso além do que a policy
-- já restringe).
--
-- Escopo confirmado via grep no código client-side real (mesmo padrão da
-- migration 20260925010000_grant_finances_tables_to_service_role.sql):
--   - expense_categories: só SELECT (sem tela de criação no app; confirmado
--     pelo próprio comentário em tests/expenses.spec.js).
--   - investment_closings / investment_closing_items: só SELECT (checagem
--     de período fechado em investment-launches.js/investment-launch-edit.js
--     e o embed em dashboard.js). RLS já tem policies de INSERT/UPDATE/DELETE
--     nessas duas, mas nada no client as usa hoje -- não concedidas aqui.
--   - setup_drafts: SELECT + INSERT + UPDATE (loadDraft/persistDraft em
--     app.js, upsert). DELETE só ocorre dentro de complete_setup(), que roda
--     SECURITY DEFINER e não precisa de grant para authenticated.

GRANT SELECT ON finances.expense_categories TO authenticated;
GRANT SELECT ON finances.investment_closings TO authenticated;
GRANT SELECT ON finances.investment_closing_items TO authenticated;
GRANT SELECT, INSERT, UPDATE ON finances.setup_drafts TO authenticated;
