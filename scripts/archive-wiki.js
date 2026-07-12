'use strict';

const childProcess = require('node:child_process');
const fs = require('node:fs/promises');
const path = require('node:path');
const util = require('node:util');

const { writeArchiveSnapshot } = require('../src/wiki/archive.js');
const { writeMediaArchive } = require('../src/wiki/media-archive.js');

const execFile = util.promisify(childProcess.execFile);

/**
 * JSON fetch via curl — this environment resolves the wiki host with curl more
 * reliably than Node's undici DNS path.
 */
async function fetchWithCurl(url) {
  const { stdout } = await execFile('curl', ['-fL', '-sS', url], {
    maxBuffer: 32 * 1024 * 1024,
  });

  return {
    ok: true,
    async json() {
      return JSON.parse(stdout);
    },
  };
}

/**
 * Binary download via curl into a destination path.
 */
async function downloadWithCurl(url, destination) {
  await fs.mkdir(path.dirname(destination), { recursive: true });
  await execFile('curl', ['-fL', '-sS', '-o', destination, url], {
    maxBuffer: 8 * 1024 * 1024,
  });
}

async function main() {
  const outputRoot = path.resolve(__dirname, '..', 'wiki-archive');
  const snapshotRoot = path.join(outputRoot, 'latest');
  const apiRoot = 'https://www.bloominglabs.org/api.php';

  const manifest = await writeArchiveSnapshot({
    apiRoot,
    baseUrl: 'https://www.bloominglabs.org',
    fetchImpl: fetchWithCurl,
    outputRoot,
    snapshotLabel: 'latest',
  });

  process.stdout.write(`Archived ${manifest.pageCount} wiki pages into ${snapshotRoot}\n`);

  const pageRecords = [];
  for (const entry of manifest.pages) {
    const record = JSON.parse(await fs.readFile(path.join(snapshotRoot, entry.file), 'utf8'));
    pageRecords.push(record);
  }

  const mediaManifest = await writeMediaArchive({
    apiRoot,
    archiveRoot: snapshotRoot,
    fetchImpl: fetchWithCurl,
    downloadImpl: downloadWithCurl,
    pageRecords,
  });

  process.stdout.write(
    `Archived ${mediaManifest.fileCount} media files` +
      (mediaManifest.failureCount ? ` (${mediaManifest.failureCount} failed)` : '') +
      ` into ${path.join(snapshotRoot, 'media')}\n`
  );
}

main().catch((error) => {
  process.stderr.write(`${error.stack}\n`);
  process.exitCode = 1;
});
