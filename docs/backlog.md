# Hermiona — AI / Scene backlog

**Status:** planned (research → tickets)  
**Date:** 2026-08-02  
**Constraint:** SPA · mobile-first · no backend · on-device · lazy models · keep lightweight  

Related design: [`scene-aware-optics.md`](./scene-aware-optics.md) (I5a–I5c shipped).

Priority order below is intentional: **semantic understanding first** (same MediaPipe stack, small download), then **Pro monocular depth** (new runtime, ~27 MB opt-in).

---

## Legend

| Field | Meaning |
|-------|---------|
| **ID** | Ticket id (extends I5 phase numbering) |
| **Depends** | Must ship / land first |
| **Effort** | S ≈ 1–2 days · M ≈ 3–5 · L ≈ 1–2 weeks (one engineer) |
| **Default?** | Whether feature runs without explicit user opt-in |

---

## Queue

| Order | ID | Title | Effort | Default? | Depends |
|------:|----|-------|--------|----------|---------|
| 1 | **I5e** | Multiclass + Face + selective looks | M | Portrait on | I5a–c |
| 2 | **I5d** | Pro monocular depth (Depth Anything V2 Small) | L | Off (Pro) | I5e preferred |

---

# I5e — Multiclass segmentation + Face Landmarker + selective looks

## Goal

Upgrade scene analysis from a single **person mask** to **semantic person parts** (hair / face-skin / body-skin / clothes / accessories) plus a reliable **face prior** for focus and portrait grading — then drive **subtle selective looks** that feel photographic, not “beauty AI”.

**Product promise:** Portrait mode understands *who* and *where the face is*, so film/optics can treat skin and subject differently from background — without a new runtime or large downloads.

## Why this first

- Same stack as today: `@mediapipe/tasks-vision` (already lazy-loaded).
- Models are small (order of a few MB), Apache-2.0 class MediaPipe assets.
- Unlocks visible quality jump on the core use case (portraits) before paying ~27 MB for monocular depth.
- Fills the gap already named in design as I5e; reordered ahead of I5d on purpose.

## Non-goals

- Monocular ML depth (→ I5d).
- General object cutout / rembg (u2netp later).
- Face restore, skin “beauty filters”, generative edit.
- Hair recolor product UI (mask can land; dedicated tool later).
- Sky / landscape multiclass (DeepLab) — out of this ticket.
- Auto-analyze on every upload (keep current: cold until Portrait / Analyze).

## User-facing behavior

### Portrait tab (extend existing)

| Control | Behavior |
|---------|----------|
| Existing aperture / focus / lens / bokeh | Unchanged |
| **Skin soft** (new slider 0–100, def 0) | Mild low-pass + slight clarity down on `face-skin` ∪ soft `body-skin` only |
| **Subject punch** (new slider 0–100, def 0) | Mild local contrast / clarity up on person (or clothes∪skin), not background |
| Analyze | Loads multiclass + face if needed; progress: “Loading AI model…” → “Analyzing scene…” |
| Debug | Existing Mask / Depth + new chips: **Face**, **Parts** (color-coded multiclass) |

Defaults stay **off / zero** so classic looks don’t change until the user opts in.

### Focus priority (auto, when focus not manual)

1. Face Landmarker box center → sample depth at center (current pseudo-depth ok).  
2. Else median depth of `face-skin` mask.  
3. Else median of full person mask (today).  
4. Else fallback `0.3`.

Manual Focus slider still wins when user has touched it (`focusManual`).

## Technical design

### Models (lazy, CDN)

| Role | Asset | Notes |
|------|--------|------|
| Multiclass segmenter | MediaPipe `selfie_multiclass_256x256` (float32) | Classes: 0 bg · 1 hair · 2 body-skin · 3 face-skin · 4 clothes · 5 others |
| Face | MediaPipe `face_landmarker` float16 `.task` | IMAGE mode; `numFaces: 1` (or 2 later) |
| Person mask (compat) | Derived | `person = 1 − bg` confidence, or union of classes 1–5 |

