# ADM · 03 — Regras de negócio

| Código | Regra | Fonte (arquivo:linha) | Situação | Observação |
|---|---|---|---|---|
| RN-ADM-001 | Administrador = usuário em `finances.admins` com `active = true`; tela redireciona não-admin ao dashboard; cada RPC recusa com "not authorized" | `20260915190000_...:31-42`; `finances-admin.js:252-253`; ex. `20260915230000_...:45-47` | Extraída | |
| RN-ADM-002 | Lista de IA: limite padrão 100, habilitado padrão sim, uso = chamadas com status `success` desde o início do mês (UTC); ordenada por nome | `20260915190000_...:64-75` | Extraída | |
| RN-ADM-003 | Alerta de IA quando uso ÷ limite ≥ 80 %; com limite 0, qualquer uso alerta; resumo soma chamadas de todos os workspaces | `finances-admin.js:24-33` | Extraída | |
| RN-ADM-004 | Limite de IA ≥ 0; grava quem alterou e quando | `20260915190000_...:94-104` | Extraída | |
| RN-ADM-005 | Preço padrão: se informado, > 0; moeda padrão USD; vazio mantém o valor anterior (versão ao vivo) | `20260925000000_...:35-50`; `finances-admin.js:86-91` | Extraída | Versão antiga (2 parâmetros) gravava nulo |
| RN-ADM-006 | Dias de teste > 0; dias de carência ≥ 0; não alteram relógios já iniciados | `20260916130000_...:67-73`; `20260916150000_...:36-56` | Extraída | |
| RN-ADM-007 | Carência de pagamento (`payment_grace_days` ≥ 0) só por RPC; sem tela | `20260925000000_...:262-285`; busca em `finances-admin.js` | Extraída | |
| RN-ADM-008 | Ajuste por workspace: percentual numérico sem limite, padrão 0; observação opcional; grava criador e última alteração | `20260915230000_...:167-191`; `finances-admin.js:164-173` | Extraída | ≤ −100 % quebra o checkout (ASS-S10) |
| RN-ADM-009 | Status administrativo só entre TRIALING, ACTIVE, SUSPENDED, CANCELLED; origem só TRIAL, MANUAL, OTHER ou vazia | `20260915230000_...:246-253` | Extraída | |
| RN-ADM-010 | Marcar ACTIVE grava `activated_at` e `activated_by` na primeira vez e preserva depois; outros status não apagam | `20260915230000_...:258-274` | Extraída | |
| RN-ADM-011 | Status efetivo = `compute_effective_status` (9 parâmetros): pagamento `active` → ACTIVE; `past_due` em carência → PAST_DUE_GRACE; `past_due` vencido → BLOCKED; `canceled` em período → CANCELED_ACTIVE; `canceled` vencido → BLOCKED; senão o fluxo de teste | `20260925000000_...:166-193` | Extraída | Mesma lógica de `get_workspace_access_status`, mas com nomes de estado diferentes (PAST_DUE_GRACE × PAST_DUE) |
| RN-ADM-012 | "Iniciar trial" só para workspace TRIALING sem relógio; recusa "Trial already started" / "Trial can only be started…" | `20260916140000_...:71-85`; `finances-admin.js:193` | Extraída | |
| RN-ADM-013 | Instruções de pagamento: método padrão PIX; demais campos livres; linha única | `20260915230000_...:107-139` | Extraída | Sem fluxo de confirmação |
| RN-ADM-014 | O admin pode alterar o próprio workspace e qualquer outro; nenhuma restrição ou dupla aprovação | `20260915230000_...:229-276` | Extraída | |
| RN-ADM-015 | A tela não tem navegação para o produto nem o assistente de IA; só "Sair" | `finances-admin.html` | Extraída | |
| RN-ADM-016 | Mensagens de erro das RPCs em inglês ("not authorized", "monthly_price must be > 0") | SQL citado | Extraída | |
