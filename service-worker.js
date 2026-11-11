const CACHE_NAME = "noorodict-pwa-v5";

const FILES_TO_CACHE = [
    "./index-pwa.html",
    "./manifest.json",
    "./ArrowClock_48_PNG.ico",
    "./icon-192.png",
    "./icon-512.png"
];

self.addEventListener("install", event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(FILES_TO_CACHE))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener("activate", event => {
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(
                keys
                    .filter(key => key !== CACHE_NAME)
                    .map(key => caches.delete(key))
            )
        ).then(() => self.clients.claim())
    );
});


self.addEventListener("fetch", event => {

    const request = event.request;

    // فقط درخواست‌های GET و هم‌مبدأ
    if (
        request.method !== "GET" ||
        new URL(request.url).origin !== self.location.origin
    ) {
        return;
    }

    event.respondWith(
        (async () => {

            // ابتدا Cache را بررسی کن
            const cachedResponse = await caches.match(request);

            if (cachedResponse) {
                return cachedResponse;
            }

            // فقط اگر فایل در Cache نبود، به اینترنت مراجعه کن
            try {
                return await fetch(request);

            } catch (error) {

                // در صورت نبود اینترنت، صفحه اصلی را برگردان
                if (request.mode === "navigate") {
                    const appShell =
                        await caches.match("./index-pwa.html");

                    if (appShell) return appShell;
                }

                throw error;
            }

        })()
    );
});
