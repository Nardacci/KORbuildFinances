const { test, expect } = require('@playwright/test');
const { testName, openDbPage, getWorkspaceId, insertRow, deleteRow } = require('./helpers/db');
const { waitForSelectOptions } = require('./helpers/page');

test.describe('Investimentos (CRUD)', () => {
  let workspaceId;
  let typeId;
  const typeName = testName('TipoInvestimento');

  test.beforeAll(async ({ browser }, testInfo) => {
    const page = await openDbPage(browser, testInfo);
    workspaceId = await getWorkspaceId(page);
    const type = await insertRow(page, 'investment_types', {
      workspace_id: workspaceId,
      name: typeName,
      description: null,
      is_system: false,
      parameters: {
        position_method: 'units_price',
        quantity_enabled: true,
        market_price_enabled: true,
        income_enabled: false,
        maturity_enabled: false,
      },
    });
    typeId = type.id;
    await page.close();
  });

  test.afterAll(async ({ browser }, testInfo) => {
    const page = await openDbPage(browser, testInfo);
    await deleteRow(page, 'investment_types', typeId);
    await page.close();
  });

  test('cria, edita, exclui e reflete na listagem', async ({ page }) => {
    const createdName = testName('Investimento');
    const editedName = testName('Investimento_Editado');

    await page.goto('/investment-new.html');
    await waitForSelectOptions(page, '#investment-type');
    await page.selectOption('#investment-type', typeId);
    await page.fill('#investment-name', createdName);
    await page.selectOption('#investment-currency', { label: 'BRL — Real brasileiro' });
    await page.click('#save-investment');

    await page.waitForURL(/investments\.html\?created=1$/);
    await expect(page.locator('#investment-body')).toContainText(createdName);

    const row = page.locator('#investment-body tr', { hasText: createdName });
    await row.getByRole('link', { name: 'Editar' }).click();

    await page.waitForURL(/investment-edit\.html\?id=/);
    await expect(page.locator('#name')).toHaveValue(createdName);
    await page.fill('#name', editedName);
    await page.click('#save');

    await page.waitForURL(/investment-detail\.html\?id=.*updated=1/);
    await page.goto('/investments.html');
    await expect(page.locator('#investment-body')).toContainText(editedName);
    await expect(page.locator('#investment-body')).not.toContainText(createdName);

    const editedRow = page.locator('#investment-body tr', { hasText: editedName });
    page.once('dialog', (dialog) => dialog.accept());
    await editedRow.locator('[data-delete-id]').click();

    await expect(page.locator('#investment-body')).not.toContainText(editedName, { timeout: 10000 });
  });
});
