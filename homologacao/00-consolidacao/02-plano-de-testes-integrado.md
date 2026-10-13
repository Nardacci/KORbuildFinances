# Consolidação · 02 — Plano de testes integrado

Os 230 casos dos pacotes (`<módulo>/08-plano-de-testes.md`) organizados em **ordem de execução**, com um só conjunto de dados `TESTE` que atravessa os módulos. Os passos e resultados esperados de cada caso continuam nos pacotes; aqui está só a ordem, a dependência e o dado compartilhado.

## 0. Regras de execução (obrigatórias)

1. Só no projeto de teste (`CLAUDE.md` §2). Todo registro criado começa com `TESTE`. Nunca apagar ou alterar registro que não comece com `TESTE`.
2. **Não executar os testes automáticos de `tests/`** sem confirmar o ambiente: eles apontam para o mesmo projeto do site e apagam tudo que começa com `TESTE_E2E_` (regra 9 do `CLAUDE.md`; BD-S10).
3. Testes de IA consomem créditos reais da Anthropic (CT-IA-03 a 16, 22): agrupar numa sessão, perguntas curtas, limite do workspace baixo.
4. Testes de pagamento só no **sandbox** do Mercado Pago (CT-ASS-12 a 21, 27). Nunca um pagamento real.
5. Consultas SQL listadas na Fase 1 são só de leitura (`select`). Não executar `update`, `delete` ou `grant` durante a homologação.
6. Resultado de cada caso: registrar no próprio pacote (coluna "Situação" da regra vira `Validada` ou abre um achado novo) e no diário.

## 1. Conjunto de dados compartilhado

| Dado | Valor | Usado por |
|---|---|---|
| Usuário A | `TESTE_A` (e-mail de teste combinado com o analista; nunca e-mail de pessoa real) — workspace `TESTE Workspace A`, moeda principal BRL, teste grátis ativo | quase todos |
| Usuário B | `TESTE_B` — workspace `TESTE Workspace B`, moeda EUR | isolamento (T-BD-04, CT-CTA-09, 20, 26; CT-RDP-24; CT-INV-16, 31), moeda (CT-RDP-17, CT-PLN-07, CT-DSH-16) |
| Usuário IA | `TESTE-IA` — workspace `TESTE Workspace IA` (pode ser o próprio A se o limite de IA for ajustado) | CT-IA-* |
| Administrador | o admin já existente em `finances.admins` (não criar admin novo por SQL durante a homologação) | CT-ADM-*, CT-ASS-09, CT-IA-08 a 10 |
| Contas de A | `TESTE Conta Corrente` (BRL, saldo inicial 5.000), `TESTE Poupança` (BRL, 2.000), `TESTE Euro` (EUR, 1.000) | CTA, RDP, INV, PLN, DSH |
| Receitas de A | 6 meses fechados de `TESTE Salário` 6.000 BRL recebidos na conta corrente; 1 planejada no mês atual | RDP, PLN, DSH, IA |
| Categorias de A | `TESTE Alimentação`, `TESTE Alimentação fora`, `TESTE Transporte`, `TESTE Moradia` (se CT-RDP-01 mostrar que não há como criar, registrar o achado e usar as existentes) | RDP, IA |
| Despesas de A | 6 meses fechados: Alimentação 800; Transporte 500/900/500/900/500/900 (último fechado 900, para CT-IA-17); Moradia 2.500; 1 prevista no mês atual | RDP, DSH, PLN, IA |
| Transferências de A | 1 corrente→poupança 1.000 BRL; 1 corrente→euro com câmbio | CTA, DSH |
| Investimentos de A | tipo `TESTE CDB` (saldo acumulado) com aportes mensais 1.000; tipo `TESTE Ação` (cotação) com 10 unidades a 50 | INV, PLN, DSH, IA |
| Meta e plano de A | `TESTE Meta` 100.000 BRL em 5 anos, sem patrimônio declarado; plano com aporte 1.000 e taxa 0 | PLN, DSH, IA |
| Valores conferidos por script | `scripts/etapa2/` (saldo), `etapa3/` (posição), `etapa4/` (planejamento), `etapa5/` (dashboard), `etapa6/` (preço, status), `etapa7/` (IA) — rodar com os dados acima para obter o esperado | Fase 5 |

