/**
 * Hermiona — live histogram + clipping stats
 * Exposes window.HermionaHistogram
 *
 * Pure / reusable. No DOM deps except draw(canvas, …) and clippingOverlay.
 *
 * App wiring (do not auto-hook — call from app.js when ready):
 *   const h = HermionaHistogram.compute(imageData);
 *   HermionaHistogram.draw(canvas, h, { mode: 'rgb' });
 *   // clip % → #histoClipLow / #histoClipHigh
 *   // optional: HermionaHistogram.clippingOverlay(imageData)
 */
(function (global) {
  'use strict';

  var DEFAULT_BINS = 64;
  var DEFAULT_MAX_SIDE = 256;
  var CLIP_LOW = 2;
  var CLIP_HIGH = 253;

  function isImageData(v) {
    return v && typeof v === 'object' && v.data && typeof v.width === 'number';
  }

  /**
   * Map 0..255 channel value into bin index 0..bins-1.
   */
  function toBin(value, bins) {
    var b = (value * bins) / 256;
    b = b | 0;
    if (b < 0) return 0;
    if (b >= bins) return bins - 1;
    return b;
  }

  /**
   * @param {ImageData|Uint8ClampedArray} data
   * @param {number} [w]
   * @param {number} [h]
   * @param {{ bins?: number, maxSide?: number }} [opts]
   * @returns {{
   *   bins: number,
   *   luma: Uint32Array,
   *   r: Uint32Array, g: Uint32Array, b: Uint32Array,
   *   clipLow: number,
   *   clipHigh: number,
   *   meanLuma: number,
   *   pixels: number
   * }}
   */
  function compute(imageDataOrArray, w, h, opts) {
    var pixels;
    var width;
    var height;

    if (isImageData(imageDataOrArray)) {
      pixels = imageDataOrArray.data;
      width = imageDataOrArray.width;
      height = imageDataOrArray.height;
    } else {
      pixels = imageDataOrArray;
      width = w | 0;
      height = h | 0;
    }

    opts = opts || {};
    var bins = opts.bins != null ? opts.bins | 0 : DEFAULT_BINS;
    if (bins < 2) bins = 2;
    if (bins > 256) bins = 256;

    var maxSide = opts.maxSide != null ? opts.maxSide : DEFAULT_MAX_SIDE;
    if (maxSide == null || maxSide <= 0) maxSide = 0;

    var lumaH = new Uint32Array(bins);
    var rH = new Uint32Array(bins);
    var gH = new Uint32Array(bins);
    var bH = new Uint32Array(bins);

    var clipLowN = 0;
    var clipHighN = 0;
    var sumLuma = 0;
    var count = 0;

    if (!pixels || width <= 0 || height <= 0) {
      return {
        bins: bins,
        luma: lumaH,
        r: rH,
        g: gH,
        b: bH,
        clipLow: 0,
        clipHigh: 0,
        meanLuma: 0,
        pixels: 0
      };
    }

    var step = 1;
    if (maxSide > 0) {
      var longEdge = width > height ? width : height;
      if (longEdge > maxSide) {
        step = Math.ceil(longEdge / maxSide);
        if (step < 1) step = 1;
      }
    }

    var y;
    var x;
    var i;
    var r;
    var g;
    var b;
    var L;
    var rowStride = width << 2;

    for (y = 0; y < height; y += step) {
      for (x = 0; x < width; x += step) {
        i = y * rowStride + (x << 2);
        r = pixels[i];
        g = pixels[i + 1];
        b = pixels[i + 2];
        // Rec. 709 luma
        L = 0.2126 * r + 0.7152 * g + 0.0722 * b;

        lumaH[toBin(L, bins)]++;
        rH[toBin(r, bins)]++;
        gH[toBin(g, bins)]++;
        bH[toBin(b, bins)]++;

        if (L <= CLIP_LOW) clipLowN++;
        if (L >= CLIP_HIGH) clipHighN++;
        sumLuma += L;
        count++;
      }
    }

    return {
      bins: bins,
      luma: lumaH,
      r: rH,
      g: gH,
      b: bH,
      clipLow: count ? clipLowN / count : 0,
      clipHigh: count ? clipHighN / count : 0,
      meanLuma: count ? sumLuma / count : 0,
      pixels: count
    };
  }

  /**
   * Peak count across one or more bin arrays (for scaling bars).
   */
  function peakOf() {
    var max = 1;
    var a;
    var i;
    var j;
    for (i = 0; i < arguments.length; i++) {
      a = arguments[i];
      if (!a) continue;
      for (j = 0; j < a.length; j++) {
        if (a[j] > max) max = a[j];
      }
    }
    return max;
  }

  /**
   * Draw histogram into a canvas (clears canvas).
   * @param {HTMLCanvasElement} canvas
   * @param {object} hist — from compute
   * @param {{ mode?: 'luma'|'rgb', fill?: string, bg?: string }} [style]
   */
  function draw(canvas, hist, style) {
    if (!canvas || !hist) return;
    var ctx = canvas.getContext('2d');
    if (!ctx) return;

    style = style || {};
    var mode = style.mode === 'rgb' ? 'rgb' : 'luma';
    var bg = style.bg != null ? style.bg : 'rgba(0,0,0,0)';
    var fill = style.fill != null ? style.fill : 'rgba(245,245,242,0.85)';
    var w = canvas.width;
    var h = canvas.height;
    var bins = hist.bins | 0;
    if (bins < 1) return;

    ctx.clearRect(0, 0, w, h);
    if (bg && bg !== 'transparent') {
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);
    }

    var barW = w / bins;
    var peak;
    var i;
    var bh;

    if (mode === 'rgb') {
      peak = peakOf(hist.r, hist.g, hist.b);
      ctx.globalCompositeOperation = 'lighter';

      ctx.fillStyle = 'rgba(255, 70, 70, 0.72)';
      for (i = 0; i < bins; i++) {
        bh = ((hist.r[i] || 0) / peak) * h;
        if (bh > 0) ctx.fillRect(i * barW, h - bh, Math.max(barW, 1), bh);
      }

      ctx.fillStyle = 'rgba(80, 220, 100, 0.72)';
      for (i = 0; i < bins; i++) {
        bh = ((hist.g[i] || 0) / peak) * h;
        if (bh > 0) ctx.fillRect(i * barW, h - bh, Math.max(barW, 1), bh);
      }

      ctx.fillStyle = 'rgba(70, 140, 255, 0.72)';
      for (i = 0; i < bins; i++) {
        bh = ((hist.b[i] || 0) / peak) * h;
        if (bh > 0) ctx.fillRect(i * barW, h - bh, Math.max(barW, 1), bh);
      }

      ctx.globalCompositeOperation = 'source-over';
    } else {
      peak = peakOf(hist.luma);
      ctx.fillStyle = fill;
      for (i = 0; i < bins; i++) {
        bh = ((hist.luma[i] || 0) / peak) * h;
        if (bh > 0) ctx.fillRect(i * barW, h - bh, Math.max(barW, 1), bh);
      }
    }
  }

  /**
   * Build a simple clipping overlay mask ImageData (same size as source) —
   * red = high clip, blue = low clip, alpha based on strength.
   * @param {ImageData} sourceImageData
   * @param {{ low?: number, high?: number, alpha?: number }} [opts]
   * @returns {ImageData|null}
   */
  function clippingOverlay(sourceImageData, opts) {
    if (!isImageData(sourceImageData)) return null;

    opts = opts || {};
    var low = opts.low != null ? opts.low : CLIP_LOW;
    var high = opts.high != null ? opts.high : CLIP_HIGH;
    var baseAlpha = opts.alpha != null ? opts.alpha : 180;
    if (baseAlpha < 0) baseAlpha = 0;
    if (baseAlpha > 255) baseAlpha = 255;

    var w = sourceImageData.width;
    var h = sourceImageData.height;
    var src = sourceImageData.data;
    var out;
    var i;
    var r;
    var g;
    var b;
    var L;
    var strength;
    var a;
    var len = src.length;

    // Prefer ImageData constructor when available
    try {
      out = new ImageData(w, h);
    } catch (e) {
      var c = document.createElement('canvas');
      c.width = w;
      c.height = h;
      out = c.getContext('2d').createImageData(w, h);
    }

    var dst = out.data;

    for (i = 0; i < len; i += 4) {
      r = src[i];
      g = src[i + 1];
      b = src[i + 2];
      L = 0.2126 * r + 0.7152 * g + 0.0722 * b;

      if (L <= low) {
        // Blue = shadow clip; stronger as L → 0
        strength = low > 0 ? 1 - L / low : 1;
        if (strength < 0) strength = 0;
        if (strength > 1) strength = 1;
        a = (baseAlpha * strength) | 0;
        dst[i] = 40;
        dst[i + 1] = 120;
        dst[i + 2] = 255;
        dst[i + 3] = a;
      } else if (L >= high) {
        // Red = highlight clip; stronger as L → 255
        strength = high < 255 ? (L - high) / (255 - high) : 1;
        if (strength < 0) strength = 0;
        if (strength > 1) strength = 1;
        a = (baseAlpha * strength) | 0;
        dst[i] = 255;
        dst[i + 1] = 50;
        dst[i + 2] = 50;
        dst[i + 3] = a;
      } else {
        dst[i] = 0;
        dst[i + 1] = 0;
        dst[i + 2] = 0;
        dst[i + 3] = 0;
      }
    }

    return out;
  }

  /**
   * Format clip fraction as display string e.g. "2.4%".
   */
  function formatClip(fraction) {
    if (!fraction || fraction <= 0) return '0%';
    var pct = fraction * 100;
    if (pct < 0.1) return '<0.1%';
    if (pct < 10) return pct.toFixed(1) + '%';
    return Math.round(pct) + '%';
  }

  global.HermionaHistogram = {
    compute: compute,
    draw: draw,
    clippingOverlay: clippingOverlay,
    formatClip: formatClip,
    DEFAULT_BINS: DEFAULT_BINS,
    DEFAULT_MAX_SIDE: DEFAULT_MAX_SIDE
  };
})(typeof window !== 'undefined' ? window : globalThis);
