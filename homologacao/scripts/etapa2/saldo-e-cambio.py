# Etapa 2 — conferência: saldo atual da conta e taxa de câmbio informada.
# Fórmula copiada da visão account_balances (supabase/migrations/20260912010000_package_1_financial_integrity.sql:139-148).
# Uso: python3 saldo-e-cambio.py
from decimal import Decimal as D
opening = D('1000.00')
incomes   = [('realized', D('500.00')), ('planned', D('300.00')), ('canceled', D('50.00'))]
expenses  = [('realized', D('200.00')), ('planned', D('100.00'))]
transfers_out = [D('150.00')]   # source_amount
transfers_in  = [D('80.00')]    # destination_amount
invest = [('contribution', D('100.00')), ('withdrawal', D('40.00')), ('fee', D('5.00')), ('income', D('7.00'))]
s = opening
s += sum(v for st, v in incomes if st == 'realized')
s -= sum(v for st, v in expenses if st == 'realized')
s -= sum(transfers_out); s += sum(transfers_in)
s -= sum(v for t, v in invest if t in ('contribution', 'fee'))
s += sum(v for t, v in invest if t in ('withdrawal', 'income'))
print('Caso 1 saldo: 1000 + 500 - 200 - 150 + 80 - (100+5) + (40+7) =', s, '(esperado 1172.00)')
print('Caso 2 taxa informada (destino/origem, transfer-new.js:7): 520/100 =', D('520')/D('100'), '| 18.5/100 =', D('18.5')/D('100'))
print('Caso 3 despesa de 150 (moeda principal EUR) numa conta USD de 1000: a visão subtrai sem converter =', D('1000.00')-D('150'), 'USD')
print('Caso 4 valor "100.50" digitado vira 10050: diferença para o valor pretendido =', D('10050')-D('100.50'))
