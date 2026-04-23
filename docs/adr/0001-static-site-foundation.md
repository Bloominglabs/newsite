# ADR 0001: Static Site Foundation And Textual Wiki Snapshot

- Status: Accepted
- Date: 2026-04-23

## Context

Bloominglabs needs a new primary website that is distinct from the current wiki. The repository is currently greenfield, the preferred host for the public site is GitHub Pages, and the project brief requires a copy of the current wiki to live in the repository in case wiki hosting changes later.

The existing Bloominglabs wiki currently mixes visitor-oriented information with detailed member, governance, and project material. A new public site therefore needs to be easy to deploy, easy to review, and explicit about where public-facing content ends and the wiki begins.

## Decision

The project will begin with a zero-dependency Node-based static site generator that writes deployable files into `dist/`.

The initial implementation will:

1. Keep public content in version-controlled source modules so content edits are reviewable.
2. Generate a small public-facing site composed of static HTML pages and a shared stylesheet.
3. Use Node's built-in test runner and coverage support to keep the toolchain lightweight.
4. Preserve the current wiki's textual content and metadata in a dedicated `wiki-archive/` tree that is separate from the public site output.
5. Limit the first archive slice to main-namespace textual pages plus a manifest, leaving media asset preservation to a later ADR.

## Rationale

GitHub Pages strongly favors static output. A small custom generator avoids premature framework lock-in and external dependency churn while the site's information architecture is still taking shape.

Archiving textual wiki content now reduces migration risk immediately. Text pages capture the most important durable knowledge and are small enough to keep in git. Images and attachments matter, but they can be addressed with a dedicated follow-on decision once the public site foundation is in place.

## Consequences

### Positive

1. The public site remains easy to deploy on GitHub Pages.
2. The build and test chain works on a stock Node installation.
3. Public content structure is explicit and easy to revise.
4. The repository gains an immediate preservation mechanism for the current wiki's text content.

### Negative

1. The project does not initially benefit from framework conveniences such as templating ecosystems or content pipelines.
2. The first wiki archive slice does not yet preserve binary assets.
3. Some build logic that a framework would normally provide must be maintained locally.

## Success Criteria

1. A visitor can build the site locally and inspect a coherent set of public-facing pages.
2. The build output is static and GitHub Pages compatible.
3. The test suite fails before implementation and passes after implementation.
4. The repository contains a generated textual snapshot of the current Bloominglabs wiki content in a dedicated archive location.

## Follow-Up

1. Decide how wiki media and attachments should be mirrored.
2. Define the editorial workflow for keeping public site content synchronized with Bloominglabs operations.
3. Evaluate whether a larger static-site framework is justified once the content model stabilizes.
