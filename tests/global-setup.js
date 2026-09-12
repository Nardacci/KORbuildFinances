require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { chromium } = require('@playwright/test');

module.exports = async (config) => {
  const email = process.env.E2E_TEST_EMAIL;
  const password = process.env.E2E_TEST_PASSWORD;
  const authFile = path.join(__dirname, '.auth', 'user.json');
  fs.mkdirSync(path.dirname(authFile), { recursive: true });

  if (!email || !password) {
    console.warn('[global-setup] E2E_TEST_EMAIL/E2E_TEST_PASSWORD nao definidos — pulando login global.');
    fs.writeFileSync(authFile, JSON.stringify({ cookies: [], origins: [] }));
    return;
  }

  const baseURL = config.projects[0].use.baseURL;
  const browser = await chromium.launch();
  const context = await browser.newContext({ baseURL });
  const page = await context.newPage();
  await page.goto('/index.html');
  await page.fill('#email', email);
  await page.fill('#password', password);
  await page.click('#login-submit');
  await page.waitForURL(/(dashboard|workspace)\.html$/, { timeout: 15000 });
  await context.storageState({ path: authFile });
  await browser.close();
};
