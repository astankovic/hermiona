/**
 * Hermione — reusable typed-array pool (G1)
 * Cuts GC thrash from process / DoF / selective.
 * Exposes window.HermioneBuffers (also works in workers via self)
 */
(function (global) {
  'use strict';

  var pools = {
    u8: [],
    f32: []
  };
  var MAX_PER_KIND = 12;

  function acquireU8(len) {
    var list = pools.u8;
    for (var i = list.length - 1; i >= 0; i--) {
      if (list[i].length >= len) {
        var buf = list.pop();
        // If oversized a lot, still OK — caller uses .subarray length
        return buf.length === len ? buf : buf.subarray(0, len);
      }
    }
    return new Uint8ClampedArray(len);
  }

  /** Acquire full Uint8ClampedArray of exact length (always exact for ImageData) */
  function acquireU8Exact(len) {
    var list = pools.u8;
    for (var i = list.length - 1; i >= 0; i--) {
      if (list[i].length === len) {
        return list.pop();
      }
    }
    // Prefer exact-sized buffers for ImageData constructor
    for (var j = list.length - 1; j >= 0; j--) {
      if (list[j].length >= len && list[j].length <= len * 1.25) {
        // Don't reuse oversized for ImageData — create exact
        break;
      }
    }
    return new Uint8ClampedArray(len);
  }

  function releaseU8(buf) {
    if (!buf || !buf.length) return;
    if (pools.u8.length >= MAX_PER_KIND) return;
    // Only pool real Uint8ClampedArray, not subarrays of wrong type
    if (!(buf instanceof Uint8ClampedArray) && !(buf instanceof Uint8Array)) return;
    if (buf.buffer && buf.byteOffset !== 0) return; // skip views
    pools.u8.push(buf);
  }

  function acquireF32(len) {
    var list = pools.f32;
    for (var i = list.length - 1; i >= 0; i--) {
      if (list[i].length === len) {
        return list.pop();
      }
    }
    return new Float32Array(len);
  }

  function releaseF32(buf) {
    if (!buf || !buf.length) return;
    if (pools.f32.length >= MAX_PER_KIND) return;
    if (!(buf instanceof Float32Array)) return;
    if (buf.byteOffset !== 0) return;
    pools.f32.push(buf);
  }

  function clear() {
    pools.u8.length = 0;
    pools.f32.length = 0;
  }

  global.HermioneBuffers = {
    acquireU8: acquireU8Exact,
    releaseU8: releaseU8,
    acquireF32: acquireF32,
    releaseF32: releaseF32,
    clear: clear
  };
})(typeof window !== 'undefined' ? window : self);
