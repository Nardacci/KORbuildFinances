-- KORbuild Finances
-- Fecha um gap de integridade encontrado no diagnostico de seguranca:
-- transferencias entre contas da mesma moeda so tinham a regra "valor de
-- saida = valor de entrada" validada no client (transfer-new.js). Uma
-- chamada direta a API conseguia gravar, por exemplo, source_amount=100 e
-- destination_amount=999999 entre duas contas BRL, inflando o saldo de
-- destino sem lastro em finances.account_balances.
--
-- Mesma normalizacao de codigo de moeda ja usada em
-- validate_investment_transaction_account() (upper(split_part(...,' — ',1))),
-- para tratar tanto "BRL" quanto "BRL — Real brasileiro" como equivalentes.

ALTER TABLE finances.transfers
  ADD CONSTRAINT transfers_same_currency_amounts_match
  CHECK (
    upper(split_part(trim(source_currency), ' — ', 1)) <> upper(split_part(trim(destination_currency), ' — ', 1))
    OR source_amount = destination_amount
  );

COMMENT ON CONSTRAINT transfers_same_currency_amounts_match ON finances.transfers IS
  'Quando origem e destino estao na mesma moeda, o valor que sai deve ser igual ao que entra — evita inflar saldo sem lastro via chamada direta a API.';
