# Diário de bordo — KORbuild Finances

Entrada mais nova no topo. Formato de cada entrada: data, chat/etapa, feito, resultado, parou em, próximo passo, o que revisar.

---

## 2026-10-13 — Chat 1 (continuação) — Etapa 7: módulo IA (Kora e insights)

**Feito**
- Leitura integral de `supabase/functions/finances-ai/index.ts` (772 linhas) e `compute-insights/index.ts`, do painel Kora em `auth.js:101-269`, e dos 4 SQL de IA (`ai_usage_log`, `ai_insights` + `compute_ai_insights`, agenda diária, RPCs de limite).
- Pacote completo de **IA** em `homologacao/IA/` (11 arquivos): 37 regras, 5 fluxos, 17 achados de segurança, 23 casos de teste, 17 requisitos.
- 4 scripts em `homologacao/scripts/etapa7/`: `limite-mensal.py` (bloqueio por cota e virada de mês UTC), `regra-dos-insights.py` (6 cenários da regra "categoria acima da média"), `simulacao-de-cenario.py` (ferramenta de cenário, mesma conta do Planejamento), `custo-estimado.py` (custo mensal em dólares a partir dos tokens).
- Nenhuma chamada à API da Anthropic e nenhum teste executado; nenhum arquivo do sistema alterado.

**Resultado (principais achados; detalhes em `homologacao/IA/SEGURANCA-CONFIDENCIAL.md`)**
- **Dados saem para a Anthropic sem aviso nem consentimento** (IA-S01): texto livre do usuário, até 8 mensagens anteriores, nomes de categorias e da meta, valores e projeções. Não vão e-mail, nome, identificadores nem lançamentos individuais. Falta política de privacidade, base legal e cláusula de transferência internacional (LGPD art. 33).
- **O job noturno de insights provavelmente nunca funcionou** (IA-S02 e S03): a função SQL faz `DELETE` e o único grant versionado a `service_role` é SELECT/INSERT/UPDATE (o comentário diz que só procuraram `.delete(` em TypeScript); além disso, o endereço chamado pelo job tem um identificador de projeto **diferente** do de `supabase/config.toml`. Ninguém lê o retorno do job.
- **Usuário bloqueado consegue usar a IA** chamando a função diretamente (IA-S04): a função não consulta o status comercial; só o painel some em `billing.html`.
- **Sem ressalva "não é recomendação de investimento"** (IA-S12), e as projeções herdam o patrimônio por saldo inicial (RN-PLN-004).
- Conversa fica no navegador após o logout (IA-S05); erros e resposta vazia após 3 rodadas distorcem a cota (IA-S06, S07); modelo `claude-sonnet-5` fixo no código, de geração anterior, válido hoje (IA-S11).
- Pontos positivos: token validado no servidor, leituras com RLS do usuário, ferramentas só de leitura, HTML da resposta escapado, texto das conversas não gravado no servidor.
- Custo conferido por script: entre US$ 0,56 e US$ 10,08 por workspace/mês dentro do limite de 100 perguntas; a assinatura cobre; o risco está no uso fora do limite.

**Parou em**
- Fim da Etapa 7. Todos os 9 módulos funcionais e o transversal BD têm pacote (ACS, CTA, RDP, INV, PLN, DSH, ASS, ADM, IA, BD).

**Próximo passo (proposta)**
- Etapa 8: consolidação — `homologacao/00-consolidacao/` com (a) matriz geral de riscos e achados por severidade, com os 10 itens que devem ser tratados antes de cobrar usuários; (b) plano de testes integrado em ordem de execução no ambiente de teste, com os dados `TESTE` compartilhados; (c) "O ideal" do sistema (requisitos P1 de todos os módulos num só roteiro); (d) lista de decisões de produto ainda abertas.

