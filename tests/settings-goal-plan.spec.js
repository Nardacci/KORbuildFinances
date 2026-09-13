const { test, expect } = require('@playwright/test');
const { testName, openDbPage, getWorkspaceId } = require('./helpers/db');
const { waitForWorkspaceReady } = require('./helpers/page');

// goals/plans sao registros UNICOS por workspace (criados uma unica vez pelo
// RPC de onboarding) — nao ha como criar/excluir um descartavel como nas
// outras areas. Este spec captura os valores originais antes de cada teste
// e restaura ao final, para nao deixar o workspace de teste alterado.
test.describe('Configurações — objetivo e plano', () => {
  // goal/plan sao um unico registro por workspace: os dois testes escrevem
  // na mesma linha, entao precisam rodar em serie para nao correr.
  test.describe.configure({ mode: 'serial' });

  let workspaceId;
  let original;

  test.beforeAll(async ({ browser }, testInfo) => {
    const page = await openDbPage(browser, testInfo);
    workspaceId = await getWorkspaceId(page);
    original = await page.evaluate(async (workspaceId) => {
      const client = window.KORbuildAuth.client.schema('finances');
      const { data: ws } = await client.from('user_workspaces').select('display_name,country,primary_currency').eq('id', workspaceId).maybeSingle();
      const { data: goal } = await client.from('goals').select('id,name,target_amount,target_years,start_date').eq('workspace_id', workspaceId).order('created_at', { ascending: false }).limit(1).maybeSingle();
      const { data: plan } = await client.from('plans').select('id,projected_monthly_contribution').eq('workspace_id', workspaceId).order('created_at', { ascending: false }).limit(1).maybeSingle();
      return { workspace: ws, goal, plan };
    }, workspaceId);
    await page.close();
  });

  test.afterEach(async ({ browser }, testInfo) => {
    // restaura goals/plans ao estado original apos CADA teste, para o segundo
    // teste nao herdar as mudancas do primeiro (user_workspaces nao e tocado
    // pelos testes deste arquivo, entao nao precisa ser restaurado).
    const page = await openDbPage(browser, testInfo);
    await page.evaluate(async (o) => {
      const client = window.KORbuildAuth.client.schema('finances');
      if (o.goal) await client.from('goals').update({ name: o.goal.name, target_amount: o.goal.target_amount, target_years: o.goal.target_years, start_date: o.goal.start_date }).eq('id', o.goal.id);
      if (o.plan) await client.from('plans').update({ projected_monthly_contribution: o.plan.projected_monthly_contribution }).eq('id', o.plan.id);
    }, original);
    await page.close();
  });

  test('edita objetivo e plano junto com os demais campos, em um único salvar', async ({ page }) => {
    const newGoalName = testName('Objetivo');

    await page.goto('/settings.html');
    await waitForWorkspaceReady(page);
    await expect(page.locator('#goalName')).not.toHaveValue('');

    await page.fill('#goalName', newGoalName);
    await page.fill('#goalTarget', '500000');
    await page.fill('#goalYears', '20');
    await page.fill('#goalStartDate', '2026-01-01');
    await page.fill('#planContribution', '1');
    await page.click('#save');

    await expect(page.locator('#message')).toHaveText('Alterações salvas com sucesso.');

    await page.reload();
    await waitForWorkspaceReady(page);
    await expect(page.locator('#goalName')).toHaveValue(newGoalName);
    await expect(page.locator('#goalTarget')).toHaveValue('500000');
    await expect(page.locator('#goalYears')).toHaveValue('20');
    await expect(page.locator('#goalStartDate')).toHaveValue('2026-01-01');
    await expect(page.locator('#planContribution')).toHaveValue('1');

    // confirma que ficou persistido no banco, nao so na tela
    const persisted = await page.evaluate(async (id) => {
      const client = window.KORbuildAuth.client.schema('finances');
      const { data } = await client.from('goals').select('name,target_amount,target_years,start_date').eq('id', id).maybeSingle();
      return data;
    }, original.goal.id);
    expect(persisted.name).toBe(newGoalName);
    expect(Number(persisted.target_amount)).toBe(500000);
    expect(persisted.target_years).toBe(20);
  });

  test('aviso aparece quando o aporte ultrapassa a receita, e some quando ajustado', async ({ page }) => {
    await page.goto('/settings.html');
    await waitForWorkspaceReady(page);
    await expect(page.locator('#planContribution')).not.toHaveValue('');

    // valor extremo, muito acima de qualquer receita real cadastrada no workspace de teste
    await page.fill('#planContribution', '999999999');
    await expect(page.locator('#contributionWarning')).not.toHaveClass(/hidden/);
    await expect(page.locator('#contributionWarning')).toContainText('ultrapassa sua receita mensal');

    // valor bem baixo, deve ficar abaixo de 75% de qualquer receita real
    await page.fill('#planContribution', '1');
    await expect(page.locator('#contributionWarning')).toHaveClass(/hidden/);
  });
});
