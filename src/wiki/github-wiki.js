'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');

const HOME_PAGE_TITLE = 'Main Page';
const DEFAULT_MEDIA_BASE_URL = 'https://www.bloominglabs.org';

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
 * Escape text that will appear inside HTML attribute values for img alt text.
 */
function escapeHtmlAttribute(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

/**
 * Bloominglabs still hosts the original MediaWiki uploads. Special:FilePath is a
 * stable redirect into the hashed /images/ tree without needing an API lookup.
 */
function mediaFileUrl(fileName, mediaBaseUrl = DEFAULT_MEDIA_BASE_URL) {
  const normalized = fileName.trim().replace(/ /g, '_');
  return `${mediaBaseUrl.replace(/\/$/, '')}/Special:FilePath/${normalized}`;
}

/**
 * GitHub wiki strips forms. Turn classic PayPal hosted buttons and NCP payment
 * forms into ordinary donate links that still reach checkout.
 */
function convertHtmlEmbeds(content) {
  return content.replace(/<html>\s*([\s\S]*?)\s*<\/html>/gi, (_, inner) => {
    const hostedButton = inner.match(
      /name=["']hosted_button_id["']\s*value=["']([^"']+)["']/i
    );
    if (hostedButton) {
      const url = `https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=${hostedButton[1]}`;
      return `[${url} Donate with PayPal]`;
    }

    const ncpAction = inner.match(
      /action=["'](https:\/\/www\.paypal\.com\/ncp\/payment\/[^"']+)["']/i
    );
    if (ncpAction) {
      return `[${ncpAction[1]} Donate with PayPal]`;
    }

    const leftover = inner.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    return leftover;
  });
}

/**
 * Pull a human caption out of MediaWiki file-option junk like thumb|200px|Caption.
 */
function captionFromFileOptions(options, fallback) {
  if (!options) {
    return fallback;
  }

  const parts = options
    .split('|')
    .map((part) => part.trim())
    .filter(Boolean)
    .filter(
      (part) =>
        !/^(?:thumb|thumbnail|frame|frameless|border|right|left|center|none|\d+px)$/i.test(
          part
        )
    );

  return parts.length > 0 ? parts[parts.length - 1] : fallback;
}

/**
 * Rewrite File:/Image: links to absolute Bloominglabs media URLs. Images become
 * <img> tags (GitHub will not resolve local File: titles). PDFs become links.
 */
function convertFileLinks(content, mediaBaseUrl = DEFAULT_MEDIA_BASE_URL) {
  return content.replace(
    /\[\[:?\s*(?:File|Image)\s*:\s*([^|\]]+?)(?:\|([^\]]*))?\]\]/gi,
    (_, rawName, options) => {
      const displayName = rawName.trim();
      const url = mediaFileUrl(displayName, mediaBaseUrl);
      const caption = captionFromFileOptions(options, displayName);

      if (/\.pdf$/i.test(displayName)) {
        return `[${url} ${caption}]`;
      }

      return `<img src="${url}" alt="${escapeHtmlAttribute(caption)}">`;
    }
  );
}

/**
 * MediaWiki sometimes wraps bare URLs in [[...]]; GitHub treats those as
 * missing pages. Convert them to external-link syntax.
 */
function convertBracketedExternalUrls(content) {
  return content.replace(
    /\[\[(https?:\/\/[^|\]]+)(?:\|([^\]]+))?\]\]/gi,
    (_, url, label) => `[${url} ${label ? label.trim() : url}]`
  );
}

/**
 * Categories have no GitHub wiki equivalent in this export.
 */
function stripCategoryLinks(content) {
  return content
    .replace(/^\s*\[\[Category:[^\]]+\]\]\s*$/gim, '')
    .replace(/\[\[Category:[^\]]+\]\]/gi, '')
    .replace(/\n{3,}/g, '\n\n');
}

/**
 * User pages were not archived. Keep the visible label so signatures still read.
 */
function convertUserLinks(content) {
  return content.replace(
    /\[\[User:([^|\]]+)(?:\|([^\]]+))?\]\]/gi,
    (_, user, label) => (label ? label.trim() : user.trim())
  );
}

/**
 * Presentation tags that MediaWiki allowed but GitHub shows awkwardly.
 */
function convertPresentationHtml(content) {
  return content
    .replace(/<\/?(?:big|font)(?:\s[^>]*)?>/gi, '')
    .replace(/<\/?center>/gi, '');
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
 * Rewrite internal wikilinks to GitHub wiki page names while leaving already
 * converted media and external material alone.
 */
function convertWikiLinks(content, titleMap) {
  return content.replace(
    /\[\[([^[\]|#]+)(?:#([^|\]]+))?(?:\|([^\]]+))?\]\]/g,
    (match, rawTarget, rawAnchor, rawLabel) => {
      const target = rawTarget.trim();

      if (/^(?:File|Image|Category|Media|Special|User):/i.test(target)) {
        return match;
      }

      if (/^https?:\/\//i.test(target)) {
        return match;
      }

      const pageName = resolveWikiPageName(target, titleMap);
      const anchor = rawAnchor ? `#${titleToWikiFileStem(rawAnchor.replace(/_/g, ' '))}` : '';
      const label = rawLabel ? `|${rawLabel}` : '';

      return `[[${pageName}${anchor}${label}]]`;
    }
  );
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
function convertArchivedPage(record, { pagesByTitle, titleMap, mediaBaseUrl = DEFAULT_MEDIA_BASE_URL }) {
  let content = record.revision?.content ?? '';
  content = expandTransclusions(content, pagesByTitle);
  content = convertHtmlEmbeds(content);
  content = convertFileLinks(content, mediaBaseUrl);
  content = convertBracketedExternalUrls(content);
  content = stripCategoryLinks(content);
  content = convertUserLinks(content);
  content = convertPresentationHtml(content);
  content = convertWikiLinks(content, titleMap);
  return content.trim();
}

/**
 * Generate the `wiki/` tree from a checked-in archive snapshot. The archive
 * remains the source of truth; this export is a publishable GitHub wiki view.
 */
async function writeGitHubWikiTree({ archiveRoot, outputRoot, mediaBaseUrl = DEFAULT_MEDIA_BASE_URL }) {
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

    const converted = convertArchivedPage(record, { pagesByTitle, titleMap, mediaBaseUrl });
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
  mediaFileUrl,
  convertHtmlEmbeds,
  convertFileLinks,
  convertBracketedExternalUrls,
  stripCategoryLinks,
  convertUserLinks,
  convertPresentationHtml,
  convertWikiLinks,
  expandTransclusions,
  convertArchivedPage,
  writeGitHubWikiTree,
};