**O que revisar**
- CT-IA-18 e CT-IA-19 são duas consultas SQL só de leitura que confirmam IA-S02 e IA-S03 em minutos.
- `homologacao/IA/SEGURANCA-CONFIDENCIAL.md`: não publicar.
- Decisão de produto: a Kora deve ficar visível para usuários antes de REQ-IA-01/02/03 (aviso, política, ressalva)?

---

## 2026-10-13 — Chat 1 (continuação) — Etapa 6: módulos ASS e ADM

**Feito**
- Leitura integral das 6 edge functions do Mercado Pago e da cotação (cerca de 1.160 linhas de TypeScript), de `billing.js`, `finances-admin.js` e das duas telas; releitura dos SQL comerciais da Etapa 1.
- Pacotes completos de **ASS** (`homologacao/ASS/`) e **ADM** (`homologacao/ADM/`), 11 arquivos cada.
- 3 scripts em `homologacao/scripts/etapa6/`: `status-de-acesso.py` (máquina de estados com datas), `preco-em-reais.py` (preço exibido × valor cobrado), `ptax-dias-sem-cotacao.py` (retrocesso de 7 dias).

**Resultado (principais achados; detalhes nos pacotes)**
- ASS: 28 regras; 6 fluxos; 15 achados de segurança; 26 casos de teste; 14 requisitos. ADM: 16 regras; 6 fluxos; 9 achados; 17 casos; 10 requisitos.
- **A conciliação desfaz o "pagamento em atraso"** (ASS-S01): o webhook marca atraso quando uma parcela é rejeitada, mas o Mercado Pago mantém a assinatura "autorizada" enquanto tenta cobrar de novo; a conciliação a cada 15 minutos vê "autorizada", grava "ativa" e zera o atraso. Inadimplente recupera o acesso em até 15 minutos e a carência de 12 dias nunca termina em bloqueio.
- **O webhook do Mercado Pago provavelmente não é alcançável** (ASS-S02): o código diz que a verificação de token está desligada em `supabase/config.toml`, mas o arquivo não lista a função. O próprio código relata "zero invocações" em testes reais. Sem webhook, só a conciliação atualiza, e ela nunca marca atraso.
- **Preço em USD na tela, cobrança em reais sem mostrar o valor** antes do redirecionamento; valor fica fixo pela PTAX do dia (ASS-S04). Exemplo conferido: 29,90 USD × 5,4321 = R$ 162,42.
- **Cancelar sem fim de período registrado bloqueia na hora** (ASS-S05). Migração das tabelas de pagamento ausente do repositório (ASS-S03). Respostas brutas do Mercado Pago guardadas sem prazo (ASS-S07). Job da cotação não versionado e sem alerta de cotação velha (ASS-S09).
- ADM: administrador com poder total sem trilha de antes/depois nem 2FA (ADM-S01, S05); carência de pagamento sem campo no painel; instruções de pagamento manual cadastradas e nunca exibidas ao usuário; três RPCs de autoatendimento concedidas e nunca chamadas.
- Ciclo de teste grátis (14 + 6 dias) e precedência entre pagamento e teste conferidos por script e coerentes com o código.

**Decisões do analista (mesmo dia, após a entrega)**
- Pix é uma das opções de pagamento → REQ-ASS-11 e REQ-ADM-08 viraram requisitos P1 (fluxo de aviso e confirmação).
- O valor em reais deve ser recalculado a cada renovação → REQ-ASS-03 detalhado (rotina mensal que atualiza o valor da assinatura no Mercado Pago).
- Público no exterior consegue pagar pelo Mercado Pago Brasil: o analista consultou e a resposta foi sim → R-ASS-11 rebaixado; teste CT-ASS-27 adicionado para confirmar no sandbox.

**Parou em**
- Fim da Etapa 6, sem execução de testes. Nenhum arquivo do sistema foi alterado.

**Próximo passo (proposta)**
- Etapa 7: módulo IA (edge functions `finances-ai` e `compute-insights`, tabelas `ai_*`, assistente Kora em `auth.js`), com foco em LGPD (quais dados vão para a Anthropic), limites de uso e a regra dos insights (`compute_ai_insights`).

