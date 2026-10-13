# ACS · 03 — Regras de negócio

Situação: `Extraída` (lida no código), `A confirmar no teste`, `Validada`.

| Código | Regra | Fonte (arquivo:linha) | Situação | Observação |
|---|---|---|---|---|
| RN-ACS-001 | Cadastro exige nome, país, e-mail, senha, confirmação de senha e aceite dos termos | `signup.js:51-57, 66-69`; `signup.html:13` (`required`) | Extraída | País: Estados Unidos, Itália, Portugal, Alemanha, Reino Unido, Outro |
| RN-ACS-002 | Senha com pelo menos 6 caracteres | `signup.js:58-61`; `index.html:14` e `signup.html:13` (`minlength="6"`) | Extraída | Sem exigência de complexidade. **Ponto para validar:** política do Supabase Auth |
| RN-ACS-003 | Senha e confirmação devem ser iguais | `signup.js:62-65` | Extraída | |
| RN-ACS-004 | Nome e país digitados no cadastro **não são enviados** ao servidor; só e-mail e senha | `signup.js:75`; `auth.js:25-28` | Extraída | Falha de aderência → REQ-ACS-02 |
| RN-ACS-005 | Se o cadastro não devolver sessão, mostra "Confirme seu e-mail" com reenvio (`resend` tipo `signup`) | `signup.js:78-82, 27-45` | Extraída | Inferência: confirmação obrigatória. A confirmar no teste |
| RN-ACS-006 | Link de confirmação aponta sempre para o endereço de produção, independentemente de onde o site foi aberto | `auth.js:16-23` | Extraída | Afeta ambiente de teste |
| RN-ACS-007 | Login por e-mail e senha | `auth.js:14`; `login.js:43-52` | Extraída | |
| RN-ACS-008 | Após login: administrador → `finances-admin.html`; configuração concluída → `dashboard.html`; caso contrário → `workspace.html` | `login.js:15-37` | Extraída | Verificação de admin antes da de workspace |
| RN-ACS-009 | Usuário já logado que abre a tela de login é roteado automaticamente | `login.js:64-73` | Extraída | |
| RN-ACS-010 | A sessão guardada no navegador é revalidada no servidor a cada verificação; se inválida, faz logout | `auth.js:3-13` | Extraída | Parece responder à pendência 9 do `docs/security-diagnostic.md`. A confirmar no teste |
| RN-ACS-011 | Sair limpa o rascunho local e a marca de onboarding e encerra a sessão | `auth.js:29-33` | Extraída | |
| RN-ACS-012 | Tela protegida sem sessão redireciona para a tela de login | `dashboard.js:38`; `app.js:182`; `workspace.html:26` | Extraída | Dois destinos (`index.html`, `login.html`) com o mesmo efeito |
| RN-ACS-013 | O assistente tem 5 etapas; só avança se a etapa atual for válida; a barra superior não navega | `app.js:32, 152`; `tests/onboarding.spec.js:56-58` | Extraída | |
| RN-ACS-014 | Validações por etapa: (1) nome, país, moeda; (2) nome da conta, tipo, saldo ≥ 0; (3) descrição, categoria, valor > 0, frequência; (4) nome do objetivo, valor > 0, anos > 0, data inicial e, no onboarding, aporte mensal > 0 | `app.js:32` | Extraída | Dia de recebimento e moeda da conta não são validados no cliente |
| RN-ACS-015 | Rascunho salvo no navegador a cada alteração e no servidor (`setup_drafts`, um por usuário) com atraso de 450 ms; mensagem "Salvo com segurança." ou, em falha, "Salvo neste dispositivo." | `app.js:23, 26` | Extraída | Não salva no modo revisão |
| RN-ACS-016 | Ao reabrir o assistente, o rascunho do servidor sobrescreve o local, inclusive a etapa | `app.js:27, 191` | Extraída | |
| RN-ACS-017 | Data estimada do objetivo = data inicial + anos | `app.js:34` | Extraída | Conferida por script (ver `08-plano-de-testes.md`, CT-ACS-17) |
| RN-ACS-018 | Receita mensal equivalente = valor × fator: Mensal 1, Quinzenal 2, Semanal 4,33, Anual 1/12; "Uma vez" conta 0 | `app.js:37`; opções em `workspace.html:10` | Extraída | Fatores em inglês também aceitos na revisão (`app.js:40`) |
| RN-ACS-019 | Aviso quando aporte mensal > 75% da receita mensal; texto diferente quando ≥ 100% ("ultrapassa") | `app.js:41` | Extraída | Só aviso, não impede |
| RN-ACS-020 | Conclusão é atômica, com bloqueio por usuário; se já concluída, devolve `already_complete` e não altera nada | `20260927120000_...sql:76-78`; `app.js:154` | Extraída | |
| RN-ACS-021 | O servidor revalida: nome, país, moeda, conta, tipo, moeda da conta, descrição, categoria, frequência obrigatórios; saldo, receita, meta, anos, aporte numéricos; receita > 0; meta > 0; 1 ≤ anos ≤ 100; aporte > 0; patrimônio inicial ≥ 0; saldo ≥ 0; data válida | `20260927120000_...sql:54-74` | Extraída | Dia de recebimento sem validação de faixa (`:92`) |
| RN-ACS-022 | `complete_setup` cria ou atualiza o workspace; cria conta (saldo ≥ 0), receita (moeda = moeda principal, **sem conta vinculada**), objetivo, plano (aporte informado, taxa 0); marca `setup_completed`; apaga o rascunho | `20260927120000_...sql:80-101` | Extraída | Receita sem `account_id` não entra no saldo da conta (ver CTA). **Ponto para validar** |
| RN-ACS-023 | Workspace novo inicia o teste grátis no mesmo instante; ao retomar um workspace existente, não reinicia | `20260927120000_...sql:80-86`; `20260916140000_...sql:18-22` | Extraída | Regra comercial detalhada no módulo ASS |
| RN-ACS-024 | Usuário com configuração concluída que abre o assistente (sem `mode=review`) vai para o dashboard | `app.js:190` | Extraída | |
| RN-ACS-025 | Revisão exige configuração concluída; edita "Você" em `user_workspaces`, "Objetivo" e "Plano" em `goals`/`plans`; conta e receita nas telas próprias com retorno | `app.js:185, 93, 109-110, 71, 74` | Extraída | Em revisão, aporte pode ser 0 (`app.js:33`) |
| RN-ACS-026 | Em revisão, "Voltar" descarta edições não salvas | `app.js:62-65, 174` | Extraída | Coberto por `tests/workspace-review.spec.js:120-128` |
| RN-ACS-027 | Guarda comercial: nas telas não excluídas, acesso `BLOCKED` → `billing.html`; erro técnico não bloqueia (fail-open) | `auth.js:38-62` | Extraída | Decisão de desenho explícita no comentário (`:55-59`) |
| RN-ACS-028 | Administrador = usuário presente em `finances.admins` com `active = true` | `20260915190000_...sql:31-42` | Extraída | |
| RN-ACS-029 | `settings.html` redireciona para a revisão | `settings.html:6`; `settings.js:6` | Extraída | Coberto por `tests/navigation.spec.js` |
| RN-ACS-030 | Hub de configurações oferece Tipos de investimento; Instituições, Moedas e Categorias estão "Em breve" | `cadastros.html` (texto dos cartões) | Extraída | |
| RN-ACS-031 | Versão histórica: a 1ª versão de `complete_setup` calculava o aporte com taxa de 1,05% ao mês; a 2ª com taxa 0 e divisão simples; a atual grava o aporte informado | `20260910030000_...sql:20, 84-91`; `20260912010000_...sql:20, 88-89`; `20260927120000_...sql:67` | Extraída | Dados criados antes de 2026-09-27 têm aporte calculado, não declarado. **Ponto para validar** |
