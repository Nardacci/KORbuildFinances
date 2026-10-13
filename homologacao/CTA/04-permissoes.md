# CTA · 04 — Permissões

Não há perfis dentro do módulo: todo usuário com configuração concluída faz tudo no próprio workspace. Quem não concluiu o assistente é levado a `workspace.html` (`account-new.js:8`, `transfers.js:8`).

| Ação | Verificação na tela | Verificação no servidor (o que o código MOSTRA) | Fonte |
|---|---|---|---|
| Ver contas e saldos | sessão + `setup_completed` | SELECT em `account_balances` (visão com `security_invoker`, respeita a RLS do usuário) | `accounts.js:2`; `20260924184000_...:3-4` |
| Criar conta | validações de formulário | INSERT em `accounts` concedido; RLS por workspace (padrão, não visível) | `20260928020000_...:36` |
| Editar conta | filtro por id e workspace | UPDATE concedido | idem |
| Excluir conta | confirmação | DELETE concedido; efeito sobre movimentos desconhecido | idem |
| Ver transferências | filtro por workspace | SELECT concedido | `20260924184500_...:2` |
| Criar transferência | validações de formulário | INSERT concedido; CHECK da mesma moeda; função `validate_transfer_accounts` (conteúdo desconhecido) | `20260928020000_...:41`; `20260913120000_...` |
| Editar transferência | filtro por id e workspace | UPDATE concedido; política `transfers_update_own` | `20260912230000_...:13-31` |
| Excluir transferência | não existe | política `transfers_delete_own` existe, mas DELETE **não** está concedido | `20260912230000_...:33-44`; `20260928020000_...:29-32` |

**Ponto para validar:** se o privilégio DELETE de `transfers` realmente não existe no banco (T-BD-02). Os testes automáticos de transferência tentam apagar por esse caminho na limpeza (`tests/transfers.spec.js:42-58`); se não existir, a limpeza falha em silêncio e deixa registros `TESTE_E2E_`.
