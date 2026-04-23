# ADR 0002: GitHub Pages Deployment And Base-Path-Aware Static Output

- Status: Accepted
- Date: 2026-04-23

## Context

ADR 0001 established a static public site and a repository-resident textual wiki snapshot, but the repository does not yet publish that site to GitHub Pages. The public Pages endpoint for the repository currently returns `404`.

Because the repository name is `newsite`, the GitHub Pages URL for a repository site will be hosted beneath `/newsite` unless and until Bloominglabs configures a custom domain. The current static generator emits root-anchored internal links such as `/visit/` and `/wiki-archive/latest/manifest.json`, which would break when served from a project-site path prefix.

The deployment path also needs to remain reproducible and avoid depending on a live network fetch to Bloominglabs' wiki during every publication. The repository already contains a checked-in archive snapshot, so deployment can build from version-controlled inputs alone.

## Decision

The project will publish the site to GitHub Pages using an official GitHub Actions workflow and will make the static generator base-path-aware.

The implementation will:

1. Add a GitHub Actions workflow that tests, builds, uploads the `dist/` artifact, and deploys it with the official GitHub Pages actions.
2. Use `actions/configure-pages` metadata so the build can derive the correct GitHub Pages base path at workflow runtime.
3. Update internal site links and asset references to honor a configurable base path.
4. Keep the checked-in wiki archive as the deploy input for archive content instead of refreshing the archive during every deployment.
5. Configure the repository's GitHub Pages settings to use the workflow-based build type.

## Rationale

GitHub's current Pages documentation recommends a custom GitHub Actions workflow when a site requires a build process rather than a simple branch publication. That fits this repository because the public site is generated into `dist/` and because the deployable output must include the copied wiki archive.

Base-path-aware output is required for a repository-scoped Pages URL. Without it, project-site navigation would incorrectly target the domain root instead of the repository subpath.

Avoiding live wiki refreshes during deployment keeps the site publish path deterministic and limits failures caused by upstream network or API instability.

## Consequences

### Positive

1. The repository can publish directly to GitHub Pages without committing generated `dist/` output.
2. Internal navigation works both locally and from the repository Pages URL.
3. The deployment build depends only on checked-in source and archive data.
4. Bloominglabs can later switch to a custom domain without rewriting the generator again.

### Negative

1. The build must now carry explicit base-path logic instead of assuming root hosting.
2. The checked-in wiki archive can become stale if it is not refreshed intentionally.
3. GitHub Pages configuration now spans both repository code and repository settings.

## Success Criteria

1. The repository contains a working GitHub Pages deployment workflow using official GitHub actions.
2. Generated internal links resolve correctly when the site is built for `/newsite`.
3. The deployment build copies the checked-in wiki archive into `dist/`.
4. The repository's GitHub Pages settings are configured to use workflow-based deployment.

## Follow-Up

1. Define the process for refreshing the checked-in wiki archive on a deliberate cadence.
2. Decide whether Bloominglabs will eventually attach a custom domain and `CNAME`.
3. Continue with ADR 0003 for public content ownership and editorial workflow.
