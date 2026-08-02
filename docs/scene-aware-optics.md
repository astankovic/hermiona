# Hermione — Scene-Aware Optics & Authentic Looks

**Status:** Design + **I5a + I5b + I5c implemented**  
**Date:** 2026-08-02  
**Scope:** Depth + object understanding → physically motivated lens / portrait simulation  
**Constraint:** Single-page mobile web app, no backend, on-device inference preferred  

**I5a:** person mask, pseudo-depth, portrait DoF (`analyze.js`, `depth-pseudo.js`, `dof.js`)  
**I5b:** shared CoC (`coc.js`), focal recipes 35/50/85/anamo, CA/bloom/soft weighted by CoC  
**I5c:** bokeh highlights (`bokeh.js`) — circle / hex / anamorphic discs + cat-eye  

---

## 1. Problem

Current Hermione looks (film, analog body, lens) are **global 2D grades**:

- Soft focus blurs / flattens the whole frame  
- Vignette and CA ignore subject distance  
- “Portrait” character cannot separate person from background  
- Anamorphic flare reacts to brightness only, not depth or specular structure  

Real photography is **scene-dependent**:

| Physical effect | Depends on |
|-----------------|------------|
| Depth of field / bokeh | Distance to focus plane, aperture, focal length, sensor |
| Subject separation | What’s in focus vs background |
| Halation / bloom | Specular highlights, often far / out of focus |
| Portrait rendering | Skin / face region priors |
| Environmental haze | Sky / far depth |

To move from “Instagram preset” to **credible optical simulation**, Hermione needs a **scene understanding layer** (masks + depth + focus) that the optics engine can consume.

---

## 2. Goals

### Primary
1. Infer **subject masks** (at least person; later multiclass).  
2. Infer or approximate a **depth map** per photo.  
3. Drive **lens / DoF / bokeh** from depth + aperture + focus.  
4. Keep app **SPA, mobile-first, offline-capable after first model cache**.  
5. Stay **composable** with existing film / analog / global grades.

### Non-goals (this design)
- Multi-page app, accounts, cloud processing  
- True light-field / dual-camera depth  
- Real-time camera viewfinder (photo-only for v1 of scene AI)  
- Perfect metric depth in meters (relative depth is enough)

### Success metrics
| Metric | Target |
|--------|--------|
| Portrait DoF “reads as portrait” | Naive user preference vs global blur in A/B |
| Analysis time on mid phone | &lt; 1.5s on working-size proxy (≤512px) |
| First model download | Lazy; UI never blocks upload |
| Export parity | DoF + looks on full pipeline, not only preview |
| Privacy | No image bytes leave device |

---

## 3. Photography model (what we simulate)

### 3.1 Thin-lens / circle of confusion (practical)

We do **not** need a full optical bench. A usable model:

```
depth(x,y) ∈ [0, 1]     // 0 = near, 1 = far (relative)
focusDepth ∈ [0, 1]
apertureStrength ∈ [0, 1]  // mapped from f-number UI

coc(x,y) = |depth(x,y) − focusDepth| * apertureStrength * focalFactor
blurRadius(x,y) = min(maxBlur, k * coc(x,y))
```

**Focal length recipes** (35mm-equivalent feel, not optical truth):

| Recipe | focalFactor | Typical use |
|--------|-------------|-------------|
| 24–35mm environmental | 0.6–0.8 | wider, deeper apparent DoF |
| 50mm standard | 1.0 | general |
| 85mm portrait | 1.3–1.6 | stronger separation |
| Anamorphic | 1.1 + oval bokeh | streaks + oval CoC |

**f-stop UI → apertureStrength** (perceptual curve, not linear f):

```
f/1.4 → ~1.0
f/2.0 → ~0.75
f/2.8 → ~0.5
f/4   → ~0.3
f/8   → ~0.1
f/16  → ~0.0
```

### 3.2 Effect routing by scene

| Effect | Global today | Scene-aware target |
|--------|--------------|--------------------|
| Film curves / grain | Global | Stay global |
| Camera light leak | Global | Stay global (optional edge prior) |
| Optical vignette | Radial | Radial (+ optional depth darken far) |
| Soft / bloom | Whole image | Weight by `coc` and highlight mask |
| CA | Radial only | Radial × (0.3 + 0.7·coc) |
| DoF blur | None | Primary consumer of depth |
| Bokeh orbs | None | Far × bright × high coc |
| Skin softness | None | Person/face mask only |
| Sky grade | None | Sky class or far-depth band |

