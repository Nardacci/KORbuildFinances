# DSH · 04 — Permissões

Sem perfis internos; as duas telas são somente leitura do próprio workspace.

| Ação | Verificação na tela | Verificação no servidor | Fonte |
|---|---|---|---|
| Ver dashboard | sessão, `setup_completed`, filtro por workspace | SELECT nas 9 fontes (grants fora do repositório, exceto `expense_categories` e `investment_closings` em `20260928000000_...:23-25`); RLS por workspace | `dashboard.js:46-48` |
| Faixa de teste | — | RPC `get_workspace_access_status` (SECURITY DEFINER) | `20260923190000_...:26` |
| Ver Visão gerencial | idem | SELECT em `incomes`, `transfers`, `expenses`, `investment_transactions`, `accounts`, `investments` | `dashboard-movements.js` (`refresh`) |
| Guarda comercial | `auth.js` redireciona usuário BLOCKED para `billing.html` (dashboard e visão gerencial não estão na lista de exceções) | nenhuma | `auth.js:39-53` |

Observação: a Visão gerencial engole erros de permissão (`safe`): se um GRANT faltar, a tela mostra zeros em vez de erro (foi exatamente o caso do dashboard em 2026-09-28, `20260928000000_...:1-9`).
