# Etapa 6 — conferência da busca de cotação PTAX com retrocesso de até 7 dias (mp-sync-exchange-rate/index.ts:27, 61-72).
# Simula um feriado prolongado: a função usa a última cotação disponível e grava rate_date = data da cotação (não a de hoje).
# Uso: python3 ptax-dias-sem-cotacao.py
from datetime import date, timedelta
publicadas={date(2026,10,9):5.41, date(2026,10,8):5.39}   # sexta 09/10 e quinta 08/10; sáb, dom e seg (12/10 feriado) sem cotação
for hoje in [date(2026,10,10), date(2026,10,12), date(2026,10,13), date(2026,10,17)]:
    achou=None
    for i in range(7):
        d=hoje-timedelta(days=i)
        if d in publicadas: achou=(d,publicadas[d]); break
    print(f'hoje {hoje} ({hoje:%a}) → ', f'usa cotação de {achou[0]} = {achou[1]} (rate_date = {achou[0]})' if achou else 'nenhuma cotação em 7 dias → aviso 207, tabela não atualizada')
print('\nObservação: mp-create-subscription pega a linha de exchange_rates com maior rate_date; se o job parar por mais de 7 dias, continua cobrando pela última cotação gravada, sem alerta.')
