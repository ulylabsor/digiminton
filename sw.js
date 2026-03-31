const CACHE_NAME = 'digiminton-v33';
const urlsToCache = [
  '/',
  '/index.html',
  '/css/styles.css',
  '/css/scoreboard.css',
  '/css/members.css',
  '/css/payments.css',
  '/css/reports.css',
  '/js/app.js',
  '/js/store.js',
  '/js/utils.js',
  '/js/scoreboard.js',
  '/js/members.js',
  '/js/payments.js',
  '/js/reports.js',
  '/assets/favicon.svg'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(names =>
      Promise.all(
        names.filter(name => name !== CACHE_NAME)
          .map(name => caches.delete(name))
      )
    )
  );
});
