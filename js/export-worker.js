/**
 * Hermione export worker (G1)
 * Runs Engine.process off the main thread for large exports.
 *
 * Message in:
 *   { id, type:'process', width, height, rgba: ArrayBuffer,
 *     params, look, optics, scene: { width, height, personMask?, depthMap?, parts? },
 *     grain, grainMode }
 * Message out:
 *   { id, ok:true, width, height, rgba: ArrayBuffer }
 *   { id, ok:false, error:string }
 */
/* eslint-disable no-undef */
importScripts(
  'perf.js',
  'buffers.js',
  'looks.js',
  'imperfections.js',
  'borders.js',
  'scene/depth-pseudo.js',
  'scene/coc.js',
  'scene/bokeh.js',
  'scene/dof.js',
  'scene/selective.js',
  'engine.js'
);

function reviveScene(s) {
  if (!s) return null;
  const out = {
    width: s.width,
    height: s.height,
    personMask: s.personMask
      ? new Float32Array(s.personMask)
      : null,
    depthMap: s.depthMap ? new Float32Array(s.depthMap) : null,
    focusDepth: s.focusDepth,
    depthSource: s.depthSource || 'pseudo',
    version: s.version || 1
  };
  if (s.parts) {
    out.parts = {};
    const keys = Object.keys(s.parts);
    for (let i = 0; i < keys.length; i++) {
      const k = keys[i];
      out.parts[k] = s.parts[k] ? new Float32Array(s.parts[k]) : null;
    }
  }
  return out;
}

self.onmessage = function (ev) {
  const msg = ev.data || {};
  const id = msg.id;
  try {
    if (msg.type !== 'process') {
      throw new Error('Unknown worker message');
    }
    const Engine = self.HermioneEngine;
    if (!Engine || !Engine.process) {
      throw new Error('Engine missing in worker');
    }
    const w = msg.width | 0;
    const h = msg.height | 0;
    const rgba = new Uint8ClampedArray(msg.rgba);
    if (rgba.length !== w * h * 4) {
      throw new Error('RGBA size mismatch');
    }
    const imageData = new ImageData(rgba, w, h);
    const processed = Engine.process(imageData, msg.params || {}, {
      grain: msg.grain !== false,
      grainMode: msg.grainMode || 'static',
      look: msg.look || null,
      quality: 'export',
      exportRes: true,
      scene: reviveScene(msg.scene),
      border: msg.border || null,
      optics: msg.optics || null,
      debugScene: null,
      fast: false
    });
    if (!processed) throw new Error('Process returned null');

    // Transfer underlying buffer back
    const buf = processed.data.buffer.slice(
      processed.data.byteOffset,
      processed.data.byteOffset + processed.data.byteLength
    );
    self.postMessage(
      {
        id: id,
        ok: true,
        width: processed.width,
        height: processed.height,
        rgba: buf
      },
      [buf]
    );
  } catch (err) {
    self.postMessage({
      id: id,
      ok: false,
      error: (err && err.message) || String(err)
    });
  }
};