**O que revisar**
- ASS-S01 e ASS-S02 merecem confirmação imediata no ambiente de teste (CT-ASS-15 e CT-ASS-20): afetam receita.
- Decisões de produto: pagamento manual por Pix é caminho oficial? (REQ-ASS-11); valor em reais recalculado a cada renovação ou fixo? (REQ-ASS-03); público no exterior consegue pagar pelo Mercado Pago Brasil? (R-ASS-11).
- `homologacao/ASS/SEGURANCA-CONFIDENCIAL.md` e `homologacao/ADM/SEGURANCA-CONFIDENCIAL.md`: não publicar.

---

## 2026-10-13 — Chat 1 (continuação) — Etapa 5: módulo DSH

**Feito**
- Leitura integral de `dashboard.js` (função `load` de 40 instruções), `dashboard-movements.js` e das duas telas.
- Pacote completo de **DSH** (`homologacao/DSH/`, 11 arquivos).
- 2 scripts em `homologacao/scripts/etapa5/`: `variacao-e-graficos.js` (variação vs. mês anterior, rosca, evolução) e `visao-gerencial.js` (mesmo mês nas duas telas, lado a lado).

**Resultado (principais achados; detalhes no pacote)**
- 22 regras; 3 fluxos; 10 achados de segurança; 18 casos de teste; 10 requisitos.
- **Dashboard e Visão gerencial dão números diferentes para o mesmo mês**: a Visão gerencial soma receitas planejadas e canceladas (6.300 contra 5.000 no exemplo) e ignora ajustes de investimento (1.500 contra 1.700). O "Resultado" do mês fica superestimado (RN-DSH-012, 013, 015).
- **Visão gerencial esconde falhas**: erro em qualquer consulta vira lista vazia e os totais aparecem como completos; o aviso vai só ao console (RN-DSH-011).
- **Evolução do patrimônio** usa só fechamentos de investimento (que ninguém gera pelo app) e compara com um "Patrimônio atual" de outra base; sem fechamentos, a curva tem um ponto só (RN-DSH-006).
- **Patrimônio atual com saldo inicial das contas** também no dashboard (mesmo defeito do Planejamento), e o objetivo rápido ignora a opção "considerar patrimônio inicial" que o Planejamento respeita (RN-DSH-003, 007).
- Resgates de investimento não aparecem como movimento em nenhuma tela; variação mostra "+100 %" sem mês anterior e seta fixa; tradução parcial para inglês; mês em UTC.

**Parou em**
- Fim da Etapa 5, sem execução de testes. Nenhum arquivo do sistema foi alterado.

**Próximo passo (proposta)**
- Etapa 6: módulos ASS (assinatura: teste grátis, carência, Mercado Pago, cotação PTAX, edge functions `mp-*`) e ADM (administração), com conferência de valores e prazos por script. É a etapa com mais código de servidor (cerca de 1.200 linhas de TypeScript).

**O que revisar**
- Decisão de produto: definição única de "investimentos do mês" (aportes? ajustes? resgates como saída negativa?) para as três telas (REQ-DSH-01).
- Prioridade P1 de REQ-DSH-02 (evolução automática mensal) depende da decisão sobre fechamento de período (REQ-INV-04).
- `homologacao/DSH/SEGURANCA-CONFIDENCIAL.md`: não publicar.

---

## 2026-10-13 — Chat 1 (continuação) — Etapa 4: módulo PLN

**Feito**
- Leitura integral de `planning.js` (226 linhas, toda a matemática), `planning.html`, `wealth-goal.html` e das funções de objetivo do `dashboard.js`.
- Pacote completo de **PLN** (`homologacao/PLN/`, 11 arquivos).
- 4 scripts em `homologacao/scripts/etapa4/`: `projecao.js` (valor futuro, aporte necessário, meses até a meta, com conferência cruzada e conta à mão), `inflacao-ir.py`, `patrimonio-atual.py`, `capacidade.js`.

