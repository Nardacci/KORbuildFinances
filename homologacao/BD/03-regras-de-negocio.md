# BD · 03 — Regras de negócio implementadas no banco

Situação: `Extraída` (lida no código), `A confirmar no teste`, `Validada`.

| Código | Regra | Fonte (arquivo:linha) | Situação | Observação |
|---|---|---|---|---|
| RN-BD-001 | Todo dado financeiro pertence a um workspace; o workspace pertence a um usuário (`user_workspaces.user_id = auth.uid()`) | padrão das políticas em `supabase/migrations/20260912230000_tighten_finances_transfer_rls_and_rpc_security.sql:18-30` | Extraída | Só as políticas de `transfers` estão no repositório; as demais 61 seguem o mesmo padrão segundo `20260928020000_grant_finances_writes_to_authenticated.sql:9-13` (afirmação do desenvolvedor, não verificável no código) |
| RN-BD-002 | Usuário anônimo não executa nenhuma função do esquema `finances` | `20260923190000_tighten_finances_function_privileges.sql:6-8` | Extraída | Confirmado empiricamente em `docs/security-diagnostic.md`, Fase 2 |
| RN-BD-003 | Usuário autenticado só executa as 25 funções listadas explicitamente | `20260923190000_...:12-36` | Extraída | Novas funções nascem sem permissão (`:38-41`) |
| RN-BD-004 | Funções internas (`_start_trial_clock`, gatilhos, `compute_ai_insights`) não são chamáveis pelo cliente | `20260916140000_new_workspace_auto_trial.sql:57`; `20260914233000_ai_insights.sql:156` | Extraída | |
| RN-BD-005 | Funções que rodam com poder elevado (`SECURITY DEFINER`) fixam o `search_path` | ex.: `20260927120000_...:12`; `20260923191000_harden_finances_function_search_paths.sql:5-12` | Extraída | Boa prática contra sequestro de nomes |
| RN-BD-006 | Tabelas sensíveis têm RLS ligado e nenhuma política: só código do servidor acessa (`admins`, `workspace_subscriptions`, `ai_usage_log`, `ai_insights`, `ai_workspace_limits`) | `20260915190000_...:27-29`; `20260915210000_...:31-34`; `20260914160000_...:24`; `20260914233000_...:23` | Extraída | |
| RN-BD-007 | Transferência entre contas da mesma moeda: valor de saída = valor de entrada | `20260913120000_transfers_same_currency_amount_match.sql:13-18` | Extraída | Código de moeda comparado após normalizar "BRL — Real" → "BRL" |
| RN-BD-008 | Lançamento de investimento: investimento e conta devem ser do mesmo workspace; moeda da conta = moeda do lançamento; aporte/resgate novo exige conta | `20260912011000_package_1_investment_legacy_compatibility.sql:9-18` | Extraída | Em UPDATE de registro antigo sem conta, a conta continua opcional (linha 16) |
| RN-BD-009 | Saldo atual da conta é calculado, nunca gravado (fórmula em BD-F4) | `20260912010000_...:139-148` | Extraída | Conferir por script na Etapa 2 |
| RN-BD-010 | Visões respeitam a RLS de quem consulta (`security_invoker = true`) | `20260924184000_...:3`; `20260928030000_...:11-12` | Extraída | `investment_positions` não está no repositório: **Ponto para validar** |
| RN-BD-011 | Conclusão da configuração inicial é atômica e protegida contra duplo envio | `20260927120000_...:76-78` | Extraída | |
| RN-BD-012 | Todo novo workspace entra automaticamente em teste grátis (`TRIALING`) com `trial_days` e `grace_days` da configuração comercial (padrão 14 e 6) | `20260916150000_start_trial_clock_conflict_guard.sql:36-48`; `20260916130000_trial_grace_settings.sql:18-19` | Extraída | Detalhado no módulo ASS |
| RN-BD-013 | `service_role` (chave de servidor usada pelas edge functions) pode ler, inserir e atualizar em todas as tabelas, mas não apagar | `20260925010000_grant_finances_tables_to_service_role.sql:15-16` | Extraída | |
| RN-BD-014 | Usuário autenticado pode escrever só nas tabelas e operações que as telas usam (lista em `04-permissoes.md`) | `20260928020000_...:34-41`; `20260928000000_...:23-26`; `20260928010000_...:11` | Extraída | Princípio do menor privilégio, aplicado por grep do código |
| RN-BD-015 | Insights de IA: categoria com gasto acima da média em ≥ 3 dos últimos 6 meses fechados, com o último mês também acima; média e desvio calculados sem o mês avaliado; mínimo 4 meses de histórico; resultado expira em 2 dias | `20260914233000_ai_insights.sql:27-34, 101, 120-121, 144` | Extraída | Conferir por script no módulo IA |
| RN-BD-016 | Funções sem migração versionada são proibidas pela regra operacional | `docs/PROD_DATABASE_MIGRATION_BASELINE_2026-09-24.md`, "Operational rule" | Extraída | Hoje descumprida (ver `01-reconhecimento.md`) |
