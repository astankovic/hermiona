# Expert findings — mobile browser audit

Date: 2026-08-02 · Scope: full app audit with **mobile browser (iPhone Safari) as the primary target**.
Two deep passes: (A) UI/UX/PWA layer, (B) rendering/processing pipeline. Findings are ranked by
user impact. Each entry: severity, where, what happens, why it matters on mobile, recommended fix,
rough effort.

## Baseline — gesture layer fixed on 2026-08-02 (shipped, verified)

Context for this audit: the touch/gesture layer was reworked the same day and is **not** part of
the findings below. Shipped and verified 17/17 by a Playwright iPhone probe (390/375/430 widths):

- Pinch rebuilt: incremental zoom anchored at finger midpoint, two-finger pan, rubber-band
  under/over-zoom with animated settle, clean 2→1 finger handoff to one-finger pan (`app.js`,
  pinch section).
- Gesture conflicts resolved: a second finger cancels pan drag, hold-compare, and pending taps;
  compare works while zoomed and wins over an unmoved pan drag.
- Native Safari page pinch-zoom blocked via `gesturestart/gesturechange/gestureend`
  `preventDefault` (iOS ignores `user-scalable=no` in-tab).
- Double-tap = fit ↔ 2.5× at tap point. Single tap on photo = full immersive mode (topbar +
  dock slide away, iOS Photos style); tap/Escape restores. Required excluding `.ui-immersive`
  from the `transform: none !important` dock pin at `styles.css` (~line 3614).
- Swipe down/up on dock handle and tool rail collapses/expands panels; ghost-click suppression
  so a swipe never triggers a tool switch. `touch-action: none` on the handle, `pan-x` on the rail.
- `overscroll-behavior: none` + `-webkit-touch-callout: none` on html/body.

---

## A. High priority — user-facing bugs

### A1. Share/export can silently produce no file (transient activation loss) — HIGH
**Where:** `js/export.js:655-716` (share path + catch), `app.js:4380-4443` (export flow).
**What:** `runExport()` runs the full pipeline (geometry rebuild + worker processing — seconds at
full res) *before* calling `navigator.share()`. iOS Safari requires transient user activation for
`share()`; after a multi-second async gap it rejects with `NotAllowedError`. The catch maps that
to `cancelled: true`, so the UI shows "Share cancelled" and **no download fallback fires** — the
user gets nothing and blames the app.
**Fix:**
1. Treat `NotAllowedError` as failure, not cancellation → fall back to `triggerDownload(blob)`.
2. Structural: two-phase flow — build the blob with progress UI first, then show a
   "Save to Photos" button whose tap handler calls `navigator.share()` synchronously with the
   pre-built `File`. This is how native-feeling PWAs keep activation valid.
**Effort:** fallback fix ~1h; two-phase flow ~half a day.

### A2. No WebGL context-loss handling → black frames that get cached — HIGH
**Where:** `js/gpu/grade.js:177-293, 433`, `js/gpu/dof.js:155-217, 385`; cache at `app.js`
(`captureAfterLooks` ~1648, `pipeCache`).
**What:** No `webglcontextlost` listener and no `gl.isContextLost()` check anywhere. iOS Safari
drops WebGL contexts routinely (memory pressure, backgrounding, too many contexts). After loss,
GL calls no-op without throwing, `readPixels` returns zeros, `apply()` still returns `true` → the
engine paints black, and the black frame is **snapshotted into `pipeCache`**, persisting across
subsequent renders.
**Fix:** register `webglcontextlost` (with `preventDefault`) + `webglcontextrestored` on both
canvases; check `gl.isContextLost()` before returning success; on loss return `false` so the CPU
fallback runs, and invalidate the pipe cache. Related: A7 (merge the two contexts) reduces the
chance of eviction in the first place.
**Effort:** guards ~2h; proper restore path ~half a day.

### A3. 22 scripts load in a strictly serial waterfall — HIGH
**Where:** `index.html` loader (bottom `<script>`, ~line 565+).
**What:** each file is injected only in the previous file's `onload` — 22 sequential network
round trips before the app is interactive. On first visit over cellular this is easily 3–8s of
dead time; even served from SW cache it serializes scheduling. Additionally the stylesheet is
injected via `document.write` (~line 26), which defeats the preload scanner and delays first
paint; Chrome may throttle `document.write` on slow connections.
**Fix (one-liner class):** create all script elements in a single loop with `s.async = false`
and append immediately — execution order is preserved, fetches parallelize. Replace the
`document.write` CSS injection with a `link` element appended to `<head>` (href built from
`__H_V`), or a static `<link>` whose `?v=` is bumped at deploy time alongside `__H_V`.
Longer term: bundle/concatenate for one fetch.
**Effort:** ~1h. Highest perf-per-line-changed in the codebase.

