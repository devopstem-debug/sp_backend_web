/* Smart Planogram Control Center — Service Worker */
const CACHE_NAME = 'sp-control-v2';

const PRECACHE_URLS = ['/', '/dashboard', '/images/logo.svg', '/manifest.json'];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches
            .open(CACHE_NAME)
            .then((cache) => cache.addAll(PRECACHE_URLS))
            .then(() => self.skipWaiting()),
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches
            .keys()
            .then((keys) =>
                Promise.all(
                    keys
                        .filter((key) => key !== CACHE_NAME)
                        .map((key) => caches.delete(key)),
                ),
            )
            .then(() => self.clients.claim()),
    );
});

self.addEventListener('fetch', (event) => {
    const { request } = event;

    if (request.method !== 'GET') {
        return;
    }

    const url = new URL(request.url);

    if (url.origin !== self.location.origin) {
        return;
    }

    // Network-first for app navigations / API; cache-first for static assets.
    if (request.mode === 'navigate' || url.pathname.startsWith('/api/')) {
        event.respondWith(
            fetch(request)
                .then((response) => {
                    const copy = response.clone();
                    if (response.ok && request.mode === 'navigate') {
                        caches.open(CACHE_NAME).then((cache) => {
                            cache.put(request, copy);
                        });
                    }
                    return response;
                })
                .catch(() => caches.match(request).then((cached) => cached || caches.match('/'))),
        );
        return;
    }

    event.respondWith(
        caches.match(request).then((cached) => {
            if (cached) {
                return cached;
            }

            return fetch(request).then((response) => {
                if (
                    response.ok &&
                    (url.pathname.startsWith('/images/') ||
                        url.pathname.startsWith('/build/') ||
                        url.pathname === '/manifest.json')
                ) {
                    const copy = response.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
                }

                return response;
            });
        }),
    );
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    const targetUrl = event.notification?.data?.url || '/dashboard';

    event.waitUntil(
        self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientsArr) => {
            const existing = clientsArr.find((client) => client.url.includes(self.location.origin));

            if (existing && 'focus' in existing) {
                existing.focus();
                if ('navigate' in existing) {
                    return existing.navigate(targetUrl);
                }

                return existing.postMessage({ type: 'NOTIFICATION_CLICK', url: targetUrl });
            }

            if (self.clients.openWindow) {
                return self.clients.openWindow(targetUrl);
            }

            return undefined;
        }),
    );
});
