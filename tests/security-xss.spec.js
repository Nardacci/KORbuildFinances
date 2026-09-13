const { test, expect } = require('@playwright/test');
const { testName, openDbPage, getWorkspaceId, insertRow, deleteRow } = require('./helpers/db');

// Regressao para os 2 XSS armazenados encontrados no diagnostico de
// seguranca (Fase 5): o mesmo payload que antes executava um <img
// src=x onerror=...> real no DOM agora precisa aparecer apenas como texto
// literal, em nenhuma das duas renderizacoes.
const XSS_MARKER = 'onerror=(window.__xss_fired=(window.__xss_fired||0)+1)';
const XSS_PAYLOAD = (tag) => `<img src=x ${XSS_MARKER}>${tag}`;

test.describe('Segurança — XSS armazenado (regressão)', () => {
  let workspaceId;

  test.beforeAll(async ({ browser }, testInfo) => {
    const page = await openDbPage(browser, testInfo);
    workspaceId = await getWorkspaceId(page);
    await page.close();
  });

  test('nome de investimento com payload XSS não executa nem na tabela nem no card mobile', async ({ page }) => {
    const name = XSS_PAYLOAD(testName('InvXSS'));

    await page.goto('/accounts.html');
    const type = await insertRow(page, 'investment_types', {
      workspace_id: workspaceId,
      name: testName('TipoXSS'),
      description: null,
      is_system: false,
      parameters: {},
    });
    const inv = await insertRow(page, 'investments', {
      workspace_id: workspaceId,
      investment_type_id: type.id,
      name,
      symbol: null,
      currency: 'BRL',
      invested_amount: 0,
      current_value: 0,
      quantity: null,
      avg_price: null,
      current_price: null,
    });

    await page.goto('/investments.html');
    // A tabela principal renderiza primeiro; o MutationObserver que espelha
    // para #investment-cards dispara logo em seguida, no 'load' da pagina.
    // O workspace pode ter outros investimentos reais, entao so garantimos
    // que o nosso apareceu em ambas as renderizacoes, sem exigir contagem exata.
    await expect(page.locator('#investment-body')).toContainText(name.replace(/<[^>]+>/g, ''));
    await expect(page.locator('#investment-cards')).toContainText(name.replace(/<[^>]+>/g, ''), { timeout: 10000 });

    const fired = await page.evaluate(() => window.__xss_fired || 0);
    expect(fired).toBe(0);
    await expect(page.locator('img[src="x"]')).toHaveCount(0);

    // o nome deve aparecer como texto literal em ambas as renderizacoes
    await expect(page.locator('#investment-body')).toContainText('<img');
    await expect(page.locator('#investment-cards')).toContainText('<img');

    await deleteRow(page, 'investments', inv.id);
    await deleteRow(page, 'investment_types', type.id);
  });

  test('nome de categoria de despesa com payload XSS não executa na legenda do dashboard', async ({ page }) => {
    const catName = XSS_PAYLOAD(testName('CatXSS'));
    const today = new Date().toISOString().slice(0, 10);

    await page.goto('/accounts.html');
    const account = await insertRow(page, 'accounts', {
      workspace_id: workspaceId,
      name: testName('ContaXSS'),
      account_type: 'corrente',
      currency: 'BRL',
      opening_balance: 0,
    });
    const category = await insertRow(page, 'expense_categories', { workspace_id: workspaceId, name: catName });
    const expense = await insertRow(page, 'expenses', {
      workspace_id: workspaceId,
      description: testName('DespesaXSS'),
      amount: 999999, // garante que a categoria fica entre as 8 maiores da legenda, mesmo com dados reais no mes

      status: 'realized',
      paid_date: today,
      planned_date: today,
      currency: 'BRL',
      category_id: category.id,
      account_id: account.id,
    });

    await page.goto('/dashboard.html');
    await expect(page.locator('#expense-legend')).toContainText(catName.replace(/<[^>]+>/g, ''), { timeout: 15000 });

    const fired = await page.evaluate(() => window.__xss_fired || 0);
    expect(fired).toBe(0);
    await expect(page.locator('img[src="x"]')).toHaveCount(0);
    await expect(page.locator('#expense-legend')).toContainText('<img');

    await deleteRow(page, 'expenses', expense.id);
    await deleteRow(page, 'expense_categories', category.id);
    await deleteRow(page, 'accounts', account.id);
  });
});
