# RDP · 07 — Análise de risco

| # | Risco | Prob. | Impacto | Evidência | Mitigação |
|---|---|---|---|---|---|
| R-RDP-01 | Usuário novo não consegue registrar despesa porque não existe categoria e não há como criar | A definir (depende da origem das categorias) | Alto (bloqueia o módulo inteiro) | RN-RDP-020 | CT-RDP-01 primeiro; REQ-RDP-01 |
| R-RDP-02 | Despesas exibidas com "R$" para usuários com moeda principal em EUR, USD ou GBP | Alta (público no exterior) | Alto (confiança no produto) | RN-RDP-017 | REQ-RDP-03 |
| R-RDP-03 | Despesa digitada com ponto decimal vira 100x maior | Alta (EUA e Reino Unido) | Alto | RN-RDP-025 | REQ-CTA-01 |
| R-RDP-04 | "Recebido este mês" e totais de despesa erram o último/primeiro dia do mês na Europa | Alta (Itália e Alemanha, todo mês) | Médio | RN-RDP-007 | REQ-CTA-05 |
| R-RDP-05 | Primeira receita do assistente fica "solta" (sem conta e sem data) e some dos totais; a edição abre com campos em branco | Alta (todo novo usuário) | Médio | RN-RDP-010 | REQ-RDP-05 |
| R-RDP-06 | Despesa em moeda diferente da conta distorce o saldo | Média | Médio | RN-RDP-022 | REQ-RDP-02 |
| R-RDP-07 | Totais de despesa somam moedas diferentes após o usuário mudar a moeda principal | Baixa | Médio | RN-RDP-016, 018 | REQ-RDP-03 |
| R-RDP-08 | Despesa sem conta não reduz nenhum saldo; o patrimônio das contas fica maior que o real e o usuário não é avisado | Média | Médio | RN-RDP-022 | REQ-RDP-13 |
| R-RDP-09 | Despesa duplicada por duplo clique | Média | Baixo | RN-RDP-026 | REQ-RDP-08 |
| R-RDP-10 | Expectativa de recorrência e parcelamento não atendida (usuário acha que o sistema repete a despesa) | Alta | Médio | RN-RDP-005, 028 | REQ-RDP-10 |
| R-RDP-11 | Alterações ou exclusões em meses antigos sem bloqueio nem rastro | Média | Médio | RN-RDP-024, RDP-S04 | REQ-RDP-09 |
| R-RDP-12 | Três formatos de moeda e dois de frequência dificultam relatórios, IA e migrações | Alta | Médio | RN-RDP-011 | REQ-RDP-04 |
