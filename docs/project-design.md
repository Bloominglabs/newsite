# Bloominglabs New Site Design

## Purpose

This repository will host Bloominglabs' new primary public website and an in-repo preservation copy of the current wiki content. The public site must present a clear, approachable view of the organization for visitors, while the wiki continues to hold detailed technical, historical, and governance material.

## Project Goals

1. Publish a static site that can be hosted on GitHub Pages without a server-side runtime.
2. Separate public-facing content from the current mixed-purpose wiki.
3. Preserve existing wiki content inside this repository so Bloominglabs retains an independently hosted copy of its textual knowledge base.
4. Establish a disciplined implementation path that follows ADR-first development and strict automated test coverage.

## Non-Goals For The Initial Slice

1. Rebuilding the wiki as a full replacement application.
2. Migrating every wiki image and attachment in the first implementation slice.
3. Adding dynamic back-end services or a CMS.

## Initial Information Architecture

The first public site release will focus on the small set of pages that a first-time visitor is most likely to need:

1. Home: organization overview, public hours, and key actions.
2. Visit: location, access expectations, and contact routes.
3. Membership: how to join, what membership provides, and public-night expectations.
4. Support: donations and other ways to help.
5. Wiki: explanation of the wiki split, link to the live wiki, and link to the in-repo archive snapshot.

## Delivery Architecture

The site will be generated as static HTML and CSS from version-controlled source data. This keeps deployment compatible with GitHub Pages while keeping content changes reviewable in git.

The wiki preservation copy will be stored separately from the public site output. The first slice will archive textual page content and metadata for the current wiki's main content namespace, plus a manifest that can be used to drive later migration work.

## ADR Roadmap

1. ADR 0001: Zero-dependency static site foundation and textual wiki snapshot.
2. ADR 0002: GitHub Pages deployment and base-path-aware static output.
3. ADR 0003: Public content ownership model and editorial workflow.
4. ADR 0004: Wiki media and attachment preservation strategy.
5. ADR 0005: Event publishing and external service integration.

## Quality Requirements

1. Tests must be written before implementation code for each feature slice.
2. The automated suite must run with coverage enabled.
3. Code must remain dependency-light unless a later ADR justifies additional tooling.
4. Generated output must be reproducible from checked-in source and scripts.