**Resultado (principais achados; detalhes no pacote)**
- 27 regras; 5 fluxos; 9 achados de segurança; 20 casos de teste; 14 requisitos.
- **As fórmulas financeiras estão corretas** (aporte necessário leva exatamente à meta; mês calculado coincide com a meta; conta à mão confere). Os problemas estão nas entradas e nas premissas:
- **Patrimônio atual usa o saldo INICIAL das contas**, não o saldo atual: receitas, despesas e transferências nunca entram (RN-PLN-004). Se o usuário declarou patrimônio inicial, esse número vale para sempre.
- **Prazo contado sempre a partir de hoje** (anos × 12): o plano nunca atrasa, e a previsão de chegada diverge da do dashboard (RN-PLN-005, 022).
- **Três "capacidades" diferentes na mesma tela**: a que decide o conselho ("O que fazer agora") divide por 6 meses fixos; a exibida divide pelos meses com dados. Com 3 meses de dados, o conselho usa 1.000 e a tela mostra 2.000 (RN-PLN-011 a 015).
- **Só a moeda principal conta**: renda em EUR com meta em BRL dá capacidade zero sem aviso (RN-PLN-024).
- **Taxa esperada dos investimentos é obrigatória e nunca usada** (RN-PLN-025). Inflação e tabela de IR fixas no código, IR com 30 dias por mês (RN-PLN-018, 019).
- **Nome de pessoa real fixo no código** como texto de espera e valor padrão (PLN-S01).

**Parou em**
- Fim da Etapa 4, sem execução de testes. Nenhum arquivo do sistema foi alterado.

**Próximo passo (proposta)**
- Etapa 5: módulo DSH (dashboard e visão gerencial "Transações"): conferir se o que a tela mostra bate com as tabelas, inclusive a evolução do patrimônio baseada em fechamentos.

**O que revisar**
- Prioridades P1 de REQ-PLN-01, 02, 03, 05, 09, 11 e 13.
- Decisão de produto: usar a taxa esperada dos investimentos como cenário (REQ-PLN-07) ou parar de coletá-la.
- `homologacao/PLN/SEGURANCA-CONFIDENCIAL.md`: não publicar.

---

## 2026-10-13 — Chat 1 (continuação) — Etapa 3: módulo INV

**Feito**
- Leitura integral dos 9 arquivos JS e das 9 telas HTML de investimentos (campos e textos extraídos por script), do script inline dos cartões de celular, do gatilho de lançamentos e dos 4 testes automáticos relacionados.
- Pacote completo de **INV** (`homologacao/INV/`, 11 arquivos).
- 2 scripts em `homologacao/scripts/etapa3/`: `totais-da-carteira.js` (lógica exata dos totais da tela, 4 casos) e `modelo-de-posicao-referencia.py` (modelo esperado da posição, marcado como inferência, para comparar com a visão no teste CT-INV-20).

**Resultado (principais achados; detalhes no pacote)**
- 33 regras; 5 fluxos; 10 achados de segurança; 33 casos de teste; 15 requisitos.
- **Nenhuma tela ou rotina grava a cotação atual** (`current_price`): investimentos com preço de mercado ficam para sempre em "Aguardando cotação"; totais viram "Parcial" e o patrimônio fica incompleto (RN-INV-013, R-INV-01).
- **Nenhuma tela fecha período** e o bloqueio de período fechado existe só nas telas; as duas funções do banco que alteram e excluem lançamentos não estão no repositório (RN-INV-025 a 027, INV-S01). A evolução do patrimônio do dashboard depende desses fechamentos.
- **A fórmula da posição** (quantidade, preço médio, resultado, rentabilidade) não está no repositório; só os nomes das colunas (RN-INV-011).
- **Testes automáticos provavelmente quebrados**: três arquivos inserem investimentos sem a taxa esperada, obrigatória no banco desde 2026-09-27 (RN-INV-010, R-INV-05).
- Sem GBP nas moedas de investimento, embora a conta aceite GBP; sem conferência valor = quantidade × preço; bloqueios de tipo/moeda/exclusão só na tela.

