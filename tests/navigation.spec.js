const { test, expect } = require('@playwright/test');

// Varre a navegacao principal (sidebar padronizada, renderizada em runtime por
// auth.js/standardizeSidebar) e os pontos que hoje apontam para settings.html
// (que por sua vez redireciona para workspace.html?mode=review), confirmando
// que cada link carrega a pagina certa sem 404 e sem erro de console.
const SIDEBAR_ITEMS = [
  { label: 'Dashboard', selector: '.nav-item[href="dashboard.html"]', file: 'dashboard.html' },
  { label: 'Planejamento', selector: '.nav-item[href="planning.html"]', file: 'planning.html' },
  { label: 'Investimentos', selector: '.nav-item[href="investments.html"]', file: 'investments.html' },
  { label: 'Despesas', selector: '.nav-item[href="expenses.html"]', file: 'expenses.html' },
  { label: 'Receitas', selector: '.nav-item[href="incomes.html"]', file: 'incomes.html' },
  { label: 'Contas › Cadastro de contas', selector: '.nav-subitem[href="accounts.html"]', file: 'accounts.html' },
  { label: 'Contas › Transferências', selector: '.nav-subitem[href="transfers.html"]', file: 'transfers.html' },
  { label: 'Contas › Transações', selector: '.nav-subitem[href="dashboard-movements.html"]', file: 'dashboard-movements.html' },
  { label: 'Configurações', selector: '.nav-item[href="cadastros.html"]', file: 'cadastros.html' },
];

test.describe('Navegação — menu principal', () => {
  test('cada item da sidebar carrega a página correta, sem 404 e sem erro de console', async ({ page }) => {
    const consoleErrors = [];
    page.on('pageerror', (err) => consoleErrors.push(err.message));
    page.on('console', (msg) => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });

    await page.goto('/dashboard.html');
    await expect(page.locator('.sidebar .nav-item').first()).toBeVisible();

    for (const item of SIDEBAR_ITEMS) {
      const [response] = await Promise.all([
        page.waitForNavigation({ waitUntil: 'load' }),
        page.click(item.selector),
      ]);
      expect(response, `sem navegação ao clicar em "${item.label}"`).not.toBeNull();
      expect(response.status(), `status inesperado para "${item.label}" (${item.file})`).toBe(200);
      expect(page.url(), `URL inesperada após clicar em "${item.label}"`).toContain(item.file);
      await expect(page.locator('.sidebar .nav-item').first(), `sidebar não renderizou em ${item.file}`).toBeVisible();
    }

    expect(consoleErrors, `erros de console encontrados durante a navegação:\n${consoleErrors.join('\n')}`).toEqual([]);
  });

  test('accounts.html não tem link morto para settings.html na sidebar', async ({ page }) => {
    // accounts.html tinha, no HTML fonte, um link estático "Configuração financeira" -> settings.html
    // dentro de <aside class="sidebar">. Como auth.js reescreve o innerHTML de TODO elemento .sidebar
    // no load, esse link nunca chegava a aparecer para o usuário real — foi removido do fonte.
    await page.goto('/accounts.html');
    const staleLink = page.locator('a[href="settings.html"]');
    await expect(staleLink).toHaveCount(0);
    await expect(page.locator('.sidebar .nav-item[href="cadastros.html"]')).toBeVisible();
  });
});

test.describe('Navegação — pontos que levam a settings.html (redirect para revisão)', () => {
  test('settings.html sempre redireciona para workspace.html?mode=review', async ({ page }) => {
    const response = await page.goto('/settings.html');
    expect(response.status()).toBe(200);
    await page.waitForURL(/workspace\.html\?mode=review$/, { timeout: 10000 });
    await expect(page.locator('#rvName')).not.toHaveText('—', { timeout: 15000 });
  });

  test('menu mobile "Perfil" (dashboard.html) leva a settings.html e cai na revisão', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/dashboard.html');
    await expect(page.locator('.mobile-nav-item[href="settings.html"]')).toBeVisible();
    await page.click('.mobile-nav-item[href="settings.html"]');
    await page.waitForURL(/workspace\.html\?mode=review$/, { timeout: 10000 });
  });

  test('menu mobile "Perfil" (investments.html) leva a settings.html e cai na revisão', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/investments.html');
    await expect(page.locator('.mobile-nav-item[href="settings.html"]')).toBeVisible();
    await page.click('.mobile-nav-item[href="settings.html"]');
    await page.waitForURL(/workspace\.html\?mode=review$/, { timeout: 10000 });
  });

  test('menu mobile "Perfil" (investment-detail.html) leva a settings.html e cai na revisão', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    // sem investimento cadastrado no momento do teste; a pagina de detalhe so
    // depende do id para os dados, o cabecalho/mobile-nav renderiza igual.
    await page.goto('/investment-detail.html?id=00000000-0000-0000-0000-000000000000');
    await expect(page.locator('.mobile-nav-item[href="settings.html"]')).toBeVisible({ timeout: 10000 });
    await page.click('.mobile-nav-item[href="settings.html"]');
    await page.waitForURL(/workspace\.html\?mode=review$/, { timeout: 10000 });
  });

  test('planning.html: link "Configurar planejamento" aponta para settings.html (visível apenas sem plano configurado)', async ({ page }) => {
    await page.goto('/planning.html');
    // esta conta de teste ja tem objetivo/plano configurados, entao o estado
    // "sem plano" nao aparece na UI — validamos o href estatico mesmo assim.
    const link = page.locator('#no-plan a.primary-link');
    await expect(link).toHaveAttribute('href', 'settings.html');
  });
});
