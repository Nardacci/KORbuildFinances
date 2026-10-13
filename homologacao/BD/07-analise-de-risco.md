# BD · 07 — Análise de risco

Escala: Probabilidade e Impacto em Baixo / Médio / Alto. Classificação é inferência do analista; validar com o dono do projeto.

| # | Risco | Prob. | Impacto | Evidência | Mitigação proposta |
|---|---|---|---|---|---|
| R-BD-01 | Perda do banco (ou do projeto Supabase) sem conseguir reconstruir estrutura e políticas, porque o esquema não está versionado | Baixa | Alto | `docs/PROD_DATABASE_MIGRATION_BASELINE_2026-09-24.md`, "Important limitation" | Dump do esquema versionado; teste de reconstrução em projeto vazio |
| R-BD-02 | Uma política de RLS incorreta passar despercebida (não há revisão por código) | Média | Alto | 61 de 63 políticas fora do repositório | Mesmo que acima + teste automatizado de isolamento entre dois usuários `TESTE` |
| R-BD-03 | Nova tela falhar em produção por falta de GRANT (já aconteceu 3 vezes em 2026-09-28) | Alta | Médio | `20260928000000`, `20260928010000`, `20260928020000` | Script de privilégios por release |
| R-BD-04 | Edge function com chave de servidor expor ou alterar dados de outro workspace por erro de autorização | Baixa | Alto | `20260925010000:15-16` | Revisão por função (módulos ASS, IA); testes negativos |
| R-BD-05 | Job de cron parar em silêncio (segredo rotacionado, Vault sem o nome esperado) | Média | Médio | segredos manuais, `20260926000000:12-16` | Monitorar última execução; alerta |
| R-BD-06 | Usuário bloqueado comercialmente continuar usando a API direta | Média | Baixo (negócio) | achado BD-S04 | Decisão de negócio; política que consulte o status |
| R-BD-07 | Teste automático apagar dados que não sejam de teste | Baixa | Alto | `tests/helpers/db.js:71-80` apaga por prefixo `TESTE_E2E_` dentro do workspace do usuário de teste (RLS limita ao próprio workspace) | Manter usuário de teste exclusivo; nunca usar credenciais reais no `.env` |
| R-BD-08 | Divergência entre o código das funções no repositório e no banco (drift) voltar a acontecer | Alta | Médio | histórico de 2026-09-25 | Comparar `pg_get_functiondef` com o repositório a cada release |
| R-BD-09 | Falta de trilha de auditoria para alterações financeiras do usuário (quem alterou um saldo, quando) | Média | Médio | só tabelas comerciais têm `updated_by` | Definir requisito de auditoria (módulo CTA/RDP) |
