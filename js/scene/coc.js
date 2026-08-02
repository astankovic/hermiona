/**
 * Circle of Confusion — shared optics map for DoF / CA / bloom
 * Exposes window.HermioneCoC
 */
(function (global) {
  'use strict';

  function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
  }

  /**
   * Focal length recipes (35mm-equivalent feel)
   */
  const RECIPES = {
    '35': {
      id: '35',
      name: '35mm',
      desc: 'Environmental',
      focalFactor: 0.72,
      asymmetricBg: 1.05,
      asymmetricFg: 0.9,
      maxBlurScale: 0.85
    },
    '50': {
      id: '50',
      name: '50mm',
      desc: 'Standard',
      focalFactor: 1.0,
      asymmetricBg: 1.15,
      asymmetricFg: 0.8,
      maxBlurScale: 1.0
    },
    '85': {
      id: '85',
      name: '85mm',
      desc: 'Portrait',
      focalFactor: 1.45,
      asymmetricBg: 1.25,
      asymmetricFg: 0.7,
      maxBlurScale: 1.25
    },
    anamo: {
      id: 'anamo',
      name: 'Anamo',
      desc: 'Cinematic',
      focalFactor: 1.15,
      asymmetricBg: 1.2,
      asymmetricFg: 0.75,
      maxBlurScale: 1.1,
      ovalBokeh: 1.4
    }
  };

  function recipeById(id) {
    return RECIPES[id] || RECIPES['50'];
  }

  /**
   * Sample float map at image pixel (supports different map size)
   */
  function sampleMap(map, mapW, mapH, x, y, imgW, imgH) {
    if (mapW === imgW && mapH === imgH) {
      return map[y * imgW + x] || 0;
    }
    const Pseudo = global.HermioneDepthPseudo;
    if (Pseudo && Pseudo.sampleMap) {
      const sx = ((x + 0.5) * mapW) / imgW - 0.5;
      const sy = ((y + 0.5) * mapH) / imgH - 0.5;
      return Pseudo.sampleMap(map, mapW, mapH, sx, sy);
    }
    const sx = Math.min(mapW - 1, Math.floor((x * mapW) / imgW));
    const sy = Math.min(mapH - 1, Math.floor((y * mapH) / imgH));
    return map[sy * mapW + sx] || 0;
  }

  /**
   * Build CoC map at full image resolution.
   *
   * @param {number} w
   * @param {number} h
   * @param {object} opts
   * @param {Float32Array} opts.depthMap
   * @param {Float32Array} [opts.personMask]
   * @param {number} opts.mapW
   * @param {number} opts.mapH
   * @param {number} opts.focusDepth 0..1
   * @param {number} opts.apertureStrength 0..1
   * @param {number} [opts.strength=1] overall DoF amount 0..1
   * @param {string} [opts.focalRecipe='50']
   * @param {boolean} [opts.normalize=true]
   * @returns {{ coc: Float32Array, recipe: object, focusDepth: number }}
   */
  function buildCoCMap(w, h, opts) {
    opts = opts || {};
    const depthMap = opts.depthMap;
    if (!depthMap) {
      return { coc: new Float32Array(w * h), recipe: recipeById('50'), focusDepth: 0.3 };
    }

    const recipe = recipeById(opts.focalRecipe || '50');
    const focus = clamp(opts.focusDepth != null ? opts.focusDepth : 0.3, 0, 1);
    const aperture = clamp(opts.apertureStrength != null ? opts.apertureStrength : 0.55, 0, 1);
    const strength = clamp(opts.strength != null ? opts.strength : 1, 0, 1);
    const mapW = opts.mapW || w;
    const mapH = opts.mapH || h;
    const personMask = opts.personMask || null;
    const ff = recipe.focalFactor;
    const bgMul = recipe.asymmetricBg || 1.15;
    const fgMul = recipe.asymmetricFg || 0.8;

    const coc = new Float32Array(w * h);
    let maxCoc = 0.001;

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const d = sampleMap(depthMap, mapW, mapH, x, y, w, h);
        let p = 0;
        if (personMask) {
          p = sampleMap(personMask, mapW, mapH, x, y, w, h);
        }

        let c = Math.abs(d - focus);

        // Asymmetric portrait DoF
        if (d > focus) c *= bgMul;
        else c *= fgMul;

        // Focal length stretches CoC
        c *= ff;

        // Aperture
        c *= aperture * 2.2;

        // Protect subject core (person near focus)
        if (p > 0.45) {
          const protect = (p - 0.45) / 0.55;
          // Stronger protection when depth is close to focus
          const nearFocus = 1 - clamp(Math.abs(d - focus) * 3, 0, 1);
          c *= 1 - protect * 0.85 * nearFocus;
        }

        c = clamp(c, 0, 1);
        coc[y * w + x] = c;
        if (c > maxCoc) maxCoc = c;
      }
    }

    // Normalize so aperture/scene always uses full 0..1 range when present,
    // then scale by strength
    if (opts.normalize !== false) {
      const inv = 1 / maxCoc;
      for (let i = 0; i < coc.length; i++) {
        coc[i] = clamp(coc[i] * inv * strength, 0, 1);
      }
    } else {
      for (let i = 0; i < coc.length; i++) {
        coc[i] = clamp(coc[i] * strength, 0, 1);
      }
    }

    return {
      coc: coc,
      recipe: recipe,
      focusDepth: focus,
      maxBlurScale: recipe.maxBlurScale || 1
    };
  }

  /**
   * Sample coc at pixel (same size assumed)
   */
  function sampleCoC(coc, w, h, x, y) {
    return coc[y * w + x] || 0;
  }

  global.HermioneCoC = {
    RECIPES: RECIPES,
    recipeById: recipeById,
    buildCoCMap: buildCoCMap,
    sampleMap: sampleMap,
    sampleCoC: sampleCoC
  };
})(typeof window !== 'undefined' ? window : globalThis);
