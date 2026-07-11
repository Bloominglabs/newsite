const test = require('node:test');
const assert = require('node:assert/strict');

const { renderWikitextToHtml } = require('../src/wiki/render.js');

test('renderWikitextToHtml converts headings, emphasis, and external links', () => {
  const html = renderWikitextToHtml(
    "= Top =\n== Section ==\n'''Bold''' and ''italic''\n[https://example.com Example]",
    { pageHrefForStem: () => '/wiki/pages/Home/' }
  );

  assert.match(html, /<h1>Top<\/h1>/);
  assert.match(html, /<h2>Section<\/h2>/);
  assert.match(html, /<strong>Bold<\/strong>/);
  assert.match(html, /<em>italic<\/em>/);
  assert.match(html, /<a href="https:\/\/example.com">Example<\/a>/);
});

test('renderWikitextToHtml converts internal wiki links using the supplied resolver', () => {
  const html = renderWikitextToHtml('See [[Location|our space]] and [[Membership Manual]].', {
    titleMap: new Map([
      ['location', 'Location'],
      ['membership manual', 'Membership-Manual'],
    ]),
    pageHrefForStem: (stem) => `/wiki/pages/${stem}/`,
  });

  assert.match(html, /<a href="\/wiki\/pages\/Location\/">our space<\/a>/);
  assert.match(html, /<a href="\/wiki\/pages\/Membership-Manual\/">Membership Manual<\/a>/);
});

test('renderWikitextToHtml renders bullet lists and strips noinclude blocks', () => {
  const html = renderWikitextToHtml(
    '<noinclude>hidden</noinclude>\n* one\n** nested\n* two',
    { pageHrefForStem: () => '/wiki/pages/Home/' }
  );

  assert.doesNotMatch(html, /hidden/);
  assert.match(html, /<ul>/);
  assert.match(html, /<li>one/);
  assert.match(html, /<li>nested/);
  assert.match(html, /<li>two/);
});

test('renderWikitextToHtml renders ordered lists, tables, and file references', () => {
  const html = renderWikitextToHtml(
    '# first\n# second\n{| class="wikitable"\n|-\n|A||B\n|}',
    { pageHrefForStem: () => '/wiki/pages/Home/' }
  );

  assert.match(html, /<ol>/);
  assert.match(html, /<table class="wiki-table"/);
  assert.match(html, /<td>A<\/td>/);
});

test('renderWikitextToHtml renders file references and heading links with anchors', () => {
  const html = renderWikitextToHtml(
    '[[File:Example.png]]\n= [[Public hours|Public Hours]] =\n[[Home#Stay-informed|Follow us]]',
    {
      titleMap: new Map([
        ['public hours', 'Public-hours'],
        ['home', 'Home'],
      ]),
      pageHrefForStem: (stem) => `/wiki/pages/${stem}/`,
    }
  );

  assert.match(html, /wiki-file-ref/);
  assert.match(html, /<h1><a href="\/wiki\/pages\/Public-hours\/">Public Hours<\/a><\/h1>/);
  assert.match(html, /href="\/wiki\/pages\/Home\/#Stay-informed"/);
});

test('resolveInternalLinkTarget uses the title map when available', () => {
  const { resolveInternalLinkTarget } = require('../src/wiki/render.js');

  assert.equal(
    resolveInternalLinkTarget('Main Page', new Map([['main page', 'Home']])),
    'Home'
  );
});

test('renderWikitextToHtml handles empty tables and multi-line paragraphs', () => {
  const html = renderWikitextToHtml('{|\n|}\nLine one\nLine two', {
    pageHrefForStem: () => '/wiki/pages/Home/',
  });

  assert.match(html, /<p>Line one Line two<\/p>/);
  assert.doesNotMatch(html, /\|\}/);
  assert.doesNotMatch(html, /<table/);
});

test('renderWikitextToHtml falls back to paragraphs for malformed list markers', () => {
  const html = renderWikitextToHtml('*', { pageHrefForStem: () => '/wiki/pages/Home/' });

  assert.match(html, /<p>\*<\/p>/);
});

test('resolveInternalLinkTarget falls back to hyphenated stems for unknown titles', () => {
  const { resolveInternalLinkTarget } = require('../src/wiki/render.js');

  assert.equal(resolveInternalLinkTarget('Unknown Page', new Map()), 'Unknown-Page');
});
