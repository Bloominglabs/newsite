'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { execSync } = require('node:child_process');

/**
 * GitHub only creates the hidden `repo.wiki.git` backend after a logged-in user
 * saves the first wiki page in the browser. API tokens and CI tokens cannot do
 * that bootstrap step. This script uses a visible browser window so an already
 * logged-in GitHub session can create the Home page, after which the publish
 * workflow can sync the full wiki export.
 */
async function main() {
  let chromium;
  try {
    ({ chromium } = require('playwright'));
  } catch (error) {
    console.error('Playwright is required for automated wiki bootstrap.');
    console.error('Install it with: npm install --no-save playwright && npx playwright install chrome');
    process.exitCode = 1;
    return;
  }

  const repo = process.env.GITHUB_REPOSITORY || 'Bloominglabs/newsite';
  const [owner, name] = repo.split('/');
  const wikiUrl = `https://github.com/${owner}/${name}/wiki`;
  const newPageUrl = `${wikiUrl}/_new`;
  const homePath = path.resolve(__dirname, '..', 'wiki', 'Home.mediawiki');
  const homeBody = fs.existsSync(homePath)
    ? fs.readFileSync(homePath, 'utf8').slice(0, 32000)
    : 'Bloominglabs wiki bootstrap page.';

  const channel = process.env.PLAYWRIGHT_CHANNEL || 'chrome';
  const profileDir =
    process.env.CHROME_USER_DATA_DIR ||
    path.join(process.env.HOME || '', '.config', 'google-chrome');

  let browser;
  let page;
  if (process.env.CHROME_USER_DATA_DIR || fs.existsSync(profileDir)) {
    const context = await chromium.launchPersistentContext(profileDir, {
      channel,
      headless: false,
    });
    page = context.pages()[0] || (await context.newPage());
    browser = context;
  } else {
    browser = await chromium.launch({ headless: false, channel });
    page = await browser.newPage();
  }

  await page.goto(newPageUrl, { waitUntil: 'domcontentloaded', timeout: 120000 });
  console.log(`Opened ${page.url()}`);

  if (page.url().includes('/login')) {
    console.error('GitHub login is required in the opened browser window.');
    console.error('Sign in, then re-run this script.');
    await browser.close();
    process.exitCode = 1;
    return;
  }

  const titleInput = page.locator('input[name="page[name]"], #gollum-editor-title, [data-testid="wiki-page-title"]');
  const bodyInput = page.locator('textarea[name="page[body]"], #gollum-editor-body, [data-testid="wiki-page-content"]');
  const saveButton = page.locator(
    '#gollum-editor-submit, button:has-text("Save Page"), [data-testid="wiki-save-button"]'
  );

  if ((await titleInput.count()) === 0) {
    console.log('Wiki editor not found. If the wiki already exists, re-run the Publish GitHub Wiki workflow.');
    await browser.close();
    return;
  }

  await titleInput.first().fill('Home');
  await bodyInput.first().fill(homeBody);
  await saveButton.first().click();
  await page.waitForURL(/\/wiki(\/Home|$)/, { timeout: 120000 });

  console.log(`Created wiki home page at ${page.url()}`);
  await browser.close();

  try {
    execSync('gh workflow run publish-wiki.yml --ref master', { stdio: 'inherit' });
    console.log('Triggered Publish GitHub Wiki workflow.');
  } catch (error) {
    console.warn('Could not trigger publish workflow automatically. Run it manually in GitHub Actions.');
  }
}

main().catch((error) => {
  console.error(error.stack);
  process.exitCode = 1;
});
