'use strict';

const path = require('node:path');

const { writeSite } = require('../src/site/build.js');

/**
 * The CLI wrapper stays intentionally thin so the tested module remains the
 * single source of build behavior.
 */
async function main() {
  const outputRoot = path.resolve(__dirname, '..', 'dist');
  const archiveRoot = path.resolve(__dirname, '..', 'wiki-archive');
  const files = await writeSite(outputRoot, {
    archiveRoot,
    basePath: process.env.BASE_PATH || '',
  });

  process.stdout.write(`Wrote ${files.length} site files to ${outputRoot}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error.stack}\n`);
  process.exitCode = 1;
});
