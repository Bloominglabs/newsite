'use strict';

/**
 * GitHub Pages repository sites are served beneath a repository-specific base
 * path such as `/newsite`. Normalizing that prefix once keeps link generation
 * consistent across local builds, project Pages URLs, and future custom-domain
 * deployments where the base path becomes empty again.
 */
function normalizeBasePath(basePath = '') {
  const trimmedPath = String(basePath).trim();

  if (!trimmedPath || trimmedPath === '/') {
    return '';
  }

  return `/${trimmedPath.replace(/^\/+|\/+$/g, '')}`;
}

/**
 * Internal site links are rooted from `/`, while external URLs and non-HTTP
 * schemes such as `mailto:` must pass through untouched.
 */
function toPublicHref(href, basePath) {
  if (!href.startsWith('/')) {
    return href;
  }

  return `${normalizeBasePath(basePath)}${href}`;
}

module.exports = {
  normalizeBasePath,
  toPublicHref,
};
