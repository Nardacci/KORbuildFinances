const { test, expect } = require('@playwright/test');
const { testName, openDbPage, getWorkspaceId, insertRow, deleteRow } = require('./helpers/db');
const { waitForSelectOptions } = require('./helpers/page');

test.describe('Lançamentos de Investimento (CRUD)', () => {
  let workspaceId;
  let typeId;
  let investmentId;
  let accountId;
  const investmentName = testName('InvestimentoLancamento');
  const accountName = testName('ContaLancamento');

  test.beforeAll(async ({ browser }, testInfo) => {
    const page = await openDbPage(browser, testInfo);
    workspaceId = await getWorkspaceId(page);

    const type = await insertRow(page, 'investment_types', {
      workspace_id: workspaceId,
      name: testName('TipoLancamento'),
      description: null,
      is_system: false,
      parameters: { position_method: 'units_price', quantity_enabled: true, market_price_enabled: true, income_enabled: false, maturity_enabled: false },
    });
    typeId = type.id;

    const investment = await insertRow(page, 'investments', {
      workspace_id: workspaceId,
      investment_type_id: typeId,
      name: investmentName,
      symbol: null,
      currency: 'BRL',
      invested_amount: 0,
      current_value: 0,
      quantity: null,
      avg_price: null,
      current_price: null,
    });
    investmentId = investment.id;

    const account = await insertRow(page, 'accounts', {
      workspace_id: workspaceId,
      name: accountName,
      account_type: 'corrente',
      currency: 'BRL',
      opening_balance: 0,
    });
    accountId = account.id;

    await page.close();
  });

  test.afterAll(async ({ browser }, testInfo) => {
    const page = await openDbPage(browser, testInfo);
    await deleteRow(page, 'investments', investmentId);
    await deleteRow(page, 'accounts', accountId);
    await deleteRow(page, 'investment_types', typeId);
    await page.close();
  });

  test('cria, edita, exclui e reflete na listagem', async ({ page }) => {
    const createdDesc = testName('Lancamento');
    const editedDesc = testName('Lancamento_Editado');

    await page.goto('/investment-launch-new.html');
    await waitForSelectOptions(page, '#investment');
    await page.selectOption('#investment', investmentId);
    await page.selectOption('#transaction-type', 'contribution');
    await page.selectOption('#account', accountId);
    await page.fill('#transaction-date', new Date().toISOString().slice(0, 10));
    await page.fill('#amount', '500');
    await page.fill('#description', createdDesc);
    await page.click('#save');

    await page.waitForURL(/investment-launches\.html\?created=1$/);
    await expect(page.locator('#launch-body')).toContainText(createdDesc);

    const row = page.locator('#launch-body tr', { hasText: createdDesc });
    await row.getByRole('link', { name: 'Editar' }).click();

    await page.waitForURL(/investment-launch-edit\.html\?id=/);
    await expect(page.locator('#description')).toHaveValue(createdDesc);
    await page.fill('#description', editedDesc);
    await page.click('#save');

    await page.waitForURL(/investment-launches\.html\?updated=1$/, { timeout: 10000 });
    await expect(page.locator('#launch-body')).toContainText(editedDesc);
    await expect(page.locator('#launch-body')).not.toContainText(createdDesc);

    const editedRow = page.locator('#launch-body tr', { hasText: editedDesc });
    page.once('dialog', (dialog) => dialog.accept());
    await editedRow.locator('[data-delete]').click();

    await page.waitForURL(/investment-launches\.html\?deleted=1$/);
    await expect(page.locator('#launch-body')).not.toContainText(editedDesc);
  });
});
