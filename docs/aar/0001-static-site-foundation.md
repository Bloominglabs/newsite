# AAR 0001: Static Site Foundation And Textual Wiki Snapshot

- Date: 2026-04-23
- Related ADR: [ADR 0001](../adr/0001-static-site-foundation.md)

## Outcome

ADR 0001 succeeded for its initial scope.

## What Landed

1. A zero-dependency static site generator now produces a GitHub Pages-friendly `dist/` tree.
2. The first public site slice includes Home, Visit, Membership, Support, and Wiki pages.
3. The repository now contains a generated textual wiki archive at `wiki-archive/latest/`.
4. The build now copies the checked-in wiki archive into `dist/wiki-archive/` so the deployed site can serve the archive links it advertises.
5. The automated test suite runs under Node's built-in runner with 100% line, branch, and function coverage.

## Measured Results

1. The current archive snapshot preserved 338 wiki pages as JSON records.
2. The snapshot manifest recorded 3 skipped pages:
   `Widget:Google Calendar`, `Widget:Google Spreadsheet`, and `Widget:Iframe`.

## What We Learned

1. The wiki contains widget-prefixed titles that appear in the page listing but do not return normal revision payloads through the MediaWiki API. The archive therefore records these as skipped pages instead of aborting the entire snapshot.
2. In the current execution environment, Node's built-in `fetch` could not reliably resolve the Bloominglabs host. The archive CLI wrapper therefore uses `curl` as its transport while keeping the archive logic itself independently testable.
3. Copying the repository archive into the deployable build is necessary to keep the public site's archive links valid after publication.

## Follow-Up

1. ADR 0002 should define who owns public-site content and how updates are reviewed.
2. ADR 0003 should cover media and attachment preservation so the repository snapshot extends beyond textual page content.
3. A later deployment ADR should decide whether GitHub Pages will publish from `dist/` via Actions or from another checked-in output strategy.
