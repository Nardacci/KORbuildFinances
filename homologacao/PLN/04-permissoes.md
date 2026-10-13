# PLN · 04 — Permissões

Sem perfis internos. A tela é só leitura; a escrita de objetivo e plano passa pelo assistente (ACS).

| Ação | Verificação na tela | Verificação no servidor (o que o código MOSTRA) | Fonte |
|---|---|---|---|
| Ver planejamento | sessão + `setup_completed` + filtro por workspace | SELECT em `goals`, `plans`, `accounts`, `investment_positions`, `investment_transactions`, `expenses`, `incomes` (grants de SELECT fora do repositório); RLS por workspace | `planning.js:126-137` |
| Criar objetivo/plano | só no assistente inicial | `complete_setup` (SECURITY DEFINER) | ACS |
| Alterar objetivo/plano | só na revisão | UPDATE em `goals` e `plans` concedido; RLS | `20260928010000_...:11`; `20260928020000_...:35` |
| Criar segundo objetivo, excluir objetivo, alterar taxa projetada | não existe | INSERT/DELETE não concedidos em `goals`/`plans` | `20260928020000_...:16-20` |
| Alterar constantes (cenários, inflação, IR) | não existe | fixas no código | `planning.js:23-24, 176` |

Observação: as constantes de inflação e IR são regras de negócio sem dono definido. Hoje só um desenvolvedor as altera, por mudança de código.
