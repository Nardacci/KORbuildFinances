# BD · 09 — Inventário (objetos do banco e situação)

O módulo BD não tem telas. O inventário aqui é de objetos do banco com a situação documental de cada um.

| Objeto | Tipo | Versionado no repositório | Documentado neste pacote | Situação |
|---|---|---|---|---|
| 25 tabelas identificadas (+2 desconhecidas) | tabela | 4 de 27 | `06-modelo-de-dados.md` | Sem DDL completa |
| `account_balances` | visão | sim | sim | OK |
| `investment_positions` | visão | não | citada | Sem definição |
| `financial_cash_flow`, `net_worth_by_currency` | visão | só o ALTER | citadas | Sem definição; sem uso nas telas |
| 30 funções (34 em produção) | função | 30 (parcial: 8 só por nome ou ausentes) | `03-regras-de-negocio.md`, `04-permissoes.md` | 4 funções sem nenhuma referência no repositório: **Ponto para validar** (T-BD-05) |
| 63 políticas RLS | política | 2 | padrão descrito | Sem código |
| 75 índices | índice | 2 (`ai_usage_log`, `ai_insights`) | não | Sem código |
| 2 jobs de cron (+1 não versionado) | agendamento | 2 | `02-fluxos.md` | PTAX sem código |
| Segredos no Vault: `cron_secret`, `finances_reconcile_cron_secret`, `project_url`, `finances_fx_sync_cron_secret` (inferido) | segredo | só o nome | `02-fluxos.md` | Procedimento manual |
| `supabase/config.toml` | configuração | sim | `01-reconhecimento.md` | 3 edge functions sem verificação de JWT (por desenho: cron) |
