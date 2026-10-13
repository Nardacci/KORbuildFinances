# ADM · 04 — Permissões

| Ação | Verificação na tela | Verificação no servidor | Fonte |
|---|---|---|---|
| Abrir o painel | `is_finances_admin` → senão `dashboard.html` | cada RPC começa com `if not finances.is_finances_admin() then raise exception` | `finances-admin.js:252-253`; `20260915190000_...:60-62` e demais |
| Ler/alterar limites de IA | — | `get_ai_limits`, `update_ai_limit` (admin) | `20260915190000_...` |
| Ler/alterar preço, trial, carência | — | `get_commercial_settings`, `update_commercial_pricing`, `get_trial_settings`, `update_trial_settings`, `get_payment_settings`, `update_payment_settings` (admin) | `20260915230000_...`, `20260916130000_...`, `20260925000000_...` |
| Ler/alterar ajustes e acesso por workspace | — | `get_workspace_commercial_terms`, `update_workspace_commercial_terms`, `get_workspace_access_control`, `update_workspace_access_control`, `admin_activate_workspace_trial` (admin) | idem |
| Instruções de pagamento | — | `get_payment_instructions`, `update_payment_instructions` (admin); leitura pelo usuário comum via `get_own_payment_instructions` (sem admin) | `20260916120000_...:56-77` |
| Incluir/remover admin | não existe | só SQL direto na tabela `admins` (RLS sem política; só o definer lê) | `20260915190000_...:27-29` |

Todas as RPCs são `SECURITY DEFINER` com `search_path` fixo; o grant a `authenticated` é o que permite a chamada, e a verificação de admin dentro da função é o que a protege. Tudo isso está versionado.

O papel de administrador vê nome e país de todos os workspaces e o uso de IA de cada um (dados pessoais): necessário ao negócio, mas deve constar na política de privacidade e ter trilha (quem viu o quê não é registrado; quem alterou o quê é registrado em `updated_by`).
