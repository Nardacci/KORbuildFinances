# CTA · 01 — Reconhecimento do módulo Contas e Transferências

Data: 2026-10-13. Escopo: cadastro, edição e exclusão de contas; lista de contas com saldo; registro, edição e lista de transferências entre contas; cálculo do saldo atual.

## Arquivos do módulo

| Arquivo | Linhas | Papel | Observação |
|---|---|---|---|
| `accounts.html` / `accounts.js` | 15 / 2 | Lista "Minhas contas", exclusão | JS minificado (lógica toda na linha 2) |
| `account-new.html` / `account-new.js` | 3 / 11 | Nova conta | |
| `account-edit.html` / `account-edit.js` | 2 / 13 | Editar conta | também chamada pela revisão do assistente (`?return=review`) |
| `transfers.html` / `transfers.js` | 0 / 10 | Lista de transferências | HTML minificado em 1 linha |
| `transfer-new.html` / `transfer-new.js` | 0 / 8 | Nova transferência | |
| `transfer-edit.html` / `transfer-edit.js` | 0 / 10 | Editar transferência | **sem link a partir da lista** (ver RN-CTA-018) |

## Tabelas, visões e funções usadas

| Objeto | Operações pelas telas | Fonte |
|---|---|---|
| `accounts` | SELECT (nome, moeda), INSERT, UPDATE, DELETE | `account-new.js:9`, `account-edit.js:11-12`, `accounts.js:2` |
| `account_balances` (visão) | SELECT (saldo atual) | `accounts.js:2`; definição em `supabase/migrations/20260912010000_package_1_financial_integrity.sql:139-148` |
| `transfers` | SELECT, INSERT, UPDATE | `transfers.js:8`, `transfer-new.js:7`, `transfer-edit.js:7,9` |
| `user_workspaces` | SELECT (id, nome, moeda principal, `setup_completed`) | todas as telas |
| Funções do banco | nenhuma chamada direta | — |
| Restrição no banco | `transfers_same_currency_amounts_match` | `20260913120000_transfers_same_currency_amount_match.sql:13-18` |
| Políticas no banco (repositório) | `transfers_update_own`, `transfers_delete_own` | `20260912230000_tighten_finances_transfer_rls_and_rpc_security.sql:13-44` |
| Privilégios de `authenticated` | `accounts` I/U/D; `transfers` S/I/U (sem DELETE); `account_balances` S | `20260928020000_...:36,41`; `20260924184500_...:2`; `20260924184000_...:4` |

## Testes automatizados existentes

| Arquivo | O que cobre | O que NÃO cobre |
|---|---|---|
| `tests/accounts.spec.js` | criar, editar nome, excluir conta (1 caso) | validações, moeda, saldo, conta com movimentos |
| `tests/transfers.spec.js` | criar transferência mesma moeda, listar, editar por URL (1 caso) | câmbio, valores decimais, duplo clique, exclusão |
| `tests/security-transfer-integrity.spec.js` | regra de valores iguais na mesma moeda no banco; câmbio legítimo aceito (2 casos) | mesma conta nos dois lados, contas de outro workspace |

## O que está sem documentação

- Nenhum documento descreve as regras de conta e transferência. As únicas descrições são textos nas telas e comentários em migrações.
- O cálculo do saldo atual só existe como comentário na visão (`...financial_integrity.sql:150`).
- Definição das tabelas `accounts` e `transfers` (colunas, chaves estrangeiras, regra ao excluir conta com movimentos) não está no repositório. **Ponto para validar** (teste T-BD-01 da Etapa 1).
- A função `validate_transfer_accounts` aparece só pelo nome (`20260923191000_harden_finances_function_search_paths.sql:8`). **Inferência:** valida as contas de uma transferência. O texto da regra é desconhecido.
