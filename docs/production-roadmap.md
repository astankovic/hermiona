# Hermiona — Production roadmap

**Status:** active  
**Date:** 2026-08-02  
**Positioning:** On-device film lab with credible optics — not a Lightroom clone.  
**Constraint:** SPA · mobile-first · no backend · privacy · keep lightweight  

Related: [`backlog.md`](./backlog.md) (AI/scene), [`scene-aware-optics.md`](./scene-aware-optics.md).

---

## North star

Ship a product that:

1. **Does not crash or lie** — preview ≈ export, OOM handled, errors recoverable.  
2. **Feels pro on basics** — histogram, curves, HSL, local tools (P1).  
3. **Owns the niche** — film / analog / scene optics (AI backlog).  
4. **Installs & works offline** — real PWA after first visit.  
5. **Is maintainable** — tests, docs, versioning.

---

## Legend

| Field | Meaning |
|-------|---------|
| **ID** | Ticket id (`P0-*`, `P1-*`, `P2-*`) |
| **Effort** | S ≈ 0.5–1 day · M ≈ 2–4 · L ≈ 1–2 weeks |
| **Parallel?** | Safe to build beside others (file ownership) |

---

## Queue overview

| Order | ID | Title | Effort | Parallel? |
|------:|----|-------|--------|-----------|
| 1 | **P0-PWA** | Installable offline PWA | M | yes (new files) |
| 2 | **P0-HIST** | Histogram + clipping | M | yes (new module + thin UI) |
| 3 | **P0-SAFE** | Error boundaries + OOM-safe export | M | yes (errors.js + export) |
| 4 | **P0-TEST** | Engine / export smoke tests | M | yes (tests/) |
| 5 | **P0-TRUST** | Privacy, licenses, pipeline doc | S | yes (docs + privacy.html) |
| 6 | **P0-PARITY** | Document + harden preview/export parity | M | after SAFE |
| 7 | **P1-CURVE** | Tone curve UI | M | |
| 8 | **P1-HSL** | HSL selective color | M | |
| 9 | **P1-WB** | WB eyedropper | S | |
| 10 | **P1-LOCAL** | Linear + radial masks | L | |
| 11 | **P1-PRESET** | User presets save/load | M | |
| 12 | **P1-META** | Preserve EXIF on export | M | |
| 13 | **P2-LIB** | Local library (IndexedDB) | L | |
| 14 | **P2-GPU** | WebGL grade path | L | |
| 15 | **P2-HEAL** | Spot heal | M | |
| 16 | **P2-PERSP** | Perspective correct | M | |
| — | **I5e / I5d** | See [`backlog.md`](./backlog.md) | M–L | after P0 |

---

# P0 — Production foundation

---

## P0-PWA — Installable offline PWA

### Goal
App installs on home screen and works offline for core editing after first load (AI models still lazy/network-first).

### Deliver
- `manifest.webmanifest` (name, icons, theme `#050505`, `display: standalone`)
- `sw.js` — precache shell: `index.html`, `styles.css`, `app.js`, `js/**`, `favicon.svg`, `apple-touch-icon.png`
- Register SW from small `js/pwa.js` (only on https / localhost)
- Cache strategy: shell **cache-first** with version; skip large CDN models (MediaPipe) or network-first
- `?fresh=1` still busts app assets via existing `__H_V`

### Acceptance
1. Lighthouse / manual: installable on mobile Chrome.  
2. Airplane mode after warm visit: open app, load was already-cached photo flow works if image in memory; shell loads.  
3. Deploy with new `__H_V` updates CSS/JS (SW respects query or versioned cache name).  
4. No SW registration failure blocks app boot.

### Files (ownership)
`manifest.webmanifest`, `sw.js`, `js/pwa.js`, thin hooks in `index.html`

### Out of scope
Background sync, push, offline photo library (→ P2-LIB).

---

## P0-HIST — Histogram + clipping indicators

### Goal
Live luminance (+ optional RGB) histogram while editing; show shadow/highlight clipping.

### Deliver
- `js/histogram.js` — pure functions: `compute(ImageData) → { luma, r, g, b, clipLow, clipHigh }`
- Canvas widget in stage or dock (compact, non-blocking)
- Toggle: off by default on tiny screens optional; on when image loaded
- Clipping blink overlay optional (hold or toggle “Show clipping”)
- Recompute throttled with preview process (idle / rAF)

### Acceptance
1. Drag exposure → histogram shifts live.  
2. Extreme exposure shows clip % or blink regions.  
3. Cost &lt; 8 ms on working ~1400 long edge mid phone (downsample hist source to ≤256 long if needed).  
4. No main-thread multi-frame freeze.

### Files
`js/histogram.js`, CSS `.histo-*`, thin `app.js` / `index.html` wire

### Out of scope
Waveform, vectorscope, soft-proof.

---

## P0-SAFE — Error boundaries + OOM-safe export

