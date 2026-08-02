/**
 * Pseudo-depth from person mask (+ simple scene priors)
 * Exposes window.HermioneDepthPseudo
 */
(function (global) {
  'use strict';

  function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
  }

  /**
   * @param {Float32Array} personMask 0..1 length w*h
   * @param {number} w
   * @param {number} h
   * @returns {Float32Array} depth 0=near .. 1=far
   */
  function fromPersonMask(personMask, w, h) {
    const n = w * h;
    const depth = new Float32Array(n);

    for (let y = 0; y < h; y++) {
      const vPrior = (y / Math.max(1, h - 1)) * 0.08; // bottom slightly nearer
      for (let x = 0; x < w; x++) {
        const i = y * w + x;
        const p = personMask[i] || 0;
        // person → near (~0.22), background → far (~0.88)
        let d = 0.88 * (1 - p) + 0.22 * p;
        // vertical prior on background only
        d = d - vPrior * (1 - p);
        // slight edge: pixels near subject edge mid-depth (helps feather)
        depth[i] = clamp(d, 0, 1);
      }
    }

    return depth;
  }

  /**
   * Feather mask with box blur (in-place copy returned).
   * @param {Float32Array} mask
   * @param {number} w
   * @param {number} h
   * @param {number} radius
   */
  function featherMask(mask, w, h, radius) {
    const r = Math.max(1, radius | 0);
    const tmp = new Float32Array(w * h);
    const out = new Float32Array(w * h);

    // horizontal
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        let sum = 0;
        let c = 0;
        for (let k = -r; k <= r; k++) {
          const xx = clamp(x + k, 0, w - 1);
          sum += mask[y * w + xx];
          c++;
        }
        tmp[y * w + x] = sum / c;
      }
    }
    // vertical
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        let sum = 0;
        let c = 0;
        for (let k = -r; k <= r; k++) {
          const yy = clamp(y + k, 0, h - 1);
          sum += tmp[yy * w + x];
          c++;
        }
        out[y * w + x] = sum / c;
      }
    }
    return out;
  }

  /**
   * Median depth of pixels where mask > threshold
   */
  function medianDepthWhere(depth, mask, threshold) {
    const vals = [];
    for (let i = 0; i < depth.length; i++) {
      if (mask[i] > threshold) vals.push(depth[i]);
    }
    if (!vals.length) return 0.3;
    vals.sort((a, b) => a - b);
    return vals[(vals.length * 0.5) | 0];
  }

  /**
   * Bilinear sample Float32 map at pixel coords
   */
  function sampleMap(map, srcW, srcH, x, y) {
    x = clamp(x, 0, srcW - 1.001);
    y = clamp(y, 0, srcH - 1.001);
    const x0 = Math.floor(x);
    const y0 = Math.floor(y);
    const x1 = Math.min(x0 + 1, srcW - 1);
    const y1 = Math.min(y0 + 1, srcH - 1);
    const fx = x - x0;
    const fy = y - y0;
    const a = map[y0 * srcW + x0] * (1 - fx) + map[y0 * srcW + x1] * fx;
    const b = map[y1 * srcW + x0] * (1 - fx) + map[y1 * srcW + x1] * fx;
    return a * (1 - fy) + b * fy;
  }

  /**
   * Resize Float32 map w0×h0 → w1×h1
   */
  function resizeMap(map, w0, h0, w1, h1) {
    if (w0 === w1 && h0 === h1) return new Float32Array(map);
    const out = new Float32Array(w1 * h1);
    for (let y = 0; y < h1; y++) {
      const sy = ((y + 0.5) * h0) / h1 - 0.5;
      for (let x = 0; x < w1; x++) {
        const sx = ((x + 0.5) * w0) / w1 - 0.5;
        out[y * w1 + x] = sampleMap(map, w0, h0, sx, sy);
      }
    }
    return out;
  }

  global.HermioneDepthPseudo = {
    fromPersonMask,
    featherMask,
    medianDepthWhere,
    resizeMap,
    sampleMap
  };
})(typeof window !== 'undefined' ? window : globalThis);
