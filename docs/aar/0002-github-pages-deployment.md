# AAR 0002: GitHub Pages Deployment And Base-Path-Aware Static Output

- Date: 2026-04-23
- Related ADR: [ADR 0002](../adr/0002-github-pages-deployment.md)

## Outcome

ADR 0002 succeeded.

## What Landed

1. The static site generator now supports a configurable deployment base path for repository-scoped GitHub Pages URLs.
2. The repository contains a GitHub Actions workflow that tests, builds, uploads, and deploys the site to GitHub Pages.
3. The deployment build publishes the checked-in wiki archive snapshot alongside the public site pages.
4. The repository's GitHub Pages configuration now uses workflow-based deployment from `master`.

## Measured Results

1. GitHub Actions deployment run `24825628711` completed successfully on 2026-04-23.
2. The published site is live at `https://bloominglabs.github.io/newsite/`.
3. The site root, `/wiki/`, and `/wiki-archive/latest/manifest.json` all returned HTTP `200` immediately after deployment verification.

## What We Learned

1. Enabling GitHub Pages after pushing the workflow was not sufficient by itself; the repository default branch still pointed at `adr-0001-static-site-foundation`, which caused environment protection mismatches.
2. The automatically created `github-pages` environment inherited a stale branch allowlist and initially allowed only `adr-0001-static-site-foundation`. Explicitly allowing `master` was required before the deploy job could proceed.
3. GitHub emitted a Node 20 deprecation warning for some Pages-related JavaScript actions, so the workflow now opts into Node 24 execution explicitly to reduce near-term platform churn.

## Follow-Up

1. Remove any stale branch allowlists from the `github-pages` environment that are no longer needed after the switch to `master`.
2. If Bloominglabs adopts a custom domain later, add the `CNAME` workflow and domain verification as a dedicated follow-on change.
3. Continue with ADR 0003 for public content ownership and editorial workflow.
