// Yerel test için sahte Open Library sunucusu (gerçek API'ye erişmeden veri hattını sınamak için).
// Kullanım: node tests/mock-openlibrary.mjs  → http://localhost:8787
// RUN ortam değişkeni yerine ?run= sorgusu yok; sıralar her istekte saat başına göre karışır.
import http from 'node:http';

const SUBJ = ['fantasy', 'mystery', 'romance', 'science fiction', 'history', 'juvenile fiction', 'biography', 'self-help', 'science', 'philosophy', 'fiction', 'classic literature'];
const BOOKS = Array.from({ length: 160 }, (_, i) => ({
  key: `/works/OL${1000 + i}W`,
  title: `Test Kitabı ${i + 1}`,
  author_name: [`Test Yazar ${(i % 37) + 1}`],
  first_publish_year: i % 13 === 0 ? undefined : 1850 + ((i * 37) % 176),
  edition_count: (i * 7) % 90 + 1,
  subjects: [SUBJ[i % SUBJ.length], i % 9 === 0 ? 'Juvenile literature' : 'Adult'],
}));
let run = 0;
function rng(seed) { return () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }; }

http.createServer((req, res) => {
  const u = new URL(req.url, 'http://x');
  const send = (code, body) => { res.writeHead(code, { 'content-type': 'application/json' }); res.end(JSON.stringify(body)); };
  if (process.env.MOCK_FAIL) return send(503, { error: 'down' });
  let m;
  if ((m = u.pathname.match(/^\/trending\/(daily|weekly)\.json$/))) {
    if (m[1] === 'daily') run++;
    const r = rng(run * 31 + (m[1] === 'weekly' ? 7 : 1));
    const pool = BOOKS.slice(0, 120).map((b, i) => ({ b, s: i + r() * 40 })).sort((a, z) => a.s - z.s).slice(0, 100).map((x) => x.b);
    return send(200, { query: m[1], works: pool.map(({ subjects, ...b }) => b) });
  }
  if ((m = u.pathname.match(/^\/subjects\/(.+)\.json$/))) {
    const name = m[1].replace(/_/g, ' ');
    const works = BOOKS.filter((b) => b.subjects[0] === name || (name === 'mystery and detective stories' && b.subjects[0] === 'mystery')).slice(0, 50);
    return send(200, { name, work_count: 10000 + run * 3 + name.length, works: works.map((b) => ({ key: b.key, title: b.title })) });
  }
  if ((m = u.pathname.match(/^\/works\/(OL\d+W)\.json$/))) {
    const b = BOOKS.find((x) => x.key.endsWith(m[1]));
    return b ? send(200, { key: b.key, title: b.title, subjects: b.subjects }) : send(404, {});
  }
  send(404, { error: 'not found' });
}).listen(8787, () => console.log('mock OL :8787'));
