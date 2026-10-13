# ACS · 04 — Permissões

## Perfis vistos pelo módulo

| Perfil | Como é identificado | O que pode |
|---|---|---|
| Visitante | sem sessão | ver `index.html` e `signup.html`; criar conta; qualquer outra tela redireciona ao login |
| Usuário sem configuração | sessão válida, `user_workspaces.setup_completed` falso ou sem linha | só `workspace.html` (assistente); `billing.html`; é redirecionado se tentar o assistente de revisão |
| Usuário com configuração | `setup_completed = true` | todas as telas de produto; revisão |
| Usuário bloqueado comercialmente | `get_workspace_access_status().access = 'BLOCKED'` | só `billing.html`, `workspace.html`, `index`, `signup` (`auth.js:39`); **na API continua com os mesmos direitos** (achado BD-S04) |
| Administrador | `finances.admins.active = true` | roteado para `finances-admin.html`; pode também abrir as telas de produto (não há bloqueio) |

## Verificações na tela × no servidor

| Ação | Verificação na tela | Verificação no servidor | Fonte |
|---|---|---|---|
| Criar conta | validações de formulário | Supabase Auth (e-mail único, senha mínima) | `signup.js`; política do projeto (Ponto para validar) |
| Entrar | — | Supabase Auth | `auth.js:14` |
| Rotear admin | `is_finances_admin` | função `SECURITY DEFINER` lê `admins` | `login.js:18`; `20260915190000:31-42` |
| Ler/gravar rascunho | sessão | grant S/I/U em `setup_drafts` + RLS (padrão `user_id = auth.uid()`, inferido) | `20260928000000:26` |
| Concluir configuração | botão só habilita com etapa válida | `complete_setup` revalida tudo e usa `auth.uid()` | `app.js:146`; SQL `:38, 54-74` |
| Editar "Você" | sessão + `setup_completed` | grant UPDATE em `user_workspaces` + RLS | `app.js:185`; `20260928020000:34` |
| Editar objetivo/plano | idem | grant UPDATE em `goals`, `plans` + RLS | `20260928010000:11`; `20260928020000:35` |
| Acesso comercial | guarda em `auth.js` | nenhuma (ver BD-S04) | |
| Sair | — | `signOut` | `auth.js:32` |

## Observações

- Não há papéis intermediários (ex.: contador, cônjuge): um usuário = um workspace (`user_workspaces` consultada por `user_id` com `maybeSingle`, `login.js:25-29`). **Ponto para validar:** a restrição "um workspace por usuário" é garantida por chave única no banco?
- O administrador não tem workspace próprio obrigatoriamente; se não tiver, `get_workspace_access_status` devolve `NO_WORKSPACE / ALLOWED` (`20260925000000:82-84`).
