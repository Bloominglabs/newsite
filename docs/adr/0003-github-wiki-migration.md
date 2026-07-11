# ADR 0003: GitHub Wiki Migration From Archived MediaWiki Content

- Status: Accepted
- Date: 2026-07-11

## Context

ADR 0001 established an in-repository textual snapshot of the live Bloominglabs MediaWiki at `wiki-archive/latest/`. The project brief in `project-init.txt` specifies that the new wiki host for Bloominglabs is the GitHub wiki attached to `Bloominglabs/newsite`.

The JSON archive preserves raw MediaWiki wikitext, metadata, and a manifest, but it is not itself a browsable wiki. Visitors and members need the preserved content published to `https://github.com/Bloominglabs/newsite/wiki`.

## Decision

The repository will generate a `wiki/` directory from the checked-in archive snapshot and publish it to the GitHub wiki using a dedicated migration script and GitHub Actions workflow.

The initial migration will:

1. Convert each archived main-namespace page into a `.mediawiki` file so formatting and links remain close to the source.
2. Map `Main Page` to `Home.mediawiki`, which GitHub treats as the wiki landing page.
3. Rewrite internal `[[wiki links]]` to GitHub wiki page names (hyphenated stems).
4. Expand simple same-wiki transclusions such as `{{:Upcoming Workshops}}` by inlining transcludable content from the archive.
5. Publish `wiki/` to `newsite.wiki.git` on pushes that change wiki content, using `Andrew-Chen-Wang/github-wiki-action` with an `init` strategy so the wiki backend can be created without a manual first page.

## Rationale

MediaWiki wikitext maps more faithfully to GitHub wiki `.mediawiki` pages than to Markdown, especially for tables, templates, and legacy markup. Keeping generation deterministic from `wiki-archive/latest/` avoids coupling site deployment to live wiki availability while still giving the GitHub wiki a reproducible source of truth in git.

A separate publish workflow keeps wiki writes isolated from GitHub Pages deployment permissions and allows wiki refreshes to occur whenever the archive or migration tooling changes.

## Consequences

1. Image and attachment references remain as wikitext links until ADR 0004 addresses media preservation.
2. Complex MediaWiki templates beyond simple page transclusion may still appear literally in migrated pages.
3. The live `bloominglabs.org` wiki and the GitHub wiki will diverge unless the archive refresh and publish workflows are run deliberately.

## Success Criteria

1. `npm run migrate:github-wiki` generates `wiki/` from the archive without network access.
2. The publish workflow pushes generated pages to `https://github.com/Bloominglabs/newsite/wiki`.
3. `Home` renders the migrated Main Page content with working internal links to other migrated pages.
