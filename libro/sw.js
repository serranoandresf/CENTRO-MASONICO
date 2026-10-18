// Cache solo de archivos estáticos de la app. Los datos están cifrados en localStorage y nunca pasan por aquí.
const V = 'libro-v4';
const ARCHIVOS = ['./', './index.html', './styles.css', './core/crypto.js', './core/logia.js', './app-base.js', './app-vistas.js', './arranque.js', './diagnostico.js', './manifest.webmanifest', './icon.svg', './icon-192.png', './icon-512.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(V).then(c => c.addAll(ARCHIVOS))); self.skipWaiting(); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k))))); self.clients.claim(); });
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request)));
});
