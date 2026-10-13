# DSH · 10 — O ideal (como deve ser)

| Código | Requisito | Como é hoje | Motivação | Prioridade |
|---|---|---|---|---|
| REQ-DSH-01 | Uma única definição de cada número, compartilhada por dashboard, Visão gerencial e Planejamento: receitas = recebidas; despesas = pagas; investimentos = aportes (decidir ajustes e resgates); transferências separadas; mesma janela de mês | definições diferentes por tela | DSH-S03, S04; R-DSH-02, 03 | P1 |
| REQ-DSH-02 | Evolução do patrimônio calculada sobre a mesma base do "Patrimônio atual" (contas + investimentos), com um ponto por mês gerado automaticamente (foto mensal) e não dependente de fechamento manual | só fechamentos de investimento | DSH-S02; R-DSH-04 | P1 |
| REQ-DSH-03 | Erro em qualquer consulta deve ser visível na tela e impedir a exibição de totais incompletos | silencioso | DSH-S01; R-DSH-05 | P1 |
| REQ-DSH-04 | Mostrar resgates, rendimentos e taxas de investimento no mês (como entradas/saídas do bloco de investimentos) | invisíveis | RN-DSH-020 | P2 |
| REQ-DSH-05 | Consultas do dashboard limitadas ao período usado (mês anterior e atual) | receitas sem filtro | DSH-S08 | P3 |
| REQ-DSH-06 | Variação com seta coerente com o sinal; sem mês anterior mostrar "sem comparação"; renomear "Total" da rosca para "Movimentado no mês" | seta fixa; +100 %; "Total" | R-DSH-08, 10 | P3 |
| REQ-DSH-07 | Tradução completa ou retirar o botão de idioma | parcial | RN-DSH-021 | P3 |
| REQ-DSH-08 | Objetivo rápido com o mesmo patrimônio e a mesma previsão do Planejamento (ver REQ-PLN-01, 02) | bases diferentes | RN-DSH-007 | P1 |
| REQ-DSH-09 | Validar `?month=` e limitar ao intervalo do seletor | sem validação | DSH-S10 | P3 |
| REQ-DSH-10 | Datas e janelas no fuso do usuário (REQ-CTA-05) | UTC | RN-DSH-009 | P1 (compartilhado) |
