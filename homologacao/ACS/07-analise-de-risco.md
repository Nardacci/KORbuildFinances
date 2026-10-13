# ACS · 07 — Análise de risco

| # | Risco | Prob. | Impacto | Evidência | Mitigação |
|---|---|---|---|---|---|
| R-ACS-01 | Usuário não consegue entrar após esquecer a senha e abandona o produto | Alta | Médio | sem recuperação de senha | ACS-S04 |
| R-ACS-02 | Contas de teste confirmadas no site de produção (mistura de ambientes) | Média | Médio | `auth.js:19` | ACS-S05 |
| R-ACS-03 | Questionamento legal por aceite de termos sem documento nem registro | Média | Alto | `signup.html:13` | REQ-ACS-03 |
| R-ACS-04 | Usuário fica preso: configuração marcada como concluída mas sem objetivo/plano (ex.: erro parcial em versão antiga) e revisão falha | Baixa | Médio | revisão usa `maybeSingle` e aceita nulos (`app.js:49-50, 55`) | teste CT-ACS-22 |
| R-ACS-05 | Primeira receita criada sem conta vinculada não entra no saldo da conta, confundindo o usuário no dashboard | Média | Médio | SQL `:91-92` sem `account_id` | Ponto para validar na Etapa 2 (CTA/RDP) |
| R-ACS-06 | Aporte declarado maior que a receita (só aviso) gera planos irreais | Média | Baixo | `app.js:41` | Decisão de produto |
| R-ACS-07 | Rascunho com dados financeiros em computador compartilhado | Baixa | Médio | `localStorage` | ACS-S06 |
| R-ACS-08 | Erro técnico na guarda comercial libera usuário bloqueado | Baixa | Baixo | `auth.js:55-59` | ACS-S01 |
| R-ACS-09 | Dados antigos com aporte calculado (versões anteriores de `complete_setup`) misturados com aporte declarado | Média | Baixo | RN-ACS-031 | Levantar quantos planos foram criados antes de 2026-09-27 |
