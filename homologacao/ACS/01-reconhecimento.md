# ACS · 01 — Reconhecimento do módulo Acesso e Workspace

Data: 2026-10-13. Escopo: criar conta, confirmar e-mail, entrar, sair, sessão, roteamento após login, assistente de configuração inicial (5 etapas), revisão pós-configuração, guarda de acesso comercial nas páginas, hub de configurações.

## Arquivos do módulo

| Arquivo | Tamanho | Papel | Observação |
|---|---|---|---|
| `index.html` | 33 linhas | Tela de login (formulário real) | Rodapé diz "Ambiente de desenvolvimento" (linha 14) |
| `login.html` | 12 linhas | Só redireciona para `index.html` (linhas 6 e 10) | Mantido por compatibilidade de links antigos |
| `login.js` | 74 linhas | Login, roteamento pós-login, auto-redirecionamento se já logado | |
| `signup.html` | 30 linhas | Criar conta + tela "confirme seu e-mail" | Caixa "Li e concordo com os Termos de Uso e a Política de Privacidade" sem link (linha 13) |
| `signup.js` | 91 linhas | Validações do cadastro, reenvio do e-mail | |
| `auth.js` | 270 linhas | Cliente Supabase, sessão, login, cadastro, logout, guarda comercial, menu lateral padronizado, assistente de IA (Kora) | Carregado por todas as telas de produto |
| `supabase-config.js` | 2 linhas | Endereço do projeto e chave publicável | Não copiar valores |
| `workspace.html` | 26 linhas (minificado) | Assistente inicial em 5 etapas e modo revisão | Guarda de sessão e logout inline (linha 26) |
| `app.js` | 197 linhas (parcialmente minificado) | Lógica do assistente e da revisão | |
| `settings.html` + `settings.js` | 10 + 7 linhas | Redirecionam para `workspace.html?mode=review` | |
| `cadastros.html` | 2 linhas (minificado) | Hub "Configurações financeiras" com cartões (Tipos de investimento disponível; Instituições, Moedas, Categorias "Em breve") | |
| `css/wizard.css`, `styles.css` | | Estilos do assistente | fora da análise |

## Tabelas e funções do banco usadas

| Objeto | Operações pelo módulo | Fonte |
|---|---|---|
| `user_workspaces` | SELECT (`login.js:25-29`, `app.js:28`), UPDATE (`app.js:93`) | |
| `setup_drafts` | SELECT, UPSERT (`app.js:26-27`) | rascunho do assistente |
| `accounts`, `incomes`, `goals`, `plans` | SELECT para o resumo da revisão (`app.js:46-51`); UPDATE em `goals` e `plans` (`app.js:109-110`) | |
| RPC `complete_setup` | conclusão atômica (`app.js:30`) | `supabase/migrations/20260927120000_complete_setup_user_declared_contribution.sql` |
| RPC `is_finances_admin` | roteamento de administrador (`login.js:18`) | `20260915190000_finances_admin_ai_limits.sql:31-42` |
| RPC `get_workspace_access_status` | guarda comercial (`auth.js:48`) | `20260925000000_capture_live_function_drift.sql:62-157` |
| Supabase Auth | `signInWithPassword`, `signUp` com `emailRedirectTo`, `resend`, `getSession`, `getUser`, `signOut` (`auth.js:4-32`; `signup.js:34`) | |

## Armazenamento no navegador

| Chave | Conteúdo | Quando é limpa | Fonte |
|---|---|---|---|
| `korbuild-finances-wizard-v2` | todos os campos do assistente (nome, país, moeda, conta, saldo, receita, objetivo...) e a etapa atual | no logout (`auth.js:30`) | `app.js:2-3, 23` |
| `korbuild-finances-onboarding-complete` | marca "true" após concluir | no logout (`auth.js:31`) | `app.js:30` |
| token de sessão do Supabase | sessão do usuário | no logout | padrão da biblioteca (`docs/security-diagnostic.md`, Fase 4) |
| `korbuild-ai-history` (sessionStorage) | histórico do chat com a IA | ao fechar a aba | `auth.js:103` (módulo IA) |

## Testes automatizados existentes

| Arquivo | Cobre |
|---|---|
| `tests/login.spec.js` | erro com credencial inválida; login com sucesso (pulado sem `.env`) |
| `tests/onboarding.spec.js` | 5 etapas com respostas do servidor simuladas (nada é gravado) |
| `tests/workspace-review.spec.js` | 7 casos do modo revisão, gravando e restaurando dados reais do usuário de teste |
| `tests/navigation.spec.js` | redirecionamentos de `settings.html` e menu |

## O que está sem documentação

- Nenhum documento descreve o fluxo de cadastro, a confirmação de e-mail ou as regras do assistente (o README fala de um protótipo com dados só no navegador, `README.md:39-41`).
- Não há página de Termos de Uso nem Política de Privacidade no repositório (busca por "termos"/"privacidade" só encontra o texto da caixa de aceite em `signup.html:13`).
- Não existe fluxo de "esqueci minha senha" (nenhuma chamada a `resetPasswordForEmail` no código). **Ponto para validar:** é intencional?
- Não existe exclusão de conta pelo usuário.
