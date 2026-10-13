# ASS · 01 — Reconhecimento do módulo Assinatura e Comercial

Data: 2026-10-13. Escopo: ciclo de acesso (teste grátis → carência → bloqueio), assinatura mensal pelo Mercado Pago (criação, confirmação, atraso, cancelamento, conciliação), preço em reais pela cotação PTAX, tela de assinatura, faixa de teste no dashboard e guarda de acesso.

## Arquivos do módulo

| Arquivo | Linhas | Papel | Observação |
|---|---|---|---|
| `billing.html` / `billing.js` | 104 / 293 | Tela "Assinatura": status, preço, assinar, cancelar | assistente de IA desligado (`data-ai-assistant="off"`); texto "14 dias" fixo |
| `supabase/functions/mp-create-subscription/index.ts` | 215 | Cria a assinatura recorrente no Mercado Pago | usuário logado |
| `supabase/functions/mp-webhook/index.ts` | 324 | Recebe avisos do Mercado Pago (pagamento e assinatura) | assinatura HMAC; **não consta em `supabase/config.toml`** |
| `supabase/functions/mp-reconcile/index.ts` | 254 | Conciliação em lote a cada 15 min (cron) ou por item | segredo `x-cron-secret`; `dry_run` padrão |
| `supabase/functions/mp-reconcile-self/index.ts` | 154 | Conciliação imediata do próprio workspace ao voltar do checkout | usuário logado |
| `supabase/functions/mp-cancel-subscription/index.ts` | 112 | Cancela a assinatura do próprio workspace | usuário logado |
| `supabase/functions/mp-sync-exchange-rate/index.ts` | 103 | Busca PTAX (USD e EUR) no Banco Central e grava `exchange_rates` | cron (job não versionado) |
| `auth.js:38-62` | — | Guarda comercial (BLOCKED → `billing.html`) | módulo ACS |
| `dashboard.js:10-33` | — | Faixa de teste grátis | módulo DSH |
| SQL | — | `get_workspace_access_status` (versão ao vivo), `compute_effective_status`, `_start_trial_clock`, `get_own_commercial_price`, `get_own_payment_subscription`, `get_own_exchange_rates`, `get_own_payment_instructions`, tabela `workspace_subscriptions` | `supabase/migrations/20260915210000`, `20260915213000`, `20260916120000`, `20260916130000`, `20260916140000`, `20260916150000`, `20260925000000` |

## Tabelas e integrações

| Objeto | Uso | Fonte |
|---|---|---|
| `workspace_subscriptions` | status administrativo e relógio do teste grátis (`TRIALING`, `ACTIVE`, `SUSPENDED`, `CANCELLED`) | DDL em `20260915210000_...:15-29` |
| `payment_subscriptions` | assinatura no Mercado Pago (`pending`, `active`, `past_due`, `canceled`, `paused`); colunas `mp_preapproval_id`, `mp_payer_id`, `amount_brl`, `current_period_start/end`, `past_due_since`, `cancel_requested_at` | DDL **fora do repositório** (migração `20260916160000_mercadopago_recurring_billing.sql` citada em `mp-webhook/index.ts:15` não existe no repositório) |
| `payment_events` | trilha de tudo que aconteceu (`event_type`, `raw_payload`, `error_message`, `processed_at`) | DDL fora do repositório |
| `commercial_pricing_settings` | preço base, moeda, `monthly_price_brl` (não usado pela tela), `trial_days`, `grace_days`, `payment_grace_days` | `20260916130000_...:18-19`; `20260925000000_...:43-48, 273-278` |
| `workspace_commercial_terms` | ajuste percentual por workspace | `20260915230000_...:182-184` |
| `exchange_rates` | `currency`, `rate_to_brl`, `rate_date` (único por moeda e data), `created_at` | `mp-sync-exchange-rate/index.ts:89-92`; `mp-create-subscription/index.ts:117-124` |
| Mercado Pago (API `preapproval`, `v1/payments`) | criar, consultar e cancelar assinatura; consultar pagamento | funções `mp-*` |
| Banco Central (PTAX, Olinda) | cotação de venda USD e EUR | `mp-sync-exchange-rate/index.ts:44, 53` |
| Segredos (nomes) | `MP_ACCESS_TOKEN`, `MP_WEBHOOK_SECRET`, `APP_BASE_URL`, `FINANCES_RECONCILE_CRON_SECRET`, `FINANCES_FX_SYNC_CRON_SECRET`, chaves do Supabase | cabeçalhos das funções |

## Agendamentos

| Job | Frequência | Função | Versionado? |
|---|---|---|---|
| `mp-reconcile-15min` | a cada 15 min, `dry_run=false` | `mp-reconcile` | sim (`20260926000000_mp_reconcile_cron.sql`) |
| `daily-exchange-rate-sync` | diário (inferido) | `mp-sync-exchange-rate` | **não** (citado em `20260926000000_...:8-10`) |

## Testes automatizados existentes

Nenhum para este módulo. `tests/` não cobre `billing.html` nem as edge functions.

## O que está sem documentação

- Tabelas `payment_subscriptions` e `payment_events` e a coluna `payment_grace_days`: a migração que as criou não está no repositório.
- O webhook afirma que `verify_jwt` está desligado em `supabase/config.toml` (`mp-webhook/index.ts:6-7`), mas o arquivo só lista `compute-insights`, `mp-sync-exchange-rate` e `mp-reconcile`. **Inferência:** se a função foi publicada sem a opção de dispensar o token, a plataforma rejeita as chamadas do Mercado Pago antes de o código rodar. O próprio código registra "ZERO invocações" em testes reais (`mp-reconcile/index.ts:4-10`). **Ponto para validar** (CT-ASS-20).
- Não há descrição do ciclo comercial em português para o usuário (termos, carência, o que acontece ao cancelar).
- `get_own_exchange_rates`, `get_own_payment_subscription` e `get_own_payment_instructions` existem e são concedidas, mas `billing.js` não chama nenhuma delas (busca no arquivo). O valor em reais e as instruções de pagamento manual nunca são mostrados.