Keep **selfie_segmenter** path as fallback if multiclass fails to load (degraded: no parts, person-only).

### `SceneAnalysis` contract extension

```ts
type SceneAnalysis = {
  version: 2; // bump from 1
  width: number;
  height: number;

  personMask: Float32Array;      // 0..1 — keep; DoF / CoC consumers unchanged
  depthMap: Float32Array;        // still pseudo until I5d
  depthSource: 'pseudo' | 'ml';

  /** Multiclass confidence maps (proxy res), optional if model failed */
  parts?: {
    hair: Float32Array;
    bodySkin: Float32Array;
    faceSkin: Float32Array;
    clothes: Float32Array;
    accessories: Float32Array;
  };

  face?: {
    box: { x: number; y: number; w: number; h: number }; // normalized 0..1
    center: { x: number; y: number };
    centerDepth: number;
    landmarks?: { x: number; y: number }[]; // optional sparse subset for debug
  };

  focusDepth: number;
  meta: {
    segmenter?: string;   // e.g. 'selfie_multiclass_256'
    faceModel?: string;   // e.g. 'face_landmarker'
    depthModel?: string;
    elapsedMs: number;
  };
};
```

- All maps stay in **analysis proxy UV** (long edge ~384–512); export / engine upsample via existing `resizeMap` / bilinear.
- `personMask` remains the single mask DoF/bokeh use so I5a–c paths don’t break.

### Module plan

```
js/scene/
  analyze.js          # orchestrate: multiclass + face + pseudo-depth + focus
  segment-mp.js       # optional split: MP segmenter load/run (if analyze.js grows)
  face-mp.js          # Face Landmarker lazy load + box extraction
  depth-pseudo.js     # unchanged role
  selective.js        # NEW: skin soft + subject punch from parts/person masks
  dof.js / coc.js     # no API break; still personMask + depthMap
```

Still **no bundler**: dynamic `import()` CDN ESM for MediaPipe (same pattern as today).

### Engine pipeline order

```
working RGB
  → light / color / clarity (global)
  → FILM + CAMERA looks (global)
  → SELECTIVE (skin soft, subject punch)   ← new, only if strength > 0 and masks ready
  → SCENE-AWARE LENS (CoC DoF / bokeh / CA)
  → vignette / grain
  → output
```

Selective passes must be **cheap**:

- Run at working res but mask-gated (skip pixels where mask &lt; ε).
- Preview may use downsampled blur for skin soft; export full quality.
- No extra ML at slider drag — only reprocess pixels with cached masks.

### State / UI

```js
state.optics = {
  // existing...
  skinSoft: 0,       // 0..1
  subjectPunch: 0,   // 0..1
};

state.scene = {
  status: 'idle' | 'loading_models' | 'analyzing' | 'ready' | 'error',
  analysis: null,
  debugMode: null | 'mask' | 'depth' | 'face' | 'parts',
};
```

Debug `parts`: composite RGB overlay (e.g. hair=magenta, face=peach, body=amber, clothes=cyan) × alpha on photo.

### Performance budget

| Step | Target (mid phone, warm) |
|------|---------------------------|
| Multiclass @ ~256–384 proxy | &lt; 250 ms CPU / &lt; 100 ms GPU class |
| Face Landmarker | &lt; 80 ms |
| Pseudo-depth + focus | &lt; 30 ms (unchanged) |
| Skin soft / subject punch @ working ~1400 | &lt; 40 ms preview |
| First model download | Async; never block upload chrome |

Load face + multiclass **in parallel** after first Portrait enable / Analyze.

### Export

- Upsample `personMask` + part maps + `depthMap` to export size (bilinear).
- Re-run selective + optics with scaled radii (same rules as current DoF export).
- If parts missing (fallback person-only): skin soft uses eroded person ∩ upper-third heuristic **or** disables skin soft with no crash.

