const { test, expect } = require('@playwright/test');
const { testName, openDbPage, getWorkspaceId, insertRow, deleteRow } = require('./helpers/db');
const { waitForSelectOptions } = require('./helpers/page');

// expense_categories nao possui tela de criacao no app (confirmado no
// mapeamento do sistema) — a categoria de dependencia e criada/removida
// diretamente via schema autenticado, igual a conta de dependencia.
test.describe('Despesas (CRUD)', () => {
  let workspaceId;
  let categoryId;
  const categoryName = testName('Categoria');

  test.beforeAll(async ({ browser }, testInfo) => {
    const page = await openDbPage(browser, testInfo);
    workspaceId = await getWorkspaceId(page);
    const category = await insertRow(page, 'expense_categories', {
      workspace_id: workspaceId,
      name: categoryName,
    });
    categoryId = category.id;
    await page.close();
  });

  test.afterAll(async ({ browser }, testInfo) => {
    const page = await openDbPage(browser, testInfo);
    await deleteRow(page, 'expense_categories', categoryId);
    await page.close();
  });

  test('cria, edita, exclui e reflete na listagem', async ({ page }) => {
    const createdDesc = testName('Despesa');
    const editedDesc = testName('Despesa_Editada');

    await page.goto('/expense-new.html');
    await waitForSelectOptions(page, '#category');
    await page.fill('#description', createdDesc);
    await page.fill('#amount', '150');
    await page.selectOption('#category', categoryId);
    await page.fill('#date', new Date().toISOString().slice(0, 10));
    await page.selectOption('#status', 'realized');
    await page.click('.primary-action');

    await page.waitForURL(/expenses\.html\?created=1$/);
    await expect(page.locator('#expense-list')).toContainText(createdDesc);

    const row = page.locator('.expense-row', { hasText: createdDesc });
    await row.getByRole('link', { name: 'Editar' }).click();

    await page.waitForURL(/expense-edit\.html\?id=/);
    await waitForSelectOptions(page, '#category');
    await expect(page.locator('#description')).toHaveValue(createdDesc);
    await page.fill('#description', editedDesc);
    await page.click('.primary-action');

    await page.waitForURL(/expenses\.html$/);
    await expect(page.locator('#expense-list')).toContainText(editedDesc);
    await expect(page.locator('#expense-list')).not.toContainText(createdDesc);

    const editedRow = page.locator('.expense-row', { hasText: editedDesc });
    page.once('dialog', (dialog) => dialog.accept());
    await editedRow.locator('[data-delete]').click();

    await expect(page.locator('#expense-list')).not.toContainText(editedDesc, { timeout: 10000 });
  });
});
