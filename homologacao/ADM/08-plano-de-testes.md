# ADM · 08 — Plano de testes

Regras: só no ambiente de teste; só workspaces `TESTE`; **nunca alterar preço padrão, dias de trial ou instruções de pagamento sem anotar o valor anterior e restaurá-lo ao final** (são linhas únicas, sem prefixo possível). Usuário admin de teste: `TESTE_ADMIN` (incluído em `admins` por SQL no ambiente de teste).

| ID | Objetivo | Passos | Resultado esperado | Regra |
|---|---|---|---|---|
| CT-ADM-01 | Não-admin | `TESTE_A` abre `finances-admin.html` | redirecionado ao dashboard; pelo console, `get_ai_limits` → "not authorized" | RN-ADM-001 |
| CT-ADM-02 | Admin entra | `TESTE_ADMIN` faz login | vai direto ao painel; 6 blocos carregados | RN-ADM-001 |
| CT-ADM-03 | Limite de IA | workspace `TESTE_A`: limite 10, habilitado | gravado; `ai_workspace_limits` com `updated_by` = admin | RN-ADM-004 |
| CT-ADM-04 | Alerta de IA | `TESTE_A` com 8 chamadas de sucesso no mês (inserir em `ai_usage_log` por SQL) e limite 10 | linha com "⚠ 8 / 10"; "Em alerta" = 1 | RN-ADM-003 |
| CT-ADM-05 | Limite negativo | −1 | erro do banco | RN-ADM-004 |
| CT-ADM-06 | Preço vazio mantém | anotar preço atual; salvar com campo vazio | preço inalterado | RN-ADM-005 |
| CT-ADM-07 | Preço zero | 0 | erro "monthly_price must be > 0" | RN-ADM-005 |
| CT-ADM-08 | Trial 0 dias | 0 | erro "trial_days must be > 0" | RN-ADM-006 |
| CT-ADM-09 | Trial não retroage | mudar para 30 dias; `TESTE_TRIAL` já iniciado | datas de `TESTE_TRIAL` inalteradas; novo workspace usa 30 | RN-ADM-006 |
| CT-ADM-10 | Ajuste −150 % | salvar | aceito (**hoje**); `TESTE_A` não consegue assinar | RN-ADM-008 |
| CT-ADM-11 | Status inválido pela API | `update_workspace_access_control` com `p_status='XYZ'` | "Invalid commercial status" | RN-ADM-009 |
| CT-ADM-12 | Marcar ACTIVE | `TESTE_TRIAL` → ACTIVE, origem MANUAL, motivo "TESTE" | `activated_at/by` preenchidos; usuário vê "ASSINATURA ATIVA"; marcar SUSPENDED depois mantém `activated_at` | RN-ADM-010 |
| CT-ADM-13 | Iniciar trial | workspace TRIALING sem relógio (criado por SQL) | botão aparece; datas conforme dias configurados; segundo clique → erro "already started" | RN-ADM-012 |
| CT-ADM-14 | Status efetivo | workspace com pagamento `past_due` em carência (SQL) | badge PAST_DUE_GRACE; na tela do usuário, "PAGAMENTO EM ATRASO · PERÍODO DE TOLERÂNCIA" | RN-ADM-011 |
| CT-ADM-15 | Instruções de pagamento | salvar com dados fictícios `TESTE` e restaurar | gravado; `get_own_payment_instructions` devolve os dados para `TESTE_A` (por console) | RN-ADM-013, ADM-S04 |
| CT-ADM-16 | Carência de pagamento sem tela | procurar campo | inexistente; `get_payment_settings` pelo console devolve 12 (ou o valor atual) | RN-ADM-007 |
| CT-ADM-17 | Nome com HTML | `display_name` de `TESTE_A` = `TESTE_<img src=x onerror=alert(1)>` | texto literal nas listas do painel | escape em `finances-admin.js:4` |
