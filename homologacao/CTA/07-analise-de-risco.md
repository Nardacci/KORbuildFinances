# CTA · 07 — Análise de risco

| # | Risco | Prob. | Impacto | Evidência | Mitigação |
|---|---|---|---|---|---|
| R-CTA-01 | Valor digitado com ponto decimal (padrão americano e britânico) é lido 100 vezes maior ou com casas erradas ("100.50" → 10.050). Saldos e patrimônio ficam errados sem aviso | Alta (público no exterior) | Alto | `transfer-new.js:3`; script `valor-digitado.js` | REQ-CTA-01 |
| R-CTA-02 | Transferência registrada duas vezes por duplo clique | Média | Médio | `transfer-new.js:7` | REQ-CTA-03 |
| R-CTA-03 | Usuário registra transferência errada e não consegue corrigir (edição sem link) nem apagar | Alta | Médio | `transfers.js:8` | REQ-CTA-04 |
| R-CTA-04 | Troca de moeda de conta com movimentos deixa saldo sem sentido | Baixa | Alto | `account-edit.js:12` | REQ-CTA-02 |
| R-CTA-05 | Primeira conta (criada no assistente) não abre para edição por causa do tipo em outro vocabulário; o usuário não consegue corrigir o próprio saldo inicial | Alta (todo novo usuário) | Médio | RN-CTA-021 | REQ-CTA-06 |
| R-CTA-06 | Lista mostra "Saldo informado", mas é saldo calculado; usuário compara com extrato e acha que há erro | Média | Baixo | RN-CTA-007 | REQ-CTA-07 |
| R-CTA-07 | Taxa de câmbio digitada com erro passa sem alerta | Média | Médio | RN-CTA-012 | REQ-CTA-08 |
| R-CTA-08 | Exclusão de conta com movimentos apaga ou deixa registros órfãos sem aviso | Média | Alto | RN-CTA-006 | Teste CT-CTA-10 a 12; REQ-CTA-10 |
| R-CTA-09 | Data padrão e "deste mês" erradas na virada do dia/mês para quem mora na Europa | Média | Baixo | RN-CTA-014, RN-CTA-020; scripts `data-padrao.js`, `limites-do-mes.js` | REQ-CTA-05 |
| R-CTA-10 | Saldo inicial negativo impossível: cheque especial e cartão não podem ser representados | Média | Baixo | RN-CTA-002 | REQ-CTA-09 |
| R-CTA-11 | Testes automáticos não cobrem validações, decimais, moedas nem saldo | Alta | Médio | cobertura em `01-reconhecimento.md` | `08-plano-de-testes.md` |
