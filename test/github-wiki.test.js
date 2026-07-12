const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

const {
  titleToWikiFileStem,
  normalizeWikiTitle,
  extractTranscludableContent,
  convertWikiLinks,
  expandTransclusions,
  writeGitHubWikiTree,
} = require('../src/wiki/github-wiki.js');

test('titleToWikiFileStem converts titles into GitHub wiki file stems', () => {
  assert.equal(titleToWikiFileStem('Main Page'), 'Main-Page');
  assert.equal(titleToWikiFileStem('2026 July Board Meeting'), '2026-July-Board-Meeting');
  assert.equal(titleToWikiFileStem('RFID/System Software'), 'RFID-System-Software');
});

test('normalizeWikiTitle treats spaces and underscores as equivalent lookup keys', () => {
  assert.equal(normalizeWikiTitle('Main Page'), 'main page');
  assert.equal(normalizeWikiTitle('Main_Page'), 'main page');
  assert.equal(normalizeWikiTitle('  Location  '), 'location');
});

test('extractTranscludableContent removes noinclude blocks used for template metadata', () => {
  const source = '<noinclude>hidden</noinclude>\n== Visible ==\n* item';
  assert.equal(extractTranscludableContent(source), '== Visible ==\n* item');
});

test('convertWikiLinks rewrites internal links to GitHub wiki page names', () => {
  const titleMap = new Map([
    ['main page', 'Home'],
    ['location', 'Location'],
    ['membership manual', 'Membership-Manual'],
  ]);

  assert.equal(
    convertWikiLinks('See [[Location]] and [[Membership Manual|the manual]].', titleMap),
    'See [[Location]] and [[Membership-Manual|the manual]].'
  );
  assert.equal(convertWikiLinks('Front page: [[Main Page]]', titleMap), 'Front page: [[Home]]');
  assert.equal(
    convertWikiLinks('Legacy link: [[Main_Page#Stay informed]]', titleMap),
    'Legacy link: [[Home#Stay-informed]]'
  );
});

test('expandTransclusions inlines archived page content for include directives', () => {
  const pagesByTitle = new Map([
    [
      'upcoming workshops',
      '<noinclude>meta</noinclude>\n== March 2026 ==\n* Linux workshop',
    ],
  ]);

  assert.equal(
    expandTransclusions('Events:\n{{:Upcoming Workshops}}\nEnd.', pagesByTitle),
    'Events:\n== March 2026 ==\n* Linux workshop\nEnd.'
  );
});

test('convertHtmlEmbeds turns PayPal forms into donate links', () => {
  const {
    convertHtmlEmbeds,
  } = require('../src/wiki/github-wiki.js');

  const classic = convertHtmlEmbeds(`<html>
<form action="https://www.paypal.com/cgi-bin/webscr" method="post">
<input type="hidden" name="hosted_button_id" value="J7WBD5CUBZWVN">
</form>
</html>`);

  assert.equal(
    classic,
    '[https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=J7WBD5CUBZWVN Donate with PayPal]'
  );

  const ncp = convertHtmlEmbeds(
    '<html><form action="https://www.paypal.com/ncp/payment/F8W7EWDGDPPN2" method="post"></form></html>'
  );
  assert.equal(ncp, '[https://www.paypal.com/ncp/payment/F8W7EWDGDPPN2 Donate with PayPal]');
});

test('convertFileLinks rewrites media to archived wiki-repo URLs', () => {
  const { convertFileLinks } = require('../src/wiki/github-wiki.js');
  const mediaPathIndex = new Map([
    ['bloominglabsaerial.png', 'media/Bloominglabsaerial.png'],
    ['plant tower.jpg', 'media/Plant_tower.jpg'],
    ['plant_tower.jpg', 'media/Plant_tower.jpg'],
    ['release and waiver of liability.pdf', 'media/RELEASE_AND_WAIVER_OF_LIABILITY.pdf'],
    ['release_and_waiver_of_liability.pdf', 'media/RELEASE_AND_WAIVER_OF_LIABILITY.pdf'],
  ]);

  assert.equal(
    convertFileLinks('[[File:Bloominglabsaerial.png]]', { mediaPathIndex }),
    '<img src="https://raw.githubusercontent.com/wiki/Bloominglabs/newsite/media/Bloominglabsaerial.png" alt="Bloominglabsaerial.png">'
  );
  assert.equal(
    convertFileLinks('[[File:Plant tower.jpg|thumb|200px|Plant tower]]', { mediaPathIndex }),
    '<img src="https://raw.githubusercontent.com/wiki/Bloominglabs/newsite/media/Plant_tower.jpg" alt="Plant tower">'
  );
  assert.equal(
    convertFileLinks('[[File:RELEASE AND WAIVER OF LIABILITY.pdf|waiver]]', { mediaPathIndex }),
    '[https://raw.githubusercontent.com/wiki/Bloominglabs/newsite/media/RELEASE_AND_WAIVER_OF_LIABILITY.pdf waiver]'
  );
});

test('convertBloominglabsPageUrls remaps archived article links', () => {
  const { convertBloominglabsPageUrls } = require('../src/wiki/github-wiki.js');
  const titleMap = new Map([
    ['donations', 'Donations'],
    ['location', 'Location'],
  ]);

  assert.equal(
    convertBloominglabsPageUrls(
      'See [https://www.bloominglabs.org/Donations donation info] and https://bloominglabs.org/Location',
      titleMap
    ),
    'See [[Donations|donation info]] and [[Location]]'
  );
});

