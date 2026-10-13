# Etapa 7 — conferência da regra de insight "categoria acima da média", copiada de
# finances.compute_ai_insights (supabase/migrations/20260914233000_ai_insights.sql:51-152).
# Para cada categoria: meses fechados dos últimos 6 (despesas realizadas, moeda principal); precisa de ≥ 4 meses;
# para cada mês, média e desvio dos OUTROS meses (leave-one-out); "estourou" se total > média_outros + max(desvio_outros, 30% da média_outros);
# gera insight se estourou em ≥ 3 meses E o último mês estourou. Expira em 2 dias.
# Uso: python3 regra-dos-insights.py
from math import sqrt
def avalia(nome, totais):  # totais por mês, em ordem cronológica
    n=len(totais); s=sum(totais); sq=sum(t*t for t in totais)
    if n<4: return (nome, n, 'sem avaliação (menos de 4 meses)')
    estouros=[]
    for t in totais:
        avg=(s-t)/(n-1); var=max(((sq-t*t)-(s-t)**2/(n-1))/(n-1),0); sd=sqrt(var)
        estouros.append(t>avg+max(sd,0.3*avg))
    gera = sum(estouros)>=3 and estouros[-1]
    return (nome, n, f'estouros={estouros} → {"INSIGHT" if gera else "nada"}; média={s/n:.2f}; último={totais[-1]:.2f}')
casos={
 'A estável':            [500,520,480,510,495,505],
 'B subindo no fim':     [500,500,500,500,900,950],        # 2 estouros só
 'C três estouros c/ último': [400,900,400,900,400,900],
 'D três estouros sem o último': [900,900,900,400,400,400],
 'E poucos meses':       [500,900,900],
 'F um gasto gigante':   [500,500,500,500,500,5000],       # desvio dos outros = 0 → 30% da média → estoura só 1 vez
}
for nome,t in casos.items(): print(avalia(nome,t))
print('\nObservações: o mês atual (incompleto) fica fora (só meses fechados); o texto do insight inclui o NOME da categoria,')
print('a média mensal e o total do último mês, e esse texto é enviado à API da Anthropic como contexto do assistente.')
