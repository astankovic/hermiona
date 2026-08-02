/**
 * Hermione — one-tap enhance (iPhone Photos wand style)
 * Exposes window.HermioneAuto
 *
 * Analyzes image stats → returns base light/color params only.
 * Never touches film / camera / lens / optics / crop.
 */
(function (global) {
  'use strict';

  /** Params keys this module may write */
  var PARAM_KEYS = [
    'exposure',
    'contrast',
    'highlights',
    'shadows',
    'whites',
    'blacks',
    'temperature',
    'tint',
    'saturation',
    'vibrance',
    'clarity'
  ];

  var MODES = {
    auto: {
      id: 'auto',
      label: 'Auto',
      // multipliers on suggested deltas (1 = balanced wand)
      strength: 1,
      vibBoost: 12,
      clarityBoost: 8,
      satBoost: 0
    },
    soft: {
      id: 'soft',
      label: 'Soft',
      strength: 0.72,
      vibBoost: 4,
      clarityBoost: -6,
      satBoost: -4
    },
    vivid: {
      id: 'vivid',
      label: 'Vivid',
      strength: 1.15,
      vibBoost: 22,
      clarityBoost: 14,
      satBoost: 8
    }
  };

  function clamp(v, lo, hi) {
    return Math.max(lo, Math.min(hi, v));
  }

  function roundExp(v) {
    return Math.round(v * 100) / 100;
  }

  function round1(v) {
    return Math.round(v);
  }

  /**
   * Cheap stats without full histogram module (works standalone).
   * @param {ImageData} imageData
   */
  function analyze(imageData) {
    var empty = {
      meanLuma: 128,
      meanR: 128,
      meanG: 128,
      meanB: 128,
      p5: 20,
      p50: 128,
      p95: 230,
      clipLow: 0,
      clipHigh: 0,
      contrastSpan: 0.55
    };
    if (!imageData || !imageData.data) return empty;

    var data = imageData.data;
    var w = imageData.width;
    var h = imageData.height;
    var long = Math.max(w, h) || 1;
    var stepPx = long > 256 ? Math.ceil(long / 256) : 1;
    var step = stepPx * 4;

    var sumY = 0;
    var sumR = 0;
    var sumG = 0;
    var sumB = 0;
    var n = 0;
    var clipLo = 0;
    var clipHi = 0;
    // coarse percentile via 64-bin luma hist
    var bins = new Uint32Array(64);

    for (var i = 0; i < data.length; i += step) {
      var r = data[i];
      var g = data[i + 1];
      var b = data[i + 2];
      var y = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      sumY += y;
      sumR += r;
      sumG += g;
      sumB += b;
      n++;
      if (y <= 2) clipLo++;
      if (y >= 253) clipHi++;
      var bi = (y * 64) / 256;
      bi = bi | 0;
      if (bi < 0) bi = 0;
      if (bi > 63) bi = 63;
      bins[bi]++;
    }

    if (!n) return empty;

    function percentile(p) {
      var target = (p / 100) * n;
      var acc = 0;
      for (var b = 0; b < 64; b++) {
        acc += bins[b];
        if (acc >= target) {
          return ((b + 0.5) / 64) * 255;
        }
      }
      return 255;
    }

    var p5 = percentile(5);
    var p50 = percentile(50);
    var p95 = percentile(95);

    return {
      meanLuma: sumY / n,
      meanR: sumR / n,
      meanG: sumG / n,
      meanB: sumB / n,
      p5: p5,
      p50: p50,
      p95: p95,
      clipLow: clipLo / n,
      clipHigh: clipHi / n,
      contrastSpan: (p95 - p5) / 255
    };
  }

  /**
   * Suggest param deltas for a mode.
   * @param {object} stats from analyze()
   * @param {string} modeId auto|soft|vivid
   * @returns {object} partial params
   */
  function suggest(stats, modeId) {
    var mode = MODES[modeId] || MODES.auto;
    var s = mode.strength;

    // --- Exposure: pull median toward ~0.42–0.48 (slightly under mid for photo feel)
    var targetMed = 118;
    var med = stats.p50;
    var expRaw = Math.log2(clamp(targetMed / clamp(med, 8, 250), 0.45, 2.2));
    // dampen: don't slam
    var exposure = clamp(expRaw * 0.55 * s, -1.1, 1.1);

    // --- Contrast from span
    var span = stats.contrastSpan;
    var contrast = 0;
    if (span < 0.35) contrast = 22 * s;
    else if (span < 0.48) contrast = 12 * s;
    else if (span > 0.78) contrast = -10 * s;
    else contrast = 4 * s;

    // --- Shadows / highlights from ends + clipping
    var shadows = 0;
    var highlights = 0;
    var blacks = 0;
    var whites = 0;

    if (stats.p5 < 28) shadows = clamp((28 - stats.p5) * 0.9 * s, 0, 45);
    if (stats.p5 > 55) blacks = clamp((stats.p5 - 55) * -0.5 * s, -25, 0);

    if (stats.p95 > 235) highlights = clamp((stats.p95 - 235) * -1.1 * s, -50, 0);
    if (stats.p95 < 200) whites = clamp((200 - stats.p95) * 0.35 * s, 0, 20);

    if (stats.clipHigh > 0.02) {
      highlights = Math.min(highlights, -18 * s);
      whites = Math.min(whites, -8 * s);
    }
    if (stats.clipLow > 0.03) {
      shadows = Math.max(shadows, 18 * s);
    }

    // --- WB: mean R vs B (very mild)
    var rb = stats.meanR - stats.meanB;
    var temperature = clamp(-rb * 0.22 * s, -28, 28);
    var gb = stats.meanG - (stats.meanR + stats.meanB) * 0.5;
    var tint = clamp(-gb * 0.35 * s, -18, 18);

    // --- Color life
    var vibrance = clamp(mode.vibBoost * s, -30, 40);
    var saturation = clamp(mode.satBoost * s, -20, 20);
    var clarity = clamp(mode.clarityBoost * s, -25, 30);

    // Soft mode: never crush blacks hard
    if (modeId === 'soft') {
      blacks = Math.max(blacks, -8);
      contrast = Math.min(contrast, 14);
      exposure = clamp(exposure + 0.05, -0.8, 0.9);
    }

    // Vivid: a bit more mid punch
    if (modeId === 'vivid') {
      contrast = clamp(contrast + 6, -30, 40);
    }

    return {
      exposure: roundExp(exposure),
      contrast: round1(contrast),
      highlights: round1(highlights),
      shadows: round1(shadows),
      whites: round1(whites),
      blacks: round1(blacks),
      temperature: round1(temperature),
      tint: round1(tint),
      saturation: round1(saturation),
      vibrance: round1(vibrance),
      clarity: round1(clarity)
    };
  }

  /**
   * Full recipe from ImageData.
   * @param {ImageData} imageData — prefer ungraded / lightly graded working original
   * @param {string} modeId
   */
  function enhance(imageData, modeId) {
    var stats = analyze(imageData);
    var params = suggest(stats, modeId);
    return {
      mode: (MODES[modeId] || MODES.auto).id,
      label: (MODES[modeId] || MODES.auto).label,
      params: params,
      stats: stats
    };
  }

  /** Zero out only enhance-controlled keys (for “off”) */
  function clearedParams() {
    var o = {};
    for (var i = 0; i < PARAM_KEYS.length; i++) o[PARAM_KEYS[i]] = 0;
    return o;
  }

  function modeList() {
    return [
      { id: 'auto', label: 'Auto' },
      { id: 'soft', label: 'Soft' },
      { id: 'vivid', label: 'Vivid' }
    ];
  }

  global.HermioneAuto = {
    analyze: analyze,
    suggest: suggest,
    enhance: enhance,
    clearedParams: clearedParams,
    modeList: modeList,
    PARAM_KEYS: PARAM_KEYS.slice(),
    MODES: MODES
  };
})(typeof window !== 'undefined' ? window : globalThis);
