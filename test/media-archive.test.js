const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

const {
  sanitizeMediaFileName,
  collectMediaTitlesFromWikitext,
  collectAllImageTitles,
  writeMediaArchive,
  buildMediaPathIndex,
} = require('../src/wiki/media-archive.js');

test('sanitizeMediaFileName keeps extensions and flattens awkward titles', () => {
  assert.equal(sanitizeMediaFileName('Bloominglabsaerial.png'), 'Bloominglabsaerial.png');
  assert.equal(sanitizeMediaFileName('Plant tower.jpg'), 'Plant_tower.jpg');
  assert.equal(
    sanitizeMediaFileName('RELEASE AND WAIVER OF LIABILITY.pdf'),
    'RELEASE_AND_WAIVER_OF_LIABILITY.pdf'
  );
});

test('collectMediaTitlesFromWikitext finds File links and Special:FilePath URLs', () => {
  const titles = collectMediaTitlesFromWikitext(`
    [[File:Bloominglabsaerial.png|thumb]]
    [[Image:Plant tower.jpg]]
    https://www.bloominglabs.org/Special:FilePath/Blabs_main_entrance.jpg
  `);

  assert.deepEqual(
    [...titles].sort(),
    ['Blabs main entrance.jpg', 'Bloominglabsaerial.png', 'Plant tower.jpg'].sort()
  );
});

test('collectAllImageTitles walks MediaWiki allimages continuation', async () => {
  const calls = [];
  const fetchImpl = async (url) => {
    calls.push(url);
    if (calls.length === 1) {
      return {
        ok: true,
        async json() {
          return {
            continue: { aicontinue: 'next', continue: '-||' },
            query: {
              allimages: [{ name: 'One.png', url: 'https://example.test/One.png', size: 10 }],
            },
          };
        },
      };
    }

    return {
      ok: true,
      async json() {
        return {
          query: {
            allimages: [{ name: 'Two.jpg', url: 'https://example.test/Two.jpg', size: 20 }],
          },
        };
      },
    };
  };

  const images = await collectAllImageTitles({
    apiRoot: 'https://example.test/api.php',
    fetchImpl,
  });

  assert.equal(images.length, 2);
  assert.equal(images[0].title, 'One.png');
  assert.equal(images[1].title, 'Two.jpg');
  assert.match(calls[1], /aicontinue=next/);
});

test('writeMediaArchive downloads binaries and writes a media manifest', async () => {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'blabs-media-archive-'));
  const archiveRoot = path.join(tempRoot, 'latest');
  await fs.mkdir(archiveRoot, { recursive: true });

  const fetchImpl = async () => ({
    ok: true,
    async json() {
      return {
        query: {
          allimages: [
            {
              name: 'Aerial.png',
              url: 'https://example.test/Aerial.png',
              mime: 'image/png',
              size: 4,
              sha1: 'abc',
              timestamp: '2026-01-01T00:00:00Z',
            },
          ],
        },
      };
    },
  });

  const downloadImpl = async (url, destination) => {
    assert.equal(url, 'https://example.test/Aerial.png');
    await fs.mkdir(path.dirname(destination), { recursive: true });
    await fs.writeFile(destination, 'PNG!');
  };

  const manifest = await writeMediaArchive({
    apiRoot: 'https://example.test/api.php',
    archiveRoot,
    fetchImpl,
    downloadImpl,
    pageRecords: [{ revision: { content: '[[File:Aerial.png]]' } }],
  });

  assert.equal(manifest.fileCount, 1);
  assert.equal(manifest.files[0].localPath, 'media/Aerial.png');
  assert.equal(await fs.readFile(path.join(archiveRoot, 'media', 'Aerial.png'), 'utf8'), 'PNG!');

  const index = buildMediaPathIndex(manifest);
  assert.equal(index.get('aerial.png'), 'media/Aerial.png');
});