---

## B. Medium-high — performance & memory on iOS

### B1. Settle render blocks the main thread after every slider release — HIGH (perf)
**Where:** `app.js:2261` (`render()` → synchronous `Engine.process`), `scheduleFullSettle`
(~1772), `scheduleLookHQ` (~2772, re-runs again at `quality:'export'` 280ms later).
**What:** on finger-lift the full CPU chain runs synchronously at 1400px working res: GPU grade
readback + clarity + sharpen + looks + imperfections + selective + DoF + vignette + grain —
typically 100–400ms of main-thread block on an iPhone, felt as a hitch exactly when the user
expects responsiveness. It also runs twice (settle, then HQ pass).
**Fix:** route non-fast settle renders through the already-existing worker
(`Export.processOnWorker`, `js/export.js:176`) with a request token so stale results are
discarded; keep only the 720px scrub path on main. Single biggest touch-to-photon and
battery/thermal win.
**Effort:** 1–2 days (the worker plumbing already exists).

### B2. Zoom detail render: up to 4096px processed synchronously — HIGH (perf)
**Where:** `app.js:1897` (`DETAIL_MAX_LONG = 4096`), `app.js:2025` (sync process at
`quality:'export'`), `app.js:2271-2273` (auto re-queued 280ms after every settle while zoomed).
**What:** 4096-long-edge ≈ 12.6MP → ~50MB ImageData + rebuild canvases + a multi-second
main-thread freeze on iPhone. While zoomed, *every* adjustment pays this.
**Fix:** run through the worker (same mechanism as B1); cap `DETAIL_MAX_LONG` at ~2048–2560 on
touch devices (`navigator.maxTouchPoints > 0`); skip when `document.hidden`.
**Effort:** cap is minutes; worker route rides on B1.

### B3. iOS memory hazards: data-URL original, per-op geometry canvases, 8192px CPU export — MED-HIGH
**Where:** `app.js:1215/1206/1176` (original held as base64 data URL); `js/engine.js:618-635`
(each geometry op allocates a fresh full-size canvas); `js/export.js:15` (`HARD_MAX_LONG_EDGE`
8192) + `js/export-worker.js:14-26` (no GPU in worker → per-pixel JS at full res).
**What (three compounding issues):**
1. A 10MB JPEG becomes a ~13MB resident string and Safari re-decodes the full bitmap on every
   `rebuildGeometry` — slowest load path, permanent memory tax.
2. A 3-op geometry stack at export res transiently wants 600MB+ of canvas memory; iOS enforces a
   total canvas budget (~384MB) and **silently returns blank canvases** over budget — the
   size-fallback ladder never fires and the user gets a black export.
3. Full-res export in the worker is CPU-only; at 8192px that's a 201MB RGBA buffer and tens of
   seconds — long enough for iOS to suspend the backgrounded tab mid-export.
**Fix:** `URL.createObjectURL(file)` (revoke on close) or keep the `File` + `createImageBitmap`
on demand; compose geometry as a single transform into one destination canvas (at minimum free
intermediates via `c.width = 0` and sanity-sample a pixel before encode); cap export long edge at
~6144 on iOS; structural: OffscreenCanvas WebGL2 inside the worker (Safari 17+) reusing the grade
shader.
**Effort:** object-URL ~1h; geometry compose ~1 day; worker GPU ~2-3 days.

### B4. Service worker precache never matches; stale versions accumulate — MED
**Where:** `sw.js:5-37` (precache of unversioned URLs), `sw.js:157-177` (match), `CACHE_NAME`
fixed at `hermione-shell-v2`.
**What:** the page always requests `app.js?v=…` but the precache stored `./app.js` — every
precache lookup misses. Offline only works because runtime SWR happens to cache the versioned
URLs during a full first visit; installing and going offline early yields a broken shell. And
because the cache name never changes, every deployed `?v=` variant piles up forever.
**Fix:** `cache.match(request, { ignoreSearch: true })` for same-origin CSS/JS (safe — `?v=` is
the only param), and on `activate` purge entries whose `?v=` differs from the current version
(or derive `CACHE_NAME` from the version).
**Effort:** ~2h.

### B5. GPU pipeline round-trips + duplicated contexts — MED (structural)
**Where:** `js/gpu/grade.js:181, 187, 252, 360-362, 428-439`, `js/gpu/dof.js:159, 165, 384-390`;
CPU stages `js/engine.js:31-47`.
**What:** each GPU stage is upload → draw → **synchronous `readPixels`** (full pipeline stall) →
JS row-flip loop → back to CPU for clarity/sharpen/looks → `putImageData`. Both modules own
separate WebGL2 contexts (iOS caps live contexts and evicts the oldest → feeds A2), both set
`preserveDrawingBuffer: true` (extra full-surface copy per frame on tile GPUs), grade resizes its
canvas every apply (backing-store realloc, ~100MB churn at 4096px), and an allocated FBO is never
actually used. `applySharpen` also allocates a full-frame copy per call outside the buffer pool
(`engine.js:47`).
**Fix, in increasing ambition:**
1. Render pre-flipped in the vertex shader → `readPixels` lands in ImageData order, deletes the
   flip loops.
