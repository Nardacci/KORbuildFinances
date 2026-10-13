# BD · 01 — Reconhecimento do módulo Banco de dados e segurança transversal

Data: 2026-10-13. Fonte: repositório KORbuildFinances, `supabase/`, `docs/`. Tudo abaixo vem de contagens e leitura dos 30 arquivos de migração.

## 1. O que existe

| Item | O que o repositório MOSTRA |
|---|---|
| Banco | PostgreSQL gerenciado pelo Supabase, esquema próprio `finances` (separado do esquema `public`, que pertence a outro produto da mesma empresa, o "korbuild RH/Bônus", citado em `supabase/migrations/20260915190000_finances_admin_ai_limits.sql:1-7`) |
| Migrações versionadas | 30 arquivos em `supabase/migrations/`, de 2026-09-10 a 2026-09-28 |
| Histórico em produção | 50 migrações registradas no projeto (lista em `docs/PROD_DATABASE_MIGRATION_BASELINE_2026-09-24.md`); as 26 primeiras (até 2026-09-05) são do produto anterior e as de 2026-09-22 reconstruíram o esquema `finances` |
| Inventário declarado em produção | 27 tabelas, 4 visões, 34 funções, 63 políticas de acesso por linha (RLS), 75 índices, RLS ligado em todas as tabelas (`docs/PROD_DATABASE_MIGRATION_BASELINE_2026-09-24.md`, seção "Current PROD inventory") |
| Extensões | `pg_cron` (agendador) e `pg_net` (chamadas HTTP a partir do banco), `supabase/migrations/20260914233500_ai_insights_daily_schedule.sql:14-15`; Vault (cofre de segredos) usado nos agendamentos |
| Agendamentos (`cron.schedule`) | 2 no repositório: insights de IA diários às 06:00 UTC e conciliação Mercado Pago a cada 15 min. Um terceiro (cotação PTAX) é citado mas não está versionado (ver lacunas) |

## 2. As 30 migrações do repositório, por finalidade

| Data | Arquivo (prefixo) | Finalidade | Objetos |
|---|---|---|---|
| 09-10 | `complete_finances_onboarding` | Primeira versão da função que conclui a configuração inicial | função `complete_setup` v1 (taxa 1,05) |
| 09-12 | `package_1_financial_integrity` | Integridade financeira: `complete_setup` v2 (taxa 0), vínculo conta ↔ lançamento de investimento, visão de saldos | função, coluna `account_id`, gatilho, visão `account_balances` |
| 09-12 | `package_1_investment_legacy_compatibility` | Gatilho só exige conta em INSERT (dados antigos continuam editáveis) | função do gatilho |
| 09-12 | `tighten_finances_transfer_rls_and_rpc_security` | Revoga RPCs de `anon`; políticas de UPDATE/DELETE em `transfers` | 2 políticas |
| 09-13 | `transfers_same_currency_amount_match` | Regra: mesma moeda → valor sai = valor entra | restrição CHECK |
| 09-14 | `ai_usage_log` | Tabela de uso da IA | tabela (RLS sem políticas) |
| 09-14 | `ai_insights` | Tabela e função de insights de gastos | tabela, função `compute_ai_insights` |
| 09-14 | `ai_insights_daily_schedule` | Agendamento diário | `cron.schedule` |
| 09-15 | `finances_admin_ai_limits` | Tabela de administradores, `is_finances_admin`, limites de IA | tabela `admins`, 3 funções |
| 09-15 | `workspace_subscriptions_backfill` | Tabela de assinatura por workspace; workspaces existentes viram ACTIVE | tabela + carga |
| 09-15 | `get_workspace_access_status` | Estado de acesso (teste grátis → carência → bloqueio) v1 | função |
| 09-15 | `commercial_admin_rpcs` | 10 RPCs administrativas (preço, instruções de pagamento, termos, controle de acesso, iniciar trial) | funções |
| 09-16 | `guard_admin_activate_trial` | Trial só para status TRIALING | função |
| 09-16 | `self_service_billing_rpcs` | Preço e instruções para o próprio usuário | 2 funções |
| 09-16 | `trial_grace_settings` | Dias de trial/carência configuráveis (14 / 6) | 2 colunas, 2 funções |
| 09-16 | `new_workspace_auto_trial` | Novo workspace inicia trial sozinho (`_start_trial_clock`); `complete_setup` v3 | 3 funções |
| 09-16 | `start_trial_clock_conflict_guard` | Não sobrescrever assinatura que não seja TRIALING | função |
| 09-23 | `tighten_finances_function_privileges` | Revoga EXECUTE de tudo e concede só 25 RPCs a `authenticated` | REVOKE/GRANT |
| 09-23 | `harden_finances_function_search_paths` | Fixa `search_path` em 8 funções | ALTER FUNCTION |
| 09-24 | `fix_account_balances_view_access` | Visão passa a respeitar RLS do usuário | ALTER VIEW + GRANT |
| 09-24 | `grant_transfers_select_for_account_balances` | SELECT em `transfers` para `authenticated` | GRANT |
| 09-25 | `capture_live_function_drift` | Captura 7 funções que existiam só no banco ao vivo | 7 funções |
| 09-25 | `grant_finances_tables_to_service_role` | `service_role` ganha SELECT/INSERT/UPDATE em todas as tabelas | GRANT |
| 09-26 | `mp_reconcile_cron` | Conciliação Mercado Pago a cada 15 min | `cron.schedule` |
| 09-27 | `complete_setup_user_declared_contribution` | `complete_setup` v4: aporte informado pelo usuário | função |
| 09-27 | `investments_expected_monthly_rate` | Coluna obrigatória de taxa esperada | coluna |
| 09-28 | `grant_finances_tables_to_authenticated` | SELECT em 3 tabelas; S/I/U em `setup_drafts` | GRANT |
| 09-28 | `grant_goals_update_to_authenticated` | UPDATE em `goals` | GRANT |
| 09-28 | `grant_finances_writes_to_authenticated` | Escrita em 8 tabelas | GRANT |
| 09-28 | `harden_cash_flow_views_security_invoker` | 2 visões passam a respeitar RLS | ALTER VIEW |

## 3. O que está sem documentação ou fora do repositório

| Lacuna | Evidência |
|---|---|
| DDL das 27 tabelas (exceto 4), das 63 políticas (exceto 2), de 3 das 4 visões e de 8 das 34 funções não está no repositório | `docs/PROD_DATABASE_MIGRATION_BASELINE_2026-09-24.md`, seção "Important limitation"; contagem nas migrações (seção 2) |
| Funções foram criadas direto no banco e só depois "capturadas" | `supabase/migrations/20260925000000_capture_live_function_drift.sql:11-18` |
| Podem existir versões antigas (sobrecargas) de funções como código morto | mesmo arquivo, linhas 20-23 e 160-165 |
| Agendamento da cotação PTAX (`daily-exchange-rate-sync`) não está versionado | citado em `supabase/migrations/20260926000000_mp_reconcile_cron.sql:8-10`; a edge function `mp-sync-exchange-rate` existe |
| Permissões de tabela para `authenticated` foram corrigidas aos poucos, depois de erros em produção | `20260928000000_...:1-9`, `20260928010000_...:1-4`, `20260928020000_...:1-6` |
| Não há script de verificação de privilégios nem de políticas | ausência em `tests/` e em `supabase/` |
| Dois identificadores de projeto Supabase aparecem no código e nos documentos | ver `homologacao/00-reconhecimento/RECONHECIMENTO.md`, seção 6 |
