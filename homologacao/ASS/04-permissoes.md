# ASS · 04 — Permissões

| Ação | Quem | Verificação na tela | Verificação no servidor | Fonte |
|---|---|---|---|---|
| Ver status, preço e dias restantes | usuário logado | sessão | RPCs `get_workspace_access_status`, `get_own_commercial_price` (SECURITY DEFINER, `auth.uid()`) | `20260925000000_...:77-85`; `20260916120000_...:31-38` |
| Assinar | usuário logado com workspace | botão por status | `mp-create-subscription`: token do usuário validado (`auth.getUser`), workspace do próprio usuário, chave de servidor só depois | `mp-create-subscription/index.ts:26-47` |
| Conciliar o próprio workspace | usuário logado | ao voltar do checkout | `mp-reconcile-self`: idem; nunca aceita id de assinatura do cliente | `mp-reconcile-self/index.ts:75-105` |
| Cancelar | usuário logado | cartão só ACTIVE/PAST_DUE | `mp-cancel-subscription`: idem | `mp-cancel-subscription/index.ts:40-68` |
| Receber avisos | Mercado Pago | — | assinatura HMAC com segredo; sem JWT (depende da publicação sem verificação de token: ver ASS-S02) | `mp-webhook/index.ts:105-117` |
| Conciliar em lote / por item | cron (ou operador com o segredo) | — | cabeçalho `x-cron-secret` igual ao segredo; sem JWT | `mp-reconcile/index.ts:216-218` |
| Sincronizar cotação | cron | — | `x-cron-secret` próprio | `mp-sync-exchange-rate/index.ts:77-78` |
| Alterar preço, dias de teste, status por workspace | administrador | tela admin | RPCs com `is_finances_admin()` | módulo ADM |
| Escrever em `payment_subscriptions`, `payment_events`, `exchange_rates` | só código de servidor (chave de serviço) | — | sem grant a `authenticated` visível; RLS sem políticas (inferido pelo padrão das tabelas comerciais) | `20260925010000_...:15-16` |

Observações:

- Todas as funções chamadas pelo navegador respondem com CORS aberto (`Access-Control-Allow-Origin: *`), o que é aceitável porque exigem o token do usuário.
- As funções de cron comparam o segredo com `!==` (comparação simples). Risco teórico de tempo de resposta; irrelevante neste volume.
