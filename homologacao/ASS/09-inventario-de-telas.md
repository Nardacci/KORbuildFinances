# ASS · 09 — Inventário de telas e situação

| Tela / componente | Arquivo | Função | Situação (pelo código) | Observações |
|---|---|---|---|---|
| Assinatura | `billing.html` + `billing.js` | status, preço, assinar, cancelar | Funciona (sem teste automatizado) | não mostra valor em reais; "14 dias" fixo; não usa `get_own_payment_subscription`, `get_own_exchange_rates`, `get_own_payment_instructions` |
| Faixa de teste | `dashboard.html` | aviso de dias restantes | Funciona | módulo DSH |
| Guarda comercial | `auth.js` | redireciona bloqueado | Funciona (fail-open) | ACS |
| `mp-create-subscription` | edge function | checkout | Funciona (com cotação) | |
| `mp-webhook` | edge function | avisos do MP | **Provavelmente inalcançável** | ASS-S02 |
| `mp-reconcile` / `-self` | edge functions | conciliação | Funciona, com o defeito ASS-S01 | |
| `mp-cancel-subscription` | edge function | cancelar | Funciona | ASS-S05 |
| `mp-sync-exchange-rate` | edge function | PTAX | Funciona; job não versionado | |
| (sem tela) | — | histórico de pagamentos/faturas para o usuário | Inexistente | `get_own_payment_subscription` existe sem uso |
| (sem tela) | — | pagamento por Pix para o usuário (instruções, valor, aviso de pagamento) | Inexistente, embora cadastradas pelo admin; **decisão: passa a ser opção oficial (REQ-ASS-11)** | `get_own_payment_instructions` sem uso |
