'use strict';

const { normalizeWikiTitle, titleToWikiFileStem } = require('./github-wiki.js');

/**
 * Escape text nodes before inserting them into generated HTML. Keeping this
 * local avoids pulling a templating dependency into the static site build.
 */
function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

/**
 * MediaWiki uses several spellings for the same page title. The renderer keeps
 * link resolution in one place so archived pages stay consistent with exports.
 */
function resolveInternalLinkTarget(rawTarget, titleMap) {
  const resolved = titleMap.get(normalizeWikiTitle(rawTarget));

  if (resolved) {
    return resolved;
  }

  return titleToWikiFileStem(rawTarget.replace(/_/g, ' '));
}

/**
 * Inline wikitext spans are converted after block structure is known. The caller
 * supplies href resolution so the renderer can stay usable outside the site.
 */
function renderInlineWikitext(text, { titleMap, pageHrefForStem }) {
  const pattern =
    /(\[\[[^[\]|#]+(?:#([^|\]]+))?(?:\|([^\]]+))?\]\]|\[[^\s\]]+\s+[^\]]+\]|'''[^']+'''|''[^']+''|[^[\]'"]+)/g;

  return text.replace(pattern, (segment, _wikiMatch, rawAnchor, rawLabel) => {
    const wikiMatch = segment.match(/^\[\[([^|\]#]+)(?:#([^|\]]+))?(?:\|([^\]]+))?\]\]$/);

    if (wikiMatch) {
      const target = wikiMatch[1].trim();

      if (/^(?:File|Image|Category|Media|Special):/i.test(target)) {
        return `<span class="wiki-file-ref">${escapeHtml(target)}</span>`;
      }

      const stem = resolveInternalLinkTarget(target, titleMap);
      const href = pageHrefForStem(stem);
      const anchor = wikiMatch[2]
        ? `#${escapeHtml(titleToWikiFileStem(wikiMatch[2].replace(/_/g, ' ')))}`
        : '';
      const label = wikiMatch[3] || target.replace(/_/g, ' ');

      return `<a href="${href}${anchor}">${escapeHtml(label)}</a>`;
    }

    const externalMatch = segment.match(/^\[([^\s\]]+)\s+([^\]]+)\]$/);

    if (externalMatch) {
      return `<a href="${escapeHtml(externalMatch[1])}">${escapeHtml(externalMatch[2])}</a>`;
    }

    const boldMatch = segment.match(/^'''([^']+)'''$/);

    if (boldMatch) {
      return `<strong>${escapeHtml(boldMatch[1])}</strong>`;
    }

    const italicMatch = segment.match(/^''([^']+)''$/);

    if (italicMatch) {
      return `<em>${escapeHtml(italicMatch[1])}</em>`;
    }

    return escapeHtml(segment);
  });
}

/**
 * Remove template scaffolding that should never appear in rendered page bodies.
 */
function preprocessWikitext(wikitext) {
  return wikitext
    .replace(/<noinclude>[\s\S]*?<\/noinclude>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/?big>/gi, '')
    .replace(/\r\n/g, '\n');
}

/**
 * Headings use symmetric equals signs in MediaWiki. The captured level maps
 * directly to HTML heading tags with a sensible upper bound.
 */
function renderHeadingLine(line, inlineOptions) {
  const match = line.match(/^(=+)\s*(.*?)\s*\1$/);

  if (!match) {
    return null;
  }

  const level = Math.min(match[1].length, 6);
  return `<h${level}>${renderInlineWikitext(match[2], inlineOptions)}</h${level}>`;
}

/**
 * List rendering preserves MediaWiki indentation semantics by opening and
 * closing nested list tags as depth changes across consecutive items.
 */
function renderListItems(lines, startIndex, listMarker, inlineOptions) {
  const items = [];
  let index = startIndex;
  const markerPattern = listMarker === 'ordered' ? /^#+/ : /^\*+/;

  while (index < lines.length) {
    const line = lines[index];
    const match = line.match(/^([#*]+)\s+(.*)$/);

    if (!match || !markerPattern.test(match[1])) {
      break;
    }

    items.push({ depth: match[1].length, content: renderInlineWikitext(match[2], inlineOptions) });
    index += 1;
  }

  if (items.length === 0) {
    return { html: '', nextIndex: startIndex };
  }

  const tag = listMarker === 'ordered' ? 'ol' : 'ul';
  let html = '';
  let currentDepth = 0;
  let opened = false;

  for (const item of items) {
    if (item.depth > currentDepth) {
      for (let depth = currentDepth; depth < item.depth; depth += 1) {
        html += `<${tag}>`;
      }
    } else if (item.depth < currentDepth) {
      for (let depth = item.depth; depth < currentDepth; depth += 1) {
        html += `</li></${tag}>`;
      }
      html += '</li>';
    } else if (opened) {
      html += '</li>';
    }

    html += `<li>${item.content}`;
    currentDepth = item.depth;
    opened = true;
  }

  for (let depth = 0; depth < currentDepth; depth += 1) {
    html += `</li></${tag}>`;
  }

  return { html, nextIndex: index };
}

/**
 * Simple wikitables are common in meeting notes and workshop signups. This
 * parser handles the subset used across the archive without attempting full
 * template-table compatibility.
 */
function renderTable(lines, startIndex, inlineOptions) {
  const rows = [];
  let index = startIndex + 1;

  while (index < lines.length) {
    const line = lines[index].trim();

    if (line === '|}') {
      index += 1;
      break;
    }

    if (line.startsWith('|-')) {
      index += 1;
      continue;
    }

    if (line.startsWith('|')) {
      const cells = line
        .slice(1)
        .split('||')
        .map((cell) => renderInlineWikitext(cell.trim(), inlineOptions));
      rows.push(cells);
    }

    index += 1;
  }

  if (rows.length === 0) {
    return { html: '', nextIndex: index };
  }

  const bodyRows = rows
    .map((cells) => `<tr>${cells.map((cell) => `<td>${cell}</td>`).join('')}</tr>`)
    .join('');

  return {
    html: `<table class="wiki-table"><tbody>${bodyRows}</tbody></table>`,
    nextIndex: index,
  };
}

/**
 * Convert archived wikitext into HTML suitable for embedding in the static site.
 * Unknown block constructs fall back to paragraphs so content remains readable.
 */
function renderWikitextToHtml(wikitext, options = {}) {
  const {
    titleMap = new Map(),
    pageHrefForStem = (stem) => `/wiki/pages/${stem}/`,
  } = options;
  const inlineOptions = { titleMap, pageHrefForStem };
  const lines = preprocessWikitext(wikitext).split('\n');
  const blocks = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index].trim();

    if (!line) {
      index += 1;
      continue;
    }

    const heading = renderHeadingLine(line, inlineOptions);

    if (heading) {
      blocks.push(heading);
      index += 1;
      continue;
    }

    if (line.startsWith('{|')) {
      const table = renderTable(lines, index, inlineOptions);
      blocks.push(table.html);
      index = table.nextIndex;
      continue;
    }

    if (line.startsWith('*')) {
      const list = renderListItems(lines, index, 'bullet', inlineOptions);

      if (list.nextIndex > index) {
        blocks.push(list.html);
        index = list.nextIndex;
        continue;
      }
    }

    if (line.startsWith('#')) {
      const list = renderListItems(lines, index, 'ordered', inlineOptions);

      if (list.nextIndex > index) {
        blocks.push(list.html);
        index = list.nextIndex;
        continue;
      }
    }

    const paragraphLines = [line];
    index += 1;

    while (index < lines.length) {
      const nextLine = lines[index].trim();

      if (
        !nextLine ||
        renderHeadingLine(nextLine, inlineOptions) ||
        nextLine.startsWith('*') ||
        nextLine.startsWith('#') ||
        nextLine.startsWith('{|')
      ) {
        break;
      }

      paragraphLines.push(nextLine);
      index += 1;
    }

    blocks.push(`<p>${renderInlineWikitext(paragraphLines.join(' '), inlineOptions)}</p>`);
  }

  return blocks.join('\n');
}

module.exports = {
  escapeHtml,
  renderWikitextToHtml,
  resolveInternalLinkTarget,
};
