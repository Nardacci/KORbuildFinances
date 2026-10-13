# ASS · 10 — O ideal (como deve ser)

| Código | Requisito | Como é hoje | Motivação | Prioridade |
|---|---|---|---|---|
| REQ-ASS-01 | A conciliação não deve reativar uma assinatura em `past_due` enquanto o MP a mantém `authorized`; só um pagamento aprovado (ou decisão administrativa) encerra o atraso. O bloqueio ao fim da carência de pagamento deve ser testado ponta a ponta | reativa a cada 15 min | ASS-S01, R-ASS-01 | P1 |
| REQ-ASS-02 | Publicar `mp-webhook` sem verificação de token (declarado em `config.toml`), confirmar recebimento de avisos reais e manter a conciliação só como rede de segurança | provável 401 antes do código | ASS-S02, R-ASS-02 | P1 |
| REQ-ASS-03 | Mostrar, antes do redirecionamento, o valor em reais que será cobrado, a cotação e a data usadas. **Decisão do analista (2026-10-13): o valor em reais deve ser recalculado a cada renovação.** Como a assinatura no Mercado Pago nasce com valor fixo (`auto_recurring.transaction_amount`, RN-ASS-009), isso exige uma rotina mensal que, antes de cada cobrança, recalcule base × PTAX × ajuste e atualize o valor da assinatura no MP (PUT em `/preapproval/{id}`), registrando o valor e a cotação usados em `payment_events` e avisando o usuário da mudança | preço em USD; valor em reais invisível e fixo | ASS-S04, R-ASS-03 | P1 |
| REQ-ASS-04 | Termos de assinatura (renovação automática, carência, cancelamento, reembolso) publicados e aceitos antes do checkout | inexistentes | `05-conformidade.md` | P1 |
| REQ-ASS-05 | Ao cancelar sem `current_period_end`, assumir início do período + 1 mês; preencher o período em todos os caminhos de ativação | bloqueio imediato | ASS-S05, R-ASS-04 | P2 |
| REQ-ASS-06 | Versionar o job de cotação; alertar quando a cotação tiver mais de N dias; recusar checkout com cotação velha; cobrir GBP ou retirá-lo das moedas de conta | sem alerta | ASS-S09, R-ASS-05 | P2 |
| REQ-ASS-07 | `payment_events` com só os campos necessários e retenção definida (ex.: 5 anos para fins fiscais, com minimização dos dados do pagador) | resposta bruta, sem prazo | ASS-S07, R-ASS-07 | P2 |
| REQ-ASS-08 | Testes automatizados do ciclo (máquina de estados, preço, webhook com assinatura, conciliação) usando o sandbox do MP | nenhum | R-ASS-08 | P1 |
| REQ-ASS-09 | Textos da tela lidos da configuração (`trial_days`, `grace_days`) | "14 dias" fixo | ASS-S13 | P3 |
| REQ-ASS-10 | Tela do usuário com histórico de cobranças, próximo vencimento e valor em reais (usar `get_own_payment_subscription`) | inexistente | inventário | P2 |
| REQ-ASS-11 | **Decisão do analista (2026-10-13): Pix é uma das opções de pagamento.** Portanto: (a) `billing.html` deve oferecer "Pagar por Pix" ao lado do Mercado Pago, exibindo as instruções de `get_own_payment_instructions` e o valor em reais do mês; (b) o usuário informa que pagou (comprovante opcional); (c) o painel admin lista pagamentos Pix pendentes e permite confirmar, gravando período pago (`current_period_start/end`), valor e quem confirmou; (d) `get_workspace_access_status` deve considerar o período pago por Pix como ACTIVE; (e) lembrete de vencimento e carência iguais aos do MP | cadastrado e nunca exibido; sem fluxo | inventário; ADM; decisão | P1 |
| REQ-ASS-12 | Migração das tabelas de pagamento versionada | ausente | ASS-S03 | P1 (junto com REQ-BD-01) |
| REQ-ASS-13 | Limitar o ajuste de preço a um intervalo (ex.: −100 % a +100 %) e exigir motivo | sem limite, motivo opcional | ASS-S10 | P3 |
| REQ-ASS-14 | Bloqueio comercial também na API (ver REQ-BD-05) | só na tela | ASS-S15 | P2 |
