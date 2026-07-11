'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');

const { siteContent } = require('./content.js');
const { siteStyles } = require('./styles.js');
const { normalizeBasePath, toPublicHref } = require('./paths.js');
const { buildWikiSiteFiles, siteWikiPageStemForTitle } = require('../wiki/site-pages.js');

/**
 * Internal wiki pages are rendered into the static site under `/wiki/pages/`.
 */
function siteWikiPageHref(title, basePath) {
  const stem = siteWikiPageStemForTitle(title);
  return toPublicHref(`/wiki/pages/${stem}/`, basePath);
}

/**
 * HTML escaping is kept local so rendering helpers can safely interpolate
 * checked-in content without relying on a templating library.
 */
function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

/**
 * Resolve action hrefs so internal paths honor the GitHub Pages base path while
 * leaving absolute and mailto links untouched.
 */
function resolveActionHref(href, basePath) {
  if (/^(https?:|mailto:)/i.test(href)) {
    return href;
  }

  return toPublicHref(href, basePath);
}

/**
 * The navigation is generated from a single definition so page changes remain
 * synchronized across the whole site.
 */
function renderNavigation(currentPath, basePath) {
  const links = [
    { href: '/', label: 'Home' },
    { href: '/visit/', label: 'Visit' },
    { href: '/membership/', label: 'Membership' },
    { href: '/support/', label: 'Support' },
    { href: '/wiki/', label: 'Wiki' },
  ];

  return `
    <nav class="site-nav" aria-label="Primary">
      ${links
        .map((link) => {
          const current = currentPath === link.href ? ' aria-current="page"' : '';
          return `<a href="${toPublicHref(link.href, basePath)}"${current}>${escapeHtml(link.label)}</a>`;
        })
        .join('')}
    </nav>
  `;
}

/**
 * Ordered and unordered list rendering is split into dedicated helpers so the
 * page functions can describe structure clearly instead of building raw HTML.
 */
function renderList(items, type) {
  const className = type === 'numbered' ? 'number-list' : 'bullet-list';
  const tagName = type === 'numbered' ? 'ol' : 'ul';

  return `
    <${tagName} class="${className}">
      ${items.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}
    </${tagName}>
  `;
}

/**
 * Section rendering keeps each block to one purpose: a headline and body.
 */
function renderSection(title, bodyHtml) {
  return `
    <section class="section-block">
      <h2>${escapeHtml(title)}</h2>
      ${bodyHtml}
    </section>
  `;
}

/**
 * CTA buttons share one renderer so home and interior pages stay consistent.
 */
function renderActions(actions, basePath) {
  return `
    <div class="cta-row">
      ${actions
        .map(
          (action) => `
            <a class="button ${escapeHtml(action.variant)}" href="${resolveActionHref(action.href, basePath)}">
              ${escapeHtml(action.label)}
            </a>
          `
        )
        .join('')}
    </div>
  `;
}

/**
 * The home hero is brand-first and intentionally sparse: brand, headline,
 * one sentence, and CTAs on a full-bleed atmospheric plane.
 */
function renderHomeHero(page, basePath) {
  return `
    <section class="hero hero-home">
      <div class="hero-home-inner">
        <p class="hero-brand">${escapeHtml(siteContent.organization.name)}</p>
        <h1>${escapeHtml(page.heroTitle)}</h1>
        <p class="hero-lead">${escapeHtml(page.heroText)}</p>
        ${renderActions(page.actions, basePath)}
      </div>
    </section>
  `;
}

/**
 * Interior pages use a compact masthead so Visit, Membership, Support, and Wiki
 * stay focused without repeating the landing composition.
 */
function renderPageMasthead(page, basePath) {
  return `
    <section class="page-masthead">
      <div class="page-masthead-inner">
        <p class="page-kicker">${escapeHtml(page.kicker)}</p>
        <h1 class="page-title">${escapeHtml(page.heroTitle)}</h1>
        <p class="page-lead">${escapeHtml(page.heroText)}</p>
        ${renderActions(page.actions, basePath)}
      </div>
    </section>
  `;
}