test('markup cleanup converts bracketed URLs, users, categories, and presentation tags', () => {
  const {
    convertBracketedExternalUrls,
    convertUserLinks,
    stripCategoryLinks,
    convertPresentationHtml,
  } = require('../src/wiki/github-wiki.js');

  assert.equal(
    convertBracketedExternalUrls('See [[http://example.com/path|example]].'),
    'See [http://example.com/path example].'
  );
  assert.equal(convertUserLinks('Signed [[User:Avh.on1|A.V.]]'), 'Signed A.V.');
  assert.equal(stripCategoryLinks('Body\n[[Category: Operations]]\n').trim(), 'Body');
  assert.equal(
    convertPresentationHtml("<big>'''Welcome'''</big> <font color=\"red\">note</font>"),
    "'''Welcome''' note"
  );
});

test('convertWikiLinks falls back to hyphenated targets for unknown pages', () => {
  assert.equal(convertWikiLinks('[[Unknown Page Title]]', new Map()), '[[Unknown-Page-Title]]');
});

test('expandTransclusions leaves unknown templates unchanged', () => {
  assert.equal(expandTransclusions('{{:Missing Template}}', new Map()), '{{:Missing Template}}');
});

test('writeGitHubWikiTree rejects manifest entries without archived records', async () => {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'blabs-github-wiki-missing-'));
  const archiveRoot = path.join(tempRoot, 'wiki-archive', 'latest');
  const outputRoot = path.join(tempRoot, 'wiki');

  await fs.mkdir(path.join(archiveRoot, 'pages'), { recursive: true });
  await fs.writeFile(
    path.join(archiveRoot, 'manifest.json'),
    JSON.stringify({ pages: [{ title: 'Missing Page', file: 'pages/Missing_Page.json' }] }),
    'utf8'
  );

  await assert.rejects(
    () => writeGitHubWikiTree({ archiveRoot, outputRoot }),
    /Manifest entry "Missing Page" has no archived page record/
  );
});

test('writeGitHubWikiTree writes Home.mediawiki and one file per archived page', async () => {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'blabs-github-wiki-'));
  const archiveRoot = path.join(tempRoot, 'wiki-archive', 'latest');
  const outputRoot = path.join(tempRoot, 'wiki');

  await fs.mkdir(path.join(archiveRoot, 'pages'), { recursive: true });
  await fs.writeFile(
    path.join(archiveRoot, 'manifest.json'),
    JSON.stringify(
      {
        pages: [
          {
            title: 'Main Page',
            file: 'pages/Main_Page.json',
          },
          {
            title: 'Location',
            file: 'pages/Location.json',
          },
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
      revision: {
        content:
          'Welcome [[Location|here]].\n{{:Upcoming Workshops}}\n[[File:Aerial.png]]\nSee https://www.bloominglabs.org/Location',
      },
    }),
    'utf8'
  );
  await fs.writeFile(
    path.join(archiveRoot, 'pages', 'Location.json'),
    JSON.stringify({
      title: 'Location',
      revision: {
        content: '1840 S. Walnut Street',
      },
    }),
    'utf8'
  );
  await fs.writeFile(
    path.join(archiveRoot, 'pages', 'Upcoming_Workshops.json'),
    JSON.stringify({
      title: 'Upcoming Workshops',
      revision: {
        content: '<noinclude>meta</noinclude>\n== March ==\n* workshop',
      },
    }),
    'utf8'
  );
  await fs.mkdir(path.join(archiveRoot, 'media'), { recursive: true });
  await fs.writeFile(path.join(archiveRoot, 'media', 'Aerial.png'), 'PNG');
  await fs.writeFile(
    path.join(archiveRoot, 'media-manifest.json'),
    JSON.stringify({
      files: [
        {
          title: 'Aerial.png',
          localPath: 'media/Aerial.png',
          sourceUrl: 'https://www.bloominglabs.org/images/a/a1/Aerial.png',
        },
      ],
    }),
    'utf8'
  );
  await fs.writeFile(path.join(archiveRoot, 'pages', 'README.txt'), 'ignore me', 'utf8');

  const summary = await writeGitHubWikiTree({ archiveRoot, outputRoot });

  assert.equal(summary.pageCount, 2);
  assert.equal(summary.mediaCount, 1);

  const home = await fs.readFile(path.join(outputRoot, 'Home.mediawiki'), 'utf8');
  const location = await fs.readFile(path.join(outputRoot, 'Location.mediawiki'), 'utf8');
  const media = await fs.readFile(path.join(outputRoot, 'media', 'Aerial.png'), 'utf8');

  assert.match(home, /Welcome \[\[Location\|here\]\]/);
  assert.match(home, /== March ==/);
  assert.match(
    home,
    /raw\.githubusercontent\.com\/wiki\/Bloominglabs\/newsite\/media\/Aerial\.png/
  );
  assert.match(home, /\[\[Location\]\]/);
  assert.doesNotMatch(home, /https?:\/\/(?:www\.)?bloominglabs\.org\/Location/);
  assert.equal(location.trim(), '1840 S. Walnut Street');
  assert.equal(media, 'PNG');
});
