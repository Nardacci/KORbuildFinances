# IA · 01 — Reconhecimento do módulo Assistente de IA e insights (Kora)

Data: 2026-10-13. Escopo: o assistente "Kora" (botão flutuante e painel de conversa presente nas telas logadas), a edge function que responde às perguntas usando a API da Anthropic, as quatro "ferramentas" de simulação financeira, o controle de limite mensal de perguntas por workspace e o job noturno que calcula "insights" de comportamento de gastos.

Termos usados aqui: **edge function** = programa que roda nos servidores do Supabase (não no navegador); **modelo** = o programa de IA da Anthropic que gera as respostas (família Claude); **token** = unidade de cobrança da API de IA (aproximadamente 3/4 de uma palavra); **prompt do sistema** = instruções fixas enviadas ao modelo antes da conversa; **ferramenta (tool)** = função que o modelo pode pedir para o servidor executar (aqui: cálculos sobre a meta financeira); **insight** = frase pré-calculada sobre o comportamento de gastos, anexada ao contexto do modelo.

## Arquivos do módulo

| Arquivo | Linhas | Papel | Observação |
|---|---|---|---|
| `supabase/functions/finances-ai/index.ts` | 772 | Porta de entrada da IA: autentica, aplica o limite mensal, anexa insights, chama a Anthropic com 4 ferramentas, registra uso | Modelo fixo `claude-sonnet-5` (:27); prompt do sistema em inglês (:42-72); CORS aberto (:33-40) |
| `supabase/functions/compute-insights/index.ts` | 40 | Gatilho do job noturno: confere segredo e chama `finances.compute_ai_insights()` | Sem JWT; segredo `x-cron-secret` (:32-33) |
| `auth.js` | 101-269 | Painel Kora (botão flutuante + painel), histórico no `sessionStorage`, chamada à função, conversão de Markdown em HTML | Renderiza só em páginas com `.sidebar` e sem `data-ai-assistant="off"` (:182-183) |
| `dashboard.css` | — | Estilos `.ai-fab` / `.ai-panel` | fora da análise |
| `supabase/migrations/20260914160000_ai_usage_log.sql` | 27 | Tabela `ai_usage_log` (uma linha por tentativa de pergunta) | RLS sem políticas (:24) |
| `supabase/migrations/20260914233000_ai_insights.sql` | 156 | Tabela `ai_insights` e função `compute_ai_insights()` (regra de "categoria acima da média") | RLS sem políticas (:23); função apaga tudo e recalcula (:58) |
| `supabase/migrations/20260914233500_ai_insights_daily_schedule.sql` | 30 | Job `daily-ai-insights` no pg_cron, 06:00 UTC, chama a função via pg_net com segredo do Vault | O endereço chamado (:22) contém um identificador de projeto **diferente** do de `supabase/config.toml` (ver "Pontos para validar") |
| `supabase/migrations/20260915190000_finances_admin_ai_limits.sql` | 109 | RPCs do administrador `get_ai_limits` / `update_ai_limit` | A tabela `ai_workspace_limits` "foi criada manualmente" (:14-19); DDL fora do repositório |
| `supabase/config.toml` | 3-6 | `verify_jwt = false` para `compute-insights` | |
| `finances-admin.html` / `finances-admin.js` | — | Bloco "Consumo de IA" do painel administrativo | Analisado no módulo ADM (RN-ADM-002 a 004) |

## Telas

| Tela | Onde | Situação |
|---|---|---|
| Botão "✦ Kora" e painel de conversa | Injetados por `auth.js:185-194` em todas as 26 páginas que têm `.sidebar` (dashboard, contas, receitas, despesas, transferências, investimentos, planejamento, cadastros e suas telas de edição) | Funciona (inferência pela leitura; sem teste) |
| Páginas sem Kora | `billing.html:14` e `finances-admin.html:14` (`data-ai-assistant="off"`); `index.html`, `login.html`, `signup.html`, `workspace.html` (sem `.sidebar`) | Por desenho |
| Tela de insights | Não existe: os insights só servem de contexto para o modelo; o usuário nunca os vê diretamente | Lacuna de produto |

## Tabelas e funções de banco

| Objeto | Tipo | Quem acessa | DDL no repositório |
|---|---|---|---|
| `finances.ai_usage_log` | tabela | só `service_role` (edge function) e `get_ai_limits` (admin) | Sim (`20260914160000`) |
| `finances.ai_insights` | tabela | só `service_role` | Sim (`20260914233000`) |
| `finances.ai_workspace_limits` | tabela | `service_role` (leitura) e `update_ai_limit` (admin) | **Não** (colunas inferidas: `workspace_id`, `monthly_request_limit`, `enabled`, `updated_by`, `updated_at` — `20260915190000_...:98-104`; `finances-ai/index.ts:657-663`) |
| `finances.compute_ai_insights()` | função SQL, retorna número de insights gravados | só `service_role` (`20260914233000_...:156`) | Sim |
| `finances.get_ai_limits()` / `update_ai_limit()` | RPCs do admin | `authenticated` + verificação `is_finances_admin()` | Sim |
| job `daily-ai-insights` | pg_cron | — | Sim, mas a baseline de produção lista `create_finances_cron_jobs` (`docs/PROD_DATABASE_MIGRATION_BASELINE_2026-09-24.md:54`), que não está no repositório; o job real pode diferir |