2. Render into the FBO texture sized to the image, read from FBO, drop `preserveDrawingBuffer`,
   keep canvas at 1×1. Pool the sharpen copy via `HermioneBuffers`.
3. One shared GL module (context + FBO pool) with grade and DoF as programs.
4. GPU-resident preview: fold clarity/sharpen/vignette into the grade shader, composite in GL,
   and blit with `ctx.drawImage(glCanvas, …)` (GPU→GPU); read back only for histogram/cache at
   low frequency.
**Effort:** (1)+(2) ~1 day; (3) ~1-2 days; (4) ~week, but it makes preview effectively free.

### B6. Over-eager pipe-cache snapshot — LOW-MED
**Where:** `app.js:2253-2258` + `captureAfterLooks` (~1648).
**What:** ~6MB alloc+copy on every settle render even when nothing downstream (optics, vignette,
grain, debug) can consume it. Cache *correctness* is good — key covers full upstream identity and
is invalidated on image/geometry change — it's just unconditional.
**Fix:** pass `onAfterLooks` only when `state.optics.enabled || params.vignette > 0 ||
params.grain > 0 || debugScene !== 'off'`.
**Effort:** minutes.

---

## C. UX polish — the "feels like an app" gap list

### C1. Export sheet: no exit animation, no drag-to-dismiss — MED
**Where:** `styles.css:3153-3178` (+ dead `transition` ~3667), `app.js:4344-4346`.
**What:** the sheet animates in (`sheetUp`) but closing flips `hidden` → instant pop-out (the
transform transition is dead code because `display:none` skips transitions). The `.sheet-handle`
grabber advertises dragging but has no gesture. Most visible native-sheet gap.
**Fix:** close via a `.sheet--closing` class (translateY(100%) + backdrop fade, set `hidden` on
`transitionend`); add pointer-based drag-down-to-dismiss with rubber-banding — the dock swipe
code is a ready template.
**Effort:** ~half a day.

### C2. Crop handles are 20×20px (44pt rule violation) — MED
**Where:** `styles.css:3040-3059`, `cropPointerDown` (`app.js:~3179`).
**What:** hit area is exactly the 20px visual; corner grabs frequently miss on iPhone and turn
into a rect *move* instead — the most precision-hostile touch target in the app.
**Fix:** expand the effective target to ≥44px (padding on the handle with the 20px knob drawn
inside, or an `::before { inset: -14px }` hit layer), or proximity-pick the nearest handle within
~24px in `cropPointerDown`.
**Effort:** ~2h.

### C3. PWA install story is incomplete — MED
**Where:** `manifest.webmanifest:10-23`, `index.html:32-34`, `js/pwa.js`.
**What:** manifest has only an SVG icon (`sizes: "any"`) + 180px apple-touch-icon — no 192/512
PNG, no `purpose: "maskable"` (Android letterboxes the icon in a white circle), no `id`,
no `screenshots`. No iOS `apple-touch-startup-image` set → standalone launch flashes blank before
the hero animation. `pwa.js` only registers the SW — no `beforeinstallprompt` capture, no iOS
add-to-homescreen hint, despite draft-resume + offline making installation genuinely valuable.
**Fix:** add `icon-192.png`, `icon-512.png`, `icon-512-maskable.png`, `"id": "./"`; generate the
media-queried startup-image set in brand `#050505` with the Iris mark (pwa-asset-generator);
deferred install pill on `beforeinstallprompt`; one-time dismissible iOS hint (Share → Add to
Home Screen) after N sessions.
**Effort:** assets ~half a day; install promotion ~half a day.

### C4. Haptics are a no-op on iPhone — MED (platform limitation)
**Where:** `app.js:676-680` (`navigator.vibrate`), 12+ call sites.
**What:** iOS Safari does not implement `navigator.vibrate` — every haptic moment (snap, detent,
long-press, dock toggle, double-tap zoom) is silent on the primary platform.
**Fix:** only viable workaround is the `<input type="checkbox" switch>` label-toggle hack
(iOS 17.4+), which is fragile — recommend a capability-probed helper used *only* for the
highest-value detents (crop soft-snap, slider center), keeping visual feedback primary.
**Effort:** ~half a day incl. probe + fallback.

