const { test, expect } = require('@playwright/test');

// Cobre o fluxo completo de onboarding (workspace.html sem ?mode=review),
// as 5 etapas + finalizacao. Como a conta de teste ja tem o setup concluido
// (usada tambem pelos specs de revisao), as chamadas que tocariam dados reais
// sao interceptadas e respondidas com fixtures locais:
//   - GET user_workspaces -> forca setup_completed:false para liberar o wizard
//   - upsert setup_drafts (autosave) -> respondido sem gravar nada
//   - rpc complete_setup -> respondido com sucesso mockado, sem criar linhas reais
// Nenhuma escrita real chega ao Supabase neste spec.
const MOCK_WORKSPACE_ID = '00000000-0000-0000-0000-000000000001';

test.describe('Wizard — fluxo completo de onboarding', () => {
  test('percorre as 5 etapas, valida os botões do rodapé e finaliza', async ({ page }) => {
    let completeCalled = false;

    await page.route('**/rest/v1/user_workspaces*', async (route) => {
      if (route.request().method() !== 'GET') { await route.continue(); return; }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ id: MOCK_WORKSPACE_ID, setup_completed: false, display_name: '', country: '', primary_currency: '' }),
      });
    });

    await page.route('**/rest/v1/setup_drafts*', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({ status: 200, contentType: 'application/json', body: 'null' });
        return;
      }
      await route.fulfill({ status: 201, contentType: 'application/json', body: '[]' });
    });

    await page.route('**/rest/v1/rpc/complete_setup', async (route) => {
      completeCalled = true;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ workspace_id: MOCK_WORKSPACE_ID, goal_id: '00000000-0000-0000-0000-000000000002', already_complete: false }),
      });
    });

    page.on('dialog', (dialog) => dialog.accept());

    await page.goto('/workspace.html');

    // ---- Etapa 1 · Você ----
    await expect(page.locator('.step[data-step="1"]')).toHaveClass(/step-active/);
    await expect(page.locator('.step[data-step="1"] .eyebrow')).toHaveText('ETAPA 1 · VOCÊ');
    await expect(page.locator('.wizard-step[data-step-link="1"]')).toHaveClass(/active/);
    await expect(page.locator('#backBtn')).toBeDisabled();
    await expect(page.locator('#saveBtn')).toBeDisabled();
    await expect(page.locator('#confirmBtn')).toBeDisabled();
    await expect(page.locator('#confirmBtn')).toHaveText('Começar minha jornada →');

    // clicar num item da barra horizontal nao deve navegar (so indicador visual)
    await page.click('.wizard-step[data-step-link="4"]');
    await expect(page.locator('.step[data-step="1"]')).toHaveClass(/step-active/);

    await page.fill('#wName', 'Onboarding QA');
    await page.selectOption('#wCountry', { label: 'Portugal' });
    await page.selectOption('#wCurrency', { label: 'EUR — Euro' });
    await expect(page.locator('#saveBtn')).toBeEnabled();
    await page.click('#saveBtn');

    // ---- Etapa 2 · Sua primeira conta ----
    await expect(page.locator('.step[data-step="2"]')).toHaveClass(/step-active/);
    await expect(page.locator('.step[data-step="2"] .eyebrow')).toHaveText('ETAPA 2 · SUA PRIMEIRA CONTA');
    await expect(page.locator('.wizard-step[data-step-link="1"]')).toHaveClass(/done/);
    await expect(page.locator('.wizard-step[data-step-link="2"]')).toHaveClass(/active/);
    await expect(page.locator('.wizard-step[data-step-link="3"]')).not.toHaveClass(/done|active/);
    await expect(page.locator('#backBtn')).toBeEnabled();
    await expect(page.locator('#saveBtn')).toBeDisabled();

    await page.fill('#wAccount', 'Conta QA');
    await page.selectOption('#wAccountType', { label: 'Conta corrente' });
    await page.selectOption('#wAccountCurrency', { label: 'EUR' });
    await page.fill('#wBalance', '1000');
    await expect(page.locator('#saveBtn')).toBeEnabled();
    await page.click('#saveBtn');

    // ---- Etapa 3 · Sua primeira receita ----
    await expect(page.locator('.step[data-step="3"]')).toHaveClass(/step-active/);
    await expect(page.locator('.step[data-step="3"] .eyebrow')).toHaveText('ETAPA 3 · SUA PRIMEIRA RECEITA');
    await expect(page.locator('#saveBtn')).toBeDisabled();
    await page.fill('#wIncomeDesc', 'Salário QA');
    await page.selectOption('#wIncomeCategory', { label: 'Salário' });
    await page.fill('#wIncome', '3000');
    await page.selectOption('#wFrequency', { label: 'Mensal' });
    await expect(page.locator('#saveBtn')).toBeEnabled();
    await page.click('#saveBtn');

    // ---- Etapa 4 · Seu objetivo ----
    await expect(page.locator('.step[data-step="4"]')).toHaveClass(/step-active/);
    await expect(page.locator('.step[data-step="4"] .eyebrow')).toHaveText('ETAPA 4 · SEU OBJETIVO');
    await expect(page.locator('#saveBtn')).toBeDisabled();
    await page.fill('#wGoalName', 'Objetivo QA');
    await page.fill('#wGoalTarget', '100000');
    await page.fill('#wGoalYears', '5');
    await page.fill('#wStartDate', '2026-01-01');
    await expect(page.locator('#saveBtn')).toBeEnabled();
    await page.click('#saveBtn');

    // ---- Etapa 5 · Seu primeiro plano ----
    await expect(page.locator('.step[data-step="5"]')).toHaveClass(/step-active/);
    await expect(page.locator('#step5-onboarding')).not.toHaveClass(/hidden/);
    await expect(page.locator('#step5-onboarding .eyebrow')).toHaveText('ETAPA 5 · SEU PRIMEIRO PLANO');
    await expect(page.locator('.wizard-step[data-step-link="4"]')).toHaveClass(/done/);
    await expect(page.locator('.wizard-step[data-step-link="5"]')).toHaveClass(/active/);
    await expect(page.locator('#summaryGoal')).toHaveText('Objetivo QA');
    await expect(page.locator('#saveBtn')).toBeDisabled();
    await expect(page.locator('#confirmBtn')).toBeEnabled();
    await expect(page.locator('#confirmBtn')).toHaveText('Começar minha jornada →');

    // ---- Voltar funciona e preserva o que já foi preenchido ----
    await page.click('#backBtn');
    await expect(page.locator('.step[data-step="4"]')).toHaveClass(/step-active/);
    await expect(page.locator('#wGoalName')).toHaveValue('Objetivo QA');
    await page.click('#saveBtn');
    await expect(page.locator('.step[data-step="5"]')).toHaveClass(/step-active/);

    // ---- Finalizar (mockado — nao grava nada real) ----
    await page.click('#confirmBtn');
    await page.waitForURL(/dashboard\.html$/, { timeout: 10000 });

    expect(completeCalled).toBe(true);
  });
});
