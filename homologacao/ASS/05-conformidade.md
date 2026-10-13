# ASS · 05 — Conformidade (LGPD, CDC e boas práticas)

| Tema | Como é hoje (o que o código MOSTRA) | Avaliação | Requisito / Ponto para validar |
|---|---|---|---|
| Transparência do preço (CDC art. 6º III, 31) | preço em moeda estrangeira na tela; cobrança em reais calculada no clique, sem exibição prévia; valor fixo pela PTAX do dia | Inadequado: o consumidor não sabe quanto pagará em reais antes de ir ao checkout (o MP mostra depois) | REQ-ASS-03 |
| Direito de cancelar | cancelamento a qualquer momento, acesso até o fim do período pago | Adequado, se `current_period_end` estiver preenchido | ASS-S05 |
| Termos do serviço | nenhum texto de termos, renovação automática, carência ou política de reembolso no repositório | Lacuna (renovação automática exige informação clara) | REQ-ACS-03, REQ-ASS-04 |
| Dados ao Mercado Pago | e-mail do usuário; referência = id do workspace | Operador de pagamento; informar na política de privacidade | ASS-S08 |
| Dados recebidos do MP | respostas brutas guardadas em `payment_events` sem retenção | Minimização e retenção (LGPD art. 6º III, 15) | ASS-S07 |
| Segurança do webhook | assinatura HMAC, refetch, sem confiar no corpo | Boa prática | ASS-S02 (alcance) |
| Segredos | em variáveis da plataforma e no Vault; nenhum no código | Adequado | REQ-BD-08 |
| Igualdade de tratamento | ajuste de preço por workspace a critério do admin, sem registro de motivo obrigatório (`notes` opcional) | Risco de discriminação não documentada | REQ-ADM-05 |
| Residentes fora do Brasil | cobrança em BRL por Mercado Pago; público-alvo mora no exterior | Analista informou (2026-10-13) que consultou e a resposta foi que o público no exterior consegue pagar. Pix passa a ser opção oficial (REQ-ASS-11). Restam: IOF e regras fiscais do país de residência (Ponto para validar) | REQ-ASS-11; CT-ASS-27 |