### Privacy / packaging

- On-device only; no image upload.
- Document model names + licenses in README (MediaPipe Apache-2.0).
- Cache via browser HTTP cache / Cache API if already used for selfie model.

## Acceptance criteria

1. With Portrait enabled + Analyze, analysis returns `version: 2` with non-empty `parts` on a clear selfie / portrait.  
2. Face present → `face.box` set; auto `focusDepth` tracks face better than pure person median on half-body shots.  
3. Skin soft at mid value softens face/skin without melting background texture or clothes edges.  
4. Subject punch lifts subject microcontrast; background stays flatter.  
5. DoF / bokeh / CA paths unchanged when selective sliders are 0.  
6. Multiclass load failure → person-only path + toast/status; app usable.  
7. Crop / rotate / flip bake invalidates analysis (existing rule).  
8. Export applies selective + optics; no mask resolution “blocky” face edge at full size (feather + upsample).  
9. Debug: Mask, Depth, Face, Parts overlays work.  
10. Cold start of app still does not download vision models until Portrait/Analyze.

## Tasks (implementation checklist)

1. [ ] Extend `SceneAnalysis` + `upsampleAnalysis` for `parts` + `face`.  
2. [ ] Lazy multiclass segmenter (GPU → CPU retry like selfie).  
3. [ ] Map MP channels → `parts.*` + derive `personMask`.  
4. [ ] Lazy Face Landmarker; fill `face` + focus priority chain.  
5. [ ] Fallback to selfie_segmenter if multiclass fails.  
6. [ ] `selective.js`: skin soft + subject punch; wire in `engine.js`.  
7. [ ] Portrait UI sliders + debug Face / Parts.  
8. [ ] Invalidate / cache keys include analysis version.  
9. [ ] Export path upsample + selective.  
10. [ ] QA set: close-up portrait, full body, group, no person, side profile, hat/hair edge cases.  
11. [ ] README: models downloaded on Portrait advanced use.

## Out of ticket

- I5d Pro depth  
- WebGL DoF  
- Hair color tool  
- Multi-face focus picker UI  

## Risks

| Risk | Mitigation |
|------|------------|
| Multiclass weak on groups / distance | Person union still drives DoF; selective strengths low by default |
| Face miss (profile, occlusion) | Fall back to person median focus |
| Float32 multiclass heavier than float16 selfie | Proxy 256; parallel load; keep person-only fallback |
| Over-smoothing skin | Cap blur radius; preserve grain pass after selective |
| Scope creep into beauty app | Only two sliders; no auto beauty on load |

## Done when

A portrait looks **selectively graded** (skin softer, subject clearer) with **face-aware focus**, debug parts readable, and zero regression on film/DoF when selective = 0 — still fully on-device SPA.

---

# I5d — Pro monocular depth (Depth Anything V2 Small)

## Goal

Add an **opt-in Pro depth** path using **Depth Anything V2 Small** (~25M params, **~27 MB quantized ONNX**) so DoF / bokeh work on **landscapes, groups, and multi-plane scenes** where pseudo-depth (person near / background far) fails.

**Product promise:** “Pro depth” download once → realistic focus planes beyond selfies — without making Pro the default or breaking offline-first lightweight core.

## Why second (after I5e)

- New runtime dependency (Transformers.js and/or ONNX Runtime Web).  
- ~27 MB download — must be explicit UX.  
- Pseudo-depth + multiclass already cover the primary portrait story; Pro depth is the **optics quality ceiling** for non-person scenes.

I5e is **preferred** dependency so focus can still use face/person when fusing ML depth; I5d can technically ship alone if needed (fuse with person mask only).

## Non-goals

- Metric depth in meters.  
- Depth Anything Base / Large.  
- Always-on depth on every photo.  
- Real-time camera stream depth.  
- Replacing person segmentation (still required for fusion + selective looks).  
- WebGL DoF rewrite (can follow later for perf).