### Goal
Never leave user on a dead UI; large exports degrade gracefully.

### Deliver
- `js/errors.js` — `report(err, context)`, toast/banner API, optional `console.error` + in-memory ring buffer
- Global `window.onerror` / `unhandledrejection` → non-fatal banner
- Export path: try full → on failure retry 2048 → 1080; clear message
- Busy overlays always clear in `finally`
- Download button re-enabled after fail

### Acceptance
1. Forced process throw shows recoverable UI.  
2. Simulated OOM path falls back size and still downloads or explains.  
3. No stuck spinner after any caught failure.

### Files
`js/errors.js`, `js/export.js`, `app.js` export/load handlers

---

## P0-TEST — Engine / export smoke tests

### Goal
Automated checks that core math and export pipeline don’t regress without a browser QA pass every time.

### Deliver
- `tests/index.html` — zero-deps runner in browser (or node if easy without bundler)
- Cases:
  - `clamp` / process identity (all params 0 ≈ passthrough within tol)
  - Exposure +1 changes mean luma up
  - Export `buildExportCanvas` working size matches working dims
  - Rebuild geometry no-ops empty ops
- Runnable: open `tests/index.html` or `npx serve` + path
- Document in README

### Acceptance
1. All green on desktop Chrome.  
2. Failures print which assert.  
3. No network required for core tests (no MediaPipe).

### Files
`tests/**` only (load `../js/engine.js` etc.)

---

## P0-TRUST — Privacy, licenses, pipeline doc

### Goal
Trust pages for a production public app + internal pipeline truth.

### Deliver
- `privacy.html` — on-device processing, no upload server, model CDN downloads, no analytics (state honestly)
- Model/third-party licenses (MediaPipe Apache-2.0, etc.)
- `docs/pipeline.md` — order of operations (light → color → film → camera → selective → optics → grain)
- Link from app footer/empty state or “…” menu (minimal)

### Acceptance
1. Privacy page readable on mobile.  
2. Pipeline doc matches `engine.js` order (update if code differs).  
3. README links privacy + pipeline.

### Files
`privacy.html`, `docs/pipeline.md`, `docs/licenses.md`, README links

---

## P0-PARITY — Preview / export parity harden

### Goal
What you see is what you get (WYSIWYG) within documented limits.

### Deliver
- Document working long edge vs export sizes
- Grain: static seed already — verify strength scales with res
- Scene maps upsample rules documented + tested
- Optional: “Match export” preview mode (process at 2048 proxy) — flag, not default on mobile

### Depends
P0-SAFE, P0-TEST helpful

### Acceptance
Side-by-side working vs export-2048 on 3 test images: no obvious grade shift.

---

# P1 — Competitive editing floor

## P1-CURVE — Tone curve UI
Point curve (RGB + luma) or parametric (highs/lights/darks/shadows). Drive engine LUT. Default linear.

## P1-HSL — HSL selective
8 hue bands: H/S/L sliders. Engine: classify pixels by hue, adjust.

## P1-WB — Eyedropper
Tap photo → set temp/tint so sample → neutral gray.

## P1-LOCAL — Linear + radial masks
One mask system: feather, invert, amount; exposure/temp/sat subset. Brush later.

## P1-PRESET — User presets
Serialize params + look + optics-lite to JSON; localStorage/IDB; import/export file.

## P1-META — EXIF preserve
On export JPEG, copy orientation-corrected pixels + preserve copyright/GPS opt-out; use minimal EXIF writer or canvas + piexif-class small lib.

---

# P2 — Workflow & engine ceiling

| ID | Title | Notes |
|----|-------|-------|
| P2-LIB | Local library | IndexedDB thumbnails + last edit |
| P2-GPU | WebGL grade | Port light/color to shaders |
| P2-HEAL | Spot heal | Patch match or simple clone |
| P2-PERSP | Perspective | 4-corner free transform |
| I5e / I5d | Scene AI | [`backlog.md`](./backlog.md) |

---

## Execution rules

1. **P0 first** before more film looks or AI.  
2. Prefer **new modules** over growing `app.js` when possible.  
3. **No bundler required** — keep GH Pages static.  
4. Each ticket: acceptance checklist in PR description.  
5. Bump `window.__H_V` on ship.

---

## Current sprint (active)

```
[x] production-roadmap.md
[x] P0-PWA      — manifest + sw.js + js/pwa.js
[x] P0-HIST     — js/histogram.js + live panel in app
[x] P0-SAFE     — js/errors.js + export size fallback
[x] P0-TEST     — tests/ browser smoke suite
[x] P0-TRUST    — privacy.html + docs/pipeline.md + licenses
[x] wire + smoke
[ ] P0-PARITY   — next
[ ] P1-*        — curves / HSL / local …
```

*When a ticket lands, check it here and in git commit message (`P0-HIST: …`).*
