const { expect } = require('@playwright/test');

// Todas as paginas autenticadas carregam o workspace de forma assincrona e so
// preenchem #user-name (placeholder inicial "—") quando o init() termina.
// Sem esperar por isso, formularios podem ser submetidos com `workspace` ainda
// nulo no client-side, causando falhas de corrida (ex.: "Cannot read properties
// of null (reading 'id')").
async function waitForWorkspaceReady(page) {
  await expect(page.locator('#user-name')).not.toHaveText('—', { timeout: 15000 });
}

// Formularios com um <select id="account"> (receitas, despesas, transferencias,
// lancamentos) so populam as opcoes depois de um segundo await dentro do
// init(), posterior ao que atualiza #user-name — esperar so pelo header nao
// basta para evitar interagir com o dropdown ainda vazio.
async function waitForSelectOptions(page, selector, minCount = 2) {
  await expect
    .poll(async () => page.locator(`${selector} option`).count(), { timeout: 15000 })
    .toBeGreaterThanOrEqual(minCount);
}

module.exports = { waitForWorkspaceReady, waitForSelectOptions };