**Pipeline order (target):**

```
working RGB
  → light / color / clarity (global)
  → FILM look (global)
  → CAMERA body (global)
  → SCENE-AWARE LENS
        depth + focus → coc map
        DoF blur / bokeh
        coc-weighted CA / bloom
  → manual vignette / grain
  → output
```

---

## 4. Scene understanding stack

### 4.1 Outputs of analysis (contract)

```ts
type SceneAnalysis = {
  version: 1;
  /** Working-pixel size of maps (may be lower than display; upsampled on use) */
  width: number;
  height: number;

  /** 0..1 person probability, tightly feathered */
  personMask: Float32Array;

  /** Optional multiclass id per pixel or separate masks */
  labels?: Uint8Array; // 0=bg, 1=person, 2=sky, ...

  /** Relative depth 0=near .. 1=far */
  depthMap: Float32Array;

  /** Confidence of depth (pseudo vs ML) */
  depthSource: 'pseudo' | 'ml';

  face?: {
    box: { x: number; y: number; w: number; h: number }; // normalized 0..1
    centerDepth: number;
  };

  /** Suggested focus plane */
  focusDepth: number;

  /** ms + model ids for debug */
  meta: {
    segmenter?: string;
    depthModel?: string;
    elapsedMs: number;
  };
};
```

Maps are always in **working-image UV space** (after bake of crop/rotate). On full-res export: either re-run analysis at higher proxy size or bilinear-upsample masks/depth to export size.

### 4.2 Segmentation

#### Phase A — Person (required)
- **MediaPipe Tasks Vision** — Image Segmenter or selfie/person category model via `@mediapipe/tasks-vision` (WASM, CDN).  
- Run on downscaled proxy (longest edge **384–512**).  
- Output confidence mask → resize to working size with bilinear + slight feather.

#### Phase B — Multiclass (optional)
- DeepLab-style MediaPipe models (person, sky, vegetation, etc. depending on model).  
- Enables sky haze, foliage microcontrast, etc.

#### Phase C — Face
- **Face Landmarker** for focus priority and future skin region.  
- If face present: `focusDepth ≈ depth at face center`; else median depth of person mask; else 0.35.

### 4.3 Depth

#### Tier 0 — Pseudo-depth (ship first)
Build depth without a large model:

```
depth = 0.15 * personMask          // subject near
      + 0.85 * (1 - personMask)    // background far
      + edgePrior * 0.05           // optional
      + verticalPrior * 0.05       // bottom slightly nearer (ground)
```

Feather person edges (5–12px at working res).  
**Good for portraits; weak for landscapes / multi-plane scenes.**

#### Tier 1 — Monocular ML depth (optional “Pro”)
- Browser: ONNX Runtime Web or Transformers.js with a small depth model (e.g. Depth-Anything-class, quantized).  
- Lazy load (20–80MB class models — user-triggered).  
- Output relative depth; normalize per image (percentile stretch 2–98%).  
- Fuse with person mask:  
  `depth' = lerp(depth_ml, depth_pseudo, 0.15)` near person edges for stability.

#### Tier 2 — (Future) Interactive depth
- User brush “near / far” or tap-to-focus refining plane.  
- Out of scope for first implementation milestone.

### 4.4 When to analyze

| Event | Action |
|-------|--------|
| Image loaded | Schedule analysis (idle / after first paint) |
| Crop / rotate / flip baked | Invalidate + re-analyze |
| Slider light/color/film | **Do not** re-analyze |
| Export full-res | Upsample maps or re-analyze at ≤768–1024 proxy |

Cache key: hash of geometry ops + image identity + analysis version.

---

## 5. Optics engine

### 5.1 CoC map
```
coc = saturate(|depth - focusDepth| * apertureStrength * focalFactor)
```
Optional: raise background more than foreground (`asymmetric DoF`) for portrait feel:
```
if (depth > focusDepth) coc *= 1.15; else coc *= 0.85;
```

### 5.2 Variable blur (performance-conscious)

True per-pixel radius blur is expensive on CPU.

**Recommended approach (mobile CPU/WebGL later):**

