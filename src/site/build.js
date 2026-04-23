'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');

const { siteContent } = require('./content.js');
const { siteStyles } = require('./styles.js');

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
 * GitHub Pages repository sites are served beneath a repository-specific base
 * path such as `/newsite`. Normalizing that prefix once keeps link generation
 * consistent across local builds, project Pages URLs, and future custom-domain
 * deployments where the base path becomes empty again.
 */
function normalizeBasePath(basePath = '') {
  const trimmedPath = String(basePath).trim();

  if (!trimmedPath || trimmedPath === '/') {
    return '';
  }

  return `/${trimmedPath.replace(/^\/+|\/+$/g, '')}`;
}

/**
 * Internal site links are rooted from `/`, while external URLs and non-HTTP
 * schemes such as `mailto:` must pass through untouched.
 */
function toPublicHref(href, basePath) {
  if (!href.startsWith('/')) {
    return href;
  }

  return `${normalizeBasePath(basePath)}${href}`;
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
 * Reusable cards keep the content layout consistent while allowing the copy to
 * stay page-specific.
 */
function renderCardGrid(items) {
  return `
    <div class="grid columns-2">
      ${items
        .map(
          (item) => `
            <article class="card">
              <h3>${escapeHtml(item.title)}</h3>
              <p>${escapeHtml(item.body)}</p>
            </article>
          `
        )
        .join('')}
    </div>
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
 * Section rendering gives each page a consistent headline treatment and leaves
 * the actual body content to the caller.
 */
function renderSection(kicker, title, bodyHtml) {
  return `
    <section class="content-panel">
      <p class="section-kicker">${escapeHtml(kicker)}</p>
      <h2>${escapeHtml(title)}</h2>
      ${bodyHtml}
    </section>
  `;
}

/**
 * The layout owns shared framing, while page functions provide the hero copy
 * and body content. This keeps changes localized and predictable.
 */
function renderLayout(page, basePath) {
  const organization = siteContent.organization;

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
      <section class="hero">
        <div class="hero-inner">
          <div class="hero-panel">
            <div class="hero-accent"></div>
            <div class="hero-copy">
              <p class="eyebrow">${escapeHtml(page.eyebrow)}</p>
              <h1>${escapeHtml(page.heroTitle)}</h1>
              <p>${escapeHtml(page.heroText)}</p>
              <div class="cta-row">
                ${page.actions
                  .map(
                    (action) => `
                      <a class="button ${escapeHtml(action.variant)}" href="${toPublicHref(action.href, basePath)}">
                        ${escapeHtml(action.label)}
                      </a>
                    `
                  )
                  .join('')}
              </div>
            </div>
          </div>
          <aside class="signal-panel">
            <h2>Quick Signals</h2>
            <ul class="signal-list">
              ${page.signals
                .map((signal) => `<li>${escapeHtml(signal)}</li>`)
                .join('')}
            </ul>
            <p class="meta-note">${escapeHtml(page.metaNote)}</p>
          </aside>
        </div>
      </section>
      <main class="page-main">
        ${page.sections.join('')}
      </main>
      <footer class="site-footer">
        <div class="site-footer-inner">
          <p><strong>${escapeHtml(organization.name)}</strong> is Bloomington’s hackerspace.</p>
          <p>
            Public hours: ${escapeHtml(organization.publicHours)}.
            Email <a href="mailto:${escapeHtml(organization.email)}">${escapeHtml(organization.email)}</a>.
          </p>
          <p class="footer-note">
            This public-facing site highlights the essentials; the wiki remains the full reference.
          </p>
        </div>
      </footer>
    </div>
  </body>
</html>`;
}

/**
 * Each page renderer is kept explicit instead of trying to hide content behind
 * a generic schema too early. That makes the information architecture easier to
 * revise while the site is still being discovered.
 */
function renderHomePage(basePath) {
  const organization = siteContent.organization;

  return renderLayout({
    title: 'Bloomington’s hackerspace',
    description:
      'Bloominglabs is a public-facing site for visitors who want to find the space, public hours, membership path, and support information.',
    navPath: '/',
    eyebrow: 'Bloomington, Indiana',
    heroTitle: 'Tools, people, and room to make things that would be hard to build alone.',
    heroText: `${organization.name} is Indiana’s first hackerspace. ${siteContent.home.intro}`,
    actions: [
      { href: '/visit/', label: 'Plan A Visit', variant: 'primary' },
      { href: '/membership/', label: 'How Membership Works', variant: 'secondary' },
    ],
    signals: [
      `${organization.publicHours}.`,
      'Public-facing site for first-time visitors.',
      'Makevention is one of Bloominglabs’ signature public projects.',
      'The wiki remains the full reference for deep technical material.',
    ],
    metaNote: 'Built for clear public orientation while keeping the deeper wiki intact.',
    sections: [
      renderSection(
        'First Visit',
        'The fastest way to understand Bloominglabs',
        `
          <p>${escapeHtml(siteContent.home.intro)}</p>
          ${renderCardGrid(siteContent.home.quickFacts)}
        `
      ),
      renderSection(
        'Why This Site Exists',
        'Public-facing site first, reference wiki second',
        `
          <p>
            This public-facing site is meant to answer the high-value questions quickly:
            what Bloominglabs is, where it is, when visitors are welcome, and how to get involved.
          </p>
          <div class="callout">
            <h2>What changed?</h2>
            <p>
              The wiki remains the full reference for projects, procedures, meeting history, and deep institutional knowledge.
              The main site stays focused on orientation and public access.
            </p>
          </div>
        `
      ),
      renderSection(
        'Public Rhythm',
        'What visitors can expect',
        `
          <p>
            Visitors are welcome during ${escapeHtml(organization.publicHours)}. Public night is free,
            family-friendly, and the best time to meet members, see active work, and figure out whether you want
            to come back for workshops or membership.
          </p>
          <p>
            Bloominglabs also organizes <a href="${organization.makeventionUrl}">Makevention</a>, which brings together
            makers, clubs, artists, and inventive projects from around the region.
          </p>
        `
      ),
    ],
  }, basePath);
}

function renderVisitPage(basePath) {
  const organization = siteContent.organization;

  return renderLayout({
    title: 'Visit Bloominglabs',
    description: 'Location, access expectations, contact routes, and first-visit notes for Bloominglabs.',
    navPath: '/visit/',
    eyebrow: 'Visit',
    heroTitle: 'Start with public night.',
    heroText:
      'The easiest first contact is to show up on Wednesday evening, meet the people using the space, and ask direct questions about your interests.',
    actions: [
      { href: organization.wikiUrl, label: 'Live Wiki', variant: 'primary' },
      { href: `mailto:${organization.email}`, label: 'Email The Space', variant: 'secondary' },
    ],
    signals: [
      organization.address,
      organization.publicHours,
      'First visits require a liability waiver.',
      'Suite entrance is around the back next to the garage door.',
    ],
    metaNote: 'Use the public visit path unless a member has arranged a different time with you.',
    sections: [
      renderSection(
        'Location',
        'Where to go',
        `
          <p>
            Bloominglabs is located at <strong>${escapeHtml(organization.address)}</strong>.
            The entrance to Suite 200 is around the back, near the garage door.
          </p>
          <p>
            Public hours run ${escapeHtml(organization.publicHours)}. If that timing does not work,
            email the space and ask whether another visit can be coordinated.
          </p>
        `
      ),
      renderSection(
        'Before You Arrive',
        'What to know ahead of time',
        renderList(siteContent.visit.arrivalNotes, 'bullet')
      ),
      renderSection(
        'Stay In Touch',
        'How to reach Bloominglabs',
        `
          ${renderList(siteContent.visit.contactRoutes, 'bullet')}
          <div class="callout">
            <h2>Key links</h2>
            <p><a href="${toPublicHref(organization.calendarUrl, basePath)}">Calendar</a> for workshops and events.</p>
            <p><a href="${organization.wikiUrl}">Live wiki</a> for deeper operational details.</p>
          </div>
        `
      ),
    ],
  }, basePath);
}

function renderMembershipPage(basePath) {
  const organization = siteContent.organization;

  return renderLayout({
    title: 'Membership',
    description: 'How to become a Bloominglabs member and what membership provides.',
    navPath: '/membership/',
    eyebrow: 'Membership',
    heroTitle: 'Join by participating, not by filling out a cold form.',
    heroText:
      'Bloominglabs treats membership as a relationship. Start by showing up at public night or a workshop, meet people, and let the process unfold in the room.',
    actions: [
      { href: '/visit/', label: 'Come To Public Night', variant: 'primary' },
      { href: siteContent.organization.wikiUrl.replace('/Main_Page', '/Membership_Manual'), label: 'Membership Manual', variant: 'secondary' },
    ],
    signals: [
      'Attend 3 meetings or workshops before joining.',
      'Members receive 24/7 access after joining.',
      'The process starts in person at public night.',
      'Membership is for people who want to contribute to the space as well as use it.',
    ],
    metaNote: 'The membership process is intentionally social so expectations stay explicit.',
    sections: [
      renderSection(
        'Joining',
        'How the path works',
        `
          <p>
            Bloominglabs asks prospective members to attend 3 meetings or workshops before joining.
            That gives both sides time to ask questions, understand expectations, and see whether the space fits.
          </p>
          ${renderList(siteContent.membership.steps, 'numbered')}
        `
      ),
      renderSection(
        'What Membership Provides',
        'What changes after you join',
        `
          ${renderList(siteContent.membership.benefits, 'bullet')}
          <div class="callout">
            <h2>Start simple</h2>
            <p>
              If you are unsure whether membership makes sense, begin with a public night visit.
              That is the intended front door and the best way to see current activity.
            </p>
          </div>
        `
      ),
    ],
  }, basePath);
}

function renderSupportPage(basePath) {
  return renderLayout({
    title: 'Support Bloominglabs',
    description: 'Donation and support information for Bloominglabs.',
    navPath: '/support/',
    eyebrow: 'Support',
    heroTitle: 'Help keep tools, space, and public programming available.',
    heroText:
      'Bloominglabs is funded primarily by membership dues, but donations, volunteer effort, and event support all materially improve what the space can offer.',
    actions: [
      { href: siteContent.organization.wikiUrl.replace('/Main_Page', '/Donations'), label: 'Donation Details', variant: 'primary' },
      { href: '/membership/', label: 'Become A Member', variant: 'secondary' },
    ],
    signals: [
      'Bloominglabs is a registered 501(c)(3) charitable nonprofit in Indiana.',
      'Monetary and useful hardware donations are welcome.',
      'Kroger Community Rewards can benefit the space.',
      'Volunteer labor is often as valuable as cash.',
    ],
    metaNote: 'Support keeps the space usable for members, workshops, and public nights.',
    sections: [
      renderSection(
        'Ways To Help',
        'Support that keeps the shop open',
        renderList(siteContent.support.options, 'bullet')
      ),
      renderSection(
        'Why it matters',
        'Public access depends on shared upkeep',
        `
          <p>
            Space rent, utilities, safety gear, consumables, repair work, and event organizing all require sustained effort.
            Support is what keeps Bloominglabs from becoming a private club with decaying tools.
          </p>
        `
      ),
    ],
  }, basePath);
}

function renderWikiPage(basePath) {
  const organization = siteContent.organization;

  return renderLayout({
    title: 'Wiki And Archive',
    description: 'Why the public site and the Bloominglabs wiki are separate, plus access to the live wiki and local archive.',
    navPath: '/wiki/',
    eyebrow: 'Wiki Split',
    heroTitle: 'Use the main site to orient yourself, then drop into the wiki when you need depth.',
    heroText: siteContent.wiki.explanation,
    actions: [
      { href: organization.wikiUrl, label: 'Open Live Wiki', variant: 'primary' },
      { href: '/wiki-archive/latest/manifest.json', label: 'Archive Manifest', variant: 'secondary' },
    ],
    signals: [
      'Live wiki for projects, procedures, and history.',
      'Local archive manifest in this repository.',
      'Public-facing site for orientation, not exhaustive reference.',
      'Future ADRs will expand media preservation beyond text.',
    ],
    metaNote: 'Separating audiences reduces clutter without discarding institutional memory.',
    sections: [
      renderSection(
        'Live Reference',
        'What stays in the wiki',
        `
          <p>${escapeHtml(siteContent.wiki.explanation)}</p>
          <p>
            For project logs, meeting minutes, tool details, workshops, and historical pages,
            use the <a href="${organization.wikiUrl}">live Bloominglabs wiki</a>.
          </p>
        `
      ),
      renderSection(
        'Repository Preservation',
        'What is stored here',
        `
          <p>${escapeHtml(siteContent.wiki.archiveNote)}</p>
          <p>
            The current snapshot is exposed as <a href="${toPublicHref('/wiki-archive/latest/manifest.json', basePath)}">${escapeHtml(
              toPublicHref('/wiki-archive/latest/manifest.json', basePath)
            )}</a>.
            Each archived page is stored as structured JSON so later migration tooling can consume it without scraping HTML.
          </p>
        `
      ),
    ],
  }, basePath);
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
  const files = buildSiteFiles({ basePath });

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
  writeSite,
};
