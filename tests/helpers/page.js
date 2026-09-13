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

// planning.html so revela #plan-content (removendo a classe "hidden") depois
// que a meta/plano e todos os agregados de 12 meses terminam de carregar —
// nenhum outro await acontece depois disso, entao e um sinal de prontidao
// confiavel para ler #real-capacity/#real-investment.
async function waitForPlanReady(page) {
  await expect(page.locator('#plan-content')).not.toHaveClass(/hidden/, { timeout: 15000 });
}

// dashboard-movements.html so atualiza #page-title depois que o refresh() do
// mes selecionado termina — esperar a mudanca de titulo evita ler os totais
// antigos (do mes anterior) logo apos trocar o filtro.
async function waitForMonthRefresh(page, previousTitle) {
  await expect(page.locator('#page-title')).not.toHaveText(previousTitle, { timeout: 15000 });
}

module.exports = { waitForWorkspaceReady, waitForSelectOptions, waitForPlanReady, waitForMonthRefresh };
