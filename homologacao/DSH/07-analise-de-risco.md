# DSH · 07 — Análise de risco

| # | Risco | Prob. | Impacto | Evidência | Mitigação |
|---|---|---|---|---|---|
| R-DSH-01 | Tela principal mostra patrimônio errado (saldo inicial) e progresso do objetivo errado | Alta | Alto | RN-DSH-003, 007 | REQ-PLN-01 |
| R-DSH-02 | "Resultado" do mês superestimado por receitas planejadas/canceladas | Alta (basta uma receita planejada) | Médio | RN-DSH-012, 015 | REQ-DSH-01 |
| R-DSH-03 | Usuário compara dashboard com Visão gerencial e encontra números diferentes para o mesmo mês | Alta | Médio | DSH-F3 | REQ-DSH-01 |
| R-DSH-04 | Evolução do patrimônio vazia ou enganosa (sem fechamentos; base só de investimentos) | Alta | Médio | RN-DSH-006 | REQ-DSH-02; REQ-INV-04 |
| R-DSH-05 | Falha silenciosa mostra totais parciais como completos | Média | Alto | RN-DSH-011 | REQ-DSH-03 |
| R-DSH-06 | Resgates invisíveis no mês: usuário não vê dinheiro que voltou | Média | Baixo | RN-DSH-020 | REQ-DSH-04 |
| R-DSH-07 | Mês errado na Europa (UTC) | Média | Baixo | RN-DSH-009 | REQ-CTA-05 |
| R-DSH-08 | Variação "+100%" e seta fixa confundem | Média | Baixo | RN-DSH-002 | REQ-DSH-06 |
| R-DSH-09 | Dashboard lento com histórico grande (todas as receitas) | Baixa | Baixo | RN-DSH-019 | REQ-DSH-05 |
| R-DSH-10 | "Total" da rosca lido como saldo do mês | Média | Baixo | RN-DSH-004 | REQ-DSH-06 |
