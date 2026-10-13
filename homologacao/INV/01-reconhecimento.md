# INV · 01 — Reconhecimento do módulo Investimentos

Data: 2026-10-13. Escopo: tipos de investimento; cadastro, edição e exclusão de investimentos; carteira (posições, totais); detalhe por investimento; lançamentos (aporte, resgate, rendimento, taxa, ajuste); fechamento de período.

## Arquivos do módulo

| Arquivo | Linhas | Papel | Observação |
|---|---|---|---|
| `investment-types.html` / `investment-types.js` | 2 / 11 | Lista de tipos | sem editar/excluir |
| `investment-type-new.html` / `investment-type-new.js` | 2 / 11 | Novo tipo | |
| `investments.html` / `investments.js` | 3 / 1 | Carteira: posições, totais, excluir | HTML tem script inline que espelha a tabela em cartões para celular (1.190 caracteres) |
| `investment-new.html` / `investment-new.js` | 3 / 14 | Novo investimento | moedas: USD, BRL, EUR (sem GBP) |
| `investment-edit.html` / `investment-edit.js` | 0 / 3 | Editar investimento | bloqueia tipo e moeda se houver lançamentos |
| `investment-detail.html` / `investment-detail.js` | 1 / 1 | Detalhe da posição e últimos 20 lançamentos | |
| `investment-launches.html` / `investment-launches.js` | 3 / 17 | Lista de lançamentos, excluir | |
| `investment-launch-new.html` / `investment-launch-new.js` | 3 / 15 | Novo lançamento | |
| `investment-launch-edit.html` / `investment-launch-edit.js` | 2 / 14 | Editar/excluir lançamento | |

## Tabelas, visões e funções usadas

| Objeto | Operações pelas telas | Fonte |
|---|---|---|
| `investment_types` | SELECT (sistema + workspace), INSERT | `investment-types.js:9`; `investment-type-new.js:9` |
| `investments` | SELECT, INSERT, UPDATE, DELETE | `investment-new.js:12`; `investment-edit.js:3`; `investments.js:2` |
| `investment_positions` (visão) | SELECT (20 colunas) | `investments.js:2`; `investment-detail.js:2` |
| `investment_transactions` | SELECT, INSERT | `investment-launches.js:15`; `investment-launch-new.js:13` |
| RPC `update_investment_transaction` | editar lançamento | `investment-launch-edit.js:11`; **corpo fora do repositório** (só grants em `20260923190000_...:31`) |
| RPC `delete_investment_transaction` | excluir lançamento | `investment-detail.js:2`; `investment-launches.js:13`; `investment-launch-edit.js:12`; **corpo fora do repositório** |
| `investment_closings` | SELECT (`period_start`, `status`) | `investment-launches.js:11`; `investment-detail.js:2`; `investment-launch-edit.js:9` |
| `investment_closing_items` | SELECT (`closing_value`, `currency`) pelo dashboard | `dashboard.js:48` |
| `accounts` | SELECT (nome, moeda) | `investment-launch-new.js:11` |
| Gatilho `trg_validate_investment_transaction_account` | valida conta e moeda do lançamento | `20260912010000_...:115-136`; `20260912011000_...:3-21` |
| Coluna `investments.expected_monthly_rate` | obrigatória desde 2026-09-27 | `20260927150000_investments_expected_monthly_rate.sql:6-7` |
| Privilégios de `authenticated` | `investments` I/U/D; `investment_transactions` só INSERT; `investment_closings` e `_items` só SELECT | `20260928020000_...:39-40`; `20260928000000_...:24-25` |

## Consumidores

Saldo das contas (`account_balances`, CTA), dashboard e visão gerencial (DSH: posições, lançamentos e fechamentos), planejamento (PLN: posições e lançamentos), assistente de IA (IA: `position_value` por moeda).

## Testes automatizados existentes

| Arquivo | Cobre | Não cobre | Observação |
|---|---|---|---|
| `tests/investment-types.spec.js` | criar tipo e listar | edição/exclusão (não existem) | apaga o tipo pelo console filtrando só por nome |
| `tests/investments.spec.js` | criar, editar nome, excluir investimento sem lançamentos | taxa esperada, moeda, bloqueios | cria o tipo pelo console |
| `tests/investment-launches.spec.js` | criar aporte, editar descrição, excluir | resgate, rendimento, taxa, ajuste, período fechado, quantidade/preço | insere o investimento pelo console **sem `expected_monthly_rate`** (`:26-37`) |
| `tests/retroactive-launches.spec.js` | aportes 1, 6 e 12 meses atrás refletindo em visão gerencial e planejamento | — | mesmo problema (`:62-73`) |
| `tests/security-xss.spec.js` | nome de investimento com código malicioso | — | mesmo problema (`:31-42`) |

**Inferência:** desde a migração de 2026-09-27 (`expected_monthly_rate NOT NULL`), as três inserções acima devem falhar com erro de coluna obrigatória, derrubando esses testes. A confirmar no teste (CT-INV-30).

## O que está sem documentação

- **A fórmula da posição não está no repositório.** A visão `investment_positions` calcula quantidade, custo, preço médio, valor da posição, resultado e rentabilidade, mas só seu nome aparece (`docs/PROD_DATABASE_MIGRATION_BASELINE_2026-09-24.md`: "restore_exact_investment_positions_view"). Não dá para conferir a conta lendo código.
- **As duas funções de alterar e excluir lançamento não estão no repositório.** Não se sabe se checam período fechado ou workspace.
- **Nenhuma tela ou rotina grava a cotação atual** (`current_price`): só o cadastro inicial grava nulo (`investment-new.js:12`; busca por escrita em todo o código).
- **Nenhuma tela ou rotina fecha período**: não há escrita em `investment_closings` em telas nem em edge functions; o usuário só tem leitura.
- Tabelas `investments`, `investment_types`, `investment_transactions`, `investment_closings`, `investment_closing_items`: sem DDL no repositório.
- Como a visão lê `parameters` do tipo (método de posição) não está documentado; as telas usam nomes diferentes para o mesmo conceito (RN-INV-004).