## 2. Ordem de execução

### Fase 1 — Consultas só de leitura no banco (meio dia; dono do projeto)

Respondem às maiores dúvidas sem criar dado nenhum.

| Ordem | Caso | O que decide |
|---|---|---|
| 1 | T-BD-01 | Inventário real do esquema (tabelas, visões, funções, políticas) × repositório |
| 2 | T-BD-02, T-BD-03 | Privilégios de `authenticated` e `anon` por tabela |
| 3 | T-BD-05, T-BD-06, T-BD-11, T-BD-12 | Funções chamáveis, funções administrativas, sobrecargas mortas, drift |
| 4 | T-BD-09, T-BD-10, CT-ASS-23, CT-IA-19 | Jobs agendados existem, última execução, job de cotação, endereço do job de insights |
| 5 | CT-IA-18 | Privilégio de DELETE de `service_role` em `ai_insights` |
| 6 | CT-RDP-01 (parte SQL) | Existem categorias sem workspace? Quem cria? |
| 7 | CT-INV-20 (parte SQL) | Texto da visão `investment_positions` (fórmula real) |
| 8 | CT-ASS-26 | O que há em `payment_events` (sem copiar dados para o relatório) |

### Fase 2 — Receita (1 dia; sandbox do Mercado Pago)

| Ordem | Caso | O que decide |
|---|---|---|
| 9 | CT-ASS-20 | Webhook alcançável? |
| 10 | CT-ASS-13, CT-ASS-14, CT-ASS-21 | Webhook aprovado, rejeitado, assinatura |
| 11 | CT-ASS-15 | Conciliação desfaz o atraso? |
| 12 | CT-ASS-16, 17, 18, 19 | Carência, cancelar, cancelado não ressuscita, precedência |
| 13 | CT-ASS-24 | Conciliação em lote só escreve com `dry_run:false` |

### Fase 3 — Preparação dos dados e acesso (meio dia)

| Ordem | Caso | Observação |
|---|---|---|
| 14 | CT-ACS-01 a 09 | Cadastro e login de `TESTE_A` e `TESTE_B` |
| 15 | CT-ACS-10 a 23 | Assistente de configuração cria a primeira conta e receita de A (base do conjunto de dados) |
| 16 | CT-ASS-01, 02, 25 | Relógio do teste grátis e textos |
| 17 | CT-CTA-01 a 07 | Contas de A (inclusive editar a conta do assistente) |
| 18 | CT-RDP-02, 03, 04, 05, 07, 10, 11, 12, 13, 14, 15 | Receitas e despesas de A (6 meses; conferir CT-RDP-01 na tela antes) |
| 19 | CT-INV-01, 02, 04 a 09, 13, 14, 15, 18, 19, 24 | Tipos, investimentos e lançamentos de A |
| 20 | CT-PLN-20, CT-PLN-18 → cadastrar meta e plano | Planejamento antes e depois da meta |

### Fase 4 — Barreiras só na tela (1 dia; console do navegador ou REST)

Todos "A confirmar no teste" e de alto impacto. Executar como `TESTE_A` tentando alcançar dados de `TESTE_B` ou contornar a tela.

| Ordem | Caso | Barreira testada |
|---|---|---|
| 21 | T-BD-04, T-BD-08 | Isolamento entre workspaces (tabelas e visões) |
| 22 | CT-CTA-08, 09, 19, 20, 24, 26 | Troca de moeda com movimentos; conta de outro workspace; transferência mesma conta / outro workspace pela API |
| 23 | CT-RDP-06, 16, 23, 24, 25 | Moeda × conta pela API; valores fora da lista; conta de outro workspace; despesa negativa |
| 24 | CT-INV-03, 10, 12, 16, 25, 26, 27, 28, 31 | Tipo do sistema; trocar moeda/excluir com lançamentos; mês fechado (tela e API); outro workspace |
| 25 | CT-ACS-24, CT-IA-21, T-BD-07 | Guarda comercial na API; IA com usuário bloqueado; regra de mesma moeda na transferência |
| 26 | CT-ADM-01, 11 | Não-admin; status inválido pela API |

