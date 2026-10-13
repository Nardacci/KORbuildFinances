# Reconhecimento do material — KORbuild Finances

Data: 2026-10-13. Fonte: repositório `Nardacci/KORbuildFinances`, branch `main`, último commit de 2026-09-28.
Tudo o que está nas tabelas abaixo foi obtido por script (contagens e buscas), não por leitura completa dos arquivos.
Onde a conclusão vem de dedução, está marcada como **Inferência** ou **Ponto para validar**.

## 1. Visão geral

| Item | O que o repositório MOSTRA |
|---|---|
| Tipo de sistema | Site estático (HTML, JavaScript e CSS puros, sem framework) que conversa direto com o Supabase (banco PostgreSQL com API e autenticação prontas) |
| Hospedagem do site | `nardacci.github.io` aparece em `supabase/functions/mp-create-subscription/index.ts` (**Inferência:** publicado via GitHub Pages) |
| Banco de dados | Supabase, esquema `finances`. Projeto de produção identificado em `supabase/config.toml` (identificador não copiado aqui) |
| Lógica no servidor | 8 "edge functions" (programas em TypeScript que rodam no Supabase) em `supabase/functions/` |
| Histórico | 346 commits, 2 autores, tudo entre 2026-09-08 e 2026-09-28 (21 dias) |
| Testes automáticos | 14 arquivos Playwright (teste de navegador) com 32 casos; 1 marcado como pulado |
| Dependências | Só de desenvolvimento: `@playwright/test`, `dotenv`, `http-server` (`package.json`). O site não tem build |
| Bibliotecas externas no navegador | `cdn.jsdelivr.net` (30 referências, **Inferência:** cliente Supabase JS) e `fonts.googleapis.com` (15) |

### Tamanho por tipo de arquivo

| Tipo | Arquivos | Linhas | Observação |
|---|---|---|---|
| HTML | 33 | 475 | Muitos arquivos estão **minificados** (uma só linha de 2 mil a 6 mil caracteres), por isso "linhas" engana; ver bytes na tabela de telas |
| JavaScript (site + testes) | 51 | 3.322 | Idem: `dashboard-movements.js`, `investments.js`, `accounts.js` etc. têm 1 linha |
| CSS | 8 | 322 | `dashboard.css` e `styles.css` minificados |
| SQL (migrações) | 30 | 2.257 | Só a parte mais recente do banco; ver seção 4 |
| TypeScript (edge functions) | 8 | 1.974 | |
| Markdown (docs) | 3 | 347 | README desatualizado; ver seção 7 |

**Ponto para validar:** por que parte dos arquivos está minificada no próprio repositório (não há etapa de build). Se o fonte legível existir em outro lugar, a análise fica mais fácil e mais segura.

## 2. Módulos e telas

Agrupamento proposto (**Inferência** a partir dos nomes de arquivo, títulos e tabelas usadas). Tamanho em bytes do HTML + JS da tela.

