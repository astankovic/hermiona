/**
 * Hermiona export — full-res reprocess + long-edge resize
 * Exposes window.HermionaExport
 *
 * Quality rules:
 * - "full" = natural pixel size after geometry (hard cap only for memory)
 * - Process looks at final pixel size (no process-then-upscale)
 * - For 1080/2048: rebuild geometry near target, process once (no upscale)
 * - Prefer high-quality resampling only when downscaling
 */
(function (global) {
  'use strict';

  /** Absolute safety cap (browser memory). Above this we must downscale. */
  const HARD_MAX_LONG_EDGE = 8192;
  /** Soft label for UI; full uses natural size up to HARD_MAX */
  const MAX_EXPORT_LONG_EDGE = HARD_MAX_LONG_EDGE;

  /**
   * @typedef {object} ExportOptions
   * @property {'working'|'1080'|'2048'|'full'} size
   * @property {'jpeg'|'png'} format
   * @property {number} quality — 0..1 for jpeg
   * @property {ImageData|null} workingData
   * @property {HTMLCanvasElement|null} workingCanvas
   * @property {HTMLImageElement|null} originalImage
   * @property {Array} ops
   * @property {object} params
   * @property {object} [look]
   * @property {number} maxWorkingSize
   */

  function originalLongEdge(img) {
    if (!img) return 0;
    return Math.max(img.naturalWidth || img.width || 0, img.naturalHeight || img.height || 0);
  }

  /**
   * Target long edge in pixels, or 0 for "use rebuilt as-is".
   */
  function resolveTargetLong(size, originalImage, workingCanvas) {
    const workLong = workingCanvas
      ? Math.max(workingCanvas.width, workingCanvas.height)
      : 1600;
    const origLong = originalLongEdge(originalImage) || workLong;

    if (size === 'working') return workLong;
    if (size === '1080') return 1080;
    if (size === '2048') return 2048;
    // full = native, only hard-capped
    return Math.min(origLong, HARD_MAX_LONG_EDGE);
  }

  /**
   * How large should geometry rebuild be before optional final downscale?
   * Prefer rebuild at (or slightly above) final target so we never upscale after process.
   */
  function resolveRebuildCap(size, targetLong, originalImage) {
    const origLong = originalLongEdge(originalImage) || targetLong;
    if (size === 'full') {
      return Math.min(origLong, HARD_MAX_LONG_EDGE);
    }
    // For fixed sizes: rebuild at min(original, max(target, target*1)) — exact target is fine
    // Use a bit of headroom only if original is larger, then downscale after process? 
    // Better: rebuild at min(orig, target) effectively by capping at targetLong
    // so process runs at export resolution (grain size matches output).
    return Math.min(origLong, Math.max(targetLong, 1), HARD_MAX_LONG_EDGE);
  }

  function canvasFromImageData(imageData) {
    const c = document.createElement('canvas');
    c.width = imageData.width;
    c.height = imageData.height;
    c.getContext('2d').putImageData(imageData, 0, 0);
    return c;
  }

  /**
   * Build export canvas (processed + sized).
   * @param {ExportOptions} opts
   */
  function buildExportCanvas(opts) {
    const Engine = global.HermionaEngine;
    if (!Engine) throw new Error('HermionaEngine missing');

    const size = opts.size || 'working';
    const params = opts.params || {};

    // Grain: static tile so export matches preview character (not random sparkle each time)
    // Strength is resolution-compensated inside looks.js
    const processOpts = {
      grain: true,
      grainMode: 'static',
      look: opts.look || null,
      quality: 'export',
      exportRes: true,
      scene: opts.scene || null,
      optics: opts.optics || null,
      debugScene: null // never debug on export
    };

    // ——— Fast path: working / preview resolution ———
    if (size === 'working') {
      const processed = Engine.process(opts.workingData, params, processOpts);
      if (!processed) throw new Error('No image to export');
      const canvas = canvasFromImageData(processed);
      return {
        canvas: canvas,
        width: canvas.width,
        height: canvas.height,
        pipeline: 'working'
      };
    }

    const targetLong = resolveTargetLong(size, opts.originalImage, opts.workingCanvas);

    // ——— No originalImage: scale working canvas (never upscale past working) ———
    if (!opts.originalImage) {
      let base = opts.workingCanvas;
      if (!base) throw new Error('No image');
      // Process first at working res, then downscale if needed
      const ctx = base.getContext('2d', { willReadFrequently: true });
      const data = ctx.getImageData(0, 0, base.width, base.height);
      const processed = Engine.process(data, params, processOpts);
      let out = canvasFromImageData(processed);
      const long = Math.max(out.width, out.height);
      if (targetLong && long > targetLong) {
        out = Engine.scaleCanvasToLongEdge(out, targetLong);
      }
      return {
        canvas: out,
        width: out.width,
        height: out.height,
        pipeline: 'working-fallback'
      };
    }

    // ——— Full / 1080 / 2048 from original + geometry ops ———
    const rebuildCap = resolveRebuildCap(size, targetLong, opts.originalImage);
    let rebuilt = Engine.rebuildGeometry(opts.originalImage, opts.ops || [], rebuildCap);

    if (!rebuilt) throw new Error('Rebuild failed');

    // If rebuilt is still larger than target (e.g. aspect ops), downscale BEFORE process
    // so film grain / CA run at final pixel density (matches "what you get").
    let long = Math.max(rebuilt.width, rebuilt.height);
    if (targetLong && long > targetLong) {
      rebuilt = Engine.scaleCanvasToLongEdge(rebuilt, targetLong);
      long = Math.max(rebuilt.width, rebuilt.height);
    }

    // Sanity: never leave export larger than HARD_MAX
    if (long > HARD_MAX_LONG_EDGE) {
      rebuilt = Engine.scaleCanvasToLongEdge(rebuilt, HARD_MAX_LONG_EDGE);
    }

    const rctx = rebuilt.getContext('2d', { willReadFrequently: true });
    // Force readback from clean bitmap
    const srcData = rctx.getImageData(0, 0, rebuilt.width, rebuilt.height);

    const processed = Engine.process(srcData, params, processOpts);
    if (!processed) throw new Error('Process failed');

    const out = canvasFromImageData(processed);

    return {
      canvas: out,
      width: out.width,
      height: out.height,
      pipeline: 'full',
      rebuildCap: rebuildCap,
      targetLong: targetLong
    };
  }

  function canvasToBlob(canvas, format, quality) {
    const mime = format === 'png' ? 'image/png' : 'image/jpeg';
    const q = format === 'png' ? undefined : quality;

    return new Promise((resolve, reject) => {
      if (canvas.toBlob) {
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              // Fallback dataURL
              try {
                const dataUrl = format === 'png'
                  ? canvas.toDataURL(mime)
                  : canvas.toDataURL(mime, quality);
                resolve(dataUrlToBlob(dataUrl));
              } catch (e) {
                reject(e);
              }
              return;
            }
            resolve(blob);
          },
          mime,
          q
        );
      } else {
        try {
          const dataUrl = format === 'png'
            ? canvas.toDataURL(mime)
            : canvas.toDataURL(mime, quality);
          resolve(dataUrlToBlob(dataUrl));
        } catch (e) {
          reject(e);
        }
      }
    });
  }

  function dataUrlToBlob(dataUrl) {
    const parts = dataUrl.split(',');
    const mime = parts[0].match(/:(.*?);/)[1];
    const bin = atob(parts[1]);
    const arr = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    return new Blob([arr], { type: mime });
  }

  /**
   * Effective JPEG quality — bump for large exports so film grain survives compression.
   */
  function effectiveJpegQuality(opts, width, height) {
    let q = typeof opts.quality === 'number' ? opts.quality : 0.95;
    const long = Math.max(width, height);
    if (opts.size === 'full' || long >= 2000) {
      q = Math.max(q, 0.95);
    }
    // Heavy film grain needs higher Q to avoid mosquito noise
    const look = opts.look || {};
    if (look.film && look.film !== 'none') {
      q = Math.max(q, 0.94);
    }
    return Math.min(1, q);
  }

  /**
   * @param {ExportOptions} opts
   * @returns {Promise<{width:number,height:number,pipeline?:string}>}
   */
  function download(opts) {
    return new Promise((resolve, reject) => {
      requestAnimationFrame(() => {
        setTimeout(() => {
          try {
            const result = buildExportCanvas(opts);
            const format = opts.format || 'jpeg';
            const quality = effectiveJpegQuality(opts, result.width, result.height);
            const ext = format === 'png' ? 'png' : 'jpg';

            canvasToBlob(result.canvas, format, quality)
              .then((blob) => {
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.download = 'hermiona-edit-' + Date.now() + '.' + ext;
                link.href = url;
                link.click();
                setTimeout(() => URL.revokeObjectURL(url), 4000);
                resolve({
                  width: result.width,
                  height: result.height,
                  pipeline: result.pipeline
                });
              })
              .catch(reject);
          } catch (err) {
            reject(err);
          }
        }, 40);
      });
    });
  }

  global.HermionaExport = {
    download,
    buildExportCanvas,
    MAX_EXPORT_LONG_EDGE,
    HARD_MAX_LONG_EDGE,
    resolveTargetLong
  };
})(typeof window !== 'undefined' ? window : globalThis);
