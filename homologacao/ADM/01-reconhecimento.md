# ADM · 01 — Reconhecimento do módulo Administração

Data: 2026-10-13. Escopo: painel do administrador (`finances-admin.html`): consumo de IA por workspace, preço padrão, configuração de teste grátis, ajuste de preço por workspace, controle de acesso e assinatura por workspace, instruções de pagamento manual.

## Arquivos do módulo

| Arquivo | Linhas | Papel | Observação |
|---|---|---|---|
| `finances-admin.html` | 93 | Painel "Super Admin" | sem menu de navegação; assistente de IA desligado; textos de status em inglês (códigos) |
| `finances-admin.js` | 259 | 6 blocos: IA, preço, trial, ajustes, acesso, pagamento manual | |
| `finances-admin.css` | 81 | estilos | fora da análise |
| SQL | — | 15 RPCs administrativas + `is_finances_admin` + tabela `admins` | `20260915190000`, `20260915230000`, `20260916100000`, `20260916130000`, `20260916140000`, `20260925000000` |

## RPCs usadas pela tela (todas com `is_finances_admin()`)

| Bloco | Leitura | Escrita | Fonte |
|---|---|---|---|
| Consumo de IA | `get_ai_limits` | `update_ai_limit(workspace, limite, habilitado)` | `20260915190000_...:46-106` |
| Preço padrão | `get_commercial_settings` | `update_commercial_pricing(preço, moeda, preço_brl=nulo)` | `20260915230000_...:38-82`; `20260925000000_...:24-53` |
| Trial | `get_trial_settings` | `update_trial_settings(trial_days, grace_days)` | `20260916130000_...:35-87` |
| Ajuste por workspace | `get_workspace_commercial_terms` | `update_workspace_commercial_terms(workspace, %, notas)` | `20260915230000_...:143-192` |
| Controle de acesso | `get_workspace_access_control` (com `effective_status`) | `update_workspace_access_control(workspace, status, trial_enabled, origem, motivo)`; `admin_activate_workspace_trial(workspace)` | `20260915230000_...:196-276`; `20260916140000_...:62-87` |
| Pagamento manual | `get_payment_instructions` | `update_payment_instructions(método, titular, pix, banco, contato, instruções)` | `20260915230000_...:86-139` |
| Carência de pagamento | `get_payment_settings` / `update_payment_settings` existem e são concedidas | **não usadas pela tela** | `20260925000000_...:239-285`; busca em `finances-admin.js` |

## Quem é administrador

Usuário presente em `finances.admins` com `active = true` (`20260915190000_...:21-42`). Inclusão só por SQL direto; sem tela, sem registro de quem incluiu (BD-S07).

## Testes automatizados existentes

Nenhum para a tela administrativa.

## O que está sem documentação

- Procedimento para incluir/remover administrador.
- Significado dos estados comerciais para quem opera (os códigos aparecem em inglês: TRIALING, GRACE_PERIOD, PAST_DUE_GRACE, CANCELED_ACTIVE…).
- `payment_grace_days` (carência de pagamento, 12 dias) não tem tela.
- Como o admin confirma um pagamento manual (Pix): não existe fluxo; o campo "Contato para confirmação" sugere processo manual fora do sistema.
- O resumo "Chamadas este mês" e "Em alerta (≥80%)" não explica a janela (mês UTC) nem a regra do alerta.
