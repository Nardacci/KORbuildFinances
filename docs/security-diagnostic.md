# Diagnóstico de Segurança — KORbuild Finances

Frontend estático + Supabase, testado em 5 fases (da mais crítica à mais superficial): exposição de credenciais, isolamento multi-tenant (RLS), validação client vs. servidor, proteção de rotas/sessão, e injeção de HTML/script.

- **Projeto:** `nowbohxeqwlddbfnukva.supabase.co`, schema `finances`
- **Metodologia:** testes empíricos contra o projeto real, com duas contas de teste em workspaces distintos (nunca dados reais)
- **Data do diagnóstico original:** 2026-09-13
- **Última atualização (status de correção):** 2026-09-13

## Resumo

| | |
|---|---|
| Vazamentos de dados entre usuários | **0** |
| Tabelas com isolamento validado (anon + cross-tenant) | **12** |
| Achados de severidade alta | **3** — ✅ todos corrigidos |
| Achados de severidade média | **2** — ⏳ pendentes |

---

## Fase 1 — Exposição de credenciais

### ✅ Confirmado seguro — Chave em `supabase-config.js` é a publishable/anon-key, não a service_role

O projeto usa o novo formato de chaves do Supabase (prefixo `sb_publishable_...`), que substitui o antigo par JWT anon/service_role. Não há JWT para decodificar porque o próprio prefixo já identifica a chave como segura para exposição pública, equivalente à antiga `anon key`. Nenhuma chave com prefixo `sb_secret_` (equivalente à antiga `service_role`) foi encontrada em nenhum arquivo.

**Evidência:**
```
supabase-config.js:2 → const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_OTGYzEhQxckBa_8Xqu4Uog_Dm3RmTtD';
auth.js:3 → mesma chave, hardcoded de novo (duplicação, não é risco)
```

### ✅ Confirmado seguro — Nenhum segredo real no código-fonte ou no histórico do git

`git log --all -p` nos 254 commits do repositório, buscando por padrões de JWT (`eyJhbGciOi...`), `service_role`, senhas, chaves de API de terceiros e chaves privadas — nenhuma ocorrência. `.env` nunca foi commitado; só `.env.example` existe no histórico, sempre com valores vazios.

**Evidência:**
```
git log --all --diff-filter=A --name-only | grep -iE ".env|credentials|secret|.pem|.key" → apenas .env.example (placeholders vazios)
grep -riE "sb_secret_|service_role|eyJhbGciOi|AKIA|sk_live_|BEGIN PRIVATE KEY" (working tree + histórico completo) → 0 ocorrências
```

---

## Fase 2 — RLS e isolamento multi-tenant

Testado empiricamente contra o projeto real: acesso sem nenhuma sessão (anon), e acesso autenticado como um segundo usuário tentando ler, inserir, editar e excluir dados do workspace do primeiro. As políticas de RLS das tabelas mais antigas não estão versionadas no repositório (só a política de `transfers` está numa migration) — a auditoria foi feita testando o comportamento real, não lendo SQL.

### ✅ Confirmado seguro — Acesso anônimo negado em nível de GRANT, antes mesmo da RLS, nas 12 tabelas testadas

Um client Supabase sem nenhuma sessão recebeu `42501 permission denied` uniforme em SELECT e INSERT contra `accounts, incomes, expenses, expense_categories, investments, investment_types, investment_transactions, transfers, goals, plans, user_workspaces, investment_closings` — o role `anon` nem chega a ter privilégio de tabela, quanto mais ver dados.

**Evidência:**
```
client (sem sessão).from('accounts').select('*') → { code: '42501', message: 'permission denied for table accounts' }
(mesmo resultado nas outras 11 tabelas)
```

### ✅ Confirmado seguro — Isolamento total entre dois usuários autenticados de workspaces diferentes

Uma segunda conta confirmada, em workspace diferente, tentou SELECT (filtrado pelo workspace da vítima e sem filtro algum), INSERT plantando linhas no workspace da vítima, UPDATE e DELETE contra registros de teste específicos do primeiro usuário — em `accounts, incomes, expenses, expense_categories, investments, investment_types, investment_transactions, transfers, goals, plans, investment_closings`. Todas as tentativas foram negadas; os dados do primeiro usuário sobreviveram intactos.

