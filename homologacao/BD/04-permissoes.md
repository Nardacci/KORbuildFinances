# BD · 04 — Permissões (papéis do banco)

## Papéis

| Papel | Quem é | Como entra |
|---|---|---|
| `anon` | visitante sem login (chave publicável do site) | nenhum acesso ao esquema `finances` (`docs/security-diagnostic.md`, Fase 2; `20260923190000:7`) |
| `authenticated` | usuário logado | token de sessão do Supabase Auth |
| administrador do Finances | usuário logado cujo `user_id` está em `finances.admins` com `active = true` | `20260915190000_finances_admin_ai_limits.sql:31-42`; cadastro só por SQL direto (`:28-29`) |
| `service_role` | código do servidor (edge functions, cron) | chave secreta nas variáveis das edge functions |
| `postgres` / dono | operador no painel | fora do escopo |

## Privilégios de tabela concedidos a `authenticated` (o que as migrações MOSTRAM)

| Tabela | SELECT | INSERT | UPDATE | DELETE | Fonte |
|---|---|---|---|---|---|
| `user_workspaces` | ? | — | ✔ | — | `20260928020000:34` |
| `setup_drafts` | ✔ | ✔ | ✔ | — | `20260928000000:26` |
| `accounts` | ? | ✔ | ✔ | ✔ | `20260928020000:36` |
| `incomes` | ? | ✔ | ✔ | ✔ | `20260928020000:37` |
| `expenses` | ? | ✔ | ✔ | ✔ | `20260928020000:38` |
| `expense_categories` | ✔ | — | — | — | `20260928000000:23` |
| `investments` | ? | ✔ | ✔ | ✔ | `20260928020000:39` |
| `investment_transactions` | ? | ✔ | — (via RPC) | — (via RPC) | `20260928020000:40` |
| `investment_closings`, `investment_closing_items` | ✔ | — | — | — | `20260928000000:24-25` |
| `transfers` | ✔ | ✔ | ✔ | — | `20260924184500:2`; `20260928020000:41` |
| `goals` | ? | — | ✔ | — | `20260928010000:11` |
| `plans` | ? | — | ✔ | — | `20260928020000:35` |
| `account_balances` (visão) | ✔ | | | | `20260924184000:4` |
| `investment_types`, `investment_positions` | ? | ? | ? | ? | nenhuma migração no repositório |
| `financial_cash_flow`, `net_worth_by_currency` (visões) | — | | | | `20260928030000:5-6` diz que `authenticated` não tem SELECT |

"?" = o SELECT (ou a operação) é usado pelas telas, logo existe no banco, mas foi concedido fora do repositório. **Inferência:** veio da migração ao vivo `restore_finances_rls_and_policies` (2026-09-22). **Ponto para validar** contra o banco de teste.

Depois do privilégio de tabela, a RLS ainda filtra por workspace do usuário (RN-BD-001).

## Funções (RPC) que `authenticated` pode executar

Lista completa em `20260923190000_tighten_finances_function_privileges.sql:12-36`. Divisão por quem de fato consegue usar:

| Grupo | Funções | Verificação interna |
|---|---|---|
| Usuário comum | `complete_setup`, `get_workspace_access_status`, `get_own_commercial_price`, `get_own_payment_instructions`, `get_own_payment_subscription`, `get_own_exchange_rates`, `is_finances_admin`, `update_investment_transaction`, `delete_investment_transaction`, `compute_effective_status` | usam `auth.uid()` para achar o workspace do próprio usuário |
| Só administrador | `get_ai_limits`, `update_ai_limit`, `get_commercial_settings`, `update_commercial_pricing`, `get_payment_instructions`, `update_payment_instructions`, `get_trial_settings`, `update_trial_settings`, `get_payment_settings`, `update_payment_settings`, `get_workspace_commercial_terms`, `update_workspace_commercial_terms`, `get_workspace_access_control`, `update_workspace_access_control`, `admin_activate_workspace_trial` | todas começam com `if not finances.is_finances_admin() then raise exception 'not authorized'` (ex.: `20260915230000:45-47`) |

## `service_role`

- EXECUTE em todas as funções do esquema (`20260923190000:10`).
- SELECT, INSERT, UPDATE em todas as tabelas, inclusive futuras; sem DELETE (`20260925010000:15-16`).
- Ignora RLS por natureza. Portanto, **cada edge function precisa fazer a própria verificação de autorização** (analisado nos módulos ASS e IA).
