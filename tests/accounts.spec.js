const { test, expect } = require('@playwright/test');
const { testName } = require('./helpers/db');
const { waitForWorkspaceReady } = require('./helpers/page');

test.describe('Contas (CRUD)', () => {
  test('cria, edita, exclui e reflete na listagem', async ({ page }) => {
    const createdName = testName('Conta');
    const editedName = testName('Conta_Editada');

    await page.goto('/account-new.html');
    await waitForWorkspaceReady(page);
    await page.fill('#account-name', createdName);
    await page.selectOption('#account-type', 'corrente');
    await page.selectOption('#account-currency', 'BRL');
    await page.fill('#opening-balance', '123.45');
    await page.click('#save-account');

    await page.waitForURL(/accounts\.html\?created=1$/);
    await expect(page.locator('#accounts-body')).toContainText(createdName);

    const row = page.locator('#accounts-body tr', { hasText: createdName });
    await row.getByRole('link', { name: 'Editar' }).click();

    await page.waitForURL(/account-edit\.html\?id=/);
    await waitForWorkspaceReady(page);
    await expect(page.locator('#account-name')).toHaveValue(createdName);
    await page.fill('#account-name', editedName);
    await page.click('#save-account');

    await page.waitForURL(/accounts\.html\?updated=1$/);
    await expect(page.locator('#accounts-body')).toContainText(editedName);
    await expect(page.locator('#accounts-body')).not.toContainText(createdName);

    const editedRow = page.locator('#accounts-body tr', { hasText: editedName });
    page.once('dialog', (dialog) => dialog.accept());
    await editedRow.getByRole('button', { name: 'Excluir' }).click();

    await expect(page.locator('#accounts-body')).not.toContainText(editedName, { timeout: 10000 });
  });
});
