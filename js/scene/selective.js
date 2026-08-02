/**
 * Hermiona — selective portrait grade (I5e)
 * Skin soft + subject punch from scene masks.
 * Exposes window.HermionaSelective
 */
(function (global) {
  'use strict';

  function clamp(v, lo, hi) {
    return Math.max(lo, Math.min(hi, v));
  }

  function sampleMap(map, mw, mh, x, y, w, h) {
    if (!map || !mw || !mh) return 0;
    const u = ((x + 0.5) / w) * mw - 0.5;
    const v = ((y + 0.5) / h) * mh - 0.5;
    const x0 = clamp(Math.floor(u), 0, mw - 1);
    const y0 = clamp(Math.floor(v), 0, mh - 1);
    const x1 = Math.min(x0 + 1, mw - 1);
    const y1 = Math.min(y0 + 1, mh - 1);
    const fx = u - x0;
    const fy = v - y0;
    const a = map[y0 * mw + x0];
    const b = map[y0 * mw + x1];
    const c = map[y1 * mw + x0];
    const d = map[y1 * mw + x1];
    return a * (1 - fx) * (1 - fy) + b * fx * (1 - fy) + c * (1 - fx) * fy + d * fx * fy;
  }

  /**
   * Skin mask = face-skin ∪ soft body-skin (or person upper if no parts).
   */
  function buildSkinWeight(scene, w, h) {
    const mw = scene.width;
    const mh = scene.height;
    const out = new Float32Array(w * h);
    const parts = scene.parts;
    if (parts && parts.faceSkin && parts.bodySkin) {
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const face = sampleMap(parts.faceSkin, mw, mh, x, y, w, h);
          const body = sampleMap(parts.bodySkin, mw, mh, x, y, w, h);
          // Prefer face; body-skin milder
          out[y * w + x] = clamp(face + body * 0.55, 0, 1);
        }
      }
      return out;
    }
    // Fallback: person mask, stronger on upper half
    if (scene.personMask) {
      for (let y = 0; y < h; y++) {
        const upper = 1 - (y / Math.max(1, h - 1)) * 0.65;
        for (let x = 0; x < w; x++) {
          const p = sampleMap(scene.personMask, mw, mh, x, y, w, h);
          out[y * w + x] = clamp(p * upper, 0, 1);
        }
      }
    }
    return out;
  }

  function buildSubjectWeight(scene, w, h) {
    const mw = scene.width;
    const mh = scene.height;
    const out = new Float32Array(w * h);
    if (!scene.personMask) return out;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        out[y * w + x] = clamp(
          sampleMap(scene.personMask, mw, mh, x, y, w, h),
          0,
          1
        );
      }
    }
    return out;
  }

  /**
   * Half-res separable box blur of RGB (G1 — much cheaper skin soft).
   */
  function softBlurHalf(src, w, h, radius) {
    const hw = Math.max(1, (w / 2) | 0);
    const hh = Math.max(1, (h / 2) | 0);
    const small = new Uint8ClampedArray(hw * hh * 4);
    for (let y = 0; y < hh; y++) {
      for (let x = 0; x < hw; x++) {
        const si = (Math.min(h - 1, y * 2) * w + Math.min(w - 1, x * 2)) * 4;
        const di = (y * hw + x) * 4;
        small[di] = src[si];
        small[di + 1] = src[si + 1];
        small[di + 2] = src[si + 2];
        small[di + 3] = 255;
      }
    }
    const r = Math.max(1, Math.round(radius * 0.55));
    // horizontal
    const tmp = new Float32Array(hw * hh * 3);
    for (let y = 0; y < hh; y++) {
      for (let x = 0; x < hw; x++) {
        let sr = 0;
        let sg = 0;
        let sb = 0;
        let n = 0;
        for (let k = -r; k <= r; k++) {
          const xx = clamp(x + k, 0, hw - 1);
          const j = (y * hw + xx) * 4;
          sr += small[j];
          sg += small[j + 1];
          sb += small[j + 2];
          n++;
        }
        const ti = (y * hw + x) * 3;
        tmp[ti] = sr / n;
        tmp[ti + 1] = sg / n;
        tmp[ti + 2] = sb / n;
      }
    }
    // vertical → full-res upsample bilinear into out
    const out = new Uint8ClampedArray(src.length);
    const mid = new Uint8ClampedArray(hw * hh * 4);
    for (let y = 0; y < hh; y++) {
      for (let x = 0; x < hw; x++) {
        let sr = 0;
        let sg = 0;
        let sb = 0;
        let n = 0;
        for (let k = -r; k <= r; k++) {
          const yy = clamp(y + k, 0, hh - 1);
          const ti = (yy * hw + x) * 3;
          sr += tmp[ti];
          sg += tmp[ti + 1];
          sb += tmp[ti + 2];
          n++;
        }
        const di = (y * hw + x) * 4;
        mid[di] = sr / n;
        mid[di + 1] = sg / n;
        mid[di + 2] = sb / n;
        mid[di + 3] = 255;
      }
    }
    for (let y = 0; y < h; y++) {
      const fy = ((y + 0.5) * hh) / h - 0.5;
      const y0 = clamp(Math.floor(fy), 0, hh - 1);
      const y1 = clamp(y0 + 1, 0, hh - 1);
      const ty = fy - y0;
      for (let x = 0; x < w; x++) {
        const fx = ((x + 0.5) * hw) / w - 0.5;
        const x0 = clamp(Math.floor(fx), 0, hw - 1);
        const x1 = clamp(x0 + 1, 0, hw - 1);
        const tx = fx - x0;
        const i = (y * w + x) * 4;
        for (let c = 0; c < 3; c++) {
          const a =
            mid[(y0 * hw + x0) * 4 + c] * (1 - tx) +
            mid[(y0 * hw + x1) * 4 + c] * tx;
          const b =
            mid[(y1 * hw + x0) * 4 + c] * (1 - tx) +
            mid[(y1 * hw + x1) * 4 + c] * tx;
          out[i + c] = a * (1 - ty) + b * ty;
        }
        out[i + 3] = 255;
      }
    }
    return out;
  }

  /**
   * Mild soft (half-res blur), blended by amount * weight.
   */
  function applySkinSoft(data, w, h, weight, amount) {
    if (!amount || amount < 0.01 || !weight) return;
    const radius = Math.max(1, Math.round(1 + amount * 3.5));
    const blurred = softBlurHalf(data, w, h, radius);
    const a = amount;

    for (let i = 0; i < w * h; i++) {
      const m = weight[i] * a;
      if (m < 0.02) continue;
      const t = m * 0.85;
      const pi = i * 4;
      data[pi] = clamp(data[pi] * (1 - t) + blurred[pi] * t, 0, 255);
      data[pi + 1] = clamp(data[pi + 1] * (1 - t) + blurred[pi + 1] * t, 0, 255);
      data[pi + 2] = clamp(data[pi + 2] * (1 - t) + blurred[pi + 2] * t, 0, 255);
    }
  }

  /**
   * Mild midtone contrast / microcontrast on subject only.
   */
  function applySubjectPunch(data, w, h, weight, amount) {
    if (!amount || amount < 0.01 || !weight) return;
    const strength = amount * 0.35;

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const wi = y * w + x;
        const m = weight[wi];
        if (m < 0.05) continue;
        const i = wi * 4;
        let r = data[i];
        let g = data[i + 1];
        let b = data[i + 2];
        const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
        // Boost midtones more than extremes
        const mid = 1 - Math.abs(luma / 255 - 0.5) * 2;
        const factor = 1 + strength * m * mid;
        data[i] = clamp((r - 128) * factor + 128, 0, 255);
        data[i + 1] = clamp((g - 128) * factor + 128, 0, 255);
        data[i + 2] = clamp((b - 128) * factor + 128, 0, 255);
      }
    }
  }

  /**
   * @param {Uint8ClampedArray} data
   * @param {number} w
   * @param {number} h
   * @param {object} scene SceneAnalysis
   * @param {{ skinSoft?: number, subjectPunch?: number }} opts amounts 0..1
   */
  function apply(data, w, h, scene, opts) {
    if (!scene || !data) return;
    opts = opts || {};
    const skinSoft = opts.skinSoft || 0;
    const subjectPunch = opts.subjectPunch || 0;
    if (skinSoft < 0.01 && subjectPunch < 0.01) return;

    if (skinSoft >= 0.01) {
      const skinW = buildSkinWeight(scene, w, h);
      applySkinSoft(data, w, h, skinW, skinSoft);
    }
    if (subjectPunch >= 0.01) {
      const subW = buildSubjectWeight(scene, w, h);
      applySubjectPunch(data, w, h, subW, subjectPunch);
    }
  }

  global.HermionaSelective = {
    apply: apply,
    buildSkinWeight: buildSkinWeight,
    buildSubjectWeight: buildSubjectWeight
  };
})(typeof window !== 'undefined' ? window : globalThis);
