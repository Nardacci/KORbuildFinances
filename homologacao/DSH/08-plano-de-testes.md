# DSH · 08 — Plano de testes

Regras: só no ambiente de teste; só registros `TESTE`; nada de alterar ou apagar registro sem o prefixo. Usuário `TESTE_DSH` com moeda principal BRL, conta `TESTE_Conta_BRL` (saldo inicial 10.000), conta `TESTE_Conta_EUR`. Dados do mês de exemplo de `homologacao/scripts/etapa5/visao-gerencial.js` (todos com descrição iniciando por `TESTE`).

| ID | Objetivo | Passos | Resultado esperado | Regra |
|---|---|---|---|---|
| CT-DSH-01 | Métricas do mês | registrar os dados do exemplo no mês atual; abrir `dashboard.html` | Receitas 5.000; Despesas 3.000; Investimentos 1.700; Transferências 500 | RN-DSH-001 |
| CT-DSH-02 | Visão gerencial, mesmo mês | abrir `dashboard-movements.html` | Receitas **6.300** (hoje); Investimentos 1.500; Pagamentos 3.000; Transferências 500; Saídas econômicas 4.500; Resultado 1.800; 7 movimentações (a receita em EUR conta na lista, não no total) | RN-DSH-012 a 017 |
| CT-DSH-03 | Variação vs. mês anterior | mês anterior com receita 1.000; atual 1.200 | "+20% ↗"; despesas 800 → 1.000 em vermelho "+25% ↗" | RN-DSH-002 |
| CT-DSH-04 | Sem mês anterior | primeiro mês de uso | "+100% ↗" nas métricas com valor; "—" nas zeradas | RN-DSH-002 |
| CT-DSH-05 | Patrimônio atual | receita recebida de 5.000 na conta | "Patrimônio atual" continua 10.000 + posições (**hoje**); deve refletir 15.000 | RN-DSH-003 |
| CT-DSH-06 | Rosca "Meu mês" | dados do exemplo | fatias 50/30/15/5 % sobre total 10.200 (dashboard) | RN-DSH-004 |
| CT-DSH-07 | Despesas por categoria | 9 categorias `TESTE` com despesas realizadas | legenda mostra 8; rosca com 9 fatias; sem categoria = "Outros" | RN-DSH-005 |
| CT-DSH-08 | Evolução sem fechamentos | workspace sem linhas em `investment_closings` | um ponto só; variação 0 %; maior = menor = patrimônio atual | RN-DSH-006 |
| CT-DSH-09 | Evolução com fechamentos | 4 fechamentos `TESTE` criados por SQL no workspace de teste (50.000, 52.000, 49.000, 55.000) | variação +10 %, +5.000; maior 55.000; menor 49.000; "Patrimônio atual" ao lado com outra base | RN-DSH-006 |
| CT-DSH-10 | Objetivo rápido | objetivo de 100.000, data inicial 2026-01-15, 5 anos; patrimônio 10.000 | "Falta 90.000"; 10 %; "Previsão: janeiro de 2031"; "Você está no caminho" | RN-DSH-007 |
| CT-DSH-11 | Faixa de teste grátis | workspace em TRIALING com 10 dias | faixa com "10 dias restantes" e "Assinar agora"; em GRACE_PERIOD, "Seu teste encerrou" | RN-DSH-008 |
| CT-DSH-12 | Falha silenciosa | (no console) revogar temporariamente o acesso de leitura a `transfers` no banco de teste, ou simular bloqueio de rede para essa chamada | Visão gerencial mostra Transferências 0 e Resultado normal, sem aviso visível (**hoje**) | RN-DSH-011 |
| CT-DSH-13 | Seletor de mês | `?month=` de 11 meses atrás | mês selecionado; dados do mês | RN-DSH-010 |
| CT-DSH-14 | Mês inválido | `?month=2020-99` | anotar comportamento (tela vazia sem erro, provável) | DSH-S10 |
| CT-DSH-15 | Resgate no mês | resgate `TESTE` de 700 | não aparece em nenhuma das duas telas | RN-DSH-020 |
| CT-DSH-16 | Idioma | clicar na bandeira | "Hello", moeda em formato en-US, demais textos em português | RN-DSH-021 |
| CT-DSH-17 | Mês em fuso europeu | computador em fuso de Roma; movimento no dia 31 | não entra no mês (**hoje**) | RN-DSH-009 |
| CT-DSH-18 | Nome com HTML | categoria `TESTE_<img src=x onerror=alert(1)>` | texto literal na rosca | DSH-S09 |
