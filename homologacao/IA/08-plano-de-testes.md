# IA · 08 — Plano de testes

Ambiente: só o projeto de teste (ver `CLAUDE.md` §2). Workspace de teste com nome começando com `TESTE`. **Atenção:** cada pergunta à Kora consome créditos reais da API da Anthropic e conta no limite do workspace; agrupar os testes de conversa e usar perguntas curtas. Os testes que exigem o segredo do job (`CRON_SECRET`) ou SQL no painel do Supabase devem ser executados pelo dono do projeto; as consultas SQL listadas são só de leitura.

Pré-condições comuns: usuário `TESTE-IA` com workspace `TESTE Workspace IA`, moeda principal BRL, em teste grátis ativo; categorias `TESTE Alimentação`, `TESTE Alimentação fora`, `TESTE Transporte`; 6 meses de despesas realizadas (conforme CT-IA-17); meta `TESTE Meta` de 100.000 BRL em 5 anos; plano com aporte 1.000 e taxa 0.

| Código | Fluxo | Caso | Passos | Resultado esperado | Regra |
|---|---|---|---|---|---|
| CT-IA-01 | F1 | Painel presente nas telas logadas | Abrir `dashboard.html`, `expenses.html`, `planning.html` | Botão "✦ Kora" no canto; painel abre e fecha pelo botão e pelo ✕; clicar fora não fecha | RN-IA-001 |
| CT-IA-02 | F1 | Painel ausente onde deve | Abrir `billing.html`, `finances-admin.html` (como admin), `login.html` | Sem botão Kora | RN-IA-001 |
| CT-IA-03 | F1 | Pergunta geral | Perguntar "Qual é o seu nome?" | Responde que é Kora; bolha formatada; campo reabilitado; `ai_usage_log` ganha 1 linha `success` com tokens > 0 (SQL: `select status, input_tokens, output_tokens from finances.ai_usage_log where workspace_id = ... order by created_at desc limit 1`) | RN-IA-013, 016 |
| CT-IA-04 | F1 | Histórico mantido entre páginas | Após CT-IA-03, navegar para `accounts.html` | Conversa anterior reaparece no painel | RN-IA-002 |
| CT-IA-05 | F1 | Histórico após logout (IA-S05) | Sair; entrar com outro usuário `TESTE-IA-2` na mesma aba | **Como é hoje:** a conversa do primeiro usuário aparece. **Como deve ser:** painel vazio | RN-IA-002; REQ-IA-05 |
| CT-IA-06 | F1 | Sessão expirada | Apagar o token do `localStorage` e perguntar | Redireciona para `login.html` | RN-IA-005 |
| CT-IA-07 | F1 | Formatação | Pedir "monte uma tabela com 3 linhas e uma lista" | Tabela e lista renderizadas; nenhum HTML cru; texto com `<b>` digitado pelo usuário aparece literal | RN-IA-034 |
| CT-IA-08 | F2 | Bloqueio ao atingir o limite | Admin define limite 2 para o workspace; fazer 3 perguntas | 3ª mostra "Você atingiu o limite…"; `ai_usage_log` tem 2 `success` + 1 `blocked_budget` | RN-IA-008, 010 |
| CT-IA-09 | F2 | Limite 0 | Admin define 0 | Toda pergunta bloqueada | RN-IA-010 |
| CT-IA-10 | F2 | Desabilitado | Admin desmarca "habilitado", limite 100 | Bloqueado; painel ADM mostra uso inalterado | RN-IA-010 |
| CT-IA-11 | F2 | Erros não contam (IA-S06) | Com limite 1, provocar erro (ex.: admin troca temporariamente a chave da Anthropic por valor inválido no ambiente de teste) e perguntar 3 vezes; restaurar a chave | 3 linhas `error`, nenhuma bloqueada; depois 1 `success` permitido. **Como deve ser:** erros limitados | RN-IA-011; REQ-IA-06 |
| CT-IA-12 | F3 | Sem meta | Em workspace sem meta, perguntar "como está minha meta?" | Resposta orienta a criar meta em Planejamento; sem números inventados | RN-IA-021, 013 |
| CT-IA-13 | F3 | Categoria ambígua | Perguntar "e se eu gastar 20 % a menos com alimentação?" | Kora pergunta qual das duas categorias `TESTE Alimentação…` | RN-IA-025 |
| CT-IA-14 | F3 | Cenário | Responder "Alimentação" (a primeira) | Resposta cita média da categoria, valor liberado/mês e projeção; conferir com `simulacao-de-cenario.py` adaptado aos dados `TESTE` | RN-IA-026 |
| CT-IA-15 | F3 | Status da meta | "Quanto falta para a meta?" | Alvo, patrimônio atual, restante, %, prazo; o patrimônio deve ser igual ao do Planejamento (ambos pelo saldo inicial hoje) | RN-IA-019, 028 |
| CT-IA-16 | F3 | Projeção sem horizonte | "Quanto vou ter no futuro?" | Kora pergunta o prazo antes de calcular; depois de "em 2 anos", responde com taxa 0 | RN-IA-029, 013 |
| CT-IA-17 | F4 | Regra do insight | Lançar despesas realizadas em `TESTE Transporte` nos 6 meses fechados: 500, 900, 500, 900, 500, 900 (último mês fechado = 900); disparar o job (CT-IA-20) | Uma linha em `ai_insights` para o workspace com `category_overrun` e a frase com "TESTE Transporte"; SQL de leitura: `select summary, expires_at from finances.ai_insights where workspace_id = ...` | RN-IA-030, 031 |
| CT-IA-18 | F4 | Privilégio de DELETE (IA-S02) | SQL: `select has_table_privilege('service_role', 'finances.ai_insights', 'DELETE')` | **Inferência:** `false`. Se `false`, CT-IA-20 falha com "permission denied" | IA-S02 |
| CT-IA-19 | F4 | Endereço do job (IA-S03) | SQL: `select jobname, schedule, command from cron.job` | Conferir se o endereço contém o identificador do projeto de teste (o de `supabase/config.toml`); registrar só "igual/diferente", nunca o identificador | IA-S03 |
| CT-IA-20 | F4 | Disparo manual do job | Dono do projeto: `POST /functions/v1/compute-insights` com cabeçalho `x-cron-secret` correto; depois com segredo errado | Correto: `{"insights_written": n}` ou erro `compute_failed` (registrar a mensagem); errado: 401 | RN-IA-032 |
| CT-IA-21 | F1 | Usuário bloqueado (IA-S04) | Admin marca `TESTE Workspace IA` como SUSPENDED/BLOCKED; no console do navegador chamar `KORbuildAuth.client.functions.invoke('finances-ai', {body:{message:'oi'}})` | **Como é hoje:** responde. **Como deve ser:** 403 | RN-IA-037; REQ-IA-04 |
| CT-IA-22 | F1 | Insight no contexto | Após CT-IA-17 com sucesso, perguntar "tem algo que eu deva saber sobre meus gastos?" | Kora cita a categoria `TESTE Transporte` acima da média | RN-IA-012 |
| CT-IA-23 | F2 | Virada de mês UTC | Observar o contador no painel ADM às 21:00 do último dia do mês (Brasília) | Zera às 21:00 (00:00 UTC) | RN-IA-009 |

Limpeza: remover o workspace e os registros `TESTE…`; restaurar limite 100/habilitado; conferir que a chave da Anthropic foi restaurada (CT-IA-11).
