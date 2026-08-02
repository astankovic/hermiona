# Hermione — Performance & GPU analysis

**Date:** 2026-08-02  
**Status:** analysis (A-team)  
**Constraint:** SPA · no backend · mobile-first · keep architecture light  

---

## 1. Executive summary

Hermione is a **pure CPU, main-thread, `ImageData` pipeline**. That is the root of almost every jank and export delay.

You already have good **product-level** mitigations (scrub proxy ~720px, `fast` path, RAF coalescing, half-res DoF blur, lazy MediaPipe).  
The next leap is **not more micro-opts on JS loops** — it is:

1. **WebGL (or WebGPU) for global pixel ops** — light/color/film LUT/vignette/grain  
2. **GPU or smarter cache for spatial ops** — DoF, soft blur, selective skin  
3. **Web Worker** so export / full process never freezes UI  

**Parallelism on CPU** (Worker multi-core tile) helps export; **GPU** helps every slider frame.

---

## 2. Current architecture (hot path)

```
User slider
  → scheduleRender(fast?)  [RAF coalesce]
  → Engine.process(ImageData copy)
       1. Per-pixel light/color          O(N) CPU   ★ always
       2. Clarity / sharpen              O(N) / O(N·k) CPU
       3. CoC map                        O(N) CPU
       4. Film LUT + camera + imperfect. O(N)…O(N·r) CPU
       5. Selective skin / subject       O(N·r²) CPU  ★ I5e
       6. DoF: 2× softBlur + composite   O(N·r) CPU   ★★★ killer
       7. Bokeh stamps                   O(highlights) CPU
       8. Vignette + grain               O(N) CPU
  → putImageData / canvas draw
```

| Stage | Relative cost @ ~1400 long | Notes |
|-------|----------------------------|--------|
| Light/color loop | Medium | One pass, pure ALU — **GPU ideal** |
| Film LUT | Low–med | Table lookup — **GPU ideal** |
| Imperfections (dust/leak/…) | Medium–high | Spatial, quality-dependent |
| Skin soft (box blur) | High when on | Nested radius loop |
| **DoF softBlur ×2** | **Dominant** | Half-res box blur + upsample + blend |
| Bokeh | Medium | Only if amount high |
| Histogram | Low | Already downsamples maxSide 256 |
| MediaPipe segment/face | Spike once | Already GPU/CPU delegate |

**Working res:** ~1400 long edge → ~1–2M pixels.  
**Export full:** up to 8k long (capped) → 10–50× worse if all CPU.

---

## 3. What you already do well

| Technique | Where | Verdict |
|-----------|--------|---------|
| Scrub proxy `scrubMaxSize: 720` | app.js | Keep |
| `options.fast` skips spatial/DoF/grain | engine | Keep; expand dirty-flags |
| RAF + settle timer | scheduleRender | Keep |
| DoF half-res blur | dof.js `softBlur` | Good interim; still CPU |
| Static grain tile | engine / looks | Good (no re-noise flicker) |
| MediaPipe GPU delegate | analyze.js | Already GPU for AI |
| Lazy model load | scene | Correct |
| Export size ladder | export.js | OOM safety, not FPS |

---

## 4. Bottleneck ranking (where time goes)

### P0 — DoF / blur (CPU)

`dof.js` `boxBlurRGBA` is naive separable box: **O(w·h·radius)** with inner k-loop, **twice** (horiz+vert), **twice** for two radii, often **twice** again (second pass in softBlur).  

At 1400×900, r=12: multi-million ops × several passes → **tens of ms–100ms+** on main thread.

**GPU fit:** excellent (ping-pong FBO Gaussian / dual Kawase).

### P1 — Full `Engine.process` on every dial tick

Even light-only changes re-run film + imperfections if look active.  
No **pass graph / dirty flags**.

### P1 — Imperfections + lens CA/bloom

