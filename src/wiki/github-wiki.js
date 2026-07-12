'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');

const { buildMediaPathIndex } = require('./media-archive.js');

const HOME_PAGE_TITLE = 'Main Page';
const DEFAULT_WIKI_RAW_BASE = 'https://raw.githubusercontent.com/wiki/Bloominglabs/newsite';
const BLOOMINGLABS_HOST_RE = /^https?:\/\/(?:www\.)?bloominglabs\.org/i;

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
 * Resolve an archived media title or URL to a local media/ relative path.
 */
function resolveMediaLocalPath(fileNameOrUrl, mediaPathIndex) {
  if (!mediaPathIndex || mediaPathIndex.size === 0) {
    return null;
  }

  const raw = fileNameOrUrl.trim();
  const candidates = [
    raw,
    raw.replace(/^File:/i, ''),
    decodeURIComponent(raw.replace(/^File:/i, '')),
    path.posix.basename(raw),
  ];

  for (const candidate of candidates) {
    const key = candidate.toLowerCase();
    if (mediaPathIndex.has(key)) {
      return mediaPathIndex.get(key);
    }
    const underscored = candidate.replace(/ /g, '_').toLowerCase();
    if (mediaPathIndex.has(underscored)) {
      return mediaPathIndex.get(underscored);
    }
    const spaced = candidate.replace(/_/g, ' ').toLowerCase();
    if (mediaPathIndex.has(spaced)) {
      return mediaPathIndex.get(spaced);
    }
  }

  return null;
}

/**
 * Public URL for a file stored inside the published GitHub wiki git repo.
 */
function wikiRawMediaUrl(localPath, wikiRawBase = DEFAULT_WIKI_RAW_BASE) {
  return `${wikiRawBase.replace(/\/$/, '')}/${localPath.replace(/^\//, '')}`;
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

    return inner.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
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
 * Rewrite File:/Image: links to archived media inside the wiki repo.
 */
function convertFileLinks(
  content,
  { mediaPathIndex, wikiRawBase = DEFAULT_WIKI_RAW_BASE } = {}
) {
  return content.replace(
    /\[\[:?\s*(?:File|Image)\s*:\s*([^|\]]+?)(?:\|([^\]]*))?\]\]/gi,
    (match, rawName, options) => {
      const displayName = rawName.trim();
      const localPath = resolveMediaLocalPath(displayName, mediaPathIndex);

      if (!localPath) {
        return match;
      }

      const url = wikiRawMediaUrl(localPath, wikiRawBase);
      const caption = captionFromFileOptions(options, displayName);

      if (/\.pdf$/i.test(displayName) || /\.pdf$/i.test(localPath)) {
        return `[${url} ${caption}]`;
      }

      return `<img src="${url}" alt="${escapeHtmlAttribute(caption)}">`;
    }
  );
}

/**
 * Rewrite absolute bloominglabs.org media URLs to archived wiki media.
 */