## User-facing behavior

### Portrait / Scene controls

| Control | Behavior |
|---------|----------|
| **Depth quality** | `Fast (mask)` default · `Pro (ML)` opt-in |
| First switch to Pro | Confirm or clear status: “Downloads ~27 MB once · stays on device” + progress |
| Pro ready | Re-analyze; `depthSource: 'ml'`; depth debug looks continuous multi-plane |
| Pro fails / offline first visit | Status error; stay on Fast; no crash |
| Aperture / focus / lens | Same; consume better `depthMap` automatically |

No change to Film / Age / Light tabs.

### When Pro re-runs

| Event | Action |
|-------|--------|
| Switch Fast → Pro | Load model if needed + analyze |
| Image load with Pro already selected | Analyze with ML when Portrait/optics path needs scene |
| Crop / rotate / flip bake | Invalidate; re-run Pro if still selected |
| Light/color/film sliders | Do **not** re-run depth |

## Technical design

### Model

| Item | Choice |
|------|--------|
| Model | Depth Anything V2 **Small** |
| Format | Quantized ONNX (community / Optimum export compatible with Transformers.js) |
| Reference | e.g. `onnx-community/depth-anything-v2-small` (`model_quantized.onnx` ~27.3 MB) |
| License | Verify model card (Apache-2.0 lineage typical) before ship; note in README |
| Input | Model native size or letterbox to supported res; keep long edge analysis proxy ≤ 518 if required by export, else 384–512 for speed |

### Runtime choice (decision at implementation start)

| Option | Pros | Cons |
|--------|------|------|
| **A. Transformers.js** `pipeline('depth-estimation', …)` | Fastest integrate; HF CDN models | Larger JS surface; version pin needed |
| **B. ONNX Runtime Web** (+ WebGPU EP, WASM fallback) | Leaner long-term; explicit EP control | More glue (preprocess/postprocess) |

**Recommendation:** start with **A** for ship speed if ESM CDN works without bundler; fall back to **B** if bundle/CDN story fights “no build step”. Spike (½ day) at ticket start.

Requirements either way:

- Dynamic import only when Pro selected.  
- WebGPU when available; WASM/CPU fallback.  
- Model bytes cached (HTTP cache / Cache API / ORT/TF.js cache).  

### Depth post-process

```
raw → percentile stretch (2–98%) → normalize 0..1
  near = 0, far = 1   // match existing pseudo convention
```

**Fusion with person / face (stability):**

```
depth' = depth_ml
near person edge band: lerp(depth_ml, depth_pseudo, 0.1–0.2)
if face.centerDepth available: optional soft pull of focus region toward face plane
```

Keep `depth_pseudo` always computable so Fast mode and fusion never depend on ML.

### `SceneAnalysis` fields used

```ts
depthMap: Float32Array;
depthSource: 'pseudo' | 'ml';
meta.depthModel: 'depth-anything-v2-small-q' | 'pseudo';
// version stays 2+ from I5e; if I5d alone, still bump meta
```

### Module plan

```
js/scene/
  depth-ml.js         # NEW: lazy load runtime + model, infer, normalize
  depth-pseudo.js     # unchanged
  analyze.js          # branch: depthMode fast | pro
  // no change to coc/dof API — they already consume depthMap
```

```js
state.optics.depthMode = 'fast' | 'pro';  // default 'fast'
```

### Engine / export

- No new effect types: better `depthMap` → better CoC → better DoF/bokeh.  
- Export: upsample ML depth (bilinear); optional re-infer at ≤768–1024 proxy if quality gap visible (flag; default upsample only for v1).  
- Memory: dispose intermediate tensors; never keep two full-res depth buffers longer than needed.

### Performance budget

| Step | Target |
|------|--------|
| First Pro model download | Progress UI; cancellable where possible |
| Warm infer @ ≤518 proxy | &lt; 1.5 s mid phone; &lt; 500 ms desktop WebGPU aspirational |
| Fast mode | Unchanged (no ORT/TF.js load) |
| Slider aperture after Pro analyze | Reuse depth; only rebuild CoC/blur layers |