**Parou em**
- Fim da Etapa 3, sem execução de testes. Nenhum arquivo do sistema foi alterado.

**Próximo passo (proposta)**
- Etapa 4: módulo PLN (planejamento: cenários de taxa, inflação, imposto de renda, aporte necessário), com conferência dos cálculos por script. É o módulo com mais matemática (`planning.js`, 27 KB).

**O que revisar**
- Modelo de referência da posição é inferência (5 premissas listadas no script); só o teste CT-INV-20 no banco diz a fórmula real.
- Prioridades P1 de REQ-INV-01 a 05 e 08; decisões de produto: significado de "ajuste" (REQ-INV-15), rendimento/taxa sem conta (REQ-INV-10).
- `homologacao/INV/SEGURANCA-CONFIDENCIAL.md`: não publicar.

---

## 2026-10-13 — Chat 1 (continuação) — Etapa 2: módulos CTA e RDP

**Feito**
- Leitura integral dos 12 arquivos JS e das 12 telas HTML (campos, opções e textos extraídos por script) de contas, transferências, receitas e despesas, mais os 6 testes automáticos relacionados.
- Pacotes completos de **CTA** (`homologacao/CTA/`) e **RDP** (`homologacao/RDP/`), 11 arquivos cada, no formato do `CLAUDE.md`, seção 4.
- 5 conferências por script em `homologacao/scripts/etapa2/` (valor digitado, limites do mês, receitas do mês, data padrão, saldo e câmbio), rodadas em 7 fusos horários.

**Resultado (principais achados; detalhes nos pacotes)**
- CTA: 23 regras; 6 fluxos; 9 achados de segurança; 26 casos de teste; 13 requisitos. RDP: 30 regras; 6 fluxos; 9 achados de segurança; 29 casos de teste; 15 requisitos.
- **Valor digitado com ponto é lido 100 vezes maior** em transferências e despesas (campos de texto): "100.50" vira 10.050 (RN-CTA-016, RN-RDP-025). A receita usa campo numérico e não tem o problema.
- **Limites de "este mês" erram na Europa**: Itália e Alemanha em todos os 12 meses; Portugal e Reino Unido de abril a outubro; Brasil e EUA não. Exemplo com a conta: em outubro na Itália, "Recebido este mês" soma 200 em vez de 500 (RN-RDP-007). O mesmo padrão aparece em 10 arquivos, inclusive dashboard e planejamento (tratar nas Etapas 4 e 5).
- **Despesas aparecem sempre em R$**, qualquer que seja a moeda principal (RN-RDP-017), e a despesa nunca usa a moeda da conta (RN-RDP-015, RN-RDP-022).
- **Ponto crítico a validar primeiro**: não há tela nem código que crie categorias de despesa, e a categoria é obrigatória (RN-RDP-020). Se um usuário novo não receber categorias de algum lugar fora do repositório, ele não consegue registrar nenhuma despesa (CT-RDP-01).
- **Primeira conta e primeira receita criadas pelo assistente** usam outro vocabulário (tipo da conta, frequência, formato da moeda) e a receita nasce sem conta e sem data. Efeito provável: o campo "Tipo" fica em branco ao editar a conta e a receita some de "Recebido este mês" (RN-CTA-021, RN-RDP-010). A confirmar no teste.
- Transferência: a tela de edição existe sem link, não há exclusão (e o privilégio de exclusão não foi concedido), e não há proteção contra duplo clique (RN-CTA-018, RN-CTA-022).
- Saldo da conta: fórmula conferida (exemplo = 1.172,00); soma sem converter moeda e sem considerar a data (RN-CTA-008).

**Parou em**
- Fim da Etapa 2, sem execução de testes (apenas planejados). Nenhum arquivo do sistema foi alterado.

