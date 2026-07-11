'use strict';

/**
 * Styles are generated from source so the public site stays reproducible.
 * Visual direction: daylight shop floor — cool concrete, leaf-green brand,
 * plasma-orange accents, birch strips — avoiding cream/serif/terracotta defaults.
 */
const siteStyles = `
@import url("https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:wght@400;500;600;700&family=Syne:wght@600;700;800&display=swap");

:root {
  --color-floor: #d7d3cc;
  --color-floor-deep: #c5c0b7;
  --color-panel: #eeecea;
  --color-ink: #141618;
  --color-ink-soft: #2a2f35;
  --color-steel: #4e5963;
  --color-bloom: #1b6b45;
  --color-bloom-deep: #134d32;
  --color-spark: #e85d04;
  --color-spark-deep: #c44c03;
  --color-birch: #c4a574;
  --color-night: #0f1419;
  --color-night-soft: #1a222b;
  --color-line: rgba(20, 22, 24, 0.12);
  --color-glow: rgba(232, 93, 4, 0.35);
  --font-display: "Syne", "Arial Narrow", sans-serif;
  --font-body: "IBM Plex Sans", "Segoe UI", sans-serif;
  --font-mono: "IBM Plex Mono", "Courier New", monospace;
  --page-gutter: 1.25rem;
  --content-width: min(1080px, 100%);
  --radius: 4px;
  --shadow-soft: 0 18px 40px rgba(15, 20, 25, 0.12);
}

* {
  box-sizing: border-box;
}

html {
  scroll-behavior: smooth;
  overflow-x: clip;
}

body {
  margin: 0;
  overflow-x: clip;
  max-width: 100%;
  color: var(--color-ink);
  background:
    radial-gradient(circle at 12% 18%, rgba(27, 107, 69, 0.12), transparent 34%),
    radial-gradient(circle at 88% 8%, rgba(232, 93, 4, 0.1), transparent 28%),
    linear-gradient(180deg, var(--color-floor) 0%, var(--color-floor-deep) 100%);
  font-family: var(--font-body);
  line-height: 1.6;
}

body::before {
  content: "";
  position: fixed;
  inset: 0;
  background-image:
    repeating-linear-gradient(
      90deg,
      transparent 0,
      transparent 47px,
      rgba(20, 22, 24, 0.035) 47px,
      rgba(20, 22, 24, 0.035) 48px
    ),
    repeating-linear-gradient(
      0deg,
      transparent 0,
      transparent 47px,
      rgba(20, 22, 24, 0.03) 47px,
      rgba(20, 22, 24, 0.03) 48px
    );
  pointer-events: none;
  z-index: 0;
}

a {
  color: var(--color-bloom-deep);
  text-decoration-thickness: 0.08em;
  text-underline-offset: 0.18em;
}

a:hover,
a:focus-visible {
  color: var(--color-spark-deep);
}

a:focus-visible,
.button:focus-visible,
.site-nav a:focus-visible {
  outline: 3px solid var(--color-spark);
  outline-offset: 3px;
}

.site-shell {
  position: relative;
  z-index: 1;
  overflow-x: clip;
  max-width: 100%;
}

.site-header {
  position: sticky;
  top: 0;
  z-index: 20;
  background: rgba(15, 20, 25, 0.92);
  color: var(--color-panel);
  backdrop-filter: blur(10px);
  border-bottom: 3px solid var(--color-bloom);
  overflow-x: clip;
}

.header-inner,
.hero-home-inner,
.page-masthead-inner,
.page-main,
.site-footer-inner {
  width: var(--content-width);
  max-width: 100%;
  margin: 0 auto;
  padding-left: var(--page-gutter);
  padding-right: var(--page-gutter);
  box-sizing: border-box;
}

.header-inner {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding-top: 0.85rem;
  padding-bottom: 0.85rem;
}

.wordmark {
  display: inline-flex;
  flex-direction: column;
  gap: 0.1rem;
  text-decoration: none;
  color: inherit;
}

.wordmark-name {
  font-family: var(--font-display);
  font-size: 1.35rem;
  font-weight: 800;
  letter-spacing: 0.02em;
  line-height: 1;
}

.wordmark-tagline {
  font-family: var(--font-mono);
  font-size: 0.72rem;
  color: rgba(238, 236, 234, 0.72);
  letter-spacing: 0.04em;
}

.site-nav {
  display: flex;
  flex-wrap: wrap;
  gap: 0.85rem 1.1rem;
  align-items: center;
}

.site-nav a {
  color: rgba(238, 236, 234, 0.9);
  text-decoration: none;
  font-size: 0.95rem;
  font-weight: 500;
}

.site-nav a[aria-current="page"] {
  color: #fff;
  box-shadow: inset 0 -2px 0 var(--color-spark);
}

.hero-home {
  position: relative;
  min-height: calc(100svh - 4.2rem);
  display: grid;
  align-items: end;
  overflow: hidden;
  max-width: 100%;
  color: var(--color-panel);
  background:
    linear-gradient(115deg, rgba(15, 20, 25, 0.94) 0%, rgba(15, 20, 25, 0.72) 48%, rgba(27, 107, 69, 0.35) 100%),
    linear-gradient(180deg, var(--color-night) 0%, var(--color-night-soft) 100%);
}

.hero-home::before {
  content: "";
  position: absolute;
  inset: 0;
  max-width: 100%;
  background:
    radial-gradient(circle at 78% 42%, var(--color-glow), transparent 28%),
    repeating-linear-gradient(
      -18deg,
      transparent 0,
      transparent 18px,
      rgba(196, 165, 116, 0.08) 18px,
      rgba(196, 165, 116, 0.08) 19px
    );
  pointer-events: none;
}

.hero-home-inner {
  position: relative;
  z-index: 1;
  padding-top: 4.5rem;
  padding-bottom: 3.5rem;
  display: grid;
  gap: 1.4rem;
  justify-self: center;
}

.hero-brand {
  margin: 0;
  max-width: 100%;
  white-space: nowrap;
  font-family: var(--font-display);
  font-size: clamp(2.25rem, 9vw, 6.5rem);
  font-weight: 800;
  line-height: 0.9;
  letter-spacing: -0.03em;
  animation: brand-rise 0.9s ease-out both;
}

.hero-brand::after {
  content: "";
  display: block;
  width: min(12rem, 40%);
  height: 0.35rem;
  margin-top: 0.85rem;
  background: linear-gradient(90deg, var(--color-spark), var(--color-birch));
  transform-origin: left center;
  animation: spark-draw 0.8s 0.35s ease-out both;
}

.hero-home h1 {
  margin: 0;
  max-width: 36rem;
  font-family: var(--font-display);
  font-size: clamp(1.55rem, 3.4vw, 2.35rem);
  font-weight: 700;
  line-height: 1.15;
  text-wrap: balance;
  animation: copy-rise 0.8s 0.15s ease-out both;
}

.hero-home .hero-lead {
  margin: 0;
  max-width: 36rem;
  font-size: 1.08rem;
  color: rgba(238, 236, 234, 0.88);
  animation: copy-rise 0.8s 0.25s ease-out both;
}

.cta-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.8rem;
  margin-top: 0.35rem;
  animation: copy-rise 0.8s 0.4s ease-out both;
}

.button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.85rem 1.2rem;
  border-radius: var(--radius);
  border: 2px solid transparent;
  font-family: var(--font-body);
  font-weight: 700;
  font-size: 0.98rem;
  text-decoration: none;
  transition: transform 0.15s ease, background-color 0.15s ease, border-color 0.15s ease;
}

.button:hover {
  transform: translateY(-1px);
}

.button.primary {
  background: var(--color-spark);
  color: #fff;
}

.button.primary:hover {
  background: var(--color-spark-deep);
  color: #fff;
}

.button.secondary {
  background: transparent;
  border-color: var(--color-ink);
  color: var(--color-ink);
}

.button.secondary:hover {
  border-color: var(--color-bloom-deep);
  color: var(--color-bloom-deep);
}

.hero-home .button.secondary {
  border-color: rgba(238, 236, 234, 0.55);
  color: var(--color-panel);
}

.hero-home .button.secondary:hover {
  border-color: #fff;
  color: #fff;
}

.page-masthead {
  padding: 2.75rem 0 1.5rem;
}

.page-masthead-inner {
  display: grid;
  gap: 0.85rem;
  padding: 1.6rem 1.5rem;
  background: var(--color-panel);
  border: 1px solid var(--color-line);
  border-left: 6px solid var(--color-bloom);
  box-shadow: var(--shadow-soft);
}

.page-kicker {
  margin: 0;
  font-family: var(--font-mono);
  font-size: 0.78rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-bloom-deep);
}

.page-title {
  margin: 0;
  font-family: var(--font-display);
  font-size: clamp(2rem, 5vw, 3.2rem);
  line-height: 1.05;
  text-wrap: balance;
}

.page-lead {
  margin: 0;
  max-width: 42rem;
  font-size: 1.08rem;
  color: var(--color-ink-soft);
}

.page-main {
  display: grid;
  gap: 1.25rem;
  padding: 0 0 4rem;
}

.section-block,
.content-panel {
  padding: 1.55rem 1.5rem;
  background: var(--color-panel);
  border: 1px solid var(--color-line);
  box-shadow: var(--shadow-soft);
}

.section-block h2,
.content-panel h2,
.content-panel h1 {
  margin: 0 0 0.75rem;
  font-family: var(--font-display);
  font-size: clamp(1.35rem, 2.5vw, 1.8rem);
  line-height: 1.15;
}

.section-kicker {
  margin: 0 0 0.35rem;
  font-family: var(--font-mono);
  font-size: 0.78rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-bloom-deep);
}

.section-block p:first-of-type,
.content-panel > p:first-of-type {
  margin-top: 0;
}

.hours-beacon {
  display: grid;
  gap: 0.35rem;
  margin: 1rem 0 0;
  padding: 1rem 1.1rem;
  background: var(--color-night);
  color: var(--color-panel);
  border-left: 5px solid var(--color-spark);
}

.hours-beacon strong {
  font-family: var(--font-display);
  font-size: clamp(1.4rem, 3vw, 1.9rem);
  letter-spacing: -0.02em;
}

.hours-beacon span {
  font-family: var(--font-mono);
  font-size: 0.85rem;
  color: rgba(238, 236, 234, 0.78);
}

.fact-strip {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 1px;
  background: var(--color-line);
  border: 1px solid var(--color-line);
  margin-top: 1rem;
}

.fact-strip article {
  background: var(--color-panel);
  padding: 1rem 1.05rem;
}

.fact-strip h3 {
  margin: 0 0 0.4rem;
  font-family: var(--font-mono);
  font-size: 0.78rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--color-bloom-deep);
}

.fact-strip p {
  margin: 0;
  color: var(--color-ink-soft);
}

.bullet-list,
.number-list {
  margin: 0;
  padding-left: 1.2rem;
}

.bullet-list li,
.number-list li {
  margin-bottom: 0.7rem;
}

.number-list {
  list-style: none;
  padding-left: 0;
  counter-reset: join-step;
}

.number-list li {
  position: relative;
  padding-left: 2.6rem;
  counter-increment: join-step;
}

.number-list li::before {
  content: counter(join-step);
  position: absolute;
  left: 0;
  top: 0;
  width: 1.8rem;
  height: 1.8rem;
  display: grid;
  place-items: center;
  background: var(--color-bloom);
  color: #fff;
  font-family: var(--font-mono);
  font-size: 0.85rem;
  font-weight: 500;
}

.callout {
  margin-top: 1rem;
  padding: 1rem 1.1rem;
  background: rgba(27, 107, 69, 0.08);
  border: 1px solid rgba(27, 107, 69, 0.22);
}

.callout h2,
.callout h3 {
  margin-top: 0;
  font-family: var(--font-display);
  font-size: 1.15rem;
}

.site-footer {
  padding: 0 0 2rem;
}

.site-footer-inner {
  display: grid;
  gap: 0.55rem;
  padding: 1.4rem 1.5rem;
  background: var(--color-night);
  color: var(--color-panel);
  border-top: 3px solid var(--color-birch);
}

.site-footer-inner a {
  color: #f3b27a;
}

.footer-note {
  margin: 0;
  font-family: var(--font-mono);
  font-size: 0.78rem;
  color: rgba(238, 236, 234, 0.7);
}

.wiki-page-main {
  padding-top: 2rem;
}

.wiki-article h1 {
  margin-top: 0;
  font-family: var(--font-display);
}

.wiki-backlink {
  color: var(--color-steel);
  font-size: 0.95rem;
}

.wiki-content {
  display: grid;
  gap: 1rem;
}

.wiki-content h1,
.wiki-content h2,
.wiki-content h3,
.wiki-content h4,
.wiki-content h5,
.wiki-content h6 {
  margin-bottom: 0.35rem;
  font-family: var(--font-display);
}

.wiki-content p,
.wiki-content ul,
.wiki-content ol,
.wiki-content table {
  margin: 0;
}

.wiki-index-list {
  columns: 2;
  gap: 2rem;
  margin: 0;
  padding-left: 1.2rem;
}

.wiki-index-list li {
  break-inside: avoid;
  margin-bottom: 0.45rem;
}

.wiki-table {
  width: 100%;
  border-collapse: collapse;
}

.wiki-table td {
  border: 1px solid var(--color-line);
  padding: 0.55rem 0.75rem;
  vertical-align: top;
}

.wiki-file-ref {
  color: var(--color-steel);
  font-style: italic;
}

@keyframes brand-rise {
  from {
    opacity: 0;
    transform: translateY(18px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes spark-draw {
  from {
    transform: scaleX(0);
  }
  to {
    transform: scaleX(1);
  }
}

@keyframes copy-rise {
  from {
    opacity: 0;
    transform: translateY(12px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (max-width: 880px) {
  .header-inner,
  .hero-home-inner,
  .page-masthead-inner,
  .page-main,
  .section-block,
  .site-footer-inner {
    padding-left: var(--page-gutter);
    padding-right: var(--page-gutter);
  }

  .hero-home {
    min-height: auto;
  }

  .hero-home-inner {
    padding-top: 3rem;
    padding-bottom: 2.5rem;
  }

  .fact-strip {
    grid-template-columns: 1fr;
  }

  .wiki-index-list {
    columns: 1;
  }
}

@media (prefers-reduced-motion: reduce) {
  html {
    scroll-behavior: auto;
  }

  .hero-brand,
  .hero-brand::after,
  .hero-home h1,
  .hero-home .hero-lead,
  .cta-row,
  .button {
    animation: none;
    transition: none;
  }
}
`;

module.exports = { siteStyles };