## Integrações externas

| Integração | Como | Segredo (só o nome; valor nunca no repositório) |
|---|---|---|
| API da Anthropic (modelo Claude) | SDK `@anthropic-ai/sdk@0.125.0` (`finances-ai/index.ts:20`), chamadas `messages.create` em até 3 rodadas (:707-714) | `ANTHROPIC_API_KEY` (:16, :25) |
| Supabase Auth | `getUser()` com o token do usuário (:626) | — |
| pg_cron + pg_net + Vault | agenda diária que chama a função HTTP com o segredo guardado no Vault (`20260914233500_...:17-30`) | `CRON_SECRET` na função (`compute-insights/index.ts:13, 20`) e `cron_secret` no Vault |

## O que vai para a Anthropic em cada pergunta (lido do código)

| Conteúdo | Fonte | Observação |
|---|---|---|
| Prompt do sistema fixo (em inglês) | `index.ts:42-72` | Não contém dados do usuário |
| Até 5 insights ativos: frase com **nome da categoria**, média mensal e total do último mês, com a moeda | `index.ts:686-697`; `20260914233000_...:128-137` | Dado financeiro do workspace |
| Até 8 mensagens anteriores (usuário e assistente), 4.000 caracteres cada | `index.ts:158-175, 702` | Texto livre: pode conter o que o usuário quiser digitar (inclusive dados pessoais) |
| A pergunta atual | `index.ts:643, 702` | Texto livre |
| Resultados das ferramentas: nome da meta, alvo, patrimônio, capacidade, nomes de categorias, projeções | `index.ts:521-540, 551-565, 578-586, 605-611` | Dados financeiros; nunca linhas individuais de lançamentos |
| **Não vai**: e-mail, nome, identificador do usuário ou do workspace, extrato de lançamentos | leitura de `index.ts` | O identificador do workspace fica só no banco (`ai_usage_log`) |

## Testes automatizados existentes

Nenhum arquivo em `tests/` cita `finances-ai`, `ai_usage_log`, `ai_insights` ou `compute_ai_insights`.

## O que está sem documentação

- Para o usuário: o que a Kora faz, o que não faz, quais dados saem do sistema e para quem (não há aviso de privacidade nem termo de uso no repositório; ver ACS 05).
- Para a operação: como semear o segredo do Vault e o `CRON_SECRET`; como conferir se o job noturno rodou (a função devolve `insights_written`, mas ninguém lê esse retorno; `compute-insights/index.ts:39`).
- DDL de `ai_workspace_limits` e o job de produção (`create_finances_cron_jobs`).
- Preço e limite financeiro: o sistema limita **número de perguntas**, não tokens nem dólares (`index.ts:665-680`).
- O prompt diz ao modelo que "histórico de transações e contexto financeiro livre ainda não estão ligados" e manda responder "em breve" (`index.ts:43-47`): o estado do produto está codificado em inglês dentro do prompt, sem correspondência em documento de produto.

## Pontos para validar

1. **Endereço do job noturno.** `20260914233500_...:22` chama a função `compute-insights` de um projeto cujo identificador não é o de `supabase/config.toml`. Inferência: no ambiente de teste atual, o job agendado (se existir com esse texto) chama o projeto antigo, e o projeto de teste não recebe insights. Conferir com `select jobname, command from cron.job` (consulta só de leitura) no ambiente de teste.
2. **Privilégio de DELETE.** `compute_ai_insights()` executa `DELETE FROM finances.ai_insights` (`20260914233000_...:58`) e não é `SECURITY DEFINER` (:51-54); roda com os privilégios de quem chama (`service_role`). A única concessão versionada a `service_role` é `SELECT, INSERT, UPDATE` (`20260925010000_...:15-16`), e o comentário diz que o DELETE foi deixado de fora de propósito porque só procuraram `.delete(` em arquivos TypeScript (:11-13). Inferência: o job falha com "permission denied" e nunca grava insights. Conferir com `select has_table_privilege('service_role', 'finances.ai_insights', 'DELETE')`.
3. **Modelo.** `claude-sonnet-5` é um identificador válido de geração anterior (a atual é a 5.5). Não há data de descontinuação conhecida, mas o código não tem alternativa se o modelo for retirado (resposta 502 para todo usuário).
4. **Status comercial.** A função não consulta `get_workspace_access_status`; o painel só não aparece em `billing.html`. Um workspace BLOCKED com token válido consegue chamar a função diretamente (ver SEGURANCA-CONFIDENCIAL, IA-S04).
