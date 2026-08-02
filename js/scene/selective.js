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
   * Mild box blur, applied only where weight > 0, blended by amount * weight.
   * @param {Uint8ClampedArray} data
   * @param {number} w
   * @param {number} h
   * @param {Float32Array} weight 0..1 length w*h
   * @param {number} amount 0..1
   */
  function applySkinSoft(data, w, h, weight, amount) {
    if (!amount || amount < 0.01 || !weight) return;
    const radius = Math.max(1, Math.round(1 + amount * 3.5));
    const copy = new Uint8ClampedArray(data);
    const a = amount;

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const wi = y * w + x;
        const m = weight[wi] * a;
        if (m < 0.02) continue;

        let sr = 0;
        let sg = 0;
        let sb = 0;
        let n = 0;
        for (let dy = -radius; dy <= radius; dy++) {
          const yy = y + dy;
          if (yy < 0 || yy >= h) continue;
          for (let dx = -radius; dx <= radius; dx++) {
            const xx = x + dx;
            if (xx < 0 || xx >= w) continue;
            const j = (yy * w + xx) * 4;
            sr += copy[j];
            sg += copy[j + 1];
            sb += copy[j + 2];
            n++;
          }
        }
        if (!n) continue;
        const i = wi * 4;
        const t = m * 0.85; // never full melt
        data[i] = clamp(copy[i] * (1 - t) + (sr / n) * t, 0, 255);
        data[i + 1] = clamp(copy[i + 1] * (1 - t) + (sg / n) * t, 0, 255);
        data[i + 2] = clamp(copy[i + 2] * (1 - t) + (sb / n) * t, 0, 255);
      }
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
