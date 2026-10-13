# Etapa 6 — conferência do valor cobrado em BRL, copiado de mp-create-subscription/index.ts:108-141, e do preço exibido
# em billing.html (finances.get_own_commercial_price, 20260916120000_self_service_billing_rpcs.sql:46-50).
# Uso: python3 preco-em-reais.py
from decimal import Decimal as D, ROUND_HALF_UP
def cobrado_brl(base, moeda, ptax, ajuste_pct):
    rate = D(1) if moeda=='BRL' else ptax
    bruto = base*rate*(1+ajuste_pct/D(100))
    return float(round(bruto*100)/100)   # Math.round(x*100)/100 (arredonda para o centavo mais próximo)
def exibido(base, ajuste_pct): return max(D(0), base*(1+ajuste_pct/D(100)))
for base,moeda,ptax,aj in [(D('29.90'),'USD',D('5.4321'),D(0)),(D('29.90'),'USD',D('5.4321'),D(-10)),(D('29.90'),'USD',D('5.4321'),D(15)),(D('150'),'BRL',None,D(0)),(D('25'),'EUR',D('5.9012'),D(-100)),(D('25'),'EUR',D('5.9012'),D(-120))]:
    print(f'base {base} {moeda} | PTAX {ptax} | ajuste {aj}% → exibido na tela: {exibido(base,aj)} {moeda}/mês | cobrado no Mercado Pago: R$ {cobrado_brl(base,moeda,ptax,aj) if (moeda=="BRL" or ptax) else "?"}')
print('\nObservações:')
print(' - A tela mostra o preço na moeda base (ex.: USD); o valor em reais só é calculado no clique, com a PTAX mais recente gravada, e não é mostrado ao usuário antes do redirecionamento (billing.js:88-111 ignora amount_brl).')
print(' - Ajuste de −100% dá R$ 0 → "price_not_configured" (amountBrl <= 0); ajuste abaixo de −100% dá valor negativo → mesmo erro.')
print(' - O valor em reais fica fixo na assinatura (auto_recurring.transaction_amount); a variação da PTAX depois disso não altera a cobrança.')