**Próximo passo (proposta)**
- Etapa 3: módulo INV (tipos de investimento, investimentos, lançamentos, fechamentos e posições). É o maior módulo (9 telas) e traz o fechamento de período. Antes, se o analista puder: executar CT-RDP-01 (categorias do usuário novo) e T-BD-01 (inventário real do esquema), que fecham os pontos críticos das Etapas 1 e 2.

**O que revisar**
- Severidades e prioridades são inferência; ajustar conforme o negócio. Em especial a prioridade P1 de REQ-CTA-01 (formato de número) e REQ-CTA-05 (fuso): dependem de quantos usuários estão na Europa e nos EUA.
- Decisões de produto abertas: exclusão de transferência (REQ-CTA-04), saldo considerar data (REQ-CTA-12, REQ-RDP-15), saldo inicial negativo (REQ-CTA-09).
- `homologacao/CTA/SEGURANCA-CONFIDENCIAL.md` e `homologacao/RDP/SEGURANCA-CONFIDENCIAL.md`: não publicar.

---

## 2026-10-13 — Chat 1 (continuação) — Etapa 1: módulos BD e ACS

**Feito**
- Leitura integral de: `auth.js`, `login.js`, `signup.js`, `settings.js`, `app.js`, `index.html`, `login.html`, `signup.html`, `settings.html`, `workspace.html`, as 30 migrações SQL, os testes `login`, `onboarding`, `workspace-review`, `navigation` e os helpers.
- Pacote completo do módulo **BD** (`homologacao/BD/`, 11 arquivos) e do módulo **ACS** (`homologacao/ACS/`, 11 arquivos), no formato do `CLAUDE.md`, seção 4.
- Cálculos do assistente (data estimada, receita mensal equivalente, aviso de aporte) conferidos por script com casos de exemplo; resultados em `homologacao/ACS/08-plano-de-testes.md`.

**Resultado (principais achados; detalhes nos pacotes)**
- BD: 16 regras extraídas; esquema (27 tabelas, 63 políticas) continua fora do repositório; 11 achados de segurança no documento confidencial, dos quais o mais relevante para o negócio é que o bloqueio comercial existe só na tela, não no banco (BD-S04). 12 testes propostos (consultas e tentativas de acesso, só leitura).
- ACS: 31 regras extraídas; 6 fluxos descritos com fluxogramas; 13 achados de segurança (destaques: termos de uso sem link nem registro de aceite, ACS-S09; sem "esqueci minha senha", ACS-S04; nome e país do cadastro descartados, RN-ACS-004; link de confirmação fixo em produção, ACS-S05). 25 casos de teste com dados `TESTE`. 14 requisitos em "O ideal".
- Pontos para validar que dependem do analista: (a) política de senha e confirmação de e-mail no projeto de teste; (b) quais são as 2 tabelas que o código não cita (27 declaradas vs. 25 identificadas); (c) se a 1ª receita criada no assistente deveria ficar vinculada à 1ª conta (hoje não fica, RN-ACS-022); (d) ambiente de teste: segundo usuário `TESTE` para os testes de isolamento.

**Parou em**
- Fim da Etapa 1, sem execução de testes (apenas planejados). Nenhum arquivo do sistema foi alterado.

**Próximo passo (proposta)**
- Etapa 2: módulos CTA (contas e transferências) e RDP (receitas e despesas). Antes, se o analista quiser, executar T-BD-01 (inventário real do esquema) no projeto de teste, pois ele resolve vários "Pontos para validar" de uma vez e alimenta os modelos de dados das próximas etapas.

**O que revisar**
- Severidades e prioridades (P1/P2/P3) são inferência do analista de homologação; ajustar conforme a visão do negócio.
- `homologacao/BD/SEGURANCA-CONFIDENCIAL.md` e `homologacao/ACS/SEGURANCA-CONFIDENCIAL.md`: não publicar.
- Campos não preenchidos do briefing continuam assumidos (ver `homologacao/00-reconhecimento/RECONHECIMENTO.md`, seção 8).

---

