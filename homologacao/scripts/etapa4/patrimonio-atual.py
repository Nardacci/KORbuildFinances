# Etapa 4 — conferência do "Patrimônio atual" do Planejamento (planning.js:143):
#   se o objetivo marca "considerar patrimônio inicial": usa o valor DECLARADO no assistente (fixo);
#   senão: Σ opening_balance das contas na moeda principal + Σ position_value das posições na moeda principal.
# Compara com o saldo ATUAL das contas (visão account_balances, módulo CTA).   Uso: python3 patrimonio-atual.py
contas=[{'moeda':'BRL','saldo_inicial':1000,'saldo_atual':1172},{'moeda':'BRL','saldo_inicial':500,'saldo_atual':2300},{'moeda':'USD','saldo_inicial':800,'saldo_atual':800}]
posicoes=[{'moeda':'BRL','valor':1500},{'moeda':'BRL','valor':None}]   # None = "Aguardando cotação"
primaria='BRL'
inicial=sum(c['saldo_inicial'] for c in contas if c['moeda']==primaria)
atual=sum(c['saldo_atual'] for c in contas if c['moeda']==primaria)
inv=sum(p['valor'] or 0 for p in posicoes if p['moeda']==primaria)
print('Planejamento (hoje): saldo INICIAL das contas BRL', inicial, '+ posições BRL', inv, '=', inicial+inv)
print('Se usasse o saldo ATUAL das contas BRL:', atual, '+', inv, '=', atual+inv)
print('Diferença ignorada pelo Planejamento:', (atual+inv)-(inicial+inv), '(receitas, despesas e transferências nunca entram)')
print('Posição "Aguardando cotação" entra como 0; conta em USD não entra (sem conversão).')
print('Com "considerar patrimônio inicial" marcado e valor declarado 20000: patrimônio atual = 20000 para sempre, independentemente das contas.')
