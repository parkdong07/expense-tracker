const CACHE_NAME = 'expense-tracker-v1';
const ASSETS = [
    'index.html',
    'styles.css',
    'app.js',
    'manifest.json',
    'pwa_app_icon_1772438741691.png'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS);
        })
    );
});

self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request).then((response) => {
            return response || fetch(event.request);
        })
    );
});
