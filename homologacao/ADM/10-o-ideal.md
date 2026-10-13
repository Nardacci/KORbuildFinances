# ADM · 10 — O ideal (como deve ser)

| Código | Requisito | Como é hoje | Motivação | Prioridade |
|---|---|---|---|---|
| REQ-ADM-01 | Trilha de auditoria de toda ação administrativa (quem, quando, workspace, campo, valor anterior, valor novo, motivo), consultável no painel | só `updated_by`/`updated_at` | ADM-S01, R-ADM-01 | P1 |
| REQ-ADM-02 | 2FA obrigatório para administradores; revisão periódica da tabela `admins`; tela ou procedimento registrado para incluir/remover | senha simples; SQL direto | ADM-S02, S05 | P1 |
| REQ-ADM-03 | Separar, ao menos por confirmação dupla, as ações que afetam receita (ACTIVE manual, desconto acima de X %) | um papel único | `05-conformidade.md` | P2 |
| REQ-ADM-04 | Validação e confirmação na tela para valores fora de faixa (limite 0, ajuste < −50 % ou > +50 %, trial > 90 dias) | sem validação | ADM-S06, R-ADM-03 | P2 |
| REQ-ADM-05 | Campo de carência de pagamento no painel (usa `get/update_payment_settings`) | só por RPC | ADM-S07 | P2 |
| REQ-ADM-06 | Estados e mensagens em português, com um único vocabulário entre painel e tela do usuário | códigos em inglês; dois vocabulários | R-ADM-05, RN-ADM-011 | P2 |
| REQ-ADM-07 | Painel mostra, por workspace, a assinatura no MP (status, valor, próximo vencimento, últimos eventos) para suporte | inexistente | inventário | P2 |
| REQ-ADM-08 | **Pix é opção oficial (decisão do analista, 2026-10-13):** o painel deve ter a fila de pagamentos Pix informados pelos usuários, com confirmar/recusar, período pago, valor, comprovante e quem confirmou; o bloco de instruções permanece | cadastrado sem fluxo | ADM-S04, R-ADM-06, REQ-ASS-11 | P1 |
| REQ-ADM-09 | Motivo obrigatório para ajuste de preço e para ativação manual | opcional | REQ-ASS-13 | P3 |
| REQ-ADM-10 | Menu de navegação e identificação clara de "ambiente administrativo" | sem navegação | RN-ADM-015 | P3 |
