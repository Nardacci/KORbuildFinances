# Etapa 3 — MODELO DE REFERÊNCIA (inferência) para conferir a visão investment_positions no banco de teste.
# A fórmula real da visão NÃO está no repositório. Este script calcula o que a tela e o texto das telas
# levam a esperar, para comparar com o que a visão devolver no teste CT-INV-20. Divergência = ponto para validar.
# Premissas assumidas (cada uma deve ser confirmada):
#  P1 contributions = Σ amount dos lançamentos 'contribution'; withdrawals = Σ 'withdrawal'; income = Σ 'income'; fees = Σ 'fee'
#  P2 quantidade = Σ quantity(contribution) − Σ quantity(withdrawal)
#  P3 preço médio = custo das compras ÷ quantidade comprada (média simples ponderada, sem baixa proporcional no resgate)
#  P4 position_value = quantidade × current_price (tipo com preço de mercado); sem current_price → nulo ('awaiting_price')
#     para tipo de saldo acumulado: contributions − withdrawals + income − fees (+ ajustes)
#  P5 result = position_value − (contributions − withdrawals) + income − fees ; return_pct = result ÷ (contributions − withdrawals) × 100
# Uso: python3 modelo-de-posicao-referencia.py
from decimal import Decimal as D
lanc = [  # (tipo, valor, quantidade, preço unitário)
    ('contribution', D('1000'), D('100'), D('10')),
    ('contribution', D('600'),  D('50'),  D('12')),
    ('income',       D('30'),   None,     None),
    ('fee',          D('5'),    None,     None),
    ('withdrawal',   D('330'),  D('30'),  D('11')),
]
soma = lambda t: sum(v for k, v, *_ in lanc if k == t)
contrib, resg, rend, taxa = soma('contribution'), soma('withdrawal'), soma('income'), soma('fee')
qtd = sum(q for k, v, q, p in lanc if k == 'contribution' and q) - sum(q for k, v, q, p in lanc if k == 'withdrawal' and q)
preco_medio = sum(v for k, v, q, p in lanc if k == 'contribution') / sum(q for k, v, q, p in lanc if k == 'contribution')
print('contributions =', contrib, '| withdrawals =', resg, '| income =', rend, '| fees =', taxa)
print('investido líquido (tela) = contributions − withdrawals =', contrib - resg)
print('quantidade (P2) =', qtd, '| preço médio (P3) =', preco_medio.quantize(D('0.0001')))
for cot in (None, D('12.50')):
    if cot is None:
        print('sem cotação: position_value = nulo → "Aguardando cotação"; result = nulo')
    else:
        pv = qtd * cot
        result = pv - (contrib - resg) + rend - taxa
        print(f'cotação {cot}: position_value (P4) = {pv} | result (P5) = {result} | return_pct = {(result/(contrib-resg)*100).quantize(D("0.01"))}%')
pv_sa = contrib - resg + rend - taxa
print('tipo "saldo acumulado" (P4): position_value =', pv_sa, '| result =', pv_sa - (contrib - resg), '| return_pct =', ((pv_sa-(contrib-resg))/(contrib-resg)*100).quantize(D('0.01')), '%')
