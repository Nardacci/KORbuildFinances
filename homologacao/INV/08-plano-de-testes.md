# INV · 08 — Plano de testes

Regras: só no ambiente de teste; só registros `TESTE`; nada de alterar ou apagar registro sem o prefixo; **nunca mexer em tipos do sistema** (`is_system = true`) nem em fechamentos existentes. Usuários: `TESTE_A` (configurado) e `TESTE_B` (segundo workspace). Contas de apoio: `TESTE_Conta_BRL`, `TESTE_Conta_USD`, `TESTE_Conta_GBP`.

| ID | Objetivo | Passos | Resultado esperado | Regra |
|---|---|---|---|---|
| CT-INV-01 | Criar tipo | `investment-type-new.html`: `TESTE_Tipo_QtdPreco`, método quantidade × preço, marcar quantidade e preço de mercado | lista mostra "Personalizado", método e particularidades | RN-INV-001 |
| CT-INV-02 | Tipo sem nome | nome vazio | "Informe o nome do tipo de investimento." | RN-INV-001 |
| CT-INV-03 | Tipo do sistema pela API | `TESTE_A` tenta `update` (renomear) e `delete` num tipo com `workspace_id` nulo, pelo console | **deve** ser rejeitado; anotar | INV-S06 |
| CT-INV-04 | Criar investimento | tipo `TESTE_Tipo_QtdPreco`, nome `TESTE_Inv_Acoes`, código `tste3` (vira `TSTE3`), BRL, taxa 0,8 | lista com "Aguardando cotação"; mensagem "Agora registre os movimentos" | RN-INV-005 |
| CT-INV-05 | Taxa vazia | deixar taxa em branco | "Informe a taxa esperada (% a.m.)." | RN-INV-005 |
| CT-INV-06 | Taxa negativa | −1 | aceita (anotar se é desejado) | RN-INV-005 |
| CT-INV-07 | Moeda GBP | abrir o formulário | GBP não existe na lista | RN-INV-005 |
| CT-INV-08 | Editar sem lançamentos | trocar tipo e moeda | aceita | RN-INV-008 |
| CT-INV-09 | Editar com lançamentos | após CT-INV-13, abrir edição | tipo e moeda desabilitados; aviso visível | RN-INV-008 |
| CT-INV-10 | Trocar moeda pela API com lançamentos | `update({currency:'USD'})` pelo console | **deve** ser rejeitado; **hoje** provavelmente aceita; anotar efeito na posição | INV-S02 |
| CT-INV-11 | Excluir sem lançamentos | criar `TESTE_Inv_Vazio` e excluir | some | RN-INV-009 |
| CT-INV-12 | Excluir com lançamentos | botão não aparece ("Com lançamentos"); tentar `delete` pelo console | anotar: bloqueado, cascata ou órfãos | INV-S03 |
| CT-INV-13 | Aporte válido | `investment-launch-new.html`: `TESTE_Inv_Acoes`, aporte, conta BRL, hoje, 1000, qtd 100, preço 10 | lista; saldo da conta −1000 | RN-INV-015, 020 |
| CT-INV-14 | Aporte sem conta | não escolher conta | "Informe a conta financeira usada na operação." (tela) e, pelo console, erro do gatilho | RN-INV-015, 018 |
| CT-INV-15 | Conta em outra moeda | só contas BRL habilitadas; pelo console, inserir com conta USD | gatilho: "A moeda da conta deve ser igual à moeda do investimento." | RN-INV-016 |
| CT-INV-16 | Conta de outro workspace pela API | `TESTE_B` insere lançamento no próprio workspace com conta de A | gatilho: "A conta deve pertencer ao mesmo espaço financeiro." | RN-INV-018 |
| CT-INV-17 | Valor ≠ qtd × preço | valor 1000, qtd 100, preço 12 | aceita (anotar o preço médio mostrado) | RN-INV-019 |
| CT-INV-18 | Rendimento e taxa com conta | rendimento 30 e taxa 5 com conta | saldo da conta +30 −5 | RN-INV-020 |
| CT-INV-19 | Resgate | 330, qtd 30, preço 11 | saldo +330; sinal "−" no detalhe | RN-INV-020, 021 |
| CT-INV-20 | **Conferir a posição** | após CT-INV-13, 17 (ajustar para 600/50/12), 18 e 19, ler `investment_positions` do investimento | comparar cada coluna com `scripts/etapa3/modelo-de-posicao-referencia.py` (investido líquido 1270; quantidade 120; preço médio 10,6667; sem cotação: valor nulo). Divergência = registrar a fórmula real | RN-INV-011 |
| CT-INV-21 | Totais da carteira | dois investimentos BRL, um sem cotação | "Parcial" no valor atual; investido e resultado conforme `totais-da-carteira.js` caso B | RN-INV-012 |
| CT-INV-22 | Múltiplas moedas | investimento USD com aporte | totais "Múltiplas moedas" | RN-INV-012 |
| CT-INV-23 | Cotação | procurar na interface onde informar o preço atual | não existe; posição segue "Aguardando cotação" | RN-INV-013 |
| CT-INV-24 | Tipo "saldo acumulado" | investimento com tipo de saldo acumulado; aporte 1000, rendimento 30 | valor da posição esperado 1030 (modelo P4); anotar o real | RN-INV-011 |
| CT-INV-25 | Novo lançamento em mês fechado | (precisa de um fechamento `TESTE` criado por SQL no workspace de teste, `period_start` de um mês passado) registrar lançamento nesse mês | **deve** bloquear; **hoje** a tela aceita; anotar se o banco aceita | RN-INV-026, INV-S04 |
| CT-INV-26 | Editar lançamento de mês fechado | abrir edição | formulário desabilitado | RN-INV-025 |
| CT-INV-27 | Editar/excluir de mês fechado pela API | chamar `update_investment_transaction` e `delete_investment_transaction` pelo console para o lançamento do mês fechado | **deve** ser rejeitado; anotar | INV-S01 |
| CT-INV-28 | Mover lançamento para mês fechado | editar data para o mês fechado | bloqueado na tela | RN-INV-025 |
| CT-INV-29 | Editar tipo para aporte sem conta | lançamento "rendimento" sem conta → editar para "aporte" | anotar se aceita (hoje provável) | RN-INV-023 |
| CT-INV-30 | Testes automáticos atuais | ler `tests/investment-launches.spec.js:26-37` e tentar o mesmo insert pelo console (sem `expected_monthly_rate`) | erro de coluna obrigatória → suíte quebrada | RN-INV-010 |
| CT-INV-31 | Lançamento de outro workspace pela RPC | `TESTE_B` chama `delete_investment_transaction` com id de lançamento de A | rejeitado; nada apagado | INV-S01 |
| CT-INV-32 | Nome com HTML | tipo e investimento `TESTE_<img src=x onerror=alert(1)>` | texto literal em todas as listas e listas suspensas | INV-S10 |
| CT-INV-33 | Detalhe com mais de 20 lançamentos | 21 lançamentos `TESTE` | detalhe mostra 20; lista geral mostra 21 | RN-INV-028 |

Conferências por script: `homologacao/scripts/etapa3/totais-da-carteira.js` (totais da tela, lógica exata) e `modelo-de-posicao-referencia.py` (modelo esperado, inferência).
