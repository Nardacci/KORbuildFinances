# BD · 10 — O ideal (como deve ser)

Cada requisito cita o achado ou risco que o motivou. Prioridade: P1 (antes de qualquer release relevante), P2 (próximo ciclo), P3 (melhoria).

| Código | Requisito | Motivação | Prioridade |
|---|---|---|---|
| REQ-BD-01 | O repositório deve permitir reconstruir o esquema `finances` do zero: tabelas, índices, visões, funções, gatilhos, políticas e grants, numa migração baseline gerada por dump e revisada | BD-S01, R-BD-01, R-BD-02 | P1 |
| REQ-BD-02 | Nenhuma alteração no banco sem migração versionada; alterações pelo SQL Editor ficam proibidas fora de incidente, e o incidente gera migração de captura no mesmo dia | RN-BD-016, BD-S02, R-BD-08 | P1 |
| REQ-BD-03 | Existir um teste automatizado de privilégios e isolamento (T-BD-02 a T-BD-08) que rode antes de cada release, com dois usuários `TESTE` | R-BD-03, R-BD-02 | P1 |
| REQ-BD-04 | Cada edge function que usa a chave de servidor deve validar o usuário (JWT) e restringir toda leitura/escrita ao workspace desse usuário, ou, se for job, validar o segredo de cron; a verificação deve estar documentada por função | BD-S03, R-BD-04 | P1 |
| REQ-BD-05 | Decisão explícita de negócio: o bloqueio comercial vale só na tela (como hoje) ou também na API? Se também na API, as políticas de leitura/escrita devem consultar o status de acesso | BD-S04, R-BD-06 | P2 |
| REQ-BD-06 | Remover sobrecargas mortas de funções e alinhar políticas sem grant (ou grants sem política) | BD-S02, BD-S06 | P2 |
| REQ-BD-07 | Todos os jobs de cron versionados, com monitoramento da última execução e alerta em caso de falha ou cotação com mais de N dias | BD-S08, R-BD-05 | P2 |
| REQ-BD-08 | Procedimento escrito para segredos (onde ficam, quem tem acesso, como rotacionar) e para inclusão/remoção de administradores com registro de quem fez | BD-S07, conformidade | P2 |
| REQ-BD-09 | Trilha de auditoria (quem, quando, valor anterior) para alterações em contas, receitas, despesas, transferências e lançamentos de investimento | R-BD-09, LGPD (responsabilização) | P3 |
| REQ-BD-10 | Rotina de exclusão e exportação dos dados do titular, cobrindo todas as tabelas por workspace e o usuário no Auth | `05-conformidade.md` | P2 |
| REQ-BD-11 | Remover do repositório referências ao projeto Supabase antigo e deixar explícito, em um único lugar, qual projeto é teste e qual é produção | BD-S11 | P3 |
