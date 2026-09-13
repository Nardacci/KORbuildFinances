const { test, expect } = require('@playwright/test');
const { openDbPage, getWorkspaceId } = require('./helpers/db');
const { waitForWorkspaceReady } = require('./helpers/page');

// workspace.html nao tem #user-name (layout proprio do wizard) — a prontidao
// do modo revisao e sinalizada pelo card "Voce" deixando de mostrar o
// placeholder inicial "—".
async function waitForReviewReady(page) {
  await expect(page.locator('#rvName')).not.toHaveText('—', { timeout: 15000 });
}

// Cobre o modo "revisao" pos-onboarding do wizard (workspace.html?mode=review),
// alcancado a partir de settings.html. Como user_workspaces/accounts(primeira)/
// incomes(primeira)/goals/plans sao registros singulares ja existentes, este
// spec captura os valores originais e restaura ao final de cada teste — nunca
// cria/exclui linhas descartaveis como as outras areas.
test.describe('Wizard — modo revisão pós-onboarding', () => {
  test.describe.configure({ mode: 'serial' });

  let workspaceId;
  let original;

  test.beforeAll(async ({ browser }, testInfo) => {
    const page = await openDbPage(browser, testInfo);
    workspaceId = await getWorkspaceId(page);
    original = await page.evaluate(async (workspaceId) => {
      const client = window.KORbuildAuth.client.schema('finances');
      const { data: ws } = await client.from('user_workspaces').select('display_name,country,primary_currency').eq('id', workspaceId).maybeSingle();
      const { data: account } = await client.from('accounts').select('id,name,account_type,currency,opening_balance').eq('workspace_id', workspaceId).order('created_at', { ascending: true }).limit(1).maybeSingle();
      const { data: income } = await client.from('incomes').select('id,description,category,amount,currency,frequency,account_id,receipt_date,status').eq('workspace_id', workspaceId).order('created_at', { ascending: true }).limit(1).maybeSingle();
      const { data: goal } = await client.from('goals').select('id,name,target_amount,target_years,start_date,initial_wealth,include_initial_wealth').eq('workspace_id', workspaceId).order('created_at', { ascending: false }).limit(1).maybeSingle();
      const { data: plan } = await client.from('plans').select('id,projected_monthly_contribution').eq('workspace_id', workspaceId).order('created_at', { ascending: false }).limit(1).maybeSingle();
      return { workspace: ws, account, income, goal, plan };
    }, workspaceId);
    await page.close();
  });

  test.afterEach(async ({ browser }, testInfo) => {
    const page = await openDbPage(browser, testInfo);
    await page.evaluate(async ({ o, workspaceId }) => {
      const client = window.KORbuildAuth.client.schema('finances');
      await client.from('user_workspaces').update(o.workspace).eq('id', workspaceId);
      await client.from('accounts').update({ name: o.account.name, account_type: o.account.account_type, currency: o.account.currency, opening_balance: o.account.opening_balance }).eq('id', o.account.id);
      await client.from('incomes').update({ description: o.income.description, category: o.income.category, amount: o.income.amount, currency: o.income.currency, frequency: o.income.frequency, account_id: o.income.account_id, receipt_date: o.income.receipt_date, status: o.income.status }).eq('id', o.income.id);
      await client.from('goals').update({ name: o.goal.name, target_amount: o.goal.target_amount, target_years: o.goal.target_years, start_date: o.goal.start_date, initial_wealth: o.goal.initial_wealth, include_initial_wealth: o.goal.include_initial_wealth }).eq('id', o.goal.id);
      await client.from('plans').update({ projected_monthly_contribution: o.plan.projected_monthly_contribution }).eq('id', o.plan.id);
    }, { o: original, workspaceId });
    await page.close();
  });

  test('settings.html redireciona para a tela de resumo do wizard', async ({ page }) => {
    await page.goto('/settings.html');
    await page.waitForURL(/workspace\.html\?mode=review$/);
  });

  test('tela de resumo mostra os 5 cards com dados reais', async ({ page }) => {
    await page.goto('/workspace.html?mode=review');
    await waitForReviewReady(page);
    await expect(page.locator('#rvName')).toHaveText(original.workspace.display_name);
    await expect(page.locator('#rvAccountName')).toHaveText(original.account.name);
    await expect(page.locator('#rvIncomeName')).toHaveText(original.income.description);
    await expect(page.locator('#rvGoalName')).toHaveText(original.goal.name);
    await expect(page.locator('#rvEditAccount')).toHaveAttribute('href', new RegExp(`account-edit\\.html\\?id=${original.account.id}&return=review`));
    await expect(page.locator('#rvEditIncome')).toHaveAttribute('href', new RegExp(`income-edit\\.html\\?id=${original.income.id}&return=review`));
  });

  test('editar "Você" (passo 1) salva direto e volta pro resumo', async ({ page }) => {
    const newName = original.workspace.display_name + ' (editado)';
    await page.goto('/workspace.html?mode=review');
    await waitForReviewReady(page);
    await page.click('#rvEditYou');
    await expect(page.locator('.step[data-step="1"]')).toHaveClass(/step-active/);
    await page.fill('#wName', newName);
    await page.click('#nextBtn');
    await expect(page.locator('.step[data-step="5"]')).toHaveClass(/step-active/);
    await expect(page.locator('#rvName')).toHaveText(newName);
    const persisted = await page.evaluate(async (id) => {
      const client = window.KORbuildAuth.client.schema('finances');
      const { data } = await client.from('user_workspaces').select('display_name').eq('id', id).maybeSingle();
      return data.display_name;
    }, workspaceId);
    expect(persisted).toBe(newName);
  });

  test('editar "Objetivo"/"Plano" (passo 4) salva os dois juntos e mostra o aviso quando o aporte ultrapassa a receita', async ({ page }) => {
    await page.goto('/workspace.html?mode=review');
    await waitForReviewReady(page);
    await page.click('#rvEditGoal');
    await expect(page.locator('.step[data-step="4"]')).toHaveClass(/step-active/);
    await expect(page.locator('#step4-review-plan')).not.toHaveClass(/hidden/);

    // aporte extremo: aviso deve aparecer antes mesmo de salvar
    await page.fill('#rPlanContribution', '999999999');
    await expect(page.locator('#rContributionWarning')).not.toHaveClass(/hidden/);
    await expect(page.locator('#rContributionWarning')).toContainText('ultrapassa sua receita mensal');

    const newGoalName = original.goal.name + ' (editado)';
    await page.fill('#wGoalName', newGoalName);
    await page.fill('#wGoalTarget', '500000');
    await page.fill('#wGoalYears', '20');
    await page.fill('#rPlanContribution', '1');
    await page.click('#nextBtn');

    await expect(page.locator('.step[data-step="5"]')).toHaveClass(/step-active/);
    await expect(page.locator('#rvGoalName')).toHaveText(newGoalName);
    await expect(page.locator('#rvPlanName')).toContainText('R$ 1/mês');
    await expect(page.locator('#reviewContributionWarning')).toHaveClass(/hidden/);

    const persisted = await page.evaluate(async ({ goalId, planId }) => {
      const client = window.KORbuildAuth.client.schema('finances');
      const { data: goal } = await client.from('goals').select('name,target_amount,target_years').eq('id', goalId).maybeSingle();
      const { data: plan } = await client.from('plans').select('projected_monthly_contribution').eq('id', planId).maybeSingle();
      return { goal, plan };
    }, { goalId: original.goal.id, planId: original.plan.id });
    expect(persisted.goal.name).toBe(newGoalName);
    expect(Number(persisted.goal.target_amount)).toBe(500000);
    expect(Number(persisted.plan.projected_monthly_contribution)).toBe(1);
  });

  test('"Voltar ao resumo" descarta edições não salvas', async ({ page }) => {
    await page.goto('/workspace.html?mode=review');
    await waitForReviewReady(page);
    await page.click('#rvEditYou');
    await page.fill('#wName', 'Não deveria salvar isso');
    await page.click('#backBtn');
    await expect(page.locator('.step[data-step="5"]')).toHaveClass(/step-active/);
    await expect(page.locator('#rvName')).toHaveText(original.workspace.display_name);
  });

  test('editar "Sua primeira conta" leva ao account-edit.html e volta pro resumo ao salvar', async ({ page }) => {
    await page.goto('/workspace.html?mode=review');
    await waitForReviewReady(page);
    await page.click('#rvEditAccount');
    await page.waitForURL(new RegExp(`account-edit\\.html\\?id=${original.account.id}&return=review`));
    await waitForWorkspaceReady(page);
    await expect(page.locator('#account-name')).not.toHaveValue('');
    const newAccountName = original.account.name + ' (editado)';
    await page.fill('#account-name', newAccountName);
    await page.click('#save-account');
    await page.waitForURL(/workspace\.html\?mode=review$/);
    await expect(page.locator('#rvAccountName')).toHaveText(newAccountName);
  });

  test('editar "Sua primeira receita" leva ao income-edit.html e volta pro resumo ao salvar', async ({ page }) => {
    await page.goto('/workspace.html?mode=review');
    await waitForReviewReady(page);
    await page.click('#rvEditIncome');
    await page.waitForURL(new RegExp(`income-edit\\.html\\?id=${original.income.id}&return=review`));
    await waitForWorkspaceReady(page);
    await expect(page.locator('#description')).not.toHaveValue('');
    const newIncomeDesc = original.income.description + ' (editado)';
    await page.fill('#description', newIncomeDesc);
    await page.click('#save-income');
    await page.waitForURL(/workspace\.html\?mode=review$/);
    await expect(page.locator('#rvIncomeName')).toHaveText(newIncomeDesc);
  });
});
