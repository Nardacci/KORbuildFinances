# PLN · 07 — Análise de risco

| # | Risco | Prob. | Impacto | Evidência | Mitigação |
|---|---|---|---|---|---|
| R-PLN-01 | Patrimônio atual errado (saldo inicial em vez de saldo atual): progresso, falta, cenários e conselhos calculados sobre número incorreto; piora com o tempo de uso | Alta (certeza pelo código) | Alto | RN-PLN-004; `patrimonio-atual.py` | REQ-PLN-01 |
| R-PLN-02 | Prazo "reinicia" a cada dia: o plano nunca "atrasa"; a previsão do dashboard e a do Planejamento divergem | Alta | Alto | RN-PLN-005, 022 | REQ-PLN-02 |
| R-PLN-03 | Conselho "O que fazer agora" contradiz os números exibidos (bases de capacidade diferentes) | Alta (sempre que houver menos de 6 meses de dados) | Médio | RN-PLN-011 a 015; `capacidade.js` | REQ-PLN-03 |
| R-PLN-04 | Usuário com renda em moeda diferente da meta vê capacidade zero e conselho de "atenção" | Alta (público no exterior) | Alto | RN-PLN-024 | REQ-PLN-05 |
| R-PLN-05 | Investimentos "Aguardando cotação" entram como zero no patrimônio (ver INV) | Alta | Alto | RN-PLN-004; R-INV-01 | REQ-INV-01 |
| R-PLN-06 | Constantes de inflação e IR desatualizadas ou inadequadas ao país do usuário (IR só BRL; inflação fixa) | Média | Médio | RN-PLN-018, 019 | REQ-PLN-06 |
| R-PLN-07 | Taxa esperada dos investimentos coletada e nunca usada; usuário acha que a taxa dele influencia a projeção | Alta | Baixo | RN-PLN-025 | REQ-PLN-07 |
| R-PLN-08 | Regressão silenciosa em cálculo (sem teste de valor) | Média | Alto | PLN-S04 | REQ-PLN-09 |
| R-PLN-09 | Workspace sem objetivo não consegue criar um | Baixa | Médio | RN-PLN-003 | REQ-PLN-08 |
| R-PLN-10 | Gráfico plano × realidade com eixo limitado a 60 meses engana para prazos longos | Média | Baixo | RN-PLN-021 | REQ-PLN-10 |
| R-PLN-11 | "Ajuste" de investimento contado como aporte real infla o ritmo real | Baixa | Baixo | RN-PLN-011 | REQ-INV-15 |
| R-PLN-12 | Fuso UTC erra o mês corrente e as janelas na Europa | Média | Baixo | RN-PLN-023 | REQ-CTA-05 |
