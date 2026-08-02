/* Hermiona app shell service worker — offline installable SPA.
 * AI / CDN models (MediaPipe, etc.) are network-only and never precached. */
/* eslint-disable no-restricted-globals */

var CACHE_NAME = "hermiona-shell-v1";

var PRECACHE = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./favicon.svg",
  "./apple-touch-icon.png",
  "./manifest.webmanifest",
  "./js/engine.js",
  "./js/export.js",
  "./js/looks.js",
  "./js/imperfections.js",
  "./js/histogram.js",
  "./js/auto.js",
  "./js/user-presets.js",
  "./js/errors.js",
  "./js/pwa.js",
  "./js/scene/depth-pseudo.js",
  "./js/scene/coc.js",
  "./js/scene/bokeh.js",
  "./js/scene/dof.js",
  "./js/scene/analyze.js",
];

/** CDN / model hosts — never put these in the shell cache. */
function isCrossOriginCdn(url) {
  try {
    var u = new URL(url);
    if (u.origin === self.location.origin) return false;
    var h = u.hostname;
    return (
      h === "cdn.jsdelivr.net" ||
      h === "storage.googleapis.com" ||
      h.endsWith(".googleapis.com") ||
      h === "unpkg.com" ||
      h === "cdnjs.cloudflare.com" ||
      h.endsWith(".jsdelivr.net")
    );
  } catch (e) {
    return false;
  }
}

function isSameOrigin(url) {
  try {
    return new URL(url).origin === self.location.origin;
  } catch (e) {
    return false;
  }
}

self.addEventListener("install", function (event) {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then(function (cache) {
        // Precache individually so missing optional files (e.g. histogram.js) do not fail install.
        return Promise.all(
          PRECACHE.map(function (url) {
            return cache.add(url).catch(function (err) {
              console.warn("[Hermiona SW] precache skip:", url, err && err.message);
            });
          })
        );
      })
      .then(function () {
        return self.skipWaiting();
      })
  );
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches
      .keys()
      .then(function (keys) {
        return Promise.all(
          keys.map(function (key) {
            if (key !== CACHE_NAME) {
              return caches.delete(key);
            }
          })
        );
      })
      .then(function () {
        return self.clients.claim();
      })
  );
});

self.addEventListener("fetch", function (event) {
  var request = event.request;

  // Ignore non-GET and extension schemes.
  if (request.method !== "GET") return;
  var url = request.url;
  if (url.indexOf("chrome-extension:") === 0 || url.indexOf("moz-extension:") === 0) {
    return;
  }

  // Cross-origin CDN / AI models: network-only, do not cache.
  if (!isSameOrigin(url) || isCrossOriginCdn(url)) {
    if (!isSameOrigin(url)) {
      event.respondWith(
        fetch(request).catch(function () {
          return new Response("", { status: 503, statusText: "Offline" });
        })
      );
      return;
    }
  }

  // Navigations: network-first, fallback to cached shell index.html.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then(function (response) {
          if (response && response.ok) {
            var copy = response.clone();
            caches.open(CACHE_NAME).then(function (cache) {
              cache.put("./index.html", copy);
            });
          }
          return response;
        })
        .catch(function () {
          return caches.match("./index.html").then(function (cached) {
            return (
              cached ||
              caches.match("./") ||
              new Response("Offline", {
                status: 503,
                statusText: "Offline",
                headers: { "Content-Type": "text/plain" },
              })
            );
          });
        })
    );
    return;
  }

  // Same-origin static assets: stale-while-revalidate.
  if (isSameOrigin(url)) {
    event.respondWith(
      caches.open(CACHE_NAME).then(function (cache) {
        return cache.match(request).then(function (cached) {
          var networkFetch = fetch(request)
            .then(function (response) {
              if (response && response.ok && response.type === "basic") {
                cache.put(request, response.clone());
              }
              return response;
            })
            .catch(function () {
              return cached || Response.error();
            });

          return cached || networkFetch;
        });
      })
    );
  }
});
