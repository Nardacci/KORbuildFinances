-- The account_balances security-invoker view reads transfers.
grant select on table finances.transfers to authenticated;
