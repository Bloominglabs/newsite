const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

const {
  collectMainNamespacePages,
  sanitizeTitleForPath,
  writeArchiveSnapshot,
} = require('../src/wiki/archive.js');

test('sanitizeTitleForPath creates stable ascii archive filenames', () => {
  assert.equal(sanitizeTitleForPath('Main Page'), 'Main_Page');
  assert.equal(sanitizeTitleForPath('RFID/System Software'), 'RFID_System_Software');
  assert.equal(sanitizeTitleForPath('A title with ? punctuation!'), 'A_title_with_punctuation');
});

test('collectMainNamespacePages follows API pagination and keeps title order stable', async () => {
  const responses = [
    {
      batchcomplete: false,
      continue: { apcontinue: 'Membership Manual', continue: '-||' },
      query: {
        allpages: [
          { pageid: 1, ns: 0, title: 'Main Page' },
          { pageid: 2, ns: 0, title: 'Location' },
        ],
      },
    },
    {
      batchcomplete: true,
      query: {
        allpages: [
          { pageid: 3, ns: 0, title: 'Membership Manual' },
        ],
      },
    },
  ];

  const fetchImpl = async () => ({
    ok: true,
    async json() {
      return responses.shift();
    },
  });

  const pages = await collectMainNamespacePages({
    apiRoot: 'https://www.bloominglabs.org/api.php',
    fetchImpl,
  });

  assert.deepEqual(
    pages.map((page) => page.title),
    ['Location', 'Main Page', 'Membership Manual']
  );
});

test('collectMainNamespacePages surfaces HTTP failures with the request status', async () => {
  const fetchImpl = async () => ({
    ok: false,
    status: 503,
  });

  await assert.rejects(
    collectMainNamespacePages({
      apiRoot: 'https://www.bloominglabs.org/api.php',
      fetchImpl,
    }),
    /status 503/
  );
});

test('writeArchiveSnapshot writes a manifest and one JSON file per archived page', async () => {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'blabs-archive-'));
  const titleQueries = [];

  const fetchImpl = async (url) => {
    const parsed = new URL(url);
    const query = parsed.searchParams;

    if (query.get('list') === 'allpages') {
      return {
        ok: true,
        async json() {
          return {
            batchcomplete: true,
            query: {
              allpages: [
                { pageid: 1, ns: 0, title: 'Main Page' },
                { pageid: 2, ns: 0, title: 'Membership Manual' },
              ],
            },
          };
        },
      };
    }

    const title = query.get('titles');
    titleQueries.push(title);

    return {
      ok: true,
      async json() {
        return {
          batchcomplete: true,
          query: {
            pages: [
              {
                pageid: title === 'Main Page' ? 1 : 2,
                ns: 0,
                title,
                revisions: [
                  {
                    revid: title === 'Main Page' ? 100 : 101,
                    timestamp: '2026-04-23T00:00:00Z',
                    slots: {
                      main: {
                        contentmodel: 'wikitext',
                        contentformat: 'text/x-wiki',
                        content: `content for ${title}`,
                      },
                    },
                  },
                ],
              },
            ],
          },
        };
      },
    };
  };

  try {
    const summary = await writeArchiveSnapshot({
      apiRoot: 'https://www.bloominglabs.org/api.php',
      baseUrl: 'https://www.bloominglabs.org',
      fetchImpl,
      outputRoot: tempRoot,
      snapshotLabel: 'latest',
      generatedAt: '2026-04-23T00:00:00Z',
    });

    assert.equal(summary.pageCount, 2);
    assert.deepEqual(titleQueries, ['Main Page', 'Membership Manual']);

    const manifestPath = path.join(tempRoot, 'latest', 'manifest.json');
    const mainPagePath = path.join(tempRoot, 'latest', 'pages', 'Main_Page.json');
    const membershipPath = path.join(tempRoot, 'latest', 'pages', 'Membership_Manual.json');

    const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
    const mainPage = JSON.parse(await fs.readFile(mainPagePath, 'utf8'));
    const membershipPage = JSON.parse(await fs.readFile(membershipPath, 'utf8'));

    assert.equal(manifest.pageCount, 2);
    assert.equal(manifest.pages[0].title, 'Main Page');
    assert.equal(mainPage.revision.id, 100);
    assert.equal(membershipPage.revision.content, 'content for Membership Manual');
  } finally {
    await fs.rm(tempRoot, { recursive: true, force: true });
  }
});

test('writeArchiveSnapshot records skipped titles when revision data is missing', async () => {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'blabs-archive-missing-'));

  const fetchImpl = async (url) => {
    const parsed = new URL(url);
    const query = parsed.searchParams;

    if (query.get('list') === 'allpages') {
      return {
        ok: true,
        async json() {
          return {
            batchcomplete: true,
            query: {
              allpages: [{ pageid: 1, ns: 0, title: 'Broken Page' }],
            },
          };
        },
      };
    }

    return {
      ok: true,
      async json() {
        return {
          batchcomplete: true,
          query: {
            pages: [{ pageid: 1, ns: 0, title: 'Broken Page' }],
          },
        };
      },
    };
  };

  try {
    const summary = await writeArchiveSnapshot({
        apiRoot: 'https://www.bloominglabs.org/api.php',
        baseUrl: 'https://www.bloominglabs.org',
        fetchImpl,
        outputRoot: tempRoot,
        snapshotLabel: 'latest',
        generatedAt: '2026-04-23T00:00:00Z',
      });

    const manifestPath = path.join(tempRoot, 'latest', 'manifest.json');
    const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));

    assert.equal(summary.pageCount, 0);
    assert.equal(summary.skippedCount, 1);
    assert.equal(manifest.skippedPages[0].title, 'Broken Page');
    assert.match(manifest.skippedPages[0].reason, /No revision data returned/);
  } finally {
    await fs.rm(tempRoot, { recursive: true, force: true });
  }
});

test('writeArchiveSnapshot rethrows non-revision transport failures', async () => {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'blabs-archive-error-'));

  const fetchImpl = async (url) => {
    const parsed = new URL(url);
    const query = parsed.searchParams;

    if (query.get('list') === 'allpages') {
      return {
        ok: true,
        async json() {
          return {
            batchcomplete: true,
            query: {
              allpages: [{ pageid: 1, ns: 0, title: 'Main Page' }],
            },
          };
        },
      };
    }

    return {
      ok: false,
      status: 502,
    };
  };

  try {
    await assert.rejects(
      writeArchiveSnapshot({
        apiRoot: 'https://www.bloominglabs.org/api.php',
        baseUrl: 'https://www.bloominglabs.org',
        fetchImpl,
        outputRoot: tempRoot,
        snapshotLabel: 'latest',
        generatedAt: '2026-04-23T00:00:00Z',
      }),
      /status 502/
    );
  } finally {
    await fs.rm(tempRoot, { recursive: true, force: true });
  }
});