### Privacy / packaging

- Image tensors never leave device.  
- README: Pro depth ~27 MB first use; Fast needs only small MediaPipe models.  
- Prefer jsDelivr / Hugging Face CDN with pinned revision hash if possible.

## Acceptance criteria

1. Default `depthMode: 'fast'` — no DA-V2 / ORT / Transformers.js network request.  
2. Selecting Pro shows download/progress once; subsequent visits use cache when available.  
3. After Pro analyze, `depthSource === 'ml'` and Depth debug shows multi-plane structure on a landscape test image.  
4. Portrait + Pro: subject separation ≥ Fast; face/person not “eaten” by background blur (fusion).  
5. Landscape + Pro + aperture open: foreground/background read as layered; Fast remains flat two-plane.  
6. Offline after cache: Pro works; offline before cache: graceful error + Fast.  
7. WebGPU missing: WASM/CPU path still completes (may be slower).  
8. Crop bake invalidates and re-analyzes in current mode.  
9. Export with Pro uses upsampled depth; file downloads successfully on mid phone for ~12 MP class images (or documented size cap).  
10. I5e selective looks still work with `depthSource: 'ml'`.

## Tasks (implementation checklist)

1. [ ] Spike: Transformers.js vs ORT Web in no-build SPA (document choice in PR).  
2. [ ] `depth-ml.js`: load, infer, normalize, dispose.  
3. [ ] `analyze.js`: `depthMode` branch + fusion with pseudo (+ face if I5e present).  
4. [ ] UI: Depth quality Fast / Pro + download messaging.  
5. [ ] Status / busy strings for model load vs analyze.  
6. [ ] Cache + failure paths; never leave stuck `loading_models`.  
7. [ ] Debug depth overlay works for ML maps.  
8. [ ] Export upsample path verified.  
9. [ ] QA: landscape layers, group, portrait, no-person interior, low light.  
10. [ ] README + license notes for DA-V2 ONNX.  
11. [ ] Optional: settings remember `depthMode` in `localStorage`.

## Out of ticket

- Interactive depth brush / paint near-far.  
- Metric depth models.  
- WebGL DoF.  
- Auto-Pro on desktop only heuristics.

## Risks

| Risk | Mitigation |
|------|------------|
| 27 MB surprise on mobile data | Explicit Pro label + size copy; default Fast |
| Main-thread jank during infer | Yield UI; consider Worker if spike shows jank |
| iOS Safari WebGPU gaps | WASM fallback mandatory |
| Depth inverted / wrong scale | Unit test normalize; visual QA; match 0=near convention |
| Fusion fights ML on full-body | Tune edge lerp; prefer ML mid-frame |
| CDN / model move | Pin URL + version; optional vendor under `models/` later |
| Bundle fights no-build | Spike early; ORT single ESM if needed |

## Done when

User can switch **Pro depth**, wait once for ~27 MB, and get **believable multi-plane DoF** on non-selfie scenes, with Fast mode remaining the zero-extra-download default — still private, static, on-device.

---

## Suggested ship order

```
I5e  Multiclass + Face + selective looks
  └─► I5d  Pro monocular depth (Fast / Pro toggle)
        └─► (later) u2netp cutout · Smart light · WebGL DoF · interactive segment
```

## Open product decisions (resolve at kickoff)

| Decision | Proposed default |
|----------|------------------|
| I5e skin soft / subject punch max strength | Mild; hard-cap so film character wins |
| I5d confirm dialog vs inline progress only | Inline progress + permanent “~27 MB” hint under Pro |
| Remember Pro between sessions | Yes (`localStorage`) |
| Re-infer Pro at export higher res | No in v1 (upsample only) |

---

*When a ticket starts, open a short PR that links this ID and updates the checkbox list in-place.*
