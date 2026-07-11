'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');

const { siteContent } = require('./content.js');
const { siteStyles } = require('./styles.js');
const { normalizeBasePath, toPublicHref } = require('./paths.js');
const { titleToWikiFileStem } = require('../wiki/github-wiki.js');

/**
 * Public CTAs that used to point at on-site wiki HTML now go to the editable
 * GitHub wiki, which is the canonical reference host.
 */
function githubWikiPageHref(title) {
  const organization = siteContent.organization;
  if (title === 'Main Page' || title === 'Home') {
    return organization.wikiUrl;
  }

  return `${organization.wikiUrl}/${titleToWikiFileStem(title)}`;
}

/**
 * Kept for callers that still need a title→stem helper when composing GitHub
 * wiki URLs or talking about archived page names.
 */
function siteWikiPageHref(title) {
  return githubWikiPageHref(title);
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
 * Page-root prefix for in-document anchors: '' at site root, or `/newsite`
 * under a GitHub Pages project path. Avoids `/#section` and `/newsite/#section`.
 */
function pageRootHref(basePath) {
  return normalizeBasePath(basePath);
}

/**
 * Resolve action hrefs so hash and relative paths honor the Pages base path
 * while absolute and mailto links stay untouched.
 */
function resolveActionHref(href, basePath) {
  if (/^(https?:|mailto:)/i.test(href)) {
    return href;
  }

  if (href.startsWith('#')) {
    return `${pageRootHref(basePath)}${href}`;
  }

  return toPublicHref(href, basePath);
}

/**
 * Primary nav is in-page anchors plus an external GitHub wiki link.
 */
function renderNavigation(basePath) {
  const organization = siteContent.organization;
  const homeHref = pageRootHref(basePath);
  const links = [
    { href: `${homeHref}#home`, label: 'Home' },
    { href: `${homeHref}#visit`, label: 'Visit' },
    { href: `${homeHref}#membership`, label: 'Membership' },
    { href: `${homeHref}#support`, label: 'Support' },
    { href: organization.wikiUrl, label: 'Wiki', external: true },
  ];

  return `
    <nav class="site-nav" aria-label="Primary">
      ${links
        .map((link) => {
          const external = link.external ? ' rel="noopener noreferrer"' : '';
          return `<a href="${escapeHtml(link.href)}"${external}>${escapeHtml(link.label)}</a>`;
        })
        .join('')}
    </nav>
  `;
}

/**
 * Ordered and unordered lists stay as plain helpers for factual content blocks.
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
 * Named sections get stable ids so the sticky nav can jump within the page.
 */
function renderSection(id, title, bodyHtml) {
  return `
    <section class="section-block" id="${escapeHtml(id)}">
      <h2>${escapeHtml(title)}</h2>
      ${bodyHtml}
    </section>
  `;
}

/**
 * CTA buttons share one renderer across the single-page layout.
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
 * Tiny redirect pages keep old multi-page URLs from going dead after the
 * single-page collapse.
 */
function renderRedirectPage({ title, targetUrl, message }) {
  const organization = siteContent.organization;

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escapeHtml(title)} | ${escapeHtml(organization.name)}</title>
    <meta http-equiv="refresh" content="0; url=${escapeHtml(targetUrl)}">
    <link rel="canonical" href="${escapeHtml(targetUrl)}">
  </head>
  <body>
    <p>${escapeHtml(message)} <a href="${escapeHtml(targetUrl)}">${escapeHtml(targetUrl)}</a></p>
  </body>
</html>`;
}

/**
 * The public site is one HTML document: brand hero plus Visit, Membership, and
 * Support sections. Wiki lives on GitHub.
 */
function renderHomePage(basePath) {
  const organization = siteContent.organization;
  const home = siteContent.home;
  const homeHref = pageRootHref(basePath);

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Bloomington’s hackerspace | ${escapeHtml(organization.name)}</title>
    <meta name="description" content="Bloominglabs is Bloomington’s hackerspace. Public hours, address, membership, and donations.">
    <link rel="stylesheet" href="${toPublicHref('/assets/site.css', basePath)}">
  </head>
  <body>
    <div class="site-shell">
      <header class="site-header">
        <div class="header-inner">
          <a class="wordmark" href="${homeHref}#home">
            <span class="wordmark-name">${escapeHtml(organization.name)}</span>
            <span class="wordmark-tagline">${escapeHtml(organization.tagline)}</span>
          </a>
          ${renderNavigation(basePath)}
        </div>
      </header>
      <section class="hero hero-home" id="home">
        <div class="hero-home-inner">
          <p class="hero-brand">${escapeHtml(organization.name)}</p>
          <h1>${escapeHtml(home.headline)}</h1>
          <p class="hero-lead">${escapeHtml(home.lead)}</p>
          ${renderActions(
            [
              { href: '#visit', label: home.visitCta, variant: 'primary' },
              { href: '#membership', label: home.membershipCta, variant: 'secondary' },
            ],
            basePath
          )}
        </div>
      </section>
      <main class="page-main">
        ${renderSection(
          'intro',
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
        )}
        ${renderSection(
          'visit',
          'Visit',
          `
            <p>${escapeHtml(siteContent.visit.lead)}</p>
            <p>
              <strong>${escapeHtml(organization.address)}</strong>.
              ${escapeHtml(organization.entranceNote)}
            </p>
            <div class="hours-beacon" aria-label="Public hours">
              <strong>${escapeHtml(organization.publicHours)}</strong>
              <span>Open ${escapeHtml(organization.publicHoursDetail)} · free · all ages · waiver on first visit</span>
            </div>
            <h3>Rules of thumb</h3>
            ${renderList(siteContent.visit.arrivalNotes, 'bullet')}
            <h3>Contact</h3>
            ${renderList(siteContent.visit.contactRoutes, 'bullet')}
            <div class="callout">
              <h3>Also</h3>
              <p><a href="${organization.calendarUrl}">Upcoming workshops</a></p>
              <p><a href="${organization.wikiUrl}">GitHub wiki</a></p>
            </div>
            ${renderActions(
              [
                { href: `mailto:${organization.email}`, label: 'Email', variant: 'primary' },
                { href: '#membership', label: 'Membership', variant: 'secondary' },
              ],
              basePath
            )}
          `
        )}
        ${renderSection(
          'membership',
          'Membership',
          `
            <p>${escapeHtml(siteContent.membership.lead)}</p>
            <h3>Steps</h3>
            ${renderList(siteContent.membership.steps, 'numbered')}
            <h3>What you get</h3>
            ${renderList(siteContent.membership.benefits, 'bullet')}
            <div class="callout">
              <h3>If you are still looking around</h3>
              <p>Just come to a Wednesday public night first.</p>
            </div>
            ${renderActions(
              [
                { href: '#visit', label: 'Public night', variant: 'primary' },
                {
                  href: githubWikiPageHref('Membership Manual'),
                  label: 'Membership Manual',
                  variant: 'secondary',
                },
              ],
              basePath
            )}
          `
        )}
        ${renderSection(
          'support',
          'Support',
          `
            <p>${escapeHtml(siteContent.support.lead)}</p>
            <h3>Options</h3>
            ${renderList(siteContent.support.options, 'bullet')}
            <h3>What it pays for</h3>
            <p>Rent, utilities, safety gear, consumables, broken tools, and events.</p>
            ${renderActions(
              [
                { href: githubWikiPageHref('Donations'), label: 'Donation details', variant: 'primary' },
                { href: '#membership', label: 'Membership', variant: 'secondary' },
              ],
              basePath
            )}
          `
        )}
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
            Longer docs are on the <a href="${organization.wikiUrl}">wiki</a>.
          </p>
        </div>
      </footer>
    </div>
  </body>
</html>`;
}

