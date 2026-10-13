# INV · 10 — O ideal (como deve ser)

| Código | Requisito | Como é hoje | Motivação | Prioridade |
|---|---|---|---|---|
| REQ-INV-01 | Existir um meio de informar a cotação atual: tela de "atualizar preço" por investimento (manual) e, depois, integração de cotações; a posição deve sair de "Aguardando cotação" assim que houver preço | nada grava `current_price` | R-INV-01, RN-INV-013 | P1 |
| REQ-INV-02 | A visão `investment_positions` deve estar versionada, com a fórmula documentada em português (quantidade, preço médio, custo, resultado, rentabilidade, tratamento de resgate parcial, rendimento, taxa e ajuste) e coberta por teste com os casos do modelo de referência | fórmula fora do repositório | R-INV-02, INV-S05 | P1 |
| REQ-INV-03 | As RPCs de alterar e excluir lançamento devem estar versionadas e verificar: lançamento do workspace do chamador; mês não fechado (data atual e nova); e as mesmas regras do gatilho de inserção. Inserção em mês fechado também bloqueada no banco | só na tela | R-INV-03, INV-S01, S04 | P1 |
| REQ-INV-04 | Tela de fechamento de período (fechar e reabrir com justificativa), com registro de quem fechou e quando; ou definir que o fechamento é administrativo e documentar o procedimento | ninguém fecha | R-INV-04, RN-INV-027 | P1 |
| REQ-INV-05 | Atualizar os testes automáticos para o esquema atual (`expected_monthly_rate`) e incluí-los na rotina de release | 3 arquivos inserem sem a coluna obrigatória | R-INV-05 | P1 |
| REQ-INV-06 | Conferir valor = quantidade × preço unitário (com tolerância) quando os três forem informados, ou calcular um a partir dos outros | sem conferência | R-INV-06, RN-INV-019 | P2 |
| REQ-INV-07 | Incluir GBP (e as mesmas moedas das contas) nas moedas de investimento | USD, BRL, EUR | R-INV-07 | P2 |
| REQ-INV-08 | Trava no banco: investimento com lançamentos não pode mudar tipo nem moeda, nem ser excluído; oferecer "arquivar" | só na tela | R-INV-08, INV-S02, S03 | P1 |
| REQ-INV-09 | Edição de lançamento deve permitir corrigir a conta (com as mesmas validações de moeda e workspace) | não permite | R-INV-09, RN-INV-022 | P2 |
| REQ-INV-10 | Rendimento e taxa: exigir conta ou perguntar explicitamente "reinvestido no próprio ativo / sem passar por conta", para que o efeito no patrimônio seja consciente | conta opcional, silencioso | R-INV-10 | P2 |
| REQ-INV-11 | Tipos do sistema somente leitura para usuários (política no banco); tela de editar/excluir só para os tipos do próprio workspace e só sem investimentos vinculados | sem tela; política desconhecida | R-INV-11, INV-S06, RN-INV-003 | P2 |
| REQ-INV-12 | Detalhe com paginação ou link "ver todos os lançamentos deste investimento" | 20 últimos | R-INV-12 | P3 |
| REQ-INV-13 | Um único vocabulário de método de posição entre formulário de tipo, texto de ajuda e visão; e explicar na tela de tipo o que cada método faz com os lançamentos | divergente | R-INV-13, RN-INV-004 | P2 |
| REQ-INV-14 | Mensagens de erro traduzidas; data padrão no fuso do usuário (REQ-CTA-05) | cruas; UTC | INV-S08, RN-INV-032 | P3 |
| REQ-INV-15 | "Ajuste": definir e documentar o que é (ajuste de posição? de custo?) e seu efeito na posição; hoje só afeta a tela com sinal "+" | indefinido | RN-INV-021 | P2 |
