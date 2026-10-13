# Etapa 7 — conferência da ferramenta simulate_expense_scenario (finances-ai/index.ts:498-541) e das bases
# compartilhadas (sumAccountsWealth:267-279, sumMonthlyCapacity:281-293, futureValue:217-221, requiredMonthly:223-229).
# Uso: python3 simulacao-de-cenario.py
def fv(p,m,n,r): r=r/100; return p if not n else p*(1+r)**n + m*(((1+r)**n-1)/r if r else n)
def req(p,t,n,r):
    if t<=p or n<=0: return 0
    r=r/100; gap=t-p*(1+r)**n; return max(0,gap*r/((1+r)**n-1)) if r else gap/n
# dados dos últimos 6 meses (janela: dia 1 de (mês−5) até dia 1 do mês seguinte, inclui o mês atual parcial)
income6=6*5000; expense6=6*3200; cat_alimentacao_6m=6*800
capacity=max(0,(income6-expense6)/6)                 # 1800
wealth=10000+1500                                     # saldo INICIAL das contas + posições (mesma base do Planejamento)
target=100000; months=60; rate=0; monthly_plan=1000
print('capacidade (6 meses ÷ 6) =',capacity,'| patrimônio =',wealth,'| aporte necessário =',round(req(wealth,target,months,rate),2))
print('projeção pela capacidade =',round(fv(wealth,capacity,months,rate),2),'| pelo plano =',round(fv(wealth,monthly_plan,months,rate),2))
pct=-20; cat_avg=cat_alimentacao_6m/6; freed=cat_avg*(-pct/100); cap2=max(0,capacity+freed); proj2=fv(wealth,cap2,months,rate)
print(f'cenário: Alimentação −20% → média da categoria {cat_avg} → libera {freed}/mês → capacidade {cap2} → projeção {proj2:.2f}; bate a meta? {proj2>=target}')
print('delta de patrimônio no prazo =',round(proj2-fv(wealth,capacity,months,rate),2))
print('\nObservações: a taxa do plano é 0 (RN-PLN-001), então toda projeção é linear; a simulação assume que o corte dura todo o prazo;')
print('o patrimônio usa saldo inicial (mesmo defeito RN-PLN-004); project_future_balance ignora o plano e usa a capacidade com taxa 0.')
