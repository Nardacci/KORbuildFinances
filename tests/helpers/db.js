// Helpers para operar diretamente no schema `finances` via o client Supabase
// ja autenticado no browser (window.KORbuildAuth.client), usado para
// setup/teardown de cenarios sem tela de CRUD (ex.: categorias de despesa)
// ou sem botao de exclusao na UI (ex.: transferencias).

const PREFIX = 'TESTE_E2E_';

function testName(label) {
  return `${PREFIX}${label}_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
}

// Abre uma pagina autenticada (necessaria para expor window.KORbuildAuth,
// carregado via <script> nas paginas do app) pronta para chamadas diretas
// de setup/teardown via schema. Usar em beforeAll/afterAll com o fixture `browser`.
async function openDbPage(browser, testInfo) {
  const baseURL = testInfo.project.use.baseURL;
  const page = await browser.newPage({ storageState: 'tests/.auth/user.json', baseURL });
  await page.goto('/accounts.html');
  return page;
}

async function getWorkspaceId(page) {
  return page.evaluate(async () => {
    const client = window.KORbuildAuth.client.schema('finances');
    const session = await window.KORbuildAuth.session();
    const { data, error } = await client
      .from('user_workspaces')
      .select('id')
      .eq('user_id', session.user.id)
      .maybeSingle();
    if (error) throw error;
    return data.id;
  });
}

// Insere uma linha diretamente via schema autenticado — usado para criar
// dados de dependencia (ex.: conta, categoria) sem depender da UI de outra
// area que ja tem sua propria cobertura de E2E.
async function insertRow(page, table, data) {
  return page.evaluate(
    async ({ table, data }) => {
      const client = window.KORbuildAuth.client.schema('finances');
      const { data: row, error } = await client.from(table).insert(data).select('*').single();
      if (error) throw error;
      return row;
    },
    { table, data }
  );
}

async function ensureExpenseCategory(page, workspaceId, name) {
  const row = await insertRow(page, 'expense_categories', { workspace_id: workspaceId, name });
  return row.id;
}

async function deleteRow(page, table, id) {
  return page.evaluate(
    async ({ table, id }) => {
      const client = window.KORbuildAuth.client.schema('finances');
      const { error } = await client.from(table).delete().eq('id', id);
      if (error) throw error;
    },
    { table, id }
  );
}

// Limpeza de seguranca: remove qualquer linha cujo campo de texto comece com o
// prefixo de teste, em caso de falha no meio de um teste que impeca o cleanup normal.
async function purgeTestData(page, table, textColumn) {
  return page.evaluate(
    async ({ table, textColumn }) => {
      const client = window.KORbuildAuth.client.schema('finances');
      await client.from(table).delete().like(textColumn, 'TESTE_E2E_%');
    },
    { table, textColumn }
  );
}

module.exports = {
  PREFIX,
  testName,
  openDbPage,
  getWorkspaceId,
  insertRow,
  ensureExpenseCategory,
  deleteRow,
  purgeTestData,
};
