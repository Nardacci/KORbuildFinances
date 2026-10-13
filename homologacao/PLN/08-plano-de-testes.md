# PLN · 08 — Plano de testes

Regras: só no ambiente de teste; só registros `TESTE`; nada de alterar ou apagar registro sem o prefixo. Usuário `TESTE_PLN` com configuração concluída, moeda principal BRL, objetivo `TESTE_Meta` de 100.000 em 5 anos, aporte 1.000, sem patrimônio inicial declarado; conta `TESTE_Conta_BRL` com saldo inicial 10.000. Os valores esperados vêm de `homologacao/scripts/etapa4/`.

| ID | Objetivo | Passos | Resultado esperado | Regra |
|---|---|---|---|---|
| CT-PLN-01 | Cenários (tabela) | abrir `planning.html` | linhas 0 % a 2 % com tempo até a meta 90 / 71,5 / 60,1 / 52,2 / 46,3 meses (exibidos em anos e meses), valor no prazo 70.000 / 83.259 / 99.837 / 120.647 / 146.862, necessário 1.500 / 1.240 / 1.002 / 785 / 589 | RN-PLN-006 a 009 |
| CT-PLN-02 | Patrimônio atual ignora movimentos | registrar receita `TESTE` recebida de 5.000 na conta | "Patrimônio atual" continua 10.000 (**hoje**); **deve** ser 15.000 | RN-PLN-004 |
| CT-PLN-03 | Patrimônio declarado | editar o objetivo na revisão: considerar patrimônio inicial 20.000 | "Patrimônio atual" = 20.000, independentemente das contas | RN-PLN-004 |
| CT-PLN-04 | Posição sem cotação | investimento `TESTE` com aporte 2.000 sem cotação | patrimônio não inclui os 2.000 | RN-PLN-004 |
| CT-PLN-05 | Prazo a partir de hoje | objetivo com data inicial 2 anos atrás e prazo 5 anos | Planejamento usa 60 meses; dashboard mostra previsão em 3 anos | RN-PLN-005, 022 |
| CT-PLN-06 | Capacidade com poucos meses | 3 meses com sobra 2.000, 1.500, 2.500 (receitas e despesas `TESTE`) | REALIDADE mostra 2.000; "O que fazer agora" raciocina com 1.000 (exibe "falta" coerente com 1.000) | RN-PLN-011 a 013 |
| CT-PLN-07 | Outra moeda | receitas `TESTE` só em EUR | capacidade 0; conselho "precisa de atenção" sem aviso de moeda | RN-PLN-024 |
| CT-PLN-08 | Poder de compra e IR | marcar a opção | para 1 % a.m.: poder de compra 80.114; líquido após IR 95.361 (alíquota 15 %) | RN-PLN-018, 019 |
| CT-PLN-09 | IR em 12 meses | objetivo de 1 ano | faixa 20 % (360 dias) | RN-PLN-019 |
| CT-PLN-10 | IR fora do BRL | moeda principal USD | coluna de IR não aparece; poder de compra com 2,5 % | RN-PLN-018, 019 |
| CT-PLN-11 | Sem aporte e sem patrimônio | aporte 0 na revisão (permitido), contas com saldo 0 | mensagem "Nenhuma contribuição informada" em todos os blocos | RN-PLN-008, 013 |
| CT-PLN-12 | Meta já alcançada | patrimônio declarado 100.000 | "Meta já alcançada" em todas as taxas; necessário 0; progresso 100 % | RN-PLN-007, 008, 017 |
| CT-PLN-13 | "Não bate a meta" | aporte 100, patrimônio 0, meta 100.000, 0 % | 1.000 meses → "Não bate a meta nesse prazo" | RN-PLN-010 |
| CT-PLN-14 | Gráfico de cenários | clicar nos botões de taxa | curvas aparecem/somem; cruzamento marcado só dentro do prazo | RN-PLN-020 |
| CT-PLN-15 | Plano × realidade | aportes `TESTE` de 500 nos últimos 6 meses | ritmo real 500; projeção real = 10.000 + 500 × 60 = 40.000; "Faltariam 60.000" | RN-PLN-016 |
| CT-PLN-16 | Gráfico plano × realidade com prazo longo | objetivo de 15 anos | eixo mostra 60 meses | RN-PLN-021 |
| CT-PLN-17 | Taxa esperada do investimento | mudar `expected_monthly_rate` de um investimento | nada muda no Planejamento | RN-PLN-025 |
| CT-PLN-18 | Sem objetivo | workspace `TESTE_SEMMETA` com setup concluído e sem linha em `goals` (criar por SQL no teste) | "Defina seu objetivo" → link leva à revisão; anotar se é possível criar o objetivo | RN-PLN-003 |
| CT-PLN-19 | Mês em fuso europeu | computador em fuso de Roma, receita `TESTE` no dia 31 | "Meu mês" não inclui o dia 31 (**hoje**) | RN-PLN-023 |
| CT-PLN-20 | Nome padrão | workspace `TESTE` com `display_name` nulo (via SQL) | cabeçalho mostra o nome fixo do código (**hoje**); **deve** mostrar texto neutro | PLN-S01 |
