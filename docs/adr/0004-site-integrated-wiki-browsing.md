# ADR 0004: Site-Integrated Wiki Browsing

- Status: Accepted
- Date: 2026-07-11

## Context

ADR 0001 preserved wiki content as JSON in `wiki-archive/latest/`, and ADR 0003 exports that archive to the GitHub wiki. The public static site still only linked outward to wiki hosts and exposed raw JSON, so visitors could not read migrated wiki pages from the main site itself.

The project brief calls for a public site that orients visitors while keeping comprehensive reference material available. Integrating archived wiki pages into the static site output closes that gap without introducing a server runtime.

## Decision

The static site generator will render archived wiki pages as HTML during `npm run build`.

The initial integration will:

1. Generate one HTML page per archived main-namespace record under `/wiki/pages/{stem}/`.
2. Map `Main Page` to `/wiki/pages/Home/`.
3. Convert common MediaWiki wikitext constructs to HTML, including headings, lists, emphasis, external links, and internal wiki links.
4. Expand same-wiki transclusions using the same archive lookup rules as the GitHub wiki export.
5. Replace the current wiki landing page with a browsable index of archived pages plus links to the GitHub wiki and JSON manifest.

## Rationale

Rendering at build time keeps GitHub Pages compatibility, makes wiki reading available even when external wiki hosts are unavailable, and reuses the checked-in archive as the single source of truth.

A focused wikitext renderer is sufficient for the first slice. Complex templates, images, and uncommon markup can remain literal or partially rendered until later ADRs extend media and template handling.

## Consequences

1. Build output size increases with the number of archived pages.
2. Some legacy wikitext constructs may render imperfectly.
3. Image references remain textual until media preservation is implemented.

## Success Criteria

1. `npm run build` emits HTML for every page listed in `wiki-archive/latest/manifest.json`.
2. `/wiki/pages/Home/` renders the migrated Main Page with working internal links to other site wiki pages.
3. `/wiki/` lists archived pages and remains usable from a GitHub Pages project-site base path.
