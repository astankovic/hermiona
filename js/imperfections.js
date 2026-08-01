/**
 * Hermiona — analog camera / film-scan imperfections (I6a + I6b)
 * Spatial + mechanical character beyond color grading.
 * Exposes window.HermionaImperfections
 *
 * All noise is seeded/static so scrubbing doesn't flicker.
 */
(function (global) {
  'use strict';

  function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  /** Deterministic hash → 0..1 */
  function hash2(x, y, seed) {
    let n = x * 374761393 + y * 668265263 + seed * 1274126177;
    n = (n ^ (n >>> 13)) * 1274126177;
    n = n ^ (n >>> 16);
    return (n >>> 0) / 4294967295;
  }

  function hash1(i, seed) {
    let n = i * 374761393 + seed * 668265263;
    n = (n ^ (n >>> 13)) * 1274126177;
    n = n ^ (n >>> 16);
    return (n >>> 0) / 4294967295;
  }

  /**
   * Default imperfection amounts 0..1 (resolved).
   * User UI stores 0..100; cameras/presets seed 0..1 or 0..100 via resolve().
   */
  const KEYS = [
    'softCorners',
    'leakEdge',
    'dust',
    'scratches',
    'gate',
    'uneven',
    'barrel',
    'lateralCA',
    'ghost',
    'stains',
    'border',
    'dateStamp',
    'halationBlur',
    'highlightRoll'
  ];

  function emptyAmounts() {
    const o = {};
    KEYS.forEach((k) => {
      o[k] = 0;
    });
    return o;
  }

  /**
   * Merge camera.imperf (0..1) + look.imperf (0..100) + master intensity.
   * @param {object} lookState
   * @param {object|null} camera
   * @param {number} camInt 0..1
   */
  function resolve(lookState, camera, camInt) {
    const out = emptyAmounts();
    const master =
      lookState && lookState.imperfIntensity != null
        ? clamp(lookState.imperfIntensity / 100, 0, 1)
        : 1;
    const user = (lookState && lookState.imperf) || {};
    const base = (camera && camera.imperf) || {};
    const ct = clamp(camInt != null ? camInt : 1, 0, 1);

    const manual = !!(lookState && lookState.imperfManual);
    KEYS.forEach((k) => {
      // Manual UI values 0..100; else camera.imperf defaults 0..1 * camera intensity
      let v;
      if (manual && user[k] != null && user[k] !== '') {
        v = clamp(Number(user[k]) / 100, 0, 1);
      } else {
        v = clamp((base[k] || 0) * ct, 0, 1);
      }
      // Cinestill: ensure some real halation blur when film is strong
      if (k === 'halationBlur' && lookState && lookState.film === 'cinestill800t') {
        const filmT =
          (lookState.filmIntensity != null ? lookState.filmIntensity : 100) / 100;
        v = Math.max(v, 0.35 * filmT);
      }
      out[k] = v * master;
    });

    return out;
  }

  function anyActive(amt) {
    for (let i = 0; i < KEYS.length; i++) {
      if (amt[KEYS[i]] > 0.004) return true;
    }
    return false;
  }

  // —— A1 Soft corners (field curvature approx via radial microcontrast crush + cheap blur) ——
  function applySoftCorners(data, w, h, amount, quality) {
    if (amount < 0.01) return;
    const copy = new Uint8ClampedArray(data);
    const cx = (w - 1) * 0.5;
    const cy = (h - 1) * 0.5;
    const maxD = Math.sqrt(cx * cx + cy * cy) || 1;
    const r0 = 0.35; // sharp core
    const step = quality === 'preview' ? 2 : 1;

    for (let y = 1; y < h - 1; y += step) {
      for (let x = 1; x < w - 1; x += step) {
        const dx = x - cx;
        const dy = y - cy;
        const d = Math.sqrt(dx * dx + dy * dy) / maxD;
        if (d < r0) continue;
        const t = clamp((d - r0) / (1 - r0), 0, 1);
        const s = t * t * amount;
        if (s < 0.02) continue;

        const i = (y * w + x) * 4;
        // 3x3 box (skip corners for speed)
        let r = 0;
        let g = 0;
        let b = 0;
        let n = 0;
        for (let oy = -1; oy <= 1; oy++) {
          for (let ox = -1; ox <= 1; ox++) {
            if (ox !== 0 && oy !== 0) continue; // + shape for preview speed
            const j = ((y + oy) * w + (x + ox)) * 4;
            r += copy[j];
            g += copy[j + 1];
            b += copy[j + 2];
            n++;
          }
        }
        // full 3x3 on export
        if (quality !== 'preview') {
          r = g = b = n = 0;
          for (let oy = -1; oy <= 1; oy++) {
            for (let ox = -1; ox <= 1; ox++) {
              const j = ((y + oy) * w + (x + ox)) * 4;
              r += copy[j];
              g += copy[j + 1];
              b += copy[j + 2];
              n++;
            }
          }
        }
        r /= n;
        g /= n;
        b /= n;
        const mix = s * 0.85;
        data[i] = lerp(copy[i], r, mix);
        data[i + 1] = lerp(copy[i + 1], g, mix);
        data[i + 2] = lerp(copy[i + 2], b, mix);
        // crush microcontrast further
        const gray = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
        const c = 1 - s * 0.35;
        data[i] = clamp((data[i] - gray) * c + gray, 0, 255);
        data[i + 1] = clamp((data[i + 1] - gray) * c + gray, 0, 255);
        data[i + 2] = clamp((data[i + 2] - gray) * c + gray, 0, 255);

        if (step > 1) {
          for (let dy2 = 0; dy2 < step && y + dy2 < h; dy2++) {
            for (let dx2 = 0; dx2 < step && x + dx2 < w; dx2++) {
              if (dx2 === 0 && dy2 === 0) continue;
              const k = ((y + dy2) * w + (x + dx2)) * 4;
              data[k] = data[i];
              data[k + 1] = data[i + 1];
              data[k + 2] = data[i + 2];
            }
          }
        }
      }
    }
  }

  // —— A2 Edge light-leak strips (failed foam seals) ——
  function applyLeakEdge(data, w, h, amount, hue) {
    if (amount < 0.01) return;
    const band = Math.max(2, Math.round(Math.min(w, h) * (0.03 + amount * 0.06)));
    const warm = hue !== 'magenta';

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        // Distance to nearest edge
        const de = Math.min(x, y, w - 1 - x, h - 1 - y);
        if (de >= band) continue;
        // Prefer top + right (classic back-seal), with secondary left
        const top = 1 - clamp(y / band, 0, 1);
        const right = 1 - clamp((w - 1 - x) / band, 0, 1);
        const left = 1 - clamp(x / (band * 1.4), 0, 1);
        const L =
          (Math.pow(top, 1.4) * 0.55 +
            Math.pow(right, 1.6) * 0.75 +
            Math.pow(left, 2) * 0.25) *
          amount;
        if (L < 0.01) continue;
        // irregularity along edge
        const irr = 0.7 + 0.3 * hash2(x, Math.floor(y / 3), 91);
        const a = L * irr;
        const i = (y * w + x) * 4;
        if (warm) {
          data[i] = clamp(data[i] + a * 140, 0, 255);
          data[i + 1] = clamp(data[i + 1] + a * 55, 0, 255);
          data[i + 2] = clamp(data[i + 2] + a * 12, 0, 255);
        } else {
          data[i] = clamp(data[i] + a * 120, 0, 255);
          data[i + 1] = clamp(data[i + 1] + a * 20, 0, 255);
          data[i + 2] = clamp(data[i + 2] + a * 90, 0, 255);
        }
      }
    }
  }

  // —— A3 Dust & hair ——
  function applyDust(data, w, h, amount) {
    if (amount < 0.01) return;
    const long = Math.max(w, h);
    const count = Math.round(8 + amount * 90 * (long / 1200));
    const seed = 4242;

    for (let n = 0; n < count; n++) {
      const u = hash1(n, seed);
      const v = hash1(n, seed + 7);
      const x = Math.floor(u * w);
      const y = Math.floor(v * h);
      const dark = hash1(n, seed + 3) > 0.35;
      const r = 0.6 + hash1(n, seed + 11) * (1.2 + amount * 2);
      // hair: occasional short line
      const isHair = hash1(n, seed + 19) > 0.78;
      if (isHair) {
        const len = 4 + Math.floor(hash1(n, seed + 23) * 18);
        const ang = hash1(n, seed + 29) * Math.PI;
        const cos = Math.cos(ang);
        const sin = Math.sin(ang);
        for (let t = 0; t < len; t++) {
          const px = Math.round(x + cos * t);
          const py = Math.round(y + sin * t);
          if (px < 0 || py < 0 || px >= w || py >= h) continue;
          const i = (py * w + px) * 4;
          const a = amount * (0.35 + 0.4 * (1 - t / len));
          if (dark) {
            data[i] = clamp(data[i] * (1 - a), 0, 255);
            data[i + 1] = clamp(data[i + 1] * (1 - a), 0, 255);
            data[i + 2] = clamp(data[i + 2] * (1 - a), 0, 255);
          } else {
            data[i] = clamp(data[i] + a * 80, 0, 255);
            data[i + 1] = clamp(data[i + 1] + a * 80, 0, 255);
            data[i + 2] = clamp(data[i + 2] + a * 70, 0, 255);
          }
        }
      } else {
        const rr = Math.ceil(r);
        for (let oy = -rr; oy <= rr; oy++) {
          for (let ox = -rr; ox <= rr; ox++) {
            if (ox * ox + oy * oy > r * r) continue;
            const px = x + ox;
            const py = y + oy;
            if (px < 0 || py < 0 || px >= w || py >= h) continue;
            const i = (py * w + px) * 4;
            const fall = 1 - Math.sqrt(ox * ox + oy * oy) / (r + 0.01);
            const a = amount * fall * 0.7;
            if (dark) {
              data[i] *= 1 - a;
              data[i + 1] *= 1 - a;
              data[i + 2] *= 1 - a;
            } else {
              data[i] = clamp(data[i] + a * 90, 0, 255);
              data[i + 1] = clamp(data[i + 1] + a * 90, 0, 255);
              data[i + 2] = clamp(data[i + 2] + a * 80, 0, 255);
            }
          }
        }
      }
    }
  }

  // —— B10 Vertical film-path scratches ——
  function applyScratches(data, w, h, amount) {
    if (amount < 0.01) return;
    const nLines = Math.round(1 + amount * 7);
    for (let n = 0; n < nLines; n++) {
      const x = Math.floor(hash1(n, 777) * w);
      const bright = hash1(n, 778) > 0.45;
      const thick = hash1(n, 779) > 0.85 ? 2 : 1;
      const opacity = (0.12 + hash1(n, 780) * 0.35) * amount;
      const wobble = hash1(n, 781) * 0.8;
      for (let y = 0; y < h; y++) {
        const wx = x + Math.floor(Math.sin(y * 0.07 + n) * wobble);
        for (let t = 0; t < thick; t++) {
          const px = wx + t;
          if (px < 0 || px >= w) continue;
          const i = (y * w + px) * 4;
          if (bright) {
            data[i] = clamp(data[i] + opacity * 90, 0, 255);
            data[i + 1] = clamp(data[i + 1] + opacity * 85, 0, 255);
            data[i + 2] = clamp(data[i + 2] + opacity * 80, 0, 255);
          } else {
            data[i] *= 1 - opacity;
            data[i + 1] *= 1 - opacity;
            data[i + 2] *= 1 - opacity;
          }
        }
      }
    }
  }

  // —— A4 Film gate / rectangular falloff ——
  function applyGate(data, w, h, amount) {
    if (amount < 0.01) return;
    const insetX = 0.02 + amount * 0.04;
    const insetY = 0.025 + amount * 0.05;
    const power = 1.8 + amount * 1.2;
    for (let y = 0; y < h; y++) {
      const ny = y / (h - 1 || 1);
      const ey = Math.max(0, insetY - ny, ny - (1 - insetY)) / (insetY || 0.01);
      for (let x = 0; x < w; x++) {
        const nx = x / (w - 1 || 1);
        const ex = Math.max(0, insetX - nx, nx - (1 - insetX)) / (insetX || 0.01);
        const e = Math.max(ex, ey);
        if (e <= 0) continue;
        const f = 1 - Math.pow(clamp(e, 0, 1), power) * amount * 0.95;
        const i = (y * w + x) * 4;
        data[i] *= f;
        data[i + 1] *= f;
        data[i + 2] *= f;
      }
    }
  }

  // —— A7 Uneven exposure / shutter striping ——
  function applyUneven(data, w, h, amount, mode) {
    if (amount < 0.01) return;
    // mode: 'h' horizontal curtain, 'v' vertical, 'diag'
    const m = mode || 'h';
    for (let y = 0; y < h; y++) {
      const ny = y / (h - 1 || 1);
      for (let x = 0; x < w; x++) {
        const nx = x / (w - 1 || 1);
        let g =
          m === 'v'
            ? nx
            : m === 'diag'
              ? (nx + ny) * 0.5
              : ny;
        // slight S-curve unevenness
        g = g + Math.sin(g * Math.PI * 2) * 0.08;
        const f = 1 + (g - 0.5) * amount * 0.55;
        const i = (y * w + x) * 4;
        data[i] = clamp(data[i] * f, 0, 255);
        data[i + 1] = clamp(data[i + 1] * f, 0, 255);
        data[i + 2] = clamp(data[i + 2] * f, 0, 255);
      }
    }
  }

  // —— A5 Mild barrel distortion ——
  function applyBarrel(data, w, h, amount, quality) {
    if (amount < 0.008) return;
    const k = -amount * 0.22; // negative = barrel
    const cx = (w - 1) * 0.5;
    const cy = (h - 1) * 0.5;
    const maxR = Math.sqrt(cx * cx + cy * cy) || 1;
    const src = new Uint8ClampedArray(data);
    const step = quality === 'preview' ? 2 : 1;

    function sample(xf, yf, c) {
      const x0 = clamp(Math.floor(xf), 0, w - 1);
      const y0 = clamp(Math.floor(yf), 0, h - 1);
      const x1 = clamp(x0 + 1, 0, w - 1);
      const y1 = clamp(y0 + 1, 0, h - 1);
      const tx = xf - Math.floor(xf);
      const ty = yf - Math.floor(yf);
      const i00 = (y0 * w + x0) * 4 + c;
      const i10 = (y0 * w + x1) * 4 + c;
      const i01 = (y1 * w + x0) * 4 + c;
      const i11 = (y1 * w + x1) * 4 + c;
      return lerp(lerp(src[i00], src[i10], tx), lerp(src[i01], src[i11], tx), ty);
    }

    for (let y = 0; y < h; y += step) {
      for (let x = 0; x < w; x += step) {
        const dx = (x - cx) / maxR;
        const dy = (y - cy) / maxR;
        const r2 = dx * dx + dy * dy;
        const f = 1 + k * r2;
        const sx = cx + dx * f * maxR;
        const sy = cy + dy * f * maxR;
        const i = (y * w + x) * 4;
        data[i] = sample(sx, sy, 0);
        data[i + 1] = sample(sx, sy, 1);
        data[i + 2] = sample(sx, sy, 2);
        if (step > 1) {
          for (let dy2 = 0; dy2 < step && y + dy2 < h; dy2++) {
            for (let dx2 = 0; dx2 < step && x + dx2 < w; dx2++) {
              if (!dx2 && !dy2) continue;
              const j = ((y + dy2) * w + (x + dx2)) * 4;
              data[j] = data[i];
              data[j + 1] = data[i + 1];
              data[j + 2] = data[i + 2];
            }
          }
        }
      }
    }
  }

  // —— A6 Lateral CA stronger at corners ——
  function applyLateralCA(data, w, h, amount) {
    if (amount < 0.01) return;
    const src = new Uint8ClampedArray(data);
    const cx = (w - 1) * 0.5;
    const cy = (h - 1) * 0.5;
    const maxR = Math.sqrt(cx * cx + cy * cy) || 1;
    const maxShift = amount * 3.5;

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const dx = x - cx;
        const dy = y - cy;
        const d = Math.sqrt(dx * dx + dy * dy) / maxR;
        if (d < 0.25) continue;
        const s = ((d - 0.25) / 0.75) * maxShift;
        const ux = dx / (Math.sqrt(dx * dx + dy * dy) || 1);
        const uy = dy / (Math.sqrt(dx * dx + dy * dy) || 1);
        const rx = clamp(Math.round(x + ux * s), 0, w - 1);
        const ry = clamp(Math.round(y + uy * s), 0, h - 1);
        const bx = clamp(Math.round(x - ux * s), 0, w - 1);
        const by = clamp(Math.round(y - uy * s), 0, h - 1);
        const i = (y * w + x) * 4;
        data[i] = src[(ry * w + rx) * 4];
        data[i + 2] = src[(by * w + bx) * 4 + 2];
      }
    }
  }

  // —— B9 Ghost / double exposure ——
  function applyGhost(data, w, h, amount, quality) {
    if (amount < 0.02) return;
    const src = new Uint8ClampedArray(data);
    const ox = Math.round((hash1(1, 55) - 0.5) * w * 0.04 * (0.5 + amount));
    const oy = Math.round((hash1(2, 55) - 0.5) * h * 0.03 * (0.5 + amount));
    const a = amount * 0.28;
    const step = quality === 'preview' ? 2 : 1;
    for (let y = 0; y < h; y += step) {
      for (let x = 0; x < w; x += step) {
        const sx = clamp(x + ox, 0, w - 1);
        const sy = clamp(y + oy, 0, h - 1);
        const i = (y * w + x) * 4;
        const j = (sy * w + sx) * 4;
        data[i] = clamp(data[i] * (1 - a) + src[j] * a, 0, 255);
        data[i + 1] = clamp(data[i + 1] * (1 - a) + src[j + 1] * a, 0, 255);
        data[i + 2] = clamp(data[i + 2] * (1 - a) + src[j + 2] * a, 0, 255);
      }
    }
  }

  // —— B11 Chemical stains ——
  function applyStains(data, w, h, amount) {
    if (amount < 0.02) return;
    const blobs = 3 + Math.floor(amount * 5);
    for (let n = 0; n < blobs; n++) {
      const cx = hash1(n, 900) * w;
      const cy = hash1(n, 901) * h;
      const rx = (0.12 + hash1(n, 902) * 0.25) * w * (0.5 + amount);
      const ry = (0.1 + hash1(n, 903) * 0.22) * h * (0.5 + amount);
      const hue = hash1(n, 904); // 0 magenta-ish, 1 cyan-ish, 0.5 yellow
      const strength = amount * (0.08 + hash1(n, 905) * 0.14);
      for (let y = 0; y < h; y++) {
        const dy = (y - cy) / ry;
        for (let x = 0; x < w; x++) {
          const dx = (x - cx) / rx;
          const d = dx * dx + dy * dy;
          if (d > 1) continue;
          const fall = (1 - d) * (1 - d) * strength;
          const i = (y * w + x) * 4;
          if (hue < 0.33) {
            data[i] = clamp(data[i] + fall * 255 * 0.9, 0, 255);
            data[i + 2] = clamp(data[i + 2] + fall * 255 * 0.5, 0, 255);
            data[i + 1] = clamp(data[i + 1] - fall * 255 * 0.15, 0, 255);
          } else if (hue < 0.66) {
            data[i + 1] = clamp(data[i + 1] + fall * 255 * 0.5, 0, 255);
            data[i + 2] = clamp(data[i + 2] + fall * 255 * 0.7, 0, 255);
            data[i] = clamp(data[i] - fall * 255 * 0.1, 0, 255);
          } else {
            data[i] = clamp(data[i] + fall * 255 * 0.55, 0, 255);
            data[i + 1] = clamp(data[i + 1] + fall * 255 * 0.4, 0, 255);
          }
        }
      }
    }
  }

  // —— B12 Polaroid / instant border ——
  function applyBorder(data, w, h, amount) {
    if (amount < 0.05) return;
    const top = Math.round(h * 0.03 * amount);
    const side = Math.round(w * 0.035 * amount);
    const bottom = Math.round(h * (0.1 + 0.06 * amount));
    const cream = [245, 240, 230];
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const inFrame =
          x >= side && x < w - side && y >= top && y < h - bottom;
        if (inFrame) {
          // slight inner edge darkening
          const bx = Math.min(x - side, w - side - 1 - x);
          const by = Math.min(y - top, h - bottom - 1 - y);
          const be = Math.min(bx, by);
          if (be < 4) {
            const a = (1 - be / 4) * amount * 0.25;
            const i = (y * w + x) * 4;
            data[i] *= 1 - a;
            data[i + 1] *= 1 - a;
            data[i + 2] *= 1 - a;
          }
          continue;
        }
        const i = (y * w + x) * 4;
        // paper grain
        const n = (hash2(x, y, 333) - 0.5) * 8 * amount;
        data[i] = clamp(cream[0] + n, 0, 255);
        data[i + 1] = clamp(cream[1] + n, 0, 255);
        data[i + 2] = clamp(cream[2] + n * 0.8, 0, 255);
      }
    }
  }

  // —— B13 Date imprint (simple 7-seg-ish) ——
  const DIGIT = {
    0: '1110111',
    1: '0010010',
    2: '1011101',
    3: '1011011',
    4: '0111010',
    5: '1101011',
    6: '1101111',
    7: '1010010',
    8: '1111111',
    9: '1111011',
    "'": '0100000',
    ' ': '0000000'
  };

  function drawDigit(data, w, h, x0, y0, ch, scale, color, alpha) {
    const pat = DIGIT[ch] || DIGIT[' '];
    // 7 segments: a b c d e f g  (classic)
    const segs = [
      [0, 0, 3, 1], // a top
      [2, 0, 1, 3], // b upper right
      [2, 3, 1, 3], // c lower right
      [0, 5, 3, 1], // d bottom
      [0, 3, 1, 3], // e lower left
      [0, 0, 1, 3], // f upper left
      [0, 2, 3, 1] // g mid
    ];
    for (let s = 0; s < 7; s++) {
      if (pat[s] !== '1') continue;
      const [sx, sy, sw, sh] = segs[s];
      for (let y = 0; y < sh * scale; y++) {
        for (let x = 0; x < sw * scale; x++) {
          const px = x0 + sx * scale + x;
          const py = y0 + sy * scale + y;
          if (px < 0 || py < 0 || px >= w || py >= h) continue;
          const i = (py * w + px) * 4;
          data[i] = clamp(lerp(data[i], color[0], alpha), 0, 255);
          data[i + 1] = clamp(lerp(data[i + 1], color[1], alpha), 0, 255);
          data[i + 2] = clamp(lerp(data[i + 2], color[2], alpha), 0, 255);
        }
      }
    }
  }

  function applyDateStamp(data, w, h, amount) {
    if (amount < 0.15) return;
    // Fixed nostalgic date
    const text = "'98 8 12";
    const scale = Math.max(1, Math.round(Math.min(w, h) / 400));
    const digitW = 4 * scale;
    const gap = 2 * scale;
    const totalW = text.length * (digitW + gap);
    const x0 = w - totalW - Math.round(w * 0.04);
    const y0 = h - 8 * scale - Math.round(h * 0.035);
    const alpha = 0.35 + amount * 0.5;
    const color = [255, 140, 40];
    let x = x0;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (ch !== ' ') drawDigit(data, w, h, x, y0, ch, scale, color, alpha);
      x += digitW + gap;
    }
  }

  // —— B8 Real-ish halation blur (red bleed on highlights) ——
  function applyHalationBlur(data, w, h, amount, quality) {
    if (amount < 0.02) return;
    const thr = 200 - amount * 40;
    const src = new Uint8ClampedArray(data);
    const radius = quality === 'preview' ? 2 : 3 + Math.floor(amount * 3);
    // extract highlight mask into temp red glow
    const glow = new Float32Array(w * h);
    for (let i = 0, p = 0; i < data.length; i += 4, p++) {
      const luma = 0.2126 * src[i] + 0.7152 * src[i + 1] + 0.0722 * src[i + 2];
      glow[p] = luma > thr ? (luma - thr) / (255 - thr) : 0;
    }
    // box blur glow
    const tmp = new Float32Array(w * h);
    const passes = quality === 'preview' ? 1 : 2;
    for (let pass = 0; pass < passes; pass++) {
      // horizontal
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          let s = 0;
          let n = 0;
          for (let k = -radius; k <= radius; k++) {
            const xx = clamp(x + k, 0, w - 1);
            s += glow[y * w + xx];
            n++;
          }
          tmp[y * w + x] = s / n;
        }
      }
      // vertical
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          let s = 0;
          let n = 0;
          for (let k = -radius; k <= radius; k++) {
            const yy = clamp(y + k, 0, h - 1);
            s += tmp[yy * w + x];
            n++;
          }
          glow[y * w + x] = s / n;
        }
      }
    }
    const str = amount * 0.55;
    for (let y = 0, p = 0; y < h; y++) {
      for (let x = 0; x < w; x++, p++) {
        const g = glow[p];
        if (g < 0.01) continue;
        const i = p * 4;
        data[i] = clamp(data[i] + g * str * 180, 0, 255);
        data[i + 1] = clamp(data[i + 1] + g * str * 40, 0, 255);
        data[i + 2] = clamp(data[i + 2] - g * str * 15, 0, 255);
      }
    }
  }

  // —— B14 Soft highlight rolloff (film knee) ——
  function applyHighlightRoll(data, w, h, amount) {
    if (amount < 0.01) return;
    const knee = 0.65 - amount * 0.1;
    for (let i = 0; i < data.length; i += 4) {
      for (let c = 0; c < 3; c++) {
        let v = data[i + c] / 255;
        if (v > knee) {
          const t = (v - knee) / (1 - knee);
          // soft compress toward 1
          const soft = knee + (1 - knee) * (1 - Math.exp(-t * (1.2 + amount)));
          v = lerp(v, soft, amount);
          data[i + c] = clamp(v * 255, 0, 255);
        }
      }
    }
  }

  /**
   * Apply full imperfection stack.
   * @param {Uint8ClampedArray} data
   * @param {number} w
   * @param {number} h
   * @param {object} amounts resolved 0..1
   * @param {object} [opts]
   * @param {'preview'|'export'} [opts.quality]
   * @param {boolean} [opts.fast] skip expensive spatial
   * @param {string} [opts.leakHue]
   * @param {string} [opts.unevenMode]
   */
  function apply(data, w, h, amounts, opts) {
    if (!data || !amounts || !anyActive(amounts)) return;
    opts = opts || {};
    const quality = opts.quality || 'preview';
    const fast = !!opts.fast;

    // Cheap first
    if (amounts.highlightRoll > 0.01) {
      applyHighlightRoll(data, w, h, amounts.highlightRoll);
    }
    if (amounts.uneven > 0.01) {
      applyUneven(data, w, h, amounts.uneven, opts.unevenMode || 'h');
    }
    if (amounts.gate > 0.01) {
      applyGate(data, w, h, amounts.gate);
    }
    if (amounts.leakEdge > 0.01) {
      applyLeakEdge(data, w, h, amounts.leakEdge, opts.leakHue || 'warm');
    }
    if (amounts.stains > 0.02 && !fast) {
      applyStains(data, w, h, amounts.stains);
    }
    if (amounts.dust > 0.01) {
      applyDust(data, w, h, amounts.dust);
    }
    if (amounts.scratches > 0.01) {
      applyScratches(data, w, h, amounts.scratches);
    }

    // Spatial (heavier)
    if (!fast) {
      if (amounts.barrel > 0.01) {
        applyBarrel(data, w, h, amounts.barrel, quality);
      }
      if (amounts.softCorners > 0.01) {
        applySoftCorners(data, w, h, amounts.softCorners, quality);
      }
      if (amounts.lateralCA > 0.01) {
        applyLateralCA(data, w, h, amounts.lateralCA);
      }
      if (amounts.ghost > 0.02) {
        applyGhost(data, w, h, amounts.ghost, quality);
      }
      if (amounts.halationBlur > 0.02) {
        applyHalationBlur(data, w, h, amounts.halationBlur, quality);
      }
    } else {
      // Fast path: approximate soft corners with pure microcontrast (no blur)
      if (amounts.softCorners > 0.05) {
        const cx = (w - 1) * 0.5;
        const cy = (h - 1) * 0.5;
        const maxD = Math.sqrt(cx * cx + cy * cy) || 1;
        const a = amounts.softCorners * 0.5;
        for (let y = 0; y < h; y++) {
          for (let x = 0; x < w; x++) {
            const d = Math.sqrt((x - cx) * (x - cx) + (y - cy) * (y - cy)) / maxD;
            if (d < 0.4) continue;
            const s = ((d - 0.4) / 0.6) * a;
            const i = (y * w + x) * 4;
            const gray = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
            const c = 1 - s * 0.45;
            data[i] = (data[i] - gray) * c + gray;
            data[i + 1] = (data[i + 1] - gray) * c + gray;
            data[i + 2] = (data[i + 2] - gray) * c + gray;
          }
        }
      }
    }

    // Frame / stamp last so they sit on top
    if (amounts.border > 0.05) {
      applyBorder(data, w, h, amounts.border);
    }
    if (amounts.dateStamp > 0.15) {
      applyDateStamp(data, w, h, amounts.dateStamp);
    }
  }

  global.HermionaImperfections = {
    KEYS,
    emptyAmounts,
    resolve,
    anyActive,
    apply
  };
})(typeof window !== 'undefined' ? window : globalThis);
