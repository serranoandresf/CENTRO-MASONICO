// Solo guarda la "cáscara" estática para abrir sin conexión. NUNCA guarda respuestas de /api (datos privados).
const V = 'centro-v5';
const ARCHIVOS = ['./', './index.html', './styles.css', './iconos.js', './nucleo.js', './demo.js', './pantallas.js', './extras.js', './arranque.js', './manifest.webmanifest', './icon.svg', './icon-192.png', './icon-512.png'];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(V).then((c) => c.addAll(ARCHIVOS))); self.skipWaiting(); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== V).map((k) => caches.delete(k))))); self.clients.claim(); });
self.addEventListener('fetch', (e) => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin || /\/api\//.test(u.pathname)) return;
  e.respondWith(fetch(e.request).then((r) => { const c = r.clone(); if (r.ok) caches.open(V).then((ca) => ca.put(e.request, c)); return r; }).catch(() => caches.match(e.request)));
});
