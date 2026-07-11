# Bloominglabs New Site

This repository contains two related deliverables:

1. A static public website for Bloominglabs.
2. A repository-resident preservation snapshot of the current Bloominglabs wiki text content.

## Commands

- `npm test` runs the automated suite with coverage.
- `npm run archive:wiki` refreshes `wiki-archive/latest/` from the live Bloominglabs wiki.
- `npm run migrate:github-wiki` generates `wiki/` from the checked-in archive for GitHub wiki publication.
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

## GitHub Wiki

The migrated wiki lives in `wiki/` as `.mediawiki` files generated from `wiki-archive/latest/`.

- `npm run migrate:github-wiki` regenerates `wiki/` locally.
- `.github/workflows/publish-wiki.yml` publishes `wiki/` to [the repository wiki](https://github.com/Bloominglabs/newsite/wiki).

GitHub creates the hidden `newsite.wiki.git` backend only after the first wiki page is saved in the browser. Until that one-time bootstrap happens, automated publish runs will stop at the backend check. To bootstrap:

1. Open [Create the first wiki page](https://github.com/Bloominglabs/newsite/wiki/_new).
2. Save a placeholder `Home` page.
3. Re-run the **Publish GitHub Wiki** workflow (or push another change under `wiki/`).

After bootstrap, the workflow keeps the GitHub wiki in sync with the checked-in export.

## Repository Layout

- `docs/` holds the design document, ADRs, and after-action reports.
- `src/site/` contains the public-site content and generator.
- `src/wiki/` contains wiki archive and GitHub wiki migration logic.
- `scripts/` contains thin CLI entry points.
- `wiki/` contains the generated GitHub wiki export (published by `publish-wiki.yml`).
- `wiki-archive/latest/` contains the current preserved wiki snapshot.
- `dist/` is generated output and is intentionally not committed.