| Sigla | Módulo | Telas (HTML) | JS da tela | Tabelas/visões usadas | Funções do banco (RPC) chamadas |
|---|---|---|---|---|---|
| ACS | Acesso e Workspace | `index.html` (login), `signup.html`, `login.html` (vazia, 313 bytes), `workspace.html` (assistente inicial em 5 passos), `settings.html` | `login.js`, `signup.js`, `app.js`, `settings.js`, `auth.js` (comum a todas) | `user_workspaces`, `setup_drafts`, `accounts`, `incomes`, `goals`, `plans` | `complete_setup`, `is_finances_admin`, `get_workspace_access_status` |
| CTA | Contas e Transferências | `accounts.html`, `account-new.html`, `account-edit.html`, `transfers.html`, `transfer-new.html`, `transfer-edit.html` | 6 arquivos | `accounts`, `account_balances` (visão), `transfers`, `user_workspaces` | nenhuma |
| RDP | Receitas e Despesas | `incomes.html`, `income-new.html`, `income-edit.html`, `expenses.html`, `expense-new.html`, `expense-edit.html`, `cadastros.html` | 6 arquivos | `incomes`, `expenses`, `expense_categories`, `accounts` | nenhuma |
| INV | Investimentos | `investment-types.html`, `investment-type-new.html`, `investments.html`, `investment-new.html`, `investment-edit.html`, `investment-detail.html`, `investment-launches.html`, `investment-launch-new.html`, `investment-launch-edit.html` | 9 arquivos | `investment_types`, `investments`, `investment_transactions`, `investment_closings`, `investment_positions` (visão), `accounts` | `delete_investment_transaction`, `update_investment_transaction` |
| PLN | Planejamento e Objetivo | `planning.html`, `wealth-goal.html` (sem JS; **Ponto para validar:** tela morta ou protótipo?) | `planning.js` (maior JS do sistema, 27 KB, com 34 ocorrências de cálculo de taxa/inflação) | `goals`, `plans`, `accounts`, `incomes`, `expenses`, `investment_positions`, `investment_transactions` | nenhuma |
| DSH | Dashboard e Visão gerencial | `dashboard.html`, `dashboard-movements.html` | `dashboard.js`, `dashboard-movements.js` | 10 tabelas/visões (quase tudo) | `get_workspace_access_status` |
| ASS | Assinatura e Comercial | `billing.html` | `billing.js` | via RPC | `get_own_commercial_price`, `get_workspace_access_status` + edge functions `mp-*` |
| ADM | Administração | `finances-admin.html` (sem links de navegação para as demais telas) | `finances-admin.js` | via RPC | 14 RPCs `get_*`/`update_*` + `admin_activate_workspace_trial`, `is_finances_admin` |
| IA | Assistente de IA (Kora) | sem tela própria (**Inferência:** botão flutuante injetado por `auth.js`; commit "redesign Kora FAB") | `auth.js` | via edge function | edge functions `finances-ai`, `compute-insights` |

Observações do inventário de telas:

- Todas as telas de produto carregam `supabase-config.js`, `auth.js` e um JS próprio, com controle de versão por `?v=` no nome (cache).
- `settings.html` carrega só `settings.js` (7 linhas). **Ponto para validar:** tela em construção?
- `login.html` e `wealth-goal.html` não carregam nenhum script. **Inferência:** restos de protótipo.
- `finances-admin.html` não tem link de nenhuma outra tela nem para outras telas. **Inferência:** acesso por URL direta, só para administradores.

## 3. Lógica no servidor (edge functions)

| Função | Tamanho | Quem chama (o que o código MOSTRA) | Integração externa | Segredos que usa (nomes, só) |
|---|---|---|---|---|
| `finances-ai` | 772 linhas | Usuário logado (`auth.getUser`) | API da Anthropic (modelo de IA) | `ANTHROPIC_API_KEY`, chave de serviço do Supabase |
| `compute-insights` | 40 linhas | Agendamento diário do banco (`cron`), autenticado por cabeçalho `x-cron-secret`; `verify_jwt = false` | nenhuma; chama RPC `compute_ai_insights` | `CRON_SECRET` |
| `mp-create-subscription` | 215 linhas | Usuário logado | Mercado Pago (`/preapproval`, assinatura recorrente) | `MP_ACCESS_TOKEN`, `APP_BASE_URL` |
| `mp-cancel-subscription` | 112 linhas | Usuário logado | Mercado Pago | `MP_ACCESS_TOKEN` |
| `mp-webhook` | 324 linhas | Mercado Pago avisa o sistema (valida `x-signature` e `x-request-id`) | Mercado Pago | `MP_WEBHOOK_SECRET`, `MP_ACCESS_TOKEN` |
| `mp-reconcile` | 254 linhas | Agendamento do banco (`x-cron-secret`); `verify_jwt = false` | Mercado Pago | `FINANCES_RECONCILE_CRON_SECRET` |
| `mp-reconcile-self` | 154 linhas | Usuário logado | Mercado Pago | `MP_ACCESS_TOKEN` |
| `mp-sync-exchange-rate` | 103 linhas | Agendamento do banco (`x-cron-secret`); `verify_jwt = false` | Banco Central do Brasil (`olinda.bcb.gov.br`, cotação PTAX) | `FINANCES_FX_SYNC_CRON_SECRET` |

