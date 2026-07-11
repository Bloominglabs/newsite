'use strict';

const fs = require('node:fs');
const childProcess = require('node:child_process');
const util = require('node:util');

const execFile = util.promisify(childProcess.execFile);

/**
 * GitHub does not create the `.wiki.git` backend until a human saves the first
 * wiki page in the browser. This check fails fast with actionable guidance when
 * that bootstrap step has not happened yet.
 */
async function main() {
  const repository = process.env.GITHUB_REPOSITORY || 'Bloominglabs/newsite';
  const serverUrl = process.env.GITHUB_SERVER_URL || 'https://github.com';
  const token = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;

  if (!token) {
    throw new Error('GH_TOKEN or GITHUB_TOKEN is required to verify the wiki backend');
  }

  const wikiRemote = `${serverUrl}/${repository}.wiki.git`;
  const authRemote = wikiRemote.replace('https://', `https://x-access-token:${token}@`);

  try {
    await execFile('git', ['ls-remote', authRemote, 'HEAD'], { maxBuffer: 1024 * 1024 });
  } catch (error) {
    const bootstrapUrl = `${serverUrl}/${repository}/wiki/_new`;
    const message = [
      'The GitHub wiki backend does not exist yet for this repository.',
      'GitHub only creates the hidden .wiki.git repo after the first page is saved in a browser.',
      'Create the first page manually at:',
      bootstrapUrl,
      'Save a placeholder Home page, then re-run the Publish GitHub Wiki workflow.',
      'Or run locally: npm install --no-save playwright && npx playwright install chromium && npm run bootstrap:github-wiki',
    ].join('\n');

    process.stderr.write(`${message}\n`);

    const summaryPath = process.env.GITHUB_STEP_SUMMARY;
    if (summaryPath) {
      fs.appendFileSync(
        summaryPath,
        [
          '## Publish GitHub Wiki blocked',
          '',
          'The wiki git backend does not exist yet. This is expected until someone saves the first wiki page.',
          '',
          `1. Open [Create the first wiki page](${bootstrapUrl}) while logged in with repo write access.`,
          '2. Save a **Home** page (any placeholder text is fine).',
          '3. Re-run this workflow.',
          '',
          'Until then, browse the migrated content on GitHub Pages: https://bloominglabs.github.io/newsite/wiki/',
          '',
        ].join('\n')
      );
    }

    throw error;
  }

  process.stdout.write(`GitHub wiki backend is available at ${wikiRemote}\n`);
}

main().catch(() => {
  process.exitCode = 1;
});
