# RDP · 01 — Reconhecimento do módulo Receitas e Despesas

Data: 2026-10-13. Escopo: registro, edição, exclusão e lista de receitas e de despesas; totais do mês; despesas por categoria.

## Arquivos do módulo

| Arquivo | Linhas | Papel | Observação |
|---|---|---|---|
| `incomes.html` / `incomes.js` | 0 / 1 | Lista de receitas, 3 totais | tudo em uma linha |
| `income-new.html` / `income-new.js` | 0 / 1 | Nova receita | |
| `income-edit.html` / `income-edit.js` | 0 / 30 | Editar e excluir receita | também chamada pela revisão do assistente (`?return=review`) |
| `expenses.html` / `expenses.js` | 0 / 40 | Lista de despesas, 3 totais, gráfico por categoria | |
| `expense-new.html` / `expense-new.js` | 0 / 5 | Nova despesa | |
| `expense-edit.html` / `expense-edit.js` | 0 / 7 | Editar e excluir despesa | |

## Tabelas e funções usadas

| Objeto | Operações pelas telas | Fonte |
|---|---|---|
| `incomes` | SELECT, INSERT, UPDATE, DELETE | `incomes.js:2`, `income-new.js:2`, `income-edit.js:19,27,29` |
| `expenses` | SELECT (todas as colunas), INSERT, UPDATE, DELETE | `expenses.js:35`, `expense-new.js:5`, `expense-edit.js:5-7` |
| `expense_categories` | somente SELECT | `expenses.js:35`, `expense-new.js:4`, `expense-edit.js:5` |
| `accounts` | SELECT (nome, moeda) para a lista suspensa | `income-new.js:2`, `expense-new.js:4` |
| `user_workspaces` | SELECT | todas |
| Funções do banco | nenhuma | — |
| Regras no banco (repositório) | nenhuma. Regras citadas no diagnóstico de segurança e fora do repositório: moeda da receita = moeda da conta; valor da despesa não negativo | `docs/security-diagnostic.md`, Fase 3 |

## Consumidores dos dados do módulo

Saldo das contas (`account_balances`, módulo CTA), dashboard e visão gerencial (DSH), planejamento (PLN), insights e assistente de IA (IA: `compute_ai_insights` lê despesas realizadas na moeda principal, `20260914233000_ai_insights.sql:60-72`).

## Testes automatizados existentes

| Arquivo | Cobre | Não cobre |
|---|---|---|
| `tests/incomes.spec.js` | criar, editar descrição, excluir (1 caso; cria uma conta e a apaga) | validações, moeda, planejada x realizada, efeito no saldo |
| `tests/expenses.spec.js` | criar, editar descrição, excluir (1 caso; cria a categoria por API, pois não há tela) | moeda, conta, filtros, totais, valores decimais |
| `tests/security-xss.spec.js` | categoria de despesa com código malicioso no dashboard | listas suspensas |

## O que está sem documentação

- Nenhuma descrição de regra de receita ou despesa fora dos textos das telas.
- **Quem cria as categorias de despesa não está no repositório.** Não há tela, nem privilégio de inclusão para o usuário (`20260928000000_...:13-15`), nem inclusão em `complete_setup`. Os testes criam a categoria pelo console (`tests/expenses.spec.js:5-7`). A única pista é a migração de produção "seed_finances_system_reference_data" (`docs/PROD_DATABASE_MIGRATION_BASELINE_2026-09-24.md`). **Ponto para validar** (CT-RDP-01).
- Definição das tabelas, valores aceitos de `status`, `frequency`, `expense_type` e chaves estrangeiras não estão no repositório.
- Recorrência, parcelamento e fechamento de período são citados nas telas como "etapa própria" e não existem (RN-RDP-005, 024, 028).
