# PLN · 01 — Reconhecimento do módulo Planejamento e Objetivo

Data: 2026-10-13. Escopo: tela de Planejamento (objetivo, patrimônio atual, realidade, cenários de rendimento, poder de compra e imposto, plano × realidade, meu mês, leitura do plano); objetivo e plano gravados pelo assistente; página "Patrimônio & Sonho".

## Arquivos do módulo

| Arquivo | Linhas | Papel | Observação |
|---|---|---|---|
| `planning.html` | 57 | Tela de Planejamento | contém um nome de pessoa real como texto de espera do cabeçalho (ver `05-conformidade.md`) |
| `planning.js` | 226 | Toda a matemática do módulo | maior JS do sistema (27 KB); gráfico de cenários em SVG desenhado à mão (linhas 35-122) |
| `planning.css` | 27 | estilos | fora da análise |
| `wealth-goal.html` | 0 (1 linha) | Página "Patrimônio & Sonho" | só texto "PRÓXIMO PACOTE"; sem script; protótipo |
| `workspace.html` / `app.js` (modo revisão) | — | única forma de editar objetivo e plano | analisado no módulo ACS (RN-ACS-025) |
| `dashboard.js` (`renderGoal`, `deadline`) | — | cartão do objetivo no dashboard | analisado no módulo DSH; citado aqui por divergir do Planejamento (RN-PLN-022) |

## Tabelas e funções usadas

| Objeto | Operações pela tela | Fonte |
|---|---|---|
| `goals` | SELECT do objetivo mais recente (1 linha) | `planning.js:131` |
| `plans` | SELECT do plano mais recente (1 linha) | `planning.js:132` |
| `accounts` | SELECT `opening_balance`, `currency` | `planning.js:133` |
| `investment_positions` (visão) | SELECT `position_value`, `currency` | `planning.js:134` |
| `investment_transactions` | SELECT últimos 12 meses | `planning.js:135` |
| `expenses`, `incomes` | SELECT últimos 12 meses | `planning.js:136-137` |
| Escrita | nenhuma: a tela é só leitura; objetivo e plano são gravados por `complete_setup` e pela revisão do assistente | `20260927120000_...:94-98`; `app.js:109-110` |
| `investments.expected_monthly_rate` | **não é lida** por esta tela nem por nenhuma outra | busca em `*.js`: só `investment-new.js:12` grava |

## Constantes de negócio embutidas no código

| Constante | Valor | Fonte |
|---|---|---|
| Cenários de taxa | 0; 0,5; 1; 1,5; 2 % ao mês | `planning.js:23` |
| Inflação anual por moeda | BRL 4,5 %; USD 2,5 %; EUR 2,5 %; GBP 3 % | `planning.js:24` |
| Tabela de IR (só BRL) | 22,5 % até 180 dias; 20 % até 360; 17,5 % até 720; 15 % acima | `planning.js:176` |
| Dias por mês para o IR | 30 | `planning.js:175` |
| Limite "não bate a meta" | mais de 600 meses (50 anos) | `planning.js:25` |
| Janela da "realidade" | até 12 meses com dados | `planning.js:129, 150-157` |
| Janela da "capacidade" usada nas decisões | 6 meses fixos | `planning.js:129, 145-146` |
| Cenários visíveis ao abrir | 0 % e 0,5 % | `planning.js:192` |
| Gráfico plano × realidade | 6 a 60 meses, taxa 0 | `planning.js:124` |

## Testes automatizados existentes

| Arquivo | Cobre | Não cobre |
|---|---|---|
| `tests/retroactive-launches.spec.js` | `#real-capacity` e `#real-investment` mudam com lançamentos dentro da janela de 12 meses e não mudam fora dela | nenhum valor é conferido; cenários, projeção, inflação, IR, progresso, "o que fazer agora" |
| `tests/navigation.spec.js:87-93` | link "Configurar planejamento" aponta para `settings.html` | — |
| `tests/workspace-review.spec.js` | edição de objetivo e plano pela revisão | — |

## O que está sem documentação

- Nenhuma memória de cálculo: fórmulas, premissas (aporte no fim do mês, taxa constante, sem imposto nos cenários principais), origem das constantes (inflação, IR), e a decisão de usar saldo inicial como patrimônio.
- Histórico das versões do plano: a 1ª versão de `complete_setup` calculava o aporte com 1,05 % ao mês, a 2ª com 0 %, a atual grava o aporte declarado (RN-ACS-031). `projected_monthly_rate` ficou em 0.
- `wealth-goal.html` sem função; "Objetivos" aparece como item de menu em HTML antigos, mas o menu real (injetado por `auth.js`) não o tem.
- A coluna `expected_monthly_rate` foi criada "na mesma unidade dos cenários de Planejamento" (`20260927150000_...:1-3`), mas nada a usa.
