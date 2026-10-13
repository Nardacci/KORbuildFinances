# Fase 1 — Consultas só de leitura no banco de teste

Objetivo: confirmar, sem criar nem alterar nada, as maiores dúvidas da homologação (inventário do esquema, privilégios, jobs agendados, job de insights, origem das categorias, fórmula da posição, dados guardados do pagador). Tempo estimado: meio dia. Quem executa: o dono do projeto, no **SQL Editor do projeto de teste** (o de `supabase/config.toml`). Quem registra: o analista, com o script `homologacao/scripts/etapa9/comparar-fase1.py`.

## Regras

1. Todas as consultas abaixo são `select`. **Não executar** nada que comece com `update`, `delete`, `insert`, `grant`, `alter`, `drop` ou `create`.
2. Antes de rodar, confirmar no topo do SQL Editor que o projeto aberto é o de teste.
3. Salvar cada resultado com "Download CSV" (ou "Copy as CSV") usando **exatamente** o nome de arquivo indicado, dentro de `homologacao/testes/fase1/resultados/`.
4. **Anonimizar antes de salvar no repositório.** Alguns resultados (comandos dos jobs, definições de funções) contêm o identificador do projeto e podem conter e-mails. Rodar `python3 -I homologacao/scripts/etapa9/comparar-fase1.py --sanear` depois de copiar os arquivos: ele registra primeiro, em `T-BD-09-alvo.md`, se cada job aponta para o projeto de teste ("igual" ou "DIFERENTE", sem copiar o identificador) e depois substitui identificadores de projeto por `<id-do-projeto>`, e-mails por `<email>` e tokens por `<token>`. O script se recusa a comparar enquanto houver algo não anonimizado.
5. Se uma consulta der erro de permissão, registrar a mensagem no arquivo `ERROS.md` da pasta de resultados e seguir para a próxima.

## Bloco 1 — Inventário real do esquema (T-BD-01)

**1a** — tabelas e visões → `T-BD-01a-tabelas.csv`
```sql
select table_name, table_type
from information_schema.tables
where table_schema = 'finances'
order by table_name;
```

**1b** — colunas → `T-BD-01b-colunas.csv`
```sql
select table_name, column_name, data_type, is_nullable, column_default
from information_schema.columns
where table_schema = 'finances'
order by table_name, ordinal_position;
```

**1c** — funções → `T-BD-01c-funcoes.csv`
```sql
select p.proname as funcao,
       pg_get_function_identity_arguments(p.oid) as argumentos,
       p.prosecdef as security_definer,
       p.prokind as tipo,
       l.lanname as linguagem
from pg_proc p
join pg_language l on l.oid = p.prolang
where p.pronamespace = 'finances'::regnamespace
order by 1, 2;
```

**1d** — políticas de RLS → `T-BD-01d-politicas.csv`
```sql
select tablename, policyname, cmd, roles, permissive, qual, with_check
from pg_policies
where schemaname = 'finances'
order by tablename, policyname;
```

**1e** — RLS ativo por tabela e volume de linhas → `T-BD-01e-rls-volume.csv`
```sql
select c.relname as tabela, c.relrowsecurity as rls_ativo, c.relforcerowsecurity as rls_forcado,
       s.n_live_tup as linhas_aprox
from pg_class c
left join pg_stat_user_tables s on s.relid = c.oid
where c.relnamespace = 'finances'::regnamespace and c.relkind = 'r'
order by 1;
```

**1f** — restrições e gatilhos → `T-BD-01f-restricoes.csv` e `T-BD-01f-gatilhos.csv`
```sql
select conrelid::regclass as tabela, conname as restricao, contype as tipo, pg_get_constraintdef(oid) as definicao
from pg_constraint
where connamespace = 'finances'::regnamespace
order by 1, 2;
```
```sql
select tgrelid::regclass as tabela, tgname as gatilho, pg_get_triggerdef(oid) as definicao
from pg_trigger
where not tgisinternal and tgrelid in (select oid from pg_class where relnamespace = 'finances'::regnamespace)
order by 1, 2;
```

**1g** — definição das visões (inclui `investment_positions`, CT-INV-20) → `T-BD-01g-visoes.csv`
```sql
select viewname, definition
from pg_views
where schemaname = 'finances'
order by viewname;
```

## Bloco 2 — Privilégios por tabela (T-BD-02, T-BD-03) → `T-BD-02-privilegios.csv`

```sql
select c.relname as objeto, c.relkind as tipo, r.papel,
       has_table_privilege(r.papel, c.oid, 'SELECT') as pode_select,
       has_table_privilege(r.papel, c.oid, 'INSERT') as pode_insert,
       has_table_privilege(r.papel, c.oid, 'UPDATE') as pode_update,
       has_table_privilege(r.papel, c.oid, 'DELETE') as pode_delete
from pg_class c
cross join (values ('anon'), ('authenticated'), ('service_role')) as r(papel)
where c.relnamespace = 'finances'::regnamespace and c.relkind in ('r', 'v')
order by 1, 3;
```

## Bloco 3 — Funções chamáveis e sobrecargas (T-BD-05, T-BD-11, T-BD-12)

