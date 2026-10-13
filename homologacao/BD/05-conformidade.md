# BD · 05 — Conformidade (LGPD e boas práticas)

Norma informada: nenhuma. Referência usada: LGPD (Lei 13.709/2018) e boas práticas de banco de dados.

| Tema | Como é hoje (o que o código MOSTRA) | Avaliação | Ponto para validar / requisito |
|---|---|---|---|
| Dados pessoais no banco | `user_workspaces.display_name`, `country`; e-mail e senha ficam no Supabase Auth (`auth.users`); dados financeiros em todas as tabelas; `admins.user_id`, `activated_by` referenciam `auth.users` (`20260915190000:22`; `20260915210000:25`) | Dados pessoais e financeiros: categoria sensível pelo risco, não pela lei | Inventário de dados pessoais (RIPD) não existe no repositório |
| Isolamento entre titulares | RLS por workspace (RN-BD-001), confirmado por teste em 2026-09-13 | Adequado | Políticas não versionadas: não dá para auditar sem acesso ao banco |
| Minimização de privilégios | Funções revogadas de `anon`/`public`; grants por operação usada | Boa prática aplicada | `service_role` com escrita em tudo: aceitável se cada edge function autoriza |
| Segredos | Segredos de cron no Vault; chaves de API nas variáveis das edge functions; nenhum segredo nos arquivos (`docs/security-diagnostic.md`, Fase 1) | Adequado | Procedimento de rotação não documentado |
| Rastreabilidade (auditoria) | `updated_by`/`updated_at` em tabelas comerciais; `ai_usage_log`; não há trilha de auditoria nas tabelas financeiras do usuário | Parcial | Definir se alterações em contas, receitas, despesas precisam de histórico |
| Retenção e exclusão | `setup_drafts` apagado ao concluir (`20260927120000:101`); `ai_insights` recalculado e expira em 2 dias; não há rotina de exclusão de conta ou de dados do titular | Lacuna LGPD (direito de eliminação, art. 18) | Requisito: fluxo de exclusão/exportação de dados do titular |
| Transferência a terceiros | Dados financeiros enviados à API da Anthropic pela edge function `finances-ai` (módulo IA) | Precisa de base legal e transparência | Avaliar no módulo IA |
| Reprodutibilidade do esquema | Impossível reconstruir o banco do zero só com o repositório | Risco de continuidade | Requisito: migração "baseline" com o dump do esquema |
| Backups | Nada no repositório | Desconhecido | Confirmar política de backup do plano Supabase |