### C5. `window.prompt()` for "Save look" — MED
**Where:** `app.js:2485-2489`.
**What:** synchronous browser prompt inside an otherwise iOS-styled app; iOS standalone mode has
a history of suppressing prompts, in which case the code silently falls back to a default name —
users may never get to name a look.
**Fix:** small inline sheet with a text field (sheet pattern exists); `visualViewport` handling
already keeps focused fields above the keyboard.
**Effort:** ~2-3h.

### C6. Accessibility gaps that matter on mobile — LOW
**Where:** `index.html:554` (toast), `index.html:303, 344` (dials), `styles.css:18, 2657, 4342`
(rail labels).
**What:**
- `#exportToast` ("Saved · 2048×1536") has no `aria-live` — VoiceOver users get zero export
  confirmation. Fix: `role="status" aria-live="polite"`.
- `#activeDial` / `#lookIntensity` have no accessible name or value semantics — VoiceOver says
  "0, adjustable". Fix: `aria-labelledby="dialName"` + `aria-valuetext` updated on change.
- Inactive tool-rail labels: `--text-tertiary` (≈3.1:1) at 10px (9px on SE/landscape) — below
  WCAG for small text and hard to read in sunlight. Fix: bump inactive rail labels to
  `--text-secondary`.
**Effort:** ~2h total.

### C7. Viewport meta still declares `maximum-scale=1, user-scalable=no` — LOW (decision)
**Where:** `index.html:5`.
**What:** ignored by Safari in-tab (JS now owns pinch via `gesture*` preventDefault +
`touch-action`), but **honored in standalone/home-screen mode**, where it blocks accessibility
zoom for low-vision users. The JS blockade makes the meta restriction redundant.
**Trade-off:** dropping it restores a11y zoom in standalone; keeping it is defense-in-depth
against native UI zoom regressions in standalone. Recommendation: drop `maximum-scale` /
`user-scalable`, verify standalone behavior on a real device once.
**Effort:** minutes + one device check.

### C8. Export progress is a static label — LOW
**Where:** `app.js:4390-4398`, `js/export-worker.js` (posts only the final result).
**What:** a 20–60s full-res export shows "Applying filters…" frozen — inviting the user to
background the tab, where iOS suspends the worker (compounds B3.3).
**Fix:** post `{type:'progress', stage}` between pipeline stages (engine already has per-stage
perf marks) → surface via `busyUpdate`; warn "keep the app open" for full-res.
**Effort:** ~2-3h.

---

## What is already done well (calibration)

- **Viewport handling is best-in-class:** `visualViewport`-driven `--vvh` with `100dvh`
  fallback, `offsetTop` compensation, double-timer `orientationchange` re-layout, phone
  detection that keeps iPhone-landscape on the bottom dock.
- **Gesture suite is now native-grade** (see baseline above) with real conflict arbitration
  between pinch/pan/compare/tap.
- **Scrub fast path is fast by construction:** 720px proxy, rAF-coalesced renders, `fast` flag
  skipping all spatial/DoF/grain work.
- **Export architecture is fundamentally right:** worker + transferable buffers, size-fallback
  ladder, Web Share with files as primary path — only the activation timing (A1) undermines it.
- **`pipeCache` dirty-flagging is correct** (full upstream identity in the key, proper
  invalidation); GC discipline via typed-array pool and reused blit canvas.
- **Draft autosave to IndexedDB** with resume banner = native-app persistence, zero cloud.
- Safe-area insets applied consistently; system font + inline SVG (no icon-font fetch);
  `prefers-reduced-motion` honored including a static Iris variant.

## Suggested order of attack

| # | Item | Why first | Size |
|---|------|-----------|------|
| 1 | A1 share fallback (`NotAllowedError` ≠ cancel) | users currently lose exports | hours |
| 2 | A3 parallel script loading + `<link>` CSS | biggest first-load win, one-liner class | hours |
| 3 | A2 context-loss guards + cache invalidation | kills the "black photo" failure mode | hours |
| 4 | B3 quick wins: object-URL load, iOS export cap, free geometry intermediates | memory headroom on iOS | hours |
| 5 | B4 SW `ignoreSearch` + version purge | real offline + no cache bloat | hours |
| 6 | C1 sheet dismiss + C2 crop handles | most-felt UX polish | 1 day |
| 7 | B1/B2 settle + detail renders → worker | the structural responsiveness win | 1-2 days |
| 8 | C3 PWA assets + install promotion | distribution/retention | 1 day |
| 9 | B5 shared GL context → GPU-resident preview | endgame: preview effectively free | ~1 week |

Verification note: gesture probe lives outside the repo (session scratchpad,
`gesture-test.mjs` — Playwright, CDP touch synthesis); consider porting it into `testing/`
next to `mobile-layout-test.mjs` so both run per release.
