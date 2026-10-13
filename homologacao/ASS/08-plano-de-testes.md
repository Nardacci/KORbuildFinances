# ASS · 08 — Plano de testes

Regras: só no ambiente de teste; só registros `TESTE`; nada de alterar ou apagar registro sem o prefixo. **Pagamentos reais nunca:** usar as credenciais de teste (sandbox) do Mercado Pago no projeto de teste, ou só os testes que não chegam ao checkout. Workspaces: `TESTE_TRIAL` (novo), `TESTE_ACTIVE` (admin marcou ACTIVE), `TESTE_PAY` (com assinatura de teste no MP). Valores esperados de `homologacao/scripts/etapa6/`.

| ID | Objetivo | Passos | Resultado esperado | Regra |
|---|---|---|---|---|
| CT-ASS-01 | Relógio do teste | concluir o assistente com `TESTE_TRIAL`; ler `workspace_subscriptions` | `TRIALING`, `trial_ends_at` = início + 14 d, `grace_ends_at` = início + 20 d (ou os dias configurados) | RN-ASS-001 |
| CT-ASS-02 | Dias restantes | abrir `billing.html` no mesmo dia | "14 dias restantes"; dashboard com faixa igual | RN-ASS-004, 021 |
| CT-ASS-03 | Carência | (por SQL no teste) `trial_ends_at` = ontem, `grace_ends_at` = +5 d | GRACE_PERIOD, "5 dias restantes"; faixa "Seu teste encerrou" | RN-ASS-002 |
| CT-ASS-04 | Bloqueio | `grace_ends_at` = ontem | BLOCKED; dashboard redireciona a `billing.html`; "TESTE EXPIRADO" | RN-ASS-002, 022 |
| CT-ASS-05 | Preço exibido | admin: preço 29,90 USD; ajuste −10 % no workspace | "US$ 26,91 / mês" e nota "Ajuste de −10% aplicado sobre US$ 29,90" | RN-ASS-007 |
| CT-ASS-06 | Preço sem definição | admin: preço nulo | "Valor a definir" | RN-ASS-007 |
| CT-ASS-07 | Checkout sem cotação | tabela `exchange_rates` sem USD (ambiente de teste) | mensagem "A cotação para conversão em BRL não está disponível" | RN-ASS-008 |
| CT-ASS-08 | Valor em reais | cotação USD 5,4321 gravada; preço 29,90; ajuste 0 | assinatura criada no MP (sandbox) com R$ 162,42; `payment_subscriptions` = `pending`, `amount_brl` 162,42; evento `subscription_created` | RN-ASS-008, 011 |
| CT-ASS-09 | Ajuste −100 % | ajuste −100 % | erro "valor da assinatura ainda não foi configurado" | RN-ASS-008 |
| CT-ASS-10 | Duplo clique | clicar duas vezes em "Assinar" | uma assinatura; segunda chamada reaproveita o link (evento `subscription_reused`) | RN-ASS-010 |
| CT-ASS-11 | Já assinado | `TESTE_PAY` ativo tenta assinar | cartão de pagamento oculto; pela API: 409 `already_subscribed` | RN-ASS-010, 020 |
| CT-ASS-12 | Retorno do checkout | voltar com `?mp_return=1` | "Confirmando seu pagamento…"; `mp-reconcile-self` chamada; status atualizado | RN-ASS-019 |
| CT-ASS-13 | Webhook aprovado (sandbox) | pagamento aprovado no sandbox | `active`, `current_period_end` = próxima cobrança; evento `payment_approved` | RN-ASS-014 |
| CT-ASS-14 | Webhook rejeitado | parcela rejeitada no sandbox | `past_due`, `past_due_since` preenchido | RN-ASS-014 |
| CT-ASS-15 | **Conciliação desfaz o atraso** | com `TESTE_PAY` em `past_due` e assinatura `authorized` no MP, disparar `mp-reconcile` (`dry_run:false`, com o segredo) | **hoje esperado:** volta a `active`, `past_due_since` nulo; **deve:** permanecer `past_due` | RN-ASS-016, ASS-S01 |
| CT-ASS-16 | Carência de pagamento | `past_due_since` = 13 dias atrás (SQL) | PAST_DUE bloqueado; tela "PAGAMENTO EM ATRASO" | RN-ASS-003 |
| CT-ASS-17 | Cancelar | `TESTE_PAY` ativo com `current_period_end` = +20 d; cancelar | confirmação; "Seu acesso continua até <data>"; acesso ALLOWED até lá. Repetir com `current_period_end` nulo: **hoje** bloqueia na hora | RN-ASS-018, ASS-S05 |
| CT-ASS-18 | Cancelado não ressuscita | após cancelar, simular pagamento aprovado no sandbox | continua `canceled` | RN-ASS-014 |
| CT-ASS-19 | Precedência | `TESTE_PAY` ativo e admin marca SUSPENDED | acesso continua ACTIVE | RN-ASS-002 |
| CT-ASS-20 | **Webhook alcançável?** | ver na plataforma como `mp-webhook` foi publicada (verificação de token) e enviar um aviso de teste do painel do MP | registro de invocação na função; se 401 sem chegar ao código, confirmado ASS-S02 | ASS-S02 |
| CT-ASS-21 | Assinatura do webhook | enviar POST sem `x-signature` | 401 `invalid_signature`; sem segredo configurado, 401 `webhook_not_configured` | RN-ASS-012 |
| CT-ASS-22 | Cotação em fim de semana | disparar `mp-sync-exchange-rate` num sábado | grava a cotação de sexta com `rate_date` de sexta | RN-ASS-023 |
| CT-ASS-23 | Job de cotação existe? | `select jobname from cron.job` | anotar presença de `daily-exchange-rate-sync` | ASS-S09 |
| CT-ASS-24 | Conciliação em lote só escreve com `dry_run:false` | chamar sem o campo | resposta `would_*`, nada gravado | RN-ASS-017 |
| CT-ASS-25 | Texto "14 dias" | admin: `trial_days` = 30; novo workspace | tela ainda diz "14 DIAS" (**hoje**) | RN-ASS-025 |
| CT-ASS-26 | Dados em `payment_events` | inspecionar `raw_payload` de um pagamento de teste | anotar campos pessoais presentes | ASS-S07 |
| CT-ASS-27 | Pagamento com cartão estrangeiro | no sandbox do MP, usar cartão de teste de outro país | assinatura autorizada; anotar o resultado para confirmar a resposta recebida pelo analista | R-ASS-11 |