1. Build 3–4 blur layers at fixed radii (e.g. 0, 2, 6, 14 px at working res).  
2. For each pixel, blend between layers by `coc`.  
3. Blur layers computed on **half-res**, upsampled.  

WebGL upgrade path: single shader with mip-like dual filtering; same `coc` texture.

### 5.3 Bokeh highlights
```
highlight = luma > T && coc > C0
```
- Scatter bright pixels into discs (circle / hex / horizontal anamorphic scale).  
- Phase 1: stretched Gaussian is acceptable.  
- Phase 2: sprite stamp kernel by aperture shape.

### 5.4 CA / bloom coupling
- Existing radial CA × `(0.25 + 0.75 * coc)`.  
- Bloom / soft-focus from current lens pack applied with weight `coc` (in-focus stays crisp).

### 5.5 Lens pack evolution

Keep catalog IDs; add physical fields:

```js
{
  id: 'portrait85',
  name: '85mm Portrait',
  focalFactor: 1.45,
  defaultAperture: 1.8,
  bokehShape: 'circle',
  caBase: 0.12,
  bloomBase: 0.15,
  // global falloffs still apply lightly
  vignette: 0.2
}
```

Legacy soft/vintage/dream become recipes that set defaults for coc-weighted bloom rather than full-frame mush.

---

## 6. Application architecture

### 6.1 Modules (proposed)

```
js/
  scene/
    analyze.js       # orchestrate segment + depth + focus
    segment-mp.js    # MediaPipe wrapper (lazy)
    depth-pseudo.js  # tier 0
    depth-ml.js      # tier 1 optional
    focus.js         # auto focus heuristics
  optics/
    coc.js           # coc map from depth + params
    dof-blur.js      # layered blur composite
    bokeh.js         # highlight treatment
  looks.js           # film + camera (unchanged role)
  engine.js          # process(..., { look, scene, optics })
  export.js          # pass scene maps upscaled
  app.js             # UI + lifecycle
```

Still no bundler required: ES modules or script tags + dynamic `import()` for MediaPipe.

### 6.2 State additions

```js
state.scene = {
  status: 'idle' | 'loading_models' | 'analyzing' | 'ready' | 'error',
  analysis: null, // SceneAnalysis
  showDebug: false, // mask / depth overlay
};

state.optics = {
  enabled: true,
  aperture: 2.0,       // f-number display
  focusDepth: null,    // null = use analysis.focusDepth
  focalRecipe: '50',   // '35' | '50' | '85' | 'anamo'
  bokehShape: 'circle',
};
```

### 6.3 UI (Look tab extension)

```
Look
  Film ………
  Analog ………
  Lens ………   (existing cards; physical recipes added)
  ── Scene / DoF ──
  [Analyze scene]  or auto after upload
  Aperture  f/1.4 ──────── f/16
  Focus     near ←●→ far   (or tap on canvas)
  ☐ Show depth
  ☐ Show subject
```

Canvas: optional tap-to-focus sets `focusDepth` from depth map at tap UV.

### 6.4 Engine API extension

```js
Engine.process(srcImageData, params, {
  look,
  grainMode,
  quality, // preview | export
  scene,   // SceneAnalysis | null
  optics,  // optics state
});
```

If `scene` is null or optics disabled → current global lens path (backward compatible).

---

## 7. Implementation phases

### Phase I5a — Portrait foundation *(first build)*
**Deliver**
- Lazy MediaPipe person segmentation  
- Pseudo-depth from mask  
- Auto focus on person/face  
- Background DoF blur (layered)  
- Debug overlays  
- Cache invalidate on geometry bake  

**Done when:** portrait photos show clear subject/background separation without melting the face.

### Phase I5b — Optical parameters
- Aperture + focus + focal recipe wired to coc  
- CA/bloom weighted by coc  
- Export uses same optics (upsampled maps)

### Phase I5c — Bokeh quality
- Highlight discs / anamorphic stretch  
- Shape presets  

### Phase I5d — Monocular depth (optional Pro)
- Quantized depth model lazy load  
- Better multi-plane scenes  
- Settings: “Brzi depth (maska)” vs “Pro depth (ML)”

### Phase I5e — Semantic looks
- Sky / skin selective grading  
- Film halation only on specular + far  
- Contax/clinical microcontrast on subject only  

---

## 8. Performance budget (mobile)

