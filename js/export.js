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

  // ——— Export process worker (G1) ———
  let exportWorker = null;
  let exportWorkerFailed = false;
  let workerMsgId = 1;
  const workerPending = Object.create(null);

  function getExportWorker() {
    if (exportWorkerFailed) return null;
    if (exportWorker) return exportWorker;
    try {
      if (typeof Worker === 'undefined') {
        exportWorkerFailed = true;
        return null;
      }
      // Absolute-ish path relative to page
      const base =
        (document.currentScript && document.currentScript.src) ||
        (global.location && global.location.href) ||
        '';
      let workerUrl = 'js/export-worker.js';
      try {
        workerUrl = new URL('js/export-worker.js', global.location.href).href;
      } catch (e) {
        /* keep relative */
      }
      // bust cache with app version if present
      if (global.__H_V) {
        workerUrl += (workerUrl.indexOf('?') >= 0 ? '&' : '?') + 'v=' + global.__H_V;
      }
      exportWorker = new Worker(workerUrl);
      exportWorker.onmessage = function (ev) {
        const msg = ev.data || {};
        const pending = workerPending[msg.id];
        if (!pending) return;
        delete workerPending[msg.id];
        if (msg.ok) {
          pending.resolve({
            width: msg.width,
            height: msg.height,
            data: new Uint8ClampedArray(msg.rgba)
          });
        } else {
          pending.reject(new Error(msg.error || 'Worker process failed'));
        }
      };
      exportWorker.onerror = function (err) {
        exportWorkerFailed = true;
        try {
          exportWorker.terminate();
        } catch (e) {
          /* ignore */
        }
        exportWorker = null;
        Object.keys(workerPending).forEach(function (k) {
          workerPending[k].reject(err || new Error('Worker crashed'));
          delete workerPending[k];
        });
      };
      return exportWorker;
    } catch (e) {
      exportWorkerFailed = true;
      return null;
    }
  }

  function packScene(scene) {
    if (!scene) return null;
    const out = {
      width: scene.width,
      height: scene.height,
      focusDepth: scene.focusDepth,
      depthSource: scene.depthSource,
      version: scene.version
    };
    if (scene.personMask) out.personMask = scene.personMask.buffer.slice(
      scene.personMask.byteOffset,
      scene.personMask.byteOffset + scene.personMask.byteLength
    );
    if (scene.depthMap) out.depthMap = scene.depthMap.buffer.slice(
      scene.depthMap.byteOffset,
      scene.depthMap.byteOffset + scene.depthMap.byteLength
    );
    if (scene.parts) {
      out.parts = {};
      Object.keys(scene.parts).forEach(function (k) {
        const m = scene.parts[k];
        if (m) {
          out.parts[k] = m.buffer.slice(m.byteOffset, m.byteOffset + m.byteLength);
        }
      });
    }
    return out;
  }

  /**
   * Process ImageData on worker when available (large exports).
   * @returns {Promise<ImageData>}
   */
  function processOnWorker(imageData, params, processOpts) {
    const w = imageData.width;
    const h = imageData.height;
    // Prefer worker when pixel count is large enough to matter
    if (w * h < 900 * 900) {
      return Promise.resolve(
        global.HermionaEngine.process(imageData, params, processOpts)
      );
    }
    const worker = getExportWorker();
    if (!worker) {
      return Promise.resolve(
        global.HermionaEngine.process(imageData, params, processOpts)
      );
    }

    const id = workerMsgId++;
    const rgba = imageData.data.buffer.slice(
      imageData.data.byteOffset,
      imageData.data.byteOffset + imageData.data.byteLength
    );
    const scenePack = packScene(processOpts.scene);
    const transfer = [rgba];
    if (scenePack) {
      if (scenePack.personMask) transfer.push(scenePack.personMask);
      if (scenePack.depthMap) transfer.push(scenePack.depthMap);
      if (scenePack.parts) {
        Object.keys(scenePack.parts).forEach(function (k) {
          if (scenePack.parts[k]) transfer.push(scenePack.parts[k]);
        });
      }
    }

    return new Promise(function (resolve, reject) {
      workerPending[id] = {
        resolve: function (r) {
          resolve(new ImageData(r.data, r.width, r.height));
        },
        reject: reject
      };
      // Timeout — fall back to main
      const timer = setTimeout(function () {
        if (!workerPending[id]) return;
        delete workerPending[id];
        try {
          resolve(
            global.HermionaEngine.process(imageData, params, processOpts)
          );
        } catch (e) {
          reject(e);
        }
      }, 120000);

      const origResolve = workerPending[id].resolve;
      const origReject = workerPending[id].reject;
      workerPending[id].resolve = function (r) {
        clearTimeout(timer);
        origResolve(r);
      };
      workerPending[id].reject = function (e) {
        clearTimeout(timer);
        // Fallback main thread
        try {
          resolve(
            global.HermionaEngine.process(imageData, params, processOpts)
          );
        } catch (e2) {
          origReject(e2);
        }
      };

      worker.postMessage(
        {
          id: id,
          type: 'process',
          width: w,
          height: h,
          rgba: rgba,
          params: params,
          look: processOpts.look,
          optics: processOpts.optics,
          border: processOpts.border || null,
          scene: scenePack,
          grain: processOpts.grain,
          grainMode: processOpts.grainMode
        },
        transfer
      );
    });
  }

  /**
   * Build export canvas (processed + sized). Sync path (main thread).
   * @param {ExportOptions} opts
   */
  function buildExportCanvas(opts) {
    const Engine = global.HermionaEngine;
    if (!Engine) throw new Error('HermionaEngine missing');

    const size = opts.size || 'working';
    const params = opts.params || {};

    const processOpts = {
      grain: true,
      grainMode: 'static',
      look: opts.look || null,
      quality: 'export',
      exportRes: true,
      scene: opts.scene || null,
      border: opts.border || null,
      optics: opts.optics || null,
      debugScene: null
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

    if (!opts.originalImage) {
      let base = opts.workingCanvas;
      if (!base) throw new Error('No image');
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

    const rebuildCap = resolveRebuildCap(size, targetLong, opts.originalImage);
    let rebuilt = Engine.rebuildGeometry(opts.originalImage, opts.ops || [], rebuildCap);

    if (!rebuilt) throw new Error('Rebuild failed');

    let long = Math.max(rebuilt.width, rebuilt.height);
    if (targetLong && long > targetLong) {
      rebuilt = Engine.scaleCanvasToLongEdge(rebuilt, targetLong);
      long = Math.max(rebuilt.width, rebuilt.height);
    }

    if (long > HARD_MAX_LONG_EDGE) {
      rebuilt = Engine.scaleCanvasToLongEdge(rebuilt, HARD_MAX_LONG_EDGE);
    }

    const rctx = rebuilt.getContext('2d', { willReadFrequently: true });
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

  /**
   * Async export canvas — uses worker for process when beneficial.
   * Geometry rebuild stays on main (needs DOM image/canvas).
   */
  function buildExportCanvasAsync(opts) {
    const Engine = global.HermionaEngine;
    if (!Engine) return Promise.reject(new Error('HermionaEngine missing'));

    const size = opts.size || 'working';
    const params = opts.params || {};
    const processOpts = {
      grain: true,
      grainMode: 'static',
      look: opts.look || null,
      quality: 'export',
      exportRes: true,
      scene: opts.scene || null,
      border: opts.border || null,
      optics: opts.optics || null,
      debugScene: null
    };

    // Small / working: sync on main (fast enough)
    if (size === 'working') {
      try {
        return Promise.resolve(buildExportCanvas(opts));
      } catch (e) {
        return Promise.reject(e);
      }
    }

    try {
      let srcData = null;
      let rebuildCap = null;
      let targetLong = resolveTargetLong(
        size,
        opts.originalImage,
        opts.workingCanvas
      );
      let pipeline = 'full';

      if (!opts.originalImage) {
        const base = opts.workingCanvas;
        if (!base) return Promise.reject(new Error('No image'));
        const ctx = base.getContext('2d', { willReadFrequently: true });
        srcData = ctx.getImageData(0, 0, base.width, base.height);
        pipeline = 'working-fallback';
      } else {
        rebuildCap = resolveRebuildCap(size, targetLong, opts.originalImage);
        let rebuilt = Engine.rebuildGeometry(
          opts.originalImage,
          opts.ops || [],
          rebuildCap
        );
        if (!rebuilt) return Promise.reject(new Error('Rebuild failed'));
        let long = Math.max(rebuilt.width, rebuilt.height);
        if (targetLong && long > targetLong) {
          rebuilt = Engine.scaleCanvasToLongEdge(rebuilt, targetLong);
          long = Math.max(rebuilt.width, rebuilt.height);
        }
        if (long > HARD_MAX_LONG_EDGE) {
          rebuilt = Engine.scaleCanvasToLongEdge(rebuilt, HARD_MAX_LONG_EDGE);
        }
        const rctx = rebuilt.getContext('2d', { willReadFrequently: true });
        srcData = rctx.getImageData(0, 0, rebuilt.width, rebuilt.height);
      }

      return processOnWorker(srcData, params, processOpts).then(function (
        processed
      ) {
        if (!processed) throw new Error('Process failed');
        let out = canvasFromImageData(processed);
        if (pipeline === 'working-fallback' && targetLong) {
          const long = Math.max(out.width, out.height);
          if (long > targetLong) {
            out = Engine.scaleCanvasToLongEdge(out, targetLong);
          }
        }
        return {
          canvas: out,
          width: out.width,
          height: out.height,
          pipeline: pipeline,
          rebuildCap: rebuildCap,
          targetLong: targetLong,
          worker: true
        };
      });
    } catch (e) {
      return Promise.reject(e);
    }
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
   * Size ladder for OOM / memory fallback.
   * Starts at requested size, then steps down: full → 2048 → 1080 → working.
   * @param {string} requested
   * @returns {string[]}
   */
  function sizeFallbackLadder(requested) {
    const order = ['full', '2048', '1080', 'working'];
    const start = order.indexOf(requested);
    if (start < 0) {
      // Unknown size: try as-is, then full ladder
      return [requested].concat(order);
    }
    return order.slice(start);
  }

  function triggerDownload(blob, ext) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = 'hermiona-edit-' + Date.now() + '.' + ext;
    link.href = url;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }

  /**
   * Build + blob at a single size (no fallback).
   * Uses async worker process when beneficial (G1).
   * @param {ExportOptions} opts
   * @returns {Promise<{width:number,height:number,pipeline?:string,blob:Blob,ext:string}>}
   */
  function buildAndBlob(opts) {
    return buildExportCanvasAsync(opts)
      .then((result) => {
        const format = opts.format || 'jpeg';
        const quality = effectiveJpegQuality(opts, result.width, result.height);
        const ext = format === 'png' ? 'png' : 'jpg';
        return canvasToBlob(result.canvas, format, quality).then((blob) => {
          try {
            result.canvas.width = 0;
            result.canvas.height = 0;
          } catch (_) {
            /* ignore */
          }
          return {
            width: result.width,
            height: result.height,
            pipeline: result.pipeline,
            blob: blob,
            ext: ext
          };
        });
      });
  }

  /**
   * Build export blob with size fallback (does not trigger download).
   * Ladder: requested → next smaller (full → 2048 → 1080 → working).
   *
   * @param {ExportOptions} opts
   * @returns {Promise<{width:number,height:number,pipeline?:string,fallbackFrom?:string,blob:Blob,ext:string,fileName:string}>}
   */
  function exportBlobWithFallback(opts) {
    const base = opts || {};
    const requested = base.size || 'working';
    const ladder = sizeFallbackLadder(requested);
    let fallbackFrom = null;
    const baseName =
      (base.fileName && String(base.fileName).replace(/\.[^.]+$/, '')) ||
      'hermiona-edit';

    function attempt(i) {
      if (i >= ladder.length) {
        return Promise.reject(
          new Error('Export failed — try a smaller size')
        );
      }
      const size = ladder[i];
      const tryOpts = Object.assign({}, base, { size: size });

      return buildAndBlob(tryOpts)
        .then((built) => {
          const out = {
            width: built.width,
            height: built.height,
            pipeline: built.pipeline,
            blob: built.blob,
            ext: built.ext,
            fileName: baseName + '-' + Date.now() + '.' + built.ext
          };
          if (fallbackFrom) out.fallbackFrom = fallbackFrom;
          else if (size !== requested) out.fallbackFrom = requested;
          return out;
        })
        .catch(() => {
          if (i + 1 < ladder.length) {
            if (!fallbackFrom) fallbackFrom = requested;
            return new Promise((r) => setTimeout(r, 30)).then(() => attempt(i + 1));
          }
          throw new Error('Export failed — try a smaller size');
        });
    }

    return new Promise((resolve, reject) => {
      requestAnimationFrame(() => {
        setTimeout(() => {
          attempt(0).then(resolve, (err) => {
            reject(
              err && err.message
                ? err
                : new Error('Export failed — try a smaller size')
            );
          });
        }, 40);
      });
    });
  }

  /**
   * Export with automatic size fallback on memory-ish failures.
   * @param {ExportOptions} opts
   * @returns {Promise<{width:number,height:number,pipeline?:string,fallbackFrom?:string,shared?:boolean}>}
   */
  function downloadWithFallback(opts) {
    return exportBlobWithFallback(opts).then((built) => {
      triggerDownload(built.blob, built.ext);
      return {
        width: built.width,
        height: built.height,
        pipeline: built.pipeline,
        fallbackFrom: built.fallbackFrom,
        shared: false,
        fileName: built.fileName
      };
    });
  }

  /**
   * Share via Web Share API when available; otherwise download.
   * @param {ExportOptions} opts
   */
  function shareOrDownload(opts) {
    return exportBlobWithFallback(opts).then((built) => {
      const file = new File([built.blob], built.fileName, {
        type: built.blob.type || 'image/jpeg'
      });
      const canShare =
        typeof navigator !== 'undefined' &&
        navigator.share &&
        navigator.canShare &&
        navigator.canShare({ files: [file] });

      if (canShare) {
        return navigator
          .share({
            files: [file],
            title: 'Hermiona',
            text: 'Edited with Hermiona'
          })
          .then(() => ({
            width: built.width,
            height: built.height,
            pipeline: built.pipeline,
            fallbackFrom: built.fallbackFrom,
            shared: true,
            fileName: built.fileName
          }))
          .catch((err) => {
            // User cancelled share → still offer download only if not abort
            if (err && (err.name === 'AbortError' || err.name === 'NotAllowedError')) {
              return {
                width: built.width,
                height: built.height,
                pipeline: built.pipeline,
                fallbackFrom: built.fallbackFrom,
                shared: false,
                cancelled: true,
                fileName: built.fileName
              };
            }
            triggerDownload(built.blob, built.ext);
            return {
              width: built.width,
              height: built.height,
              pipeline: built.pipeline,
              fallbackFrom: built.fallbackFrom,
              shared: false,
              fileName: built.fileName
            };
          });
      }

      triggerDownload(built.blob, built.ext);
      return {
        width: built.width,
        height: built.height,
        pipeline: built.pipeline,
        fallbackFrom: built.fallbackFrom,
        shared: false,
        fileName: built.fileName
      };
    });
  }

  /**
   * @param {ExportOptions} opts
   * @returns {Promise<{width:number,height:number,pipeline?:string,fallbackFrom?:string}>}
   */
  function download(opts) {
    return downloadWithFallback(opts);
  }

  global.HermionaExport = {
    download,
    downloadWithFallback,
    exportBlobWithFallback,
    shareOrDownload,
    triggerDownload,
    buildExportCanvas,
    buildExportCanvasAsync,
    processOnWorker,
    sizeFallbackLadder,
    MAX_EXPORT_LONG_EDGE,
    HARD_MAX_LONG_EDGE,
    resolveTargetLong
  };
})(typeof window !== 'undefined' ? window : globalThis);