/**
 * Public output is the single page, its stylesheet, and redirect stubs for the
 * old multi-page paths.
 */
function buildSiteFiles(options = {}) {
  const { basePath = '' } = options;
  const normalizedBasePath = normalizeBasePath(basePath);
  const homeHref = pageRootHref(normalizedBasePath);
  const organization = siteContent.organization;

  return [
    { path: 'assets/site.css', contents: siteStyles },
    { path: 'index.html', contents: renderHomePage(normalizedBasePath) },
    {
      path: 'visit/index.html',
      contents: renderRedirectPage({
        title: 'Visit',
        targetUrl: `${homeHref}#visit`,
        message: 'Visit details moved to',
      }),
    },
    {
      path: 'membership/index.html',
      contents: renderRedirectPage({
        title: 'Membership',
        targetUrl: `${homeHref}#membership`,
        message: 'Membership details moved to',
      }),
    },
    {
      path: 'support/index.html',
      contents: renderRedirectPage({
        title: 'Support',
        targetUrl: `${homeHref}#support`,
        message: 'Support details moved to',
      }),
    },
    {
      path: 'wiki/index.html',
      contents: renderRedirectPage({
        title: 'Wiki',
        targetUrl: organization.wikiUrl,
        message: 'The wiki is at',
      }),
    },
  ];
}

/**
 * Write the single-page site (and redirect stubs). When an archive root is
 * present, copy the JSON snapshot into the deploy bundle for preservation.
 */
async function writeSite(outputRoot, options = {}) {
  const { archiveRoot, basePath = '' } = options;
  const normalizedBasePath = normalizeBasePath(basePath);
  const files = buildSiteFiles({ basePath: normalizedBasePath });

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
  githubWikiPageHref,
  normalizeBasePath,
  siteWikiPageHref,
  toPublicHref,
  writeSite,
};
