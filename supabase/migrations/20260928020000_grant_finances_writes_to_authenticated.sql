-- Auditoria completa de escrita pedida após o bug "permission denied for
-- table goals" na Etapa 4 do modo revisão. authenticated tinha ZERO
-- privilégios de INSERT/UPDATE/DELETE nas 7 tabelas abaixo -- só SELECT
-- havia sido corrigido antes. Ou seja, nenhuma tela do app conseguia
-- criar/editar/excluir conta, receita, despesa, investimento, transferência,
-- objetivo, plano ou os próprios dados do workspace, no projeto novo.
--
-- Antes de qualquer grant, confirmei (nesta ordem, para as 8 tabelas):
--   1. RLS habilitado (relrowsecurity = true) -- confirmado nas 8.
--   2. Toda policy de INSERT/UPDATE/DELETE tem qual/with_check contendo
--      auth.uid() (via EXISTS ... user_workspaces w WHERE w.user_id =
--      auth.uid()), não uma condição genérica -- confirmado nas 22
--      policies das 8 tabelas, nenhuma reprovada.
--   3. Grep no código client-side real para não conceder além do que é
--      usado (mesmo padrão das migrations anteriores de grant):
--        - user_workspaces: só UPDATE (app.js, review Etapa 1). INSERT
--          client-side não existe (workspace é criado dentro de
--          complete_setup(), SECURITY DEFINER).
--        - plans: só UPDATE (app.js, review Etapa 4). Sem INSERT/DELETE
--          client-side (INSERT também é só dentro de complete_setup()).
--        - accounts, incomes, expenses, investments: INSERT + UPDATE +
--          DELETE (telas de criar/editar/excluir de cada uma existem e
--          usam essas 3 operações diretamente).
--        - investment_transactions: só INSERT (investment-launch-new.js).
--          UPDATE/DELETE de lançamento passam pelas RPCs
--          update_investment_transaction/delete_investment_transaction
--          (SECURITY DEFINER), não usam .update()/.delete() direto --
--          não precisam de grant para authenticated.
--        - transfers: INSERT + UPDATE (transfer-new.js/transfer-edit.js).
--          Sem DELETE client-side hoje (a policy de delete existe mas
--          nada no app a usa) -- não concedida, mesmo critério mínimo já
--          usado nas migrations anteriores.

GRANT UPDATE ON finances.user_workspaces TO authenticated;
GRANT UPDATE ON finances.plans TO authenticated;
GRANT INSERT, UPDATE, DELETE ON finances.accounts TO authenticated;
GRANT INSERT, UPDATE, DELETE ON finances.incomes TO authenticated;
GRANT INSERT, UPDATE, DELETE ON finances.expenses TO authenticated;
GRANT INSERT, UPDATE, DELETE ON finances.investments TO authenticated;
GRANT INSERT ON finances.investment_transactions TO authenticated;
GRANT INSERT, UPDATE ON finances.transfers TO authenticated;
