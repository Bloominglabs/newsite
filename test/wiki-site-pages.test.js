const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

const { buildWikiSiteFiles, siteWikiPageStemForTitle } = require('../src/wiki/site-pages.js');

test('siteWikiPageStemForTitle maps Main Page to Home', () => {
  assert.equal(siteWikiPageStemForTitle('Main Page'), 'Home');
  assert.equal(siteWikiPageStemForTitle('Membership Manual'), 'Membership-Manual');
});

test('buildWikiSiteFiles renders archive pages and a wiki index', async () => {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'blabs-wiki-site-'));
  const archiveRoot = path.join(tempRoot, 'wiki-archive', 'latest');

  await fs.mkdir(path.join(archiveRoot, 'pages'), { recursive: true });
  await fs.writeFile(
    path.join(archiveRoot, 'manifest.json'),
    JSON.stringify(
      {
        pageCount: 2,
        pages: [
          { title: 'Main Page', file: 'pages/Main_Page.json' },
          { title: 'Location', file: 'pages/Location.json' },
        ],
      },
      null,
      2
    ),
    'utf8'
  );
  await fs.writeFile(
    path.join(archiveRoot, 'pages', 'Main_Page.json'),
    JSON.stringify({
      title: 'Main Page',
      revision: { content: 'Welcome [[Location|here]].\n{{:Upcoming Workshops}}' },
    }),
    'utf8'
  );
  await fs.writeFile(
    path.join(archiveRoot, 'pages', 'Location.json'),
    JSON.stringify({
      title: 'Location',
      revision: { content: '1840 S. Walnut Street' },
    }),
    'utf8'
  );
  await fs.writeFile(
    path.join(archiveRoot, 'pages', 'Upcoming_Workshops.json'),
    JSON.stringify({
      title: 'Upcoming Workshops',
      revision: { content: '<noinclude>meta</noinclude>\n== March ==\n* workshop' },
    }),
    'utf8'
  );

  const files = await buildWikiSiteFiles({ archiveRoot, basePath: '/newsite' });
  const paths = files.files.map((file) => file.path).sort();

  assert.deepEqual(paths, ['wiki/pages/Home/index.html', 'wiki/pages/Location/index.html']);

  const home = files.files.find((file) => file.path === 'wiki/pages/Home/index.html');

  assert.match(home.contents, /href="\/newsite\/wiki\/pages\/Location\/">here<\/a>/);
  assert.match(home.contents, /<h2>March<\/h2>/);
});

test('buildWikiSiteFiles rejects manifest entries without archived records', async () => {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'blabs-wiki-site-missing-'));
  const archiveRoot = path.join(tempRoot, 'wiki-archive', 'latest');

  await fs.mkdir(path.join(archiveRoot, 'pages'), { recursive: true });
  await fs.writeFile(
    path.join(archiveRoot, 'manifest.json'),
    JSON.stringify({ pages: [{ title: 'Missing Page', file: 'pages/Missing_Page.json' }] }),
    'utf8'
  );
  await fs.writeFile(path.join(archiveRoot, 'pages', 'README.txt'), 'ignore me', 'utf8');

  await assert.rejects(
    () => buildWikiSiteFiles({ archiveRoot }),
    /Manifest entry "Missing Page" has no archived page record/
  );
});
