/**
 * Portrait DoF — layered blur weighted by CoC / person mask
 * Exposes window.HermionaDoF
 */
(function (global) {
  'use strict';

  function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  /** Separable box blur of RGBA ImageData-like buffer → new Uint8ClampedArray */
  function boxBlurRGBA(src, w, h, radius) {
    const r = Math.max(1, radius | 0);
    const tmp = new Float32Array(w * h * 4);
    const out = new Uint8ClampedArray(src.length);

    // horizontal
    for (let y = 0; y < h; y++) {
      for (let c = 0; c < 3; c++) {
        for (let x = 0; x < w; x++) {
          let sum = 0;
          let count = 0;
          for (let k = -r; k <= r; k++) {
            const xx = clamp(x + k, 0, w - 1);
            sum += src[(y * w + xx) * 4 + c];
            count++;
          }
          tmp[(y * w + x) * 4 + c] = sum / count;
        }
      }
    }
    // vertical
    for (let y = 0; y < h; y++) {
      for (let c = 0; c < 3; c++) {
        for (let x = 0; x < w; x++) {
          let sum = 0;
          let count = 0;
          for (let k = -r; k <= r; k++) {
            const yy = clamp(y + k, 0, h - 1);
            sum += tmp[(yy * w + x) * 4 + c];
            count++;
          }
          out[(y * w + x) * 4 + c] = clamp(sum / count, 0, 255);
        }
      }
      for (let x = 0; x < w; x++) {
        out[(y * w + x) * 4 + 3] = src[(y * w + x) * 4 + 3];
      }
    }
    return out;
  }

  /**
   * Half-res blur then upsample (faster, softer)
   */
  function softBlur(src, w, h, radius) {
    if (radius < 1) return new Uint8ClampedArray(src);

    const hw = Math.max(1, (w / 2) | 0);
    const hh = Math.max(1, (h / 2) | 0);
    const small = new Uint8ClampedArray(hw * hh * 4);

    // downsample
    for (let y = 0; y < hh; y++) {
      for (let x = 0; x < hw; x++) {
        const sx = Math.min(w - 1, x * 2);
        const sy = Math.min(h - 1, y * 2);
        const si = (sy * w + sx) * 4;
        const di = (y * hw + x) * 4;
        small[di] = src[si];
        small[di + 1] = src[si + 1];
        small[di + 2] = src[si + 2];
        small[di + 3] = 255;
      }
    }

    const rSmall = Math.max(1, Math.round(radius * 0.55));
    const blurredSmall = boxBlurRGBA(small, hw, hh, rSmall);
    // second pass for smoother bokeh-ish
    const blurredSmall2 = boxBlurRGBA(blurredSmall, hw, hh, Math.max(1, (rSmall / 2) | 0));

    // upsample bilinear
    const out = new Uint8ClampedArray(src.length);
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
            blurredSmall2[(y0 * hw + x0) * 4 + c] * (1 - tx) +
            blurredSmall2[(y0 * hw + x1) * 4 + c] * tx;
          const b =
            blurredSmall2[(y1 * hw + x0) * 4 + c] * (1 - tx) +
            blurredSmall2[(y1 * hw + x1) * 4 + c] * tx;
          out[i + c] = a * (1 - ty) + b * ty;
        }
        out[i + 3] = 255;
      }
    }
    return out;
  }

  /**
   * Apply portrait DoF in-place on RGBA buffer.
   *
   * @param {Uint8ClampedArray} data
   * @param {number} w
   * @param {number} h
   * @param {object} opts
   * @param {Float32Array} [opts.coc] — prebuilt CoC (preferred, I5b)
   * @param {Float32Array} [opts.depthMap]
   * @param {Float32Array} [opts.personMask]
   * @param {number} [opts.mapW] [opts.mapH]
   * @param {number} [opts.focusDepth]
   * @param {number} opts.strength 0..1
   * @param {number} [opts.apertureStrength]
   * @param {string} [opts.focalRecipe]
   * @param {number} [opts.maxBlurScale=1]
   * @param {'preview'|'export'} [opts.quality]
   */
  function apply(data, w, h, opts) {
    if (!opts || (opts.strength != null && opts.strength <= 0.01)) return;

    const strength = clamp(opts.strength != null ? opts.strength : 1, 0, 1);
    const aperture = clamp(
      opts.apertureStrength != null ? opts.apertureStrength : strength,
      0,
      1
    );

    // Prefer shared CoC from HermionaCoC
    let coc = opts.coc || null;
    let maxBlurScale = opts.maxBlurScale || 1;

    if (!coc) {
      if (!opts.depthMap) return;
      const CoC = global.HermionaCoC;
      if (CoC) {
        const built = CoC.buildCoCMap(w, h, {
          depthMap: opts.depthMap,
          personMask: opts.personMask,
          mapW: opts.mapW || w,
          mapH: opts.mapH || h,
          focusDepth: opts.focusDepth,
          apertureStrength: aperture,
          strength: strength,
          focalRecipe: opts.focalRecipe || '50'
        });
        coc = built.coc;
        maxBlurScale = built.maxBlurScale || 1;
      } else {
        return;
      }
    }

    // Max blur radius scales with image size, strength, aperture, focal recipe
    const baseMax = opts.quality === 'export' ? 30 : 18;
    const maxR = Math.max(
      2,
      Math.round(
        (Math.min(w, h) / 900) *
          baseMax *
          strength *
          (0.45 + 0.55 * aperture) *
          maxBlurScale
      )
    );

    // Snapshot pre-blur for bokeh highlight colors (specular peaks)
    const Bokeh = global.HermionaBokeh;
    const bokehAmt = clamp(opts.bokehAmount != null ? opts.bokehAmount : 0, 0, 1);
    const wantBokeh = Bokeh && bokehAmt > 0.02 && strength > 0.08;
    const srcForBokeh = wantBokeh ? new Uint8ClampedArray(data) : null;

    const anamoBlur =
      (opts.focalRecipe === 'anamo' || opts.bokehShape === 'anamorphic') && maxR >= 4;

    // G3 — WebGL dual-level blur + CoC mix (bokeh stamps stay CPU)
    let usedGpu = false;
    const GpuDoF = global.HermionaGpuDoF;
    const Perf = global.HermionaPerf;
    if (GpuDoF && !opts.forceCpu && typeof GpuDoF.apply === 'function') {
      const perfGpu = Perf && Perf.isEnabled() ? Perf.start('dof:gpu') : null;
      usedGpu = GpuDoF.apply(data, w, h, coc, {
        strength: strength,
        maxR: maxR,
        anamo: anamoBlur
      });
      if (perfGpu) perfGpu.end({ ok: usedGpu ? 1 : 0 });
    }

    if (!usedGpu) {
      // CPU fallback — two blur layers
      const r1 = Math.max(1, Math.round(maxR * 0.35));
      const r2 = Math.max(2, maxR);
      const blur1 = softBlur(data, w, h, r1);
      const blur2 = softBlur(data, w, h, r2);

      for (let i = 0; i < w * h; i++) {
        const c = clamp((coc[i] || 0) * strength, 0, 1);
        const pi = i * 4;
        if (c < 0.02) continue;

        if (c < 0.45) {
          const t = c / 0.45;
          data[pi] = lerp(data[pi], blur1[pi], t);
          data[pi + 1] = lerp(data[pi + 1], blur1[pi + 1], t);
          data[pi + 2] = lerp(data[pi + 2], blur1[pi + 2], t);
        } else {
          const t = (c - 0.45) / 0.55;
          data[pi] = lerp(blur1[pi], blur2[pi], t);
          data[pi + 1] = lerp(blur1[pi + 1], blur2[pi + 1], t);
          data[pi + 2] = lerp(blur1[pi + 2], blur2[pi + 2], t);
        }
      }
    }

    // I5c — specular bokeh orbs (CPU; works on GPU or CPU base)
    if (wantBokeh) {
      let shape = opts.bokehShape || 'circle';
      if (shape === 'auto' && Bokeh.shapeFromRecipe) {
        shape = Bokeh.shapeFromRecipe(opts.focalRecipe || '50');
      }
      Bokeh.apply(data, srcForBokeh, coc, w, h, {
        amount: bokehAmt,
        dofStrength: strength,
        shape: shape,
        quality: opts.quality || 'preview',
        maxRadius: Math.max(
          6,
          Math.round(maxR * (opts.quality === 'export' ? 1.15 : 0.95))
        )
      });
    }
  }

  /**
   * Debug paint CoC map (cyan = out of focus)
   */
  function paintCoCDebug(data, w, h, coc) {
    if (!coc) return;
    for (let i = 0; i < w * h; i++) {
      const c = coc[i];
      const pi = i * 4;
      data[pi] = data[pi] * 0.4;
      data[pi + 1] = clamp(data[pi + 1] * 0.4 + c * 200, 0, 255);
      data[pi + 2] = clamp(data[pi + 2] * 0.4 + c * 220, 0, 255);
    }
  }

  /**
   * Debug visualize depth or mask as RGB into data (copy source first outside)
   */
  function paintDebug(data, w, h, map, mapW, mapH, mode) {
    const Pseudo = global.HermionaDepthPseudo;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        let v;
        if (mapW === w && mapH === h) {
          v = map[y * w + x];
        } else if (Pseudo) {
          v = Pseudo.sampleMap(
            map,
            mapW,
            mapH,
            ((x + 0.5) * mapW) / w - 0.5,
            ((y + 0.5) * mapH) / h - 0.5
          );
        } else v = 0;
        const i = (y * w + x) * 4;
        if (mode === 'mask') {
          // subject green overlay
          data[i] = data[i] * 0.45;
          data[i + 1] = clamp(data[i + 1] * 0.45 + v * 180, 0, 255);
          data[i + 2] = data[i + 2] * 0.45;
        } else {
          // depth: near=warm, far=cool
          const n = clamp(v, 0, 1);
          data[i] = lerp(data[i] * 0.3, (1 - n) * 255, 0.85);
          data[i + 1] = lerp(data[i + 1] * 0.3, 128, 0.5);
          data[i + 2] = lerp(data[i + 2] * 0.3, n * 255, 0.85);
        }
      }
    }
  }

  global.HermionaDoF = {
    apply,
    softBlur,
    paintDebug,
    paintCoCDebug
  };
})(typeof window !== 'undefined' ? window : globalThis);
