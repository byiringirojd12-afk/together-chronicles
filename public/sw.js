// Together+ service worker — minimal, safe for iframe-aware registration.
// Strategy:
//  - NetworkFirst for navigations (always try fresh HTML; fall back to /offline.html)
//  - StaleWhileRevalidate-ish for same-origin static assets
//  - Handles Web Push events and notification clicks

const CACHE_VERSION = "togetherplus-v1";
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const OFFLINE_URL = "/offline.html";

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(STATIC_CACHE);
      // Cache each entry individually so a single 404 (e.g. SSR-only path) doesn't abort the whole install.
      await Promise.all([OFFLINE_URL, "/manifest.webmanifest"].map(async (url) => {
        try {
          const res = await fetch(url, { cache: "reload" });
          if (res && res.ok) await cache.put(url, res.clone());
        } catch { /* ignore — offline page will fall through to 503 */ }
      }));
      await self.skipWaiting();
    })()
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => !k.startsWith(CACHE_VERSION)).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Navigation requests — NetworkFirst, fall back to offline page.
  if (req.mode === "navigate") {
    event.respondWith((async () => {
      try {
        const fresh = await fetch(req);
        return fresh;
      } catch {
        const cached = await caches.match(OFFLINE_URL);
        return cached || new Response("Offline", { status: 503 });
      }
    })());
    return;
  }

  // Static assets — try cache, then network, then cache the response.
  if (/\.(?:js|css|woff2?|ttf|png|jpg|jpeg|svg|webp|ico)$/.test(url.pathname)) {
    event.respondWith((async () => {
      const cached = await caches.match(req);
      if (cached) return cached;
      try {
        const fresh = await fetch(req);
        if (fresh && fresh.status === 200) {
          const cache = await caches.open(STATIC_CACHE);
          cache.put(req, fresh.clone());
        }
        return fresh;
      } catch {
        return cached || Response.error();
      }
    })());
  }
});

// --- Web Push ---
self.addEventListener("push", (event) => {
  let data = { title: "Together+", body: "You have a new notification" };
  try { if (event.data) data = { ...data, ...event.data.json() }; } catch { /* keep defaults */ }
  event.waitUntil(self.registration.showNotification(data.title, {
    body: data.body,
    icon: "/icon-512.png",
    badge: "/icon-512.png",
    data: { url: data.url || "/dashboard" },
    tag: data.tag || undefined,
  }));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/dashboard";
  event.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const c of all) {
      if ("focus" in c) { c.navigate(url); return c.focus(); }
    }
    if (self.clients.openWindow) return self.clients.openWindow(url);
  })());
});

self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});