**Evidência:**
```
usuário 2 → accounts.insert({workspace_id: <workspace do usuário 1>, ...})
  → error: "new row violates row-level security policy for table \"accounts\""
usuário 2 → accounts.update({name:'HACKED_BY_USER2'}).eq('id', <linha do usuário 1>) → 0 linhas afetadas
usuário 2 → accounts.delete().eq('id', <linha do usuário 1>) → 0 linhas afetadas
checagem final (usuário 1): todas as 11 linhas de teste ainda existem, sem alteração
```

### ⏳ Pendente (Médio) — Políticas de RLS não estão versionadas para a maioria das tabelas

As migrations do repositório não têm nenhum `CREATE TABLE` ou `ENABLE ROW LEVEL SECURITY` — só a política de UPDATE/DELETE de `transfers` foi versionada (a mais recente). O restante do schema e das políticas de RLS foi aplicado direto no projeto Supabase antes deste repositório de migrations existir. Isso não é uma falha de acesso (o teste empírico confirma que a proteção está no ar), mas significa que ninguém consegue auditar ou recriar a postura de segurança real só lendo o código — é preciso testar contra o banco ao vivo, como foi feito aqui.

**Recomendação:** rodar `supabase db dump --schema finances --role-only` (ou exportar as políticas via painel) e commitar como uma migration "baseline", para que toda política de RLS existente fique versionada e revisável em PR.

---

## Fase 3 — Validação client-side vs. servidor

Cinco regras de negócio validadas no JavaScript, testadas via chamada direta ao Supabase (mesmo client autenticado, pulando a UI por completo) para ver quais também são aplicadas no servidor.

### ✅ CORRIGIDO (era Alto) — Transferência entre contas de mesma moeda aceitava valores de saída e entrada divergentes

A regra "em contas de mesma moeda, o valor que sai deve ser igual ao que entra" só existia em `transfer-new.js` (client-side). Uma inserção direta na tabela `transfers` com `source_amount:100` e `destination_amount:999999` (ambas contas em BRL) era aceita sem nenhum erro. Como `finances.account_balances` soma o valor de destino na conta que recebe e subtrai o valor de origem da conta que envia, isso permitia inflar o saldo aparente de uma conta sem lastro — quebrando a garantia de integridade financeira que o próprio projeto declara perseguir (migration "Package 1: Financial Integrity").

**Evidência (antes da correção):**
```
client.from('transfers').insert({
  source_account_id, destination_account_id, // contas diferentes, ambas BRL
  source_amount: 100, destination_amount: 999999,
  source_currency: 'BRL', destination_currency: 'BRL', ...
}) → sucesso, sem erro, linha inserida normalmente
```

