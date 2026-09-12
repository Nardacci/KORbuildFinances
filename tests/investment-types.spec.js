const { test, expect } = require('@playwright/test');
const { testName } = require('./helpers/db');
const { waitForWorkspaceReady } = require('./helpers/page');

// Tipos de investimento nao possuem edicao/exclusao na UI (confirmado no
// mapeamento do sistema): cobrimos criar + refletir na listagem, e limpamos
// o dado de teste diretamente via schema (mesmo client autenticado do app).
test.describe('Tipos de Investimento (Create/List)', () => {
  test('cria um tipo e reflete na listagem', async ({ page }) => {
    const name = testName('Tipo');

    await page.goto('/investment-type-new.html');
    await waitForWorkspaceReady(page);
    await page.fill('#type-name', name);
    await page.fill('#type-description', 'Descricao de teste E2E');
    await page.selectOption('#position-method', 'units_price');
    await page.check('#quantity-enabled');
    await page.check('#market-price-enabled');
    await page.click('#save');

    await page.waitForURL(/investment-types\.html\?created=1$/);
    await expect(page.locator('#types-body')).toContainText(name);

    await page.evaluate(async (typeName) => {
      const client = window.KORbuildAuth.client.schema('finances');
      await client.from('investment_types').delete().eq('name', typeName);
    }, name);

    await page.reload();
    await expect(page.locator('#types-body')).not.toContainText(name);
  });
});
