/**
 * Hermiona processing engine — pure CPU ImageData pipeline
 * Exposes window.HermionaEngine
 */
(function (global) {
  'use strict';

  function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  // Cached static grain tile (tiled, non-flickering preview)
  let grainTile = null;
  const GRAIN_TILE = 256;

  function getGrainTile() {
    if (grainTile) return grainTile;
    grainTile = new Float32Array(GRAIN_TILE * GRAIN_TILE);
    for (let i = 0; i < grainTile.length; i++) {
      // Approx gaussian-ish via 3 randoms
      const n = (Math.random() + Math.random() + Math.random()) / 3 - 0.5;
      grainTile[i] = n;
    }
    return grainTile;
  }

  function applyClarity(data, w, h, amount) {
    const strength = amount * 0.4;
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      const mid = 1 - Math.abs(luma / 255 - 0.5) * 2;
      const factor = 1 + strength * mid;
      data[i] = clamp((r - 128) * factor + 128, 0, 255);
      data[i + 1] = clamp((g - 128) * factor + 128, 0, 255);
      data[i + 2] = clamp((b - 128) * factor + 128, 0, 255);
    }
  }

  function applySharpen(data, w, h, amount) {
    const copy = new Uint8ClampedArray(data);
    const k = amount * 0.6;
    const center = 1 + 4 * k;
    const edge = -k;

    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const i = (y * w + x) * 4;
        for (let c = 0; c < 3; c++) {
          const val =
            copy[i + c] * center +
            copy[((y - 1) * w + x) * 4 + c] * edge +
            copy[((y + 1) * w + x) * 4 + c] * edge +
            copy[(y * w + (x - 1)) * 4 + c] * edge +
            copy[(y * w + (x + 1)) * 4 + c] * edge;
          data[i + c] = clamp(val, 0, 255);
        }
      }
    }
  }

  function applyVignette(data, w, h, amount) {
    const cx = w / 2;
    const cy = h / 2;
    const maxDist = Math.sqrt(cx * cx + cy * cy);
    const strength = amount * 1.4;

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const dx = x - cx;
        const dy = y - cy;
        const dist = Math.sqrt(dx * dx + dy * dy) / maxDist;
        const factor = 1 - Math.pow(dist, 1.8) * strength;
        const i = (y * w + x) * 4;
        data[i] = clamp(data[i] * factor, 0, 255);
        data[i + 1] = clamp(data[i + 1] * factor, 0, 255);
        data[i + 2] = clamp(data[i + 2] * factor, 0, 255);
      }
    }
  }

  /**
   * @param {Uint8ClampedArray} data
   * @param {number} w
   * @param {number} h
   * @param {number} amount 0..1
   * @param {'static'|'random'} mode
   */
  function applyGrain(data, w, h, amount, mode) {
    const REF = 1600;
    const longEdge = Math.max(w, h) || REF;
    const resScale = Math.max(0.5, longEdge / REF);
    const strength = amount * 28 * Math.sqrt(REF / longEdge);
    const sampleScale = 1 / resScale;

    if (mode === 'random') {
      for (let i = 0; i < data.length; i += 4) {
        const noise = (Math.random() - 0.5) * strength;
        data[i] = clamp(data[i] + noise, 0, 255);
        data[i + 1] = clamp(data[i + 1] + noise, 0, 255);
        data[i + 2] = clamp(data[i + 2] + noise, 0, 255);
      }
      return;
    }

    // Static tiled grain — resolution-compensated sample rate
    const tile = getGrainTile();
    let px = 0;
    for (let y = 0; y < h; y++) {
      const ty = Math.floor(y * sampleScale) % GRAIN_TILE;
      const tyN = ty < 0 ? ty + GRAIN_TILE : ty;
      for (let x = 0; x < w; x++) {
        const tx = Math.floor(x * sampleScale) % GRAIN_TILE;
        const txN = tx < 0 ? tx + GRAIN_TILE : tx;
        const noise = tile[tyN * GRAIN_TILE + txN] * strength;
        data[px] = clamp(data[px] + noise, 0, 255);
        data[px + 1] = clamp(data[px + 1] + noise, 0, 255);
        data[px + 2] = clamp(data[px + 2] + noise, 0, 255);
        px += 4;
      }
    }
  }

  /**
   * Process source ImageData with adjustment params.
   * @param {ImageData} srcImageData
   * @param {object} params — light/color/effects
   * @param {object} [options]
   * @param {boolean} [options.grain=false] — apply grain pass
   * @param {'static'|'random'} [options.grainMode='static']
   * @returns {ImageData|null}
   */
  function process(srcImageData, params, options) {
    if (!srcImageData) return null;
    options = options || {};

    const w = srcImageData.width;
    const h = srcImageData.height;
    const data = new Uint8ClampedArray(srcImageData.data);
    const p = params || {};

    const exp = Math.pow(2, p.exposure || 0);
    const contrast = ((p.contrast || 0) + 100) / 100;
    const sat = ((p.saturation || 0) + 100) / 100;
    const vib = (p.vibrance || 0) / 100;
    const temp = (p.temperature || 0) / 100;
    const tintVal = (p.tint || 0) / 100;
    const hi = (p.highlights || 0) / 100;
    const sh = (p.shadows || 0) / 100;
    const wh = (p.whites || 0) / 100;
    const bl = (p.blacks || 0) / 100;
    const clarity = (p.clarity || 0) / 100;
    const sharpen = (p.sharpen || 0) / 100;
    const vignette = (p.vignette || 0) / 100;
    const grainAmt = (p.grain || 0) / 100;

    for (let i = 0; i < data.length; i += 4) {
      let r = data[i] / 255;
      let g = data[i + 1] / 255;
      let b = data[i + 2] / 255;

      r *= exp;
      g *= exp;
      b *= exp;

      r = (r - 0.5) * contrast + 0.5;
      g = (g - 0.5) * contrast + 0.5;
      b = (b - 0.5) * contrast + 0.5;

      const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;

      if (sh !== 0 && luma < 0.5) {
        const amount = sh * (1 - luma * 2);
        r += amount * 0.35;
        g += amount * 0.35;
        b += amount * 0.35;
      }

      if (hi !== 0 && luma > 0.5) {
        const amount = hi * ((luma - 0.5) * 2);
        r -= amount * 0.25;
        g -= amount * 0.25;
        b -= amount * 0.25;
      }

      if (wh !== 0) {
        const t = Math.max(0, (luma - 0.7) / 0.3);
        r = lerp(r, r + wh * 0.3, t);
        g = lerp(g, g + wh * 0.3, t);
        b = lerp(b, b + wh * 0.3, t);
      }
      if (bl !== 0) {
        const t = Math.max(0, (0.3 - luma) / 0.3);
        r = lerp(r, r + bl * 0.25, t);
        g = lerp(g, g + bl * 0.25, t);
        b = lerp(b, b + bl * 0.25, t);
      }

      if (temp !== 0) {
        r += temp * 0.15;
        b -= temp * 0.15;
      }
      if (tintVal !== 0) {
        g += tintVal * 0.12;
        r -= tintVal * 0.04;
        b -= tintVal * 0.04;
      }

      if (sat !== 1) {
        const gray = 0.2126 * r + 0.7152 * g + 0.0722 * b;
        r = gray + (r - gray) * sat;
        g = gray + (g - gray) * sat;
        b = gray + (b - gray) * sat;
      }

      if (vib !== 0) {
        const maxc = Math.max(r, g, b);
        const minc = Math.min(r, g, b);
        const satLevel = maxc === 0 ? 0 : (maxc - minc) / maxc;
        const amount = vib * (1 - satLevel);
        const gray = 0.2126 * r + 0.7152 * g + 0.0722 * b;
        r = gray + (r - gray) * (1 + amount);
        g = gray + (g - gray) * (1 + amount);
        b = gray + (b - gray) * (1 + amount);
      }

      data[i] = clamp(r * 255, 0, 255);
      data[i + 1] = clamp(g * 255, 0, 255);
      data[i + 2] = clamp(b * 255, 0, 255);
    }

    // options.fast — ultra-smooth scrub: skip spatial filters / DoF / grain
    const fast = !!options.fast;

    if (!fast && clarity !== 0) applyClarity(data, w, h, clarity);
    if (!fast && sharpen > 0) applySharpen(data, w, h, sharpen);

    const Looks = global.HermionaLooks;
    const DoF = global.HermionaDoF;
    const CoC = global.HermionaCoC;
    const optics = options.optics;
    const scene = options.scene;
    const quality = fast ? 'preview' : options.quality || 'preview';

    // I5b: build shared CoC once for lens CA/bloom + DoF whenever scene exists
    let cocBuilt = null;
    if (!fast && optics && scene && scene.depthMap && CoC) {
      const focus =
        optics.focusDepth != null ? optics.focusDepth : scene.focusDepth;
      // CoC shape from aperture + focus + focal recipe (DoF strength applied later)
      cocBuilt = CoC.buildCoCMap(w, h, {
        depthMap: scene.depthMap,
        personMask: scene.personMask,
        mapW: scene.width,
        mapH: scene.height,
        focusDepth: focus,
        apertureStrength:
          optics.apertureStrength != null ? optics.apertureStrength : 0.55,
        strength: 1,
        focalRecipe: optics.focalRecipe || '50'
      });
    }

    const cocMap = cocBuilt ? cocBuilt.coc : null;

    // Film + camera + imperfections + lens
    if (Looks && options.look) {
      Looks.applyLooks(
        data,
        w,
        h,
        options.look,
        options.grainMode || 'static',
        quality,
        fast ? null : cocMap,
        { fast: fast }
      );
    }

    // I5e: selective skin soft + subject punch (after film, before DoF)
    const Selective = global.HermionaSelective;
    if (
      !fast &&
      Selective &&
      scene &&
      optics &&
      ((optics.skinSoft || 0) > 0.01 || (optics.subjectPunch || 0) > 0.01)
    ) {
      Selective.apply(data, w, h, scene, {
        skinSoft: optics.skinSoft || 0,
        subjectPunch: optics.subjectPunch || 0
      });
    }

    // Portrait DoF blur (same CoC)
    if (
      !fast &&
      DoF &&
      optics &&
      optics.enabled &&
      scene &&
      scene.depthMap &&
      (optics.strength == null ? 0 : optics.strength) > 0.01
    ) {
      DoF.apply(data, w, h, {
        coc: cocMap,
        depthMap: scene.depthMap,
        personMask: scene.personMask,
        mapW: scene.width,
        mapH: scene.height,
        focusDepth:
          optics.focusDepth != null ? optics.focusDepth : scene.focusDepth,
        strength: optics.strength,
        apertureStrength: optics.apertureStrength,
        focalRecipe: optics.focalRecipe || '50',
        maxBlurScale: cocBuilt ? cocBuilt.maxBlurScale : 1,
        quality: quality,
        bokehAmount: optics.bokehAmount != null ? optics.bokehAmount : 0.55,
        bokehShape: optics.bokehShape || 'auto'
      });
    }

    // Debug overlays
    if (!fast && DoF && options.debugScene && scene) {
      const mode = options.debugScene; // depth | mask | coc
      if (mode === 'mask' && scene.personMask) {
        DoF.paintDebug(
          data,
          w,
          h,
          scene.personMask,
          scene.width,
          scene.height,
          'mask'
        );
      } else if (mode === 'depth' && scene.depthMap) {
        DoF.paintDebug(
          data,
          w,
          h,
          scene.depthMap,
          scene.width,
          scene.height,
          'depth'
        );
      } else if (mode === 'coc' && cocMap && DoF.paintCoCDebug) {
        DoF.paintCoCDebug(data, w, h, cocMap);
      }
    }

    if (vignette > 0) applyVignette(data, w, h, vignette);

    if (!fast && options.grain && grainAmt > 0) {
      applyGrain(data, w, h, grainAmt, options.grainMode || 'static');
    }

    return new ImageData(data, w, h);
  }

  /** Scale canvas so longest edge === longEdge. Never upscales. 1:1 uses no smoothing. */
  function scaleCanvasToLongEdge(srcCanvas, longEdge) {
    const w = srcCanvas.width;
    const h = srcCanvas.height;
    const current = Math.max(w, h);

    // Copy as-is when no target, invalid target, or already within budget
    if (!longEdge || longEdge <= 0 || current <= longEdge) {
      const copy = document.createElement('canvas');
      copy.width = w;
      copy.height = h;
      const cctx = copy.getContext('2d');
      cctx.imageSmoothingEnabled = false;
      cctx.drawImage(srcCanvas, 0, 0);
      return copy;
    }

    const scale = longEdge / current;
    const nw = Math.max(1, Math.round(w * scale));
    const nh = Math.max(1, Math.round(h * scale));
    const out = document.createElement('canvas');
    out.width = nw;
    out.height = nh;
    const octx = out.getContext('2d');
    octx.imageSmoothingEnabled = true;
    octx.imageSmoothingQuality = 'high';
    octx.drawImage(srcCanvas, 0, 0, nw, nh);
    return out;
  }

  function imageToCanvas(img, maxLongEdge) {
    const nw = img.naturalWidth || img.width;
    const nh = img.naturalHeight || img.height;
    let w = nw;
    let h = nh;
    const srcLong = Math.max(nw, nh);
    const needsDownscale = maxLongEdge && maxLongEdge > 0 && srcLong > maxLongEdge;

    if (needsDownscale) {
      const s = maxLongEdge / srcLong;
      w = Math.max(1, Math.round(nw * s));
      h = Math.max(1, Math.round(nh * s));
    }

    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const ctx = c.getContext('2d');
    // 1:1 copy — no smoothing (preserves original sharpness)
    // Downscale — high-quality filter
    if (needsDownscale) {
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
    } else {
      ctx.imageSmoothingEnabled = false;
    }
    ctx.drawImage(img, 0, 0, w, h);
    return c;
  }

  function coverScaleForRotation(w, h, angleRad) {
    const c = Math.abs(Math.cos(angleRad));
    const s = Math.abs(Math.sin(angleRad));
    return Math.max(w / (w * c + h * s), h / (w * s + h * c));
  }

  function rotateCoverCanvas(srcCanvas, deg) {
    const w = srcCanvas.width;
    const h = srcCanvas.height;
    if (!deg) {
      const copy = document.createElement('canvas');
      copy.width = w;
      copy.height = h;
      copy.getContext('2d').drawImage(srcCanvas, 0, 0);
      return copy;
    }

    const angle = (deg * Math.PI) / 180;
    const scale = coverScaleForRotation(w, h, angle);
    const out = document.createElement('canvas');
    out.width = w;
    out.height = h;
    const octx = out.getContext('2d');
    octx.fillStyle = '#0c0c0e';
    octx.fillRect(0, 0, w, h);
    octx.translate(w / 2, h / 2);
    octx.rotate(angle);
    octx.scale(scale, scale);
    octx.drawImage(srcCanvas, -w / 2, -h / 2);
    return out;
  }

  function rotate90Canvas(srcCanvas, deg) {
    const w = srcCanvas.width;
    const h = srcCanvas.height;
    const dest = document.createElement('canvas');
    if (Math.abs(deg) === 90 || Math.abs(deg) === 270) {
      dest.width = h;
      dest.height = w;
    } else {
      dest.width = w;
      dest.height = h;
    }
    const dctx = dest.getContext('2d');
    dctx.translate(dest.width / 2, dest.height / 2);
    dctx.rotate((deg * Math.PI) / 180);
    dctx.drawImage(srcCanvas, -w / 2, -h / 2);
    return dest;
  }

  function flipCanvas(srcCanvas, horizontal, vertical) {
    const dest = document.createElement('canvas');
    dest.width = srcCanvas.width;
    dest.height = srcCanvas.height;
    const dctx = dest.getContext('2d');
    dctx.translate(horizontal ? dest.width : 0, vertical ? dest.height : 0);
    dctx.scale(horizontal ? -1 : 1, vertical ? -1 : 1);
    dctx.drawImage(srcCanvas, 0, 0);
    return dest;
  }

  function cropCanvas(srcCanvas, x, y, w, h) {
    // x,y,w,h normalized 0..1
    const sw = srcCanvas.width;
    const sh = srcCanvas.height;
    let sx = Math.round(x * sw);
    let sy = Math.round(y * sh);
    let cw = Math.round(w * sw);
    let ch = Math.round(h * sh);
    sx = clamp(sx, 0, sw - 1);
    sy = clamp(sy, 0, sh - 1);
    cw = Math.min(Math.max(1, cw), sw - sx);
    ch = Math.min(Math.max(1, ch), sh - sy);

    const dest = document.createElement('canvas');
    dest.width = cw;
    dest.height = ch;
    dest.getContext('2d').drawImage(srcCanvas, sx, sy, cw, ch, 0, 0, cw, ch);
    return dest;
  }

  /**
   * Rebuild geometry from original image + op stack.
   * @param {HTMLImageElement} originalImage
   * @param {Array} ops
   * @param {number} [maxLongEdge] — cap during rebuild (memory safety)
   */
  function rebuildGeometry(originalImage, ops, maxLongEdge) {
    if (!originalImage) return null;
    let c = imageToCanvas(originalImage, maxLongEdge || 0);
    const list = ops || [];
    for (let i = 0; i < list.length; i++) {
      const op = list[i];
      if (op.type === 'rotate') {
        c = rotate90Canvas(c, op.deg);
      } else if (op.type === 'flip') {
        c = flipCanvas(c, !!op.h, !!op.v);
      } else if (op.type === 'straighten') {
        c = rotateCoverCanvas(c, op.deg);
      } else if (op.type === 'crop') {
        c = cropCanvas(c, op.x, op.y, op.w, op.h);
      }
    }
    return c;
  }

  global.HermionaEngine = {
    process,
    applyGrain,
    scaleCanvasToLongEdge,
    imageToCanvas,
    rotateCoverCanvas,
    rotate90Canvas,
    flipCanvas,
    cropCanvas,
    rebuildGeometry,
    coverScaleForRotation
  };
})(typeof window !== 'undefined' ? window : globalThis);