### Fase 5 — Cálculos conferidos por script (1 dia)

| Ordem | Caso | Script de referência |
|---|---|---|
| 27 | CT-CTA-13, 14, 15, 16, 17, 18 | `scripts/etapa2/` — saldo; transferência; valor com ponto |
| 28 | CT-RDP-17, 18, 19, 21, 22 | `scripts/etapa2/` — símbolo da moeda; valor com ponto; totais |
| 29 | CT-INV-17, 20, 21, 22, 23 | `scripts/etapa3/` — posição; totais; múltiplas moedas; cotação |
| 30 | CT-PLN-01 a 17 | `scripts/etapa4/` — cenários, patrimônio, prazo, capacidade, IR |
| 31 | CT-DSH-01 a 10, 15 | `scripts/etapa5/` — métricas, variação, patrimônio, evolução, objetivo rápido |
| 32 | CT-ASS-05 a 09, 22 | `scripts/etapa6/` — preço exibido, valor em reais, ajuste, PTAX |
| 33 | CT-ADM-02 a 10, 12 a 16 | painel do administrador |
| 34 | CT-IA-01 a 17, 20, 22 | `scripts/etapa7/` — painel, limite, ferramentas, insights (CT-IA-20 exige o segredo do job) |

### Fase 6 — Comportamento, robustez e tempo (meio dia + observações agendadas)

| Ordem | Caso | Observação |
|---|---|---|
| 35 | CT-CTA-05, 21; CT-RDP-20; CT-ASS-10; CT-ACS-19 | Duplo clique / duplo envio |
| 36 | CT-CTA-25; CT-RDP-29; CT-INV-32; CT-DSH-18; CT-ADM-17; CT-IA-07 | Nome com HTML (escape) |
| 37 | CT-CTA-10, 11, 12, 22, 23; CT-RDP-08, 09, 27, 28; CT-INV-11, 29, 30, 33 | Exclusões, cancelamentos, telas de edição, lista longa, testes automáticos atuais (só leitura do código) |
| 38 | CT-DSH-11, 12, 13, 14, 16; CT-ACS-25; CT-IA-04, 05, 06 | Faixa de teste grátis, falha silenciosa, seletor de mês, idioma, sair, histórico da IA |
| 39 | CT-ASS-03, 04, 11, 12, 27 | Carência e bloqueio (exigem avançar o relógio: ajustar `trial_days` para 1 no admin e esperar 1 dia), já assinado, retorno do checkout, cartão estrangeiro |
| 40 | CT-RDP-26; CT-PLN-19; CT-DSH-17; CT-INV-14 (data); CT-IA-23 | **Agendar para a virada de mês** entre 21:00 e 00:00 (Brasília) ou com o relógio do computador em fuso europeu |

### Limpeza

Remover todos os registros `TESTE…` (contas, lançamentos, investimentos, metas, categorias, assinaturas de sandbox, insights); restaurar limite de IA 100/habilitado, `trial_days` 14 e qualquer chave alterada em CT-IA-11. Conferir que nenhum registro sem prefixo `TESTE` foi tocado.

## 3. Esforço estimado

| Fase | Esforço | Pré-requisito |
|---|---|---|
| 1 Leitura no banco | 0,5 dia | acesso ao SQL Editor do projeto de teste |
| 2 Receita | 1 dia | credenciais de sandbox do Mercado Pago; segredo do job (CT-ASS-23) |
| 3 Dados e acesso | 0,5 dia | dois e-mails de teste |
| 4 Barreiras | 1 dia | console do navegador ou cliente REST com o token de `TESTE_A` |
| 5 Cálculos | 1 dia | scripts das etapas 2 a 7 |
| 6 Robustez e tempo | 0,5 dia + 2 janelas agendadas | relógio ajustável; virada de mês |
| **Total** | **4,5 dias úteis** + janelas de calendário | |

Casos cobertos: 230 de 230 (conferido contra a lista de códigos gerada por `consolidar.py testes`).
