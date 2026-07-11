# ADR 0006: Single-Page Public Site With Anchor Navigation

- Status: Accepted
- Date: 2026-07-11

## Context

ADR 0005 redesigned the public site as a multi-page visitor orientation surface (`/`, `/visit/`, `/membership/`, `/support/`, `/wiki/`). That split forces extra clicks for short factual content and keeps a separate on-site wiki index even though the editable reference already lives at the GitHub wiki.

## Decision

Collapse the public visitor site into a single page.

1. `index.html` holds the hero plus Visit, Membership, and Support sections with stable ids (`#visit`, `#membership`, `#support`).
2. Primary navigation uses in-page anchors for those sections.
3. The Wiki nav item links directly to `https://github.com/Bloominglabs/newsite/wiki`.
4. Former public paths emit small redirect pages to the matching anchor (or to the GitHub wiki for `/wiki/`) so old links do not die.
5. Membership Manual and Donations CTAs point at the GitHub wiki, not on-site wiki HTML.
6. Build-time wiki article HTML and the JSON archive may remain as secondary artifacts; they are no longer part of the public navigation.

## Rationale

Visitor questions fit on one scrollable page. Anchor nav is enough for a short site. The GitHub wiki is the editable reference, so sending Wiki there avoids maintaining a second wiki front door.

## Consequences

1. Interior page renderers for Visit/Membership/Support/Wiki are removed from the public layout path.
2. Tests assert one primary HTML page plus redirect stubs.
3. On-site `/wiki/pages/` URLs, if still generated, are not promoted in the main chrome.

## Success Criteria

1. `buildSiteFiles()` emits `index.html` as the only full public page (plus CSS and redirect stubs).
2. Home navigation uses `#visit`, `#membership`, `#support`, and an absolute GitHub wiki URL.
3. Redirect stubs exist for `/visit/`, `/membership/`, `/support/`, and `/wiki/`.
