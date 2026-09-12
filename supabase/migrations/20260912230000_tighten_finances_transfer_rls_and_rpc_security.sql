-- KORbuild Finances
-- Tighten API privileges for SECURITY DEFINER RPCs and complete transfer RLS.
-- No dashboard/menu/frontend behavior is changed by this migration.

REVOKE ALL ON FUNCTION finances.complete_setup(jsonb) FROM anon;
REVOKE ALL ON FUNCTION finances.update_investment_transaction(uuid,text,date,numeric,numeric,numeric,text) FROM anon;
REVOKE ALL ON FUNCTION finances.delete_investment_transaction(uuid) FROM anon;

GRANT EXECUTE ON FUNCTION finances.complete_setup(jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION finances.update_investment_transaction(uuid,text,date,numeric,numeric,numeric,text) TO authenticated;
GRANT EXECUTE ON FUNCTION finances.delete_investment_transaction(uuid) TO authenticated;

DROP POLICY IF EXISTS transfers_update_own ON finances.transfers;
CREATE POLICY transfers_update_own
ON finances.transfers
FOR UPDATE
TO authenticated
USING (
  workspace_id IN (
    SELECT w.id
    FROM finances.user_workspaces w
    WHERE w.user_id = auth.uid()
  )
)
WITH CHECK (
  workspace_id IN (
    SELECT w.id
    FROM finances.user_workspaces w
    WHERE w.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS transfers_delete_own ON finances.transfers;
CREATE POLICY transfers_delete_own
ON finances.transfers
FOR DELETE
TO authenticated
USING (
  workspace_id IN (
    SELECT w.id
    FROM finances.user_workspaces w
    WHERE w.user_id = auth.uid()
  )
);
