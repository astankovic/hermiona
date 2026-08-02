# Image pipeline

Authoritative order of operations for Hermiona’s pixel path.  
Source of truth: `js/engine.js` → `HermionaEngine.process()`, with look layers in `js/looks.js` and scene optics in `js/scene/*`.

## Working vs export

| Stage | Behavior |
|-------|----------|
| **Preview (working)** | After open / geometry bake, the live buffer is sized so the **long edge is ~1400 px** (`maxWorkingSize` in `app.js`). Edits scrub on this buffer. |
| **Export** | `js/export.js` **re-runs** `Engine.process` at the chosen target (working / 1080 / 2048 / full), after geometry rebuild from the original when available. Grain modes are static so preview character can match export. |
| **Fast scrub** | `options.fast` skips spatial work: clarity, sharpen, CoC build, DoF, manual grain; looks run with reduced cost. |

Portrait AI is **optional and lazy**: MediaPipe loads only when the user enables DoF / uses Analyze (see `js/scene/analyze.js`). Core grade does not require it.

## Process order (`Engine.process`)

Input is **working RGB** `ImageData` (copy of the source buffer).

```
working RGB
  │
  ├─ 1. Light
  │     exposure → contrast → shadows → highlights → whites → blacks
  │
  ├─ 2. Color
  │     temperature → tint → saturation → vibrance
  │
  ├─ 3. Effects (spatial; skipped when options.fast)
  │     clarity → sharpen
  │
  ├─ 4. Scene CoC (if optics + scene.depthMap; not in fast)
  │     build shared circle-of-confusion map (focus, aperture, focal recipe)
  │     used by lens CA/bloom weighting and DoF
  │
  ├─ 5. Looks.applyLooks (if options.look)
  │     film look          (curves / stock grade / film grain)
  │     → camera body      (body grade, optical vignette character, leak, grain boost, …)
  │     → imperfections    (I6: soft corners, dust, scratches, gate, CA-ish mechanical, …)
  │     → lens             (lens vignette / softness / CA / bloom; CoC-weighted when map present)
  │
  ├─ 6. Scene optics — portrait DoF / bokeh (if optics.enabled + strength + scene maps)
  │     HermionaDoF.apply on the same CoC
  │
  ├─ 7. Debug overlays (optional: depth | mask | coc)
  │
  ├─ 8. Manual Effects.vignette  (params.vignette)
  │
  └─ 9. Manual Effects.grain     (if options.grain && params.grain; not in fast)
        → output ImageData
```

### Notes that match the code

- **Light and color are one pixel pass** in `engine.js` (exposure through vibrance), then spatial clarity/sharpen.
- **Film → camera → imperfections → lens** is fixed inside `Looks.applyLooks` (`js/looks.js`). Imperfections sit **between** camera body and lens.
- **Portrait DoF runs after looks**, so blur is applied on top of film/camera/lens character (not before grade).
- **Manual vignette and grain** (Effects panel) are last; they are separate from film grain and camera/lens vignette baked into looks.
- **Presets** are recipes that set film + camera + lens + grade params + optional imperfection amounts; they still go through the same order.

## Scene analysis (off the process path)

`HermionaScene.analyze(workingCanvas)` produces maps in working UV space:

- person confidence mask  
- pseudo-depth  
- focus depth prior  

These are **not** a grade step; they feed CoC + DoF when Portrait optics are on. Analysis can fall back to a soft center prior if MediaPipe fails.

On high-res export, maps are upsampled / reused according to export + scene wiring in the app (see `docs/scene-aware-optics.md` for design detail).

## Related docs

- [scene-aware-optics.md](./scene-aware-optics.md) — depth / DoF design  
- [licenses.md](./licenses.md) — MediaPipe and CDN notices  
- [production-roadmap.md](./production-roadmap.md) — P0-TRUST and follow-ups  
- [Privacy](../privacy.html) — user-facing privacy page  

---

*Documented against `engine.js` / `looks.js` / `export.js` for P0-TRUST (2026-08-02).*