**3a** — quem pode executar cada função → `T-BD-05-funcoes-privilegios.csv`
```sql
select p.proname as funcao, pg_get_function_identity_arguments(p.oid) as argumentos,
       has_function_privilege('anon', p.oid, 'execute') as anon,
       has_function_privilege('authenticated', p.oid, 'execute') as authenticated,
       has_function_privilege('service_role', p.oid, 'execute') as service_role
from pg_proc p
where p.pronamespace = 'finances'::regnamespace
order by 1, 2;
```

**3b** — definição completa das funções (para comparar com o repositório) → `T-BD-12-definicoes.csv` (arquivo grande; **anonimizar**)
```sql
select p.proname as funcao, pg_get_function_identity_arguments(p.oid) as argumentos, pg_get_functiondef(p.oid) as definicao
from pg_proc p
where p.pronamespace = 'finances'::regnamespace and p.prokind = 'f'
order by 1, 2;
```

T-BD-06 (funções administrativas negam usuário comum) precisa de um usuário logado não administrador: fica para a Fase 4, depois de criar `TESTE_A`.

## Bloco 4 — Jobs agendados (T-BD-09, T-BD-10, CT-ASS-23, CT-IA-19)

**4a** — jobs → `T-BD-09-jobs.csv` (**anonimizar**: o comando contém o endereço do projeto)
```sql
select jobid, jobname, schedule, active, command
from cron.job
order by jobid;
```

**4b** — últimas execuções → `T-BD-10-execucoes.csv`
```sql
select j.jobname, d.status, d.return_message, d.start_time, d.end_time
from cron.job_run_details d
left join cron.job j on j.jobid = d.jobid
order by d.start_time desc
limit 40;
```

**4c** — respostas HTTP das chamadas feitas pelos jobs (mostra se a função respondeu 200, 401 ou 500 e a mensagem) → `T-BD-10-respostas-http.csv`
```sql
select id, status_code, timed_out, error_msg, left(content::text, 300) as inicio_do_conteudo, created
from net._http_response
order by created desc
limit 40;
```

## Bloco 5 — Job de insights (CT-IA-18) → `CT-IA-18-insights.csv`

```sql
select
  has_table_privilege('service_role', 'finances.ai_insights', 'DELETE') as service_role_delete_ai_insights,
  has_table_privilege('service_role', 'finances.ai_insights', 'INSERT') as service_role_insert_ai_insights,
  has_table_privilege('service_role', 'finances.ai_usage_log', 'INSERT') as service_role_insert_usage_log,
  (select count(*) from finances.ai_insights) as insights_existentes,
  (select max(created_at) from finances.ai_insights) as ultimo_insight,
  (select count(*) from finances.ai_usage_log) as chamadas_ia_total,
  (select count(*) from finances.ai_usage_log where status = 'success') as chamadas_ia_sucesso,
  (select count(*) from finances.ai_usage_log where status = 'error') as chamadas_ia_erro,
  (select count(*) from finances.ai_workspace_limits) as limites_cadastrados;
```

## Bloco 6 — Origem das categorias de despesa (CT-RDP-01, parte SQL) → `CT-RDP-01-categorias.csv`

```sql
select
  (select count(*) from finances.user_workspaces) as workspaces,
  (select count(distinct workspace_id) from finances.expense_categories where workspace_id is not null) as workspaces_com_categorias,
  (select count(*) from finances.expense_categories where workspace_id is null) as categorias_sem_workspace,
  (select count(*) from finances.expense_categories) as categorias_total,
  (select string_agg(name, ' | ' order by name) from finances.expense_categories where workspace_id is null) as nomes_sem_workspace,
  (select string_agg(proname, ', ') from pg_proc where pronamespace = 'finances'::regnamespace and prosrc ilike '%expense_categories%') as funcoes_que_citam_categorias;
```

## Bloco 7 — Fórmula da posição (CT-INV-20, parte SQL)

Já coberto por **1g** (`T-BD-01g-visoes.csv`). Nada a executar a mais.

## Bloco 8 — O que fica guardado do pagador (CT-ASS-26) → `CT-ASS-26-payload-chaves.csv`

Só os **nomes** dos campos, nunca os valores:
```sql
select 'raiz' as nivel, k as campo, count(*) as ocorrencias
from finances.payment_events, jsonb_object_keys(raw_payload) k
group by 1, 2
union all
select 'payer', k, count(*)
from finances.payment_events, jsonb_object_keys(coalesce(raw_payload -> 'payer', '{}'::jsonb)) k
group by 1, 2
order by 1, 3 desc;
```
E o volume: → `CT-ASS-26-volume.csv`
```sql
select count(*) as eventos, min(created_at) as primeiro, max(created_at) as ultimo
from finances.payment_events;
```

## Depois de salvar os arquivos

```
python3 -I homologacao/scripts/etapa9/comparar-fase1.py --sanear
python3 -I homologacao/scripts/etapa9/comparar-fase1.py
```

O segundo comando imprime, por bloco, o que o banco MOSTRA comparado com o que o repositório MOSTRA e com o que a homologação INFERIU. O analista então atualiza a coluna "Situação" das regras nos pacotes e registra o resultado no diário.
