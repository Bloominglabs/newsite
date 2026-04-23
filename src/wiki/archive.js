'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');

/**
 * MediaWiki titles can contain spaces and punctuation that are awkward as file
 * names. The archive normalizes them into predictable ASCII stems so git diffs
 * remain easy to scan and tools can build file paths deterministically.
 */
function sanitizeTitleForPath(title) {
  return title
    .normalize('NFKD')
    .replace(/[^\x00-\x7F]/g, '')
    .replace(/[^A-Za-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/_+/g, '_');
}

/**
 * A tiny fetch wrapper keeps error reporting specific. That matters here because
 * archive failures should point to the exact API request that broke.
 */
async function fetchJson(url, fetchImpl) {
  const response = await fetchImpl(url);

  if (!response.ok) {
    throw new Error(`Request failed for ${url} with status ${response.status}`);
  }

  return response.json();
}

/**
 * The archive begins with main-namespace content because those pages are the
 * most important textual knowledge to preserve immediately.
 */
async function collectMainNamespacePages({ apiRoot, fetchImpl = global.fetch }) {
  const pages = [];
  let continuation;

  do {
    const params = new URLSearchParams({
      action: 'query',
      list: 'allpages',
      apnamespace: '0',
      aplimit: 'max',
      format: 'json',
    });

    if (continuation) {
      params.set('apcontinue', continuation.apcontinue);
      params.set('continue', continuation.continue);
    }

    const payload = await fetchJson(`${apiRoot}?${params.toString()}`, fetchImpl);
    pages.push(...payload.query.allpages);
    continuation = payload.continue;
  } while (continuation);

  return pages.sort((left, right) => left.title.localeCompare(right.title));
}

/**
 * Each page is fetched separately. The page count is small enough for this first
 * slice, and separate requests make individual failures easier to isolate.
 */
async function fetchPageRevision({ apiRoot, title, fetchImpl = global.fetch }) {
  const params = new URLSearchParams({
    action: 'query',
    prop: 'revisions',
    titles: title,
    rvslots: 'main',
    rvprop: 'ids|timestamp|content',
    format: 'json',
    formatversion: '2',
  });

  const payload = await fetchJson(`${apiRoot}?${params.toString()}`, fetchImpl);
  const page = payload.query.pages[0];

  if (!page || !page.revisions || page.revisions.length === 0) {
    throw new Error(`No revision data returned for "${title}"`);
  }

  const revision = page.revisions[0];
  const mainSlot = revision.slots.main;

  return {
    pageId: page.pageid,
    title: page.title,
    namespace: page.ns,
    revision: {
      id: revision.revid,
      timestamp: revision.timestamp,
      contentModel: mainSlot.contentmodel,
      contentFormat: mainSlot.contentformat,
      content: mainSlot.content,
    },
  };
}

/**
 * Archive records are structured JSON so later tooling can consume them without
 * parsing rendered HTML. The manifest tracks enough metadata to map repository
 * files back to the live wiki.
 */
async function writeArchiveSnapshot({
  apiRoot,
  baseUrl,
  fetchImpl = global.fetch,
  outputRoot,
  snapshotLabel = 'latest',
  generatedAt = new Date().toISOString(),
}) {
  const pages = await collectMainNamespacePages({ apiRoot, fetchImpl });
  const snapshotRoot = path.join(outputRoot, snapshotLabel);
  const pagesRoot = path.join(snapshotRoot, 'pages');
  const manifestEntries = [];
  const skippedPages = [];

  await fs.mkdir(pagesRoot, { recursive: true });

  for (const page of pages) {
    let record;

    try {
      record = await fetchPageRevision({ apiRoot, title: page.title, fetchImpl });
    } catch (error) {
      if (error.message.startsWith('No revision data returned for "')) {
        skippedPages.push({
          title: page.title,
          reason: error.message,
        });
        continue;
      }

      throw error;
    }

    const fileName = `${sanitizeTitleForPath(record.title)}.json`;
    const relativePath = path.posix.join('pages', fileName);
    const liveUrl = `${baseUrl}/${encodeURIComponent(record.title.replaceAll(' ', '_'))}`;
    const destination = path.join(snapshotRoot, relativePath);

    await fs.mkdir(path.dirname(destination), { recursive: true });
    await fs.writeFile(
      destination,
      JSON.stringify(
        {
          title: record.title,
          pageId: record.pageId,
          namespace: record.namespace,
          liveUrl,
          archivedAt: generatedAt,
          revision: record.revision,
        },
        null,
        2
      ),
      'utf8'
    );

    manifestEntries.push({
      title: record.title,
      pageId: record.pageId,
      liveUrl,
      file: relativePath,
      revisionId: record.revision.id,
      revisionTimestamp: record.revision.timestamp,
    });
  }

  const manifest = {
    generatedAt,
    snapshotLabel,
    source: {
      apiRoot,
      baseUrl,
    },
    pageCount: manifestEntries.length,
    skippedCount: skippedPages.length,
    pages: manifestEntries,
    skippedPages,
  };

  await fs.writeFile(path.join(snapshotRoot, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf8');

  return manifest;
}

module.exports = {
  collectMainNamespacePages,
  sanitizeTitleForPath,
  writeArchiveSnapshot,
};