/**
 * Shared chrome wraps page-specific intro and body content. Home gets the
 * brand-first hero; every other public page gets the masthead.
 */
function renderLayout(page, basePath) {
  const organization = siteContent.organization;
  const intro = page.layout === 'home' ? renderHomeHero(page, basePath) : renderPageMasthead(page, basePath);

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escapeHtml(page.title)} | ${escapeHtml(organization.name)}</title>
    <meta name="description" content="${escapeHtml(page.description)}">
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
          ${renderNavigation(page.navPath, basePath)}
        </div>
      </header>
      ${intro}
      <main class="page-main">
        ${page.sections.join('')}
      </main>
      <footer class="site-footer">
        <div class="site-footer-inner">
          <p><strong>${escapeHtml(organization.name)}</strong> — ${escapeHtml(organization.tagline)}</p>
          <p>
            Public night: ${escapeHtml(organization.publicHours)}.
            ${escapeHtml(organization.addressShort)}.
            Email <a href="mailto:${escapeHtml(organization.email)}">${escapeHtml(organization.email)}</a>.
          </p>
          <p class="footer-note">
            Longer docs are on the <a href="${toPublicHref('/wiki/', basePath)}">wiki</a>.
          </p>
        </div>
      </footer>
    </div>
  </body>
</html>`;
}

/**
 * Each page renderer is kept explicit instead of hiding content behind a
 * generic schema too early. That makes the information architecture easier to
 * revise while the site is still being discovered.
 */
function renderHomePage(basePath) {
  const organization = siteContent.organization;
  const home = siteContent.home;

  return renderLayout(
    {
      layout: 'home',
      title: 'Bloomington’s hackerspace',
      description:
        'Bloominglabs is Bloomington’s hackerspace. Public hours, address, membership, and donations.',
      navPath: '/',
      heroTitle: home.headline,
      heroText: home.lead,
      actions: [
        { href: '/visit/', label: home.visitCta, variant: 'primary' },
        { href: '/membership/', label: home.membershipCta, variant: 'secondary' },
      ],
      sections: [
        renderSection(
          'Public night',
          `
            <p>
              Open ${escapeHtml(organization.publicHoursDetail)}. Free. Come build, ask questions, or poke around.
            </p>
            <div class="hours-beacon" aria-label="Public hours">
              <strong>${escapeHtml(organization.publicHours)}</strong>
              <span>${escapeHtml(organization.addressShort)} · ${escapeHtml(organization.entranceNote)}</span>
            </div>
          `
        ),
        renderSection(
          'The shop',
          `
            <p>${escapeHtml(home.about)}</p>
            <div class="fact-strip">
              <article>
                <h3>Tools</h3>
                <p>Shared benches and equipment for making and fixing things.</p>
              </article>
              <article>
                <h3>Makevention</h3>
                <p>
                  We organize
                  <a href="${organization.makeventionUrl}">Makevention</a>,
                  Bloomington’s annual maker fair.
                </p>
              </article>
              <article>
                <h3>Members</h3>
                <p>Members get keys and 24/7 access after the joining process.</p>
              </article>
            </div>
          `
        ),
        renderSection(
          'Next steps',
          `
            <p>
              Visit on Wednesday, read
              <a href="${toPublicHref('/membership/', basePath)}">membership</a>,
              or
              <a href="${toPublicHref('/support/', basePath)}">donate / help</a>.
            </p>
            ${renderActions(
              [
                { href: '/visit/', label: 'Visit', variant: 'primary' },
                { href: '/support/', label: 'Support', variant: 'secondary' },
              ],
              basePath
            )}
          `
        ),
      ],
    },
    basePath
  );
}

function renderVisitPage(basePath) {
  const organization = siteContent.organization;

  return renderLayout(
    {
      layout: 'page',
      title: 'Visit Bloominglabs',
      description: 'Address, public hours, and first-visit notes for Bloominglabs.',
      navPath: '/visit/',
      kicker: 'Visit',
      heroTitle: 'Wednesday, 7–10pm',
      heroText: siteContent.visit.lead,
      actions: [
        { href: `mailto:${organization.email}`, label: 'Email', variant: 'primary' },
        { href: '/membership/', label: 'Membership', variant: 'secondary' },
      ],
      sections: [
        renderSection(
          'Address',
          `
            <p>
              <strong>${escapeHtml(organization.address)}</strong>.
              ${escapeHtml(organization.entranceNote)}
            </p>
            <div class="hours-beacon" aria-label="Public hours">
              <strong>${escapeHtml(organization.publicHours)}</strong>
              <span>Free · all ages · waiver on first visit</span>
            </div>
          `
        ),
        renderSection('Rules of thumb', renderList(siteContent.visit.arrivalNotes, 'bullet')),
        renderSection(
          'Contact',
          `
            ${renderList(siteContent.visit.contactRoutes, 'bullet')}
            <div class="callout">
              <h3>Also</h3>
              <p><a href="${organization.calendarUrl}">Upcoming workshops</a></p>
              <p><a href="${toPublicHref('/wiki/', basePath)}">Wiki index</a></p>
            </div>
          `
        ),
      ],
    },
    basePath
  );
}

function renderMembershipPage(basePath) {
  return renderLayout(
    {
      layout: 'page',
      title: 'Membership',
      description: 'How to join Bloominglabs and what membership includes.',
      navPath: '/membership/',
      kicker: 'Membership',
      heroTitle: 'How to join',
      heroText: siteContent.membership.lead,
      actions: [
        { href: '/visit/', label: 'Public night', variant: 'primary' },
        { href: siteWikiPageHref('Membership Manual', basePath), label: 'Membership Manual', variant: 'secondary' },
      ],
      sections: [
        renderSection(
          'Steps',
          `
            ${renderList(siteContent.membership.steps, 'numbered')}
          `
        ),
        renderSection(
          'What you get',
          `
            ${renderList(siteContent.membership.benefits, 'bullet')}
            <div class="callout">
              <h3>If you are still looking around</h3>
              <p>Just come to a Wednesday public night first.</p>
            </div>
          `
        ),
      ],
    },
    basePath
  );
}

function renderSupportPage(basePath) {
  return renderLayout(
    {
      layout: 'page',
      title: 'Support Bloominglabs',
      description: 'How to donate to or otherwise support Bloominglabs.',
      navPath: '/support/',
      kicker: 'Support',
      heroTitle: 'Donations and help',
      heroText: siteContent.support.lead,
      actions: [
        { href: siteWikiPageHref('Donations', basePath), label: 'Donation details', variant: 'primary' },
        { href: '/membership/', label: 'Membership', variant: 'secondary' },
      ],
      sections: [
        renderSection('Options', renderList(siteContent.support.options, 'bullet')),
        renderSection(
          'What it pays for',
          `
            <p>
              Rent, utilities, safety gear, consumables, broken tools, and events.
            </p>
          `
        ),
      ],
    },
    basePath
  );
}

function renderWikiPage(basePath, manifest = null) {
  const organization = siteContent.organization;
  const sortedPages = manifest
    ? [...manifest.pages].sort((left, right) => left.title.localeCompare(right.title))
    : [];
  const pageLinks = sortedPages
    .map((entry) => {
      const href = siteWikiPageHref(entry.title, basePath);
      return `<li><a href="${href}">${escapeHtml(entry.title)}</a></li>`;
    })
    .join('');

  return renderLayout(
    {
      layout: 'page',
      title: 'Wiki',
      description: 'Bloominglabs wiki pages mirrored onto the public site.',
      navPath: '/wiki/',
      kicker: 'Wiki',
      heroTitle: 'Wiki',
      heroText: siteContent.wiki.explanation,
      actions: [
        { href: '/wiki/pages/Home/', label: 'Main page', variant: 'primary' },
        { href: organization.wikiUrl, label: 'Edit on GitHub', variant: 'secondary' },
      ],
      sections: [
        renderSection(
          'Pages',
          manifest
            ? `<ul class="wiki-index-list">${pageLinks}</ul>`
            : `<p>Run <code>npm run build</code> with the checked-in archive to generate wiki HTML.</p>`
        ),
        renderSection(
          'Sources',
          `
            <p>
              Editable copy:
              <a href="${organization.wikiUrl}">${escapeHtml(organization.wikiUrl)}</a>
            </p>
            <p>${escapeHtml(siteContent.wiki.archiveNote)}</p>
            <p>
              Manifest:
              <a href="${toPublicHref('/wiki-archive/latest/manifest.json', basePath)}">${escapeHtml(
                toPublicHref('/wiki-archive/latest/manifest.json', basePath)
              )}</a>
            </p>
          `
        ),
      ],
    },
    basePath
  );
}

/**
 * All generated files are described as in-memory records first. That makes the
 * output easy to test and keeps disk writes as a small final step.
 */
function buildSiteFiles(options = {}) {
  const { basePath = '' } = options;
  const normalizedBasePath = normalizeBasePath(basePath);

  return [
    { path: 'assets/site.css', contents: siteStyles },
    { path: 'index.html', contents: renderHomePage(normalizedBasePath) },
    { path: 'visit/index.html', contents: renderVisitPage(normalizedBasePath) },
    { path: 'membership/index.html', contents: renderMembershipPage(normalizedBasePath) },
    { path: 'support/index.html', contents: renderSupportPage(normalizedBasePath) },
    { path: 'wiki/index.html', contents: renderWikiPage(normalizedBasePath) },
  ];
}

/**
 * The writer is intentionally simple: it creates parent directories and writes
 * each file exactly once from the build manifest. If an archive source path is
 * supplied, the checked-in wiki snapshot is copied into the deployment bundle so
 * the public site's archive links stay valid after publication.
 */
async function writeSite(outputRoot, options = {}) {
  const { archiveRoot, basePath = '' } = options;
  const normalizedBasePath = normalizeBasePath(basePath);
  let manifest = null;
  let wikiArticleFiles = [];

  if (archiveRoot) {
    try {
      await fs.access(path.join(archiveRoot, 'latest', 'manifest.json'));
      const wikiBuild = await buildWikiSiteFiles({
        archiveRoot: path.join(archiveRoot, 'latest'),
        basePath: normalizedBasePath,
      });
      manifest = wikiBuild.manifest;
      wikiArticleFiles = wikiBuild.files;
    } catch (error) {
      if (error.code !== 'ENOENT') {
        throw error;
      }
    }
  }

  const files = [
    ...buildSiteFiles({ basePath: normalizedBasePath }).filter((file) => file.path !== 'wiki/index.html'),
    { path: 'wiki/index.html', contents: renderWikiPage(normalizedBasePath, manifest) },
    ...wikiArticleFiles,
  ];

  await Promise.all(
    files.map(async (file) => {
      const destination = path.join(outputRoot, file.path);
      await fs.mkdir(path.dirname(destination), { recursive: true });
      await fs.writeFile(destination, file.contents, 'utf8');
    })
  );

  if (archiveRoot) {
    try {
      await fs.access(archiveRoot);
      await fs.cp(archiveRoot, path.join(outputRoot, 'wiki-archive'), { recursive: true });
    } catch (error) {
      if (error.code !== 'ENOENT') {
        throw error;
      }
    }
  }

  return files;
}

module.exports = {
  buildSiteFiles,
  normalizeBasePath,
  renderWikiPage,
  siteWikiPageHref,
  toPublicHref,
  writeSite,
};
