const { test, expect } = require('@playwright/test');
const { testName, openDbPage, getWorkspaceId, insertRow, deleteRow } = require('./helpers/db');
const { waitForWorkspaceReady, waitForSelectOptions } = require('./helpers/page');

test.describe('Receitas (CRUD)', () => {
  let workspaceId;
  let accountId;
  const accountName = testName('ContaReceita');

  test.beforeAll(async ({ browser }, testInfo) => {
    const page = await openDbPage(browser, testInfo);
    workspaceId = await getWorkspaceId(page);
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
    await deleteRow(page, 'accounts', accountId);
    await page.close();
  });

  test('cria, edita, exclui e reflete na listagem', async ({ page }) => {
    const createdDesc = testName('Receita');
    const editedDesc = testName('Receita_Editada');

    await page.goto('/income-new.html');
    await waitForSelectOptions(page, '#account');
    await page.fill('#description', createdDesc);
    await page.fill('#category', 'Trabalho');
    await page.fill('#amount', '1000');
    await page.selectOption('#account', accountId);
    await page.fill('#receipt-date', new Date().toISOString().slice(0, 10));
    await page.selectOption('#status', 'realized');
    await page.click('#save-income');

    await page.waitForURL(/incomes\.html\?created=1$/);
    await expect(page.locator('#income-list')).toContainText(createdDesc);

    const row = page.locator('#income-list tr', { hasText: createdDesc });
    await row.getByRole('link', { name: 'Editar' }).click();

    await page.waitForURL(/income-edit\.html\?id=/);
    await waitForWorkspaceReady(page);
    await expect(page.locator('#description')).toHaveValue(createdDesc);
    await page.fill('#description', editedDesc);
    await page.click('#save-income');

    await page.waitForURL(/incomes\.html\?updated=1$/);
    await expect(page.locator('#income-list')).toContainText(editedDesc);
    await expect(page.locator('#income-list')).not.toContainText(createdDesc);

    const editedRow = page.locator('#income-list tr', { hasText: editedDesc });
    await editedRow.getByRole('link', { name: 'Editar' }).click();
    await page.waitForURL(/income-edit\.html\?id=/);
    await waitForWorkspaceReady(page);
    page.once('dialog', (dialog) => dialog.accept());
    await page.click('#delete-income');

    await page.waitForURL(/incomes\.html\?deleted=1$/);
    await expect(page.locator('#income-list')).not.toContainText(editedDesc);
  });
});