| Step | Budget |
|------|--------|
| Model first download | Async; progress text |
| Segment proxy 512px | &lt; 800ms mid-range after warm |
| Pseudo-depth | &lt; 30ms |
| DoF composite working 1600 | &lt; 100ms preview; progressive OK |
| Slider aperture | Reuse blur layers when possible; throttle |

Strategies:
- Analyze at 384–512, not full working  
- Half-res blur layers  
- `requestIdleCallback` / yield to UI  
- WebWorker for inference if main-thread jank  
- Later: WebGL for blur composite  

---

## 9. Export

1. Start from full-res geometry rebuild (existing export path).  
2. Upsample `personMask` and `depthMap` to export size (bilinear).  
3. Rebuild coc at export resolution.  
4. Run DoF at export with slightly higher max blur radius (scale radii by `exportLong / workingLong`).  
5. Film/camera global passes unchanged.  

If memory fails: run optics at max 2048 long edge then composite… prefer quality first; cap only on OOM.

---

## 10. Privacy & packaging

- All inference **on-device**.  
- Models from reputable CDN (jsDelivr / Google storage for MediaPipe assets) or vendored under `models/`.  
- Document model licenses (MediaPipe Apache-2.0 typically).  
- No telemetry of images.  
- README: first DoF use downloads model (~few MB for person; larger for Pro depth).

SPA purity: still static hosting (GitHub Pages). Dynamic import does not require a bundler if using native ESM + import maps or single CDN vision bundle.

---

## 11. Risks & mitigations

| Risk | Mitigation |
|------|------------|
| Bad masks on groups / pets | Manual focus slider; feather; eventual multiclass |
| Pseudo-depth fails on landscapes | Gate DoF strength; push Pro depth |
| Model load fails offline first visit | Graceful fallback to global lens |
| Mobile memory on full export + blur | Cap optics res; reuse buffers |
| Uncanny “AI look” | Keep film authentic; optics subtle by default |
| Scope creep | Ship I5a only before any bokeh sprites |

---

## 12. Open decisions

| Decision | Default in this doc |
|----------|---------------------|
| Auto-analyze on upload vs button | **Auto** after first render (cancellable) |
| Default aperture | **f/2.8** mild separation |
| Default when no person | Optics mild / disabled auto |
| Pro depth default off | **Yes** |
| WebGL for DoF | After CPU layered blur proves UX |

---

## 13. Relationship to existing code

| Existing | Role after scene-aware |
|----------|------------------------|
| `js/looks.js` film/camera | Unchanged global character |
| `js/looks.js` lens soft/CA | Migrate to coc-weighted / recipes |
| `js/engine.js` | Accept `scene` + `optics`; call dof after looks |
| `js/export.js` | Pass scene; scale blur radii |
| Crop ops | Invalidate scene cache |

No rewrite of film science required for I5a.

---

## 14. Suggested next implementation ticket (when approved)

**Title:** I5a — Person mask + pseudo-depth + portrait DoF  

**Tasks**
1. Add `js/scene/*` stubs + MediaPipe person segmenter (lazy CDN).  
2. Pseudo-depth + focus heuristics.  
3. Layered background blur in engine when `optics.enabled`.  
4. Look tab: DoF strength / focus / debug toggles.  
5. Invalidate on crop apply; upsample on export.  
6. Manual QA: portrait, full-body, no-person landscape, group.

**Out of ticket:** ML monocular depth, hex bokeh, WebGL.

---

## 15. References (implementation research)

- MediaPipe Image Segmenter (Web JS) — on-device category/confidence masks  
- MediaPipe Face Landmarker — focus prior  
- MediaPipe Tasks Vision WASM (`@mediapipe/tasks-vision`)  
- Monocular depth in browser via ONNX / Transformers.js (Phase I5d)  
- Classical CoC / portrait rendering practice (asymmetric DoF, highlight thresholding)

---

## 16. Summary

Authentic filters at the next level are not more LUTs — they are **scene-conditioned optics**.  

Hermione should:

1. **Understand** the frame (person → multiclass → depth).  
2. **Focus** deliberately (face / tap / slider).  
3. **Simulate glass** with CoC-driven blur, CA, bloom, bokeh.  
4. **Keep** film/analog as global color science on top.  
5. **Remain** a private, static, mobile SPA with lazy models.

This document is the blueprint. Implementation starts at **Phase I5a** when product approves build work.
