const CACHE_NAME = "alter-dune-v3";

const FILES_TO_CACHE = [
    "./",
    "./index.html",
    "./script.js",
    "./styles.css",
    "./manifest.json",
    "./icon.png",

    // Soundtracks
    "./FINALBOSS.mp3",
    "./THEHUNTER.mp3",
    "./EXPLORATION.mp3",
    "./START MENU.mp3",
    "./FIGHT.mp3"
];

// Install and cache game files
self.addEventListener("install", event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            return cache.addAll(FILES_TO_CACHE);
        })
    );

    self.skipWaiting();
});

// Remove old caches
self.addEventListener("activate", event => {
    event.waitUntil(
        caches.keys().then(keys => {
            return Promise.all(
                keys
                    .filter(key => key !== CACHE_NAME)
                    .map(key => caches.delete(key))
            );
        })
    );

    self.clients.claim();
});

// Try the network first, then use cached files offline
self.addEventListener("fetch", event => {
    if (event.request.method !== "GET") return;

    const url = new URL(event.request.url);

    // Don't intercept external requests
    if (url.origin !== self.location.origin) return;

    event.respondWith(
        fetch(event.request)
            .then(response => {
                if (response && response.ok) {
                    const copy = response.clone();

                    caches.open(CACHE_NAME).then(cache => {
                        cache.put(event.request, copy);
                    });
                }

                return response;
            })
            .catch(() => {
                return caches.match(event.request).then(cached => {
                    if (cached) return cached;

                    return new Response("You are offline and this file is not cached.", {
                        status: 503,
                        headers: {
                            "Content-Type": "text/plain"
                        }
                    });
                });
            })
    );
});
