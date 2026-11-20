const CACHE_NAME = "noorodict-v7-1";
const APP_SHELL = "./index-pwa.html";

const FILES_TO_CACHE = [
    APP_SHELL,
    "./manifest.json",
    "./ArrowClock_48_PNG.ico",
    "./icon-192.png",
    "./icon-512.png"
];

self.addEventListener("install", event => {
    event.waitUntil(
        (async () => {
            const cache = await caches.open(CACHE_NAME);
            //o هر فایل جدا اضافه می‌شود تا نبودنِ یک آیکون، نصب کل service worker را خراب نکند
            await Promise.allSettled(
                FILES_TO_CACHE.map(file =>
                    cache.add(new Request(file, { cache: "reload" }))
                )
            );
            await self.skipWaiting();
        })()
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

    //o فقط درخواست‌های GET و هم‌مبدأ
    if (
        request.method !== "GET" ||
        new URL(request.url).origin !== self.location.origin
    ) {
        return;
    }

    const url = new URL(request.url);
    const isNavigation = request.mode === "navigate";
    const isShell = isNavigation || url.pathname.endsWith("/index-pwa.html");

    event.respondWith(
        (async () => {
            const cache = await caches.open(CACHE_NAME);

            if (isShell) {
                //o صفحهٔ اصلی: فوراً از Cache (سریع و آفلاین)، و هم‌زمان در پس‌زمینه
                //o نسخهٔ تازه گرفته می‌شود؛ پس بعد از هر به‌روزرسانی، در دومین بازکردن
                //o برنامه نسخهٔ جدید دیده می‌شود و دیگر لازم نیست هر بار شمارهٔ نسخه بالا برود.
                const cached = await cache.match(APP_SHELL, { ignoreSearch: true });
                const refresh = fetch(APP_SHELL, { cache: "no-cache" }).then(resp => {
                    if (resp && resp.ok) cache.put(APP_SHELL, resp.clone());
                    return resp;
                });

                if (cached) {
                    event.waitUntil(refresh.catch(() => {}));
                    return cached;
                }
                return refresh;
            }

            //o بقیهٔ فایل‌ها: اول Cache، و فقط اگر نبود به اینترنت مراجعه کن
            const cachedResponse = await cache.match(request, { ignoreSearch: true });
            if (cachedResponse) return cachedResponse;
            return fetch(request);
        })()
    );
});
