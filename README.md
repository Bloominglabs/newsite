# Bloominglabs New Site

This repository contains two related deliverables:

1. A static public website for Bloominglabs.
2. A repository-resident preservation snapshot of the current Bloominglabs wiki text content.

## Commands

- `npm test` runs the automated suite with coverage.
- `npm run archive:wiki` refreshes `wiki-archive/latest/` from the live Bloominglabs wiki.
- `npm run build` writes the deployable site to `dist/` and copies the current `wiki-archive/` snapshot into the build output.
- `BASE_PATH=/newsite npm run build` simulates the repository GitHub Pages URL locally.

## Deployment

GitHub Pages deployment is handled by [deploy-pages.yml](/home/jpt4/constructs/blbs/newsite/.github/workflows/deploy-pages.yml).

The workflow:

1. Uses GitHub's official Pages actions.
2. Runs the test suite before building.
3. Builds the site with the base path reported by `actions/configure-pages`.
4. Publishes the checked-in wiki archive snapshot as part of the deployed artifact.

The deployment workflow intentionally does not refresh the live wiki archive on every push. Archive refreshes are a separate deliberate action so site publication does not depend on external wiki availability.

## Repository Layout

- `docs/` holds the design document, ADRs, and after-action reports.
- `src/site/` contains the public-site content and generator.
- `src/wiki/` contains wiki archive logic.
- `scripts/` contains thin CLI entry points.
- `wiki-archive/latest/` contains the current preserved wiki snapshot.
- `dist/` is generated output and is intentionally not committed.
