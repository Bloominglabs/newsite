'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');

const { sanitizeTitleForPath } = require('./archive.js');

/**
 * MediaWiki file titles become flat archive filenames. Keeping the original
 * extension is required so GitHub wiki and <img> tags still recognize the type.
 */
function sanitizeMediaFileName(title) {
  const trimmed = title.trim().replace(/^File:/i, '');
  const extensionMatch = trimmed.match(/(\.[A-Za-z0-9]+)$/);
  const extension = extensionMatch ? extensionMatch[1].toLowerCase() : '';
  const stem = sanitizeTitleForPath(
    extension ? trimmed.slice(0, -extension.length) : trimmed
  );

  return `${stem || 'file'}${extension}`;
}

/**
 * Pull File:/Image: titles out of wikitext so referenced uploads are archived
 * even if allimages pagination ever misses one.
 */
function collectMediaTitlesFromWikitext(wikitext) {
  const titles = new Set();
  const patterns = [
    /\[\[:?\s*(?:File|Image)\s*:\s*([^|\]]+?)(?:\|[^\]]*)?\]\]/gi,
    /Special:FilePath\/([^|\s"'<>\]]+)/gi,
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(wikitext))) {
      titles.add(decodeURIComponent(match[1].trim().replace(/_/g, ' ')));
    }
  }

  return titles;
}

/**
 * List every file upload known to the MediaWiki instance.
 */
async function collectAllImageTitles({ apiRoot, fetchImpl = global.fetch }) {
  const titles = [];
  let continuation;

  do {
    const params = new URLSearchParams({
      action: 'query',
      list: 'allimages',
      ailimit: 'max',
      aiprop: 'timestamp|size|url|mime|sha1',
      format: 'json',
    });

    if (continuation?.aicontinue) {
      params.set('aicontinue', continuation.aicontinue);
    }
    if (continuation?.continue) {
      params.set('continue', continuation.continue);
    }

    const response = await fetchImpl(`${apiRoot}?${params.toString()}`);
    if (!response.ok) {
      throw new Error(`allimages request failed with status ${response.status}`);
    }

    const payload = await response.json();
    for (const image of payload.query?.allimages || []) {
      titles.push({
        title: image.name || image.title?.replace(/^File:/i, ''),
        url: image.url,
        mime: image.mime,
        size: image.size,
        sha1: image.sha1,
        timestamp: image.timestamp,
      });
    }
    continuation = payload.continue;
  } while (continuation);

  return titles;
}

/**
 * Resolve upload URLs for titles that were found only via wikitext references.
 */
async function fetchImageInfoByTitles({ apiRoot, titles, fetchImpl = global.fetch }) {
  const results = new Map();
  const unique = [...new Set(titles.map((title) => title.trim()).filter(Boolean))];

  for (let index = 0; index < unique.length; index += 40) {
    const batch = unique.slice(index, index + 40).map((title) =>
      title.startsWith('File:') ? title : `File:${title}`
    );
    const params = new URLSearchParams({
      action: 'query',
      titles: batch.join('|'),
      prop: 'imageinfo',
      iiprop: 'url|size|mime|sha1|timestamp',
      format: 'json',
      formatversion: '2',
    });

    const response = await fetchImpl(`${apiRoot}?${params.toString()}`);
    if (!response.ok) {
      throw new Error(`imageinfo request failed with status ${response.status}`);
    }

    const payload = await response.json();
    for (const page of payload.query?.pages || []) {
      if (page.missing || !page.imageinfo?.[0]) {
        continue;
      }

      const info = page.imageinfo[0];
      const title = page.title.replace(/^File:/i, '');
      results.set(title, {
        title,
        url: info.url,
        mime: info.mime,
        size: info.size,
        sha1: info.sha1,
        timestamp: info.timestamp,
      });
    }
  }

  return results;
}

/**
 * Download one binary with an injectable downloader so tests stay offline and
 * the CLI can keep using curl in environments where undici DNS fails.
 */
