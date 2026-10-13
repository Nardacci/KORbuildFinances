# Etapa 7 — conferência do limite mensal de chamadas (finances-ai/index.ts:657-680): usado = chamadas com status 'success'
# desde 00:00 UTC do dia 1 do mês; bloqueia quando usado >= limite ou quando desabilitado; o bloqueio também é registrado (status blocked_budget).
# Uso: python3 limite-mensal.py
from datetime import datetime, timezone
def permite(usado, limite, habilitado): return habilitado and usado < limite
for usado,limite,hab in [(99,100,True),(100,100,True),(0,0,True),(5,100,False)]:
    print(f'usado {usado:>3} / limite {limite:>3} / habilitado {hab} → {"permite" if permite(usado,limite,hab) else "bloqueia (429 ai_limit_exceeded)"}')
print('Virada do mês em UTC: às 21:00 de 31/10 em São Paulo (00:00 UTC de 01/11) o contador zera; para a Europa, à 01:00/02:00 do dia 1.')
print('Chamadas com erro (status error) e bloqueadas (blocked_budget) NÃO contam no limite; só as com sucesso.')
