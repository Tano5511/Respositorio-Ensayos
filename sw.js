/* Service worker sencillo para uso sin conexión */
const CACHE_NAME = 'repertorio-v13';
const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './assets/styles.css',
  './assets/icon.svg',
  './js/config.js',
  './js/util.js',
  './js/chords.js',
  './js/store.js',
  './js/ui.js',
  './js/auth.js',
  './js/view-song.js',
  './js/view-songs.js',
  './js/view-setlists.js',
  './js/view-search.js',
  './js/view-settings.js',
  './js/view-church.js',
  './js/view-members.js',
  './js/app.js',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => Promise.all(ASSETS.map((url) =>
        // cache: 'reload' evita que el navegador reutilice una versión vieja
        // del archivo desde su caché HTTP al instalar una versión nueva.
        fetch(new Request(url, { cache: 'reload' }))
          .then((response) => (response && response.ok ? cache.put(url, response) : null))
          .catch(() => null)
      )))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  // Sólo se cachean archivos de la propia app (mismo origen y GET).
  // Las llamadas a Supabase (otro origen) y los POST/PUT/DELETE pasan
  // siempre directo a la red: nunca se guardan datos de la iglesia en caché.
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;

  // Las navegaciones (abrir la app) usan el index.html precargado. No se
  // guardan por URL para no acumular entradas con ?parametros o #rutas.
  const isNavigation = request.mode === 'navigate';

  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request)
        .then((response) => {
          if (!isNavigation && response && response.status === 200) {
            const copy = response.clone();
            event.waitUntil(
              caches.open(CACHE_NAME).then((cache) => cache.put(request, copy))
            );
          }
          return response;
        })
        .catch(() => cached || caches.match('./index.html'));
      return cached || network;
    })
  );
});
