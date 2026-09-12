const { test, expect } = require('@playwright/test');
const { testName, openDbPage, getWorkspaceId, insertRow, deleteRow } = require('./helpers/db');
const { waitForSelectOptions } = require('./helpers/page');

// Transferencias nao possuem botao de exclusao em nenhuma tela, e a pagina
// de edicao existe no codigo mas nao tem link a partir da listagem (rota
// "orfa", so acessivel via URL direta) — confirmado no mapeamento do sistema.
// Cobrimos criar + refletir na listagem + editar via URL direta; a limpeza
// (equivalente ao "excluir") e feita via schema direto, ja que a RLS permite
// DELETE mesmo sem botao na UI.
test.describe('Transferências (Create/Edit via URL/List, cleanup via schema)', () => {
  let workspaceId;
  let sourceAccountId;
  let destAccountId;
  const sourceName = testName('ContaOrigem');
  const destName = testName('ContaDestino');

  test.beforeAll(async ({ browser }, testInfo) => {
    const page = await openDbPage(browser, testInfo);
    workspaceId = await getWorkspaceId(page);
    const [source, dest] = await Promise.all([
      insertRow(page, 'accounts', {
        workspace_id: workspaceId,
        name: sourceName,
        account_type: 'corrente',
        currency: 'BRL',
        opening_balance: 1000,
      }),
      insertRow(page, 'accounts', {
        workspace_id: workspaceId,
        name: destName,
        account_type: 'corrente',
        currency: 'BRL',
        opening_balance: 0,
      }),
    ]);
    sourceAccountId = source.id;
    destAccountId = dest.id;
    await page.close();
  });

  test.afterAll(async ({ browser }, testInfo) => {
    const page = await openDbPage(browser, testInfo);
    await page.evaluate(
      async ({ workspaceId, sourceAccountId, destAccountId }) => {
        const client = window.KORbuildAuth.client.schema('finances');
        await client
          .from('transfers')
          .delete()
          .eq('workspace_id', workspaceId)
          .or(`source_account_id.eq.${sourceAccountId},source_account_id.eq.${destAccountId}`);
      },
      { workspaceId, sourceAccountId, destAccountId }
    );
    await deleteRow(page, 'accounts', sourceAccountId);
    await deleteRow(page, 'accounts', destAccountId);
    await page.close();
  });

  test('cria, reflete na listagem e edita via URL direta', async ({ page }) => {
    const createdDesc = testName('Transferencia');
    const editedDesc = testName('Transferencia_Editada');

    await page.goto('/transfer-new.html');
    await waitForSelectOptions(page, '#source');
    await page.selectOption('#source', sourceAccountId);
    await page.selectOption('#destination', destAccountId);
    await page.fill('#source-amount', '200');
    await page.fill('#destination-amount', '200');
    await page.fill('#date', new Date().toISOString().slice(0, 10));
    await page.fill('#description', createdDesc);
    await page.click('.primary-action');

    await page.waitForURL(/transfers\.html$/);
    await expect(page.locator('#transfer-list')).toContainText(createdDesc);
    await expect(page.locator('#transfer-list')).toContainText(`${sourceName} → ${destName}`);

    const transferId = await page.evaluate(
      async ({ workspaceId, createdDesc }) => {
        const client = window.KORbuildAuth.client.schema('finances');
        const { data } = await client
          .from('transfers')
          .select('id')
          .eq('workspace_id', workspaceId)
          .eq('description', createdDesc)
          .maybeSingle();
        return data.id;
      },
      { workspaceId, createdDesc }
    );

    await page.goto(`/transfer-edit.html?id=${transferId}`);
    await waitForSelectOptions(page, '#source');
    await expect(page.locator('#description')).toHaveValue(createdDesc);
    await page.fill('#description', editedDesc);
    await page.click('.primary-action');

    await page.waitForURL(/transfers\.html$/);
    await expect(page.locator('#transfer-list')).toContainText(editedDesc);
    await expect(page.locator('#transfer-list')).not.toContainText(createdDesc);
  });
});
