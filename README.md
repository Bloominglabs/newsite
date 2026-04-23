# Bloominglabs New Site

This repository contains two related deliverables:

1. A static public website for Bloominglabs.
2. A repository-resident preservation snapshot of the current Bloominglabs wiki text content.

## Commands

- `npm test` runs the automated suite with coverage.
- `npm run archive:wiki` refreshes `wiki-archive/latest/` from the live Bloominglabs wiki.
- `npm run build` writes the deployable site to `dist/` and copies the current `wiki-archive/` snapshot into the build output.

## Repository Layout

- `docs/` holds the design document, ADRs, and after-action reports.
- `src/site/` contains the public-site content and generator.
- `src/wiki/` contains wiki archive logic.
- `scripts/` contains thin CLI entry points.
- `wiki-archive/latest/` contains the current preserved wiki snapshot.
- `dist/` is generated output and is intentionally not committed.
