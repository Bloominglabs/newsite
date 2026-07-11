'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { execFileSync, execSync } = require('node:child_process');

/**
 * GitHub only creates the hidden `repo.wiki.git` backend after a logged-in user
 * saves the first wiki page in the browser. API tokens and CI tokens cannot do
 * that bootstrap step.
 */
async function main() {
  let chromium;
  try {
    ({ chromium } = require('playwright'));
  } catch (error) {
    console.error('Playwright is required for automated wiki bootstrap.');
    console.error('Install it with: npm install --no-save playwright && npx playwright install chromium');
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

  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  await page.goto(newPageUrl, { waitUntil: 'domcontentloaded', timeout: 120000 });
  console.log(`Opened ${page.url()}`);

  if (page.url().includes('/login')) {
    console.log('Sign in to GitHub in the opened browser window.');
    console.log('Waiting up to 10 minutes for login to complete...');
    await page.waitForURL(
      (url) => url.href.includes(`/${owner}/${name}/wiki`) && !url.href.includes('/login'),
      { timeout: 600000 }
    );
    if (!page.url().includes('/wiki/_new')) {
      await page.goto(newPageUrl, { waitUntil: 'domcontentloaded', timeout: 120000 });
    }
  }

  const titleInput = page.locator('input[name="page[name]"], #gollum-editor-title, [data-testid="wiki-page-title"]');
  const bodyInput = page.locator('textarea[name="page[body]"], #gollum-editor-body, [data-testid="wiki-page-content"]');
  const saveButton = page.locator(
    '#gollum-editor-submit, button:has-text("Save Page"), [data-testid="wiki-save-button"]'
  );

  if ((await titleInput.count()) === 0) {
    if (page.url().includes('/wiki/Home') || page.url().endsWith('/wiki')) {
      console.log('Wiki already exists. Re-run the Publish GitHub Wiki workflow.');
    } else {
      console.error(`Wiki editor not found at ${page.url()}`);
      process.exitCode = 1;
    }
    await browser.close();
    return;
  }

  await titleInput.first().fill('Home');
  await bodyInput.first().fill(homeBody);
  await saveButton.first().click();
  await page.waitForURL(/\/wiki(\/Home|$)/, { timeout: 120000 });

  console.log(`Created wiki home page at ${page.url()}`);
  await browser.close();

  const token = process.env.GH_TOKEN || execFileSync('gh', ['auth', 'token'], { encoding: 'utf8' }).trim();
  const wikiRemote = `https://x-access-token:${token}@github.com/${repo}.wiki.git`;
  execFileSync('git', ['ls-remote', wikiRemote, 'HEAD'], { stdio: 'inherit' });
  console.log('GitHub wiki backend is ready.');

  execSync('gh workflow run publish-wiki.yml --ref master', { stdio: 'inherit' });
  console.log('Triggered Publish GitHub Wiki workflow.');
}

main().catch((error) => {
  console.error(error.stack);
  process.exitCode = 1;
});
