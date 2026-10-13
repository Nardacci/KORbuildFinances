# ADM · 05 — Conformidade (LGPD e boas práticas)

| Tema | Como é hoje (o que o código MOSTRA) | Avaliação | Requisito / Ponto para validar |
|---|---|---|---|
| Acesso a dados pessoais de todos os usuários | admin vê nome, país, uso de IA, status comercial, datas de trial de todos os workspaces | Necessário à operação; precisa de base legal, controle de acesso (quem é admin) e trilha | REQ-ADM-01, 02 |
| Trilha de auditoria | `updated_by`/`updated_at` nas tabelas; sem histórico de valores anteriores; sem registro de leitura | Parcial | REQ-ADM-01 |
| Segregação de funções | um único papel faz tudo (preço, acesso, IA, pagamento) | Risco de abuso | REQ-ADM-03 |
| Decisões comerciais individualizadas (desconto, liberação) | sem motivo obrigatório | Dificulta defender igualdade de tratamento e explicar ao consumidor | REQ-ASS-13 |
| Dados bancários da empresa | gravados em texto e legíveis por qualquer usuário logado via RPC | Exposição desnecessária | ADM-S04 |
| Autenticação do admin | senha simples, sem 2FA | Abaixo da boa prática para funções financeiras | ADM-S05 |
