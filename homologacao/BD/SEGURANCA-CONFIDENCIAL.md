# BD · SEGURANÇA — CONFIDENCIAL

**Não publicar em portal nem em resumo. Circulação restrita ao dono do projeto.**

Data: 2026-10-13. Base: leitura das migrações e dos dois documentos em `docs/`. Nenhum teste contra o banco foi executado nesta etapa.

| # | Achado | Severidade (inferida) | Evidência | Situação | Recomendação |
|---|---|---|---|---|---|
| BD-S01 | Esquema, políticas de acesso e parte das funções e visões não estão versionados: ninguém consegue auditar a postura de segurança lendo o código | Média (já conhecida) | `docs/PROD_DATABASE_MIGRATION_BASELINE_2026-09-24.md`; `docs/security-diagnostic.md`, item 5 | Pendente desde 2026-09-13 | Gerar dump do esquema `finances` (estrutura, políticas, grants) e commitar como migração baseline |
| BD-S02 | Funções alteradas direto no banco e capturadas depois; podem sobrar sobrecargas antigas (`update_commercial_pricing` com 2 parâmetros, `compute_effective_status` com 5) como código morto, que ainda têm EXECUTE para `authenticated` se existirem | Baixa | `20260925000000_capture_live_function_drift.sql:20-23, 160-165`; `20260915230000:317` concede a versão de 2 parâmetros | A confirmar no teste | Listar sobrecargas no banco e remover as não usadas |
| BD-S03 | `service_role` tem leitura/escrita em todas as tabelas e ignora RLS. A segurança passa a depender de cada edge function verificar o usuário e o workspace | Média (estrutural) | `20260925010000:15-16` | Revisar nos módulos ASS e IA | Checklist de autorização por edge function |
| BD-S04 | A regra de acesso comercial (teste grátis, bloqueio) não existe no banco: um workspace BLOCKED continua com RLS e grants normais e pode ler e gravar via API direta; o bloqueio é só na tela | Média (negócio) | `get_workspace_access_status` só é consultada por `auth.js:48` e `dashboard.js`; nenhuma política cita `workspace_subscriptions` | Extraída | Decidir se bloqueio deve ser também no banco (política que consulta o status) |
| BD-S05 | Privilégios foram corrigidos por tentativa e erro em três migrações no mesmo dia; não há teste automatizado de privilégios | Baixa | `20260928000000`, `20260928010000`, `20260928020000` (comentários iniciais) | Extraída | Script de verificação (`has_table_privilege`) por papel e tabela, rodado a cada release |
| BD-S06 | Política de DELETE em `transfers` existe, mas o grant não; `investment_closings` tem políticas de escrita sem grant. Incoerência entre política e privilégio (não é vazamento) | Informativa | `20260928020000:29-32`; `20260928000000:15-18` | Extraída | Alinhar políticas e grants ou documentar a intenção |
| BD-S07 | `admins` sem interface: incluir ou remover administrador exige SQL no painel; sem trilha de quem fez | Baixa | `20260915190000:28-29` | Extraída | Registrar `created_by` e procedimento; revisar lista de admins periodicamente |
| BD-S08 | Agendamento da cotação PTAX não está versionado; se o job sumir, o preço em reais fica desatualizado em silêncio | Baixa (operacional) | `20260926000000:8-10` | A confirmar no teste | Versionar o job e criar alerta de cotação antiga |
| BD-S09 | `compute_effective_status` (9 parâmetros) é função comum (não definer) concedida a `authenticated`; só calcula a partir de parâmetros, sem ler tabelas | Informativa | `20260923190000:14`; `20260925000000:166-193` | Extraída | Nenhuma ação |
| BD-S10 | Testes automatizados usam o mesmo projeto Supabase do site, com usuário real de teste; `purgeTestData` apaga qualquer linha cujo texto comece com `TESTE_E2E_` | Média (operacional) | `tests/helpers/db.js:6, 71-80`; `supabase/config.toml` | Extraída | Confirmado pelo analista que o projeto é de teste; manter prefixo e nunca rodar contra produção |
| BD-S11 | Dois identificadores de projeto Supabase no repositório (um deles em `docs/security-diagnostic.md` e em `mp-create-subscription`) | Baixa | `homologacao/00-reconhecimento/RECONHECIMENTO.md`, seção 6 | Ponto para validar | Remover referências ao projeto antigo |

Achados já corrigidos antes desta análise (não reabrir): transferência com valores divergentes (`20260913120000`), visões sem `security_invoker` (`20260924184000`, `20260928030000`), funções sem `search_path` (`20260923191000`).
