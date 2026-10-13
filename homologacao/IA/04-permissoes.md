# IA · 04 — Permissões

## Perfis e o que cada um pode fazer

| Perfil | Pode | Não pode | Fonte |
|---|---|---|---|
| Usuário autenticado (qualquer status comercial) | Chamar `finances-ai` com o próprio token e conversar sobre o próprio workspace; o painel aparece nas telas logadas | Ler `ai_usage_log`, `ai_insights`, `ai_workspace_limits` (RLS sem políticas); ver insights; ver quantas perguntas restam | `index.ts:618-637, 650-653`; `20260914160000_...:24`; `20260914233000_...:23` |
| Usuário BLOCKED (sem assinatura) | Chamar a função diretamente (ex.: via console do navegador) — não há checagem de status | Ver o painel em `billing.html` (`data-ai-assistant="off"`) | `index.ts` (sem chamada a `get_workspace_access_status`); `billing.html:14` |
| Administrador (`finances.admins`) | `get_ai_limits()` (uso do mês por workspace) e `update_ai_limit()` | Ler o conteúdo das conversas (não é gravado) | `20260915190000_...:46-106` |
| `service_role` (edge functions) | Ler/gravar `ai_workspace_limits`, `ai_usage_log`, `ai_insights`; executar `compute_ai_insights()` | **DELETE** em tabelas do schema `finances` (concessão versionada só de SELECT, INSERT, UPDATE) | `20260925010000_...:15-16`; `20260914233000_...:156` |
| Agendador (pg_cron) | Chamar `compute-insights` com o segredo do Vault | — | `20260914233500_...:17-30` |
| Anônimo | Nada: `finances-ai` responde 401 sem cabeçalho; `compute-insights` responde 401 sem segredo | — | `index.ts:618-619`; `compute-insights/index.ts:32-33` |

## Verificações feitas na edge function (checklist pedido em BD-S03)

| Verificação | Existe? | Fonte |
|---|---|---|
| Token do usuário validado no servidor de Auth (não só decodificado) | Sim (`getUser`) | `index.ts:626-627` |
| Workspace derivado do usuário (não do corpo da requisição) | Sim | `index.ts:629-637` |
| Leituras financeiras com o token do usuário (RLS) | Sim | `index.ts:621-625, 730-736` |
| `service_role` restrito às três tabelas de IA | Sim pelo código; o papel em si tem acesso a tudo | `index.ts:654-697, 750-769` |
| Status comercial (teste grátis vencido, bloqueado) | **Não** | — |
| Verificação de que o usuário é dono da linha de `ai_usage_log` que lê | Não se aplica (filtra por `workspace_id` derivado) | `index.ts:668` |
| Limite de tamanho da pergunta atual | **Não** (só o histórico é cortado em 4.000 caracteres) | `index.ts:643, 168` |

## Políticas de acesso no banco

| Tabela | RLS | Políticas | Grants versionados | Observação |
|---|---|---|---|---|
| `ai_usage_log` | ativo | nenhuma | `service_role`: SELECT, INSERT, UPDATE (`20260925010000`) | `get_ai_limits` lê como `SECURITY DEFINER` |
| `ai_insights` | ativo | nenhuma | idem; sem DELETE | `compute_ai_insights` faz DELETE → Ponto para validar (IA-S02) |
| `ai_workspace_limits` | inferido ativo ("RLS enabled, no policies", `index.ts:650-653`) | nenhuma | idem | DDL fora do repositório |

## Função `compute_ai_insights()`

- Não é `SECURITY DEFINER` (`20260914233000_...:51-54`): roda com os privilégios de quem chama. Grant de execução só a `service_role` (:156).
- Lê `expenses`, `user_workspaces`, `expense_categories` de **todos** os workspaces (não há filtro por workspace) e apaga/insere em `ai_insights` para todos. É um processamento global por desenho; a função HTTP que o dispara só exige o segredo compartilhado.

## Inferências e pontos para validar

- **Inferência:** com a baseline de produção reconstruindo as tabelas comerciais e de IA (`docs/PROD_DATABASE_MIGRATION_BASELINE_2026-09-24.md:42`), os grants reais podem diferir dos versionados. Conferir no teste com `has_table_privilege` (CT-IA-18).
- **Ponto para validar:** se existe alguma política em `ai_workspace_limits` no banco (o repositório não mostra).
