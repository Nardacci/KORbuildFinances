# PLN · 10 — O ideal (como deve ser)

| Código | Requisito | Como é hoje | Motivação | Prioridade |
|---|---|---|---|---|
| REQ-PLN-01 | Patrimônio atual = saldo **atual** das contas (visão `account_balances`) + posições avaliadas, com conversão para a moeda principal pela cotação disponível; posições sem cotação sinalizadas, não zeradas. "Patrimônio inicial declarado" vale só como ponto de partida histórico, não como valor atual permanente | saldo inicial + posições; declarado fixo | R-PLN-01, PLN-S02 | P1 |
| REQ-PLN-02 | Prazo restante = data inicial + anos − hoje; mostrar meses decorridos e restantes; a mesma data de chegada no dashboard e no Planejamento | anos × 12 a partir de hoje | R-PLN-02, PLN-S06 | P1 |
| REQ-PLN-03 | Uma única definição de capacidade (média dos meses com dados, com mínimo de meses para aconselhar) usada em todos os blocos e no conselho; explicar a base na tela | três bases | R-PLN-03, PLN-S05 | P1 |
| REQ-PLN-04 | Memória de cálculo publicada para o usuário ("como calculamos"): fórmulas, aporte no fim do mês, taxa constante, cenários | nenhuma | PLN-S03 | P2 |
| REQ-PLN-05 | Converter ou, no mínimo, avisar quando houver receitas, despesas, contas ou posições em moeda diferente da principal; mostrar quanto ficou de fora | ignora em silêncio | R-PLN-04, PLN-S07 | P1 |
| REQ-PLN-06 | Inflação e IR como parâmetros administráveis, com data e fonte; IR por dias corridos reais e, se possível, por data de cada aporte; regras fiscais do país de residência ou aviso explícito de que só vale para BRL | fixos no código, 30 dias/mês | R-PLN-06, PLN-S03 | P2 |
| REQ-PLN-07 | Usar a taxa esperada dos investimentos (média ponderada pela posição) como cenário "minha carteira" ao lado dos cenários fixos; ou deixar de coletá-la | coletada e ignorada | R-PLN-07, RN-PLN-025 | P2 |
| REQ-PLN-08 | Permitir criar objetivo quando não houver (tela própria de objetivo e plano, fora do assistente), alterar a taxa do plano e manter histórico de alterações | só pela revisão, que não cria | R-PLN-09, RN-PLN-003 | P2 |
| REQ-PLN-09 | Testes automáticos com valores esperados (os casos de `scripts/etapa4/`) para cenários, aporte necessário, meses até a meta, patrimônio, capacidade, poder de compra e IR | só "mudou/não mudou" | R-PLN-08, PLN-S04 | P1 |
| REQ-PLN-10 | Gráfico plano × realidade com o prazo real do objetivo e a taxa do plano | 6-60 meses, taxa 0 | R-PLN-10 | P3 |
| REQ-PLN-11 | Remover nome de pessoa real do código (texto de espera e valor padrão) | fixo | PLN-S01 | P1 (simples) |
| REQ-PLN-12 | Decidir se "ajuste" de investimento conta como aporte real; documentar | conta | R-PLN-11 | P3 |
| REQ-PLN-13 | Datas e janelas no fuso do usuário (REQ-CTA-05) | UTC | R-PLN-12 | P1 (compartilhado) |
| REQ-PLN-14 | Retirar ou concluir `wealth-goal.html` | protótipo | inventário | P3 |
