# DSH · 01 — Reconhecimento do módulo Dashboard e Visão gerencial

Data: 2026-10-13. Escopo: `dashboard.html` (métricas do mês, evolução do patrimônio, rosca "Meu mês", despesas por categoria, objetivo rápido, faixa de teste grátis) e `dashboard-movements.html` ("Consolidação Financeira": lista e totais de um mês escolhido).

## Arquivos do módulo

| Arquivo | Linhas | Papel | Observação |
|---|---|---|---|
| `dashboard.html` | 69 | Tela principal após o login | contém nome de pessoa real como texto de espera (ver PLN-S01); menu celular "Perfil" → `settings.html` |
| `dashboard.js` | 49 | Métricas, gráficos (SVG e `conic-gradient`), objetivo, faixa de teste | linha 48 = função `load` inteira (40 instruções) |
| `dashboard.css` | 1 (15 KB) | estilos | fora da análise |
| `dashboard-movements.html` | 0 (1 linha) | Visão gerencial | seletor de mês (12 opções) |
| `dashboard-movements.js` | 1 (8,6 KB) | Consolidação do mês | nome real como padrão de nome de usuário |
| `dashboard-movements.css` | 0 | estilos | fora da análise |

## Tabelas, visões e funções usadas

| Objeto | Dashboard (`dashboard.js:47-48`) | Visão gerencial (`dashboard-movements.js`, função `refresh`) |
|---|---|---|
| RPC `get_workspace_access_status` | faixa de teste grátis | — |
| `goals` | objetivo mais recente | — |
| `accounts` | `opening_balance`, `currency` (patrimônio) | `id`, `name` (rótulos) |
| `incomes` | todas as linhas do workspace (sem filtro de data na consulta) | do mês, por `receipt_date` |
| `investment_positions` | `position_value`, `currency`, `valuation_status` | — |
| `investment_transactions` | do mês anterior e atual | do mês |
| `expenses` | com `paid_date` no mês anterior e atual | com `paid_date` no mês |
| `transfers` | do mês anterior e atual | do mês |
| `expense_categories` | nomes para a rosca | — |
| `investment_closings` + `investment_closing_items` | fechados, em ordem, para a evolução | — |
| `investments` | — | `id`, `name` (rótulos) |
| Escrita | nenhuma | nenhuma |

## Testes automatizados existentes

| Arquivo | Cobre | Não cobre |
|---|---|---|
| `tests/retroactive-launches.spec.js` | totais da Visão gerencial mudam pelo valor lançado no mês certo (receita, despesa, aporte); dashboard do mês atual não muda com lançamentos retroativos | status das receitas, ajustes, moedas, resultado, evolução, deltas |
| `tests/security-xss.spec.js` | nome de categoria com código malicioso na rosca de despesas | — |
| `tests/navigation.spec.js` | menu, links | — |

## O que está sem documentação

- Nenhuma definição do que cada número do dashboard significa (ex.: "Total" da rosca é a soma de entradas, saídas e transferências; "Patrimônio atual" é saldo inicial + posições).
- Nenhuma definição de "Resultado" e "Saídas econômicas" na Visão gerencial.
- Base da "Evolução do patrimônio" (fechamentos de investimento, que ninguém gera pelo app: RN-INV-027).
- A troca de idioma (bandeira) muda só a moeda/formatação e duas palavras; os textos continuam em português (RN-DSH-021).
