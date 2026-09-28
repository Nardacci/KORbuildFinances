-- Bug reportado ao vivo: alert "permission denied for table goals" ao salvar
-- a Etapa 4 do modo revisão (workspace.html?mode=review -> app.js
-- saveReviewStep4 -> .from('goals').update(...)). Mesma causa raiz do grant
-- de ontem: authenticated nunca recebeu escrita em goals no projeto novo.
-- RLS confirmado antes de aplicar: goals tem RLS habilitado e a policy
-- "Users can update own finance goals" já filtra por workspace_id/auth.uid()
-- via user_workspaces (WITH CHECK). Nenhum INSERT/DELETE client-side em
-- goals (INSERT só ocorre dentro de complete_setup(), SECURITY DEFINER) --
-- confirmado via grep antes de escrever este grant, só UPDATE é necessário.

GRANT UPDATE ON finances.goals TO authenticated;
