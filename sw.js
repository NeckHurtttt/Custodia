// Funciona sin internet: primero la red (para tener siempre lo último) y, si no hay, lo guardado.
const CACHE = 'lifeline-v4';
const FILES = ['./', 'index.html', 'style.css', 'instructor.html', 'manifest.webmanifest', 'icon.svg', "fonts/OFL-VT323.txt","fonts/VT323-Regular.ttf","src/academia.js","src/academia-ui.js","src/cadete-data.js","src/common.js","src/core.js","src/extras.js","src/fx.js","src/locs.js","src/main.js","src/meta.js","src/net.js","src/music.js","src/story.js","src/trainer.js","src/villains.js"];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET' || !e.request.url.startsWith(self.location.origin) || e.request.headers.has('range')) return; // audio en streaming: directo a la red
  e.respondWith(fetch(e.request).then((r) => { const cp = r.clone(); caches.open(CACHE).then((c) => c.put(e.request, cp)); return r; }).catch(() => caches.match(e.request, { ignoreSearch: true })));
});
