/**
 * Hermiona — print / instant borders (Crop section)
 * Not a filter: frames the photo with cult formats + zoom/pan into the window.
 * Exposes window.HermionaBorders
 */
(function (global) {
  'use strict';

  function clamp(v, lo, hi) {
    return Math.max(lo, Math.min(hi, v));
  }

  function hash2(x, y, seed) {
    var n = x * 374761393 + y * 668265263 + seed * 1274126177;
    n = (n ^ (n >>> 13)) * 1274126177;
    n = n ^ (n >>> 16);
    return (n >>> 0) / 4294967295;
  }

  /**
   * pad.* = relative to photo-window size
   * photoAspect = image area W/H (null = keep source aspect)
   */
  var FORMATS = [
    {
      id: 'none',
      name: 'None',
      desc: 'No frame'
    },
    {
      id: 'polaroid',
      name: 'Polaroid',
      desc: 'Classic instant · thick bottom',
      photoAspect: 1,
      pad: { top: 0.07, side: 0.08, bottom: 0.28 },
      paper: [246, 242, 232],
      paperGrain: 1,
      innerShade: 0.22
    },
    {
      id: 'polaroid-sx70',
      name: 'SX-70',
      desc: 'Square packfilm look',
      photoAspect: 1,
      pad: { top: 0.055, side: 0.06, bottom: 0.2 },
      paper: [248, 245, 238],
      paperGrain: 0.85,
      innerShade: 0.18
    },
    {
      id: 'instax-mini',
      name: 'Instax Mini',
      desc: 'Credit-card portrait',
      photoAspect: 0.62, // ~46×62
      pad: { top: 0.09, side: 0.1, bottom: 0.22 },
      paper: [252, 252, 250],
      paperGrain: 0.5,
      innerShade: 0.12
    },
    {
      id: 'instax-square',
      name: 'Instax Sq',
      desc: 'Square instant',
      photoAspect: 1,
      pad: { top: 0.08, side: 0.09, bottom: 0.18 },
      paper: [252, 252, 250],
      paperGrain: 0.45,
      innerShade: 0.12
    },
    {
      id: 'instax-wide',
      name: 'Instax Wide',
      desc: 'Landscape instant',
      photoAspect: 1.6,
      pad: { top: 0.07, side: 0.07, bottom: 0.16 },
      paper: [252, 252, 250],
      paperGrain: 0.4,
      innerShade: 0.1
    },
    {
      id: 'matte-white',
      name: 'White mat',
      desc: 'Gallery mat',
      photoAspect: null,
      pad: { top: 0.08, side: 0.08, bottom: 0.08 },
      paper: [250, 250, 248],
      paperGrain: 0.15,
      innerShade: 0.08
    },
    {
      id: 'matte-black',
      name: 'Black mat',
      desc: 'Dark gallery',
      photoAspect: null,
      pad: { top: 0.08, side: 0.08, bottom: 0.08 },
      paper: [18, 18, 18],
      paperGrain: 0.2,
      innerShade: 0.05
    },
    {
      id: 'film-rebate',
      name: 'Film rebate',
      desc: '35mm edge black',
      photoAspect: 1.5, // 3:2
      pad: { top: 0.06, side: 0.04, bottom: 0.06 },
      paper: [12, 12, 12],
      paperGrain: 0.35,
      innerShade: 0.15,
      sprocketHint: true
    }
  ];

  function byId(id) {
    for (var i = 0; i < FORMATS.length; i++) {
      if (FORMATS[i].id === id) return FORMATS[i];
    }
    return FORMATS[0];
  }

  /**
   * Source crop window (pixels) for zoom/pan into format photo aspect.
   * zoom 1 = largest aspect-fit window; zoom > 1 zooms in.
   * panX/panY -1..1 within allowed travel.
   */
  function sourceWindow(sw, sh, photoAspect, zoom, panX, panY) {
    var asp = photoAspect && photoAspect > 0.05 ? photoAspect : sw / sh;
    var bw;
    var bh;
    if (sw / sh > asp) {
      bh = sh;
      bw = bh * asp;
    } else {
      bw = sw;
      bh = bw / asp;
    }
    var z = clamp(zoom != null ? zoom : 1, 1, 3);
    var vw = bw / z;
    var vh = bh / z;
    var maxPanX = Math.max(0, (sw - vw) / 2);
    var maxPanY = Math.max(0, (sh - vh) / 2);
    var cx = sw / 2 + clamp(panX != null ? panX : 0, -1, 1) * maxPanX;
    var cy = sh / 2 + clamp(panY != null ? panY : 0, -1, 1) * maxPanY;
    var x = clamp(cx - vw / 2, 0, Math.max(0, sw - vw));
    var y = clamp(cy - vh / 2, 0, Math.max(0, sh - vh));
    return { x: x, y: y, w: vw, h: vh };
  }

  /**
   * Apply border frame. Returns new ImageData (may change size).
   * @param {ImageData} imageData
   * @param {{ id:string, zoom?:number, panX?:number, panY?:number }} border
   * @param {{ maxLong?:number }} [opts]
   */
  function apply(imageData, border, opts) {
    if (!imageData || !border || !border.id || border.id === 'none') {
      return imageData;
    }
    var fmt = byId(border.id);
    if (!fmt || fmt.id === 'none') return imageData;

    opts = opts || {};
    var sw = imageData.width;
    var sh = imageData.height;
    var src = imageData.data;

    var photoAspect =
      fmt.photoAspect != null && fmt.photoAspect > 0
        ? fmt.photoAspect
        : sw / Math.max(1, sh);

    var win = sourceWindow(
      sw,
      sh,
      photoAspect,
      border.zoom,
      border.panX,
      border.panY
    );

    // Output photo window long edge
    var maxLong = opts.maxLong || Math.max(sw, sh);
    var photoW;
    var photoH;
    if (photoAspect >= 1) {
      photoW = Math.min(maxLong, Math.round(Math.max(sw, sh)));
      photoH = Math.max(1, Math.round(photoW / photoAspect));
    } else {
      photoH = Math.min(maxLong, Math.round(Math.max(sw, sh)));
      photoW = Math.max(1, Math.round(photoH * photoAspect));
    }

    var pad = fmt.pad || { top: 0.08, side: 0.08, bottom: 0.08 };
    var padL = Math.round(photoW * (pad.side || 0.08));
    var padR = padL;
    var padT = Math.round(photoH * (pad.top || 0.08));
    var padB = Math.round(photoH * (pad.bottom || 0.08));
    var outW = photoW + padL + padR;
    var outH = photoH + padT + padB;

    var out = new Uint8ClampedArray(outW * outH * 4);
    var paper = fmt.paper || [245, 240, 230];
    var grain = fmt.paperGrain != null ? fmt.paperGrain : 0.5;

    // Fill paper
    for (var y = 0; y < outH; y++) {
      for (var x = 0; x < outW; x++) {
        var i = (y * outW + x) * 4;
        var n = (hash2(x, y, 901) - 0.5) * 10 * grain;
        out[i] = clamp(paper[0] + n, 0, 255);
        out[i + 1] = clamp(paper[1] + n * 0.95, 0, 255);
        out[i + 2] = clamp(paper[2] + n * 0.85, 0, 255);
        out[i + 3] = 255;
      }
    }

    // Optional sprocket hint (film rebate)
    if (fmt.sprocketHint) {
      var holeH = Math.max(2, Math.round(outH * 0.035));
      var holeW = Math.max(3, Math.round(outW * 0.02));
      var gap = Math.round(outW * 0.06);
      for (var side = 0; side < 2; side++) {
        var yy = side === 0 ? Math.round(padT * 0.35) : outH - padB + Math.round(padB * 0.35);
        for (var hx = padL; hx < outW - padR; hx += gap) {
          for (var hy = 0; hy < holeH; hy++) {
            for (var hx2 = 0; hx2 < holeW; hx2++) {
              var px = hx + hx2;
              var py = yy + hy;
              if (px < 0 || py < 0 || px >= outW || py >= outH) continue;
              var pi = (py * outW + px) * 4;
              out[pi] = out[pi + 1] = out[pi + 2] = 40;
            }
          }
        }
      }
    }

    // Sample source window → photo rect (bilinear)
    function sample(sx, sy) {
      var x0 = clamp(Math.floor(sx), 0, sw - 1);
      var y0 = clamp(Math.floor(sy), 0, sh - 1);
      var x1 = Math.min(x0 + 1, sw - 1);
      var y1 = Math.min(y0 + 1, sh - 1);
      var fx = sx - x0;
      var fy = sy - y0;
      var i00 = (y0 * sw + x0) * 4;
      var i10 = (y0 * sw + x1) * 4;
      var i01 = (y1 * sw + x0) * 4;
      var i11 = (y1 * sw + x1) * 4;
      return [
        src[i00] * (1 - fx) * (1 - fy) +
          src[i10] * fx * (1 - fy) +
          src[i01] * (1 - fx) * fy +
          src[i11] * fx * fy,
        src[i00 + 1] * (1 - fx) * (1 - fy) +
          src[i10 + 1] * fx * (1 - fy) +
          src[i01 + 1] * (1 - fx) * fy +
          src[i11 + 1] * fx * fy,
        src[i00 + 2] * (1 - fx) * (1 - fy) +
          src[i10 + 2] * fx * (1 - fy) +
          src[i01 + 2] * (1 - fx) * fy +
          src[i11 + 2] * fx * fy
      ];
    }

    var shade = fmt.innerShade != null ? fmt.innerShade : 0.15;
    for (var py = 0; py < photoH; py++) {
      for (var px = 0; px < photoW; px++) {
        var sx = win.x + ((px + 0.5) / photoW) * win.w - 0.5;
        var sy = win.y + ((py + 0.5) / photoH) * win.h - 0.5;
        var rgb = sample(sx, sy);
        var ox = padL + px;
        var oy = padT + py;
        var oi = (oy * outW + ox) * 4;
        // Inner edge shade
        var be = Math.min(px, photoW - 1 - px, py, photoH - 1 - py);
        var edge = be < 5 ? (1 - be / 5) * shade : 0;
        out[oi] = clamp(rgb[0] * (1 - edge), 0, 255);
        out[oi + 1] = clamp(rgb[1] * (1 - edge), 0, 255);
        out[oi + 2] = clamp(rgb[2] * (1 - edge), 0, 255);
        out[oi + 3] = 255;
      }
    }

    return new ImageData(out, outW, outH);
  }

  function defaultState() {
    return { id: 'none', zoom: 1, panX: 0, panY: 0 };
  }

  global.HermionaBorders = {
    FORMATS: FORMATS,
    byId: byId,
    apply: apply,
    sourceWindow: sourceWindow,
    defaultState: defaultState
  };
})(typeof window !== 'undefined' ? window : globalThis);
