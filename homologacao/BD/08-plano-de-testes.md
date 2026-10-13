# BD · 08 — Plano de testes

Regras: só no projeto de teste confirmado pelo analista (`CLAUDE.md`, seção 2); só registros cujo nome começa com `TESTE`; nunca apagar ou alterar registro que não comece com `TESTE`. Os testes abaixo são consultas e tentativas de acesso, não alteram estrutura.

Pré-requisitos: dois usuários de teste em workspaces diferentes (`TESTE_A`, `TESTE_B`), ambos com configuração concluída. Confirmar com o analista quais contas usar (o `.env.example` prevê um só usuário).

| ID | Objetivo | Passos | Resultado esperado | Regra |
|---|---|---|---|---|
| T-BD-01 | Inventário real do esquema | Consultar `information_schema.tables`, `pg_views`, `pg_proc`, `pg_policies` no esquema `finances` (somente leitura) | Contagens iguais ao baseline (27, 4, 34, 63) ou diferença explicada; gerar lista de colunas por tabela para os módulos seguintes | RN-BD-016 |
| T-BD-02 | Privilégios de `authenticated` por tabela | Para cada tabela, `has_table_privilege('authenticated', tabela, op)` | Igual à tabela de `04-permissoes.md`; "?" resolvidos | RN-BD-014 |
| T-BD-03 | Privilégios de `anon` | Mesma consulta para `anon`; tentar `select` via cliente sem sessão em 3 tabelas | Nenhum privilégio; erro `42501` | RN-BD-002 |
| T-BD-04 | Isolamento entre workspaces | Logado como `TESTE_B`, tentar ler, inserir, atualizar e apagar registros `TESTE_A_*` de `TESTE_A` em `accounts`, `incomes`, `expenses`, `transfers`, `goals`, `plans`, `user_workspaces`, `setup_drafts` | 0 linhas lidas; inserção rejeitada; 0 linhas afetadas | RN-BD-001 |
| T-BD-05 | Funções chamáveis pelo cliente | Listar `has_function_privilege('authenticated', f, 'execute')` para todas as funções do esquema | Exatamente as 25 de `20260923190000:12-36` (mais eventuais sobrecargas: anotar) | RN-BD-003, BD-S02 |
| T-BD-06 | Funções administrativas negam usuário comum | Como `TESTE_A` (não admin), chamar `get_commercial_settings`, `update_ai_limit`, `admin_activate_workspace_trial` | Erro `not authorized` em todas | `04-permissoes.md` |
| T-BD-07 | Regra de transferência mesma moeda | Inserir transferência `TESTE_A_TRF` BRL→BRL com valores 100 e 150 | Rejeitada pela restrição `transfers_same_currency_amounts_match` | RN-BD-007 |
| T-BD-08 | Visões respeitam RLS | Como `TESTE_B`, `select` em `account_balances` | Só contas de `TESTE_B` | RN-BD-010 |
| T-BD-09 | Jobs agendados existem | `select jobname, schedule, active from cron.job` | 3 jobs (insights, reconcile, PTAX); anotar se o PTAX existe | BD-F2, BD-S08 |
| T-BD-10 | Última execução dos jobs | `select * from cron.job_run_details order by start_time desc limit 10` | Execuções recentes com sucesso | BD-F2 |
| T-BD-11 | Sobrecargas mortas | `select proname, pg_get_function_identity_arguments(oid) from pg_proc where pronamespace = 'finances'::regnamespace` | Anotar funções com mais de uma assinatura | BD-S02 |
| T-BD-12 | Drift de funções | Comparar `pg_get_functiondef` das 30 funções com a última versão de cada uma no repositório | Idênticas; divergências viram achado | R-BD-08 |

Resultado de cada teste deve ser registrado no diário com data e situação (`Validada` ou achado novo).
