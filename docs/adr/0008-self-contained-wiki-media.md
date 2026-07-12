# ADR 0008: Self-Contained Wiki Media And Bloominglabs.org Independence

- Status: Accepted
- Date: 2026-07-12

## Context

ADR 0007 pointed GitHub wiki image embeds at live `bloominglabs.org` `Special:FilePath` URLs and left other site links alone. That restores rendering while the old host is up, but it fails the preservation goal in `project-init.txt`: the newsite wiki must remain usable if bloominglabs.org disappears.

Text pages already live in `wiki-archive/latest/pages/`. Binary uploads and in-page bloominglabs.org wiki links do not.

## Decision

1. Extend wiki archival to download **all MediaWiki file uploads** (via `list=allimages`) into `wiki-archive/latest/media/`, with a `media-manifest.json` mapping original titles to local files and source URLs.
2. During `migrate:github-wiki`, copy archived media into `wiki/media/` and rewrite `File:` / `Image:` / `Special:FilePath` / `/images/…` references to those local files.
3. Published GitHub wiki image `src` values use `https://raw.githubusercontent.com/wiki/Bloominglabs/newsite/media/…` so GitHub’s wiki UI can load binaries from the wiki git repo without depending on bloominglabs.org.
4. Rewrite in-content links to `bloominglabs.org` wiki pages into GitHub wiki internal links when the target exists in the archive.
5. Keep PayPal and other third-party hosts as external links (out of scope for bloominglabs.org replacement).

## Rationale

A replacement wiki is only a replacement if media and internal references travel with it. Storing binaries in the main-repo archive preserves them under normal git review; copying them into `wiki/` makes the published `.wiki.git` self-contained. Raw GitHub wiki URLs are the reliable way to embed those binaries in GitHub’s renderer.

## Consequences

1. Archive and wiki directories grow by the size of all uploads (potentially hundreds of MB).
2. `npm run archive:wiki` requires network access and more time.
3. `npm run migrate:github-wiki` stays offline and only uses checked-in media.
4. ADR 0007’s reliance on live `Special:FilePath` URLs is superseded for export output.

## Success Criteria

1. `wiki-archive/latest/media-manifest.json` lists downloaded files with local paths.
2. `wiki/media/` contains the same binaries after migration.
3. Exported pages reference `raw.githubusercontent.com/wiki/Bloominglabs/newsite/media/…` (or equivalent local media paths), not bloominglabs.org, for archived files.
4. In-page bloominglabs.org wiki article links become `[[GitHub-Wiki-Page]]` links when archived.
5. Automated tests cover media rewriting and bloominglabs.org link remapping with fixtures (no live network in unit tests).
