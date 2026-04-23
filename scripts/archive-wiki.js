'use strict';

const childProcess = require('node:child_process');
const path = require('node:path');
const util = require('node:util');

const { writeArchiveSnapshot } = require('../src/wiki/archive.js');

const execFile = util.promisify(childProcess.execFile);

/**
 * This wrapper creates the repository-resident wiki snapshot in a stable
 * location that the public site can link to directly. The wrapper uses curl
 * instead of Node's built-in fetch because this environment resolves the target
 * host correctly with curl but not with undici/getaddrinfo.
 */
async function fetchWithCurl(url) {
  const { stdout } = await execFile('curl', ['-fL', '-sS', url], {
    maxBuffer: 16 * 1024 * 1024,
  });

  return {
    ok: true,
    async json() {
      return JSON.parse(stdout);
    },
  };
}

async function main() {
  const outputRoot = path.resolve(__dirname, '..', 'wiki-archive');
  const manifest = await writeArchiveSnapshot({
    apiRoot: 'https://www.bloominglabs.org/api.php',
    baseUrl: 'https://www.bloominglabs.org',
    fetchImpl: fetchWithCurl,
    outputRoot,
    snapshotLabel: 'latest',
  });

  process.stdout.write(`Archived ${manifest.pageCount} wiki pages into ${path.join(outputRoot, 'latest')}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error.stack}\n`);
  process.exitCode = 1;
});
