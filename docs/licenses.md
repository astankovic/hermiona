# Licenses & third-party notices

Short inventory of code and assets Hermiona ships or may load at runtime.  
This is not legal advice; check upstream sources for the full text of each license.

## Hermiona application code

Hermiona’s own source in this repository (HTML, CSS, JS under the app root and `js/`).

- If a root `LICENSE` file is present in the repository, that license applies.
- If no `LICENSE` file is present, treat usage as “see repository” / contact the maintainers until a license is published.

Brand system description and assets under `brand/` are part of the Hermiona project; see `brand/README.md`. Do not assume a separate open license for marks or photography unless stated there or in a root license.

## MediaPipe Tasks Vision

Optional Portrait / Analyze path loads **@mediapipe/tasks-vision** (WASM + JS) from a public CDN (jsDelivr in current code).

- **License:** Apache License 2.0 (Google / MediaPipe)
- Upstream: [MediaPipe](https://github.com/google-ai-edge/mediapipe), [tasks-vision on npm](https://www.npmjs.com/package/@mediapipe/tasks-vision)

## Selfie segmenter model

On first Portrait/Analyze use, the app may download a selfie / person segmenter TFLite model from Google storage (path configured in `js/scene/analyze.js`).

- Treat model terms as per **MediaPipe model cards / Google MediaPipe model distribution** for that asset.
- Do not invent additional license claims; verify the model card if you redistribute the weights yourself.

## CDN hosts

Runtime fetches (only when optional AI is used, or for script hosting if you pin CDN URLs):

| Host | Typical use |
|------|-------------|
| **jsDelivr** (`cdn.jsdelivr.net`) | `@mediapipe/tasks-vision` ESM + WASM |
| **Google Cloud Storage** (`storage.googleapis.com`) | MediaPipe model files (e.g. selfie segmenter) |

CDN terms of use are those of the respective operators. Hermiona does not operate these hosts.

## Brand assets (`brand/`)

Logo marks, wordmark, lockups, brand board, and hero still under `brand/`.

- Project-owned creative assets.
- Usage: follow `brand/README.md` (clear space, mark geometry). License for redistribution follows the repository license if/when published; otherwise “see repository.”

## What is *not* claimed here

- System fonts / OS UI fonts used by the browser.
- User photos (always the user’s content).
- Future optional models (e.g. monocular depth) — document separately if added.

---

*Last reviewed with the codebase for P0-TRUST (2026-08-02).*
