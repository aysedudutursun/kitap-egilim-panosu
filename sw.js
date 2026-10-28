// Service worker: uygulama kabuğunu önbelleğe alır, veriyi "önce ağ, olmazsa önbellek" ile sunar.
// Önbellekten dönen veri yanıtı x-sw-cache: 1 başlığı taşır; arayüz bunu görünce "son başarılı veri" uyarısı gösterir.
const VERSION = 'op-v1';
const SHELL = [
  './', 'index.html', 'vaka-calismasi.html', 'css/fonts.css', 'css/tokens.css', 'fonts/literata-latin-400-normal.woff2', 'fonts/literata-latin-600-normal.woff2', 'fonts/literata-latin-700-normal.woff2', 'fonts/literata-latin-ext-400-normal.woff2', 'fonts/literata-latin-ext-600-normal.woff2', 'fonts/literata-latin-ext-700-normal.woff2', 'css/app.css', 'js/i18n.js', 'js/app.js',
  'vendor/chart.umd.min.js', 'manifest.webmanifest', 'icons/icon.svg', 'icons/icon-192.png', 'icons/icon-512.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

async function networkFirst(req) {
  const cache = await caches.open(VERSION);
  try {
    const res = await fetch(req);
    if (res.ok) cache.put(req, res.clone());
    return res;
  } catch (err) {
    const hit = await cache.match(req, { ignoreSearch: true });
    if (!hit) throw err;
    const headers = new Headers(hit.headers);
    headers.set('x-sw-cache', '1');
    return new Response(await hit.blob(), { status: 200, headers });
  }
}

async function staleWhileRevalidate(req) {
  const cache = await caches.open(VERSION);
  const hit = await cache.match(req);
  const net = fetch(req).then((res) => { if (res.ok || res.type === 'opaque') cache.put(req, res.clone()); return res; }).catch(() => hit);
  return hit || net;
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin === location.origin && url.pathname.includes('/data/')) { e.respondWith(networkFirst(req)); return; }
  if (url.origin === location.origin && req.mode === 'navigate') { e.respondWith(networkFirst(req)); return; }
  if (url.origin === location.origin) {
    e.respondWith(staleWhileRevalidate(req));
  }
});
