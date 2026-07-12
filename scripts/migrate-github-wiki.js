'use strict';

const path = require('node:path');

const { writeGitHubWikiTree } = require('../src/wiki/github-wiki.js');

/**
 * Generate the GitHub wiki export directory from the checked-in archive
 * snapshot. Network access is intentionally not required.
 */
async function main() {
  const archiveRoot = path.resolve(__dirname, '..', 'wiki-archive', 'latest');
  const outputRoot = path.resolve(__dirname, '..', 'wiki');
  const summary = await writeGitHubWikiTree({ archiveRoot, outputRoot });

  process.stdout.write(
    `Generated ${summary.fileCount} GitHub wiki files (${summary.mediaCount} media) from ${summary.pageCount} archived pages in ${outputRoot}\n`
  );
}

main().catch((error) => {
  process.stderr.write(`${error.stack}\n`);
  process.exitCode = 1;
});
