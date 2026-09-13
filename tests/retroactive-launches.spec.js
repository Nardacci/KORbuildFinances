const { test, expect } = require('@playwright/test');
const { testName, openDbPage, getWorkspaceId, insertRow, deleteRow } = require('./helpers/db');
const { waitForSelectOptions, waitForWorkspaceReady, waitForPlanReady, waitForMonthRefresh } = require('./helpers/page');
const { monthsAgoISO, yearMonth, toBRDate, parseBRL } = require('./helpers/format');

// Cobre lancamentos com datas retroativas (1, 6 e 12 meses atras) para
// receitas, despesas e lancamentos de investimento. Para cada caso, valida:
//  1. o lancamento e aceito sem erro de validacao bloqueando data passada;
//  2. aparece na listagem da propria area, com a data correta;
//  3. o total mensal em dashboard-movements.html (Consolidacao Financeira,
//     que tem um seletor de mes) muda exatamente pelo valor lancado — mas
//     so ate 11 meses atras: o dropdown de mes cobre o mes atual + os 11
//     anteriores (12 meses no total), entao "12 meses atras" cai fora do
//     range visivel nessa tela;
//  4. planning.html (janela movel de 12 meses, mesmo limite de "mes atual
//     + 11 anteriores") reflete o lancamento quando dentro da janela
//     (1 e 6 meses) e nao reflete quando fora dela (12 meses) — validado
//     por mudanca/nao-mudanca do texto, sem recalcular a media manualmente.
//
// Todos os testes deste arquivo rodam em serie: dashboard-movements e
// planning agregam por mes/janela movel, entao dois testes rodando em
// paralelo e escrevendo no mesmo mes-calendario corromperiam a leitura
// "antes/depois" um do outro.
test.describe('Lançamentos retroativos (1, 6 e 12 meses atrás)', () => {
  test.describe.configure({ mode: 'serial' });

  let workspaceId;
  let accountId;
  let categoryId;
  let typeId;
  let investmentId;
  let dashboardBefore;

  test.beforeAll(async ({ browser }, testInfo) => {
    const page = await openDbPage(browser, testInfo);
    workspaceId = await getWorkspaceId(page);

    const account = await insertRow(page, 'accounts', {
      workspace_id: workspaceId,
      name: testName('ContaRetroativa'),
      account_type: 'corrente',
      currency: 'BRL',
      opening_balance: 0,
    });
    accountId = account.id;

    const category = await insertRow(page, 'expense_categories', {
      workspace_id: workspaceId,
      name: testName('CategoriaRetroativa'),
    });
    categoryId = category.id;

    const type = await insertRow(page, 'investment_types', {
      workspace_id: workspaceId,
      name: testName('TipoRetroativo'),
      description: null,
      is_system: false,
      parameters: { position_method: 'units_price', quantity_enabled: true, market_price_enabled: true, income_enabled: false, maturity_enabled: false },
    });
    typeId = type.id;

    const investment = await insertRow(page, 'investments', {
      workspace_id: workspaceId,
      investment_type_id: typeId,
      name: testName('InvestimentoRetroativo'),
      symbol: null,
      currency: 'BRL',
      invested_amount: 0,
      current_value: 0,
      quantity: null,
      avg_price: null,
      current_price: null,
    });
    investmentId = investment.id;

    await page.goto('/dashboard.html');
    await expect(page.locator('#hello')).not.toHaveText('', { timeout: 15000 });
    dashboardBefore = {
      income: await page.locator('#metric-income').textContent(),
      expense: await page.locator('#metric-expense').textContent(),
      invest: await page.locator('#metric-investment').textContent(),
    };

    await page.close();
  });

  test.afterAll(async ({ browser }, testInfo) => {
    const page = await openDbPage(browser, testInfo);
    await deleteRow(page, 'investments', investmentId);
    await deleteRow(page, 'investment_types', typeId);
    await deleteRow(page, 'accounts', accountId);
    await deleteRow(page, 'expense_categories', categoryId);
    await page.close();
  });

  // Lê o total (ja convertido pra numero) de um mes especifico em
  // dashboard-movements.html. Sempre navega do zero para nao herdar estado
  // de uma leitura anterior.
  async function readMonthTotal(page, ym, totalSelector) {
    await page.goto('/dashboard-movements.html');
    await waitForSelectOptions(page, '#month-filter', 12);
    const hasOption = (await page.locator(`#month-filter option[value="${ym}"]`).count()) > 0;
    if (!hasOption) return { supported: false, value: null };
    // Espera o refresh() inicial (do mes atual, disparado pelo load()) terminar
    // antes de trocar o filtro — senao os dois refresh() concorrentes correm
    // uma corrida e o ultimo a resolver vence, independente de qual mes o
    // usuario efetivamente pediu.
    await expect(page.locator('#page-title')).toContainText('·', { timeout: 15000 });
    const initialTitle = await page.locator('#page-title').textContent();
    await page.selectOption('#month-filter', ym);
    await waitForMonthRefresh(page, initialTitle);
    const text = await page.locator(totalSelector).textContent();
    return { supported: true, value: parseBRL(text) };
  }

  async function readPlanningField(page, fieldSelector) {
    await page.goto('/planning.html');
    await waitForPlanReady(page);
    return page.locator(fieldSelector).textContent();
  }

  const offsets = [1, 6, 12];

  test.describe('Receitas retroativas', () => {
    for (const months of offsets) {
      test(`receita de ${months} mês(es) atrás é aceita e reflete no mês certo`, async ({ page }) => {
        const date = monthsAgoISO(months);
        const ym = yearMonth(date);
        const amount = 321;
        const desc = testName(`ReceitaRetro${months}m`);
        const withinWindow = months <= 11;

        const before = withinWindow ? await readMonthTotal(page, ym, '#total-income') : null;
        const planBefore = await readPlanningField(page, '#real-capacity');

        await page.goto('/income-new.html');
        await waitForSelectOptions(page, '#account');
        await page.fill('#description', desc);
        await page.fill('#category', 'Trabalho');
        await page.fill('#amount', String(amount));
        await page.selectOption('#account', accountId);
        await page.fill('#receipt-date', date);
        await page.selectOption('#status', 'realized');
        await page.click('#save-income');

        await page.waitForURL(/incomes\.html\?created=1$/);
        const row = page.locator('#income-list tr', { hasText: desc });
        await expect(row).toContainText(desc);
        await expect(row).toContainText(toBRDate(date));

        if (withinWindow) {
          const after = await readMonthTotal(page, ym, '#total-income');
          expect(after.supported).toBe(true);
          expect(after.value - before.value).toBeCloseTo(amount, 2);

          const planAfter = await readPlanningField(page, '#real-capacity');
          expect(planAfter).not.toBe(planBefore);
        } else {
          const check = await readMonthTotal(page, ym, '#total-income');
          expect(check.supported).toBe(false); // fora do range de 12 meses do seletor

          const planAfter = await readPlanningField(page, '#real-capacity');
          expect(planAfter).toBe(planBefore); // fora da janela movel: nao deve mudar a media
        }

        // cleanup: exclui a receita pela propria UI (edit -> delete)
        await page.goto('/incomes.html');
        const rowAgain = page.locator('#income-list tr', { hasText: desc });
        await rowAgain.getByRole('link', { name: 'Editar' }).click();
        await page.waitForURL(/income-edit\.html\?id=/);
        await waitForWorkspaceReady(page);
        page.once('dialog', (dialog) => dialog.accept());
        await page.click('#delete-income');
        await page.waitForURL(/incomes\.html\?deleted=1$/);
        await expect(page.locator('#income-list')).not.toContainText(desc);
      });
    }
  });

  test.describe('Despesas retroativas', () => {
    for (const months of offsets) {
      test(`despesa de ${months} mês(es) atrás é aceita e reflete no mês certo`, async ({ page }) => {
        const date = monthsAgoISO(months);
        const ym = yearMonth(date);
        const amount = 213;
        const desc = testName(`DespesaRetro${months}m`);
        const withinWindow = months <= 11;

        const before = withinWindow ? await readMonthTotal(page, ym, '#total-payment') : null;
        const planBefore = await readPlanningField(page, '#real-capacity');

        await page.goto('/expense-new.html');
        await waitForSelectOptions(page, '#category');
        await page.fill('#description', desc);
        await page.fill('#amount', String(amount));
        await page.selectOption('#category', categoryId);
        await page.fill('#date', date);
        await page.selectOption('#status', 'realized');
        await page.click('.primary-action');

        await page.waitForURL(/expenses\.html\?created=1$/);
        const row = page.locator('.expense-row', { hasText: desc });
        await expect(row).toContainText(desc);
        await expect(row).toContainText(toBRDate(date));

        if (withinWindow) {
          const after = await readMonthTotal(page, ym, '#total-payment');
          expect(after.supported).toBe(true);
          expect(after.value - before.value).toBeCloseTo(amount, 2);

          const planAfter = await readPlanningField(page, '#real-capacity');
          expect(planAfter).not.toBe(planBefore);
        } else {
          const check = await readMonthTotal(page, ym, '#total-payment');
          expect(check.supported).toBe(false);

          const planAfter = await readPlanningField(page, '#real-capacity');
          expect(planAfter).toBe(planBefore);
        }

        // cleanup: exclui a despesa pela propria UI
        await page.goto('/expenses.html');
        const rowAgain = page.locator('.expense-row', { hasText: desc });
        page.once('dialog', (dialog) => dialog.accept());
        await rowAgain.locator('[data-delete]').click();
        await expect(page.locator('#expense-list')).not.toContainText(desc, { timeout: 10000 });
      });
    }
  });

  test.describe('Lançamentos de investimento retroativos', () => {
    for (const months of offsets) {
      test(`lançamento de ${months} mês(es) atrás é aceito e reflete no mês certo`, async ({ page }) => {
        const date = monthsAgoISO(months);
        const ym = yearMonth(date);
        const amount = 555;
        const desc = testName(`LancamentoRetro${months}m`);
        const withinWindow = months <= 11;

        const before = withinWindow ? await readMonthTotal(page, ym, '#total-investment') : null;
        const planBefore = await readPlanningField(page, '#real-investment');

        await page.goto('/investment-launch-new.html');
        await waitForSelectOptions(page, '#investment');
        await page.selectOption('#investment', investmentId);
        await page.selectOption('#transaction-type', 'contribution');
        await page.selectOption('#account', accountId);
        await page.fill('#transaction-date', date);
        await page.fill('#amount', String(amount));
        await page.fill('#description', desc);
        await page.click('#save');

        await page.waitForURL(/investment-launches\.html\?created=1$/);
        const row = page.locator('#launch-body tr', { hasText: desc });
        await expect(row).toContainText(desc);
        await expect(row).toContainText(toBRDate(date));

        if (withinWindow) {
          const after = await readMonthTotal(page, ym, '#total-investment');
          expect(after.supported).toBe(true);
          expect(after.value - before.value).toBeCloseTo(amount, 2);

          const planAfter = await readPlanningField(page, '#real-investment');
          expect(planAfter).not.toBe(planBefore);
        } else {
          const check = await readMonthTotal(page, ym, '#total-investment');
          expect(check.supported).toBe(false);

          const planAfter = await readPlanningField(page, '#real-investment');
          expect(planAfter).toBe(planBefore);
        }

        // cleanup: exclui o lancamento pela propria UI
        await page.goto('/investment-launches.html');
        const rowAgain = page.locator('#launch-body tr', { hasText: desc });
        page.once('dialog', (dialog) => dialog.accept());
        await rowAgain.locator('[data-delete]').click();
        await page.waitForURL(/investment-launches\.html\?deleted=1$/);
        await expect(page.locator('#launch-body')).not.toContainText(desc);
      });
    }
  });

  test('mês atual do dashboard permanece intocado após todos os lançamentos retroativos', async ({ page }) => {
    // Sanity final: nada do que foi lancado neste arquivo (todo em meses
    // passados, e ja excluido ao fim de cada teste) deveria ter alterado os
    // totais do MES ATUAL no dashboard principal.
    await page.goto('/dashboard.html');
    await expect(page.locator('#hello')).not.toHaveText('', { timeout: 15000 });
    await expect(page.locator('#metric-income')).toHaveText(dashboardBefore.income);
    await expect(page.locator('#metric-expense')).toHaveText(dashboardBefore.expense);
    await expect(page.locator('#metric-investment')).toHaveText(dashboardBefore.invest);
  });
});
