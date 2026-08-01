/**
 * Scene analysis — person segmentation + pseudo-depth + focus
 * Exposes window.HermionaScene
 */
(function (global) {
  'use strict';

  const PROXY_LONG = 384;
  const MP_VERSION = '0.10.18';
  const WASM_PATH =
    'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@' + MP_VERSION + '/wasm';
  // Selfie segmenter — person foreground
  const MODEL_PATH =
    'https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/latest/selfie_segmenter.tflite';

  let segmenterPromise = null;
  let segmenter = null;
  let loadError = null;

  function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
  }

  /**
   * Lazy-load MediaPipe ImageSegmenter via dynamic ESM import
   */
  function ensureSegmenter() {
    if (segmenter) return Promise.resolve(segmenter);
    if (loadError) return Promise.reject(loadError);
    if (segmenterPromise) return segmenterPromise;

    segmenterPromise = (async () => {
      try {
        const mod = await import(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@' +
            MP_VERSION +
            '/+esm'
        );
        const FilesetResolver = mod.FilesetResolver;
        const ImageSegmenter = mod.ImageSegmenter;
        if (!FilesetResolver || !ImageSegmenter) {
          throw new Error('MediaPipe vision exports missing');
        }

        const vision = await FilesetResolver.forVisionTasks(WASM_PATH);
        segmenter = await ImageSegmenter.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: MODEL_PATH,
            delegate: 'GPU'
          },
          runningMode: 'IMAGE',
          outputCategoryMask: true,
          outputConfidenceMasks: true
        });
        return segmenter;
      } catch (err) {
        // Retry CPU delegate
        try {
          const mod = await import(
            'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@' +
              MP_VERSION +
              '/+esm'
          );
          const vision = await mod.FilesetResolver.forVisionTasks(WASM_PATH);
          segmenter = await mod.ImageSegmenter.createFromOptions(vision, {
            baseOptions: {
              modelAssetPath: MODEL_PATH,
              delegate: 'CPU'
            },
            runningMode: 'IMAGE',
            outputCategoryMask: true,
            outputConfidenceMasks: true
          });
          return segmenter;
        } catch (err2) {
          loadError = err2;
          segmenterPromise = null;
          throw err2;
        }
      }
    })();

    return segmenterPromise;
  }

  /**
   * MediaPipe segment() — supports sync return, Promise, or callback.
   */
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
        // else wait for callback
      } catch (e) {
        // Some builds use segmentForImage
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

  /**
   * Draw source canvas/image into proxy canvas
   */
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

  /**
   * Extract person confidence from MediaPipe result into Float32Array pw*ph
   */
  function maskFromResult(result, pw, ph) {
    const mask = new Float32Array(pw * ph);

    // Prefer confidence masks (float 0..1 for person)
    if (result.confidenceMasks && result.confidenceMasks.length) {
      // Selfie segmenter often has 1 mask = person, or [bg, person]
      const confMask =
        result.confidenceMasks.length > 1
          ? result.confidenceMasks[1]
          : result.confidenceMasks[0];
      const mw = confMask.width;
      const mh = confMask.height;
      const data = confMask.getAsFloat32Array
        ? confMask.getAsFloat32Array()
        : confMask.getAsUint8Array
          ? null
          : null;

      if (confMask.getAsFloat32Array) {
        const arr = confMask.getAsFloat32Array();
        // may be mw*mh or same as pw*ph
        if (mw === pw && mh === ph) {
          for (let i = 0; i < pw * ph; i++) mask[i] = clamp(arr[i], 0, 1);
        } else {
          // resize
          for (let y = 0; y < ph; y++) {
            for (let x = 0; x < pw; x++) {
              const sx = Math.min(mw - 1, ((x + 0.5) * mw) / pw - 0.5);
              const sy = Math.min(mh - 1, ((y + 0.5) * mh) / ph - 0.5);
              const x0 = Math.floor(sx);
              const y0 = Math.floor(sy);
              mask[y * pw + x] = clamp(arr[y0 * mw + x0], 0, 1);
            }
          }
        }
        // free MP masks if available
        result.confidenceMasks.forEach((m) => m.close && m.close());
        if (result.categoryMask && result.categoryMask.close) result.categoryMask.close();
        return mask;
      }

      if (confMask.getAsUint8Array) {
        const arr = confMask.getAsUint8Array();
        for (let i = 0; i < Math.min(arr.length, pw * ph); i++) {
          mask[i] = arr[i] / 255;
        }
        result.confidenceMasks.forEach((m) => m.close && m.close());
        if (result.categoryMask && result.categoryMask.close) result.categoryMask.close();
        return mask;
      }
    }

    // Category mask fallback: non-zero = person for selfie models
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
            // selfie: 0 background, 1 person (or inverted on some models)
            mask[y * pw + x] = v > 0 ? 1 : 0;
          }
        }
      }
      if (cat.close) cat.close();
      if (result.confidenceMasks) {
        result.confidenceMasks.forEach((m) => m.close && m.close());
      }
    }

    return mask;
  }

  /**
   * Heuristic fallback when MediaPipe unavailable — soft center subject blob
   */
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
        mask[y * w + x] = clamp(1 - d, 0, 1);
        mask[y * w + x] = Math.pow(mask[y * w + x], 1.4);
      }
    }
    return mask;
  }

  /**
   * Analyze source (canvas or image) at proxy size, return SceneAnalysis
   * Maps are at proxy resolution — caller resizes as needed.
   *
   * @param {HTMLCanvasElement|HTMLImageElement} source
   * @param {object} [options]
   * @returns {Promise<object>}
   */
  async function analyze(source, options) {
    options = options || {};
    const t0 = performance.now();
    const Pseudo = global.HermionaDepthPseudo;
    if (!Pseudo) throw new Error('HermionaDepthPseudo missing');

    const proxy = toProxyCanvas(source, options.proxyLong || PROXY_LONG);
    const pw = proxy.width;
    const ph = proxy.height;

    let personMask;
    let segmenterId = 'fallback-center';
    let usedML = false;

    try {
      const seg = await ensureSegmenter();
      const result = await runSegment(seg, proxy);
      personMask = maskFromResult(result, pw, ph);

      // Detect empty / inverted mask
      let sum = 0;
      for (let i = 0; i < personMask.length; i++) sum += personMask[i];
      const mean = sum / personMask.length;
      if (mean > 0.85) {
        // likely inverted
        for (let i = 0; i < personMask.length; i++) personMask[i] = 1 - personMask[i];
      }
      if (mean < 0.005) {
        personMask = fallbackPersonMask(pw, ph);
        segmenterId = 'fallback-empty-ml';
      } else {
        segmenterId = 'mediapipe-selfie';
        usedML = true;
      }
    } catch (err) {
      console.warn('Hermiona scene: MediaPipe failed, using fallback mask', err);
      personMask = fallbackPersonMask(pw, ph);
      segmenterId = 'fallback-error';
    }

    // Feather
    const featherR = Math.max(2, Math.round(Math.min(pw, ph) * 0.02));
    personMask = Pseudo.featherMask(personMask, pw, ph, featherR);

    const depthMap = Pseudo.fromPersonMask(personMask, pw, ph);
    const focusDepth = Pseudo.medianDepthWhere(depthMap, personMask, 0.45);

    // Person coverage
    let coverage = 0;
    for (let i = 0; i < personMask.length; i++) {
      if (personMask[i] > 0.4) coverage++;
    }
    coverage /= personMask.length;

    return {
      version: 1,
      width: pw,
      height: ph,
      personMask: personMask,
      depthMap: depthMap,
      depthSource: usedML ? 'pseudo' : 'pseudo',
      focusDepth: focusDepth,
      personCoverage: coverage,
      hasPerson: coverage > 0.02,
      meta: {
        segmenter: segmenterId,
        elapsedMs: Math.round(performance.now() - t0),
        usedML: usedML
      }
    };
  }

  /**
   * Resize analysis maps to target working size
   */
  function resizeAnalysis(analysis, tw, th) {
    if (!analysis) return null;
    const Pseudo = global.HermionaDepthPseudo;
    if (analysis.width === tw && analysis.height === th) {
      return {
        ...analysis,
        personMask: new Float32Array(analysis.personMask),
        depthMap: new Float32Array(analysis.depthMap)
      };
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
      )
    };
  }

  function preload() {
    return ensureSegmenter().catch((e) => {
      console.warn('Scene model preload failed', e);
      return null;
    });
  }

  global.HermionaScene = {
    analyze,
    resizeAnalysis,
    preload,
    ensureSegmenter,
    PROXY_LONG
  };
})(typeof window !== 'undefined' ? window : globalThis);
