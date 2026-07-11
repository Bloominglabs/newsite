const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

const { buildSiteFiles, normalizeBasePath, writeSite } = require('../src/site/build.js');

test('buildSiteFiles returns the single page, stylesheet, and redirect stubs', () => {
  const files = buildSiteFiles();
  const paths = files.map((file) => file.path).sort();

  assert.deepEqual(paths, [
    'assets/site.css',
    'index.html',
    'membership/index.html',
    'support/index.html',
    'visit/index.html',
    'wiki/index.html',
  ]);
});

test('home page is a single document with anchor sections and GitHub wiki nav', () => {
  const files = buildSiteFiles();
  const home = files.find((file) => file.path === 'index.html');

  assert.ok(home);
  assert.match(home.contents, /class="hero hero-home"/);
  assert.match(home.contents, /id="home"/);
  assert.match(home.contents, /id="visit"/);
  assert.match(home.contents, /id="membership"/);
  assert.match(home.contents, /id="support"/);
  assert.match(home.contents, /href="#visit"/);
  assert.match(home.contents, /href="#membership"/);
  assert.match(home.contents, /href="#support"/);
  assert.match(home.contents, /https:\/\/github\.com\/Bloominglabs\/newsite\/wiki/);
  assert.match(home.contents, /Wednesday/i);
  assert.match(home.contents, /1840 S\. Walnut Street/);
  assert.match(home.contents, /Attend three meetings or workshops/i);
  assert.match(home.contents, /24\/7 access/i);
  assert.match(home.contents, /https:\/\/github\.com\/Bloominglabs\/newsite\/wiki\/Membership-Manual/);
  assert.match(home.contents, /https:\/\/github\.com\/Bloominglabs\/newsite\/wiki\/Donations/);
  assert.doesNotMatch(home.contents, /href="\/wiki\/"/);
  assert.doesNotMatch(home.contents, /href="\/visit\/"/);
});

test('legacy paths redirect to anchors or the GitHub wiki', () => {
  const files = buildSiteFiles();
  const visit = files.find((file) => file.path === 'visit/index.html');
  const membership = files.find((file) => file.path === 'membership/index.html');
  const support = files.find((file) => file.path === 'support/index.html');
  const wiki = files.find((file) => file.path === 'wiki/index.html');

  assert.match(visit.contents, /url=#visit/);
  assert.match(membership.contents, /url=#membership/);
  assert.match(support.contents, /url=#support/);
  assert.match(wiki.contents, /url=https:\/\/github\.com\/Bloominglabs\/newsite\/wiki/);
});

test('public site copy stays plain and avoids brochure filler', () => {
  const files = buildSiteFiles();
  const pages = files.filter((file) => file.path.endsWith('.html')).map((file) => file.contents);
  const joined = pages.join('\n');

  for (const banned of [
    /front door/i,
    /best way to see current activity/i,
    /Get involved/,
    /Stay in touch/,
    /Why it matters/,
    /deep reference lives here/i,
    /Membership is a relationship/i,
    /checkout form/i,
    /public programming/i,
    /Not sure yet\?/,
  ]) {
    assert.doesNotMatch(joined, banned);
  }
});

test('normalizeBasePath canonicalizes empty and nested path prefixes', () => {
  assert.equal(normalizeBasePath(), '');
  assert.equal(normalizeBasePath('/'), '');
  assert.equal(normalizeBasePath('newsite'), '/newsite');
  assert.equal(normalizeBasePath('/newsite/'), '/newsite');
  assert.equal(normalizeBasePath('org/newsite'), '/org/newsite');
});

test('buildSiteFiles prefixes assets and anchors for a GitHub Pages project path', () => {
  const files = buildSiteFiles({ basePath: '/newsite' });
  const home = files.find((file) => file.path === 'index.html');
  const visit = files.find((file) => file.path === 'visit/index.html');
  const wiki = files.find((file) => file.path === 'wiki/index.html');

  assert.ok(home);
  assert.match(home.contents, /href="\/newsite\/assets\/site\.css"/);
  assert.match(home.contents, /href="\/newsite#visit"/);
  assert.match(home.contents, /href="\/newsite#membership"/);
  assert.match(visit.contents, /url=\/newsite#visit/);
  assert.match(wiki.contents, /url=https:\/\/github\.com\/Bloominglabs\/newsite\/wiki/);
});

test('writeSite materializes the generated files on disk', async () => {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'blabs-site-'));

  try {
    const writtenFiles = await writeSite(tempRoot);
    const expectedPaths = writtenFiles.map((file) => file.path).sort();

    assert.deepEqual(expectedPaths, [
      'assets/site.css',
      'index.html',
      'membership/index.html',
      'support/index.html',
      'visit/index.html',
      'wiki/index.html',
    ]);

    const homeContents = await fs.readFile(path.join(tempRoot, 'index.html'), 'utf8');
    const styleContents = await fs.readFile(path.join(tempRoot, 'assets/site.css'), 'utf8');

    assert.match(homeContents, /Bloominglabs/);
    assert.match(homeContents, /id="visit"/);
    assert.match(styleContents, /--color-bloom:/);
    assert.match(styleContents, /--color-spark:/);
    assert.match(styleContents, /--font-display:\s*"Syne"/);
    assert.match(styleContents, /--font-body:\s*"IBM Plex Sans"/);
    assert.match(styleContents, /overflow-x:\s*clip/);
    assert.doesNotMatch(styleContents, /--content-width:[^;]*100vw/);
    assert.match(styleContents, /@keyframes/);
    assert.match(styleContents, /prefers-reduced-motion/);
  } finally {
    await fs.rm(tempRoot, { recursive: true, force: true });
  }
});

test('writeSite renders pages with a provided base path', async () => {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'blabs-site-base-path-'));

  try {
    await writeSite(tempRoot, { basePath: '/newsite' });

    const homeContents = await fs.readFile(path.join(tempRoot, 'index.html'), 'utf8');
    const wikiContents = await fs.readFile(path.join(tempRoot, 'wiki', 'index.html'), 'utf8');

    assert.match(homeContents, /href="\/newsite\/assets\/site\.css"/);
    assert.match(homeContents, /href="\/newsite#visit"/);
    assert.match(wikiContents, /url=https:\/\/github\.com\/Bloominglabs\/newsite\/wiki/);
  } finally {
    await fs.rm(tempRoot, { recursive: true, force: true });
  }
});

