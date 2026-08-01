/**
 * HERMIONA — Ultramodern iOS-style photo editor
 * SPA · Canvas pipeline · iPhone Photos UX
 */

(() => {
  'use strict';

  const Engine = window.HermionaEngine;
  const Export = window.HermionaExport;
  const Looks = window.HermionaLooks;
  const Scene = window.HermionaScene;

  if (!Engine || !Export) {
    console.error('Hermiona: engine/export modules missing');
    return;
  }

  // ========== ADJUSTMENT CATALOG (iOS Photos style) ==========
  const CHIP_SVG = {
    exposure:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
    contrast:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor" stroke="none"/></svg>',
    highlights:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><path d="M12 4v4M8 8l-2-2M16 8l2-2"/><path d="M5 14h14"/><path d="M7 18h10" opacity="0.5"/></svg>',
    shadows:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><path d="M12 20v-4M8 16l-2 2M16 16l2 2"/><path d="M5 10h14"/><path d="M7 6h10" opacity="0.5"/></svg>',
    whites:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3" fill="currentColor" stroke="none" opacity="0.35"/></svg>',
    blacks:
      '<svg viewBox="0 0 24 24" fill="currentColor" stroke="none"><circle cx="12" cy="12" r="8" opacity="0.85"/></svg>',
    temperature:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><path d="M14 14.76V5a2 2 0 0 0-4 0v9.76a4 4 0 1 0 4 0z"/></svg>',
    tint:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M12 3c-3 4-6 7-6 11a6 6 0 0 0 12 0c0-4-3-7-6-11z"/></svg>',
    saturation:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 0 1 0 18" fill="currentColor" opacity="0.35" stroke="none"/></svg>',
    vibrance:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><path d="M12 3l2 6h6l-5 4 2 6-5-4-5 4 2-6-5-4h6z"/></svg>',
    clarity:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><circle cx="12" cy="12" r="3"/><path d="M12 5v2M12 17v2M5 12h2M17 12h2"/></svg>',
    sharpen:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8L12 2z"/></svg>',
    vignette:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><rect x="3" y="5" width="18" height="14" rx="2"/><ellipse cx="12" cy="12" rx="5" ry="4" opacity="0.4" fill="currentColor" stroke="none"/></svg>',
    grain:
      '<svg viewBox="0 0 24 24" fill="currentColor" stroke="none"><circle cx="6" cy="7" r="1.1"/><circle cx="12" cy="5" r="0.9"/><circle cx="18" cy="8" r="1"/><circle cx="8" cy="13" r="0.8"/><circle cx="15" cy="12" r="1.1"/><circle cx="5" cy="18" r="0.9"/><circle cx="11" cy="17" r="1"/><circle cx="18" cy="16" r="0.8"/><circle cx="14" cy="19" r="0.7"/></svg>',
    rotation:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><path d="M21 12a9 9 0 1 1-3-6.7"/><path d="M21 3v6h-6"/></svg>',
    filmIntensity:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M7 5v14M17 5v14"/></svg>',
    cameraIntensity:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M4 8h3l2-2h6l2 2h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></svg>',
    lensIntensity:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/></svg>',
    bloom:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="7" opacity="0.4"/><circle cx="12" cy="12" r="10" opacity="0.2"/></svg>',
    ca:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="10" cy="12" r="6" opacity="0.5"/><circle cx="14" cy="12" r="6" opacity="0.7"/></svg>',
    dofStrength:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="8" opacity="0.35"/><path d="M4 12h2M18 12h2" opacity="0.5"/></svg>',
    aperture:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="9"/><path d="M12 3l3.5 6H20l-3 5 1.5 7L12 17l-6.5 4L7 14 4 9h4.5z"/></svg>',
    focusDepth:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><circle cx="12" cy="12" r="3"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4"/></svg>',
    bokehAmount:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="8" cy="10" r="3" opacity="0.5"/><circle cx="15" cy="9" r="4" opacity="0.7"/><circle cx="12" cy="15" r="2.5" opacity="0.45"/></svg>'
  };

  /** @typedef {{ id:string, label:string, min:number, max:number, step:number, def:number, store:'params'|'look'|'optics', opticsKey?:string, format?:string }} AdjDef */

  /** @type {Record<string, AdjDef[]>} */
  const TOOL_ADJUSTMENTS = {
    adjust: [
      { id: 'exposure', label: 'Ekspozicija', min: -2, max: 2, step: 0.01, def: 0, store: 'params', format: 'exp' },
      { id: 'contrast', label: 'Kontrast', min: -100, max: 100, step: 1, def: 0, store: 'params' },
      { id: 'highlights', label: 'Svetla', min: -100, max: 100, step: 1, def: 0, store: 'params' },
      { id: 'shadows', label: 'Senke', min: -100, max: 100, step: 1, def: 0, store: 'params' },
      { id: 'whites', label: 'Bela', min: -100, max: 100, step: 1, def: 0, store: 'params' },
      { id: 'blacks', label: 'Crna', min: -100, max: 100, step: 1, def: 0, store: 'params' }
    ],
    color: [
      { id: 'temperature', label: 'Temperatura', min: -100, max: 100, step: 1, def: 0, store: 'params' },
      { id: 'tint', label: 'Nijansa', min: -100, max: 100, step: 1, def: 0, store: 'params' },
      { id: 'saturation', label: 'Zasićenost', min: -100, max: 100, step: 1, def: 0, store: 'params' },
      { id: 'vibrance', label: 'Vibracija', min: -100, max: 100, step: 1, def: 0, store: 'params' }
    ],
    effects: [
      { id: 'clarity', label: 'Jasnoća', min: -100, max: 100, step: 1, def: 0, store: 'params' },
      { id: 'sharpen', label: 'Oštrina', min: 0, max: 100, step: 1, def: 0, store: 'params' },
      { id: 'vignette', label: 'Vinjeta', min: 0, max: 100, step: 1, def: 0, store: 'params' },
      { id: 'grain', label: 'Zrno', min: 0, max: 100, step: 1, def: 0, store: 'params' },
      { id: 'bloom', label: 'Bloom', min: 0, max: 100, step: 1, def: 0, store: 'look' },
      { id: 'ca', label: 'CA', min: 0, max: 100, step: 1, def: 0, store: 'look' }
    ],
    portrait: [
      { id: 'dofStrength', label: 'DoF snaga', min: 0, max: 100, step: 1, def: 55, store: 'optics', opticsKey: 'strength', format: 'pct' },
      { id: 'aperture', label: 'Otvor', min: 0, max: 100, step: 1, def: 55, store: 'optics', opticsKey: 'apertureStrength', format: 'fstop' },
      { id: 'focusDepth', label: 'Fokus', min: 0, max: 100, step: 1, def: 30, store: 'optics', opticsKey: 'focusDepth', format: 'pct' },
      { id: 'bokehAmount', label: 'Bokeh', min: 0, max: 100, step: 1, def: 55, store: 'optics', opticsKey: 'bokehAmount', format: 'pct' }
    ],
    crop: [
      { id: 'rotation', label: 'Ispravljanje', min: -45, max: 45, step: 0.5, def: 0, store: 'params', format: 'deg' }
    ]
  };

  const LOOK_INTENSITY = {
    film: { id: 'filmIntensity', label: 'Intenzitet filma', def: 100 },
    camera: { id: 'cameraIntensity', label: 'Intenzitet aparata', def: 100 },
    lens: { id: 'lensIntensity', label: 'Intenzitet objektiva', def: 100 }
  };

  // ========== STATE ==========
  const state = {
    originalImage: null,
    originalData: null,
    scrubData: null, // low-res proxy for smooth scrubbing
    workingCanvas: null,
    workingCtx: null,
    ops: [],
    params: {
      exposure: 0,
      contrast: 0,
      highlights: 0,
      shadows: 0,
      whites: 0,
      blacks: 0,
      temperature: 0,
      tint: 0,
      saturation: 0,
      vibrance: 0,
      clarity: 0,
      sharpen: 0,
      vignette: 0,
      grain: 0,
      rotation: 0,
      flipH: false,
      flipV: false
    },
    look: {
      film: 'none',
      filmIntensity: 100,
      camera: 'none',
      cameraIntensity: 100,
      lens: 'none',
      lensIntensity: 100,
      bloom: 0,
      ca: 0
    },
    lookQuality: 'preview',
    scene: null,
    sceneStatus: 'idle',
    optics: {
      enabled: true,
      strength: 0.55,
      apertureStrength: 0.55,
      apertureSlider: 55,
      focusDepth: 0.3,
      focusManual: false,
      focalRecipe: '50',
      bokehShape: 'auto',
      bokehAmount: 0.55
    },
    debugScene: 'off',
    crop: {
      active: false,
      x: 0,
      y: 0,
      w: 1,
      h: 1,
      aspect: 'free'
    },
    export: {
      size: 'working',
      format: 'jpeg',
      quality: 0.95
    },
    ui: {
      tool: 'adjust',
      activeAdj: 'exposure',
      looksTab: 'film',
      scrubbing: false,
      comparing: false
    },
    isComparing: false,
    hasImage: false,
    maxWorkingSize: 1400,
    scrubMaxSize: 720,
    exporting: false
  };

  // History (undo/redo) — snapshot of editable state
  const history = {
    stack: [],
    index: -1,
    max: 40,
    lock: false
  };

  const FSTOPS = [
    { t: 0, f: 16, strength: 0.05 },
    { t: 20, f: 8, strength: 0.2 },
    { t: 40, f: 4, strength: 0.4 },
    { t: 55, f: 2.8, strength: 0.55 },
    { t: 70, f: 2, strength: 0.72 },
    { t: 85, f: 1.8, strength: 0.85 },
    { t: 100, f: 1.4, strength: 1 }
  ];

  const MIN_CROP_NORM = 0.05;

  // ========== DOM ==========
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  const canvas = $('#mainCanvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: false, alpha: false });
  const fileInput = $('#fileInput');
  const dropOverlay = $('#dropOverlay');
  const canvasArea = $('#canvasArea');
  const dock = $('#dock');
  const topbarTitle = $('#topbarTitle');
  const btnUpload = $('#btnUpload');
  const btnDownload = $('#btnDownload');
  const btnReset = $('#btnReset');
  const btnClose = $('#btnClose');
  const btnUndo = $('#btnUndo');
  const btnRedo = $('#btnRedo');
  const btnRotateLeft = $('#btnRotateLeft');
  const btnRotateRight = $('#btnRotateRight');
  const btnFlipH = $('#btnFlipH');
  const btnFlipV = $('#btnFlipV');
  const btnCropApply = $('#btnCropApply');
  const btnCropReset = $('#btnCropReset');
  const cropLayer = $('#cropLayer');
  const cropFrame = $('#cropFrame');
  const cropRectEl = $('#cropRect');

  const dialRow = $('#dialRow');
  const dialName = $('#dialName');
  const dialValue = $('#dialValue');
  const dialReset = $('#dialReset');
  const activeDial = $('#activeDial');
  const chipsScroll = $('#chipsScroll');
  const chipsEl = $('#chips');

  const panelLooks = $('#panelLooks');
  const panelCrop = $('#panelCrop');
  const panelPortrait = $('#panelPortrait');
  const filmLooksEl = $('#filmLooks');
  const cameraLooksEl = $('#cameraLooks');
  const lensLooksEl = $('#lensLooks');
  const lookIntensityWrap = $('#lookIntensityWrap');
  const lookIntensity = $('#lookIntensity');
  const lookIntensityName = $('#lookIntensityName');
  const lookIntensityValue = $('#lookIntensityValue');

  const exportBackdrop = $('#exportBackdrop');
  const exportSheet = $('#exportSheet');
  const btnExportConfirm = $('#btnExportConfirm');
  const btnExportCancel = $('#btnExportCancel');
  const exportQuality = $('#exportQuality');
  const exportQualityValue = $('#exportQualityValue');
  const exportQualityWrap = $('#exportQualityWrap');
  const exportDimHint = $('#exportDimHint');
  const exportMetaWorking = $('#exportMetaWorking');
  const exportMetaFull = $('#exportMetaFull');
  const exportToast = $('#exportToast');
  const lookChip = $('#lookChip');
  const sceneStatusEl = $('#sceneStatus');
  const btnSceneAnalyze = $('#btnSceneAnalyze');
  const opticsEnabledEl = $('#opticsEnabled');
  const busyOverlay = $('#busyOverlay');
  const busyTitle = $('#busyTitle');
  const busySub = $('#busySub');
  const headerBusy = $('#headerBusy');
  const headerBusyText = $('#headerBusyText');
  const compareHint = $('#compareHint');
  const fineOverlay = $('#fineOverlay');
  const fineName = $('#fineName');
  const fineValue = $('#fineValue');

  // ========== BUSY ==========
  const busyJobs = new Map();

  function setButtonBusy(btn, busy, labelBusy, labelIdle) {
    if (!btn) return;
    const spinner = btn.querySelector('.btn-spinner');
    const label = btn.querySelector('.btn-label');
    btn.classList.toggle('busy', !!busy);
    if (spinner) spinner.hidden = !busy;
    if (label) {
      if (busy && labelBusy) label.textContent = labelBusy;
      else if (!busy && labelIdle) label.textContent = labelIdle;
    }
  }

  function refreshBusyUI() {
    const active = busyJobs.size > 0;
    let title = 'Obrada…';
    let sub = '';
    if (active) {
      const last = [...busyJobs.values()].pop();
      title = last.title || title;
      sub = last.sub || '';
    }
    if (busyOverlay) {
      busyOverlay.hidden = !active;
      if (busyTitle) busyTitle.textContent = title;
      if (busySub) {
        if (sub) {
          busySub.hidden = false;
          busySub.textContent = sub;
        } else {
          busySub.hidden = true;
          busySub.textContent = '';
        }
      }
    }
    if (headerBusy) {
      headerBusy.hidden = !active;
      if (headerBusyText) headerBusyText.textContent = title;
    }
  }

  function busyStart(id, title, sub) {
    busyJobs.set(id, { title: title || 'Obrada…', sub: sub || '' });
    refreshBusyUI();
  }
  function busyUpdate(id, title, sub) {
    if (!busyJobs.has(id)) return;
    busyJobs.set(id, { title: title || 'Obrada…', sub: sub || '' });
    refreshBusyUI();
  }
  function busyEnd(id) {
    busyJobs.delete(id);
    refreshBusyUI();
  }

  // ========== UTILS ==========
  function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
  }

  function parseAspect(ratio, imgW, imgH) {
    if (!ratio || ratio === 'free') return null;
    if (ratio === 'original') return imgW / imgH;
    const parts = ratio.split(':');
    if (parts.length !== 2) return null;
    const a = parseFloat(parts[0]);
    const b = parseFloat(parts[1]);
    if (!a || !b) return null;
    return a / b;
  }

  function showToast(msg, ms) {
    if (!exportToast) return;
    exportToast.textContent = msg;
    exportToast.hidden = false;
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => {
      exportToast.hidden = true;
    }, ms || 2200);
  }

  function hapticLight() {
    try {
      if (navigator.vibrate) navigator.vibrate(8);
    } catch (_) { /* ignore */ }
  }

  function apertureFromSlider(v) {
    v = clamp(v, 0, 100);
    for (let i = 0; i < FSTOPS.length - 1; i++) {
      const a = FSTOPS[i];
      const b = FSTOPS[i + 1];
      if (v <= b.t) {
        const t = (v - a.t) / (b.t - a.t || 1);
        return {
          f: a.f + (b.f - a.f) * t,
          strength: a.strength + (b.strength - a.strength) * t
        };
      }
    }
    const last = FSTOPS[FSTOPS.length - 1];
    return { f: last.f, strength: last.strength };
  }

  function formatFStop(f) {
    if (f >= 10) return 'f/' + Math.round(f);
    return 'f/' + (Math.round(f * 10) / 10);
  }

  function findAdj(id) {
    for (const list of Object.values(TOOL_ADJUSTMENTS)) {
      const found = list.find((a) => a.id === id);
      if (found) return found;
    }
    return null;
  }

  function getAdjValue(adj) {
    if (!adj) return 0;
    if (adj.store === 'params') return state.params[adj.id];
    if (adj.store === 'look') return state.look[adj.id];
    if (adj.store === 'optics') {
      if (adj.id === 'aperture') return state.optics.apertureSlider != null ? state.optics.apertureSlider : 55;
      if (adj.id === 'dofStrength') return Math.round(state.optics.strength * 100);
      if (adj.id === 'focusDepth') return Math.round(state.optics.focusDepth * 100);
      if (adj.id === 'bokehAmount') return Math.round(state.optics.bokehAmount * 100);
    }
    return adj.def;
  }

  function setAdjValue(adj, val, opts) {
    if (!adj) return;
    val = clamp(val, adj.min, adj.max);
    // snap to step
    if (adj.step >= 1) val = Math.round(val / adj.step) * adj.step;
    else val = Math.round(val / adj.step) * adj.step;

    if (adj.store === 'params') {
      state.params[adj.id] = val;
    } else if (adj.store === 'look') {
      state.look[adj.id] = val;
      state.lookQuality = 'preview';
    } else if (adj.store === 'optics') {
      if (adj.id === 'dofStrength') state.optics.strength = val / 100;
      else if (adj.id === 'aperture') {
        state.optics.apertureSlider = val;
        const ap = apertureFromSlider(val);
        state.optics.apertureStrength = ap.strength;
      } else if (adj.id === 'focusDepth') {
        state.optics.focusManual = true;
        state.optics.focusDepth = val / 100;
      } else if (adj.id === 'bokehAmount') {
        state.optics.bokehAmount = val / 100;
      }
    }

    if (!opts || !opts.silent) {
      updateDialUI();
      markChipModified();
      updateToolDots();
    }
  }

  function formatAdjValue(adj, val) {
    if (!adj) return String(val);
    if (adj.format === 'exp') {
      return (val > 0 ? '+' : '') + Number(val).toFixed(2);
    }
    if (adj.format === 'deg') return val + '°';
    if (adj.format === 'fstop') {
      return formatFStop(apertureFromSlider(val).f);
    }
    if (adj.format === 'pct') return String(Math.round(val));
    if (val > 0 && adj.min < 0) return '+' + Math.round(val * 100) / 100;
    if (adj.step < 1) return String(Math.round(val * 100) / 100);
    return String(Math.round(val));
  }

  function isAdjModified(adj) {
    if (!adj) return false;
    if (adj.store === 'optics') {
      if (adj.id === 'dofStrength') return Math.abs(state.optics.strength - 0.55) > 0.01;
      if (adj.id === 'aperture') return Math.abs(state.optics.apertureStrength - 0.55) > 0.01;
      if (adj.id === 'focusDepth') return state.optics.focusManual;
      if (adj.id === 'bokehAmount') return Math.abs(state.optics.bokehAmount - 0.55) > 0.01;
      return false;
    }
    const cur = getAdjValue(adj);
    return Math.abs(cur - adj.def) > (adj.step < 1 ? 0.001 : 0.5);
  }

  // ========== HISTORY ==========
  function snapshotEditState() {
    return {
      params: { ...state.params },
      look: { ...state.look },
      optics: {
        enabled: state.optics.enabled,
        strength: state.optics.strength,
        apertureStrength: state.optics.apertureStrength,
        apertureSlider: state.optics.apertureSlider,
        focusDepth: state.optics.focusDepth,
        focusManual: state.optics.focusManual,
        focalRecipe: state.optics.focalRecipe,
        bokehShape: state.optics.bokehShape,
        bokehAmount: state.optics.bokehAmount
      },
      crop: {
        x: state.crop.x,
        y: state.crop.y,
        w: state.crop.w,
        h: state.crop.h,
        aspect: state.crop.aspect
      }
    };
  }

  function applySnapshot(snap) {
    if (!snap) return;
    history.lock = true;
    Object.assign(state.params, snap.params);
    Object.assign(state.look, snap.look);
    Object.assign(state.optics, snap.optics);
    if (snap.crop) {
      state.crop.x = snap.crop.x;
      state.crop.y = snap.crop.y;
      state.crop.w = snap.crop.w;
      state.crop.h = snap.crop.h;
      state.crop.aspect = snap.crop.aspect;
    }
    if (opticsEnabledEl) opticsEnabledEl.checked = state.optics.enabled;
    syncLookUI();
    syncRatioChips();
    syncFocalBokeh();
    updateDialUI();
    markChipModified();
    updateToolDots();
    history.lock = false;
    scheduleRender(false);
  }

  function pushHistory() {
    if (history.lock || !state.hasImage) return;
    const snap = snapshotEditState();
    // drop redo branch
    history.stack = history.stack.slice(0, history.index + 1);
    history.stack.push(snap);
    if (history.stack.length > history.max) {
      history.stack.shift();
    }
    history.index = history.stack.length - 1;
    updateHistoryButtons();
  }

  function undo() {
    if (history.index <= 0) return;
    history.index -= 1;
    applySnapshot(history.stack[history.index]);
    updateHistoryButtons();
    hapticLight();
    showToast('Poništeno', 900);
  }

  function redo() {
    if (history.index >= history.stack.length - 1) return;
    history.index += 1;
    applySnapshot(history.stack[history.index]);
    updateHistoryButtons();
    hapticLight();
    showToast('Ponovljeno', 900);
  }

  function resetHistory() {
    history.stack = [snapshotEditState()];
    history.index = 0;
    updateHistoryButtons();
  }

  function updateHistoryButtons() {
    if (btnUndo) btnUndo.disabled = !state.hasImage || history.index <= 0;
    if (btnRedo) btnRedo.disabled = !state.hasImage || history.index >= history.stack.length - 1;
  }

  let historyDebounce = null;
  function scheduleHistoryPush() {
    clearTimeout(historyDebounce);
    historyDebounce = setTimeout(() => pushHistory(), 320);
  }

  // ========== IMAGE LOADING ==========
  function loadImage(file) {
    if (!file || !file.type.startsWith('image/')) return;

    busyStart('load', 'Učitavam sliku…', file.name || '');
    dropOverlay.classList.add('hidden');

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        state.originalImage = img;
        state.ops = [];
        prepareWorkingImage(img);
        resetParams(true);
        resetLooks(true);
        resetCropRect();
        state.scene = null;
        state.optics.focusManual = false;
        state.hasImage = true;
        enableControls(true);
        if (btnSceneAnalyze) btnSceneAnalyze.disabled = false;
        if (dock) dock.hidden = false;
        canvas.classList.add('visible');
        if (compareHint) {
          compareHint.hidden = false;
          compareHint.classList.add('show');
          setTimeout(() => compareHint.classList.remove('show'), 2800);
        }
        setTool(state.ui.tool || 'adjust');
        busyEnd('load');
        resetHistory();
        render(false);
        if (state.crop.active) updateCropOverlay();
        scheduleSceneAnalysis(200);
      };
      img.onerror = () => {
        busyEnd('load');
        dropOverlay.classList.remove('hidden');
        alert('Greška pri učitavanju slike.');
      };
      img.src = e.target.result;
    };
    reader.onerror = () => {
      busyEnd('load');
      dropOverlay.classList.remove('hidden');
      alert('Greška pri čitanju fajla.');
    };
    reader.readAsDataURL(file);
  }

  function prepareWorkingImage(img) {
    const max = state.maxWorkingSize;
    let w = img.naturalWidth;
    let h = img.naturalHeight;

    if (w > max || h > max) {
      const ratio = Math.min(max / w, max / h);
      w = Math.round(w * ratio);
      h = Math.round(h * ratio);
    }

    state.workingCanvas = document.createElement('canvas');
    state.workingCanvas.width = w;
    state.workingCanvas.height = h;
    state.workingCtx = state.workingCanvas.getContext('2d', { willReadFrequently: true });
    state.workingCtx.drawImage(img, 0, 0, w, h);
    state.originalData = state.workingCtx.getImageData(0, 0, w, h);
    buildScrubProxy();

    canvas.width = w;
    canvas.height = h;
  }

  function buildScrubProxy() {
    if (!state.workingCanvas) {
      state.scrubData = null;
      return;
    }
    const max = state.scrubMaxSize;
    let w = state.workingCanvas.width;
    let h = state.workingCanvas.height;
    if (w <= max && h <= max) {
      state.scrubData = state.originalData;
      return;
    }
    const ratio = Math.min(max / w, max / h);
    w = Math.max(1, Math.round(w * ratio));
    h = Math.max(1, Math.round(h * ratio));
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const cctx = c.getContext('2d', { willReadFrequently: true });
    cctx.imageSmoothingEnabled = true;
    cctx.imageSmoothingQuality = 'medium';
    cctx.drawImage(state.workingCanvas, 0, 0, w, h);
    state.scrubData = cctx.getImageData(0, 0, w, h);
  }

  function setWorkingFromCanvas(srcCanvas) {
    state.workingCanvas = srcCanvas;
    state.workingCtx = srcCanvas.getContext('2d', { willReadFrequently: true });
    state.originalData = state.workingCtx.getImageData(0, 0, srcCanvas.width, srcCanvas.height);
    buildScrubProxy();
    canvas.width = srcCanvas.width;
    canvas.height = srcCanvas.height;
  }

  // ========== RENDER (RAF + scrub fast path) ==========
  let renderPending = false;
  let renderFast = false;
  let settleTimer = null;

  function scheduleRender(fast) {
    if (fast) renderFast = true;
    if (renderPending) return;
    renderPending = true;
    requestAnimationFrame(() => {
      const useFast = renderFast;
      renderFast = false;
      renderPending = false;
      render(useFast);
    });
  }

  function scheduleFullSettle() {
    clearTimeout(settleTimer);
    settleTimer = setTimeout(() => {
      state.ui.scrubbing = false;
      if (canvasArea) canvasArea.classList.remove('scrubbing');
      scheduleRender(false);
      scheduleLookHQ();
    }, 140);
  }

  function beginScrub() {
    state.ui.scrubbing = true;
    if (canvasArea) canvasArea.classList.add('scrubbing');
  }

  function endScrub() {
    scheduleFullSettle();
    scheduleHistoryPush();
  }

  /** Offscreen reuse for scrub upscale (avoids GC thrash) */
  let blitCanvas = null;
  let blitCtx = null;

  function ensureBlit(w, h) {
    if (!blitCanvas) {
      blitCanvas = document.createElement('canvas');
      blitCtx = blitCanvas.getContext('2d');
    }
    if (blitCanvas.width !== w || blitCanvas.height !== h) {
      blitCanvas.width = w;
      blitCanvas.height = h;
    }
    return blitCtx;
  }

  function drawToMain(imageData, straightenDeg) {
    const w = imageData.width;
    const h = imageData.height;
    // Keep display buffer at working size so scrub proxy doesn't resize the stage
    const targetW =
      state.workingCanvas && state.workingCanvas.width
        ? state.workingCanvas.width
        : w;
    const targetH =
      state.workingCanvas && state.workingCanvas.height
        ? state.workingCanvas.height
        : h;
    const needsUpscale = w !== targetW || h !== targetH;

    if (!straightenDeg) {
      if (canvas.width !== targetW || canvas.height !== targetH) {
        canvas.width = targetW;
        canvas.height = targetH;
      }
      if (!needsUpscale) {
        ctx.putImageData(imageData, 0, 0);
        return;
      }
      const bctx = ensureBlit(w, h);
      bctx.putImageData(imageData, 0, 0);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'low';
      ctx.drawImage(blitCanvas, 0, 0, w, h, 0, 0, targetW, targetH);
      return;
    }

    const bctx = ensureBlit(w, h);
    bctx.putImageData(imageData, 0, 0);

    // Scale to working size first if scrub proxy
    let src = blitCanvas;
    if (needsUpscale) {
      const full = document.createElement('canvas');
      full.width = targetW;
      full.height = targetH;
      const fctx = full.getContext('2d');
      fctx.imageSmoothingEnabled = true;
      fctx.imageSmoothingQuality = 'low';
      fctx.drawImage(blitCanvas, 0, 0, w, h, 0, 0, targetW, targetH);
      src = full;
    }

    const rotated = Engine.rotateCoverCanvas(src, straightenDeg);
    if (canvas.width !== rotated.width || canvas.height !== rotated.height) {
      canvas.width = rotated.width;
      canvas.height = rotated.height;
    }
    ctx.drawImage(rotated, 0, 0);
  }

  function render(fast) {
    if (!state.hasImage) return;

    const straighten = state.crop.active ? state.params.rotation : 0;

    if (state.isComparing) {
      const src = fast && state.scrubData ? state.scrubData : state.originalData;
      drawToMain(src, straighten);
      updateCropOverlay();
      return;
    }

    const useFast = !!fast || state.ui.scrubbing;
    const srcData =
      useFast && state.scrubData ? state.scrubData : state.originalData;

    const processed = Engine.process(srcData, state.params, {
      grain: !useFast && state.params.grain > 0,
      grainMode: 'static',
      look: state.look,
      quality: useFast ? 'preview' : state.lookQuality || 'preview',
      fast: useFast,
      scene: useFast ? null : state.scene,
      optics: {
        enabled: !useFast && state.optics.enabled && state.debugScene === 'off',
        strength: state.optics.strength,
        apertureStrength: state.optics.apertureStrength,
        focusDepth: state.optics.focusDepth,
        focalRecipe: state.optics.focalRecipe || '50',
        bokehShape: state.optics.bokehShape || 'auto',
        bokehAmount: state.optics.bokehAmount != null ? state.optics.bokehAmount : 0.55
      },
      debugScene: useFast || state.debugScene === 'off' ? null : state.debugScene
    });
    if (processed) {
      drawToMain(processed, straighten);
    }
    updateCropOverlay();
    updateLookChip();
  }

  // ========== SCENE ==========
  let analyzeToken = 0;

  function setSceneStatus(text, kind) {
    if (!sceneStatusEl) return;
    sceneStatusEl.textContent = text;
    sceneStatusEl.classList.remove('ready', 'busy', 'error');
    if (kind) sceneStatusEl.classList.add(kind);
  }

  function invalidateScene() {
    state.scene = null;
    state.sceneStatus = 'idle';
    if (state.hasImage) {
      setSceneStatus('Scena zastarela — analiziraj ponovo', null);
    }
  }

  async function runSceneAnalysis() {
    if (!state.hasImage || !state.workingCanvas || !Scene) return;
    const token = ++analyzeToken;
    state.sceneStatus = 'loading';
    setSceneStatus('Učitavam AI model…', 'busy');
    setButtonBusy(btnSceneAnalyze, true, '…', 'Analiziraj');
    busyStart('scene', 'Učitavam AI model…', 'On-device · prvi put može malo duže');

    try {
      busyUpdate('scene', 'Analiziram scenu…', 'Segmentacija · depth');
      state.sceneStatus = 'analyzing';
      setSceneStatus('Analiziram…', 'busy');
      const analysis = await Scene.analyze(state.workingCanvas);
      if (token !== analyzeToken) return;

      state.scene = analysis;
      state.sceneStatus = 'ready';
      if (!state.optics.focusManual && analysis.focusDepth != null) {
        state.optics.focusDepth = analysis.focusDepth;
        updateDialUI();
      }
      const conf =
        analysis.personConfidence != null
          ? Math.round(analysis.personConfidence * 100)
          : null;
      setSceneStatus(
        conf != null
          ? 'Spremno · subjekt ' + conf + '%'
          : 'Spremno',
        'ready'
      );
      scheduleRender(false);
    } catch (err) {
      console.error(err);
      if (token !== analyzeToken) return;
      state.sceneStatus = 'error';
      setSceneStatus('Greška: ' + (err.message || err), 'error');
    } finally {
      if (token === analyzeToken) {
        busyEnd('scene');
        setButtonBusy(btnSceneAnalyze, false, '…', 'Analiziraj');
      }
    }
  }

  let sceneTimer = null;
  function scheduleSceneAnalysis(delay) {
    clearTimeout(sceneTimer);
    sceneTimer = setTimeout(() => {
      if (state.hasImage) runSceneAnalysis();
    }, delay || 200);
  }

  // ========== LOOK UI ==========
  function buildLookCards() {
    if (!Looks) return;

    function makeCard(item, kind) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'look-card' + (item.id === 'none' ? ' active' : '');
      btn.dataset.id = item.id;
      btn.dataset.kind = kind;
      btn.title = item.desc || item.name;
      btn.innerHTML =
        '<span class="look-swatch" style="background:' +
        (item.swatch || '#333') +
        '"></span>' +
        '<span class="look-card-body">' +
        '<span class="look-card-name">' +
        item.name +
        '</span></span>';
      btn.addEventListener('click', () => {
        pushHistory();
        selectLook(kind, item.id);
        pushHistory();
      });
      return btn;
    }

    if (filmLooksEl) {
      filmLooksEl.innerHTML = '';
      Looks.FILMS.forEach((f) => filmLooksEl.appendChild(makeCard(f, 'film')));
    }
    if (cameraLooksEl) {
      cameraLooksEl.innerHTML = '';
      Looks.CAMERAS.forEach((c) => cameraLooksEl.appendChild(makeCard(c, 'camera')));
    }
    if (lensLooksEl) {
      lensLooksEl.innerHTML = '';
      Looks.LENSES.forEach((l) => lensLooksEl.appendChild(makeCard(l, 'lens')));
    }
    syncLookUI();
  }

  function selectLook(kind, id) {
    if (kind === 'film') {
      state.look.film = id;
      if (id !== 'none' && state.look.filmIntensity === 0) {
        state.look.filmIntensity = 100;
      }
    } else if (kind === 'camera') {
      state.look.camera = id;
      if (id !== 'none' && state.look.cameraIntensity === 0) {
        state.look.cameraIntensity = 100;
      }
    } else if (kind === 'lens') {
      state.look.lens = id;
      if (id !== 'none') {
        if (state.look.lensIntensity === 0) state.look.lensIntensity = 100;
        const lens = Looks.lensById(id);
        if (lens) {
          state.look.bloom = Math.round((lens.bloom || 0) * 100);
          state.look.ca = Math.round((lens.ca || 0) * 100);
        }
      } else {
        state.look.bloom = 0;
        state.look.ca = 0;
      }
    }
    syncLookUI();
    state.lookQuality = 'preview';
    scheduleRender(false);
    scheduleLookHQ();
    updateToolDots();
  }

  let lookHQTimer = null;
  function scheduleLookHQ() {
    clearTimeout(lookHQTimer);
    const needsHQ =
      state.look.lens !== 'none' &&
      (state.look.bloom > 20 || state.look.ca > 15);
    if (!needsHQ) return;
    lookHQTimer = setTimeout(() => {
      state.lookQuality = 'export';
      scheduleRender(false);
      requestAnimationFrame(() => {
        state.lookQuality = 'preview';
      });
    }, 280);
  }

  function syncLookUI() {
    const map = [
      [filmLooksEl, state.look.film],
      [cameraLooksEl, state.look.camera],
      [lensLooksEl, state.look.lens]
    ];
    map.forEach(([el, id]) => {
      if (!el) return;
      el.querySelectorAll('.look-card').forEach((c) => {
        c.classList.toggle('active', c.dataset.id === id);
      });
    });

    // intensity slider for active looks tab
    const tab = state.ui.looksTab || 'film';
    const meta = LOOK_INTENSITY[tab];
    const lookId = state.look[tab];
    if (lookIntensityWrap && meta) {
      const show = lookId && lookId !== 'none';
      lookIntensityWrap.hidden = !show;
      if (show) {
        if (lookIntensityName) lookIntensityName.textContent = meta.label;
        if (lookIntensity) lookIntensity.value = state.look[meta.id];
        if (lookIntensityValue) lookIntensityValue.textContent = String(state.look[meta.id]);
      }
    }
    updateLookChip();
  }

  function updateLookChip() {
    if (!lookChip || !Looks) return;
    const parts = [];
    if (state.look.film !== 'none') {
      const f = Looks.filmById(state.look.film);
      if (f) parts.push(f.name);
    }
    if (state.look.camera !== 'none') {
      const c = Looks.cameraById(state.look.camera);
      if (c) parts.push(c.name);
    }
    if (state.look.lens !== 'none') {
      const l = Looks.lensById(state.look.lens);
      if (l) parts.push(l.name);
    }
    if (!parts.length || !state.hasImage) {
      lookChip.hidden = true;
      lookChip.textContent = '';
      return;
    }
    lookChip.textContent = parts.join(' · ');
    lookChip.hidden = false;
  }

  function resetLooks(silent) {
    state.look.film = 'none';
    state.look.camera = 'none';
    state.look.lens = 'none';
    state.look.filmIntensity = 100;
    state.look.cameraIntensity = 100;
    state.look.lensIntensity = 100;
    state.look.bloom = 0;
    state.look.ca = 0;
    syncLookUI();
    if (!silent) scheduleRender(false);
  }

  // ========== CROP ==========
  function resetCropRect() {
    state.crop.x = 0;
    state.crop.y = 0;
    state.crop.w = 1;
    state.crop.h = 1;
    updateCropOverlay();
  }

  function applyAspectToCrop(ratioKey) {
    if (!state.workingCanvas) return;
    const imgW = state.workingCanvas.width;
    const imgH = state.workingCanvas.height;
    const aspect = parseAspect(ratioKey, imgW, imgH);
    if (!aspect) return;

    const normAspect = aspect * (imgH / imgW);
    let w = 1;
    let h = w / normAspect;
    if (h > 1) {
      h = 1;
      w = h * normAspect;
    }
    state.crop.w = w;
    state.crop.h = h;
    state.crop.x = (1 - w) / 2;
    state.crop.y = (1 - h) / 2;
  }

  function getCanvasDisplayRect() {
    const area = canvasArea.getBoundingClientRect();
    const c = canvas.getBoundingClientRect();
    return {
      left: c.left - area.left,
      top: c.top - area.top,
      width: c.width,
      height: c.height
    };
  }

  function updateCropOverlay() {
    if (!state.crop.active || !state.hasImage || !cropLayer || !cropFrame || !cropRectEl) return;
    const disp = getCanvasDisplayRect();
    if (disp.width < 2 || disp.height < 2) return;

    cropFrame.style.left = disp.left + 'px';
    cropFrame.style.top = disp.top + 'px';
    cropFrame.style.width = disp.width + 'px';
    cropFrame.style.height = disp.height + 'px';

    const { x, y, w, h } = state.crop;
    cropRectEl.style.left = x * 100 + '%';
    cropRectEl.style.top = y * 100 + '%';
    cropRectEl.style.width = w * 100 + '%';
    cropRectEl.style.height = h * 100 + '%';
  }

  function setCropMode(active) {
    state.crop.active = active && state.hasImage;
    if (!cropLayer) return;
    if (state.crop.active) {
      cropLayer.hidden = false;
      if (state.crop.aspect && state.crop.aspect !== 'free') {
        applyAspectToCrop(state.crop.aspect);
      }
      requestAnimationFrame(() => updateCropOverlay());
    } else {
      cropLayer.hidden = true;
    }
    scheduleRender(false);
  }

  const drag = { mode: null, startX: 0, startY: 0, origin: null };

  function cropPointerDown(e) {
    if (!state.crop.active) return;
    e.preventDefault();
    e.stopPropagation();

    const handle = e.target.closest('.crop-handle');
    const onRect = e.target.closest('.crop-rect');
    if (!handle && !onRect) return;

    drag.mode = handle ? handle.dataset.handle : 'move';
    drag.startX = e.clientX;
    drag.startY = e.clientY;
    drag.origin = { ...state.crop };

    const move = (ev) => cropPointerMove(ev);
    const up = () => {
      drag.mode = null;
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
      scheduleHistoryPush();
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
  }

  function cropPointerMove(e) {
    if (!drag.mode || !drag.origin) return;
    if (e.cancelable) e.preventDefault();

    const disp = getCanvasDisplayRect();
    if (disp.width < 2 || disp.height < 2) return;

    const dx = (e.clientX - drag.startX) / disp.width;
    const dy = (e.clientY - drag.startY) / disp.height;
    const o = drag.origin;
    let { x, y, w, h } = o;

    const imgW = state.workingCanvas.width;
    const imgH = state.workingCanvas.height;
    const aspect = parseAspect(state.crop.aspect, imgW, imgH);
    const normAspect = aspect ? aspect * (imgH / imgW) : null;

    if (drag.mode === 'move') {
      x = clamp(o.x + dx, 0, 1 - o.w);
      y = clamp(o.y + dy, 0, 1 - o.h);
    } else {
      const m = drag.mode;
      let left = o.x;
      let top = o.y;
      let right = o.x + o.w;
      let bottom = o.y + o.h;

      if (m.includes('w')) left = o.x + dx;
      if (m.includes('e')) right = o.x + o.w + dx;
      if (m.includes('n')) top = o.y + dy;
      if (m.includes('s')) bottom = o.y + o.h + dy;

      if (right - left < MIN_CROP_NORM) {
        if (m.includes('w')) left = right - MIN_CROP_NORM;
        else right = left + MIN_CROP_NORM;
      }
      if (bottom - top < MIN_CROP_NORM) {
        if (m.includes('n')) top = bottom - MIN_CROP_NORM;
        else bottom = top + MIN_CROP_NORM;
      }

      left = clamp(left, 0, 1);
      right = clamp(right, 0, 1);
      top = clamp(top, 0, 1);
      bottom = clamp(bottom, 0, 1);

      x = Math.min(left, right);
      y = Math.min(top, bottom);
      w = Math.abs(right - left);
      h = Math.abs(bottom - top);

      if (normAspect) {
        const cx = o.x + o.w / 2;
        const cy = o.y + o.h / 2;
        const isCorner = m.length === 2;
        const isEdge = m.length === 1;

        if (isCorner || isEdge) {
          let newW = w;
          let newH = newW / normAspect;
          if (m === 'n' || m === 's') {
            newH = h;
            newW = newH * normAspect;
          }
          if (newW > 1) {
            newW = 1;
            newH = newW / normAspect;
          }
          if (newH > 1) {
            newH = 1;
            newW = newH * normAspect;
          }
          if (newW < MIN_CROP_NORM) {
            newW = MIN_CROP_NORM;
            newH = newW / normAspect;
          }
          if (newH < MIN_CROP_NORM) {
            newH = MIN_CROP_NORM;
            newW = newH * normAspect;
          }

          if (m.includes('e') && !m.includes('w')) {
            x = o.x;
            if (x + newW > 1) x = 1 - newW;
          } else if (m.includes('w') && !m.includes('e')) {
            x = o.x + o.w - newW;
            if (x < 0) x = 0;
          } else {
            x = clamp(cx - newW / 2, 0, 1 - newW);
          }

          if (m.includes('s') && !m.includes('n')) {
            y = o.y;
            if (y + newH > 1) y = 1 - newH;
          } else if (m.includes('n') && !m.includes('s')) {
            y = o.y + o.h - newH;
            if (y < 0) y = 0;
          } else {
            y = clamp(cy - newH / 2, 0, 1 - newH);
          }
          w = newW;
          h = newH;
        }
      }
    }

    state.crop.x = x;
    state.crop.y = y;
    state.crop.w = w;
    state.crop.h = h;
    updateCropOverlay();
  }

  if (cropRectEl) cropRectEl.addEventListener('pointerdown', cropPointerDown);

  function applyCrop() {
    if (!state.hasImage || !state.workingCanvas) return;

    const hasStraighten = Math.abs(state.params.rotation) > 0.001;
    const fullCrop =
      state.crop.x <= 0.0001 &&
      state.crop.y <= 0.0001 &&
      state.crop.w >= 0.999 &&
      state.crop.h >= 0.999;

    if (!hasStraighten && fullCrop) {
      resetCropRect();
      showToast('Nema izmene za primenu');
      return;
    }

    busyStart('crop', 'Primenjujem isecanje…', hasStraighten ? 'Ispravljanje + crop' : 'Crop');
    requestAnimationFrame(() => {
      try {
        let src = state.workingCanvas;
        if (hasStraighten) {
          src = Engine.rotateCoverCanvas(src, state.params.rotation);
          state.ops.push({ type: 'rotate', deg: state.params.rotation });
          state.params.rotation = 0;
        }

        const sx = Math.round(state.crop.x * src.width);
        const sy = Math.round(state.crop.y * src.height);
        const sw = Math.max(1, Math.round(state.crop.w * src.width));
        const sh = Math.max(1, Math.round(state.crop.h * src.height));

        const dest = document.createElement('canvas');
        dest.width = sw;
        dest.height = sh;
        dest.getContext('2d').drawImage(src, sx, sy, sw, sh, 0, 0, sw, sh);

        state.ops.push({
          type: 'crop',
          x: state.crop.x,
          y: state.crop.y,
          w: state.crop.w,
          h: state.crop.h
        });
        setWorkingFromCanvas(dest);
        resetCropRect();
        invalidateScene();
        pushHistory();
        scheduleRender(false);
        scheduleSceneAnalysis(150);
        showToast('Isecanje primenjeno');
      } finally {
        busyEnd('crop');
      }
    });
  }

  // ========== UI: TOOLS / CHIPS / DIAL ==========
  function setTool(tool) {
    state.ui.tool = tool;
    $$('.tool-btn').forEach((b) => {
      const on = b.dataset.tool === tool;
      b.classList.toggle('active', on);
      b.setAttribute('aria-selected', on ? 'true' : 'false');
    });

    const isAdj =
      tool === 'adjust' || tool === 'color' || tool === 'effects' || tool === 'portrait';
    const showDial = isAdj || tool === 'crop';

    if (dialRow) dialRow.hidden = !showDial;
    if (chipsScroll) chipsScroll.hidden = !showDial;
    if (panelLooks) panelLooks.hidden = tool !== 'looks';
    if (panelCrop) panelCrop.hidden = tool !== 'crop';
    if (panelPortrait) panelPortrait.hidden = tool !== 'portrait';

    setCropMode(tool === 'crop');

    if (showDial) {
      const list = TOOL_ADJUSTMENTS[tool] || TOOL_ADJUSTMENTS.adjust;
      const prefer = state.ui.activeAdj;
      const next = list.find((a) => a.id === prefer) || list[0];
      buildChips(list, next.id);
      selectAdj(next.id, true);
    }

    if (tool === 'looks') {
      setLooksTab(state.ui.looksTab || 'film');
    }

    if (topbarTitle) {
      const titles = {
        adjust: 'Svetlo',
        color: 'Boja',
        effects: 'Efekti',
        looks: 'Look',
        crop: 'Isecanje',
        portrait: 'Portret'
      };
      topbarTitle.textContent = state.hasImage ? titles[tool] || 'Uredi' : 'Hermiona';
    }
  }

  function buildChips(list, activeId) {
    if (!chipsEl) return;
    chipsEl.innerHTML = '';
    list.forEach((adj) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'chip';
      btn.dataset.adj = adj.id;
      btn.setAttribute('role', 'option');
      btn.innerHTML =
        '<span class="chip-icon">' +
        (CHIP_SVG[adj.id] || CHIP_SVG.exposure) +
        '</span><span class="chip-label">' +
        adj.label +
        '</span>';

      // tap = select
      btn.addEventListener('click', (e) => {
        // double-tap handled separately
        if (btn._ignoreClick) {
          btn._ignoreClick = false;
          return;
        }
        selectAdj(adj.id);
      });

      // double-tap = reset
      btn.addEventListener('dblclick', (e) => {
        e.preventDefault();
        resetAdj(adj);
      });

      // long-press = fine adjust
      bindLongPress(btn, {
        onLongPress: (ev) => startFineAdjust(adj, ev),
        onDoubleTap: () => resetAdj(adj)
      });

      chipsEl.appendChild(btn);
    });
    markChipModified();
    if (activeId) {
      const active = chipsEl.querySelector('[data-adj="' + activeId + '"]');
      if (active) {
        active.classList.add('active');
        active.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
      }
    }
  }

  function selectAdj(id, silent) {
    state.ui.activeAdj = id;
    if (chipsEl) {
      chipsEl.querySelectorAll('.chip').forEach((c) => {
        c.classList.toggle('active', c.dataset.adj === id);
      });
      const active = chipsEl.querySelector('[data-adj="' + id + '"]');
      if (active && !silent) {
        active.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
      }
    }
    updateDialUI();
  }

  function updateDialUI() {
    const adj = findAdj(state.ui.activeAdj);
    if (!adj || !activeDial) return;

    const val = getAdjValue(adj);

    activeDial.min = String(adj.min);
    activeDial.max = String(adj.max);
    activeDial.step = String(adj.step);
    activeDial.value = String(val);

    if (dialName) dialName.textContent = adj.label;
    if (dialValue) {
      dialValue.textContent = formatAdjValue(adj, val);
      dialValue.classList.toggle('neutral', !isAdjModified(adj));
    }
    if (dialReset) dialReset.hidden = !isAdjModified(adj);

    // center mark only for bipolar sliders
    const mark = document.querySelector('.dial-center-mark');
    if (mark) mark.style.display = adj.min < 0 && adj.max > 0 ? '' : 'none';
  }

  function markChipModified() {
    if (!chipsEl) return;
    chipsEl.querySelectorAll('.chip').forEach((c) => {
      const adj = findAdj(c.dataset.adj);
      c.classList.toggle('modified', isAdjModified(adj));
    });
  }

  function updateToolDots() {
    $$('.tool-btn').forEach((btn) => {
      const tool = btn.dataset.tool;
      let has = false;
      if (tool === 'adjust' || tool === 'color' || tool === 'effects') {
        has = (TOOL_ADJUSTMENTS[tool] || []).some(isAdjModified);
      } else if (tool === 'looks') {
        has =
          state.look.film !== 'none' ||
          state.look.camera !== 'none' ||
          state.look.lens !== 'none';
      } else if (tool === 'portrait') {
        has =
          state.optics.focusManual ||
          Math.abs(state.optics.strength - 0.55) > 0.01 ||
          Math.abs(state.optics.apertureStrength - 0.55) > 0.01 ||
          Math.abs(state.optics.bokehAmount - 0.55) > 0.01;
      } else if (tool === 'crop') {
        has =
          Math.abs(state.params.rotation) > 0.01 ||
          state.crop.w < 0.999 ||
          state.crop.h < 0.999;
      }
      btn.classList.toggle('has-edits', has);
    });
  }

  function resetAdj(adj) {
    if (!adj) return;
    pushHistory();
    if (adj.id === 'aperture') {
      state.optics.apertureSlider = adj.def;
      const ap = apertureFromSlider(adj.def);
      state.optics.apertureStrength = ap.strength;
    } else if (adj.id === 'focusDepth') {
      state.optics.focusManual = false;
      if (state.scene && state.scene.focusDepth != null) {
        state.optics.focusDepth = state.scene.focusDepth;
      } else {
        state.optics.focusDepth = adj.def / 100;
      }
    } else {
      setAdjValue(adj, adj.def);
    }
    updateDialUI();
    markChipModified();
    updateToolDots();
    scheduleRender(false);
    hapticLight();
    showToast(adj.label + ' reset', 900);
  }

  // Dial input
  if (activeDial) {
    activeDial.addEventListener('pointerdown', () => beginScrub());
    activeDial.addEventListener('input', () => {
      const adj = findAdj(state.ui.activeAdj);
      if (!adj) return;
      const val = parseFloat(activeDial.value);
      setAdjValue(adj, val, { silent: true });
      if (dialValue) {
        dialValue.textContent = formatAdjValue(adj, val);
        dialValue.classList.toggle('neutral', !isAdjModified(adj));
      }
      if (dialReset) dialReset.hidden = !isAdjModified(adj);
      markChipModified();
      updateToolDots();
      scheduleRender(true);
    });
    activeDial.addEventListener('change', () => endScrub());
    activeDial.addEventListener('pointerup', () => endScrub());
    activeDial.addEventListener('pointercancel', () => endScrub());
  }

  if (dialReset) {
    dialReset.addEventListener('click', () => {
      const adj = findAdj(state.ui.activeAdj);
      resetAdj(adj);
    });
  }

  // Tool rail
  $$('.tool-btn').forEach((btn) => {
    btn.addEventListener('click', () => setTool(btn.dataset.tool));
  });

  // Looks segment
  function setLooksTab(tab) {
    state.ui.looksTab = tab;
    $$('.seg-btn').forEach((b) => b.classList.toggle('active', b.dataset.looks === tab));
    if (filmLooksEl) filmLooksEl.hidden = tab !== 'film';
    if (cameraLooksEl) cameraLooksEl.hidden = tab !== 'camera';
    if (lensLooksEl) lensLooksEl.hidden = tab !== 'lens';
    syncLookUI();
  }
  $$('.seg-btn').forEach((btn) => {
    btn.addEventListener('click', () => setLooksTab(btn.dataset.looks));
  });

  if (lookIntensity) {
    lookIntensity.addEventListener('pointerdown', () => beginScrub());
    lookIntensity.addEventListener('input', () => {
      const tab = state.ui.looksTab || 'film';
      const meta = LOOK_INTENSITY[tab];
      if (!meta) return;
      const val = parseFloat(lookIntensity.value);
      state.look[meta.id] = val;
      state.lookQuality = 'preview';
      if (lookIntensityValue) lookIntensityValue.textContent = String(val);
      scheduleRender(true);
    });
    lookIntensity.addEventListener('change', () => endScrub());
    lookIntensity.addEventListener('pointerup', () => endScrub());
  }

  // ========== LONG PRESS / FINE ADJUST ==========
  function bindLongPress(el, { onLongPress, onDoubleTap }) {
    let timer = null;
    let startX = 0;
    let startY = 0;
    let lastTap = 0;
    let longFired = false;

    el.addEventListener('pointerdown', (e) => {
      if (e.button != null && e.button !== 0) return;
      longFired = false;
      startX = e.clientX;
      startY = e.clientY;
      clearTimeout(timer);
      timer = setTimeout(() => {
        longFired = true;
        el._ignoreClick = true;
        hapticLight();
        if (onLongPress) onLongPress(e);
      }, 380);
    });

    el.addEventListener('pointermove', (e) => {
      if (!timer) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      if (dx * dx + dy * dy > 64) {
        clearTimeout(timer);
        timer = null;
      }
    });

    const cancel = (e) => {
      clearTimeout(timer);
      timer = null;
      // double tap detection on pointerup if not long
      if (!longFired && onDoubleTap) {
        const now = Date.now();
        if (now - lastTap < 280) {
          el._ignoreClick = true;
          onDoubleTap();
          lastTap = 0;
        } else {
          lastTap = now;
        }
      }
    };
    el.addEventListener('pointerup', cancel);
    el.addEventListener('pointercancel', () => {
      clearTimeout(timer);
      timer = null;
    });
    el.addEventListener('pointerleave', () => {
      // don't cancel on leave for mouse — only touch-like
    });
  }

  let fineState = null;

  function startFineAdjust(adj, ev) {
    if (!fineOverlay || !adj) return;
    selectAdj(adj.id);
    const startVal = getAdjValue(adj);
    const startX = ev.clientX != null ? ev.clientX : 0;
    fineState = {
      adj,
      startVal,
      startX,
      // pixels per full range — ~half screen width for full travel, fine = slower
      scale: (adj.max - adj.min) / (Math.min(window.innerWidth, 420) * 0.85)
    };

    fineOverlay.hidden = false;
    if (fineName) fineName.textContent = adj.label;
    if (fineValue) fineValue.textContent = formatAdjValue(adj, startVal);
    beginScrub();

    const move = (e) => {
      if (!fineState) return;
      if (e.cancelable) e.preventDefault();
      const dx = e.clientX - fineState.startX;
      let val = fineState.startVal + dx * fineState.scale;
      // fine mode: hold slightly slower
      val = clamp(val, fineState.adj.min, fineState.adj.max);
      setAdjValue(fineState.adj, val, { silent: true });
      const shown = getAdjValue(fineState.adj);
      if (fineValue) fineValue.textContent = formatAdjValue(fineState.adj, shown);
      updateDialUI();
      markChipModified();
      scheduleRender(true);
    };

    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
      fineOverlay.hidden = true;
      fineState = null;
      endScrub();
      hapticLight();
    };

    window.addEventListener('pointermove', move, { passive: false });
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
  }

  // ========== HOLD PHOTO TO COMPARE ==========
  let compareTimer = null;
  let comparePointerId = null;

  function startCompare() {
    if (!state.hasImage || state.crop.active) return;
    state.isComparing = true;
    if (canvasArea) canvasArea.classList.add('comparing');
    render(false);
  }

  function endCompare() {
    if (!state.isComparing) return;
    state.isComparing = false;
    if (canvasArea) canvasArea.classList.remove('comparing');
    render(false);
  }

  if (canvasArea) {
    canvasArea.addEventListener('pointerdown', (e) => {
      if (!state.hasImage) return;
      if (state.crop.active) return;
      if (e.target.closest('.crop-layer')) return;
      if (e.target.closest('button')) return;
      // ignore multi-touch
      if (e.isPrimary === false) return;

      comparePointerId = e.pointerId;
      clearTimeout(compareTimer);
      compareTimer = setTimeout(() => {
        startCompare();
        hapticLight();
      }, 220);
    });

    const cancelCompareGesture = (e) => {
      if (comparePointerId != null && e.pointerId !== comparePointerId) return;
      clearTimeout(compareTimer);
      compareTimer = null;
      comparePointerId = null;
      endCompare();
    };

    canvasArea.addEventListener('pointerup', cancelCompareGesture);
    canvasArea.addEventListener('pointercancel', cancelCompareGesture);
    canvasArea.addEventListener('pointerleave', (e) => {
      if (e.pointerType === 'mouse') cancelCompareGesture(e);
    });
    // movement cancels pending compare (allows pan later)
    canvasArea.addEventListener('pointermove', (e) => {
      if (!compareTimer) return;
      // small movement ok
    });
  }

  // ========== CONTROLS ENABLE / RESET ==========
  function enableControls(enabled) {
    if (!state.exporting) btnDownload.disabled = !enabled;
    if (btnReset) btnReset.disabled = !enabled;
    if (btnClose) btnClose.disabled = !enabled;
    updateHistoryButtons();
  }

  function resetParams(silent) {
    const defaults = {
      exposure: 0,
      contrast: 0,
      highlights: 0,
      shadows: 0,
      whites: 0,
      blacks: 0,
      temperature: 0,
      tint: 0,
      saturation: 0,
      vibrance: 0,
      clarity: 0,
      sharpen: 0,
      vignette: 0,
      grain: 0,
      rotation: 0,
      flipH: false,
      flipV: false
    };
    Object.assign(state.params, defaults);
    if (!silent) {
      updateDialUI();
      markChipModified();
      updateToolDots();
    }
  }

  function hardResetAll() {
    if (!state.hasImage) return;
    pushHistory();
    resetParams(true);
    resetLooks(true);
    state.optics.strength = 0.55;
    state.optics.apertureStrength = 0.55;
    state.optics.apertureSlider = 55;
    state.optics.bokehAmount = 0.55;
    state.optics.focusManual = false;
    state.optics.focusDepth = 0.3;
    state.optics.focalRecipe = '50';
    state.optics.bokehShape = 'auto';
    state.optics.enabled = true;
    if (opticsEnabledEl) opticsEnabledEl.checked = true;
    state.debugScene = 'off';
    resetCropRect();
    syncFocalBokeh();
    $$('.debug-btn').forEach((b) => b.classList.toggle('active', b.dataset.debug === 'off'));
    updateDialUI();
    markChipModified();
    updateToolDots();
    scheduleRender(false);
    pushHistory();
    showToast('Sve resetovano');
  }

  function syncRatioChips() {
    $$('.ratio-chip[data-ratio]').forEach((b) => {
      b.classList.toggle('active', b.dataset.ratio === state.crop.aspect);
    });
  }

  function syncFocalBokeh() {
    $$('[data-focal]').forEach((b) => {
      b.classList.toggle('active', b.dataset.focal === state.optics.focalRecipe);
    });
    $$('[data-bokeh]').forEach((b) => {
      b.classList.toggle('active', b.dataset.bokeh === state.optics.bokehShape);
    });
  }

  // Scene / portrait controls
  if (btnSceneAnalyze) {
    btnSceneAnalyze.addEventListener('click', () => runSceneAnalysis());
  }
  if (opticsEnabledEl) {
    opticsEnabledEl.addEventListener('change', () => {
      pushHistory();
      state.optics.enabled = opticsEnabledEl.checked;
      scheduleRender(false);
      pushHistory();
    });
  }
  $$('.debug-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      $$('.debug-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      state.debugScene = btn.dataset.debug || 'off';
      scheduleRender(false);
    });
  });
  $$('[data-focal]').forEach((btn) => {
    btn.addEventListener('click', () => {
      pushHistory();
      $$('[data-focal]').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      state.optics.focalRecipe = btn.dataset.focal || '50';
      scheduleRender(false);
      scheduleHistoryPush();
    });
  });
  $$('[data-bokeh]').forEach((btn) => {
    btn.addEventListener('click', () => {
      pushHistory();
      $$('[data-bokeh]').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      state.optics.bokehShape = btn.dataset.bokeh || 'auto';
      scheduleRender(false);
      scheduleHistoryPush();
    });
  });

  // Aspect ratio
  $$('.ratio-chip[data-ratio]').forEach((btn) => {
    btn.addEventListener('click', () => {
      $$('.ratio-chip[data-ratio]').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      state.crop.aspect = btn.dataset.ratio;
      if (state.crop.aspect !== 'free') {
        applyAspectToCrop(state.crop.aspect);
      }
      updateCropOverlay();
      scheduleHistoryPush();
    });
  });

  // ========== EXPORT ==========
  function estimateExportDims() {
    if (!state.hasImage || !state.workingCanvas) return '';
    const ww = state.workingCanvas.width;
    const wh = state.workingCanvas.height;
    const size = state.export.size;
    if (size === 'working') {
      return 'Izlaz: ' + ww + ' × ' + wh + ' px (pregled · brzo)';
    }
    let ow = state.originalImage ? state.originalImage.naturalWidth : ww;
    let oh = state.originalImage ? state.originalImage.naturalHeight : wh;
    for (const op of state.ops) {
      if (op.type === 'rotate' && (Math.abs(op.deg) === 90 || Math.abs(op.deg) === 270)) {
        const t = ow;
        ow = oh;
        oh = t;
      } else if (op.type === 'crop') {
        ow = Math.max(1, Math.round(ow * op.w));
        oh = Math.max(1, Math.round(oh * op.h));
      }
    }
    let outW = ow;
    let outH = oh;
    const HARD = (Export && Export.HARD_MAX_LONG_EDGE) || 8192;
    const long = Math.max(outW, outH);
    if (size === '1080' || size === '2048') {
      const target = size === '1080' ? 1080 : 2048;
      if (long > target) {
        const s = target / long;
        outW = Math.max(1, Math.round(outW * s));
        outH = Math.max(1, Math.round(outH * s));
      }
    } else if (size === 'full' && long > HARD) {
      const s = HARD / long;
      outW = Math.max(1, Math.round(outW * s));
      outH = Math.max(1, Math.round(outH * s));
    }
    const note =
      size === 'full'
        ? long > HARD
          ? ' · cap ' + HARD + 'px'
          : ' · izvorni pikseli'
        : ' · full pipeline';
    return 'Izlaz ≈ ' + outW + ' × ' + outH + ' px' + note;
  }

  function updateExportSheetUI() {
    if (exportMetaWorking && state.workingCanvas) {
      exportMetaWorking.textContent =
        state.workingCanvas.width + '×' + state.workingCanvas.height;
    }
    if (exportMetaFull && state.originalImage) {
      exportMetaFull.textContent =
        state.originalImage.naturalWidth + '×' + state.originalImage.naturalHeight;
    }
    if (exportDimHint) exportDimHint.textContent = estimateExportDims();
    if (exportQualityWrap) {
      exportQualityWrap.style.display = state.export.format === 'jpeg' ? '' : 'none';
    }
  }

  function openExportSheet() {
    if (!state.hasImage || state.exporting) return;
    updateExportSheetUI();
    if (exportBackdrop) exportBackdrop.hidden = false;
    if (exportSheet) exportSheet.hidden = false;
  }

  function closeExportSheet() {
    if (exportBackdrop) exportBackdrop.hidden = true;
    if (exportSheet) exportSheet.hidden = true;
  }

  $$('.export-size-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      $$('.export-size-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      state.export.size = btn.dataset.size;
      updateExportSheetUI();
    });
  });

  $$('.export-format-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      $$('.export-format-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      state.export.format = btn.dataset.format;
      updateExportSheetUI();
    });
  });

  if (exportQuality) {
    exportQuality.addEventListener('input', () => {
      state.export.quality = parseFloat(exportQuality.value);
      if (exportQualityValue) {
        exportQualityValue.textContent = Math.round(state.export.quality * 100) + '%';
      }
    });
  }

  if (btnExportCancel) btnExportCancel.addEventListener('click', closeExportSheet);
  if (exportBackdrop) exportBackdrop.addEventListener('click', closeExportSheet);
  if (btnExportConfirm) btnExportConfirm.addEventListener('click', () => runExport());

  async function runExport() {
    if (!state.hasImage || state.exporting) return;
    state.exporting = true;
    closeExportSheet();
    const sizeLabel =
      state.export.size === 'full'
        ? 'puna rezolucija'
        : state.export.size === 'working'
          ? 'pregled'
          : state.export.size + 'px';
    busyStart(
      'export',
      'Pripremam export…',
      sizeLabel + ' · ' + (state.export.format || 'jpeg').toUpperCase()
    );
    setButtonBusy(btnDownload, true, '…', 'Gotovo');

    try {
      busyUpdate('export', 'Obrađujem filtere…', sizeLabel);
      const result = await Export.download({
        size: state.export.size,
        format: state.export.format,
        quality: state.export.quality,
        workingData: state.originalData,
        workingCanvas: state.workingCanvas,
        originalImage: state.originalImage,
        ops: state.ops,
        params: state.params,
        look: state.look,
        scene: state.scene,
        optics: {
          enabled: state.optics.enabled,
          strength: state.optics.strength,
          apertureStrength: state.optics.apertureStrength,
          focusDepth: state.optics.focusDepth,
          focalRecipe: state.optics.focalRecipe || '50',
          bokehShape: state.optics.bokehShape || 'auto',
          bokehAmount: state.optics.bokehAmount != null ? state.optics.bokehAmount : 0.55
        },
        maxWorkingSize: state.maxWorkingSize
      });
      showToast('Sačuvano · ' + result.width + '×' + result.height);
    } catch (err) {
      console.error(err);
      alert('Export nije uspeo: ' + (err.message || err));
    } finally {
      state.exporting = false;
      busyEnd('export');
      setButtonBusy(btnDownload, false, '…', 'Gotovo');
      btnDownload.disabled = !state.hasImage;
    }
  }

  // ========== ACTIONS ==========
  btnUpload.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', (e) => {
    if (e.target.files[0]) loadImage(e.target.files[0]);
  });

  ['dragenter', 'dragover'].forEach((evt) => {
    canvasArea.addEventListener(evt, (e) => {
      e.preventDefault();
      e.stopPropagation();
      canvasArea.classList.add('drag-over');
    });
  });
  ['dragleave', 'drop'].forEach((evt) => {
    canvasArea.addEventListener(evt, (e) => {
      e.preventDefault();
      e.stopPropagation();
      canvasArea.classList.remove('drag-over');
    });
  });
  canvasArea.addEventListener('drop', (e) => {
    const file = e.dataTransfer.files[0];
    if (file) loadImage(file);
  });
  dropOverlay.addEventListener('click', (e) => {
    if (e.target.closest('button')) return;
    fileInput.click();
  });

  btnDownload.addEventListener('click', () => openExportSheet());
  if (btnReset) btnReset.addEventListener('click', () => hardResetAll());
  if (btnClose) {
    btnClose.addEventListener('click', () => {
      if (!state.hasImage) {
        fileInput.click();
        return;
      }
      if (confirm('Zatvori i učitaj novu sliku? Izmene neće biti sačuvane.')) {
        state.hasImage = false;
        state.originalImage = null;
        state.originalData = null;
        state.scrubData = null;
        state.workingCanvas = null;
        state.ops = [];
        state.scene = null;
        canvas.classList.remove('visible');
        if (dock) dock.hidden = true;
        dropOverlay.classList.remove('hidden');
        enableControls(false);
        if (lookChip) lookChip.hidden = true;
        if (topbarTitle) topbarTitle.textContent = 'Hermiona';
        fileInput.value = '';
        fileInput.click();
      }
    });
  }
  if (btnUndo) btnUndo.addEventListener('click', () => undo());
  if (btnRedo) btnRedo.addEventListener('click', () => redo());

  function rotateWorking(deg) {
    if (!state.workingCanvas) return;
    const dest = Engine.rotate90Canvas(state.workingCanvas, deg);
    state.ops.push({ type: 'rotate', deg: deg });
    setWorkingFromCanvas(dest);
    state.crop.x = 0;
    state.crop.y = 0;
    state.crop.w = 1;
    state.crop.h = 1;
    state.params.rotation = 0;
    if (state.crop.aspect && state.crop.aspect !== 'free') {
      applyAspectToCrop(state.crop.aspect);
    }
    invalidateScene();
    pushHistory();
    scheduleRender(false);
    requestAnimationFrame(() => updateCropOverlay());
    scheduleSceneAnalysis(150);
  }

  function flipWorking(horizontal, vertical) {
    if (!state.workingCanvas) return;
    const dest = Engine.flipCanvas(state.workingCanvas, horizontal, vertical);
    state.ops.push({ type: 'flip', h: horizontal, v: vertical });
    setWorkingFromCanvas(dest);
    if (horizontal) state.crop.x = 1 - state.crop.x - state.crop.w;
    if (vertical) state.crop.y = 1 - state.crop.y - state.crop.h;
    invalidateScene();
    pushHistory();
    scheduleRender(false);
    requestAnimationFrame(() => updateCropOverlay());
    scheduleSceneAnalysis(150);
  }

  if (btnRotateLeft) btnRotateLeft.addEventListener('click', () => rotateWorking(-90));
  if (btnRotateRight) btnRotateRight.addEventListener('click', () => rotateWorking(90));
  if (btnFlipH) btnFlipH.addEventListener('click', () => flipWorking(true, false));
  if (btnFlipV) btnFlipV.addEventListener('click', () => flipWorking(false, true));
  if (btnCropApply) btnCropApply.addEventListener('click', () => applyCrop());
  if (btnCropReset) {
    btnCropReset.addEventListener('click', () => {
      resetCropRect();
      state.params.rotation = 0;
      updateDialUI();
      scheduleRender(false);
      scheduleHistoryPush();
    });
  }

  window.addEventListener('resize', () => {
    if (state.crop.active) updateCropOverlay();
  });

  document.addEventListener('keydown', (e) => {
    if (e.code === 'Escape') {
      if (exportSheet && !exportSheet.hidden) {
        closeExportSheet();
        return;
      }
      if (fineOverlay && !fineOverlay.hidden) {
        fineOverlay.hidden = true;
        fineState = null;
        endScrub();
        return;
      }
      return;
    }
    if (!state.hasImage) return;

    const meta = e.metaKey || e.ctrlKey;
    if (meta && e.key === 'z' && !e.shiftKey) {
      e.preventDefault();
      undo();
      return;
    }
    if (meta && (e.key === 'Z' || (e.key === 'z' && e.shiftKey) || e.key === 'y')) {
      e.preventDefault();
      redo();
      return;
    }

    if (e.code === 'Space') {
      e.preventDefault();
      startCompare();
    }
    if (e.code === 'Enter' && state.crop.active && meta) {
      e.preventDefault();
      applyCrop();
    }
  });

  document.addEventListener('keyup', (e) => {
    if (e.code === 'Space') endCompare();
  });

  // Init
  buildLookCards();
  const apInit = apertureFromSlider(55);
  state.optics.apertureStrength = apInit.strength;
  if (dock) dock.hidden = true;
  enableControls(false);

  if (Scene && Scene.preload) {
    setTimeout(() => Scene.preload(), 1500);
  }

  console.log('Hermiona ready ✦ iOS editor UI');
})();
