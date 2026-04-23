const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

const { buildSiteFiles, writeSite } = require('../src/site/build.js');

test('buildSiteFiles returns the expected public page set', () => {
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

test('home page highlights public hours, Makevention, and the wiki split', () => {
  const files = buildSiteFiles();
  const home = files.find((file) => file.path === 'index.html');

  assert.ok(home);
  assert.match(home.contents, /Wednesday evenings from 7pm until 10pm/i);
  assert.match(home.contents, /Makevention/i);
  assert.match(home.contents, /public-facing site/i);
  assert.match(home.contents, /wiki remains the full reference/i);
});

test('membership page explains the path to joining and member access', () => {
  const files = buildSiteFiles();
  const membership = files.find((file) => file.path === 'membership/index.html');

  assert.ok(membership);
  assert.match(membership.contents, /attend 3 meetings or workshops/i);
  assert.match(membership.contents, /24\/7 access/i);
  assert.match(membership.contents, /public night/i);
});

test('wiki page links both to the live wiki and to the local archive manifest', () => {
  const files = buildSiteFiles();
  const wiki = files.find((file) => file.path === 'wiki/index.html');

  assert.ok(wiki);
  assert.match(wiki.contents, /https:\/\/www\.bloominglabs\.org\/Main_Page/);
  assert.match(wiki.contents, /\/wiki-archive\/latest\/manifest\.json/);
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
    assert.match(styleContents, /--color-rust:/);
    assert.match(styleContents, /font-family:\s*"Iowan Old Style"/);
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
      JSON.stringify({ pageCount: 1 }, null, 2),
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
