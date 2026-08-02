# Hermiona smoke tests (P0-TEST)

Zero-dependency browser checks for the CPU engine and export path. No MediaPipe, no real photos, no bundler.

## What is covered

| # | Case |
|---|------|
| 1 | `HermionaEngine` exists and exposes `process` |
| 2 | Neutral params (all zeros) on solid gray 128 → mean RGB stays ~128 (±3) |
| 3 | Positive `exposure` raises mean luma |
| 4 | `process` preserves width/height |
| 5 | `HermionaExport.buildExportCanvas({ size: 'working' })` on synthetic data does not throw; dims match |
| 6 | `scaleCanvasToLongEdge` downscales correctly and never upscales |
| 7 | `rebuildGeometry` with empty ops preserves size (synthetic image) |

## How to run

### Preferred (local static server)

From the repo root:

```bash
npx serve .
```

Then open:

- http://localhost:3000/tests/  
  (port may vary — follow the CLI URL)

Or from parent of `hermiona` / with serve pointing at parent:

```bash
npx serve ..
```

→ open `/hermiona/tests/` (adjust path to match).

### File URL

Scripts are classic (non-module) tags, so opening `tests/index.html` via `file://` often works in desktop Chrome. If scripts fail to load (CORS / local file restrictions), use `npx serve` instead.

## Acceptance

- All asserts green on desktop Chrome.
- Failures list the assert message under **#results**.
- No network required for core tests.

## Files

- `tests/index.html` — dark runner page; loads `../js/*` then `run.js`
- `tests/run.js` — minimal assert framework + cases

Production `app.js` is not loaded or modified.
