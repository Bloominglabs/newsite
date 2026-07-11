# ADR 0005: Public Site Redesign For Visitor Orientation

- Status: Accepted
- Date: 2026-07-11

## Context

ADR 0001 and ADR 0002 shipped a static public site on GitHub Pages. The first visual treatment used a warm cream field, serif display type, and terracotta accents, with a two-column hero that put secondary “quick signals” into the first viewport. That layout reads as a generic brochure template and spends the first screen on meta explanation (“why this site exists”) instead of the visitor questions Bloominglabs actually needs to answer: what the space is, when to come, where it is, and how to get involved.

The project brief still wants a clean public front door that is distinct from the wiki. The wiki remains the deep reference; the public site must be useful on its own.

## Decision

Rebuild the public-facing site information architecture and visual system around first-time visitor orientation.

The redesign will:

1. Make **Bloominglabs** a hero-level brand signal on the home page, not only a header wordmark.
2. Keep the first viewport to brand, one headline, one supporting sentence, one CTA group, and one atmospheric visual plane.
3. Move public hours, address, membership path, and support into clear single-purpose sections below the hero.
4. Replace the cream/serif/terracotta look with a daylight shop-floor system: cool concrete surfaces, leaf-green brand color, plasma-orange accents, birch accents, and a Syne + IBM Plex type pairing.
5. Use a simpler page masthead on interior pages instead of the home hero composition.
6. Keep the existing page set (`/`, `/visit/`, `/membership/`, `/support/`, `/wiki/`) and base-path-aware GitHub Pages deployment.

## Rationale

Visitor usefulness comes from answering orientation questions quickly. A full-bleed brand-first hero establishes place identity; concrete/shop materials ground the design in a real workshop rather than a SaaS landing page. Separating the home composition from interior mastheads lets Visit, Membership, Support, and Wiki stay focused without repeating the landing hero.

## Consequences

1. Layout rendering will diverge between the home page and interior pages.
2. CSS tokens and component classes will change; visual regression against the cream/rust theme is expected and intentional.
3. Copy will emphasize public night, location, membership, and support over site-meta commentary.
4. Wiki browsing remains available but secondary to visitor orientation.

## Success Criteria

1. The home page first viewport is brand-first and does not include a multi-card signal sidebar.
2. Public hours, street address, membership path, and support options are present and easy to find.
3. Generated CSS uses the new token system and Google Fonts pairing rather than the prior cream/rust/serif stack.
4. Existing base-path, wiki archive, and deploy workflows continue to pass the automated suite.
