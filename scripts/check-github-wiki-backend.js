'use strict';

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
    const message = [
      'The GitHub wiki backend does not exist yet for this repository.',
      'Create the first page manually at:',
      `${serverUrl}/${repository}/wiki/_new`,
      'Save a placeholder Home page, then re-run the Publish GitHub Wiki workflow.',
    ].join('\n');

    process.stderr.write(`${message}\n`);
    throw error;
  }

  process.stdout.write(`GitHub wiki backend is available at ${wikiRemote}\n`);
}

main().catch(() => {
  process.exitCode = 1;
});
