const { test, expect } = require('@playwright/test');

// index.html contem o formulario de login real (login.html apenas redireciona para ele).
test.describe('Login', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test.beforeEach(async ({ page }) => {
    await page.goto('/index.html');
  });

  test('exibe mensagem de erro ao tentar logar com credenciais invalidas', async ({ page }) => {
    await page.fill('#email', 'usuario-inexistente@korbuild.dev');
    await page.fill('#password', 'senha-incorreta-123');
    await page.click('#login-submit');

    const message = page.locator('#login-message');
    await expect(message).not.toBeEmpty({ timeout: 10000 });
    await expect(message).toHaveClass(/error/);

    // Login falhou: continua na tela de acesso, botao reabilitado.
    await expect(page).toHaveURL(/index\.html$/);
    await expect(page.locator('#login-submit')).toBeEnabled();
    await expect(page.locator('#login-submit')).toHaveText('Entrar →');
  });

  test('realiza login com sucesso e redireciona para o espaco financeiro', async ({ page }) => {
    const email = process.env.E2E_TEST_EMAIL;
    const password = process.env.E2E_TEST_PASSWORD;
    test.skip(
      !email || !password,
      'Defina E2E_TEST_EMAIL e E2E_TEST_PASSWORD (arquivo .env) com um usuario de teste real do Supabase para rodar este teste.'
    );

    await page.fill('#email', email);
    await page.fill('#password', password);
    await page.click('#login-submit');

    // resolvePostLoginRoute() manda para dashboard (setup concluido) ou workspace (onboarding pendente).
    await page.waitForURL(/(dashboard|workspace)\.html$/, { timeout: 15000 });
    await expect(page).toHaveURL(/(dashboard|workspace)\.html$/);
  });
});