Many sequential full-image loops in `imperfections.js` / `looks.js` (`applyLens`).  
Harder to port all at once; **LUT + radial** parts GPU easily; dust sprites can stay CPU/canvas.

### P2 — Selective skin soft

O(N · r²) box blur when Skin soft > 0. Same family as DoF.

### P2 — Export

Re-runs full pipeline at high res on main thread (with rAF delay only).  
UI freezes; Worker would fix *responsiveness* even before GPU.

### P3 — Already fine

Histogram, Auto enhance (downsample), draft IDB (async), chip UI.

---

## 5. Parallelization options

### A. Web Worker (process / export) — **high ROI, medium effort**

```
Main thread: UI, canvas display, MediaPipe (DOM/canvas)
Worker:      Engine.process(ArrayBuffer transfer)
```

| Pros | Cons |
|------|------|
| UI never blocks on export / full settle | Must move pure engine into worker-friendly modules (no DOM) |
| Transferable `ArrayBuffer` zero-copy | MediaPipe stays main (or separate worker later) |
| Works today without WebGL | Still CPU-bound total time |

**Ship first as:** `exportWorker` only, then optional `processWorker` for settle (not scrub — scrub is already small).

### B. Tile multi-workers — **low priority**

Split image into strips, N workers.  
Helps 4-core desktop export; mobile often 2–4 cores and memory bandwidth limited.  
**After** single worker + GPU, not before.

### C. Parallel MediaPipe + process — **already partially true**

Face + segment can overlap (you already start face promise early).  
Don’t re-run analyze on every slider.

### D. `OffscreenCanvas` + Worker — **nice with GPU later**

Worker draws result to OffscreenCanvas, main displays.  
Cleaner architecture for WebGL-in-worker (limited support matrix).

---

## 6. GPU strategy

### Recommended stack for Hermione

| Layer | Tech | Why |
|-------|------|-----|
| v1 GPU | **WebGL2** fragment shaders | Broad support (iOS Safari, Android Chrome) |
| v2 optional | **WebGPU** | Faster compute when available; fallback WebGL |
| Avoid | Full rewrite to Three.js | Overkill for 2D grade |

### What maps cleanly to shaders

| Op | Shader notes |
|----|----------------|
| Exposure, contrast, H/S/W/B | Single fragment pass |
| Temp / tint / sat / vib | Same pass |
| Film curve | 1D LUT texture (256×1 RGB) |
| Vignette | UV radial |
| Grain | Noise texture + UV scale (match static tile seed) |
| Clarity (approx) | Unsharp / midtone curve, not true local contrast |
| CoC-weighted CA | Sample RGB with UV offset × coc texture |
| DoF | Dual Kawase or Gaussian pyramid + coc blend |
| Skin soft | Weighted bilateral-lite or small Gaussian × skin mask texture |

### What stays CPU (for now)

| Op | Why |
|----|-----|
| Dust / scratches / date stamp | Sparse stamps; CPU canvas fine |
| Polaroid border / gate | Geometry overlays |
| Film gate geometry | Same |
| MediaPipe | Already WASM/GPU via MP |
| Auto enhance stats | Cheap downsample |

### Hybrid pipeline (target)

```
CPU: load → working ImageData / texture upload
GPU: light → color → film LUT → vignette → grain → (optional) DoF
CPU: imperfections stamps (or GPU later)
CPU: readback only on export / histogram (downsample on GPU)
```

**Key:** avoid `getImageData` every frame. Keep pixels on GPU; readback for histogram at 256px proxy.

---

## 7. Caching / dirty flags (CPU wins before GPU)

Today: **any** param change → full process.

Target pass graph:

| Pass | Invalidate when |
|------|-----------------|
| Base grade (light+color) | exposure…vibrance |
| Spatial mid (clarity/sharpen) | clarity, sharpen |
| Film stack | film/camera/lens/imperf |
| Selective | skinSoft, subjectPunch, scene |
| Optics DoF | aperture, focus, strength, scene |
| Finish | vignette, grain |

