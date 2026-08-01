/**
 * Hermiona Looks — film stocks + analog cameras + lenses
 * Exposes window.HermionaLooks
 */
(function (global) {
  'use strict';

  function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  /** Build 256-entry LUT from control points [[x,y],...] x,y in 0..255 */
  function buildLUT(points) {
    const lut = new Uint8Array(256);
    if (!points || points.length < 2) {
      for (let i = 0; i < 256; i++) lut[i] = i;
      return lut;
    }
    const pts = points.slice().sort((a, b) => a[0] - b[0]);
    if (pts[0][0] > 0) pts.unshift([0, pts[0][1]]);
    if (pts[pts.length - 1][0] < 255) pts.push([255, pts[pts.length - 1][1]]);

    let j = 0;
    for (let i = 0; i < 256; i++) {
      while (j < pts.length - 2 && pts[j + 1][0] < i) j++;
      const p0 = pts[j];
      const p1 = pts[j + 1];
      const t = p1[0] === p0[0] ? 0 : (i - p0[0]) / (p1[0] - p0[0]);
      // smoothstep
      const s = t * t * (3 - 2 * t);
      lut[i] = clamp(Math.round(lerp(p0[1], p1[1], s)), 0, 255);
    }
    return lut;
  }

  // Cache compiled LUTs per film id
  const lutCache = {};

  function getFilmLUTs(film) {
    if (!film || film.id === 'none') return null;
    if (lutCache[film.id]) return lutCache[film.id];
    const luts = {
      r: buildLUT(film.curves && film.curves.r),
      g: buildLUT(film.curves && film.curves.g),
      b: buildLUT(film.curves && film.curves.b)
    };
    lutCache[film.id] = luts;
    return luts;
  }

  /**
   * FILM STOCKS — recognizable color science approximations
   */
  const FILMS = [
    {
      id: 'none',
      name: 'Original',
      swatch: 'linear-gradient(135deg,#888,#444)',
      desc: 'No film'
    },
    {
      id: 'portra400',
      name: 'Portra 400',
      swatch: 'linear-gradient(135deg,#e8c4a8,#c49a7a 40%,#8a9a88)',
      desc: 'Warm skin, soft contrast',
      curves: {
        r: [[0, 8], [64, 72], [128, 132], [192, 198], [255, 252]],
        g: [[0, 6], [64, 68], [128, 128], [192, 190], [255, 248]],
        b: [[0, 12], [64, 70], [128, 124], [192, 182], [255, 240]]
      },
      sat: -0.06,
      contrast: -0.04,
      warmth: 0.08,
      fade: 0.1,
      grain: 0.22,
      grainSize: 1.1,
      mono: false,
      halation: 0.08
    },
    {
      id: 'fuji400h',
      name: 'Fuji 400H',
      swatch: 'linear-gradient(135deg,#b8d4c8,#9ab8b0 45%,#d4c8b0)',
      desc: 'Airy, green-cyan shadows',
      curves: {
        r: [[0, 10], [64, 66], [128, 124], [192, 188], [255, 245]],
        g: [[0, 8], [64, 74], [128, 134], [192, 196], [255, 250]],
        b: [[0, 14], [64, 76], [128, 132], [192, 192], [255, 248]]
      },
      sat: -0.04,
      contrast: -0.08,
      warmth: -0.04,
      greenShadow: 0.06,
      fade: 0.12,
      grain: 0.18,
      grainSize: 1.0,
      mono: false,
      halation: 0.05
    },
    {
      id: 'kodakgold',
      name: 'Kodak Gold',
      swatch: 'linear-gradient(135deg,#f0c060,#e09040 50%,#c07050)',
      desc: 'Saturated consumer warmth',
      curves: {
        r: [[0, 4], [64, 70], [128, 138], [192, 205], [255, 255]],
        g: [[0, 4], [64, 66], [128, 128], [192, 188], [255, 248]],
        b: [[0, 8], [64, 60], [128, 115], [192, 170], [255, 230]]
      },
      sat: 0.18,
      contrast: 0.08,
      warmth: 0.16,
      fade: 0.04,
      grain: 0.2,
      grainSize: 0.9,
      mono: false,
      halation: 0.04
    },
    {
      id: 'cinestill800t',
      name: 'Cinestill 800T',
      swatch: 'linear-gradient(135deg,#1a2030,#4a6080 40%,#c04050)',
      desc: 'Tungsten night, red halo',
      curves: {
        r: [[0, 6], [64, 62], [128, 125], [192, 200], [255, 255]],
        g: [[0, 10], [64, 68], [128, 122], [192, 175], [255, 230]],
        b: [[0, 18], [64, 78], [128, 140], [192, 195], [255, 245]]
      },
      sat: 0.05,
      contrast: 0.06,
      warmth: -0.12,
      coolLift: 0.08,
      fade: 0.06,
      grain: 0.35,
      grainSize: 1.3,
      mono: false,
      halation: 0.45
    },
    {
      id: 'ilfordhp5',
      name: 'Ilford HP5',
      swatch: 'linear-gradient(135deg,#ddd,#888 50%,#222)',
      desc: 'Classic B&W grain',
      curves: {
        r: [[0, 5], [64, 58], [128, 128], [192, 198], [255, 250]],
        g: [[0, 5], [64, 58], [128, 128], [192, 198], [255, 250]],
        b: [[0, 5], [64, 58], [128, 128], [192, 198], [255, 250]]
      },
      sat: -1,
      contrast: 0.12,
      warmth: 0,
      fade: 0.05,
      grain: 0.48,
      grainSize: 1.4,
      mono: true,
      halation: 0
    },
    {
      id: 'superia800',
      name: 'Superia 800',
      swatch: 'linear-gradient(135deg,#60a060,#c0a060 50%,#d08070)',
      desc: 'Punchy, slight green cast',
      curves: {
        r: [[0, 6], [64, 68], [128, 130], [192, 200], [255, 252]],
        g: [[0, 8], [64, 74], [128, 136], [192, 198], [255, 248]],
        b: [[0, 10], [64, 64], [128, 120], [192, 178], [255, 238]]
      },
      sat: 0.14,
      contrast: 0.1,
      warmth: 0.04,
      greenShadow: 0.05,
      fade: 0.05,
      grain: 0.38,
      grainSize: 1.25,
      mono: false,
      halation: 0.06
    },
    {
      id: 'expired',
      name: 'Expired',
      swatch: 'linear-gradient(135deg,#c0a090,#708090 40%,#906060)',
      desc: 'Color shift, heavy grain',
      curves: {
        r: [[0, 18], [64, 78], [128, 135], [192, 195], [255, 245]],
        g: [[0, 12], [64, 62], [128, 118], [192, 175], [255, 230]],
        b: [[0, 22], [64, 80], [128, 128], [192, 170], [255, 220]]
      },
      sat: -0.12,
      contrast: -0.1,
      warmth: 0.1,
      magentaShift: 0.08,
      fade: 0.22,
      grain: 0.55,
      grainSize: 1.6,
      mono: false,
      halation: 0.12
    }
  ];

  /**
   * ANALOG CAMERA BODIES — optical / mechanical character
   */
  const CAMERAS = [
    {
      id: 'none',
      name: 'Clean',
      swatch: 'linear-gradient(135deg,#555,#333)',
      desc: 'No camera body'
    },
    {
      id: 'holga',
      name: 'Holga',
      swatch: 'linear-gradient(135deg,#2a1810 0%,#8a6040 40%,#1a1008 100%)',
      desc: 'Strong vignette, soft, light leak',
      vignette: 0.72,
      vignettePower: 1.4,
      soft: 0.22,
      contrast: -0.12,
      lightLeak: 0.35,
      leakHue: 'warm',
      edgeBlur: 0.15,
      // I6 spatial character (0..1)
      imperf: {
        softCorners: 0.75,
        leakEdge: 0.55,
        dust: 0.18,
        scratches: 0.12,
        gate: 0.35,
        uneven: 0.15,
        barrel: 0.28,
        lateralCA: 0.22,
        ghost: 0.08,
        stains: 0.06,
        border: 0,
        dateStamp: 0,
        halationBlur: 0.05,
        highlightRoll: 0.25
      }
    },
    {
      id: 'lomo',
      name: 'Lomo LC-A',
      swatch: 'linear-gradient(135deg,#201030,#c04080 45%,#2060a0)',
      desc: 'Cross-process, vignette',
      vignette: 0.55,
      vignettePower: 1.6,
      soft: 0.08,
      contrast: 0.15,
      sat: 0.25,
      crossProcess: 0.35,
      lightLeak: 0.12,
      leakHue: 'magenta',
      imperf: {
        softCorners: 0.45,
        leakEdge: 0.35,
        dust: 0.12,
        scratches: 0.08,
        gate: 0.22,
        uneven: 0.12,
        barrel: 0.12,
        lateralCA: 0.18,
        ghost: 0,
        stains: 0.04,
        border: 0,
        dateStamp: 0,
        halationBlur: 0.08,
        highlightRoll: 0.2
      }
    },
    {
      id: 'polaroid',
      name: 'Polaroid',
      swatch: 'linear-gradient(135deg,#e8e0d0,#c0b8a8 50%,#908878)',
      desc: 'Faded, cool shadows',
      vignette: 0.2,
      soft: 0.18,
      contrast: -0.15,
      fade: 0.28,
      coolShadows: 0.12,
      warmth: 0.06,
      sat: -0.15,
      imperf: {
        softCorners: 0.35,
        leakEdge: 0.08,
        dust: 0.1,
        scratches: 0.04,
        gate: 0.1,
        uneven: 0.08,
        barrel: 0.05,
        lateralCA: 0.08,
        ghost: 0,
        stains: 0.2,
        border: 0.85,
        dateStamp: 0,
        halationBlur: 0.12,
        highlightRoll: 0.45
      }
    },
    {
      id: 'disposable',
      name: 'Disposable',
      swatch: 'linear-gradient(135deg,#f0f0e8,#a0c0d0 50%,#806050)',
      desc: 'Flash vibe, cyan cast',
      vignette: 0.15,
      soft: 0.05,
      contrast: 0.12,
      sat: 0.08,
      cyanCast: 0.1,
      flashCenter: 0.18,
      grainBoost: 0.15,
      imperf: {
        softCorners: 0.4,
        leakEdge: 0.1,
        dust: 0.15,
        scratches: 0.1,
        gate: 0.18,
        uneven: 0.2,
        barrel: 0.15,
        lateralCA: 0.12,
        ghost: 0,
        stains: 0.05,
        border: 0,
        dateStamp: 0.9,
        halationBlur: 0.05,
        highlightRoll: 0.22
      }
    },
    {
      id: 'yashica',
      name: 'Yashica',
      swatch: 'linear-gradient(135deg,#3a3028,#c8b090 40%,#4a4038)',
      desc: 'Warm vintage glass',
      vignette: 0.38,
      vignettePower: 1.8,
      soft: 0.12,
      contrast: 0.05,
      warmth: 0.12,
      sat: -0.05,
      fade: 0.08,
      imperf: {
        softCorners: 0.28,
        leakEdge: 0.12,
        dust: 0.08,
        scratches: 0.05,
        gate: 0.15,
        uneven: 0.06,
        barrel: 0.08,
        lateralCA: 0.15,
        ghost: 0,
        stains: 0.04,
        border: 0,
        dateStamp: 0,
        halationBlur: 0.06,
        highlightRoll: 0.3
      }
    },
    {
      id: 'contax',
      name: 'Contax T2',
      swatch: 'linear-gradient(135deg,#2a2a30,#d0d0d8 50%,#4a4a50)',
      desc: 'Clean, light vignette, premium',
      vignette: 0.22,
      vignettePower: 2.2,
      soft: 0.03,
      contrast: 0.04,
      sat: 0.04,
      clarity: 0.06,
      imperf: {
        softCorners: 0.08,
        leakEdge: 0.04,
        dust: 0.04,
        scratches: 0.02,
        gate: 0.08,
        uneven: 0.03,
        barrel: 0.02,
        lateralCA: 0.06,
        ghost: 0,
        stains: 0,
        border: 0,
        dateStamp: 0,
        halationBlur: 0.03,
        highlightRoll: 0.35
      }
    }
  ];

  function filmById(id) {
    return FILMS.find((f) => f.id === id) || FILMS[0];
  }

  function cameraById(id) {
    return CAMERAS.find((c) => c.id === id) || CAMERAS[0];
  }

  // Static grain tile shared with character scaling
  let grainTile = null;
  const TILE = 256;

  function getGrainTile() {
    if (grainTile) return grainTile;
    grainTile = new Float32Array(TILE * TILE);
    for (let i = 0; i < grainTile.length; i++) {
      grainTile[i] = (Math.random() + Math.random() + Math.random()) / 3 - 0.5;
    }
    return grainTile;
  }

  /**
   * Apply film stock to pixel buffer (in-place).
   * @param {Uint8ClampedArray} data
   * @param {number} w
   * @param {number} h
   * @param {object} film
   * @param {number} intensity 0..1
   * @param {'static'|'random'} grainMode
   */
  function applyFilm(data, w, h, film, intensity, grainMode) {
    if (!film || film.id === 'none' || intensity <= 0) return;

    const t = clamp(intensity, 0, 1);
    const luts = getFilmLUTs(film);
    const satMul = 1 + (film.sat || 0) * t;
    const contrastMul = 1 + (film.contrast || 0) * t;
    const warmth = (film.warmth || 0) * t;
    const fade = (film.fade || 0) * t;
    const greenShadow = (film.greenShadow || 0) * t;
    const coolLift = (film.coolLift || 0) * t;
    const magentaShift = (film.magentaShift || 0) * t;
    const halation = (film.halation || 0) * t;
    const mono = film.mono || (film.sat === -1);

    for (let i = 0; i < data.length; i += 4) {
      let r = data[i];
      let g = data[i + 1];
      let b = data[i + 2];

      // Curves via LUT, blend by intensity
      if (luts) {
        const rr = luts.r[r];
        const gg = luts.g[g];
        const bb = luts.b[b];
        r = lerp(r, rr, t);
        g = lerp(g, gg, t);
        b = lerp(b, bb, t);
      }

      // Normalize
      let rf = r / 255;
      let gf = g / 255;
      let bf = b / 255;

      // Contrast around mid
      if (contrastMul !== 1) {
        rf = (rf - 0.5) * contrastMul + 0.5;
        gf = (gf - 0.5) * contrastMul + 0.5;
        bf = (bf - 0.5) * contrastMul + 0.5;
      }

      // Saturation / mono
      if (mono || satMul !== 1) {
        const gray = 0.2126 * rf + 0.7152 * gf + 0.0722 * bf;
        if (mono) {
          // Slight silver warmth
          rf = gray * (1 + 0.02 * t);
          gf = gray;
          bf = gray * (1 - 0.02 * t);
        } else {
          rf = gray + (rf - gray) * satMul;
          gf = gray + (gf - gray) * satMul;
          bf = gray + (bf - gray) * satMul;
        }
      }

      // Warmth
      if (warmth !== 0) {
        rf += warmth * 0.12;
        bf -= warmth * 0.1;
      }

      // Fuji-ish green shadows
      if (greenShadow !== 0) {
        const luma = 0.2126 * rf + 0.7152 * gf + 0.0722 * bf;
        if (luma < 0.45) {
          const a = greenShadow * (1 - luma / 0.45);
          gf += a * 0.1;
          bf += a * 0.04;
        }
      }

      // Cinestill cool mid lift
      if (coolLift !== 0) {
        bf += coolLift * 0.08;
        gf += coolLift * 0.02;
      }

      // Expired magenta
      if (magentaShift !== 0) {
        rf += magentaShift * 0.06;
        bf += magentaShift * 0.05;
        gf -= magentaShift * 0.03;
      }

      // Fade / lifted blacks
      if (fade > 0) {
        rf = lerp(rf, 1, fade * 0.08) * (1 - fade * 0.05) + fade * 0.12;
        gf = lerp(gf, 1, fade * 0.08) * (1 - fade * 0.05) + fade * 0.11;
        bf = lerp(bf, 1, fade * 0.08) * (1 - fade * 0.05) + fade * 0.1;
        // Lift floor
        rf = rf * (1 - fade * 0.15) + fade * 0.12;
        gf = gf * (1 - fade * 0.15) + fade * 0.11;
        bf = bf * (1 - fade * 0.15) + fade * 0.1;
      }

      // Halation — red/orange bleed in highlights (cheap, no blur)
      if (halation > 0) {
        const luma = 0.2126 * rf + 0.7152 * gf + 0.0722 * bf;
        if (luma > 0.55) {
          const a = ((luma - 0.55) / 0.45) * halation;
          rf = clamp(rf + a * 0.35, 0, 1.2);
          gf = clamp(gf + a * 0.08, 0, 1.2);
          // slight bloom on neighbors approximated by self glow
          bf = clamp(bf - a * 0.05, 0, 1.2);
        }
      }

      data[i] = clamp(rf * 255, 0, 255);
      data[i + 1] = clamp(gf * 255, 0, 255);
      data[i + 2] = clamp(bf * 255, 0, 255);
    }

    // Film grain
    const grainAmt = (film.grain || 0) * t;
    if (grainAmt > 0) {
      applyCharacterGrain(data, w, h, grainAmt, film.grainSize || 1, !!film.mono, grainMode);
    }
  }

  /**
   * Film grain scaled to a reference working size (~1600 long edge) so full-res
   * export keeps similar grain "size" and doesn't look like white noise / mush.
   */
  function applyCharacterGrain(data, w, h, amount, size, mono, mode) {
    const REF = 1600;
    const longEdge = Math.max(w, h) || REF;
    // Physical grain scale: >1 on full-res → coarser tile sampling
    const resScale = Math.max(0.5, longEdge / REF);
    // Slightly lower amplitude at very high res so JPEG doesn't ring
    const strength = amount * 42 * Math.sqrt(REF / longEdge);
    const grainSize = (size || 1) / resScale; // sample tile slower on big images
    const step = resScale > 1.6 ? Math.max(1, Math.round(resScale * 0.35)) : 1;

    if (mode === 'random') {
      for (let y = 0; y < h; y += step) {
        for (let x = 0; x < w; x += step) {
          const noise = (Math.random() - 0.5) * strength;
          for (let dy = 0; dy < step && y + dy < h; dy++) {
            for (let dx = 0; dx < step && x + dx < w; dx++) {
              const i = ((y + dy) * w + (x + dx)) * 4;
              const luma = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
              const mid = 1 - Math.abs(luma / 255 - 0.5) * 1.6;
              const n = noise * clamp(mid, 0.3, 1);
              if (mono) {
                data[i] = clamp(data[i] + n, 0, 255);
                data[i + 1] = clamp(data[i + 1] + n, 0, 255);
                data[i + 2] = clamp(data[i + 2] + n, 0, 255);
              } else {
                data[i] = clamp(data[i] + n * 1.05, 0, 255);
                data[i + 1] = clamp(data[i + 1] + n, 0, 255);
                data[i + 2] = clamp(data[i + 2] + n * 0.95, 0, 255);
              }
            }
          }
        }
      }
      return;
    }

    const tile = getGrainTile();
    for (let y = 0; y < h; y++) {
      const ty = Math.floor(y * grainSize) % TILE;
      const tyN = ty < 0 ? ty + TILE : ty;
      for (let x = 0; x < w; x++) {
        const tx = Math.floor(x * grainSize) % TILE;
        const txN = tx < 0 ? tx + TILE : tx;
        const noise = tile[tyN * TILE + txN] * strength;
        const i = (y * w + x) * 4;
        const luma = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
        const mid = 1 - Math.abs(luma / 255 - 0.5) * 1.6;
        const n = noise * clamp(mid, 0.3, 1);
        data[i] = clamp(data[i] + n, 0, 255);
        data[i + 1] = clamp(data[i + 1] + n, 0, 255);
        data[i + 2] = clamp(data[i + 2] + n, 0, 255);
      }
    }
  }

  /**
   * Apply analog camera body character (in-place).
   */
  function applyCamera(data, w, h, camera, intensity) {
    if (!camera || camera.id === 'none' || intensity <= 0) return;

    const t = clamp(intensity, 0, 1);
    const cx = w / 2;
    const cy = h / 2;
    const maxDist = Math.sqrt(cx * cx + cy * cy);

    const vig = (camera.vignette || 0) * t;
    const vigPow = camera.vignettePower || 1.6;
    const soft = (camera.soft || 0) * t;
    const contrast = 1 + (camera.contrast || 0) * t;
    const sat = 1 + (camera.sat || 0) * t;
    const fade = (camera.fade || 0) * t;
    const warmth = (camera.warmth || 0) * t;
    const coolShadows = (camera.coolShadows || 0) * t;
    const cyanCast = (camera.cyanCast || 0) * t;
    const flashCenter = (camera.flashCenter || 0) * t;
    const cross = (camera.crossProcess || 0) * t;
    const leak = (camera.lightLeak || 0) * t;
    const leakHue = camera.leakHue || 'warm';
    const clarity = (camera.clarity || 0) * t;

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        let r = data[i] / 255;
        let g = data[i + 1] / 255;
        let b = data[i + 2] / 255;

        const dx = (x - cx) / maxDist;
        const dy = (y - cy) / maxDist;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // Soft / reduced microcontrast (global approx)
        if (soft > 0) {
          r = lerp(r, 0.5, soft * 0.15);
          g = lerp(g, 0.5, soft * 0.15);
          b = lerp(b, 0.5, soft * 0.15);
          // pull toward local mid
          r = (r - 0.5) * (1 - soft * 0.35) + 0.5;
          g = (g - 0.5) * (1 - soft * 0.35) + 0.5;
          b = (b - 0.5) * (1 - soft * 0.35) + 0.5;
        }

        if (contrast !== 1) {
          r = (r - 0.5) * contrast + 0.5;
          g = (g - 0.5) * contrast + 0.5;
          b = (b - 0.5) * contrast + 0.5;
        }

        if (clarity !== 0) {
          const mid = 1 - Math.abs((0.2126 * r + 0.7152 * g + 0.0722 * b) - 0.5) * 2;
          const f = 1 + clarity * 0.4 * mid;
          r = (r - 0.5) * f + 0.5;
          g = (g - 0.5) * f + 0.5;
          b = (b - 0.5) * f + 0.5;
        }

        if (sat !== 1) {
          const gray = 0.2126 * r + 0.7152 * g + 0.0722 * b;
          r = gray + (r - gray) * sat;
          g = gray + (g - gray) * sat;
          b = gray + (b - gray) * sat;
        }

        // Lomo cross-process: push greens/mags, crush
        if (cross > 0) {
          r = r + cross * 0.08 * (r - 0.5);
          g = g + cross * 0.12 * Math.sin(g * Math.PI);
          b = b - cross * 0.06 * (b - 0.3);
          // shadow green, highlight magenta
          const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
          if (luma < 0.4) {
            g += cross * 0.08 * (1 - luma / 0.4);
            b += cross * 0.04 * (1 - luma / 0.4);
          } else if (luma > 0.6) {
            r += cross * 0.1 * ((luma - 0.6) / 0.4);
            b += cross * 0.06 * ((luma - 0.6) / 0.4);
          }
        }

        if (warmth !== 0) {
          r += warmth * 0.1;
          b -= warmth * 0.08;
        }

        if (coolShadows !== 0) {
          const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
          if (luma < 0.5) {
            const a = coolShadows * (1 - luma * 2);
            b += a * 0.1;
            g += a * 0.03;
            r -= a * 0.04;
          }
        }

        if (cyanCast !== 0) {
          g += cyanCast * 0.04;
          b += cyanCast * 0.08;
          r -= cyanCast * 0.03;
        }

        // Disposable "flash" center lift
        if (flashCenter > 0) {
          const center = 1 - clamp(dist * 1.4, 0, 1);
          const a = flashCenter * center * center;
          r += a * 0.12;
          g += a * 0.11;
          b += a * 0.1;
        }

        if (fade > 0) {
          r = r * (1 - fade * 0.2) + fade * 0.15;
          g = g * (1 - fade * 0.2) + fade * 0.14;
          b = b * (1 - fade * 0.2) + fade * 0.13;
        }

        // Optical vignette
        if (vig > 0) {
          const factor = 1 - Math.pow(dist, vigPow) * vig * 1.35;
          r *= factor;
          g *= factor;
          b *= factor;
        }

        // Light leak — warm/magenta gradient from corners
        if (leak > 0) {
          // Top-right warm leak + slight bottom-left
          const leak1 = Math.pow(clamp((x / w) * 0.7 + (1 - y / h) * 0.5 - 0.4, 0, 1), 2);
          const leak2 = Math.pow(clamp((1 - x / w) * 0.4 + (y / h) * 0.3 - 0.5, 0, 1), 2) * 0.5;
          const L = (leak1 + leak2) * leak;
          if (leakHue === 'magenta') {
            r += L * 0.45;
            b += L * 0.28;
            g += L * 0.05;
          } else {
            r += L * 0.5;
            g += L * 0.22;
            b += L * 0.04;
          }
        }

        data[i] = clamp(r * 255, 0, 255);
        data[i + 1] = clamp(g * 255, 0, 255);
        data[i + 2] = clamp(b * 255, 0, 255);
      }
    }

    // Extra grain for disposable
    if ((camera.grainBoost || 0) * t > 0) {
      applyCharacterGrain(data, w, h, camera.grainBoost * t, 1.1, false, 'static');
    }
  }

  /**
   * LENSES — optical character (2D approximations)
   */
  const LENSES = [
    {
      id: 'none',
      name: 'No lens',
      swatch: 'linear-gradient(135deg,#666,#333)',
      desc: 'Neutral glass'
    },
    {
      id: 'standard',
      name: 'Standard',
      swatch: 'radial-gradient(circle,#c8c8c8 0%,#3a3a3a 100%)',
      desc: 'Mild optical vignette',
      vignette: 0.28,
      vignettePower: 2.4,
      soft: 0.02,
      bloom: 0.04,
      ca: 0.05,
      warmth: 0
    },
    {
      id: 'soft',
      name: 'Soft Focus',
      swatch: 'radial-gradient(circle,#f0e8e0 0%,#a09088 55%,#403830 100%)',
      desc: 'Glow, reduced microcontrast',
      vignette: 0.12,
      vignettePower: 2.0,
      soft: 0.42,
      bloom: 0.55,
      ca: 0.08,
      warmth: 0.04,
      microContrast: -0.25
    },
    {
      id: 'vintage',
      name: 'Vintage',
      swatch: 'radial-gradient(circle,#e0c8a0 0%,#806040 50%,#201810 100%)',
      desc: 'Soft + warm + CA',
      vignette: 0.48,
      vignettePower: 1.7,
      soft: 0.22,
      bloom: 0.2,
      ca: 0.28,
      warmth: 0.14,
      edgeSoft: 0.2
    },
    {
      id: 'dream',
      name: 'Dream',
      swatch: 'radial-gradient(circle,#fff0f8 0%,#d0a0c0 40%,#302028 100%)',
      desc: 'Strong bloom, ethereal',
      vignette: 0.18,
      vignettePower: 1.9,
      soft: 0.35,
      bloom: 0.75,
      ca: 0.12,
      warmth: 0.06,
      microContrast: -0.35,
      highlightLift: 0.1
    },
    {
      id: 'anamorphic',
      name: 'Anamorphic',
      swatch: 'linear-gradient(90deg,#201828,#80c0e0 30%,#fff 50%,#e080a0 70%,#181020)',
      desc: 'Horizontal flare, oval vignette',
      vignette: 0.4,
      vignettePower: 1.5,
      ovalVignette: 1.35,
      soft: 0.08,
      bloom: 0.25,
      ca: 0.18,
      anamorphicFlare: 0.55,
      warmth: 0.02
    },
    {
      id: 'harsh',
      name: 'Clinical',
      swatch: 'radial-gradient(circle,#ffffff 0%,#b0b0b8 70%,#606068 100%)',
      desc: 'Sharp, clean corners',
      vignette: -0.08,
      vignettePower: 2.0,
      soft: 0,
      bloom: 0,
      ca: 0.02,
      microContrast: 0.22,
      clarity: 0.18,
      sat: 0.06
    }
  ];

  function lensById(id) {
    return LENSES.find((l) => l.id === id) || LENSES[0];
  }

  /**
   * CURATED PRESETS — film + body + lens + light grade
   * Globally familiar recipes for photo enthusiasts (VSCO / analog culture).
   * params are relative base-grade tweaks applied on top of engine defaults.
   */
  const PRESET_CATEGORIES = [
    { id: 'all', name: 'All' },
    { id: 'portrait', name: 'Portrait' },
    { id: 'street', name: 'Street' },
    { id: 'night', name: 'Night' },
    { id: 'film', name: 'Film' },
    { id: 'bw', name: 'B&W' },
    { id: 'retro', name: 'Retro' },
    { id: 'clean', name: 'Clean' }
  ];

  const PRESETS = [
    {
      id: 'none',
      name: 'Original',
      category: 'clean',
      desc: 'No look',
      recipe: '—',
      swatch: 'linear-gradient(135deg,#8a8a8e,#3a3a3c)',
      film: 'none',
      camera: 'none',
      lens: 'none',
      filmIntensity: 100,
      cameraIntensity: 100,
      lensIntensity: 100,
      bloom: 0,
      ca: 0,
      params: {}
    },
    // —— PORTRAIT ——
    {
      id: 'portra-portrait',
      name: 'Portra Portrait',
      category: 'portrait',
      desc: 'Classic warm skin',
      recipe: 'Portra 400 · Contax · Soft',
      swatch: 'linear-gradient(145deg,#f0d2bc 0%,#d4a888 45%,#8a9a88 100%)',
      film: 'portra400',
      camera: 'contax',
      lens: 'soft',
      filmIntensity: 100,
      cameraIntensity: 55,
      lensIntensity: 48,
      bloom: 28,
      ca: 6,
      params: {
        exposure: 0.08,
        contrast: -8,
        highlights: -18,
        shadows: 12,
        temperature: 10,
        vibrance: 8,
        clarity: -8,
        sharpen: 5
      }
    },
    {
      id: 'fuji-wedding',
      name: 'Fuji Wedding',
      category: 'portrait',
      desc: 'Airy pastel',
      recipe: 'Fuji 400H · Contax · Soft',
      swatch: 'linear-gradient(145deg,#d8ece4 0%,#b0c8c0 50%,#e8dcc8 100%)',
      film: 'fuji400h',
      camera: 'contax',
      lens: 'soft',
      filmIntensity: 100,
      cameraIntensity: 45,
      lensIntensity: 42,
      bloom: 22,
      ca: 5,
      params: {
        exposure: 0.12,
        contrast: -12,
        highlights: -12,
        shadows: 15,
        temperature: -4,
        tint: 4,
        vibrance: 6,
        clarity: -10
      }
    },
    {
      id: 'soft-dream',
      name: 'Soft Dream',
      category: 'portrait',
      desc: 'Romantic glow',
      recipe: 'Portra · Polaroid · Dream',
      swatch: 'linear-gradient(145deg,#fff0f4 0%,#e8c0c8 40%,#a88890 100%)',
      film: 'portra400',
      camera: 'polaroid',
      lens: 'dream',
      filmIntensity: 85,
      cameraIntensity: 70,
      lensIntensity: 75,
      bloom: 55,
      ca: 10,
      params: {
        exposure: 0.15,
        contrast: -18,
        highlights: -8,
        shadows: 18,
        temperature: 12,
        vibrance: -5,
        clarity: -18,
        vignette: 12
      }
    },
    // —— STREET / EVERYDAY ——
    {
      id: 'gold-hour',
      name: 'Gold Hour',
      category: 'film',
      desc: 'Summer, saturated warm',
      recipe: 'Kodak Gold · Yashica · Vintage',
      swatch: 'linear-gradient(145deg,#ffd070 0%,#e88840 50%,#a05840 100%)',
      film: 'kodakgold',
      camera: 'yashica',
      lens: 'vintage',
      filmIntensity: 100,
      cameraIntensity: 75,
      lensIntensity: 70,
      bloom: 18,
      ca: 18,
      params: {
        exposure: 0.05,
        contrast: 8,
        highlights: -10,
        shadows: 6,
        temperature: 22,
        saturation: 8,
        vibrance: 12,
        clarity: 5
      }
    },
    {
      id: 'superia-pop',
      name: 'Superia Pop',
      category: 'street',
      desc: 'Punchy consumer color',
      recipe: 'Superia 800 · Disposable',
      swatch: 'linear-gradient(145deg,#70c070 0%,#e0b060 50%,#e07060 100%)',
      film: 'superia800',
      camera: 'disposable',
      lens: 'standard',
      filmIntensity: 100,
      cameraIntensity: 85,
      lensIntensity: 60,
      bloom: 8,
      ca: 8,
      params: {
        contrast: 12,
        highlights: -5,
        shadows: 5,
        saturation: 10,
        vibrance: 15,
        clarity: 12,
        sharpen: 10
      }
    },
    {
      id: 'analog-street',
      name: 'Analog Street',
      category: 'street',
      desc: 'Everyday 35mm vibe',
      recipe: 'Superia · Yashica · Standard',
      swatch: 'linear-gradient(145deg,#6a8a60 0%,#c8a878 55%,#5a5048 100%)',
      film: 'superia800',
      camera: 'yashica',
      lens: 'standard',
      filmIntensity: 95,
      cameraIntensity: 80,
      lensIntensity: 65,
      bloom: 10,
      ca: 10,
      params: {
        contrast: 6,
        highlights: -12,
        shadows: 8,
        temperature: 6,
        vibrance: 8,
        clarity: 8,
        vignette: 10
      }
    },
    {
      id: 'disposable-flash',
      name: 'Disposable Flash',
      category: 'street',
      desc: 'Party flash, cyan cast',
      recipe: 'Gold · Disposable',
      swatch: 'linear-gradient(145deg,#f8f0e0 0%,#90b8c8 45%,#806050 100%)',
      film: 'kodakgold',
      camera: 'disposable',
      lens: 'standard',
      filmIntensity: 90,
      cameraIntensity: 100,
      lensIntensity: 50,
      bloom: 12,
      ca: 6,
      params: {
        exposure: 0.1,
        contrast: 15,
        highlights: 5,
        shadows: -5,
        temperature: -6,
        tint: -4,
        saturation: 6,
        clarity: 10,
        grain: 8
      }
    },
    // —— NIGHT / CINE ——
    {
      id: 'tokyo-night',
      name: 'Tokyo Night',
      category: 'night',
      desc: 'Tungsten + red halo',
      recipe: 'Cinestill 800T · Contax · Anamo',
      swatch: 'linear-gradient(145deg,#121828 0%,#3a5080 40%,#c03040 100%)',
      film: 'cinestill800t',
      camera: 'contax',
      lens: 'anamorphic',
      filmIntensity: 100,
      cameraIntensity: 40,
      lensIntensity: 85,
      bloom: 32,
      ca: 22,
      params: {
        exposure: -0.1,
        contrast: 10,
        highlights: -8,
        shadows: 10,
        temperature: -18,
        tint: 4,
        vibrance: 10,
        clarity: 5,
        vignette: 18
      }
    },
    {
      id: 'cine-wide',
      name: 'Cine Wide',
      category: 'night',
      desc: 'Cinematic wide look',
      recipe: 'Cinestill · Anamorphic',
      swatch: 'linear-gradient(90deg,#181420 0%,#60a0c0 35%,#f0f0f0 50%,#d06080 70%,#181018 100%)',
      film: 'cinestill800t',
      camera: 'none',
      lens: 'anamorphic',
      filmIntensity: 95,
      cameraIntensity: 0,
      lensIntensity: 100,
      bloom: 40,
      ca: 25,
      params: {
        exposure: -0.05,
        contrast: 8,
        highlights: -15,
        shadows: 12,
        temperature: -12,
        saturation: -4,
        clarity: -4,
        vignette: 22
      }
    },
    {
      id: 'neon-lomo',
      name: 'Neon Lomo',
      category: 'night',
      desc: 'Cross-process night',
      recipe: 'Superia · Lomo · Dream',
      swatch: 'linear-gradient(145deg,#201030 0%,#c040a0 40%,#2080c0 100%)',
      film: 'superia800',
      camera: 'lomo',
      lens: 'dream',
      filmIntensity: 90,
      cameraIntensity: 100,
      lensIntensity: 60,
      bloom: 45,
      ca: 14,
      params: {
        contrast: 18,
        highlights: -5,
        shadows: 8,
        saturation: 20,
        vibrance: 18,
        clarity: 8,
        vignette: 28
      }
    },
    // —— B&W ——
    {
      id: 'hp5-street',
      name: 'HP5 Street',
      category: 'bw',
      desc: 'Classic street B&W',
      recipe: 'Ilford HP5 · Contax · Clinical',
      swatch: 'linear-gradient(145deg,#f0f0f0 0%,#888 50%,#1a1a1a 100%)',
      film: 'ilfordhp5',
      camera: 'contax',
      lens: 'harsh',
      filmIntensity: 100,
      cameraIntensity: 50,
      lensIntensity: 55,
      bloom: 0,
      ca: 2,
      params: {
        contrast: 18,
        highlights: -12,
        shadows: 8,
        clarity: 20,
        sharpen: 18,
        grain: 5,
        vignette: 8
      }
    },
    {
      id: 'moody-bw',
      name: 'Moody B&W',
      category: 'bw',
      desc: 'Dark, grain, vignette',
      recipe: 'HP5 · Holga · Vintage',
      swatch: 'linear-gradient(145deg,#c8c8c8 0%,#555 45%,#0e0e10 100%)',
      film: 'ilfordhp5',
      camera: 'holga',
      lens: 'vintage',
      filmIntensity: 100,
      cameraIntensity: 90,
      lensIntensity: 55,
      bloom: 8,
      ca: 12,
      params: {
        exposure: -0.15,
        contrast: 22,
        highlights: -20,
        shadows: 5,
        clarity: 15,
        sharpen: 10,
        vignette: 25
      }
    },
    {
      id: 'documentary-bw',
      name: 'Documentary',
      category: 'bw',
      desc: 'Clean documentary B&W',
      recipe: 'HP5 · Contax · Standard',
      swatch: 'linear-gradient(145deg,#e8e8e8 0%,#9a9a9a 50%,#2c2c2c 100%)',
      film: 'ilfordhp5',
      camera: 'contax',
      lens: 'standard',
      filmIntensity: 90,
      cameraIntensity: 40,
      lensIntensity: 50,
      bloom: 0,
      ca: 4,
      params: {
        contrast: 10,
        highlights: -8,
        shadows: 10,
        clarity: 12,
        sharpen: 12,
        vignette: 5
      }
    },
    // —— RETRO / TOY ——
    {
      id: 'holga-dream',
      name: 'Holga Dream',
      category: 'retro',
      desc: 'Toy camera, light leak',
      recipe: 'Expired · Holga · Soft',
      swatch: 'linear-gradient(145deg,#2a1810 0%,#a07050 40%,#1a1008 100%)',
      film: 'expired',
      camera: 'holga',
      lens: 'soft',
      filmIntensity: 90,
      cameraIntensity: 100,
      lensIntensity: 55,
      bloom: 25,
      ca: 10,
      params: {
        contrast: -10,
        highlights: -5,
        shadows: 10,
        temperature: 14,
        saturation: -8,
        clarity: -12,
        vignette: 15
      }
    },
    {
      id: 'lomo-party',
      name: 'Lomo Party',
      category: 'retro',
      desc: 'Hypercolor LC-A',
      recipe: 'Superia · Lomo · Dream',
      swatch: 'linear-gradient(145deg,#301848 0%,#e04090 45%,#30a0e0 100%)',
      film: 'superia800',
      camera: 'lomo',
      lens: 'dream',
      filmIntensity: 85,
      cameraIntensity: 100,
      lensIntensity: 50,
      bloom: 35,
      ca: 12,
      params: {
        contrast: 20,
        saturation: 22,
        vibrance: 20,
        clarity: 10,
        vignette: 30
      }
    },
    {
      id: 'polaroid-fade',
      name: 'Polaroid Fade',
      category: 'retro',
      desc: 'Instant film, faded',
      recipe: 'Fuji 400H · Polaroid · Soft',
      swatch: 'linear-gradient(145deg,#f0e8d8 0%,#c0b8a8 50%,#807868 100%)',
      film: 'fuji400h',
      camera: 'polaroid',
      lens: 'soft',
      filmIntensity: 80,
      cameraIntensity: 100,
      lensIntensity: 50,
      bloom: 20,
      ca: 6,
      params: {
        exposure: 0.1,
        contrast: -20,
        highlights: -5,
        shadows: 15,
        temperature: 8,
        saturation: -12,
        clarity: -15,
        vignette: 8
      }
    },
    {
      id: 'expired-shift',
      name: 'Expired Shift',
      category: 'retro',
      desc: 'Color shift, heavy grain',
      recipe: 'Expired · Yashica · Vintage',
      swatch: 'linear-gradient(145deg,#c8a898 0%,#708090 45%,#805050 100%)',
      film: 'expired',
      camera: 'yashica',
      lens: 'vintage',
      filmIntensity: 100,
      cameraIntensity: 70,
      lensIntensity: 75,
      bloom: 15,
      ca: 22,
      params: {
        contrast: -8,
        temperature: 12,
        tint: 10,
        saturation: -10,
        clarity: -8,
        vignette: 16
      }
    },
    // —— CLEAN / PRO ——
    {
      id: 'contax-clean',
      name: 'Contax Clean',
      category: 'clean',
      desc: 'Premium point-and-shoot',
      recipe: 'Portra · Contax · Standard',
      swatch: 'linear-gradient(145deg,#e8e8ec 0%,#b0b0b8 50%,#4a4a50 100%)',
      film: 'portra400',
      camera: 'contax',
      lens: 'standard',
      filmIntensity: 70,
      cameraIntensity: 80,
      lensIntensity: 55,
      bloom: 6,
      ca: 6,
      params: {
        exposure: 0.05,
        contrast: 4,
        highlights: -10,
        shadows: 8,
        temperature: 4,
        vibrance: 6,
        clarity: 6,
        sharpen: 8
      }
    },
    {
      id: 'clinical',
      name: 'Clinical',
      category: 'clean',
      desc: 'Sharp, commercial',
      recipe: 'No film · Clinical',
      swatch: 'linear-gradient(145deg,#ffffff 0%,#c8c8d0 60%,#606068 100%)',
      film: 'none',
      camera: 'contax',
      lens: 'harsh',
      filmIntensity: 0,
      cameraIntensity: 45,
      lensIntensity: 90,
      bloom: 0,
      ca: 2,
      params: {
        contrast: 10,
        highlights: -8,
        shadows: 5,
        saturation: 5,
        vibrance: 10,
        clarity: 22,
        sharpen: 25
      }
    },
    {
      id: 'matte-film',
      name: 'Matte Film',
      category: 'film',
      desc: 'Lifted blacks, film grade',
      recipe: 'Portra · Polaroid · Standard',
      swatch: 'linear-gradient(145deg,#e0d4c8 0%,#a89888 50%,#5a5048 100%)',
      film: 'portra400',
      camera: 'polaroid',
      lens: 'standard',
      filmIntensity: 85,
      cameraIntensity: 75,
      lensIntensity: 45,
      bloom: 8,
      ca: 5,
      params: {
        contrast: -15,
        highlights: -10,
        shadows: 18,
        blacks: 12,
        temperature: 6,
        saturation: -6,
        clarity: -6,
        vignette: 10
      }
    },
    {
      id: 'teal-orange',
      name: 'Teal & Orange',
      category: 'film',
      desc: 'Blockbuster grade vibe',
      recipe: 'Cinestill · Contax · Standard',
      swatch: 'linear-gradient(145deg,#1a4050 0%,#c07040 55%,#e8a060 100%)',
      film: 'cinestill800t',
      camera: 'contax',
      lens: 'standard',
      filmIntensity: 65,
      cameraIntensity: 50,
      lensIntensity: 55,
      bloom: 12,
      ca: 10,
      params: {
        contrast: 12,
        highlights: -12,
        shadows: 8,
        temperature: 8,
        tint: -12,
        saturation: 8,
        vibrance: 14,
        clarity: 8,
        vignette: 12
      }
    }
  ];

  function presetById(id) {
    return PRESETS.find((p) => p.id === id) || PRESETS[0];
  }

  function presetsByCategory(cat) {
    if (!cat || cat === 'all') return PRESETS.slice();
    return PRESETS.filter((p) => p.category === cat || p.id === 'none');
  }

  function sampleBilinear(src, w, h, x, y, c) {
    // c = 0,1,2 for R,G,B
    x = clamp(x, 0, w - 1.001);
    y = clamp(y, 0, h - 1.001);
    const x0 = Math.floor(x);
    const y0 = Math.floor(y);
    const x1 = Math.min(x0 + 1, w - 1);
    const y1 = Math.min(y0 + 1, h - 1);
    const fx = x - x0;
    const fy = y - y0;
    const i00 = (y0 * w + x0) * 4 + c;
    const i10 = (y0 * w + x1) * 4 + c;
    const i01 = (y1 * w + x0) * 4 + c;
    const i11 = (y1 * w + x1) * 4 + c;
    const a = src[i00] * (1 - fx) + src[i10] * fx;
    const b = src[i01] * (1 - fx) + src[i11] * fx;
    return a * (1 - fy) + b * fy;
  }

  /** Separable box blur for one channel. src/out are RGBA-stride float or byte buffers. */
  function boxBlurChannel(src, out, w, h, radius, channel) {
    const r = Math.max(1, radius | 0);
    const tmp = new Float32Array(w * h);

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        let sum = 0;
        let count = 0;
        for (let k = -r; k <= r; k++) {
          const xx = clamp(x + k, 0, w - 1);
          sum += src[(y * w + xx) * 4 + channel];
          count++;
        }
        tmp[y * w + x] = sum / count;
      }
    }

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        let sum = 0;
        let count = 0;
        for (let k = -r; k <= r; k++) {
          const yy = clamp(y + k, 0, h - 1);
          sum += tmp[yy * w + x];
          count++;
        }
        out[(y * w + x) * 4 + channel] = sum / count;
      }
    }
  }

  /**
   * Bloom: extract highlights → blur → screen blend.
   * quality 'preview' uses smaller radius / optional skip multi-pass.
   * @param {Float32Array|null} cocMap — if set, bloom weight = 0.15 + 0.85*coc (in-focus stays clean)
   */
  function applyBloom(data, w, h, amount, quality, cocMap) {
    if (amount <= 0.01) return;

    function cocW(i) {
      if (!cocMap) return 1;
      // In focus ≈ minimal bloom; OOF gets full bloom
      return 0.12 + 0.88 * (cocMap[i] || 0);
    }

    // Lightweight path: no blur, just local highlight glow (fast)
    if (quality === 'preview' && amount < 0.35) {
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i] / 255;
        const g = data[i + 1] / 255;
        const b = data[i + 2] / 255;
        const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
        if (luma > 0.55) {
          const a = ((luma - 0.55) / 0.45) * amount * 0.55 * cocW(i >> 2);
          data[i] = clamp((r + a * 0.9) * 255, 0, 255);
          data[i + 1] = clamp((g + a * 0.85) * 255, 0, 255);
          data[i + 2] = clamp((b + a * 0.8) * 255, 0, 255);
        }
      }
      return;
    }

    // Full-ish: downsample-style by larger blur radius
    const radius = quality === 'export' ? Math.round(4 + amount * 8) : Math.round(2 + amount * 4);
    const thr = 0.55;

    // Snapshot pre-bloom for coc-weighted blend
    const before = cocMap ? new Uint8ClampedArray(data) : null;

    const hi = new Float32Array(data.length);
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i] / 255;
      const g = data[i + 1] / 255;
      const b = data[i + 2] / 255;
      const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      const m = luma > thr ? (luma - thr) / (1 - thr) : 0;
      hi[i] = r * m;
      hi[i + 1] = g * m;
      hi[i + 2] = b * m;
      hi[i + 3] = 0;
    }

    const blurred = new Float32Array(data.length);
    if (quality === 'preview') {
      boxBlurChannel(hi, blurred, w, h, radius, 0);
      for (let i = 0; i < data.length; i += 4) {
        const glow = blurred[i] * amount * 1.4;
        const r = data[i] / 255;
        const g = data[i + 1] / 255;
        const b = data[i + 2] / 255;
        data[i] = clamp((1 - (1 - r) * (1 - glow * 1.0)) * 255, 0, 255);
        data[i + 1] = clamp((1 - (1 - g) * (1 - glow * 0.92)) * 255, 0, 255);
        data[i + 2] = clamp((1 - (1 - b) * (1 - glow * 0.85)) * 255, 0, 255);
      }
    } else {
      boxBlurChannel(hi, blurred, w, h, radius, 0);
      boxBlurChannel(hi, blurred, w, h, radius, 1);
      boxBlurChannel(hi, blurred, w, h, radius, 2);
      for (let i = 0; i < data.length; i += 4) {
        const gr = blurred[i] * amount * 1.35;
        const gg = blurred[i + 1] * amount * 1.35;
        const gb = blurred[i + 2] * amount * 1.35;
        const r = data[i] / 255;
        const g = data[i + 1] / 255;
        const b = data[i + 2] / 255;
        data[i] = clamp((1 - (1 - r) * (1 - gr)) * 255, 0, 255);
        data[i + 1] = clamp((1 - (1 - g) * (1 - gg)) * 255, 0, 255);
        data[i + 2] = clamp((1 - (1 - b) * (1 - gb)) * 255, 0, 255);
      }
    }

    // Blend back toward pre-bloom using CoC (in-focus keeps sharp highlights)
    if (before && cocMap) {
      for (let i = 0; i < w * h; i++) {
        const t = cocW(i);
        const pi = i * 4;
        data[pi] = lerp(before[pi], data[pi], t);
        data[pi + 1] = lerp(before[pi + 1], data[pi + 1], t);
        data[pi + 2] = lerp(before[pi + 2], data[pi + 2], t);
      }
    }
  }

  /**
   * Radial chromatic aberration — R outward, B inward.
   * @param {Float32Array|null} cocMap — shift *= (0.25 + 0.75*coc)
   */
  function applyChromaticAberration(data, w, h, amount, cocMap) {
    if (amount <= 0.01) return;
    const src = new Uint8ClampedArray(data);
    const cx = (w - 1) / 2;
    const cy = (h - 1) / 2;
    const maxDist = Math.sqrt(cx * cx + cy * cy) || 1;
    const maxShift = amount * Math.min(w, h) * 0.012;

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = y * w + x;
        const dx = x - cx;
        const dy = y - cy;
        const dist = Math.sqrt(dx * dx + dy * dy) / maxDist;
        let shift = maxShift * dist * dist;
        if (cocMap) {
          shift *= 0.22 + 0.78 * (cocMap[idx] || 0);
        }
        if (shift < 0.05) {
          continue; // skip near-zero work on focus plane
        }
        const len = Math.sqrt(dx * dx + dy * dy) || 1;
        const ux = dx / len;
        const uy = dy / len;

        const i = idx * 4;
        const r = sampleBilinear(src, w, h, x + ux * shift, y + uy * shift, 0);
        const g = src[i + 1];
        const b = sampleBilinear(src, w, h, x - ux * shift, y - uy * shift, 2);
        data[i] = r;
        data[i + 1] = g;
        data[i + 2] = b;
      }
    }
  }

  /**
   * Horizontal anamorphic streak from bright points (cheap scanline max + spread).
   */
  function applyAnamorphicFlare(data, w, h, amount) {
    if (amount <= 0.01) return;

    // Find bright horizontal energy per row, spread horizontally
    const rowEnergy = new Float32Array(h);
    for (let y = 0; y < h; y++) {
      let e = 0;
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        const luma = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
        if (luma > 200) e += (luma - 200) / 55;
      }
      rowEnergy[y] = Math.min(e / (w * 0.02), 1);
    }

    // Soft vertical blur of energy
    const smooth = new Float32Array(h);
    for (let y = 0; y < h; y++) {
      let s = 0;
      let c = 0;
      for (let k = -3; k <= 3; k++) {
        const yy = clamp(y + k, 0, h - 1);
        s += rowEnergy[yy];
        c++;
      }
      smooth[y] = s / c;
    }

    const cx = w / 2;
    for (let y = 0; y < h; y++) {
      const e = smooth[y] * amount;
      if (e < 0.01) continue;
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        // Horizontal falloff from center + slight from bright side
        const hx = 1 - Math.abs(x - cx) / cx;
        const streak = e * Math.pow(Math.max(hx, 0), 0.45) * 0.22;
        // Cyan-magenta tinted streak
        data[i] = clamp(data[i] + streak * 180 * 0.7, 0, 255);
        data[i + 1] = clamp(data[i + 1] + streak * 180 * 0.85, 0, 255);
        data[i + 2] = clamp(data[i + 2] + streak * 180 * 1.0, 0, 255);
      }
    }
  }

  /**
   * Apply lens character.
   * @param {Uint8ClampedArray} data
   * @param {number} w
   * @param {number} h
   * @param {object} lens
   * @param {number} intensity 0..1
   * @param {'preview'|'export'} quality
   * @param {object} lookState — optional bloom/ca overrides 0..100
   * @param {Float32Array|null} cocMap — I5b scene-aware weighting
   */
  function applyLens(data, w, h, lens, intensity, quality, lookState, cocMap) {
    if (!lens || lens.id === 'none' || intensity <= 0) return;

    const t = clamp(intensity, 0, 1);
    quality = quality || 'preview';

    const bloomFine =
      lookState && lookState.bloom != null ? lookState.bloom / 100 : lens.bloom != null ? lens.bloom : 0;
    const caFine =
      lookState && lookState.ca != null ? lookState.ca / 100 : lens.ca != null ? lens.ca : 0;

    const bloomAmt = bloomFine * t;
    const caAmt = caFine * t;
    const vig = (lens.vignette || 0) * t;
    const vigPow = lens.vignettePower || 2.0;
    const oval = lens.ovalVignette || 1;
    const soft = (lens.soft || 0) * t;
    const micro = (lens.microContrast || 0) * t;
    const clarity = (lens.clarity || 0) * t;
    const warmth = (lens.warmth || 0) * t;
    const sat = 1 + (lens.sat || 0) * t;
    const edgeSoft = (lens.edgeSoft || 0) * t;
    const highlightLift = (lens.highlightLift || 0) * t;
    const flare = (lens.anamorphicFlare || 0) * t;

    const cx = w / 2;
    const cy = h / 2;
    const maxDist = Math.sqrt(cx * cx + cy * cy) || 1;
    const hasCoc = !!(cocMap && cocMap.length === w * h);

    // Pixel-wise optical character (before sampling effects)
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = y * w + x;
        const i = idx * 4;
        let r = data[i] / 255;
        let g = data[i + 1] / 255;
        let b = data[i + 2] / 255;

        const dx = (x - cx) / maxDist;
        const dy = ((y - cy) / maxDist) * oval;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // CoC weight: soft/microcontrast only off the focus plane when scene available
        const cw = hasCoc ? 0.15 + 0.85 * (cocMap[idx] || 0) : 1;

        if (soft > 0 || micro !== 0) {
          const softEff = soft * cw;
          const microEff = micro * (hasCoc ? lerp(1.15, 0.4, cocMap[idx] || 0) : 1);
          // in-focus gets slight clarity boost when micro positive; soft only when OOF
          const f = 1 + microEff * 0.5 - softEff * 0.4;
          r = (r - 0.5) * f + 0.5;
          g = (g - 0.5) * f + 0.5;
          b = (b - 0.5) * f + 0.5;
          if (softEff > 0) {
            r = lerp(r, 0.5, softEff * 0.12);
            g = lerp(g, 0.5, softEff * 0.12);
            b = lerp(b, 0.5, softEff * 0.12);
          }
        }

        if (clarity !== 0) {
          // Clarity stronger on focus plane when CoC known
          const cl = clarity * (hasCoc ? lerp(1.2, 0.35, cocMap[idx] || 0) : 1);
          const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
          const mid = 1 - Math.abs(luma - 0.5) * 2;
          const f = 1 + cl * 0.45 * mid;
          r = (r - 0.5) * f + 0.5;
          g = (g - 0.5) * f + 0.5;
          b = (b - 0.5) * f + 0.5;
        }

        if (sat !== 1) {
          const gray = 0.2126 * r + 0.7152 * g + 0.0722 * b;
          r = gray + (r - gray) * sat;
          g = gray + (g - gray) * sat;
          b = gray + (b - gray) * sat;
        }

        if (warmth !== 0) {
          r += warmth * 0.1;
          b -= warmth * 0.08;
        }

        if (highlightLift > 0) {
          const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
          if (luma > 0.5) {
            const a = highlightLift * ((luma - 0.5) * 2) * cw;
            r += a * 0.08;
            g += a * 0.07;
            b += a * 0.06;
          }
        }

        if (edgeSoft > 0 && dist > 0.5) {
          const a = edgeSoft * ((dist - 0.5) / 0.5) * cw;
          r = (r - 0.5) * (1 - a * 0.5) + 0.5;
          g = (g - 0.5) * (1 - a * 0.5) + 0.5;
          b = (b - 0.5) * (1 - a * 0.5) + 0.5;
        }

        if (vig !== 0) {
          let factor = 1 - Math.pow(Math.min(dist, 1.2), vigPow) * Math.abs(vig) * 1.2;
          if (vig < 0) {
            factor = 1 + Math.pow(dist, vigPow) * Math.abs(vig) * 0.25;
          }
          r *= factor;
          g *= factor;
          b *= factor;
        }

        data[i] = clamp(r * 255, 0, 255);
        data[i + 1] = clamp(g * 255, 0, 255);
        data[i + 2] = clamp(b * 255, 0, 255);
      }
    }

    if (bloomAmt > 0.01) {
      applyBloom(data, w, h, bloomAmt, quality, hasCoc ? cocMap : null);
    }

    if (caAmt > 0.01) {
      const caScale = quality === 'preview' ? 0.85 : 1;
      applyChromaticAberration(data, w, h, caAmt * caScale, hasCoc ? cocMap : null);
    }

    if (flare > 0.01) {
      // Flare slightly stronger with average CoC if scene-aware
      let flareAmt = flare;
      if (hasCoc) {
        // keep streaks but bias to bright OOF regions handled inside applyAnamorphicFlare
        flareAmt *= 0.85 + 0.15; // placeholder for future coc avg
      }
      applyAnamorphicFlare(data, w, h, flareAmt);
    }
  }

  /**
   * Full look stack on pixel buffer (in-place).
   * @param {Uint8ClampedArray} data
   * @param {number} w
   * @param {number} h
   * @param {object} lookState
   * @param {'static'|'random'} grainMode
   * @param {'preview'|'export'} quality
   * @param {Float32Array|null} [cocMap] I5b
   */
  /**
   * @param {Uint8ClampedArray} data
   * @param {number} w
   * @param {number} h
   * @param {object} lookState
   * @param {'static'|'random'} grainMode
   * @param {'preview'|'export'} quality
   * @param {Float32Array|null} [cocMap]
   * @param {{fast?:boolean}} [opts]
   */
  function applyLooks(data, w, h, lookState, grainMode, quality, cocMap, opts) {
    if (!lookState) return;
    opts = opts || {};

    const filmId = lookState.film || 'none';
    const cameraId = lookState.camera || 'none';
    const lensId = lookState.lens || 'none';
    const filmInt = (lookState.filmIntensity != null ? lookState.filmIntensity : 100) / 100;
    const camInt = (lookState.cameraIntensity != null ? lookState.cameraIntensity : 100) / 100;
    const lensInt = (lookState.lensIntensity != null ? lookState.lensIntensity : 100) / 100;

    const film = filmById(filmId);
    const camera = cameraById(cameraId);
    const lens = lensById(lensId);

    applyFilm(data, w, h, film, filmInt, grainMode || 'static');
    applyCamera(data, w, h, camera, camInt);

    // I6 analog imperfections (spatial / mechanical) — between body and lens
    const Imp = global.HermionaImperfections;
    if (Imp && Imp.apply) {
      const amounts = Imp.resolve(lookState, camera, camInt);
      // Film soft highlight knee from stock when no explicit user roll
      if (
        film &&
        film.id !== 'none' &&
        amounts.highlightRoll < 0.05 &&
        filmInt > 0.2
      ) {
        amounts.highlightRoll = Math.max(
          amounts.highlightRoll,
          0.15 * filmInt
        );
      }
      Imp.apply(data, w, h, amounts, {
        quality: quality || 'preview',
        fast: !!opts.fast,
        leakHue: camera && camera.leakHue ? camera.leakHue : 'warm',
        unevenMode: camera && camera.unevenMode ? camera.unevenMode : 'h'
      });
    }

    applyLens(data, w, h, lens, lensInt, quality || 'preview', lookState, cocMap || null);
  }

  global.HermionaLooks = {
    FILMS,
    CAMERAS,
    LENSES,
    PRESETS,
    PRESET_CATEGORIES,
    filmById,
    cameraById,
    lensById,
    presetById,
    presetsByCategory,
    applyFilm,
    applyCamera,
    applyLens,
    applyLooks,
    buildLUT
  };
})(typeof window !== 'undefined' ? window : globalThis);