Tabelas usadas pelas edge functions: `payment_subscriptions` (18 usos), `payment_events` (14), `user_workspaces`, `ai_usage_log`, `ai_insights`, `ai_workspace_limits`, `exchange_rates`, `commercial_pricing_settings`, `workspace_commercial_terms`, mais tabelas financeiras lidas pela IA (`accounts`, `incomes`, `expenses`, `goals`, `plans`, `investment_positions`, `investment_transactions`, `expense_categories`).

**Ponto para validar (LGPD):** `finances-ai` lê dados financeiros do usuário e envia para um serviço externo de IA. Precisa constar na política de privacidade e no consentimento.

## 4. Banco de dados

### O que as migrações do repositório MOSTRAM

| Objeto | Quantidade nas migrações | Observação |
|---|---|---|
| Tabelas criadas (`CREATE TABLE`) | 4 | `ai_usage_log`, `ai_insights`, `admins`, `workspace_subscriptions` |
| Visões criadas | 1 | `account_balances` (saldo por conta) |
| Funções (`CREATE FUNCTION`) | 37 comandos, 30 funções distintas | Várias são recriadas em migrações seguintes (versões) |
| Gatilhos (`CREATE TRIGGER`) | 1 | Valida conta e moeda em lançamentos de investimento |
| Políticas de acesso por linha (`CREATE POLICY`) | 2 | Só para `transfers` (alterar e excluir) |
| Concessões de privilégio (`GRANT` / `REVOKE`) | 75 / 9 | Muitas correções recentes de permissão (setembro/2026) |
| Funções `SECURITY DEFINER` | 37 | Funções que rodam com poder do dono do banco, e não do usuário; exigem atenção em segurança |
| Agendamentos (`cron.schedule`) | 2 | Insights de IA diários; conciliação com Mercado Pago |

### O que está FORA do repositório (documento `docs/PROD_DATABASE_MIGRATION_BASELINE_2026-09-24.md`)

O documento afirma que a produção tem **27 tabelas, 4 visões, 34 funções, 63 políticas de acesso e 75 índices** no esquema `finances`, e que **"os arquivos SQL históricos não estão no repositório"**. Ou seja: o repositório não permite reconstruir o banco nem auditar as políticas de acesso lendo código. O diagnóstico de segurança de 2026-09-13 registra o mesmo como pendência de severidade média.

### Tabelas e visões inferidas (por referência no código; **Inferência**, lista a confirmar contra o banco)

| Grupo | Tabelas referenciadas | Visões |
|---|---|---|
| Espaço do usuário | `user_workspaces`, `setup_drafts`, `admins` | |
| Finanças do dia a dia | `accounts`, `transfers`, `incomes`, `expenses`, `expense_categories` | `account_balances`, `financial_cash_flow`, `net_worth_by_currency` |
| Investimentos | `investment_types`, `investments`, `investment_transactions`, `investment_closings`, `investment_closing_items` | `investment_positions` |
| Planejamento | `goals`, `plans` | |
| Comercial / assinatura | `workspace_subscriptions`, `commercial_pricing_settings`, `workspace_commercial_terms`, `payment_instructions`, `payment_subscriptions`, `payment_events`, `exchange_rates` | |
| IA | `ai_usage_log`, `ai_insights`, `ai_workspace_limits` | |

Total inferido: 25 tabelas e 4 visões. A produção declara 27 tabelas: **faltam 2 tabelas que o código não cita** (Ponto para validar).

### Estados de assinatura que aparecem no código

No SQL: `trial`, `active`, `past_due`, `canceled`, `pending`, `trial_enabled`, `blocked_budget`, campos `trial_started_at`, `trial_ends_at`, `grace_ends_at`. No front-end (`auth.js`, `billing.js`): `active`, `grace`, `blocked`. Padrões em `commercial_pricing_settings`: 14 dias de teste grátis e 6 dias de carência (`20260916130000_trial_grace_settings.sql:18-19`). **A confirmar no teste.**

## 5. Testes automáticos existentes

| Arquivo | Casos | O que cobre (pelo nome) |
|---|---|---|
| `navigation.spec.js` | 7 | Navegação entre telas |
| `workspace-review.spec.js` | 7 | Revisão do assistente inicial |
| `retroactive-launches.spec.js` | 4 | Lançamentos retroativos (meses anteriores) e efeito no dashboard |
| `login.spec.js` | 2 (1 pulado) | Login com erro; login com sucesso depende de `.env` |
| `security-transfer-integrity.spec.js` | 2 | Regressão do achado de transferência com valores divergentes |
| `security-xss.spec.js` | 2 | Regressão dos dois XSS corrigidos |
| `accounts`, `expenses`, `incomes`, `investments`, `investment-types`, `investment-launches`, `transfers`, `onboarding` | 1 cada | Cadastro básico de cada entidade |

