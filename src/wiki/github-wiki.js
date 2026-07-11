'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');

const HOME_PAGE_TITLE = 'Main Page';

/**
 * GitHub wiki file names use hyphens instead of spaces. Keeping this separate
 * from the archive filename sanitizer avoids mixing two different naming schemes.
 */
function titleToWikiFileStem(title) {
  return title
    .normalize('NFKD')
    .replace(/[^\x00-\x7F]/g, '')
    .trim()
    .replace(/[_\s]+/g, '-')
    .replace(/[^A-Za-z0-9-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * MediaWiki links vary in spacing, underscores, and casing. Normalizing titles
 * into lowercase spaced keys makes lookups stable across those variants.
 */
function normalizeWikiTitle(title) {
  return title
    .normalize('NFKD')
    .replace(/[^\x00-\x7F]/g, '')
    .trim()
    .replace(/[_\s]+/g, ' ')
    .toLowerCase();
}

/**
 * Transcluded pages often wrap template metadata in noinclude blocks. GitHub
 * wiki has no equivalent, so exported transclusions keep only visible content.
 */
function extractTranscludableContent(wikitext) {
  return wikitext.replace(/<noinclude>[\s\S]*?<\/noinclude>/gi, '').trim();
}

/**
 * Resolve an archived page title to the GitHub wiki page name that should be
 * linked. Main Page becomes Home because GitHub treats that file as the landing
 * page for the wiki tab.
 */
function resolveWikiPageName(title, titleMap) {
  const resolved = titleMap.get(normalizeWikiTitle(title));

  if (!resolved) {
    return titleToWikiFileStem(title.replace(/_/g, ' '));
  }

  return resolved;
}

/**
 * Rewrite internal wikilinks to GitHub wiki page names while leaving file,
 * category, and external links untouched.
 */
function convertWikiLinks(content, titleMap) {
  return content.replace(/\[\[([^[\]|#]+)(?:#([^|\]]+))?(?:\|([^\]]+))?\]\]/g, (match, rawTarget, rawAnchor, rawLabel) => {
    const target = rawTarget.trim();

    if (/^(?:File|Image|Category|Media|Special):/i.test(target)) {
      return match;
    }

    const pageName = resolveWikiPageName(target, titleMap);
    const anchor = rawAnchor ? `#${titleToWikiFileStem(rawAnchor.replace(/_/g, ' '))}` : '';
    const label = rawLabel ? `|${rawLabel}` : '';

    return `[[${pageName}${anchor}${label}]]`;
  });
}

/**
 * MediaWiki transclusion is limited here to same-wiki page includes of the form
 * {{:Page Title}}. Unknown templates are left intact for manual follow-up.
 */
function expandTransclusions(content, pagesByTitle) {
  return content.replace(/\{\{:([^}]+)\}\}/g, (match, rawTitle) => {
    const source = pagesByTitle.get(normalizeWikiTitle(rawTitle));

    if (!source) {
      return match;
    }

    return extractTranscludableContent(source);
  });
}

/**
 * Load every archived page JSON file so transclusions and link rewriting can
 * resolve titles even when the manifest is only used to decide write order.
 */
async function loadArchivedPages(archiveRoot) {
  const pagesRoot = path.join(archiveRoot, 'pages');
  const entries = await fs.readdir(pagesRoot);
  const pagesByTitle = new Map();
  const recordsByTitle = new Map();

  for (const entry of entries) {
    if (!entry.endsWith('.json')) {
      continue;
    }

    const record = JSON.parse(await fs.readFile(path.join(pagesRoot, entry), 'utf8'));
    const content = record.revision?.content ?? '';
    pagesByTitle.set(normalizeWikiTitle(record.title), content);
    recordsByTitle.set(normalizeWikiTitle(record.title), record);
  }

  return { pagesByTitle, recordsByTitle };
}

/**
 * Build the GitHub wiki page-name map once so link conversion and file naming
 * stay consistent across the entire export.
 */
function buildTitleMap(recordsByTitle) {
  const titleMap = new Map();

  for (const record of recordsByTitle.values()) {
    const pageName =
      normalizeWikiTitle(record.title) === normalizeWikiTitle(HOME_PAGE_TITLE)
        ? 'Home'
        : titleToWikiFileStem(record.title);
    titleMap.set(normalizeWikiTitle(record.title), pageName);
  }

  return titleMap;
}

/**
 * Convert one archived page record into GitHub wiki wikitext ready to write.
 */
function convertArchivedPage(record, { pagesByTitle, titleMap }) {
  const expanded = expandTransclusions(record.revision?.content ?? '', pagesByTitle);
  return convertWikiLinks(expanded, titleMap).trim();
}

/**
 * Generate the `wiki/` tree from a checked-in archive snapshot. The archive
 * remains the source of truth; this export is a publishable GitHub wiki view.
 */
async function writeGitHubWikiTree({ archiveRoot, outputRoot }) {
  const manifest = JSON.parse(await fs.readFile(path.join(archiveRoot, 'manifest.json'), 'utf8'));
  const { pagesByTitle, recordsByTitle } = await loadArchivedPages(archiveRoot);
  const titleMap = buildTitleMap(recordsByTitle);

  await fs.rm(outputRoot, { recursive: true, force: true });
  await fs.mkdir(outputRoot, { recursive: true });

  const writtenFiles = new Set();

  for (const entry of manifest.pages) {
    const record = recordsByTitle.get(normalizeWikiTitle(entry.title));

    if (!record) {
      throw new Error(`Manifest entry "${entry.title}" has no archived page record`);
    }

    const converted = convertArchivedPage(record, { pagesByTitle, titleMap });
    const pageName =
      normalizeWikiTitle(record.title) === normalizeWikiTitle(HOME_PAGE_TITLE)
        ? 'Home'
        : titleToWikiFileStem(record.title);
    const fileName = `${pageName}.mediawiki`;

    await fs.writeFile(path.join(outputRoot, fileName), `${converted}\n`, 'utf8');
    writtenFiles.add(fileName);
  }

  return {
    pageCount: manifest.pages.length,
    fileCount: writtenFiles.size,
    outputRoot,
  };
}

module.exports = {
  titleToWikiFileStem,
  normalizeWikiTitle,
  extractTranscludableContent,
  convertWikiLinks,
  expandTransclusions,
  writeGitHubWikiTree,
};
