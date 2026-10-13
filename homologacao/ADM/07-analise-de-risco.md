# ADM · 07 — Análise de risco

| # | Risco | Prob. | Impacto | Evidência | Mitigação |
|---|---|---|---|---|---|
| R-ADM-01 | Erro ou abuso administrativo (liberar acesso, desconto total) sem rastro suficiente | Baixa | Alto | ADM-S01 | REQ-ADM-01 |
| R-ADM-02 | Conta de admin comprometida sem 2FA | Baixa | Alto | ADM-S05 | REQ-ADM-02 |
| R-ADM-03 | Valor absurdo digitado (limite 0, ajuste −500 %) sem confirmação | Média | Médio | ADM-S06 | REQ-ADM-04 |
| R-ADM-04 | Carência de pagamento impossível de ajustar pelo painel | Média | Baixo | ADM-S07 | REQ-ADM-05 |
| R-ADM-05 | Operador não entende os estados (códigos em inglês, dois vocabulários) | Alta | Baixo | RN-ADM-011, 016 | REQ-ADM-06 |
| R-ADM-06 | Pagamento por Pix (opção oficial por decisão de 2026-10-13) sem fluxo de aviso e confirmação: cliente paga e ninguém libera | Alta (enquanto não houver o fluxo) | Alto | RN-ADM-013 | REQ-ASS-11, REQ-ADM-08 |
| R-ADM-07 | Administradores esquecidos na tabela (sem revisão) | Média | Médio | ADM-S02 | REQ-BD-08 |
