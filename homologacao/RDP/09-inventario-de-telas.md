# RDP · 09 — Inventário de telas e situação

| Tela | Arquivo | Função | Situação (pelo código) | Observações |
|---|---|---|---|---|
| Receitas | `incomes.html` + `incomes.js` | lista, 3 totais | Funciona; testada (1 caso) | limite do mês em UTC; sem filtros |
| Nova receita | `income-new.html` + `income-new.js` | registrar | Funciona; testada | campo de categoria é texto livre |
| Editar receita | `income-edit.html` + `income-edit.js` | alterar, excluir | Funciona; testada | frequência do assistente não é reconhecida |
| Despesas | `expenses.html` + `expenses.js` | lista, 3 totais, por categoria, filtro por situação | Funciona; testada | R$ fixo; limite do mês em UTC |
| Nova despesa | `expense-new.html` + `expense-new.js` | registrar | Funciona se houver categorias | campo de valor de texto |
| Editar despesa | `expense-edit.html` + `expense-edit.js` | alterar, excluir | Funciona; testada | texto sobre período aberto sem função por trás |
| (sem tela) | — | categorias de despesa (criar, editar, excluir) | Inexistente | — |
| (sem tela) | — | recorrência e parcelas | Inexistente | citado nas telas como etapa futura |
| (sem tela) | — | fechamento de período | Inexistente | `monthClosed` devolve sempre falso |
