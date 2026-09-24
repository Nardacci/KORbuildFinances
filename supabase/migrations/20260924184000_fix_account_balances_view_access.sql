-- Allow authenticated users to read account balances through the view
-- while preserving the RLS policies of the underlying finance tables.
alter view finances.account_balances set (security_invoker = true);
grant select on table finances.account_balances to authenticated;