**Achado importante para a regra "nunca mexer em produção":** os testes rodam o site local (`http-server`) mas o site aponta para o projeto Supabase de `supabase-config.js`, que `config.toml` identifica como o mesmo projeto de produção. Os testes criam e apagam registros com prefixo `TESTE_E2E_` usando um usuário de teste (`tests/helpers/db.js:6`, `tests/global-setup.js`). **Ponto para validar:** existe ambiente de homologação separado? Até confirmar, não rodar os testes a partir deste trabalho.

## 6. Integrações e dependências externas

| Integração | Onde aparece | Para quê (o que o código MOSTRA) |
|---|---|---|
| Supabase (banco, autenticação, funções) | todo o sistema | Base de tudo |
| Mercado Pago | `supabase/functions/mp-*` | Assinatura recorrente, cancelamento, aviso de pagamento (webhook), conciliação |
| Banco Central (PTAX) | `supabase/functions/mp-sync-exchange-rate/index.ts` | Cotação do dólar para cobrar plano em dólar em reais (migração `capture_live_function_drift` cita `get_own_exchange_rates`) |
| Anthropic (IA) | `supabase/functions/finances-ai/index.ts` | Assistente "Kora" e insights |
| GitHub Pages | referência em `mp-create-subscription` | **Inferência:** endereço público do site |

**Ponto para validar:** dois identificadores de projeto Supabase diferentes aparecem no repositório (um em `supabase-config.js` / `config.toml`, outro em `docs/security-diagnostic.md` e em uma migração). **Inferência:** um é o ambiente antigo de desenvolvimento e o outro a produção atual (o baseline fala em "reset ... homol" e "rebuild"). Confirmar qual é qual antes de qualquer teste.

## 7. O que está sem documentação (ou desatualizado)

| Lacuna | Evidência |
|---|---|
| README descreve um protótipo sem Supabase, sem autenticação e com dados só no navegador | `README.md:39` diz "Não há autenticação real, acesso ao Supabase"; o código tem 30 migrações, 8 edge functions e cobrança |
| Esquema do banco (27 tabelas, 63 políticas) não está versionado | `docs/PROD_DATABASE_MIGRATION_BASELINE_2026-09-24.md`, seção "Important limitation" |
| Não há documento de regras de negócio, fluxos, perfis de acesso ou modelo de dados | Pasta `docs/` só tem o diagnóstico de segurança e o baseline |
| Não há documentação das edge functions (contratos, erros, segredos necessários) | Só comentários dentro do código e em `config.toml` |
| Cálculos de planejamento (cenários de taxa, inflação, imposto de renda, aporte necessário) sem memória de cálculo escrita | `planning.js` (34 ocorrências de taxa/inflação); commits "poder de compra + IR", "5 cenários de taxa" |
| Regra de conversão dólar → real (PTAX) e conciliação de pagamentos sem documento | `mp-sync-exchange-rate`, `mp-reconcile`, `mp-webhook` |
| 2 pendências de segurança de severidade média abertas desde 2026-09-13 | `docs/security-diagnostic.md`, tabela "Status consolidado", itens 5 e 9 |
| Código minificado no repositório | Seção 1 |

## 8. Campos do briefing não preenchidos

O briefing veio com alternativas entre colchetes. Assumi o seguinte até receber confirmação:

| Campo | Assumido |
|---|---|
| O que é | Sistema que já existe e precisa ser entendido e validado (evidência: 346 commits e produção ativa) |
| O que está em jogo | Cálculo correto de valores e prazos (planejamento, cobrança em reais pela PTAX), conciliação com Mercado Pago, controle de acesso entre usuários, LGPD (dados financeiros pessoais e envio para IA) |
| Normas | Nenhuma informada: usar boas práticas e LGPD como referência |
| Fica fora | Nada informado: nada excluído por enquanto |
