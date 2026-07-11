'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');

const {
  expandTransclusions,
  normalizeWikiTitle,
  titleToWikiFileStem,
} = require('./github-wiki.js');
const { escapeHtml, renderWikitextToHtml } = require('./render.js');
const { siteContent } = require('../site/content.js');
const { toPublicHref } = require('../site/paths.js');

const HOME_PAGE_TITLE = 'Main Page';

/**
 * Archived titles and site paths share the same stem rules as the GitHub wiki
 * export, except the public site keeps the readable `Home` slug for Main Page.
 */
function siteWikiPageStemForTitle(title) {
  if (normalizeWikiTitle(title) === normalizeWikiTitle(HOME_PAGE_TITLE)) {
    return 'Home';
  }

  return titleToWikiFileStem(title);
}

/**
 * Build a lookup table from normalized titles to site wiki stems so inline links
 * can be rewritten consistently across every rendered page.
 */
function buildSiteStemMap(recordsByTitle) {
  const titleMap = new Map();

  for (const record of recordsByTitle.values()) {
    titleMap.set(normalizeWikiTitle(record.title), siteWikiPageStemForTitle(record.title));
  }

  return titleMap;
}

/**
 * Load archived JSON pages and manifest metadata from the checked-in snapshot.
 */
async function loadArchiveForSite(archiveRoot) {
  const manifest = JSON.parse(await fs.readFile(path.join(archiveRoot, 'manifest.json'), 'utf8'));
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

  return { manifest, pagesByTitle, recordsByTitle };
}

/**
 * Convert one archived record into HTML body content for the static site.
 */
function renderArchivedPageBody(record, { pagesByTitle, titleMap, pageHrefForStem }) {
  const expanded = expandTransclusions(record.revision?.content ?? '', pagesByTitle);

  return renderWikitextToHtml(expanded, {
    titleMap,
    pageHrefForStem,
  });
}

/**
 * Wiki article pages reuse the public-site frame but swap the hero for a tighter
 * article header so long reference pages remain readable.
 */
function renderWikiArticleLayout({ title, bodyHtml, basePath, pageHrefForStem }) {
  const organization = siteContent.organization;
  const navLinks = [
    { href: '/', label: 'Home' },
    { href: '/visit/', label: 'Visit' },
    { href: '/membership/', label: 'Membership' },
    { href: '/support/', label: 'Support' },
    { href: '/wiki/', label: 'Wiki', current: true },
  ];

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escapeHtml(title)} | ${escapeHtml(organization.name)} Wiki</title>
    <meta name="description" content="${escapeHtml(`Archived Bloominglabs wiki page: ${title}`)}">
    <link rel="stylesheet" href="${toPublicHref('/assets/site.css', basePath)}">
  </head>
  <body>
    <div class="site-shell">
      <header class="site-header">
        <div class="header-inner">
          <a class="wordmark" href="${toPublicHref('/', basePath)}">
            <span class="wordmark-name">${escapeHtml(organization.name)}</span>
            <span class="wordmark-tagline">${escapeHtml(organization.tagline)}</span>
          </a>
          <nav class="site-nav" aria-label="Primary">
            ${navLinks
              .map((link) => {
                const current = link.current ? ' aria-current="page"' : '';
                return `<a href="${toPublicHref(link.href, basePath)}"${current}>${escapeHtml(link.label)}</a>`;
              })
              .join('')}
          </nav>
        </div>
      </header>
      <main class="page-main wiki-page-main">
        <section class="content-panel wiki-article">
          <p class="section-kicker">Wiki</p>
          <h1>${escapeHtml(title)}</h1>
          <p class="wiki-backlink"><a href="${pageHrefForStem('Home')}">Wiki home</a> · <a href="${toPublicHref('/wiki/', basePath)}">All pages</a></p>
          <div class="wiki-content">
            ${bodyHtml}
          </div>
        </section>
      </main>
      <footer class="site-footer">
        <div class="site-footer-inner">
          <p><strong>${escapeHtml(organization.name)}</strong> wiki reference page.</p>
          <p>Public hours: ${escapeHtml(organization.publicHours)}.</p>
        </div>
      </footer>
    </div>
  </body>
</html>`;
}

/**
 * Generate static HTML files for archived wiki article pages.
 */
async function buildWikiSiteFiles({ archiveRoot, basePath = '' }) {
  const { manifest, pagesByTitle, recordsByTitle } = await loadArchiveForSite(archiveRoot);
  const titleMap = buildSiteStemMap(recordsByTitle);
  const pageHrefForStem = (stem) => toPublicHref(`/wiki/pages/${stem}/`, basePath);
  const files = [];

  for (const entry of manifest.pages) {
    const record = recordsByTitle.get(normalizeWikiTitle(entry.title));

    if (!record) {
      throw new Error(`Manifest entry "${entry.title}" has no archived page record`);
    }

    const stem = siteWikiPageStemForTitle(record.title);
    const bodyHtml = renderArchivedPageBody(record, {
      pagesByTitle,
      titleMap,
      pageHrefForStem,
    });

    files.push({
      path: `wiki/pages/${stem}/index.html`,
      contents: renderWikiArticleLayout({
        title: record.title,
        bodyHtml,
        basePath,
        pageHrefForStem,
      }),
    });
  }

  return { files, manifest, pageHrefForStem };
}

module.exports = {
  buildWikiSiteFiles,
  loadArchiveForSite,
  renderArchivedPageBody,
  siteWikiPageStemForTitle,
};