**Scrub:** only recompute Base grade on GPU/CPU; freeze film+DoF until settle.  
You almost do this with `fast` — formalize dirty flags so settle doesn’t redo identical film twice.

---

## 8. Memory & GC

| Issue | Impact | Mitigation |
|-------|--------|------------|
| `new Uint8ClampedArray(src)` every process | GC thrash | Reuse buffers (pool) |
| DoF: multiple full-size blur buffers | Peak RAM | Half-res only; reuse `blur1`/`blur2` |
| Export rebuild + process | Spike | Worker + progressive size (already ladder) |
| Detail render at zoom | Extra process | Keep; cancel on scrub (already) |

---

## 9. Recommended roadmap

### Phase G0 — Measure *(shipped)*
- `js/perf.js` — `?perf=1` or `localStorage hermione.perf=1`  
- Stages: `process`, `grade`, `coc`, `looks`, `selective`, `dof` → `console.debug`

### Phase G1 — CPU hygiene *(shipped)*
1. `js/buffers.js` — Uint8/F32 pool for process RGBA  
2. Dirty-flag: `fromAfterLooks` + `onAfterLooks` pipe cache in app (optics-only changes skip grade+looks)  
3. Skin soft: half-res separable blur (`selective.js`)  
4. Export **Worker** (`js/export-worker.js`) for process ≥ ~900² px; geometry still main  

**Expected:** snappier aperture/skin scrub; export less freezy.

### Phase G2 — WebGL grade core *(shipped)*
1. `js/gpu/grade.js` — WebGL2 light/color + film LUT/curves (grain still CPU)  
2. Auto CPU fallback if WebGL2 missing / texture too large / error  
3. `Looks.applyLooks({ skipFilm, filmGrainOnly })` after GPU film  
4. Perf: `grade:gpu` mark when `?perf=1`  

**Expected:** snappier light/color/film scrub; camera/imperf/lens still CPU.

### Phase G3 — WebGL DoF *(shipped)*
1. `js/gpu/dof.js` — dual-level separable blur (half-res) + CoC composite  
2. Wired in `dof.js` with CPU fallback; specular bokeh stamps stay CPU  
3. Perf mark `dof:gpu` when `?perf=1`  
4. Anamorphic: horizontal bias in blur direction  

**Expected:** much smoother aperture/focus with DoF enabled on GPU devices.

### Phase G4 — WebGPU opt-in (later)
- Same shaders via WGSL where available  
- Keep WebGL fallback  

---

## 10. Parallelism vs GPU — decision matrix

| Goal | Best tool |
|------|-----------|
| UI never freezes on export | **Worker** |
| Slider 60fps light/color | **WebGL grade** |
| Smooth DoF aperture scrub | **WebGL DoF** |
| Faster first Analyze | Already MP GPU; proxy 384 OK |
| Multi-core export only | Worker tiles (optional) |
| Keep no-build SPA | Dynamic `import()` of `gpu/grade.js` |

---

## 11. Risks

| Risk | Mitigation |
|------|------------|
| GPU/CPU color mismatch | Golden image tests (extend `tests/`) |
| iOS WebGL precision | Use mediump carefully; test LUT |
| Mobile GPU thermal | Cap preview res; settle full |
| Scope explosion | G1 then G2 only; no WebGPU until G3 ships |
| Bundle weight | Lazy load GPU module on first process |

---

## 12. Bottom line

Hermione is **product-fast, engine-CPU-bound**.

- **Parallelize:** Worker for export + optional full settle (main thread = UI).  
- **GPU:** WebGL2 for grade pipeline first, then DoF — biggest FPS win.  
- **Don’t:** premature multi-worker tiles or WebGPU-only path.

**Suggested next implementation ticket:**  
`G1` buffer pool + dirty flags + export Worker → then `G2` WebGL light/color/film.

---

*Related: `docs/pipeline.md`, `docs/production-roadmap.md`, `docs/scene-aware-optics.md`*