function convertBloominglabsMediaUrls(
  content,
  { mediaPathIndex, wikiRawBase = DEFAULT_WIKI_RAW_BASE } = {}
) {
  return content.replace(
    /https?:\/\/(?:www\.)?bloominglabs\.org\/(?:Special:FilePath\/([^\s"'<>\]]+)|images\/[0-9a-f]\/[0-9a-f]{2}\/([^\s"'<>\]]+))/gi,
    (match, filePathName, hashedName) => {
      const name = decodeURIComponent(filePathName || hashedName || '');
      const localPath =
        resolveMediaLocalPath(name, mediaPathIndex) ||
        resolveMediaLocalPath(match, mediaPathIndex);

      if (!localPath) {
        return match;
      }

      return wikiRawMediaUrl(localPath, wikiRawBase);
    }
  );
}

/**
 * Turn bloominglabs.org article URLs into GitHub wiki links when archived.
 */
function convertBloominglabsPageUrls(content, titleMap) {
  return content.replace(
    /\[(https?:\/\/(?:www\.)?bloominglabs\.org\/(?:index\.php\/|wiki\/)?([^\]\s|#]+)(?:#[^\]\s]*)?)(?:\s+([^\]]+))?\]/gi,
    (match, url, rawSlug, label) => {
      if (/^(?:Special:|File:|Image:|api\.php)/i.test(rawSlug)) {
        return match;
      }

      const title = decodeURIComponent(rawSlug.replace(/_/g, ' ')).replace(/\/$/, '');
      const pageName = titleMap.get(normalizeWikiTitle(title));

      if (!pageName) {
        return match;
      }

      const text = label || title;
      return `[[${pageName}|${text}]]`;
    }
  ).replace(
    /https?:\/\/(?:www\.)?bloominglabs\.org\/(?:index\.php\/|wiki\/)?([A-Za-z0-9][^\s"'<>\]|#]*)/gi,
    (match, rawSlug) => {
      if (/^(?:Special:|File:|Image:|api\.php|images\/|mailman\/)/i.test(rawSlug)) {
        return match;
      }

      const title = decodeURIComponent(rawSlug.replace(/_/g, ' ')).replace(/\/$/, '');
      const pageName = titleMap.get(normalizeWikiTitle(title));
      return pageName ? `[[${pageName}]]` : match;
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
 * Rewrite internal wikilinks to GitHub wiki page names.
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
function convertArchivedPage(
  record,
  {
    pagesByTitle,
    titleMap,
    mediaPathIndex = new Map(),
    wikiRawBase = DEFAULT_WIKI_RAW_BASE,
  }
) {
  let content = record.revision?.content ?? '';
  content = expandTransclusions(content, pagesByTitle);
  content = convertHtmlEmbeds(content);
  content = convertFileLinks(content, { mediaPathIndex, wikiRawBase });
  content = convertBloominglabsMediaUrls(content, { mediaPathIndex, wikiRawBase });
  content = convertBracketedExternalUrls(content);
  content = stripCategoryLinks(content);
  content = convertUserLinks(content);
  content = convertPresentationHtml(content);
  content = convertWikiLinks(content, titleMap);
  content = convertBloominglabsPageUrls(content, titleMap);
  return content.trim();
}

/**
 * Copy archived media binaries into the GitHub wiki export tree.
 */
async function copyArchivedMedia(archiveRoot, outputRoot, mediaManifest) {
  const copied = [];

  for (const entry of mediaManifest?.files || []) {
    const source = path.join(archiveRoot, entry.localPath);
    const destination = path.join(outputRoot, entry.localPath);
    await fs.mkdir(path.dirname(destination), { recursive: true });
    await fs.copyFile(source, destination);
    copied.push(entry.localPath);
  }

  return copied;
}

/**
 * Generate the `wiki/` tree from a checked-in archive snapshot. The archive
 * remains the source of truth; this export is a publishable GitHub wiki view.
 */
async function writeGitHubWikiTree({
  archiveRoot,
  outputRoot,
  wikiRawBase = DEFAULT_WIKI_RAW_BASE,
}) {
  const manifest = JSON.parse(await fs.readFile(path.join(archiveRoot, 'manifest.json'), 'utf8'));
  const { pagesByTitle, recordsByTitle } = await loadArchivedPages(archiveRoot);
  const titleMap = buildTitleMap(recordsByTitle);

  let mediaManifest = { files: [] };
  try {
    mediaManifest = JSON.parse(
      await fs.readFile(path.join(archiveRoot, 'media-manifest.json'), 'utf8')
    );
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw error;
    }
  }

  const mediaPathIndex = buildMediaPathIndex(mediaManifest);

  await fs.rm(outputRoot, { recursive: true, force: true });
  await fs.mkdir(outputRoot, { recursive: true });

  const mediaFiles = await copyArchivedMedia(archiveRoot, outputRoot, mediaManifest);
  const writtenFiles = new Set(mediaFiles);

  for (const entry of manifest.pages) {
    const record = recordsByTitle.get(normalizeWikiTitle(entry.title));

    if (!record) {
      throw new Error(`Manifest entry "${entry.title}" has no archived page record`);
    }

    const converted = convertArchivedPage(record, {
      pagesByTitle,
      titleMap,
      mediaPathIndex,
      wikiRawBase,
    });
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
    mediaCount: mediaFiles.length,
    outputRoot,
  };
}

module.exports = {
  titleToWikiFileStem,
  normalizeWikiTitle,
  extractTranscludableContent,
  wikiRawMediaUrl,
  resolveMediaLocalPath,
  convertHtmlEmbeds,
  convertFileLinks,
  convertBloominglabsMediaUrls,
  convertBloominglabsPageUrls,
  convertBracketedExternalUrls,
  stripCategoryLinks,
  convertUserLinks,
  convertPresentationHtml,
  convertWikiLinks,
  expandTransclusions,
  convertArchivedPage,
  writeGitHubWikiTree,
  DEFAULT_WIKI_RAW_BASE,
  BLOOMINGLABS_HOST_RE,
};
