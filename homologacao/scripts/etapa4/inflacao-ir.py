# Etapa 4 — conferência de "Poder de compra hoje" e "Valor líquido (após IR)", copiado de planning.js:175-185.
# inflação anual por moeda: BRL 4,5%, USD 2,5%, EUR 2,5%, GBP 3% (planning.js:24); realValue = valor ÷ (1+infl)^anos
# IR (só BRL): dias = meses×30; alíquota 22,5% (≤180 d), 20% (≤360), 17,5% (≤720), 15% (>720);
# ganho = max(0, valor − patrimônio atual − aporte×meses); líquido = valor − ganho×alíquota.   Uso: python3 inflacao-ir.py
INFL={'BRL':0.045,'USD':0.025,'EUR':0.025,'GBP':0.03}
def bracket(months):
    days=months*30
    return 0.225 if days<=180 else 0.20 if days<=360 else 0.175 if days<=720 else 0.15
present, monthly = 10000, 1000
for months, value in [(60, 99836.64), (12, 23339.07), (6, 16766.42)]:
    years=months/12
    for cur in ['BRL','USD']:
        real=value/((1+INFL[cur])**years)
        print(f'{cur} {months:>3} meses: valor {value:,.2f} → poder de compra hoje {real:,.2f} (÷(1+{INFL[cur]})^{years:.2f})')
    gain=max(0, value-present-monthly*months); b=bracket(months); net=value-gain*b
    print(f'    IR (BRL): dias={months*30} → alíquota {b*100:.1f}% ; ganho {gain:,.2f} ; líquido {net:,.2f}')
print('\nObservações:')
print(' - 12 meses = 360 "dias" → cai na faixa de 20% (a regra legal conta dias corridos: 365 dias → 17,5%).')
print(' - A alíquota é aplicada ao ganho acumulado de TODO o horizonte, como se todo o dinheiro tivesse sido aplicado no início;')
print('   aportes mensais mais recentes teriam alíquotas maiores na regra real. É estimativa simplificada, como a tela avisa.')
