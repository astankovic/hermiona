/* Hermione app shell service worker — offline installable SPA.
 * AI / CDN models (MediaPipe, etc.) are network-only and never precached. */
/* eslint-disable no-restricted-globals */

// Bump when shell assets change (activate purges older shell caches)
var CACHE_NAME = "hermione-shell-v3";

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
  "./js/draft.js",
  "./js/borders.js",
  "./js/errors.js",
  "./js/perf.js",
  "./js/buffers.js",
  "./js/export-worker.js",
  "./js/pwa.js",
  "./js/scene/depth-pseudo.js",
  "./js/scene/coc.js",
  "./js/scene/bokeh.js",
  "./js/scene/dof.js",
  "./js/scene/selective.js",
  "./js/scene/analyze.js",
  "./js/gpu/grade.js",
  "./js/gpu/dof.js",
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

/** Match cached shell files even when request has ?v= cache-bust */
function matchShell(cache, request) {
  return cache.match(request).then(function (hit) {
    if (hit) return hit;
    // Page always requests app.js?v=… / styles.css?v=… — precache is unversioned
    return cache.match(request, { ignoreSearch: true });
  });
}

self.addEventListener("install", function (event) {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then(function (cache) {
        return Promise.all(
          PRECACHE.map(function (url) {
            return cache.add(url).catch(function (err) {
              console.warn("[Hermione SW] precache skip:", url, err && err.message);
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
        // Drop versioned runtime entries that pile up (?v=) while keeping shell keys
        return caches.open(CACHE_NAME).then(function (cache) {
          return cache.keys().then(function (reqs) {
            return Promise.all(
              reqs.map(function (req) {
                try {
                  var u = new URL(req.url);
                  if (u.search && u.search.indexOf("v=") >= 0) {
                    // Keep only if we revalidate soon; purge old query variants
                    return cache.delete(req);
                  }
                } catch (e) { /* ignore */ }
                return null;
              })
            );
          });
        });
      })
      .then(function () {
        return self.clients.claim();
      })
  );
});

self.addEventListener("fetch", function (event) {
  var request = event.request;

  if (request.method !== "GET") return;
  var url = request.url;
  if (url.indexOf("chrome-extension:") === 0 || url.indexOf("moz-extension:") === 0) {
    return;
  }

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

  // Same-origin static assets: stale-while-revalidate with ignoreSearch fallback
  if (isSameOrigin(url)) {
    event.respondWith(
      caches.open(CACHE_NAME).then(function (cache) {
        return matchShell(cache, request).then(function (cached) {
          var networkFetch = fetch(request)
            .then(function (response) {
              if (response && response.ok && response.type === "basic") {
                // Store with the request URL (includes ?v=) for precise SWR
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
