# ADR 0007: GitHub Wiki Markup Cleanup For Media, HTML Embeds, And Links

- Status: Accepted
- Date: 2026-07-12

## Context

ADR 0003 exports archived MediaWiki pages to GitHub wiki `.mediawiki` files with light link rewriting and transclusion expansion. On GitHub’s wiki renderer that is not enough:

1. MediaWiki `<html>` blocks (notably PayPal donation forms) appear as literal tags; GitHub strips forms/inputs.
2. `[[File:…]]` / `[[Image:…]]` references do not resolve to Bloominglabs media, so images do not embed.
3. Some `[[http://…]]` links, `User:` / `Category:` links, and presentation tags (`<big>`, `<font>`) render poorly or look broken.

## Decision

Extend the GitHub wiki conversion pipeline (still offline from `wiki-archive/latest/`) to:

1. Replace `<html>…</html>` PayPal hosted-button forms with a single external donate link (`cmd=_s-xclick&hosted_button_id=…`), and NCP payment forms with their `action` URL.
2. Rewrite `File:` / `Image:` (and `[[:File:…]]`) links to absolute Bloominglabs media URLs via `https://www.bloominglabs.org/Special:FilePath/…`, using `<img>` for images and ordinary external links for PDFs/other files.
3. Convert malformed `[[http(s)://…]]` wikilinks into MediaWiki external-link syntax.
4. Remove `[[Category:…]]` lines and render `[[User:…]]` as plain display text.
5. Strip common presentation-only tags (`big`, `font`) while keeping inner text.

## Rationale

GitHub wiki cannot run MediaWiki’s HTML or local file store. Pointing images at the still-live Bloominglabs file paths and turning PayPal forms into ordinary links restores the useful embeds without downloading media into the wiki git repo in this slice.

## Consequences

1. Exported pages depend on bloominglabs.org remaining reachable for images.
2. PayPal UX is a text/button link rather than an embedded form (GitHub will not render forms).
3. Category navigation is dropped from the GitHub wiki view.

## Success Criteria

1. Donations export contains a PayPal donate URL and no raw `<html>` / `<form>` wrapper.
2. Home export embeds the aerial photo via an absolute `Special:FilePath` image URL.
3. `[[http://…]]` and `User:` / `Category:` patterns no longer remain as broken internal wikilinks.
4. Existing migrate tests pass; new conversion unit tests cover the above cases.
