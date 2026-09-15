-- Self-service RPCs for billing.html (end-user view), separate from the
-- admin-gated finances.get_commercial_settings()/get_payment_instructions()
-- used by finances-admin.html. Both resolve the CALLER's own workspace via
-- auth.uid(), same pattern as finances.get_workspace_access_status() --
-- no admin check.
--
-- Named distinctly (get_own_*) from the admin versions to avoid any name
-- collision risk. Note: public.get_payment_instructions() also exists in
-- this same database, but it belongs to the unrelated korbuild (RH/Bonus)
-- product and reads public.payment_instructions -- a different table.
-- billing.js always calls through the finances-schema-scoped client, so
-- there's no risk of accidentally hitting that one.

create or replace function finances.get_own_commercial_price()
returns table(
  monthly_price numeric,
  base_monthly_price numeric,
  price_adjustment_percent numeric,
  currency text
)
language plpgsql
security definer
set search_path = finances, public
as $$
declare
  v_workspace_id uuid;
  v_base numeric;
  v_currency text;
  v_adjustment numeric;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  select id into v_workspace_id from finances.user_workspaces where user_id = auth.uid();
  if v_workspace_id is null then
    return;
  end if;

  select s.monthly_price, s.currency into v_base, v_currency
  from finances.commercial_pricing_settings s where s.id = true;

  select coalesce(t.price_adjustment_percent, 0) into v_adjustment
  from finances.workspace_commercial_terms t where t.workspace_id = v_workspace_id;

  return query select
    case when v_base is null then null else greatest(0, v_base * (1 + coalesce(v_adjustment,0)/100.0)) end,
    v_base,
    coalesce(v_adjustment, 0),
    coalesce(v_currency, 'USD');
end;
$$;

grant execute on function finances.get_own_commercial_price() to authenticated;

create or replace function finances.get_own_payment_instructions()
returns table(
  method text, account_holder text, pix_key text,
  bank_name text, payment_contact text, instructions text
)
language plpgsql
security definer
set search_path = finances, public
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  return query
    select p.method, p.account_holder, p.pix_key, p.bank_name, p.payment_contact, p.instructions
    from finances.payment_instructions p
    where p.id = true;
end;
$$;

grant execute on function finances.get_own_payment_instructions() to authenticated;
