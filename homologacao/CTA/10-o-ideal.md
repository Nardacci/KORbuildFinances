# CTA · 10 — O ideal (como deve ser)

| Código | Requisito | Como é hoje | Motivação | Prioridade |
|---|---|---|---|---|
| REQ-CTA-01 | Valores digitados devem ser lidos corretamente em qualquer padrão regional: usar campo numérico com ponto decimal fixo, ou interpretar pelo idioma do usuário, ou pedir confirmação quando o texto tiver ponto seguido de 1 ou 2 dígitos. Mostrar o valor lido antes de salvar | "." sempre removido (`transfer-new.js:3`) | R-CTA-01, RN-CTA-016 | P1 |
| REQ-CTA-02 | O banco deve impedir trocar a moeda de uma conta que já tem receitas, despesas, transferências ou lançamentos; alterar apenas por nova conta e transferência | sem trava | R-CTA-04, CTA-S01 | P1 |
| REQ-CTA-03 | Impedir envio duplicado: desabilitar o botão enquanto grava e usar identificador de operação único | sem proteção | R-CTA-02, CTA-S08 | P2 |
| REQ-CTA-04 | Decidir e implementar: lista de transferências com "Editar" e "Excluir" (ou "Cancelar") por transferência, com privilégio e política coerentes | edição escondida, exclusão inexistente | R-CTA-03, CTA-S05 | P1 |
| REQ-CTA-05 | Datas padrão e limites do mês devem usar o fuso do usuário (data local, sem passar por UTC) em todas as telas | UTC em 10 arquivos (`transfers.js`, `transfer-new.js`, `income-new.js`, `expense-new.js`, `incomes.js`, `expenses.js`, `dashboard*.js`, `planning.js`, `investment-launch-new.js`) | R-CTA-09 | P1 (afeta Itália, Alemanha, Portugal, Reino Unido) |
| REQ-CTA-06 | Um único vocabulário para tipo de conta (e moeda) em assistente, telas e banco; migrar os registros existentes | dois vocabulários | R-CTA-05, RN-CTA-021 | P1 |
| REQ-CTA-07 | Rótulo "Saldo atual" na lista e, ao lado, "Saldo inicial" | "Saldo informado" | R-CTA-06 | P3 |
| REQ-CTA-08 | Alertar quando a taxa implícita da transferência entre moedas diferir da cotação oficial em mais de um percentual configurável; mostrar a taxa antes de salvar | sem alerta | R-CTA-07, CTA-S02 | P2 |
| REQ-CTA-09 | Permitir saldo inicial negativo para tipos de conta que admitem (cheque especial, cartão) | proibido | R-CTA-10 | P3 |
| REQ-CTA-10 | Excluir conta só se vazia; com movimentos, "arquivar" a conta (some das listas novas, preserva histórico) | efeito desconhecido | R-CTA-08 | P2 |
| REQ-CTA-11 | Versionar e documentar `validate_transfer_accounts` (mesmo workspace, contas diferentes) e cobrir com teste de API | função fora do repositório | CTA-S03, CTA-S04 | P1 |
| REQ-CTA-12 | O saldo atual deve considerar só movimentos até hoje (ou separar "saldo atual" de "saldo projetado") e converter ou bloquear movimentos em moeda diferente da conta | soma tudo, sem data nem moeda | RN-CTA-008 | P2 |
| REQ-CTA-13 | Escapar nomes em todas as listas suspensas e testar | sem escape | CTA-S06 | P3 |
