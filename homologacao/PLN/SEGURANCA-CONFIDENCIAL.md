# PLN · SEGURANÇA — CONFIDENCIAL

**Não publicar em portal nem em resumo. Circulação restrita ao dono do projeto.**

Data: 2026-10-13. Base: leitura do código e scripts de conferência. Nenhum teste executado no ambiente.

| # | Achado | Severidade (inferida) | Evidência | Situação | Recomendação |
|---|---|---|---|---|---|
| PLN-S01 | Nome de uma pessoa real está fixo no código: como texto de espera do cabeçalho em `planning.html` e como valor padrão de nome de usuário em vários JS (quando o workspace não tem nome). Qualquer usuário sem nome veria esse nome | Baixa (dado pessoal exposto no código público e, em condição rara, a outros usuários) | `planning.html` (cabeçalho, antes de `#user-name` ser preenchido); `planning.js:128`; `accounts.js:2`; `incomes.js:2` e outros (`||'<nome>'`) | Extraída | Substituir por texto neutro ("—" ou "Você") |
| PLN-S02 | O Planejamento aconselha o usuário ("Continue e acompanhe", "O plano precisa de atenção") com base num patrimônio que ignora receitas, despesas e transferências (usa saldo inicial), e numa capacidade calculada com divisor fixo de 6 meses. O conselho pode estar errado em qualquer direção | Média (risco de decisão financeira do usuário com base em número incorreto; risco reputacional) | `planning.js:143, 145-146, 215-223`; scripts `patrimonio-atual.py`, `capacidade.js` | Extraída | REQ-PLN-01 e 03 |
| PLN-S03 | Inflação e tabela de IR fixas no código, sem data de referência nem fonte; IR aplicado com 30 dias por mês e alíquota única no horizonte inteiro. Exibidos com aviso de "estimativa simplificada", mas o usuário não vê as premissas | Baixa | `planning.js:24, 175-176, 183` | Extraída | REQ-PLN-06 |
| PLN-S04 | Nenhum teste automático confere um único número do Planejamento; só verifica que valores "mudam" | Média (regressão silenciosa em cálculo financeiro) | `tests/retroactive-launches.spec.js:156-163` | Extraída | REQ-PLN-09 |
| PLN-S05 | Três bases diferentes de "capacidade" na mesma tela (6 meses ÷ 6; média dos meses com dados; nota da realidade) produzem mensagens contraditórias | Baixa (confiança) | `planning.js:145, 156, 163-164` | Extraída | REQ-PLN-03 |
| PLN-S06 | Prazo contado a partir de hoje: a cada dia o plano "reinicia"; um objetivo de 5 anos criado há 2 anos ainda mostra 60 meses, enquanto o dashboard mostra a data real. Projeções e "alcança a meta" ficam otimistas com o tempo | Média (integridade da informação) | `planning.js:144`; `dashboard.js` (`deadline`) | Extraída | REQ-PLN-02 |
| PLN-S07 | Somente a moeda principal entra nos cálculos, sem aviso ao usuário com movimentos em outras moedas (público-alvo mora no exterior e tem meta no Brasil) | Média | `planning.js:143-154` | Extraída | REQ-PLN-05 |
| PLN-S08 | Mês e janelas em UTC (Europa erra limites de mês) | Baixa | `planning.js:8, 129` | Extraída | REQ-CTA-05 |
| PLN-S09 | Dados do Planejamento (objetivo, patrimônio, capacidade) são enviados ao assistente de IA externo | A avaliar no módulo IA | `supabase/functions/finances-ai/index.ts:320-353, 400-452` | — | módulo IA |
