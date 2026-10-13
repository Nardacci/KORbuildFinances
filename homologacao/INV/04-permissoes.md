# INV · 04 — Permissões

Sem perfis internos: todo usuário com configuração concluída opera os próprios investimentos. Quem não concluiu o assistente é levado a `workspace.html`.

| Ação | Verificação na tela | Verificação no servidor (o que o código MOSTRA) | Fonte |
|---|---|---|---|
| Ver tipos (sistema + próprios) | filtro `workspace_id` nulo ou próprio | SELECT em `investment_types` (grant fora do repositório); RLS deve liberar linhas sem workspace | `investment-types.js:9` |
| Criar tipo | nome | INSERT (grant fora do repositório); `is_system` sempre falso pela tela | `investment-type-new.js:9` |
| Editar / excluir tipo | não existe | se o grant existir, só pela API; política para tipos do sistema: **Ponto para validar** (INV-S06) | `tests/investment-types.spec.js:24-27` apaga por nome via API |
| Criar investimento | tipo, nome, taxa | INSERT concedido; `expected_monthly_rate NOT NULL` | `20260928020000_...:39`; `20260927150000_...` |
| Editar investimento | tipo/moeda bloqueados se houver lançamentos | UPDATE concedido em todas as colunas; sem trava no banco (até onde se vê) | `20260928020000_...:39` |
| Excluir investimento | só sem lançamentos | DELETE concedido; chave estrangeira de `investment_transactions` desconhecida | idem |
| Ver posições | filtro por workspace | SELECT na visão `investment_positions` (grant e `security_invoker` fora do repositório) | `investments.js:2` |
| Criar lançamento | validações; conta na moeda | INSERT concedido; gatilho confere workspace, conta e moeda | `20260928020000_...:40`; `20260912011000_...` |
| Editar lançamento | mês fechado bloqueia | RPC `update_investment_transaction` (SECURITY DEFINER, corpo desconhecido); sem grant de UPDATE direto | `20260923190000_...:31`; `20260928020000_...:24-28` |
| Excluir lançamento | mês fechado bloqueia | RPC `delete_investment_transaction` (corpo desconhecido); sem grant de DELETE direto | `20260923190000_...:15` |
| Ler fechamentos | — | SELECT em `investment_closings` e `_items` | `20260928000000_...:24-25` |
| Fechar / reabrir período | não existe | sem grant de escrita; só SQL direto | `20260928000000_...:15-18` |

Observação importante: como o usuário não tem UPDATE nem DELETE direto em `investment_transactions`, **tudo o que as duas RPCs não checarem fica sem proteção**. Elas precisam, no mínimo, conferir que o lançamento pertence ao workspace do chamador e (se a regra for essa) que o mês não está fechado. Nada disso é verificável no repositório (INV-S01).
