const { test, expect } = require('@playwright/test');
const { testName, openDbPage, getWorkspaceId, insertRow, deleteRow } = require('./helpers/db');

// Regressao para o achado de Fase 3 do diagnostico de seguranca: uma
// transferencia entre contas da MESMA moeda com valores de saida/entrada
// divergentes era aceita por uma chamada direta a API, sem nenhuma
// validacao no servidor (so existia em transfer-new.js). A correcao e um
// CHECK constraint em finances.transfers (migration
// 20260913120000_transfers_same_currency_amount_match.sql) — este teste
// tenta o mesmo bypass direto e exige que o banco rejeite.
test.describe('Segurança — integridade de transferências (regressão)', () => {
  let workspaceId;
  let accountAId;
  let accountBId;

  test.beforeAll(async ({ browser }, testInfo) => {
    const page = await openDbPage(browser, testInfo);
    workspaceId = await getWorkspaceId(page);
    const accountA = await insertRow(page, 'accounts', {
      workspace_id: workspaceId,
      name: testName('ContaOrigemInt'),
      account_type: 'corrente',
      currency: 'BRL',
      opening_balance: 1000,
    });
    const accountB = await insertRow(page, 'accounts', {
      workspace_id: workspaceId,
      name: testName('ContaDestinoInt'),
      account_type: 'corrente',
      currency: 'BRL',
      opening_balance: 0,
    });
    accountAId = accountA.id;
    accountBId = accountB.id;
    await page.close();
  });

  test.afterAll(async ({ browser }, testInfo) => {
    const page = await openDbPage(browser, testInfo);
    await deleteRow(page, 'accounts', accountAId);
    await deleteRow(page, 'accounts', accountBId);
    await page.close();
  });

  test('valores divergentes em mesma moeda são rejeitados diretamente pelo banco', async ({ page }) => {
    await page.goto('/accounts.html');
    const today = new Date().toISOString().slice(0, 10);

    const result = await page.evaluate(
      async ({ workspaceId, accountAId, accountBId, today }) => {
        const client = window.KORbuildAuth.client.schema('finances');
        const { data, error } = await client
          .from('transfers')
          .insert({
            workspace_id: workspaceId,
            source_account_id: accountAId,
            destination_account_id: accountBId,
            source_amount: 100,
            destination_amount: 999999,
            source_currency: 'BRL',
            destination_currency: 'BRL',
            fx_rate: null,
            transfer_date: today,
            description: 'TESTE_E2E_SEC_TransferBypass',
          })
          .select('id');
        return { rejected: !!error, error: error ? error.message : null, insertedId: data ? data[0]?.id : null };
      },
      { workspaceId, accountAId, accountBId, today }
    );

    // cleanup de seguranca caso o constraint nao esteja ativo e o insert passe
    if (result.insertedId) {
      await page.evaluate(async (id) => {
        const client = window.KORbuildAuth.client.schema('finances');
        await client.from('transfers').delete().eq('id', id);
      }, result.insertedId);
    }

    expect(
      result.rejected,
      'Esperado que o banco rejeite valores divergentes em mesma moeda (aplique a migration ' +
        '20260913120000_transfers_same_currency_amount_match.sql se este teste falhar).'
    ).toBe(true);
    expect(result.error).toMatch(/transfers_same_currency_amounts_match|check constraint/i);
  });

  test('valores diferentes seguem aceitos quando as moedas são diferentes', async ({ page }) => {
    await page.goto('/accounts.html');
    const today = new Date().toISOString().slice(0, 10);

    const eurAccount = await insertRow(page, 'accounts', {
      workspace_id: workspaceId,
      name: testName('ContaEurInt'),
      account_type: 'corrente',
      currency: 'EUR',
      opening_balance: 0,
    });

    const result = await page.evaluate(
      async ({ workspaceId, accountAId, eurAccountId, today }) => {
        const client = window.KORbuildAuth.client.schema('finances');
        const { data, error } = await client
          .from('transfers')
          .insert({
            workspace_id: workspaceId,
            source_account_id: accountAId,
            destination_account_id: eurAccountId,
            source_amount: 100,
            destination_amount: 18.5, // valores diferentes de proposito: moedas diferentes, cambio legitimo
            source_currency: 'BRL',
            destination_currency: 'EUR',
            fx_rate: 0.185,
            transfer_date: today,
            description: 'TESTE_E2E_SEC_TransferFxOk',
          })
          .select('id');
        return { succeeded: !error, error: error ? error.message : null, insertedId: data ? data[0]?.id : null };
      },
      { workspaceId, accountAId, eurAccountId: eurAccount.id, today }
    );

    expect(result.succeeded, `Não deveria bloquear câmbio legítimo entre moedas diferentes: ${result.error}`).toBe(true);

    if (result.insertedId) await deleteRow(page, 'transfers', result.insertedId);
    await deleteRow(page, 'accounts', eurAccount.id);
  });
});