## 2026-10-13 — Chat 1 — Etapa 0: reconhecimento do material

**Feito**
- Leitura deste repositório (`Nardacci/KORbuildFinances`, branch `main`, último commit 2026-09-28).
- Inventário por script: tipos de arquivo, telas, JS por tela, tabelas e RPCs usados por arquivo, objetos das migrações, edge functions, integrações externas, testes, histórico git.
- Leitura dos dois documentos existentes em `docs/` (diagnóstico de segurança de 2026-09-13 e baseline de migrações de produção de 2026-09-24).
- Criados `CLAUDE.md` (regras do projeto) e `homologacao/00-reconhecimento/RECONHECIMENTO.md` (tabelas do reconhecimento) e `inventario.sh` (script reproduzível).

**Resultado (resumo; detalhes em `homologacao/00-reconhecimento/RECONHECIMENTO.md`)**
- Sistema real em produção: site estático + Supabase (esquema `finances`), 33 telas HTML, 8 edge functions, 30 migrações, cobrança por Mercado Pago, cotação PTAX do Banco Central, assistente de IA (Anthropic).
- 10 módulos propostos: ACS, CTA, RDP, INV, PLN, DSH, ASS, ADM, IA, BD (siglas no `CLAUDE.md`, seção 6).
- Lacunas principais: README desatualizado (ainda descreve protótipo); esquema do banco (27 tabelas, 63 políticas de acesso) não está no repositório; nenhum documento de regras, fluxos, permissões ou modelo de dados; cálculos de planejamento e conversão de moeda sem memória de cálculo; parte do código está minificada no repositório.
- Risco operacional para este trabalho: os testes automáticos apontam para o mesmo projeto Supabase de produção e criam registros `TESTE_E2E_`. Não rodar até confirmar ambiente de teste.
- Duas pendências de segurança (severidade média) continuam abertas desde 2026-09-13 (políticas de acesso não versionadas; sessão inválida não força novo login).

**Decisões do analista (mesmo dia, após a entrega)**
- Ordem das etapas aprovada ("sim").
- Ambiente de teste: o projeto Supabase de `supabase/config.toml`. Registrado no `CLAUDE.md`, seção 2, com o ponto para validar (o baseline o chama de produção).

**Parou em**
- Fim da Etapa 0, aprovada. Etapa 1 (BD + ACS) iniciada em seguida no mesmo chat.
- `CLAUDE.md` e `homologacao/` foram gravados primeiro por engano no repositório KORbuildMatch; a pedido do analista, movidos para a raiz deste repositório (KORbuildFinances) e removidos do Match no mesmo dia.

**Próximo passo (ordem aprovada em 2026-10-13)**
1. Etapa 1: módulo BD + ACS (banco, perfis de acesso, login, cadastro, assistente inicial), porque tudo depende deles. Inclui confirmar ambiente de teste e qual projeto Supabase é qual.
2. Etapa 2: CTA (contas e transferências) e RDP (receitas e despesas): base dos saldos.
3. Etapa 3: INV (investimentos, lançamentos, fechamentos, posições).
4. Etapa 4: PLN (planejamento: cenários, inflação, IR, aporte) com conferência dos cálculos por script.
5. Etapa 5: DSH (dashboard e visão gerencial): confere se o que a tela mostra bate com as tabelas.
6. Etapa 6: ASS + ADM (assinatura, teste grátis, carência, Mercado Pago, PTAX, administração) com conferência de valores e prazos.
7. Etapa 7: IA (assistente e insights) com foco em LGPD e limites de uso.
8. Etapa 8: consolidação: análise de risco geral, plano de testes integrado, "O ideal" do sistema.

**O que revisar**
- Campos do briefing que vieram sem preenchimento (o que está em jogo, normas, o que fica fora): as suposições estão na seção 8 do `RECONHECIMENTO.md`.
- Agrupamento em 10 módulos: é inferência a partir dos nomes de arquivos; ajustar se a empresa enxerga diferente.
