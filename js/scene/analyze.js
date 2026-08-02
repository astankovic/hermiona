/**
 * Scene analysis — person / multiclass segmentation + face + pseudo-depth
 * I5a + I5e · Exposes window.HermioneScene
 */
(function (global) {
  'use strict';

  const PROXY_LONG = 384;
  const MP_VERSION = '0.10.18';
  const WASM_PATH =
    'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@' + MP_VERSION + '/wasm';

  // Prefer multiclass (hair / skin / clothes); fall back to binary selfie
  const MULTICLASS_PATH =
    'https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_multiclass_256x256/float32/latest/selfie_multiclass_256x256.tflite';
  const SELFIE_PATH =
    'https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/latest/selfie_segmenter.tflite';
  const FACE_PATH =
    'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/latest/face_landmarker.task';

  // Multiclass indices (MediaPipe SelfieMulticlass)
  // 0 bg · 1 hair · 2 body-skin · 3 face-skin · 4 clothes · 5 others
  const CLS = {
    BG: 0,
    HAIR: 1,
    BODY: 2,
    FACE: 3,
    CLOTHES: 4,
    OTHER: 5
  };

  let segmenterPromise = null;
  let segmenter = null;
  let segmenterKind = null; // 'multiclass' | 'selfie'
  let loadError = null;

  let facePromise = null;
  let faceLandmarker = null;
  let faceError = null;

  function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
  }

  async function loadVisionMod() {
    return import(
      'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@' +
        MP_VERSION +
        '/+esm'
    );
  }

  async function createSegmenter(modelPath, delegate) {
    const mod = await loadVisionMod();
    const vision = await mod.FilesetResolver.forVisionTasks(WASM_PATH);
    return mod.ImageSegmenter.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: modelPath,
        delegate: delegate
      },
      runningMode: 'IMAGE',
      outputCategoryMask: true,
      outputConfidenceMasks: true
    });
  }

  /**
   * Lazy-load: try multiclass (GPU→CPU), then selfie (GPU→CPU).
   */
  function ensureSegmenter() {
    if (segmenter) return Promise.resolve(segmenter);
    if (loadError) return Promise.reject(loadError);
    if (segmenterPromise) return segmenterPromise;

    segmenterPromise = (async () => {
      const tries = [
        { path: MULTICLASS_PATH, kind: 'multiclass', del: 'GPU' },
        { path: MULTICLASS_PATH, kind: 'multiclass', del: 'CPU' },
        { path: SELFIE_PATH, kind: 'selfie', del: 'GPU' },
        { path: SELFIE_PATH, kind: 'selfie', del: 'CPU' }
      ];
      let lastErr = null;
      for (let i = 0; i < tries.length; i++) {
        try {
          segmenter = await createSegmenter(tries[i].path, tries[i].del);
          segmenterKind = tries[i].kind;
          return segmenter;
        } catch (e) {
          lastErr = e;
          segmenter = null;
          segmenterKind = null;
        }
      }
      loadError = lastErr || new Error('Segmenter load failed');
      segmenterPromise = null;
      throw loadError;
    })();

    return segmenterPromise;
  }

  function ensureFaceLandmarker() {
    if (faceLandmarker) return Promise.resolve(faceLandmarker);
    if (faceError) return Promise.reject(faceError);
    if (facePromise) return facePromise;

    facePromise = (async () => {
      try {
        const mod = await loadVisionMod();
        if (!mod.FaceLandmarker) throw new Error('FaceLandmarker missing');
        const vision = await mod.FilesetResolver.forVisionTasks(WASM_PATH);
        const opts = {
          baseOptions: { modelAssetPath: FACE_PATH, delegate: 'GPU' },
          runningMode: 'IMAGE',
          numFaces: 1,
          outputFaceBlendshapes: false,
          outputFacialTransformationMatrixes: false
        };
        try {
          faceLandmarker = await mod.FaceLandmarker.createFromOptions(
            vision,
            opts
          );
        } catch (e) {
          opts.baseOptions.delegate = 'CPU';
          faceLandmarker = await mod.FaceLandmarker.createFromOptions(
            vision,
            opts
          );
        }
        return faceLandmarker;
      } catch (err) {
        faceError = err;
        facePromise = null;
        throw err;
      }
    })();

    return facePromise;
  }

  function runSegment(seg, image) {
    return new Promise((resolve, reject) => {
      let settled = false;
      const done = (res) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve(res);
      };
      const fail = (err) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        reject(err);
      };
      const timer = setTimeout(() => fail(new Error('Segment timeout')), 20000);

      try {
        const ret = seg.segment(image, (res) => done(res));
        if (ret && typeof ret.then === 'function') {
          ret.then(done).catch(fail);
        } else if (ret && (ret.confidenceMasks || ret.categoryMask)) {
          done(ret);
        }
      } catch (e) {
        try {
          if (typeof seg.segmentForImage === 'function') {
            const ret2 = seg.segmentForImage(image);
            if (ret2 && typeof ret2.then === 'function') {
              ret2.then(done).catch(fail);
            } else {
              done(ret2);
            }
          } else {
            fail(e);
          }
        } catch (e2) {
          fail(e2);
        }
      }
    });
  }

  function toProxyCanvas(source, maxLong) {
    const sw = source.width || source.naturalWidth || source.videoWidth;
    const sh = source.height || source.naturalHeight || source.videoHeight;
    const long = Math.max(sw, sh);
    let w = sw;
    let h = sh;
    if (long > maxLong) {
      const s = maxLong / long;
      w = Math.max(1, Math.round(sw * s));
      h = Math.max(1, Math.round(sh * s));
    }
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const ctx = c.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(source, 0, 0, w, h);
    return c;
  }

  function resizeFloatMask(arr, mw, mh, pw, ph) {
    const out = new Float32Array(pw * ph);
    if (!arr || !mw || !mh) return out;
    for (let y = 0; y < ph; y++) {
      for (let x = 0; x < pw; x++) {
        const sx = Math.min(mw - 1, Math.max(0, ((x + 0.5) * mw) / pw - 0.5));
        const sy = Math.min(mh - 1, Math.max(0, ((y + 0.5) * mh) / ph - 0.5));
        const x0 = Math.floor(sx);
        const y0 = Math.floor(sy);
        out[y * pw + x] = clamp(arr[y0 * mw + x0], 0, 1);
      }
    }
    return out;
  }

  function confMaskToFloat(confMask, pw, ph) {
    if (!confMask) return new Float32Array(pw * ph);
    const mw = confMask.width;
    const mh = confMask.height;
    if (confMask.getAsFloat32Array) {
      const arr = confMask.getAsFloat32Array();
      if (mw === pw && mh === ph) {
        const out = new Float32Array(pw * ph);
        for (let i = 0; i < out.length; i++) out[i] = clamp(arr[i], 0, 1);
        return out;
      }
      return resizeFloatMask(arr, mw, mh, pw, ph);
    }
    if (confMask.getAsUint8Array) {
      const arr = confMask.getAsUint8Array();
      const tmp = new Float32Array(mw * mh);
      for (let i = 0; i < tmp.length; i++) tmp[i] = (arr[i] || 0) / 255;
      return resizeFloatMask(tmp, mw, mh, pw, ph);
    }
    return new Float32Array(pw * ph);
  }

  function closeResult(result) {
    if (!result) return;
    if (result.confidenceMasks) {
      result.confidenceMasks.forEach((m) => m.close && m.close());
    }
    if (result.categoryMask && result.categoryMask.close) {
      result.categoryMask.close();
    }
  }

  /**
   * Binary person mask from selfie segmenter result.
   */
  function personFromSelfie(result, pw, ph) {
    const mask = new Float32Array(pw * ph);
    if (result.confidenceMasks && result.confidenceMasks.length) {
      const confMask =
        result.confidenceMasks.length > 1
          ? result.confidenceMasks[1]
          : result.confidenceMasks[0];
      const m = confMaskToFloat(confMask, pw, ph);
      closeResult(result);
      return m;
    }
    if (result.categoryMask) {
      const cat = result.categoryMask;
      const mw = cat.width;
      const mh = cat.height;
      const arr = cat.getAsUint8Array ? cat.getAsUint8Array() : null;
      if (arr) {
        for (let y = 0; y < ph; y++) {
          for (let x = 0; x < pw; x++) {
            const sx = Math.min(mw - 1, Math.floor((x * mw) / pw));
            const sy = Math.min(mh - 1, Math.floor((y * mh) / ph));
            mask[y * pw + x] = arr[sy * mw + sx] > 0 ? 1 : 0;
          }
        }
      }
      closeResult(result);
    }
    return mask;
  }

  /**
   * Multiclass → parts + person (1 − bg).
   */
  function partsFromMulticlass(result, pw, ph) {
    const parts = {
      hair: new Float32Array(pw * ph),
      bodySkin: new Float32Array(pw * ph),
      faceSkin: new Float32Array(pw * ph),
      clothes: new Float32Array(pw * ph),
      accessories: new Float32Array(pw * ph)
    };
    const person = new Float32Array(pw * ph);

    if (result.confidenceMasks && result.confidenceMasks.length >= 6) {
      const masks = result.confidenceMasks;
      // index 0 = bg, 1..5 parts
      const hair = confMaskToFloat(masks[CLS.HAIR], pw, ph);
      const body = confMaskToFloat(masks[CLS.BODY], pw, ph);
      const face = confMaskToFloat(masks[CLS.FACE], pw, ph);
      const clothes = confMaskToFloat(masks[CLS.CLOTHES], pw, ph);
      const other = confMaskToFloat(masks[CLS.OTHER], pw, ph);
      const bg = confMaskToFloat(masks[CLS.BG], pw, ph);
      for (let i = 0; i < pw * ph; i++) {
        parts.hair[i] = hair[i];
        parts.bodySkin[i] = body[i];
        parts.faceSkin[i] = face[i];
        parts.clothes[i] = clothes[i];
        parts.accessories[i] = other[i];
        person[i] = clamp(
          1 - bg[i],
          0,
          1
        );
        // if bg unreliable, union of parts
        if (person[i] < 0.15) {
          person[i] = clamp(
            hair[i] + body[i] + face[i] + clothes[i] + other[i],
            0,
            1
          );
        }
      }
      closeResult(result);
      return { personMask: person, parts: parts };
    }

    // Category mask path
    if (result.categoryMask) {
      const cat = result.categoryMask;
      const mw = cat.width;
      const mh = cat.height;
      const arr = cat.getAsUint8Array ? cat.getAsUint8Array() : null;
      if (arr) {
        for (let y = 0; y < ph; y++) {
          for (let x = 0; x < pw; x++) {
            const sx = Math.min(mw - 1, Math.floor((x * mw) / pw));
            const sy = Math.min(mh - 1, Math.floor((y * mh) / ph));
            const v = arr[sy * mw + sx];
            const i = y * pw + x;
            if (v === CLS.HAIR) parts.hair[i] = 1;
            else if (v === CLS.BODY) parts.bodySkin[i] = 1;
            else if (v === CLS.FACE) parts.faceSkin[i] = 1;
            else if (v === CLS.CLOTHES) parts.clothes[i] = 1;
            else if (v === CLS.OTHER) parts.accessories[i] = 1;
            if (v !== CLS.BG) person[i] = 1;
          }
        }
      }
      closeResult(result);
      return { personMask: person, parts: parts };
    }

    closeResult(result);
    return { personMask: person, parts: parts };
  }

  function fallbackPersonMask(w, h) {
    const mask = new Float32Array(w * h);
    const cx = w * 0.5;
    const cy = h * 0.48;
    const rx = w * 0.28;
    const ry = h * 0.38;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const nx = (x - cx) / rx;
        const ny = (y - cy) / ry;
        const d = nx * nx + ny * ny;
        mask[y * w + x] = Math.pow(clamp(1 - d, 0, 1), 1.4);
      }
    }
    return mask;
  }

  /**
   * Face Landmarker → box + center in proxy UV.
   */
  async function detectFace(proxy, pw, ph) {
    try {
      const fl = await ensureFaceLandmarker();
      const res = fl.detect(proxy);
      if (!res || !res.faceLandmarks || !res.faceLandmarks.length) return null;
      const lm = res.faceLandmarks[0];
      let minX = 1;
      let minY = 1;
      let maxX = 0;
      let maxY = 0;
      let sumX = 0;
      let sumY = 0;
      for (let i = 0; i < lm.length; i++) {
        const x = lm[i].x;
        const y = lm[i].y;
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
        sumX += x;
        sumY += y;
      }
      const n = lm.length || 1;
      return {
        box: {
          x: clamp(minX, 0, 1),
          y: clamp(minY, 0, 1),
          w: clamp(maxX - minX, 0, 1),
          h: clamp(maxY - minY, 0, 1)
        },
        center: { x: sumX / n, y: sumY / n },
        landmarkCount: n
      };
    } catch (e) {
      console.warn('Hermione scene: face landmarker skip', e);
      return null;
    }
  }

  function focusFromFace(depthMap, pw, ph, face) {
    if (!face || !face.center || !depthMap) return null;
    const x = clamp(Math.floor(face.center.x * pw), 0, pw - 1);
    const y = clamp(Math.floor(face.center.y * ph), 0, ph - 1);
    // small neighborhood median
    const vals = [];
    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        const xx = clamp(x + dx, 0, pw - 1);
        const yy = clamp(y + dy, 0, ph - 1);
        vals.push(depthMap[yy * pw + xx]);
      }
    }
    vals.sort((a, b) => a - b);
    const mid = vals[Math.floor(vals.length / 2)];
    return {
      focusDepth: mid,
      centerDepth: mid
    };
  }

  function focusFromFaceSkin(depthMap, faceSkin, pw, ph) {
    if (!faceSkin || !depthMap) return null;
    const depths = [];
    for (let i = 0; i < faceSkin.length; i++) {
      if (faceSkin[i] > 0.4) depths.push(depthMap[i]);
    }
    if (depths.length < 8) return null;
    depths.sort((a, b) => a - b);
    const mid = depths[Math.floor(depths.length / 2)];
    return { focusDepth: mid, centerDepth: mid };
  }

  async function analyze(source, options) {
    options = options || {};
    const t0 = performance.now();
    const Pseudo = global.HermioneDepthPseudo;
    if (!Pseudo) throw new Error('HermioneDepthPseudo missing');

    const proxy = toProxyCanvas(source, options.proxyLong || PROXY_LONG);
    const pw = proxy.width;
    const ph = proxy.height;

    let personMask;
    let parts = null;
    let segmenterId = 'fallback-center';
    let usedML = false;

    // Face in parallel with segment (don't fail analyze if face fails)
    const faceP = detectFace(proxy, pw, ph).catch(() => null);

    try {
      const seg = await ensureSegmenter();
      const result = await runSegment(seg, proxy);

      if (segmenterKind === 'multiclass') {
        const parsed = partsFromMulticlass(result, pw, ph);
        personMask = parsed.personMask;
        parts = parsed.parts;
        segmenterId = 'mediapipe-multiclass';
        usedML = true;
      } else {
        personMask = personFromSelfie(result, pw, ph);
        segmenterId = 'mediapipe-selfie';
        usedML = true;
      }

      let sum = 0;
      for (let i = 0; i < personMask.length; i++) sum += personMask[i];
      const mean = sum / personMask.length;
      if (mean > 0.9 && segmenterKind !== 'multiclass') {
        for (let i = 0; i < personMask.length; i++) personMask[i] = 1 - personMask[i];
      }
      if (mean < 0.005) {
        personMask = fallbackPersonMask(pw, ph);
        parts = null;
        segmenterId = 'fallback-empty-ml';
        usedML = false;
      }
    } catch (err) {
      console.warn('Hermione scene: MediaPipe failed, using fallback mask', err);
      personMask = fallbackPersonMask(pw, ph);
      parts = null;
      segmenterId = 'fallback-error';
    }

    const featherR = Math.max(2, Math.round(Math.min(pw, ph) * 0.02));
    personMask = Pseudo.featherMask(personMask, pw, ph, featherR);
    if (parts) {
      const keys = ['hair', 'bodySkin', 'faceSkin', 'clothes', 'accessories'];
      for (let k = 0; k < keys.length; k++) {
        const key = keys[k];
        parts[key] = Pseudo.featherMask(parts[key], pw, ph, Math.max(1, featherR - 1));
      }
    }

    const depthMap = Pseudo.fromPersonMask(personMask, pw, ph);

    const face = await faceP;
    let focusDepth = Pseudo.medianDepthWhere(depthMap, personMask, 0.45);
    let faceOut = null;

    if (face) {
      const ff = focusFromFace(depthMap, pw, ph, face);
      if (ff) {
        focusDepth = ff.focusDepth;
        faceOut = {
          box: face.box,
          center: face.center,
          centerDepth: ff.centerDepth
        };
      } else {
        faceOut = { box: face.box, center: face.center, centerDepth: focusDepth };
      }
    } else if (parts && parts.faceSkin) {
      const fs = focusFromFaceSkin(depthMap, parts.faceSkin, pw, ph);
      if (fs) {
        focusDepth = fs.focusDepth;
        faceOut = {
          box: null,
          center: null,
          centerDepth: fs.centerDepth
        };
      }
    }

    let coverage = 0;
    for (let i = 0; i < personMask.length; i++) {
      if (personMask[i] > 0.4) coverage++;
    }
    coverage /= personMask.length;

    return {
      version: 2,
      width: pw,
      height: ph,
      personMask: personMask,
      parts: parts,
      depthMap: depthMap,
      depthSource: 'pseudo',
      face: faceOut,
      focusDepth: focusDepth,
      personCoverage: coverage,
      hasPerson: coverage > 0.02,
      meta: {
        segmenter: segmenterId,
        faceModel: faceOut ? 'face_landmarker' : null,
        elapsedMs: Math.round(performance.now() - t0),
        usedML: usedML
      }
    };
  }

  function resizePartMaps(parts, ow, oh, tw, th) {
    if (!parts) return null;
    const Pseudo = global.HermioneDepthPseudo;
    const out = {};
    const keys = Object.keys(parts);
    for (let i = 0; i < keys.length; i++) {
      const k = keys[i];
      out[k] = Pseudo.resizeMap(parts[k], ow, oh, tw, th);
    }
    return out;
  }

  function resizeAnalysis(analysis, tw, th) {
    if (!analysis) return null;
    const Pseudo = global.HermioneDepthPseudo;
    if (analysis.width === tw && analysis.height === th) {
      const copy = {
        ...analysis,
        personMask: new Float32Array(analysis.personMask),
        depthMap: new Float32Array(analysis.depthMap)
      };
      if (analysis.parts) {
        copy.parts = {};
        Object.keys(analysis.parts).forEach((k) => {
          copy.parts[k] = new Float32Array(analysis.parts[k]);
        });
      }
      return copy;
    }
    return {
      ...analysis,
      width: tw,
      height: th,
      personMask: Pseudo.resizeMap(
        analysis.personMask,
        analysis.width,
        analysis.height,
        tw,
        th
      ),
      depthMap: Pseudo.resizeMap(
        analysis.depthMap,
        analysis.width,
        analysis.height,
        tw,
        th
      ),
      parts: resizePartMaps(
        analysis.parts,
        analysis.width,
        analysis.height,
        tw,
        th
      )
    };
  }

  function preload() {
    return ensureSegmenter()
      .then(() => ensureFaceLandmarker().catch(() => null))
      .catch((e) => {
        console.warn('Scene model preload failed', e);
        return null;
      });
  }

  function subjectBBox(analysis, thr) {
    if (!analysis || !analysis.personMask) return null;
    thr = thr != null ? thr : 0.35;
    const w = analysis.width;
    const h = analysis.height;
    const m = analysis.personMask;
    let minX = w;
    let minY = h;
    let maxX = -1;
    let maxY = -1;
    let count = 0;
    let mass = 0;
    let sumX = 0;
    let sumY = 0;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const v = m[y * w + x];
        if (v < thr) continue;
        count++;
        mass += v;
        sumX += x * v;
        sumY += y * v;
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
    if (count < 8 || maxX < minX || mass < 1e-6) return null;
    const padX = (maxX - minX + 1) * 0.04;
    const padY = (maxY - minY + 1) * 0.04;
    minX = Math.max(0, minX - padX);
    minY = Math.max(0, minY - padY);
    maxX = Math.min(w - 1, maxX + padX);
    maxY = Math.min(h - 1, maxY + padY);
    return {
      x: minX / w,
      y: minY / h,
      w: (maxX - minX + 1) / w,
      h: (maxY - minY + 1) / h,
      cx: sumX / mass / w,
      cy: sumY / mass / h,
      coverage: count / (w * h)
    };
  }

  global.HermioneScene = {
    analyze,
    resizeAnalysis,
    preload,
    ensureSegmenter,
    ensureFaceLandmarker,
    subjectBBox,
    PROXY_LONG
  };
})(typeof window !== 'undefined' ? window : globalThis);
