// Ține jocul pe telefon, ca să meargă și fără internet.
// La o versiune nouă a jocului, construieste.py schimbă VERSIUNE și telefonul ia jocul nou.
const VERSIUNE = 'cf-d7a16f9a94';
const FISIERE = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './apple-touch-icon.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSIUNE).then(c => c.addAll(FISIERE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSIUNE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
// Jocul: întâi internetul (ca să vină versiunea nouă), altfel ce e pe telefon.
// Fonturile: întâi ce e pe telefon.
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const font = req.url.startsWith('https://fonts.');
  if (font) {
    e.respondWith(caches.match(req).then(r => r || fetch(req).then(res => { const c = res.clone(); caches.open(VERSIUNE).then(x => x.put(req, c)); return res; })));
    return;
  }
  if (new URL(req.url).origin !== self.location.origin) return;
  e.respondWith(fetch(req).then(res => { const c = res.clone(); caches.open(VERSIUNE).then(x => x.put(req, c)); return res; })
    .catch(() => caches.match(req).then(r => r || caches.match('./index.html'))));
});
