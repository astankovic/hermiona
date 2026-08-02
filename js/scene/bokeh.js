/**
 * Optical bokeh highlights — disc / hex / anamorphic stamps
 * I5c · Exposes window.HermioneBokeh
 */
(function (global) {
  'use strict';

  function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  /** Prebuilt soft kernels cache: key = shape|radius */
  const kernelCache = {};

  /**
   * Build grayscale kernel 0..1, size = 2*r+1
   * @param {'circle'|'hex'|'anamorphic'} shape
   * @param {number} radius px
   */
  function buildKernel(shape, radius) {
    const r = Math.max(2, radius | 0);
    const key = shape + '|' + r;
    if (kernelCache[key]) return kernelCache[key];

    const size = r * 2 + 1;
    const k = new Float32Array(size * size);
    const cx = r;
    const cy = r;

    // Anamorphic horizontal stretch
    const sx = shape === 'anamorphic' ? 1.65 : 1;
    const sy = shape === 'anamorphic' ? 0.72 : 1;

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const dx = (x - cx) / sx;
        const dy = (y - cy) / sy;
        let inside = 0;

        if (shape === 'hex') {
          // Regular hexagon in unit circle space
          const nx = dx / r;
          const ny = dy / r;
          const ax = Math.abs(nx);
          const ay = Math.abs(ny);
          // hex: |x| <= 1, |x|/2 + |y|*√3/2 <= 1
          const h = ax <= 1 && ax * 0.5 + ay * 0.866 <= 1 ? 1 : 0;
          // soft edge
          const edge = Math.max(ax, ax * 0.5 + ay * 0.866);
          inside = h * clamp(1 - (edge - 0.75) / 0.25, 0, 1);
          // slight center hot
          const d = Math.sqrt(nx * nx + ny * ny);
          inside *= clamp(1.15 - d * 0.35, 0.55, 1);
        } else {
          // circle / anamorphic ellipse
          const d = Math.sqrt(dx * dx + dy * dy) / r;
          if (d >= 1) {
            inside = 0;
          } else {
            // soft disc with brighter rim (optical ring) for larger r
            const core = Math.pow(1 - d, 1.35);
            const rim = d > 0.55 ? Math.pow((1 - d) / 0.45, 0.6) * 0.35 : 0;
            inside = clamp(core + rim, 0, 1);
          }
        }

        k[y * size + x] = inside;
      }
    }

    // Normalize peak to 1
    let mx = 0;
    for (let i = 0; i < k.length; i++) if (k[i] > mx) mx = k[i];
    if (mx > 0) {
      for (let i = 0; i < k.length; i++) k[i] /= mx;
    }

    const out = { data: k, size: size, radius: r };
    kernelCache[key] = out;
    // Bound cache size
    const keys = Object.keys(kernelCache);
    if (keys.length > 48) {
      delete kernelCache[keys[0]];
    }
    return out;
  }

  /**
   * Collect highlight candidates (grid-thinned).
   * @returns {Array<{x,y,r,g,b,coc,luma}>}
   */
  function collectHighlights(src, coc, w, h, opts) {
    opts = opts || {};
    const lumaThr = opts.lumaThr != null ? opts.lumaThr : 210;
    const cocThr = opts.cocThr != null ? opts.cocThr : 0.32;
    const cell = opts.cell || 10;
    const maxPoints = opts.maxPoints || 100;
    const strength = opts.strength != null ? opts.strength : 1;

    // Per-cell best highlight
    const cols = Math.ceil(w / cell);
    const rows = Math.ceil(h / cell);
    const best = new Array(cols * rows);

    for (let y = 2; y < h - 2; y++) {
      for (let x = 2; x < w - 2; x++) {
        const i = y * w + x;
        const c = (coc[i] || 0) * strength;
        if (c < cocThr) continue;
        const pi = i * 4;
        const r = src[pi];
        const g = src[pi + 1];
        const b = src[pi + 2];
        const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
        if (luma < lumaThr) continue;

        // Local max-ish (cheap)
        const lumaN =
          0.2126 * src[((y - 1) * w + x) * 4] +
          0.7152 * src[((y - 1) * w + x) * 4 + 1] +
          0.0722 * src[((y - 1) * w + x) * 4 + 2];
        if (luma + 4 < lumaN) continue;

        const cx = (x / cell) | 0;
        const cy = (y / cell) | 0;
        const bi = cy * cols + cx;
        const score = luma * (0.5 + c);
        if (!best[bi] || score > best[bi].score) {
          best[bi] = {
            x: x,
            y: y,
            r: r,
            g: g,
            b: b,
            coc: c,
            luma: luma,
            score: score
          };
        }
      }
    }

    const list = [];
    for (let i = 0; i < best.length; i++) {
      if (best[i]) list.push(best[i]);
    }
    list.sort((a, b) => b.score - a.score);
    return list.slice(0, maxPoints);
  }

  /**
   * Cat-eye factor: bokeh shrinks near frame edges (optical vignetting of discs)
   */
  function catEyeScale(x, y, w, h) {
    const nx = (x / w) * 2 - 1;
    const ny = (y / h) * 2 - 1;
    const d = Math.sqrt(nx * nx + ny * ny);
    // center 1, corners ~0.55
    return clamp(1.05 - d * 0.55, 0.45, 1);
  }

  /**
   * Stamp kernels onto float accum (RGB + weight), then screen-blend to data.
   *
   * @param {Uint8ClampedArray} data — image after DoF blur (modified in place)
   * @param {Uint8ClampedArray} srcSharp — pre-DoF or current for highlight color (usually current pre-bokeh copy)
   * @param {Float32Array} coc
   * @param {number} w
   * @param {number} h
   * @param {object} opts
   */
  function apply(data, srcSharp, coc, w, h, opts) {
    if (!coc || !data) return;
    opts = opts || {};

    const amount = clamp(opts.amount != null ? opts.amount : 0.55, 0, 1);
    if (amount < 0.02) return;

    const strength = clamp(opts.dofStrength != null ? opts.dofStrength : 1, 0, 1);
    if (strength < 0.05) return;

    const shape = opts.shape || 'circle';
    const quality = opts.quality || 'preview';
    const maxR = opts.maxRadius || 14;

    const maxPoints = quality === 'export' ? 180 : 90;
    const cell = quality === 'export' ? 8 : 12;
    const lumaThr = quality === 'export' ? 200 : 215;

    const points = collectHighlights(srcSharp || data, coc, w, h, {
      lumaThr: lumaThr,
      cocThr: 0.28,
      cell: cell,
      maxPoints: maxPoints,
      strength: strength
    });

    if (!points.length) return;

    // Float accum for additive glow
    const acc = new Float32Array(w * h * 3);

    for (let p = 0; p < points.length; p++) {
      const pt = points[p];
      const ce = catEyeScale(pt.x, pt.y, w, h);
      // Disc radius from CoC
      let rad = Math.round(lerp(3, maxR, pt.coc) * ce * (0.7 + 0.3 * amount));
      rad = clamp(rad, 2, maxR);

      // Anamorphic default shape uses stretched kernel
      const kShape =
        shape === 'anamo' || shape === 'anamorphic' ? 'anamorphic' : shape === 'hex' ? 'hex' : 'circle';
      const kernel = buildKernel(kShape, rad);
      const ks = kernel.size;
      const kr = kernel.radius;
      const kd = kernel.data;

      // Intensity: brighter + more OOF → stronger disc
      const intensity =
        amount *
        strength *
        clamp((pt.luma - lumaThr) / (255 - lumaThr), 0.15, 1) *
        clamp(pt.coc * 1.4, 0.2, 1) *
        0.85;

      const pr = pt.r / 255;
      const pg = pt.g / 255;
      const pb = pt.b / 255;
      // Slight desat + lift for creamy bokeh
      const gray = 0.2126 * pr + 0.7152 * pg + 0.0722 * pb;
      const cr = lerp(gray, pr, 0.75) * 1.08;
      const cg = lerp(gray, pg, 0.75) * 1.05;
      const cb = lerp(gray, pb, 0.75) * 1.02;

      const x0 = pt.x - kr;
      const y0 = pt.y - kr;

      for (let ky = 0; ky < ks; ky++) {
        const py = y0 + ky;
        if (py < 0 || py >= h) continue;
        for (let kx = 0; kx < ks; kx++) {
          const px = x0 + kx;
          if (px < 0 || px >= w) continue;
          const weight = kd[ky * ks + kx] * intensity;
          if (weight < 0.01) continue;
          const ai = (py * w + px) * 3;
          acc[ai] += cr * weight;
          acc[ai + 1] += cg * weight;
          acc[ai + 2] += cb * weight;
        }
      }
    }

    // Soften accum slightly with tiny box (optional — skip for speed)
    // Screen-blend accum onto data
    for (let i = 0; i < w * h; i++) {
      const ai = i * 3;
      const gr = acc[ai];
      const gg = acc[ai + 1];
      const gb = acc[ai + 2];
      if (gr + gg + gb < 0.01) continue;

      const pi = i * 4;
      const r = data[pi] / 255;
      const g = data[pi + 1] / 255;
      const b = data[pi + 2] / 255;

      // Screen + slight add
      const nr = 1 - (1 - r) * (1 - clamp(gr, 0, 1.2) * 0.9);
      const ng = 1 - (1 - g) * (1 - clamp(gg, 0, 1.2) * 0.9);
      const nb = 1 - (1 - b) * (1 - clamp(gb, 0, 1.2) * 0.9);

      // Only where CoC is meaningful (don't pollute subject)
      const c = clamp((coc[i] || 0) * strength, 0, 1);
      const mix = clamp(c * 1.1, 0, 1) * amount;

      data[pi] = clamp(lerp(data[pi], nr * 255, mix), 0, 255);
      data[pi + 1] = clamp(lerp(data[pi + 1], ng * 255, mix), 0, 255);
      data[pi + 2] = clamp(lerp(data[pi + 2], nb * 255, mix), 0, 255);
    }
  }

  /**
   * Default shape from focal recipe
   */
  function shapeFromRecipe(recipe) {
    if (recipe === 'anamo') return 'anamorphic';
    if (recipe === '85') return 'circle';
    if (recipe === '35') return 'hex'; // vintage wide often more polygonal
    return 'circle';
  }

  global.HermioneBokeh = {
    apply: apply,
    buildKernel: buildKernel,
    collectHighlights: collectHighlights,
    shapeFromRecipe: shapeFromRecipe,
    SHAPES: ['circle', 'hex', 'anamorphic']
  };
})(typeof window !== 'undefined' ? window : globalThis);