test('writeSite copies an existing wiki archive into the deployable output', async () => {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'blabs-site-archive-'));
  const archiveRoot = path.join(tempRoot, 'wiki-archive');

  try {
    await fs.mkdir(path.join(archiveRoot, 'latest', 'pages'), { recursive: true });
    await fs.writeFile(
      path.join(archiveRoot, 'latest', 'manifest.json'),
      JSON.stringify(
        {
          pageCount: 1,
          pages: [{ title: 'Main Page', file: 'pages/Main_Page.json' }],
        },
        null,
        2
      ),
      'utf8'
    );
    await fs.writeFile(
      path.join(archiveRoot, 'latest', 'pages', 'Main_Page.json'),
      JSON.stringify({ title: 'Main Page' }, null, 2),
      'utf8'
    );

    await writeSite(path.join(tempRoot, 'dist'), { archiveRoot });

    const copiedManifest = JSON.parse(
      await fs.readFile(path.join(tempRoot, 'dist', 'wiki-archive', 'latest', 'manifest.json'), 'utf8')
    );
    const copiedPage = JSON.parse(
      await fs.readFile(path.join(tempRoot, 'dist', 'wiki-archive', 'latest', 'pages', 'Main_Page.json'), 'utf8')
    );

    assert.equal(copiedManifest.pageCount, 1);
    assert.equal(copiedPage.title, 'Main Page');
  } finally {
    await fs.rm(tempRoot, { recursive: true, force: true });
  }
});

test('writeSite tolerates a missing wiki archive source path', async () => {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'blabs-site-missing-archive-'));

  try {
    await writeSite(path.join(tempRoot, 'dist'), {
      archiveRoot: path.join(tempRoot, 'does-not-exist'),
    });

    const homeContents = await fs.readFile(path.join(tempRoot, 'dist', 'index.html'), 'utf8');
    assert.match(homeContents, /Bloominglabs/);
  } finally {
    await fs.rm(tempRoot, { recursive: true, force: true });
  }
});

test('writeSite no longer emits browsable on-site wiki article pages', async () => {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'blabs-site-wiki-pages-'));
  const archiveRoot = path.join(tempRoot, 'wiki-archive');

  try {
    await fs.mkdir(path.join(archiveRoot, 'latest', 'pages'), { recursive: true });
    await fs.writeFile(
      path.join(archiveRoot, 'latest', 'manifest.json'),
      JSON.stringify(
        {
          pageCount: 1,
          pages: [{ title: 'Main Page', file: 'pages/Main_Page.json' }],
        },
        null,
        2
      ),
      'utf8'
    );
    await fs.writeFile(
      path.join(archiveRoot, 'latest', 'pages', 'Main_Page.json'),
      JSON.stringify({
        title: 'Main Page',
        revision: { content: '= Welcome =\nVisit [[Location]].' },
      }),
      'utf8'
    );

    const writtenFiles = await writeSite(path.join(tempRoot, 'dist'), { archiveRoot, basePath: '/newsite' });
    const paths = writtenFiles.map((file) => file.path);

    assert.equal(paths.some((filePath) => filePath.startsWith('wiki/pages/')), false);
    assert.ok(paths.includes('wiki/index.html'));

    const wikiIndex = await fs.readFile(path.join(tempRoot, 'dist', 'wiki', 'index.html'), 'utf8');
    assert.match(wikiIndex, /url=https:\/\/github\.com\/Bloominglabs\/newsite\/wiki/);
  } finally {
    await fs.rm(tempRoot, { recursive: true, force: true });
  }
});

test('writeSite skips wiki article generation when the archive manifest is absent', async () => {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'blabs-site-no-manifest-'));
  const archiveRoot = path.join(tempRoot, 'wiki-archive');

  try {
    await fs.mkdir(archiveRoot, { recursive: true });
    const writtenFiles = await writeSite(path.join(tempRoot, 'dist'), { archiveRoot });
    const paths = writtenFiles.map((file) => file.path);

    assert.ok(paths.includes('wiki/index.html'));
    assert.equal(paths.some((filePath) => filePath.startsWith('wiki/pages/')), false);
  } finally {
    await fs.rm(tempRoot, { recursive: true, force: true });
  }
});

test('writeSite rethrows archive copy failures that are not missing-path cases', async () => {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'blabs-site-copy-failure-'));
  const archiveRoot = path.join(tempRoot, 'wiki-archive');
  const originalCp = fs.cp;

  try {
    await fs.mkdir(archiveRoot, { recursive: true });
    fs.cp = async () => {
      const error = new Error('copy failed');
      error.code = 'EACCES';
      throw error;
    };

    await assert.rejects(
      writeSite(path.join(tempRoot, 'dist'), { archiveRoot }),
      /copy failed/
    );
  } finally {
    fs.cp = originalCp;
    await fs.rm(tempRoot, { recursive: true, force: true });
  }
});