async function downloadMediaFile({ url, destination, downloadImpl }) {
  await fs.mkdir(path.dirname(destination), { recursive: true });
  await downloadImpl(url, destination);
}

/**
 * Write media binaries + manifest beside the textual wiki snapshot.
 */
async function writeMediaArchive({
  apiRoot,
  archiveRoot,
  fetchImpl = global.fetch,
  downloadImpl,
  pageRecords = [],
  generatedAt = new Date().toISOString(),
}) {
  if (typeof downloadImpl !== 'function') {
    throw new Error('downloadImpl is required to write media binaries');
  }

  const fromAllImages = await collectAllImageTitles({ apiRoot, fetchImpl });
  const byTitle = new Map(fromAllImages.map((entry) => [entry.title, entry]));

  const referenced = new Set();
  for (const record of pageRecords) {
    const content = record.revision?.content || record.content || '';
    for (const title of collectMediaTitlesFromWikitext(content)) {
      referenced.add(title);
    }
  }

  const missingTitles = [...referenced].filter((title) => {
    const direct = byTitle.has(title);
    const underscored = byTitle.has(title.replace(/ /g, '_'));
    const spaced = byTitle.has(title.replace(/_/g, ' '));
    return !direct && !underscored && !spaced;
  });

  if (missingTitles.length > 0) {
    const extras = await fetchImageInfoByTitles({
      apiRoot,
      titles: missingTitles,
      fetchImpl,
    });
    for (const [title, entry] of extras) {
      byTitle.set(title, entry);
    }
  }

  const mediaRoot = path.join(archiveRoot, 'media');
  await fs.mkdir(mediaRoot, { recursive: true });

  const usedNames = new Set();
  const files = [];
  const failures = [];

  for (const entry of [...byTitle.values()].sort((left, right) =>
    left.title.localeCompare(right.title)
  )) {
    let localName = sanitizeMediaFileName(entry.title);
    if (usedNames.has(localName)) {
      const digest = (entry.sha1 || entry.title).slice(0, 8);
      localName = sanitizeMediaFileName(`${path.parse(localName).name}-${digest}${path.parse(localName).ext}`);
    }
    usedNames.add(localName);

    const relativePath = path.posix.join('media', localName);
    const destination = path.join(archiveRoot, relativePath);

    try {
      await downloadMediaFile({
        url: entry.url,
        destination,
        downloadImpl,
      });
      files.push({
        title: entry.title,
        localPath: relativePath,
        sourceUrl: entry.url,
        mime: entry.mime || null,
        size: entry.size || null,
        sha1: entry.sha1 || null,
        timestamp: entry.timestamp || null,
      });
    } catch (error) {
      failures.push({
        title: entry.title,
        sourceUrl: entry.url,
        reason: error.message,
      });
    }
  }

  const manifest = {
    generatedAt,
    source: { apiRoot },
    fileCount: files.length,
    failureCount: failures.length,
    files,
    failures,
  };

  await fs.writeFile(
    path.join(archiveRoot, 'media-manifest.json'),
    JSON.stringify(manifest, null, 2),
    'utf8'
  );

  return manifest;
}

/**
 * Build a lookup from MediaWiki file title variants to archived local paths.
 */
function buildMediaPathIndex(mediaManifest) {
  const index = new Map();

  for (const entry of mediaManifest?.files || []) {
    const localPath = entry.localPath;
    const variants = new Set([
      entry.title,
      entry.title.replace(/ /g, '_'),
      entry.title.replace(/_/g, ' '),
      path.posix.basename(localPath),
    ]);

    for (const variant of variants) {
      index.set(variant.toLowerCase(), localPath);
      index.set(variant.replace(/ /g, '_').toLowerCase(), localPath);
    }

    if (entry.sourceUrl) {
      index.set(entry.sourceUrl, localPath);
    }
  }

  return index;
}

module.exports = {
  sanitizeMediaFileName,
  collectMediaTitlesFromWikitext,
  collectAllImageTitles,
  fetchImageInfoByTitles,
  writeMediaArchive,
  buildMediaPathIndex,
};
