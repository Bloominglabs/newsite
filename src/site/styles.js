'use strict';

/**
 * The stylesheet is generated from source rather than hand-edited in dist so
 * the public site remains fully reproducible. The visual direction deliberately
 * leans industrial and warm instead of defaulting to anonymous SaaS styling.
 */
const siteStyles = `
:root {
  --color-ink: #1f1a17;
  --color-cream: #f4ead8;
  --color-rust: #a34727;
  --color-rust-deep: #7d3119;
  --color-brass: #d4a44d;
  --color-steel: #5d6a72;
  --color-panel: rgba(244, 234, 216, 0.92);
  --color-line: rgba(31, 26, 23, 0.12);
  --shadow-heavy: 0 22px 60px rgba(31, 26, 23, 0.16);
  --shadow-card: 0 12px 28px rgba(31, 26, 23, 0.1);
  --radius-large: 28px;
  --radius-medium: 18px;
  --content-width: min(1120px, calc(100vw - 2rem));
}

* {
  box-sizing: border-box;
}

html {
  scroll-behavior: smooth;
}

body {
  margin: 0;
  color: var(--color-ink);
  background:
    linear-gradient(135deg, rgba(212, 164, 77, 0.18), transparent 45%),
    linear-gradient(180deg, #f8f1e3 0%, #efe1c6 100%);
  font-family: "Iowan Old Style", "Palatino Linotype", "Book Antiqua", Georgia, serif;
  line-height: 1.6;
}

body::before {
  content: "";
  position: fixed;
  inset: 0;
  background-image:
    linear-gradient(rgba(31, 26, 23, 0.04) 1px, transparent 1px),
    linear-gradient(90deg, rgba(31, 26, 23, 0.04) 1px, transparent 1px);
  background-size: 32px 32px;
  pointer-events: none;
  opacity: 0.35;
}

a {
  color: var(--color-rust-deep);
  text-decoration-thickness: 0.08em;
  text-underline-offset: 0.15em;
}

a:hover {
  color: var(--color-rust);
}

.site-shell {
  position: relative;
  z-index: 1;
}

.site-header {
  background: rgba(31, 26, 23, 0.94);
  color: var(--color-cream);
  border-bottom: 4px solid var(--color-brass);
  box-shadow: var(--shadow-card);
}

.header-inner,
.hero-inner,
.page-main,
.site-footer-inner {
  width: var(--content-width);
  margin: 0 auto;
}

.header-inner {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 1rem 0;
}

.wordmark {
  display: inline-flex;
  flex-direction: column;
  gap: 0.15rem;
  text-decoration: none;
  color: inherit;
}

.wordmark-name {
  font-size: clamp(1.7rem, 2vw, 2.2rem);
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.wordmark-tagline,
.eyebrow,
.meta-note,
.section-kicker,
.button.secondary,
.footer-note {
  font-family: "Courier Prime", "Courier New", monospace;
}

.wordmark-tagline {
  color: rgba(244, 234, 216, 0.82);
  font-size: 0.85rem;
}

.site-nav {
  display: flex;
  flex-wrap: wrap;
  gap: 0.9rem;
  align-items: center;
}

.site-nav a {
  color: var(--color-cream);
  text-decoration: none;
  font-size: 0.98rem;
}

.site-nav a[aria-current="page"] {
  color: var(--color-brass);
}

.hero {
  padding: 4rem 0 2.25rem;
}

.hero-inner {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 1.4rem;
  align-items: stretch;
}

.hero-panel,
.signal-panel,
.content-panel,
.card,
.callout {
  background: var(--color-panel);
  border: 1px solid var(--color-line);
  border-radius: var(--radius-large);
  box-shadow: var(--shadow-heavy);
}

.hero-panel {
  overflow: hidden;
}

.hero-accent {
  height: 16px;
  background: linear-gradient(90deg, var(--color-rust) 0%, var(--color-brass) 100%);
}

.hero-copy {
  padding: 2rem;
}

.eyebrow {
  display: inline-block;
  margin-bottom: 0.85rem;
  color: var(--color-rust-deep);
  font-size: 0.82rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.hero h1,
.page-title {
  margin: 0;
  line-height: 1.05;
  text-wrap: balance;
}

.hero h1 {
  font-size: clamp(2.5rem, 6vw, 5rem);
}

.hero p,
.page-lead {
  max-width: 46rem;
  font-size: 1.12rem;
}

.cta-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.85rem;
  margin-top: 1.5rem;
}

.button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.85rem 1.15rem;
  border-radius: 999px;
  border: 1px solid transparent;
  font-weight: 700;
  text-decoration: none;
}

.button.primary {
  background: var(--color-rust);
  color: var(--color-cream);
}

.button.secondary {
  background: transparent;
  border-color: var(--color-steel);
  color: var(--color-ink);
  font-size: 0.9rem;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.signal-panel {
  display: grid;
  gap: 1rem;
  align-content: start;
  padding: 1.4rem;
  background:
    linear-gradient(180deg, rgba(93, 106, 114, 0.12), rgba(93, 106, 114, 0.04)),
    var(--color-panel);
}

.signal-panel h2 {
  margin: 0;
  font-size: 1.1rem;
}

.signal-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 0.85rem;
}

.signal-list li {
  padding: 0.95rem 1rem;
  border-left: 4px solid var(--color-brass);
  background: rgba(244, 234, 216, 0.95);
  border-radius: 0 14px 14px 0;
}

.meta-note {
  color: var(--color-steel);
  font-size: 0.85rem;
}

.page-main {
  display: grid;
  gap: 1.35rem;
  padding: 0 0 4rem;
}

.content-panel {
  padding: 1.6rem;
}

.section-kicker {
  margin: 0 0 0.35rem;
  color: var(--color-rust);
  font-size: 0.82rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.content-panel h2,
.content-panel h3,
.callout h2 {
  margin-top: 0;
}

.grid {
  display: grid;
  gap: 1rem;
}

.grid.columns-2 {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.card {
  padding: 1.2rem;
}

.card h3 {
  margin-top: 0;
}

.bullet-list,
.number-list {
  margin: 0;
  padding-left: 1.2rem;
}

.bullet-list li,
.number-list li {
  margin-bottom: 0.75rem;
}

.callout {
  padding: 1.4rem;
  background:
    linear-gradient(90deg, rgba(163, 71, 39, 0.08), rgba(212, 164, 77, 0.08)),
    var(--color-panel);
}

.site-footer {
  padding: 0 0 2rem;
}

.site-footer-inner {
  background: rgba(31, 26, 23, 0.92);
  color: var(--color-cream);
  padding: 1.4rem;
  border-radius: var(--radius-large);
  box-shadow: var(--shadow-card);
}

.site-footer-inner a {
  color: var(--color-brass);
}

@media (max-width: 880px) {
  .hero-inner,
  .grid.columns-2 {
    grid-template-columns: 1fr;
  }

  .hero {
    padding-top: 2.5rem;
  }

  .hero-copy,
  .signal-panel,
  .content-panel,
  .site-footer-inner {
    padding: 1.2rem;
  }

  .header-inner {
    align-items: flex-start;
  }
}
`;

module.exports = { siteStyles };
