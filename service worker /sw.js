// A unique name for the cache version.
// Changing this name will invalidate the old cache and force a new one.
const CACHE_NAME = 'lvo-calculator-cache-v1';

// List of files that form the "app shell" and should be cached on install.
const urlsToCache = [
    '/', // The main HTML file
    'https://flagcdn.com/gb.svg', // English flag icon
    'https://flagcdn.com/de.svg'  // German flag icon
];

// Install event: fires when the service worker is first installed.
self.addEventListener('install', event => {
    // waitUntil() ensures the service worker doesn't install until the code inside has finished.
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Opened cache');
                // addAll() fetches and caches all the specified URLs.
                return cache.addAll(urlsToCache);
            })
    );
});

// Fetch event: fires for every network request made by the page.
self.addEventListener('fetch', event => {
    // respondWith() hijacks the request and allows us to provide our own response.
    event.respondWith(
        // caches.match() checks if the requested URL is already in our cache.
        caches.match(event.request)
            .then(response => {
                // If a cached response is found, return it.
                if (response) {
                    return response;
                }

                // If not in cache, fetch it from the network.
                return fetch(event.request).then(
                    networkResponse => {
                        // Check if we received a valid response.
                        // We don't cache API calls to the prediction service.
                        if (!networkResponse || networkResponse.status !== 200 || event.request.url.includes('lvo-ppv-service')) {
                            return networkResponse;
                        }

                        // IMPORTANT: Clone the response. A response is a stream
                        // and because we want the browser to consume the response
                        // as well as the cache consuming the response, we need
                        // to clone it so we have two streams.
                        const responseToCache = networkResponse.clone();

                        caches.open(CACHE_NAME)
                            .then(cache => {
                                cache.put(event.request, responseToCache);
                            });

                        return networkResponse;
                    }
                );
            })
    );
});

// Activate event: fires when the service worker is activated.
// This is a good time to clean up old caches.
self.addEventListener('activate', event => {
    const cacheWhitelist = [CACHE_NAME];
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    // If a cache is not in our whitelist, delete it.
                    if (cacheWhitelist.indexOf(cacheName) === -1) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});
