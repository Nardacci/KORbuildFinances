-- Auditoria de isolamento entre workspaces: finances.financial_cash_flow e
-- finances.net_worth_by_currency não tinham security_invoker=true nem
-- filtravam por auth.uid() na própria definição -- rodavam com o papel do
-- dono da view, ignorando RLS das tabelas subjacentes por completo. Hoje
-- authenticated não tem SELECT em nenhuma das duas (confirmado antes desta
-- migration, sem vazamento ativo), mas a definição ficava como uma armadilha
-- pronta para vazar dados entre workspaces no dia em que alguém concedesse
-- SELECT nelas. Este ALTER só ativa security_invoker=true -- não concede
-- nenhum privilégio novo a authenticated.

ALTER VIEW finances.financial_cash_flow SET (security_invoker = true);
ALTER VIEW finances.net_worth_by_currency SET (security_invoker = true);
