# ACS · 08 — Plano de testes

Ambiente: projeto de teste confirmado (`CLAUDE.md`, seção 2). Dados: usuários e registros com prefixo `TESTE`. Nunca usar e-mail real de pessoa. Sugestão de e-mails: `teste+acs01@<domínio de teste combinado com o analista>`.

**Atenção:** CT-ACS-01 a 05 criam usuários no Supabase Auth; combinar com o analista como removê-los ao final (não há exclusão pelo app).

| ID | Objetivo | Pré-condição | Passos | Resultado esperado | Regra |
|---|---|---|---|---|---|
| CT-ACS-01 | Cadastro bloqueia senha curta | — | `signup.html`, senha "12345" | mensagem "A senha deve ter pelo menos 6 caracteres." | RN-ACS-002 |
| CT-ACS-02 | Senhas diferentes | — | senha e confirmação diferentes | "As senhas não conferem." | RN-ACS-003 |
| CT-ACS-03 | Sem aceite | — | tudo válido, caixa desmarcada | navegador impede envio (`required`); se forçar, "Você precisa aceitar os termos…" | RN-ACS-001 |
| CT-ACS-04 | Cadastro válido | e-mail `TESTE` novo | preencher e enviar | tela "Confirme seu e-mail" com o e-mail exibido; e-mail recebido; link leva ao endereço de produção (anotar) | RN-ACS-005/006 |
| CT-ACS-05 | Reenvio | após CT-04 | clicar "Reenviar" | "E-mail reenviado…" | RN-ACS-005 |
| CT-ACS-06 | Login inválido | — | e-mail inexistente | mensagem de erro; botão volta a "Entrar →" | RN-ACS-007 |
| CT-ACS-07 | Roteamento | usuário `TESTE_A` com setup concluído; `TESTE_NOVO` sem | logar com cada um | A → `dashboard.html`; NOVO → `workspace.html` | RN-ACS-008 |
| CT-ACS-08 | Sessão adulterada | logado | alterar `access_token` no `localStorage`; abrir `dashboard.html` | redireciona ao login (se não, pendência 9 do diagnóstico continua aberta) | RN-ACS-010 |
| CT-ACS-09 | Já logado abre login | logado | abrir `index.html` | vai ao destino de CT-07 sem pedir senha | RN-ACS-009 |
| CT-ACS-10 | Etapa 1 incompleta | `TESTE_NOVO` | deixar país vazio | "Salvar e continuar" desabilitado | RN-ACS-014 |
| CT-ACS-11 | Saldo negativo | etapa 2 | saldo -10 | botão desabilitado | RN-ACS-014 |
| CT-ACS-12 | Receita zero | etapa 3 | valor 0 | botão desabilitado | RN-ACS-014 |
| CT-ACS-13 | Rascunho no servidor | etapa 2 preenchida | aguardar 1 s; conferir `setup_drafts` do usuário; fechar e reabrir | linha com `current_step = 2` e `data`; ao reabrir, volta à etapa 2 com dados | RN-ACS-015/016 |
| CT-ACS-14 | Rascunho prevalece sobre local | rascunho servidor etapa 3; local etapa 1 | reabrir | etapa 3 | RN-ACS-016 |
| CT-ACS-15 | Aviso de aporte > 75% | etapa 4; receita mensal 3.000 | aporte 2.400 | aviso "representa 80%…" | RN-ACS-019 |
| CT-ACS-16 | Aviso ≥ 100% | idem | aporte 3.500 | aviso "ultrapassa sua receita mensal" | RN-ACS-019 |
| CT-ACS-17 | Data estimada | etapa 4 | data 2026-01-15, 5 anos | "15/01/2031" | RN-ACS-017 |
| CT-ACS-18 | Conclusão cria tudo | etapas válidas | "Começar minha jornada" | alerta de sucesso; `dashboard.html`; no banco: 1 workspace (`setup_completed`), 1 conta, 1 receita (sem `account_id`: anotar), 1 objetivo, 1 plano (aporte = informado, taxa 0), assinatura `TRIALING` com `trial_ends_at = início + trial_days`; rascunho apagado | RN-ACS-020/022/023 |
| CT-ACS-19 | Duplo envio | logo após CT-18 | chamar `complete_setup` de novo via console com o mesmo payload | `already_complete = true`; nenhum registro novo | RN-ACS-020 |
| CT-ACS-20 | Validação do servidor | via console, payload com `goalYears = 101` | chamar `complete_setup` | erro "O prazo da meta deve estar entre 1 e 100 anos." | RN-ACS-021 |
| CT-ACS-21 | Dia de recebimento 40 | via console, `incomeDay = "40"` em usuário novo | `complete_setup` | **esperado pelo negócio:** rejeitar; **hoje:** aceita (anotar como achado ACS-S08) | RN-ACS-021 |
| CT-ACS-22 | Revisão edita e restaura | `TESTE_A` | `settings.html` → editar nome → salvar; depois restaurar | nome gravado em `user_workspaces`; cartões atualizados | RN-ACS-025/029 |
| CT-ACS-23 | Voltar descarta | revisão | editar nome, "Voltar" | nome original | RN-ACS-026 |
| CT-ACS-24 | Guarda comercial | `TESTE_BLOQ` com assinatura `SUSPENDED` (ajustar via RPC admin no ambiente de teste) | abrir `dashboard.html` | redireciona a `billing.html`; abrir `workspace.html?mode=review` não redireciona (excluída) | RN-ACS-027 |
| CT-ACS-25 | Sair | logado com rascunho local | "Sair" | chaves `korbuild-finances-*` removidas; volta ao login | RN-ACS-011 |

## Conferência por script (RN-ACS-017, 018, 019)

Casos de exemplo, calculados conforme `app.js:34, 37, 41` (conta mostrada para o analista conferir):

| Caso | Entrada | Conta | Resultado |
|---|---|---|---|
| Data estimada | 2026-01-15 + 5 anos | ano 2026 + 5 = 2031, mesmo dia e mês | 15/01/2031 |
| Data estimada (29/02) | 2028-02-29 + 1 ano | JavaScript `setFullYear(2029)` em 29/02 → 01/03/2029 | 01/03/2029 (**Ponto para validar:** comportamento desejado?) |
| Receita mensal | 1.000 quinzenal | 1.000 × 2 | 2.000 |
| Receita mensal | 500 semanal | 500 × 4,33 | 2.165 |
| Receita mensal | 12.000 anual | 12.000 × 1/12 | 1.000 |
| Receita mensal | 5.000 "Uma vez" | fator inexistente → 0 | 0 (aviso de aporte nunca aparece) |
| Aviso | aporte 2.400 / receita 3.000 | 0,80 > 0,75 e < 1 | "representa 80%" |
| Aviso | aporte 2.250 / receita 3.000 | 0,75, não é > 0,75 | sem aviso (limite exclusivo) |