**Correção aplicada:** `CHECK` constraint em `finances.transfers` — [`supabase/migrations/20260913120000_transfers_same_currency_amount_match.sql`](../supabase/migrations/20260913120000_transfers_same_currency_amount_match.sql), commit [`d89488b`](https://github.com/Nardacci/KORbuildFinances/commit/d89488b) (`fix: patch 2 stored XSS spots and enforce transfer amount integrity in DB`). Exige `source_amount = destination_amount` sempre que `upper(split_part(source_currency,' — ',1)) = upper(split_part(destination_currency,' — ',1))`, mesmo padrão de normalização de moeda já usado em `validate_investment_transaction_account`.

**Teste de regressão:** [`tests/security-transfer-integrity.spec.js`](../tests/security-transfer-integrity.spec.js) (commit [`a83fb88`](https://github.com/Nardacci/KORbuildFinances/commit/a83fb88)) — confirma que o mesmo bypass agora é rejeitado pelo banco (`transfers_same_currency_amounts_match`), e que câmbio legítimo entre moedas diferentes com valores diferentes continua funcionando.

### ✅ Confirmado seguro — Moeda da receita ≠ moeda da conta: bloqueado também no servidor

Inserção direta de uma receita em USD numa conta BRL foi rejeitada pelo banco, não só pela UI.

**Evidência:** `error: "A moeda da receita deve ser a mesma moeda da conta de recebimento"`

### ✅ Confirmado seguro — Valor de despesa negativo: bloqueado também no servidor

Inserção direta de uma despesa com `amount: -500` foi rejeitada por um CHECK constraint.

**Evidência:** `error: new row for relation "expenses" violates check constraint "expenses_amount_check"`

### ✅ Confirmado seguro — Aporte/resgate de investimento sem conta financeira: bloqueado também no servidor

Um trigger (`validate_investment_transaction_account`) exige conta vinculada para lançamentos do tipo aporte/resgate, mesmo pulando a UI.

**Evidência:** `error: "Informe a conta financeira usada na operação."`

### ✅ Confirmado seguro — Moeda da conta ≠ moeda do investimento em lançamentos: bloqueado também no servidor

O mesmo trigger valida a moeda da conta financeira contra a moeda do investimento.

**Evidência:** `error: "A moeda da conta deve ser igual à moeda do investimento."`

---

## Fase 4 — Autenticação e proteção de rotas

Acesso direto por URL a páginas protegidas sem sessão, e com uma sessão local adulterada/inválida.

### ✅ Confirmado seguro — Sem sessão alguma: redirecionamento correto para o login

`dashboard.html`, `settings.html`, `accounts.html` e `investments.html` acessadas diretamente por URL, numa aba sem nenhum login prévio, redirecionam imediatamente para `index.html`. Nenhum dado ou erro é exposto antes do redirecionamento.

### ⏳ Pendente (Médio) — Sessão local corrompida/inválida não força novo login

Com um `access_token` adulterado no `localStorage` (simulando um token expirado ou roubado/corrompido), o app **não** redireciona para o login — continua renderizando a casca autenticada inteira (menu, nome real do usuário, avatar) indefinidamente. As buscas de dados reais falham corretamente no servidor (o Supabase rejeita o JWT com `401 / PGRST301`), e as telas testadas mostram uma mensagem de erro genérica em vez de dados — então nenhuma informação financeira real vaza. Mas: (a) nome e e-mail do usuário continuam visíveis, vindos de um cache local não verificado; (b) a aplicação nunca força reautenticação, deixando a experiência quebrada indefinidamente em vez de reencaminhar ao login.

**Evidência:**
```
localStorage['sb-nowbohxeqwlddbfnukva-auth-token'].access_token adulterado → dashboard.html carrega normalmente
console: "Failed to load resource: 401" / "PGRST301: No suitable key was able to decode the JWT"
tela mostra: "Olá, André Nardacci" + todos os cartões em R$ 0 + aviso "Não foi possível carregar os dados do seu espaço financeiro."
```

**Recomendação:** registrar um listener global (`KORbuildAuth.client.auth.onAuthStateChange`) ou um interceptor que, ao receber 401/JWT inválido de qualquer chamada, force `location.replace('index.html')` em vez de deixar cada página tratar o erro individualmente.

---

## Fase 5 — Injeção / XSS

Payload `<img src=x onerror=...>` inserido diretamente via schema (simulando bypass total da UI) em 8 campos de texto livre, em 6 telas de listagem diferentes.

### ✅ CORRIGIDO (era Alto) — XSS armazenado em `investments.html`, espelhamento para cards mobile desfazia o escape

A tabela principal de investimentos escapava o nome corretamente. Mas um script inline separado (no próprio `investments.html`) espelhava cada linha da tabela para um "card" de mobile lendo `strong.textContent` — que devolve o texto já *decodificado* — e inseria esse valor de volta via `card.innerHTML` sem escapar de novo. O HTML/script do nome do investimento era reintroduzido como marcação real e executava.

**Evidência (antes da correção):**
```
investments.html (script inline, dentro do MutationObserver que gera #investment-cards):
  const name = strong?.textContent || '';
  card.innerHTML = `<div><strong>${name}</strong>...`; // sem esc()

nome do investimento: <img src=x onerror="window.__xss_fired=1">TESTE_E2E_SEC5_XSS2
resultado: elemento <img src="x" onerror="..."> real no DOM, onerror disparou (confirmado)
```

**Correção aplicada:** `investments.html` agora define e aplica a mesma função `esc()` já usada na tabela principal, escapando `name`, `type`, `value`, `result` e `ret` antes de montar cada card — commit [`d89488b`](https://github.com/Nardacci/KORbuildFinances/commit/d89488b).

**Teste de regressão:** [`tests/security-xss.spec.js`](../tests/security-xss.spec.js) (commit [`a83fb88`](https://github.com/Nardacci/KORbuildFinances/commit/a83fb88)) — injeta o mesmo payload, confirma que ele aparece como texto literal (`&lt;img...`) tanto na tabela quanto no card mobile, e que nenhum `<img>` real é criado no DOM.

### ✅ CORRIGIDO (era Alto) — XSS armazenado na legenda de categorias de despesa em `dashboard.js`

`renderExpenseChart()` interpolava o nome da categoria de despesa direto em `innerHTML`, sem `esc()`. Como não existe UI para criar categorias, a exploração exigia uma chamada direta à API — mas qualquer usuário autenticado já tem esse acesso ao próprio workspace.

**Evidência (antes da correção):**
```
dashboard.js → renderExpenseChart(): `<span>${x.name}</span>` // x.name = expense_categories.name, sem esc()

expense_categories.name = '<img src=x onerror="window.__xss_fired=1">TESTE_E2E_SEC5_CAT'
resultado no dashboard: elemento <img src="x" onerror="..."> real, onerror disparou (confirmado)
```

**Correção aplicada:** adicionada a mesma função `esc()` já usada em outras telas do app a `dashboard.js`, aplicada a `x.name` na legenda — commit [`d89488b`](https://github.com/Nardacci/KORbuildFinances/commit/d89488b).

**Teste de regressão:** [`tests/security-xss.spec.js`](../tests/security-xss.spec.js) (commit [`a83fb88`](https://github.com/Nardacci/KORbuildFinances/commit/a83fb88)) — injeta o mesmo payload no nome de uma categoria, confirma texto literal na legenda do dashboard e nenhum `<img>` real no DOM.

### ✅ Confirmado seguro — Demais telas escapam corretamente o mesmo payload

`accounts.html`, `expenses.html`, `incomes.html`, `transfers.html`, `investment-launches.html` e `dashboard-movements.html` — todas renderizaram o payload como texto literal (`&lt;img...&gt;`), sem executar nada.

---

## Nota sobre o alcance real dos dois XSS encontrados

Enquanto estavam abertos, os dois XSS da Fase 5 só atingiam o próprio usuário que cadastrava o nome malicioso (RLS garante que ninguém mais via os nomes de investimento/categoria de outro workspace) — não era um vetor de ataque entre usuários enquanto o app não tiver nenhuma função de compartilhamento, suporte/admin ou importação de dados de terceiros. Ainda assim, eram falhas reais de codificação de saída que valiam correção: o token de sessão do Supabase mora no mesmo `localStorage` de origem, e qualquer recurso futuro que exponha esse campo a outro usuário (compartilhar orçamento, visão de suporte, importar CSV) herdaria o problema imediatamente. Ambas foram corrigidas — ver Fase 5 acima.

---

## Status consolidado

| # | Achado | Severidade | Status | Referência |
|---|---|---|---|---|
| 1 | Chave publishable, não service_role | — | ✅ Seguro | — |
| 2 | Sem segredos no código/histórico | — | ✅ Seguro | — |
| 3 | Acesso anônimo negado (12 tabelas) | — | ✅ Seguro | — |
| 4 | Isolamento cross-tenant (11 tabelas) | — | ✅ Seguro | — |
| 5 | Políticas de RLS não versionadas | Médio | ⏳ Pendente | — |
| 6 | Transferência mesma-moeda com valores divergentes | **Alto** | ✅ Corrigido | migration `20260913120000`, commits `d89488b` / `a83fb88`, teste `security-transfer-integrity.spec.js` |
| 7 | Regras de moeda/valor/conta: 4 validações server-side confirmadas | — | ✅ Seguro | — |
| 8 | Redirecionamento sem sessão | — | ✅ Seguro | — |
| 9 | Sessão inválida não força login | Médio | ⏳ Pendente | — |
| 10 | XSS em `investments.html` (cards mobile) | **Alto** | ✅ Corrigido | commits `d89488b` / `a83fb88`, teste `security-xss.spec.js` |
| 11 | XSS na legenda de categorias (`dashboard.js`) | **Alto** | ✅ Corrigido | commits `d89488b` / `a83fb88`, teste `security-xss.spec.js` |
| 12 | Demais telas escapam corretamente | — | ✅ Seguro | — |

---

*Diagnóstico original e correções conduzidos em sessão de testes de segurança com Claude Code. Dados de teste usados nunca foram dados reais e foram removidos ao final de cada fase.*
