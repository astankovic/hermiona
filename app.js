/**
 * HERMIONE — Ultramodern iOS-style photo editor
 * Iris mark · SPA · Canvas · iPhone Photos UX
 */

(() => {
  'use strict';

  const Engine = window.HermioneEngine;
  const Export = window.HermioneExport;
  const Looks = window.HermioneLooks;
  const Scene = window.HermioneScene;
  const UserPresets = window.HermioneUserPresets;
  const Draft = window.HermioneDraft;
  const Borders = window.HermioneBorders;

  if (!Engine || !Export) {
    console.error('Hermione: engine/export modules missing');
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
    softCorners:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="8" opacity="0.35"/><path d="M4 4l2 2M20 4l-2 2M4 20l2-2M20 20l-2-2" opacity="0.5"/></svg>',
    leakEdge:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><path d="M4 4h16v4H4z" opacity="0.35"/><path d="M18 4v16" opacity="0.7"/><path d="M4 8l14-4" opacity="0.5"/></svg>',
    dust:
      '<svg viewBox="0 0 24 24" fill="currentColor" stroke="none"><circle cx="7" cy="8" r="1.2"/><circle cx="14" cy="6" r="0.8"/><circle cx="18" cy="12" r="1"/><circle cx="9" cy="15" r="0.7"/><circle cx="15" cy="17" r="1.1"/></svg>',
    scratches:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M8 3v18M12 5v14M16 2v20" opacity="0.8"/></svg>',
    gate:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><rect x="4" y="5" width="16" height="14" rx="1"/><rect x="7" y="8" width="10" height="8" opacity="0.4"/></svg>',
    uneven:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M4 6h16M4 12h16M4 18h16" opacity="0.35"/><path d="M4 4v16" stroke-width="3" opacity="0.7"/></svg>',
    barrel:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M5 7c2 3 2 7 0 10M19 7c-2 3-2 7 0 10M8 4h8M8 20h8"/></svg>',
    lateralCA:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="10" cy="12" r="5" opacity="0.45"/><circle cx="14" cy="12" r="5" opacity="0.75"/></svg>',
    ghost:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="5" width="12" height="12" rx="1" opacity="0.45"/><rect x="9" y="7" width="12" height="12" rx="1"/></svg>',
    stains:
      '<svg viewBox="0 0 24 24" fill="currentColor" stroke="none"><ellipse cx="9" cy="10" rx="5" ry="4" opacity="0.45"/><ellipse cx="16" cy="15" rx="4" ry="3" opacity="0.35"/></svg>',
    border:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><rect x="5" y="3" width="14" height="18" rx="1"/><rect x="7" y="5" width="10" height="10" opacity="0.4"/></svg>',
    dateStamp:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><path d="M6 18h12M8 18V9l2-2h4l2 2v9"/><path d="M10 13h4" opacity="0.6"/></svg>',
    halationBlur:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="12" r="3" fill="currentColor" opacity="0.35" stroke="none"/><circle cx="12" cy="12" r="7" opacity="0.5"/><circle cx="12" cy="12" r="10" opacity="0.25"/></svg>',
    highlightRoll:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><path d="M4 16c4-8 12-8 16 0"/><path d="M4 18h16" opacity="0.4"/></svg>',
    imperfIntensity:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="12" cy="12" r="8"/><path d="M12 8v8M8 12h8"/></svg>',
    dofStrength:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="8" opacity="0.35"/><path d="M4 12h2M18 12h2" opacity="0.5"/></svg>',
    aperture:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="9"/><path d="M12 3l3.5 6H20l-3 5 1.5 7L12 17l-6.5 4L7 14 4 9h4.5z"/></svg>',
    focusDepth:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><circle cx="12" cy="12" r="3"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4"/></svg>',
    bokehAmount:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="8" cy="10" r="3" opacity="0.5"/><circle cx="15" cy="9" r="4" opacity="0.7"/><circle cx="12" cy="15" r="2.5" opacity="0.45"/></svg>',
    skinSoft:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="10" r="5"/><path d="M8 20c1.5-3 6.5-3 8 0" opacity="0.5"/></svg>',
    subjectPunch:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M12 4v16M4 12h16"/><circle cx="12" cy="12" r="3"/></svg>'
  };

  /** @typedef {{ id:string, label:string, min:number, max:number, step:number, def:number, store:'params'|'look'|'optics', opticsKey?:string, format?:string }} AdjDef */

  /** @type {Record<string, AdjDef[]>} */
  const TOOL_ADJUSTMENTS = {
    // iPhone Photos style: one Adjust filmstrip (light + color + effects)
    adjust: [
      { id: 'exposure', label: 'Exposure', min: -2, max: 2, step: 0.01, def: 0, store: 'params', format: 'exp' },
      { id: 'contrast', label: 'Contrast', min: -100, max: 100, step: 1, def: 0, store: 'params' },
      { id: 'highlights', label: 'Highlights', min: -100, max: 100, step: 1, def: 0, store: 'params' },
      { id: 'shadows', label: 'Shadows', min: -100, max: 100, step: 1, def: 0, store: 'params' },
      { id: 'whites', label: 'Whites', min: -100, max: 100, step: 1, def: 0, store: 'params' },
      { id: 'blacks', label: 'Blacks', min: -100, max: 100, step: 1, def: 0, store: 'params' },
      { id: 'temperature', label: 'Temperature', min: -100, max: 100, step: 1, def: 0, store: 'params' },
      { id: 'tint', label: 'Tint', min: -100, max: 100, step: 1, def: 0, store: 'params' },
      { id: 'saturation', label: 'Saturation', min: -100, max: 100, step: 1, def: 0, store: 'params' },
      { id: 'vibrance', label: 'Vibrance', min: -100, max: 100, step: 1, def: 0, store: 'params' },
      { id: 'clarity', label: 'Clarity', min: -100, max: 100, step: 1, def: 0, store: 'params' },
      { id: 'sharpen', label: 'Sharpen', min: 0, max: 100, step: 1, def: 0, store: 'params' },
      { id: 'vignette', label: 'Vignette', min: 0, max: 100, step: 1, def: 0, store: 'params' },
      { id: 'grain', label: 'Grain', min: 0, max: 100, step: 1, def: 0, store: 'params' },
      { id: 'bloom', label: 'Bloom', min: 0, max: 100, step: 1, def: 0, store: 'look' },
      { id: 'ca', label: 'CA', min: 0, max: 100, step: 1, def: 0, store: 'look' }
    ],
    portrait: [
      { id: 'dofStrength', label: 'DoF amount', min: 0, max: 100, step: 1, def: 55, store: 'optics', opticsKey: 'strength', format: 'pct' },
      { id: 'aperture', label: 'Aperture', min: 0, max: 100, step: 1, def: 55, store: 'optics', opticsKey: 'apertureStrength', format: 'fstop' },
      { id: 'focusDepth', label: 'Focus', min: 0, max: 100, step: 1, def: 30, store: 'optics', opticsKey: 'focusDepth', format: 'pct' },
      { id: 'bokehAmount', label: 'Bokeh', min: 0, max: 100, step: 1, def: 55, store: 'optics', opticsKey: 'bokehAmount', format: 'pct' },
      { id: 'skinSoft', label: 'Skin soft', min: 0, max: 100, step: 1, def: 0, store: 'optics', opticsKey: 'skinSoft', format: 'pct' },
      { id: 'subjectPunch', label: 'Subject', min: 0, max: 100, step: 1, def: 0, store: 'optics', opticsKey: 'subjectPunch', format: 'pct' }
    ],
    crop: [
      { id: 'rotation', label: 'Straighten', min: -45, max: 45, step: 0.5, def: 0, store: 'params', format: 'deg' }
    ],
    /** I6 analog imperfections */
    age: [
      { id: 'imperfIntensity', label: 'Age amount', min: 0, max: 100, step: 1, def: 100, store: 'look' },
      { id: 'softCorners', label: 'Soft corners', min: 0, max: 100, step: 1, def: 0, store: 'imperf' },
      { id: 'leakEdge', label: 'Light leak', min: 0, max: 100, step: 1, def: 0, store: 'imperf' },
      { id: 'dust', label: 'Dust', min: 0, max: 100, step: 1, def: 0, store: 'imperf' },
      { id: 'scratches', label: 'Scratches', min: 0, max: 100, step: 1, def: 0, store: 'imperf' },
      { id: 'gate', label: 'Film gate', min: 0, max: 100, step: 1, def: 0, store: 'imperf' },
      { id: 'uneven', label: 'Uneven', min: 0, max: 100, step: 1, def: 0, store: 'imperf' },
      { id: 'barrel', label: 'Barrel', min: 0, max: 100, step: 1, def: 0, store: 'imperf' },
      { id: 'lateralCA', label: 'Edge CA', min: 0, max: 100, step: 1, def: 0, store: 'imperf' },
      { id: 'ghost', label: 'Ghost', min: 0, max: 100, step: 1, def: 0, store: 'imperf' },
      { id: 'stains', label: 'Stains', min: 0, max: 100, step: 1, def: 0, store: 'imperf' },
      { id: 'dateStamp', label: 'Date stamp', min: 0, max: 100, step: 1, def: 0, store: 'imperf' },
      { id: 'halationBlur', label: 'Halation', min: 0, max: 100, step: 1, def: 0, store: 'imperf' },
      { id: 'highlightRoll', label: 'Film knee', min: 0, max: 100, step: 1, def: 0, store: 'imperf' }
    ]
  };

  const IMPERF_KEYS = [
    'softCorners',
    'leakEdge',
    'dust',
    'scratches',
    'gate',
    'uneven',
    'barrel',
    'lateralCA',
    'ghost',
    'stains',
    'dateStamp',
    'halationBlur',
    'highlightRoll'
  ];

  function emptyImperf() {
    const o = {};
    IMPERF_KEYS.forEach((k) => {
      o[k] = 0;
    });
    return o;
  }

  const LOOK_INTENSITY = {
    film: { id: 'filmIntensity', label: 'Strength', def: 100 },
    camera: { id: 'cameraIntensity', label: 'Strength', def: 100 },
    lens: { id: 'lensIntensity', label: 'Strength', def: 100 },
    presets: { id: 'presetIntensity', label: 'Strength', def: 100 }
  };

  /** Base grade keys a preset may set (geometry/rotation excluded) */
  const PRESET_PARAM_KEYS = [
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
    'clarity',
    'sharpen',
    'vignette',
    'grain'
  ];

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
    /** One-tap enhance: null | 'auto' | 'soft' | 'vivid' */
    enhanceMode: null,
    /** Active user-saved look id (Mine) or null */
    userLookId: null,
    /** Source file name for draft / export */
    sourceFileName: null,
    look: {
      film: 'none',
      filmIntensity: 100,
      camera: 'none',
      cameraIntensity: 100,
      lens: 'none',
      lensIntensity: 100,
      bloom: 0,
      ca: 0,
      /** Active curated recipe id */
      preset: 'none',
      presetIntensity: 100,
      /** I6 user imperfection overrides 0..100 (0 = off / use only if set via dials or camera seed) */
      imperf: emptyImperf(),
      imperfIntensity: 100,
      /** when false, resolve() uses camera.imperf defaults only */
      imperfManual: false
    },
    lookQuality: 'preview',
    scene: null,
    sceneStatus: 'idle',
    optics: {
      enabled: false, // portrait / DoF off by default
      strength: 0.55,
      apertureStrength: 0.55,
      apertureSlider: 55,
      focusDepth: 0.3,
      focusManual: false,
      focalRecipe: '50',
      bokehShape: 'auto',
      bokehAmount: 0.55,
      /** I5e selective 0..1 */
      skinSoft: 0,
      subjectPunch: 0
    },
    debugScene: 'off',
    crop: {
      active: false,
      x: 0,
      y: 0,
      w: 1,
      h: 1,
      aspect: 'free',
      frame: 'full', // studio suggestion id
      subject: null // cached bbox {x,y,w,h,cx,cy}
    },
    /** Print / instant borders (Border tab) — independent of crop overlay */
    border: {
      id: 'none',
      zoom: 1,
      panX: 0,
      panY: 0
    },
    /** CSS viewport — zoom/pan without reprocessing pixels */
    view: {
      zoom: 1,
      panX: 0,
      panY: 0,
      fitW: 0,
      fitH: 0,
      minZoom: 1,
      maxZoom: 8,
      /** true while canvas holds high-res filter detail for zoom */
      detailActive: false,
      detailLong: 0,
      /** Last HQ tile in full-frame pixel coords (source space) */
      detailRoi: null
    },
    export: {
      size: 'working',
      format: 'jpeg',
      quality: 0.95
    },
    ui: {
      tool: 'adjust',
      activeAdj: 'exposure',
      looksTab: 'presets',
      presetCategory: 'all',
      scrubbing: false,
      comparing: false,
      /** Optional live histogram overlay (off by default) */
      showHistogram: false
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
  const histoPanel = $('#histoPanel');
  const histoCanvas = $('#histoCanvas');
  const histoClipLow = $('#histoClipLow');
  const histoClipHigh = $('#histoClipHigh');
  const btnHistoToggle = $('#btnHistoToggle');
  const enhanceBar = $('#enhanceBar');
  const btnSaveLook = $('#btnSaveLook');
  const userLooksHint = $('#userLooksHint');
  const draftResume = $('#draftResume');
  const draftResumeSub = $('#draftResumeSub');
  const btnDraftContinue = $('#btnDraftContinue');
  const btnDraftDismiss = $('#btnDraftDismiss');

  /** Iris + wordmark for idle topbar (must match index.html brand lockup) */
  const BRAND_LOCKUP_HTML =
    '<svg class="brand-iris" width="18" height="18" viewBox="0 0 64 64" fill="none" aria-hidden="true">' +
    '<g stroke="currentColor" stroke-width="1.6" stroke-linejoin="miter" stroke-linecap="square">' +
    '<circle cx="32" cy="32" r="22.5"/>' +
    '<path d="M32 14.5 L49.5 32 L32 49.5 L14.5 32 Z"/>' +
    '<circle cx="32" cy="32" r="2.4" fill="currentColor" stroke="none"/>' +
    '</g></svg>' +
    '<span class="brand-word">HERMIONE</span>';


  const dockBody = $('#dockBody');
  let enterAnimTimer = 0;
  let exitAnimTimer = 0;
  let panelAnimTimer = 0;

  function prefersReducedMotion() {
    try {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch (e) {
      return false;
    }
  }

  let heroIrisSettleTimer = 0;

  /** Hero boot: layout settles → reveal beats → Iris freezes when composition is complete */
  function playHeroEnter() {
    document.body.classList.remove(
      'is-entering',
      'is-exiting',
      'hero-ready',
      'hero-iris-settled'
    );
    clearTimeout(heroIrisSettleTimer);
    // Double rAF so flex geometry is painted before opacity reveals fire
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        document.body.classList.add('hero-ready');
        // Last slot (foot) delay 1.28s + reveal 0.55s ≈ 1.83s; settle slightly after
        heroIrisSettleTimer = setTimeout(() => {
          document.body.classList.add('hero-iris-settled');
        }, 1900);
      });
    });
  }

  /**
   * Hero → editor: photo settles, chrome + dock rise (mobile) or slide (desktop).
   * Call after state.hasImage is true and canvas is ready to paint.
   */
  function playEditorEnter() {
    clearTimeout(heroIrisSettleTimer);
    document.body.classList.remove('hero-ready', 'hero-iris-settled', 'is-exiting');
    document.body.classList.add('has-image');
    if (dock) {
      dock.hidden = false;
      // Clear any leftover enter/exit transform so the rail never floats mid-screen
      dock.style.transform = '';
      dock.style.opacity = '';
    }
    // Mobile: photo-first — start in immersive (chrome hidden). Tap photo or a tool to work.
    // Desktop side: always full chrome.
    if (typeof cropSession !== 'undefined') {
      cropSession.open = false;
      cropSession.committing = false;
    }
    if (typeof setChromeMode === 'function') {
      chromeState.sheetOpen = false;
      const overlay =
        typeof isOverlayChrome === 'function'
          ? isOverlayChrome()
          : !document.body.classList.contains('layout-side');
      if (overlay) {
        // Restore target after enter anim: rail is the editing home; immersive is pure photo
        chromeState.mode = 'immersive';
        chromeState.beforeImmersive = 'rail';
      } else {
        chromeState.mode = 'full';
        chromeState.beforeImmersive = 'full';
      }
      applyChromeUI();
    } else if (typeof setImmersive === 'function') {
      setImmersive(false);
    }
    if (typeof syncToolChrome === 'function') syncToolChrome();
    canvas.classList.add('visible');
    // Refit after chrome mode so photo uses full viewport under glass
    requestAnimationFrame(() => {
      if (typeof layoutViewport === 'function') layoutViewport();
    });

    if (prefersReducedMotion()) {
      document.body.classList.remove('is-entering');
      return;
    }

    document.body.classList.remove('is-entering');
    void document.body.offsetWidth;
    document.body.classList.add('is-entering');
    clearTimeout(enterAnimTimer);
    enterAnimTimer = setTimeout(() => {
      document.body.classList.remove('is-entering');
      if (dock) {
        dock.style.transform = '';
        dock.style.opacity = '';
      }
    }, 900);
  }

  /** Editor → hero. Runs onDone after exit animation. */
  function playEditorExit(onDone) {
    clearTimeout(exitAnimTimer);
    if (prefersReducedMotion() || !document.body.classList.contains('has-image')) {
      document.body.classList.remove('has-image', 'is-entering', 'is-exiting');
      if (typeof onDone === 'function') onDone();
      playHeroEnter();
      return;
    }
    document.body.classList.remove('is-entering');
    document.body.classList.add('is-exiting');
    exitAnimTimer = setTimeout(() => {
      document.body.classList.remove('has-image', 'is-exiting');
      if (typeof onDone === 'function') onDone();
      playHeroEnter();
    }, 420);
  }

  /**
   * Tool-switch panel animation removed — opacity-from-0 caused a visible flash
   * (content painted, then re-hidden by keyframes). Instant swap is cleaner.
   */
  function playPanelEnter() {
    if (dockBody) dockBody.classList.remove('is-panel-enter');
    clearTimeout(panelAnimTimer);
  }

  /** Soft pulse on dial value when scrubbing */
  function tickDialValue() {
    const el = document.getElementById('dialValue');
    if (!el || prefersReducedMotion()) return;
    el.classList.remove('is-ticking');
    void el.offsetWidth;
    el.classList.add('is-ticking');
    clearTimeout(tickDialValue._t);
    tickDialValue._t = setTimeout(() => el.classList.remove('is-ticking'), 180);
  }

  function setTopbarBrand() {
    if (!topbarTitle) return;
    topbarTitle.classList.add('topbar-title--brand');
    topbarTitle.setAttribute('aria-label', 'Hermione');
    topbarTitle.innerHTML = BRAND_LOCKUP_HTML;
  }

  function setTopbarToolTitle(label) {
    if (!topbarTitle) return;
    topbarTitle.classList.remove('topbar-title--brand');
    topbarTitle.removeAttribute('aria-label');
    topbarTitle.textContent = label;
  }

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
  const btnToolCancel = $('#btnToolCancel');
  const btnToolDone = $('#btnToolDone');
  const tbClusterMain = $('#tbClusterMain');
  const tbClusterExport = $('#tbClusterExport');
  const cropLayer = $('#cropLayer');
  const cropFrame = $('#cropFrame');
  const cropRectEl = $('#cropRect');
  const canvasWrap = $('#canvasWrap');
  const zoomHud = $('#zoomHud');
  const btnZoomIn = $('#btnZoomIn');
  const btnZoomOut = $('#btnZoomOut');
  const btnZoomFit = $('#btnZoomFit');
  const subjectHint = $('#subjectHint');
  const cropHint = $('#cropHint');

  const dialRow = $('#dialRow');
  const dialName = $('#dialName');
  const dialValue = $('#dialValue');
  const dialReset = $('#dialReset');
  const activeDial = $('#activeDial');
  const chipsScroll = $('#chipsScroll');
  const chipsEl = $('#chips');

  const panelLooks = $('#panelLooks');
  const panelCrop = $('#panelCrop');
  const panelBorder = $('#panelBorder');
  const borderFormatScroll = $('#borderFormatScroll');
  const borderFraming = $('#borderFraming');
  const borderFramingGroup = $('#borderFramingGroup');
  const borderZoom = $('#borderZoom');
  const borderPanX = $('#borderPanX');
  const borderPanY = $('#borderPanY');
  const borderZoomVal = $('#borderZoomVal');
  const borderPanXVal = $('#borderPanXVal');
  const borderPanYVal = $('#borderPanYVal');
  const panelPortrait = $('#panelPortrait');
  const filmLooksEl = $('#filmLooks');
  const cameraLooksEl = $('#cameraLooks');
  const lensLooksEl = $('#lensLooks');
  const presetLooksEl = $('#presetLooks');
  const presetsPane = $('#presetsPane');
  const presetCatsEl = $('#presetCats');
  const presetHint = $('#presetHint');
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
    let title = 'Processing…';
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
    busyJobs.set(id, { title: title || 'Processing…', sub: sub || '' });
    refreshBusyUI();
  }
  function busyUpdate(id, title, sub) {
    if (!busyJobs.has(id)) return;
    busyJobs.set(id, { title: title || 'Processing…', sub: sub || '' });
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

  /** Slightly stronger tick for tool / mode changes */
  function hapticSelect() {
    try {
      if (navigator.vibrate) navigator.vibrate(12);
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
    if (adj.store === 'imperf') {
      if (!state.look.imperf) state.look.imperf = emptyImperf();
      return state.look.imperf[adj.id] != null ? state.look.imperf[adj.id] : 0;
    }
    if (adj.store === 'optics') {
      if (adj.id === 'aperture') return state.optics.apertureSlider != null ? state.optics.apertureSlider : 55;
      if (adj.id === 'dofStrength') return Math.round(state.optics.strength * 100);
      if (adj.id === 'focusDepth') return Math.round(state.optics.focusDepth * 100);
      if (adj.id === 'bokehAmount') return Math.round(state.optics.bokehAmount * 100);
      if (adj.id === 'skinSoft') return Math.round((state.optics.skinSoft || 0) * 100);
      if (adj.id === 'subjectPunch')
        return Math.round((state.optics.subjectPunch || 0) * 100);
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
      // Manual tweak clears wand selection (like iOS Photos)
      const Auto = window.HermioneAuto;
      if (
        state.enhanceMode &&
        Auto &&
        Auto.PARAM_KEYS &&
        Auto.PARAM_KEYS.indexOf(adj.id) !== -1
      ) {
        clearEnhanceModeFlag();
      }
    } else if (adj.store === 'look') {
      state.look[adj.id] = val;
      state.lookQuality = 'preview';
    } else if (adj.store === 'imperf') {
      if (!state.look.imperf) state.look.imperf = emptyImperf();
      // First manual tweak: bake current camera defaults into user values
      if (!state.look.imperfManual) {
        seedImperfFromCamera(true);
        state.look.imperfManual = true;
      }
      state.look.imperf[adj.id] = val;
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
      } else if (adj.id === 'skinSoft') {
        state.optics.skinSoft = val / 100;
        if (val > 0 && !state.scene && typeof scheduleSceneAnalysis === 'function') {
          scheduleSceneAnalysis(400, { force: true });
        }
      } else if (adj.id === 'subjectPunch') {
        state.optics.subjectPunch = val / 100;
        if (val > 0 && !state.scene && typeof scheduleSceneAnalysis === 'function') {
          scheduleSceneAnalysis(400, { force: true });
        }
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

  /**
   * Copy camera.imperf (0..1) → state.look.imperf (0..100).
   * @param {boolean} [force] also when already manual (for bake-on-first-edit)
   */
  function seedImperfFromCamera(force) {
    if (!Looks) return;
    if (state.look.imperfManual && !force) return;
    const cam = Looks.cameraById(state.look.camera || 'none');
    const base = (cam && cam.imperf) || {};
    const next = emptyImperf();
    IMPERF_KEYS.forEach((k) => {
      next[k] = Math.round(clamp((base[k] || 0) * 100, 0, 100));
    });
    state.look.imperf = next;
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
      if (adj.id === 'skinSoft') return (state.optics.skinSoft || 0) > 0.01;
      if (adj.id === 'subjectPunch') return (state.optics.subjectPunch || 0) > 0.01;
      return false;
    }
    if (adj.store === 'imperf' || adj.id === 'imperfIntensity') {
      if (adj.id === 'imperfIntensity') {
        return Math.abs((state.look.imperfIntensity != null ? state.look.imperfIntensity : 100) - 100) > 0.5;
      }
      // show modified when camera has defaults OR user set values
      const cur = getAdjValue(adj);
      if (state.look.imperfManual) return cur > 0.5;
      if (!Looks) return cur > 0.5;
      const cam = Looks.cameraById(state.look.camera || 'none');
      const base = cam && cam.imperf ? cam.imperf[adj.id] || 0 : 0;
      return base > 0.02 || cur > 0.5;
    }
    const cur = getAdjValue(adj);
    return Math.abs(cur - adj.def) > (adj.step < 1 ? 0.001 : 0.5);
  }

  function getImperfDisplayValue(adj) {
    if (!adj || adj.store !== 'imperf') return getAdjValue(adj);
    if (state.look.imperfManual) return getAdjValue(adj);
    // show camera default while not manual
    if (!Looks) return 0;
    const cam = Looks.cameraById(state.look.camera || 'none');
    const base = cam && cam.imperf ? cam.imperf[adj.id] || 0 : 0;
    return Math.round(base * 100);
  }

  // ========== HISTORY ==========
  function snapshotEditState() {
    return {
      params: { ...state.params },
      look: { ...state.look },
      enhanceMode: state.enhanceMode,
      optics: {
        enabled: state.optics.enabled,
        strength: state.optics.strength,
        apertureStrength: state.optics.apertureStrength,
        apertureSlider: state.optics.apertureSlider,
        focusDepth: state.optics.focusDepth,
        focusManual: state.optics.focusManual,
        focalRecipe: state.optics.focalRecipe,
        bokehShape: state.optics.bokehShape,
        bokehAmount: state.optics.bokehAmount,
        skinSoft: state.optics.skinSoft || 0,
        subjectPunch: state.optics.subjectPunch || 0
      },
      crop: {
        x: state.crop.x,
        y: state.crop.y,
        w: state.crop.w,
        h: state.crop.h,
        aspect: state.crop.aspect
      },
      border: {
        id: state.border.id,
        zoom: state.border.zoom,
        panX: state.border.panX,
        panY: state.border.panY
      },
      uiPresetCategory: state.ui.presetCategory
    };
  }

  function applySnapshot(snap) {
    if (!snap) return;
    history.lock = true;
    Object.assign(state.params, snap.params);
    Object.assign(state.look, snap.look);
    Object.assign(state.optics, snap.optics);
    state.enhanceMode =
      snap.enhanceMode !== undefined ? snap.enhanceMode : null;
    if (snap.border) {
      state.border.id = snap.border.id || 'none';
      state.border.zoom = snap.border.zoom != null ? snap.border.zoom : 1;
      state.border.panX = snap.border.panX || 0;
      state.border.panY = snap.border.panY || 0;
    }
    if (snap.crop) {
      state.crop.x = snap.crop.x;
      state.crop.y = snap.crop.y;
      state.crop.w = snap.crop.w;
      state.crop.h = snap.crop.h;
      state.crop.aspect = snap.crop.aspect;
    }
    if (snap.uiPresetCategory) state.ui.presetCategory = snap.uiPresetCategory;
    if (opticsEnabledEl) opticsEnabledEl.checked = state.optics.enabled;
    if (typeof buildPresetCards === 'function') buildPresetCards();
    syncLookUI();
    syncRatioChips();
    syncFocalBokeh();
    updateDialUI();
    markChipModified();
    updateToolDots();
    updateEnhanceBarUI();
    if (typeof syncBorderUI === 'function') syncBorderUI();
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
    scheduleDraftSave();
  }

  function undo() {
    if (history.index <= 0) return;
    history.index -= 1;
    applySnapshot(history.stack[history.index]);
    updateHistoryButtons();
    hapticLight();
    showToast('Undone', 900);
  }

  function redo() {
    if (history.index >= history.stack.length - 1) return;
    history.index += 1;
    applySnapshot(history.stack[history.index]);
    updateHistoryButtons();
    hapticLight();
    showToast('Redone', 900);
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

  // ========== SESSION DRAFT ==========
  let draftSaveTimer = null;
  let draftPending = false;

  function hideDraftResume() {
    if (draftResume) draftResume.hidden = true;
  }

  function scheduleDraftSave() {
    if (!state.hasImage || !Draft) return;
    draftPending = true;
    clearTimeout(draftSaveTimer);
    draftSaveTimer = setTimeout(() => {
      draftPending = false;
      saveDraftNow().catch(() => {});
    }, 1800);
  }

  function saveDraftNow() {
    if (!Draft || !state.hasImage) return Promise.resolve(false);
    const src = state.originalImage || state.workingCanvas;
    if (!src) return Promise.resolve(false);

    return Draft.blobFromImage(src, 2400, 0.9)
      .then((blob) =>
        Draft.save({
          blob: blob,
          fileName: state.sourceFileName || 'photo.jpg',
          params: { ...state.params },
          look: JSON.parse(JSON.stringify(state.look)),
          ops: (state.ops || []).slice(),
          enhanceMode: state.enhanceMode,
          optics: {
            enabled: state.optics.enabled,
            strength: state.optics.strength,
            apertureStrength: state.optics.apertureStrength,
            apertureSlider: state.optics.apertureSlider,
            focusDepth: state.optics.focusDepth,
            focusManual: state.optics.focusManual,
            focalRecipe: state.optics.focalRecipe,
            bokehShape: state.optics.bokehShape,
            bokehAmount: state.optics.bokehAmount,
            skinSoft: state.optics.skinSoft || 0,
            subjectPunch: state.optics.subjectPunch || 0
          },
          userLookId: state.userLookId
        })
      )
      .then(() => true)
      .catch((err) => {
        console.warn('Draft save failed', err);
        return false;
      });
  }

  function clearDraft() {
    clearTimeout(draftSaveTimer);
    if (!Draft) return Promise.resolve();
    return Draft.clear().catch(() => {});
  }

  function openImageFromBlob(blob, fileName, restore) {
    busyStart('load', restore ? 'Restoring edit…' : 'Loading photo…', fileName || '');
    dropOverlay.classList.add('hidden');
    hideDraftResume();

    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      state.originalImage = img;
      state.sourceFileName = fileName || 'photo.jpg';
      state.ops = restore && restore.ops ? restore.ops.slice() : [];
      prepareWorkingImage(img);

      if (restore) {
        Object.assign(state.params, restore.params || {});
        if (restore.look) {
          Object.assign(state.look, restore.look);
          if (!state.look.imperf) state.look.imperf = emptyImperf();
        }
        if (restore.optics) Object.assign(state.optics, restore.optics);
        state.enhanceMode = restore.enhanceMode || null;
        state.userLookId = restore.userLookId || null;
      } else {
        resetParams(true);
        resetLooks(true);
        state.enhanceMode = null;
        state.userLookId = null;
        state.optics.focusManual = false;
      }

      resetCropRect();
      state.scene = null;
      state.hasImage = true;
      enableControls(true);
      updateEnhanceBarUI();
      if (btnSceneAnalyze) btnSceneAnalyze.disabled = false;
      if (typeof setChromeHidden === 'function') setChromeHidden(false);
      if (opticsEnabledEl) opticsEnabledEl.checked = !!state.optics.enabled;
      if (compareHint && !restore) {
        compareHint.hidden = false;
        compareHint.classList.add('show');
        setTimeout(() => compareHint.classList.remove('show'), 2800);
      }
      busyEnd('load');
      resetHistory();
      if (typeof updateLayoutMode === 'function') updateLayoutMode();
      render(false);
      playEditorEnter();
      setTool(state.ui.tool || 'adjust');
      syncLookUI();
      updateDialUI();
      markChipModified();
      updateToolDots();
      if (state.crop.active) updateCropOverlay();
      if (restore) showToast('Restored · ' + (Draft.formatAge(restore.savedAt) || 'draft'), 1400);
      scheduleDraftSave();
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      busyEnd('load');
      dropOverlay.classList.remove('hidden');
      playHeroEnter();
      showToast('Could not restore photo');
    };
    img.src = url;
  }

  function checkDraftOnBoot() {
    if (!Draft || !draftResume) return;
    Draft.peek().then((rec) => {
      if (!rec || !rec.blob || state.hasImage) return;
      // Stale after 14 days
      if (rec.savedAt && Date.now() - rec.savedAt > 14 * 24 * 60 * 60 * 1000) {
        Draft.clear();
        return;
      }
      draftResume.hidden = false;
      if (draftResumeSub) {
        const age = Draft.formatAge(rec.savedAt);
        draftResumeSub.textContent =
          (rec.fileName || 'Photo') + (age ? ' · ' + age : '') + ' · this device';
      }
      draftResume._record = rec;
    });
  }

  function continueDraft() {
    const rec = draftResume && draftResume._record;
    if (!rec || !rec.blob) {
      hideDraftResume();
      return;
    }
    openImageFromBlob(rec.blob, rec.fileName, {
      params: rec.params,
      look: rec.look,
      ops: rec.ops,
      enhanceMode: rec.enhanceMode,
      optics: rec.optics,
      userLookId: rec.userLookId,
      savedAt: rec.savedAt
    });
  }

  function dismissDraft() {
    hideDraftResume();
    clearDraft();
    showToast('Draft dismissed', 900);
  }

  // ========== IMAGE LOADING ==========
  function loadImage(file) {
    if (!file || !file.type.startsWith('image/')) return;

    // New photo replaces draft later on save; clear old resume UI
    hideDraftResume();

    busyStart('load', 'Loading photo…', file.name || '');
    dropOverlay.classList.add('hidden');

    const reader = new FileReader();
    reader.onload = (e) => {
      // Prefer blob path for draft fidelity
      fetch(e.target.result)
        .then((r) => r.blob())
        .then((blob) => {
          openImageFromBlob(blob, file.name || 'photo.jpg', null);
        })
        .catch(() => {
          // Fallback classic path
          const img = new Image();
          img.onload = () => {
            state.originalImage = img;
            state.sourceFileName = file.name || 'photo.jpg';
            state.ops = [];
            prepareWorkingImage(img);
            resetParams(true);
            resetLooks(true);
            resetCropRect();
            state.scene = null;
            state.optics.focusManual = false;
            state.enhanceMode = null;
            state.userLookId = null;
            state.hasImage = true;
            enableControls(true);
            updateEnhanceBarUI();
            if (btnSceneAnalyze) btnSceneAnalyze.disabled = false;
            if (typeof setChromeHidden === 'function') setChromeHidden(false);
            busyEnd('load');
            resetHistory();
            if (typeof updateLayoutMode === 'function') updateLayoutMode();
            render(false);
            playEditorEnter();
            setTool(state.ui.tool || 'adjust');
            scheduleDraftSave();
          };
          img.onerror = () => {
            busyEnd('load');
            dropOverlay.classList.remove('hidden');
            playHeroEnter();
            showToast('Could not load the image.');
          };
          img.src = e.target.result;
        });
    };
    reader.onerror = () => {
      busyEnd('load');
      dropOverlay.classList.remove('hidden');
      playHeroEnter();
      showToast('Could not read the file.');
    };
    reader.readAsDataURL(file);
  }

  function prepareWorkingImage(img) {
    invalidatePipeCache();
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
    resetView(true);
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
    resetView(true);
  }

  // ========== VIEWPORT: fit + performant zoom/pan (CSS transform) ==========
  function resetView(layout) {
    state.view.zoom = 1;
    state.view.panX = 0;
    state.view.panY = 0;
    state.view.detailActive = false;
    state.view.detailLong = 0;
    state.view.detailRoi = null;
    if (layout !== false) layoutViewport();
    else applyViewTransform();
    updateZoomHud();
  }

  /**
   * Size canvas CSS to fully fit stage (fixes portrait overflow on web).
   * Zoom multiplies via GPU transform — no pixel reprocess.
   */
  function layoutViewport() {
    if (!state.hasImage || !state.workingCanvas || !canvasArea) return;
    const area = canvasArea.getBoundingClientRect();
    // Mobile overlay: edge-to-edge photo (chrome floats over it). Crop keeps a little pad for handles.
    const overlay =
      typeof isOverlayChrome === 'function'
        ? isOverlayChrome()
        : !document.body.classList.contains('layout-side');
    const immersive = document.body.classList.contains('ui-immersive');
    let pad = 8;
    if (state.crop.active) pad = 14;
    else if (overlay) pad = immersive ? 0 : 0; // full-bleed under glass chrome
    const availW = Math.max(40, area.width - pad * 2);
    const availH = Math.max(40, area.height - pad * 2);
    const iw = state.workingCanvas.width;
    const ih = state.workingCanvas.height;
    if (iw < 1 || ih < 1) return;

    const fit = Math.min(availW / iw, availH / ih);
    const fitW = Math.max(1, Math.floor(iw * fit));
    const fitH = Math.max(1, Math.floor(ih * fit));
    state.view.fitW = fitW;
    state.view.fitH = fitH;

    canvas.style.width = fitW + 'px';
    canvas.style.height = fitH + 'px';

    // Clamp pan so image stays reachable
    clampPan();
    applyViewTransform();
    updateZoomHud();
    if (state.crop.active) updateCropOverlay();
  }

  function clampPan() {
    const z = state.view.zoom;
    const fw = state.view.fitW || 1;
    const fh = state.view.fitH || 1;
    const area = canvasArea ? canvasArea.getBoundingClientRect() : { width: fw, height: fh };
    const visW = fw * z;
    const visH = fh * z;
    // Allow panning so edges can reach center when zoomed
    const maxX = Math.max(0, (visW - area.width) / 2 + 40);
    const maxY = Math.max(0, (visH - area.height) / 2 + 40);
    state.view.panX = clamp(state.view.panX, -maxX, maxX);
    state.view.panY = clamp(state.view.panY, -maxY, maxY);
    if (z <= 1.001) {
      state.view.panX = 0;
      state.view.panY = 0;
    }
  }

  function applyViewTransform() {
    if (!canvasWrap) return;
    const z = state.view.zoom;
    const x = state.view.panX;
    const y = state.view.panY;
    canvasWrap.style.transform =
      'translate3d(' + x + 'px,' + y + 'px,0) scale(' + z + ')';
  }

  function updateZoomHud() {
    // Zoom / histogram toolbar removed from UI (pinch + double-tap still work)
    if (zoomHud) zoomHud.hidden = true;
  }

  function setZoom(next, anchorClientX, anchorClientY, animate) {
    if (!state.hasImage) return;
    const prev = state.view.zoom;
    const z = clamp(next, state.view.minZoom, state.view.maxZoom);
    if (Math.abs(z - prev) < 0.001) return;

    // Zoom toward anchor point in canvas-area
    if (
      anchorClientX != null &&
      anchorClientY != null &&
      canvasArea &&
      state.view.fitW
    ) {
      const area = canvasArea.getBoundingClientRect();
      const cx = area.left + area.width / 2;
      const cy = area.top + area.height / 2;
      // Point relative to center before zoom
      const ax = anchorClientX - cx - state.view.panX;
      const ay = anchorClientY - cy - state.view.panY;
      const r = z / prev;
      state.view.panX += ax - ax * r;
      state.view.panY += ay - ay * r;
    }

    state.view.zoom = z;
    clampPan();
    if (animate && canvasWrap) {
      canvasWrap.classList.add('zoom-animate');
      applyViewTransform();
      clearTimeout(setZoom._t);
      setZoom._t = setTimeout(() => {
        if (canvasWrap) canvasWrap.classList.remove('zoom-animate');
      }, 200);
    } else {
      if (canvasWrap) canvasWrap.classList.remove('zoom-animate');
      applyViewTransform();
    }
    updateZoomHud();
    if (state.crop.active) updateCropOverlay();
    // After zoom settles, re-process filters at higher pixel density
    scheduleDetailRender(320);
  }

  function zoomBy(factor, clientX, clientY) {
    setZoom(state.view.zoom * factor, clientX, clientY, false);
  }

  function fitView() {
    cancelDetailRender();
    state.view.detailActive = false;
    state.view.detailLong = 0;
    state.view.detailRoi = null;
    resetView(true);
    scheduleRender(false);
  }

  // Wheel zoom (trackpad + mouse)
  if (canvasArea) {
    canvasArea.addEventListener(
      'wheel',
      (e) => {
        if (!state.hasImage) return;
        // Don't steal wheel from dock panels
        if (e.target.closest('.dock, .sheet, .panel')) return;
        e.preventDefault();
        const delta = e.deltaY;
        // Smooth multiplicative zoom
        const factor = Math.exp(-delta * 0.0018);
        zoomBy(factor, e.clientX, e.clientY);
      },
      { passive: false }
    );
  }

  // Pinch zoom + two-finger pan (incremental, anchored at midpoint, rubber-band)
  const pinch = {
    active: false,
    lastDist: 0,
    lastMidX: 0,
    lastMidY: 0,
    virtualZoom: 1,
    endedAt: 0
  };
  // Single/double tap tracking — shared between pinch and tap handlers
  const tapState = { lastAt: 0, lastX: 0, lastY: 0, timer: null };
  function touchDist(t0, t1) {
    const dx = t0.clientX - t1.clientX;
    const dy = t0.clientY - t1.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }
  function pinchSoftClamp(z) {
    const min = state.view.minZoom;
    const max = state.view.maxZoom;
    if (z < min) return min * Math.pow(z / min, 0.55);
    if (z > max) return max * Math.pow(z / max, 0.4);
    return z;
  }
  function applyPinchStep(dist, midX, midY) {
    const prev = state.view.zoom;
    pinch.virtualZoom *= dist / (pinch.lastDist || dist || 1);
    const z = pinchSoftClamp(pinch.virtualZoom);
    if (canvasArea && state.view.fitW) {
      const area = canvasArea.getBoundingClientRect();
      const cx = area.left + area.width / 2;
      const cy = area.top + area.height / 2;
      const ax = midX - cx - state.view.panX;
      const ay = midY - cy - state.view.panY;
      const r = z / (prev || 1);
      // Zoom around the midpoint, then follow midpoint travel (two-finger pan)
      state.view.panX += ax - ax * r + (midX - pinch.lastMidX);
      state.view.panY += ay - ay * r + (midY - pinch.lastMidY);
    }
    state.view.zoom = z;
    clampPan();
    if (canvasWrap) canvasWrap.classList.remove('zoom-animate');
    applyViewTransform();
    updateZoomHud();
    if (state.crop.active) updateCropOverlay();
  }
  function settlePinch() {
    pinch.endedAt = Date.now();
    const z = state.view.zoom;
    if (z < state.view.minZoom - 0.001) {
      setZoom(state.view.minZoom, null, null, true);
    } else if (z > state.view.maxZoom + 0.001) {
      setZoom(state.view.maxZoom, null, null, true);
    } else {
      scheduleDetailRender(260);
    }
  }
  if (canvasArea) {
    canvasArea.addEventListener(
      'touchstart',
      (e) => {
        if (!state.hasImage || e.touches.length !== 2) return;
        pinch.active = true;
        pinch.lastDist = touchDist(e.touches[0], e.touches[1]);
        pinch.lastMidX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
        pinch.lastMidY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
        pinch.virtualZoom = state.view.zoom;
        // A second finger cancels every one-finger gesture — otherwise the
        // pan handler and hold-compare fight the pinch and the photo jumps.
        panDrag.active = false;
        clearTimeout(compareTimer);
        compareTimer = null;
        comparePointerId = null;
        endCompare();
        clearTimeout(tapState.timer);
        tapState.timer = null;
        tapState.lastAt = 0;
      },
      { passive: true }
    );
    canvasArea.addEventListener(
      'touchmove',
      (e) => {
        if (!pinch.active || e.touches.length !== 2) return;
        e.preventDefault();
        const d = touchDist(e.touches[0], e.touches[1]);
        const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
        const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
        applyPinchStep(d, midX, midY);
        pinch.lastDist = d;
        pinch.lastMidX = midX;
        pinch.lastMidY = midY;
      },
      { passive: false }
    );
    const onPinchEnd = (e) => {
      if (!pinch.active) return;
      if (e.touches && e.touches.length >= 2) return;
      pinch.active = false;
      settlePinch();
      // Hand the remaining finger to one-finger pan without a position jump
      if (
        e.touches &&
        e.touches.length === 1 &&
        state.view.zoom > 1.02 &&
        !state.crop.active
      ) {
        const t = e.touches[0];
        panDrag.active = true;
        panDrag.x = t.clientX;
        panDrag.y = t.clientY;
        panDrag.panX = state.view.panX;
        panDrag.panY = state.view.panY;
      }
    };
    canvasArea.addEventListener('touchend', onPinchEnd);
    canvasArea.addEventListener('touchcancel', onPinchEnd);
  }

  // Alt / middle-mouse / touch pan when zoomed (Space remains compare)
  const panDrag = { active: false, x: 0, y: 0, panX: 0, panY: 0 };

  if (canvasArea) {
    canvasArea.addEventListener('pointerdown', (e) => {
      if (!state.hasImage || pinch.active) return;
      if (e.target.closest('.crop-rect, .crop-handle, .zoom-hud, button, .drop-overlay')) return;
      if (state.view.zoom <= 1.02) return;
      const wantPan =
        e.button === 1 ||
        e.altKey ||
        (e.pointerType === 'touch' && !state.crop.active);
      if (!wantPan) return;
      if (e.button === 1) e.preventDefault();
      panDrag.active = true;
      panDrag.x = e.clientX;
      panDrag.y = e.clientY;
      panDrag.panX = state.view.panX;
      panDrag.panY = state.view.panY;
      try {
        canvasArea.setPointerCapture(e.pointerId);
      } catch (_) { /* ignore */ }
    });
    canvasArea.addEventListener('pointermove', (e) => {
      if (!panDrag.active || pinch.active) return;
      state.view.panX = panDrag.panX + (e.clientX - panDrag.x);
      state.view.panY = panDrag.panY + (e.clientY - panDrag.y);
      clampPan();
      applyViewTransform();
      if (state.crop.active) updateCropOverlay();
    });
    const endPan = () => {
      if (!panDrag.active) return;
      panDrag.active = false;
      // Pan may have left the HQ tile — re-render ROI if zoomed
      if (state.view.zoom > DETAIL_ZOOM_MIN) {
        scheduleDetailRender(280);
      }
    };
    canvasArea.addEventListener('pointerup', endPan);
    canvasArea.addEventListener('pointercancel', endPan);
  }

  if (btnZoomIn) {
    btnZoomIn.addEventListener('click', () => {
      const area = canvasArea.getBoundingClientRect();
      setZoom(state.view.zoom * 1.25, area.left + area.width / 2, area.top + area.height / 2, true);
    });
  }
  if (btnZoomOut) {
    btnZoomOut.addEventListener('click', () => {
      const area = canvasArea.getBoundingClientRect();
      setZoom(state.view.zoom / 1.25, area.left + area.width / 2, area.top + area.height / 2, true);
    });
  }
  if (btnZoomFit) btnZoomFit.addEventListener('click', () => fitView());
  if (btnHistoToggle) {
    btnHistoToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleHistogram();
    });
  }

  // ========== PIPE CACHE (G1 dirty flags) ==========
  // Snapshot after grade+looks so optics/selective-only changes skip re-looks.
  const pipeCache = {
    gradeKey: '',
    w: 0,
    h: 0,
    afterLooks: null // ImageData
  };

  function buildGradeKey(srcData, params, look, quality, fast) {
    // Identity of everything before selective/DoF/vignette/grain
    const p = params || {};
    const L = look || {};
    return [
      srcData && srcData.width,
      srcData && srcData.height,
      fast ? 1 : 0,
      quality || 'preview',
      p.exposure,
      p.contrast,
      p.highlights,
      p.shadows,
      p.whites,
      p.blacks,
      p.temperature,
      p.tint,
      p.saturation,
      p.vibrance,
      p.clarity,
      p.sharpen,
      L.film,
      L.filmIntensity,
      L.camera,
      L.cameraIntensity,
      L.lens,
      L.lensIntensity,
      L.bloom,
      L.ca,
      L.preset,
      L.presetIntensity,
      L.imperfIntensity,
      L.imperfManual ? 1 : 0,
      L.imperf ? JSON.stringify(L.imperf) : ''
    ].join('|');
  }

  function captureAfterLooks(data, w, h) {
    try {
      const copy = new Uint8ClampedArray(data);
      pipeCache.afterLooks = new ImageData(copy, w, h);
      pipeCache.w = w;
      pipeCache.h = h;
    } catch (e) {
      pipeCache.afterLooks = null;
    }
  }

  function invalidatePipeCache() {
    pipeCache.gradeKey = '';
    pipeCache.afterLooks = null;
  }

  function currentBorderOpts() {
    if (!state.border || !state.border.id || state.border.id === 'none') {
      return null;
    }
    return {
      id: state.border.id,
      zoom: state.border.zoom != null ? state.border.zoom : 1,
      panX: state.border.panX || 0,
      panY: state.border.panY || 0
    };
  }

  // ========== BORDERS (Crop) ==========
  function buildBorderFormats() {
    if (!borderFormatScroll || !Borders || !Borders.FORMATS) return;
    borderFormatScroll.innerHTML = '';
    Borders.FORMATS.forEach((fmt) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className =
        'ratio-chip border-chip' +
        (fmt.id === (state.border && state.border.id) ? ' active' : '');
      btn.dataset.border = fmt.id;
      btn.title = fmt.desc || fmt.name;
      btn.textContent = fmt.name;
      btn.addEventListener('click', () => setBorderFormat(fmt.id));
      borderFormatScroll.appendChild(btn);
    });
  }

  function syncBorderUI() {
    if (!state.border) state.border = { id: 'none', zoom: 1, panX: 0, panY: 0 };
    const id = state.border.id || 'none';
    if (borderFormatScroll) {
      borderFormatScroll.querySelectorAll('.border-chip').forEach((b) => {
        b.classList.toggle('active', b.dataset.border === id);
      });
    }
    const on = id !== 'none';
    // Framing controls only when a format is active (and never with crop UI)
    if (borderFramingGroup) borderFramingGroup.hidden = !on;
    if (borderFraming) borderFraming.hidden = !on;
    if (borderZoom) {
      borderZoom.value = String(Math.round((state.border.zoom || 1) * 100));
    }
    if (borderPanX) {
      borderPanX.value = String(Math.round((state.border.panX || 0) * 100));
    }
    if (borderPanY) {
      borderPanY.value = String(Math.round((state.border.panY || 0) * 100));
    }
    if (borderZoomVal) {
      borderZoomVal.textContent = (state.border.zoom || 1).toFixed(2) + '×';
    }
    if (borderPanXVal) {
      borderPanXVal.textContent = String(Math.round((state.border.panX || 0) * 100));
    }
    if (borderPanYVal) {
      borderPanYVal.textContent = String(Math.round((state.border.panY || 0) * 100));
    }
  }

  function setBorderFormat(id) {
    if (!state.border) state.border = { id: 'none', zoom: 1, panX: 0, panY: 0 };
    // Never couple to crop overlay / aspect
    if (state.crop && state.crop.active) setCropMode(false);

    const prev = state.border.id;
    state.border.id = id || 'none';
    if (state.border.id === 'none') {
      state.border.zoom = 1;
      state.border.panX = 0;
      state.border.panY = 0;
    } else if (prev === 'none') {
      state.border.zoom = 1.08;
      state.border.panX = 0;
      state.border.panY = 0;
    }
    // Legacy Age polaroid border filter stays off
    if (state.look && state.look.imperf) state.look.imperf.border = 0;
    syncBorderUI();
    scheduleHistoryPush();
    scheduleRender(false);
    if (id && id !== 'none') {
      const fmt = Borders && Borders.byId ? Borders.byId(id) : null;
      showToast((fmt && fmt.name) || 'Border', 900);
    } else {
      showToast('No border', 800);
    }
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

  let settleToken = 0;

  function scheduleFullSettle() {
    clearTimeout(settleTimer);
    settleTimer = setTimeout(() => {
      state.ui.scrubbing = false;
      if (canvasArea) canvasArea.classList.remove('scrubbing');
      // Prefer worker for full settle when available (keeps UI responsive)
      renderSettleAsync();
      scheduleLookHQ();
      // After filter settles, rebuild real detail at current zoom
      scheduleDetailRender(200);
    }, 140);
  }

  /**
   * Full-quality settle off the main thread when Export.processOnWorker is available.
   * Falls back to sync render(false) for small frames / no worker.
   */
  async function renderSettleAsync() {
    if (!state.hasImage || state.isComparing) {
      scheduleRender(false);
      return;
    }
    const Export = window.HermioneExport;
    const srcData = state.originalData;
    if (!srcData || !Export || typeof Export.processOnWorker !== 'function') {
      scheduleRender(false);
      return;
    }
    // Small frames stay sync — worker overhead not worth it
    if (srcData.width * srcData.height < 700 * 700) {
      scheduleRender(false);
      return;
    }

    const token = ++settleToken;
    const straighten = state.crop.active ? state.params.rotation : 0;
    const quality = state.lookQuality || 'preview';
    const gradeKey = buildGradeKey(
      srcData,
      state.params,
      state.look,
      quality,
      false
    );
    const needAfterLooks =
      state.optics.enabled ||
      (state.params.vignette || 0) > 0 ||
      (state.params.grain || 0) > 0 ||
      state.debugScene !== 'off';
    const canReuseLooks =
      pipeCache.afterLooks &&
      pipeCache.gradeKey === gradeKey &&
      pipeCache.w === srcData.width &&
      pipeCache.h === srcData.height;

    // Worker path does not ship fromAfterLooks — reuse path stays on main
    if (canReuseLooks) {
      scheduleRender(false);
      return;
    }

    const processOpts = {
      grain: state.params.grain > 0,
      grainMode: 'static',
      look: state.look,
      quality: quality,
      fast: false,
      scene: state.scene,
      border: currentBorderOpts(),
      optics: {
        enabled: state.optics.enabled && state.debugScene === 'off',
        strength: state.optics.strength,
        apertureStrength: state.optics.apertureStrength,
        focusDepth: state.optics.focusDepth,
        focalRecipe: state.optics.focalRecipe || '50',
        bokehShape: state.optics.bokehShape || 'auto',
        bokehAmount:
          state.optics.bokehAmount != null ? state.optics.bokehAmount : 0.55,
        skinSoft: state.optics.skinSoft || 0,
        subjectPunch: state.optics.subjectPunch || 0
      },
      debugScene: state.debugScene === 'off' ? null : state.debugScene,
      fromAfterLooks: null,
      // Snapshot only when something downstream can reuse it (B6)
      onAfterLooks: needAfterLooks
        ? function (data, w, h) {
            pipeCache.gradeKey = gradeKey;
            captureAfterLooks(data, w, h);
          }
        : null
    };

    try {
      const processed = await Export.processOnWorker(
        srcData,
        state.params,
        processOpts
      );
      if (token !== settleToken) return;
      if (state.ui.scrubbing || state.isComparing) return;
      if (processed) {
        drawToMain(processed, straighten);
        scheduleHistogram(processed);
      }
      layoutViewport();
      updateCropOverlay();
      updateLookChip();
      if (state.view.zoom > DETAIL_ZOOM_MIN) {
        scheduleDetailRender(200);
      }
    } catch (e) {
      console.warn('settle worker failed, main-thread fallback', e);
      if (token === settleToken) scheduleRender(false);
    }
  }

  function beginScrub() {
    state.ui.scrubbing = true;
    if (canvasArea) canvasArea.classList.add('scrubbing');
    // Drop HQ while scrubbing for snappy feedback
    cancelDetailRender();
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

  /**
   * @param {ImageData} imageData
   * @param {number} straightenDeg
   * @param {{native?:boolean}} [opts] native=true keeps ImageData pixel size (HQ zoom detail)
   */
  function drawToMain(imageData, straightenDeg, opts) {
    opts = opts || {};
    const w = imageData.width;
    const h = imageData.height;

    // HQ path: keep full pixel density on canvas; CSS fit size is separate
    if (opts.native) {
      if (!straightenDeg) {
        if (canvas.width !== w || canvas.height !== h) {
          canvas.width = w;
          canvas.height = h;
        }
        ctx.putImageData(imageData, 0, 0);
        return;
      }
      const bctx = ensureBlit(w, h);
      bctx.putImageData(imageData, 0, 0);
      const rotated = Engine.rotateCoverCanvas(blitCanvas, straightenDeg);
      if (canvas.width !== rotated.width || canvas.height !== rotated.height) {
        canvas.width = rotated.width;
        canvas.height = rotated.height;
      }
      ctx.drawImage(rotated, 0, 0);
      return;
    }

    // Working path: display buffer at working size
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

  // ——— High-res filter detail for zoom (ROI only: visible + 20% margin) ———
  let detailToken = 0;
  let detailTimer = null;
  const DETAIL_MAX_LONG = 4096;
  const DETAIL_MAX_LONG_TOUCH = 2560;
  const DETAIL_ZOOM_MIN = 1.08;
  /** Expand visible view by this fraction on each side before process */
  const DETAIL_ROI_MARGIN = 0.2;

  function detailMaxLong() {
    const touch =
      typeof navigator !== 'undefined' &&
      (navigator.maxTouchPoints > 0 ||
        /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent || ''));
    return touch ? DETAIL_MAX_LONG_TOUCH : DETAIL_MAX_LONG;
  }

  function cancelDetailRender() {
    clearTimeout(detailTimer);
    detailTimer = null;
    detailToken++;
    busyEnd('detail');
    if (canvasArea) canvasArea.classList.remove('detail-render');
  }

  function scheduleDetailRender(delay) {
    clearTimeout(detailTimer);
    // Invalidate any in-flight HQ job (new zoom / filter supersedes it)
    detailToken++;
    busyEnd('detail');
    if (canvasArea) canvasArea.classList.remove('detail-render');

    if (!state.hasImage) return;
    if (state.view.zoom <= DETAIL_ZOOM_MIN) {
      if (state.view.detailActive) {
        state.view.detailActive = false;
        state.view.detailLong = 0;
        state.view.detailRoi = null;
        // Drop back to working-res preview
        scheduleRender(false);
      }
      return;
    }
    // Skip re-render if current tile still covers the view (with margin slack)
    if (state.view.detailActive && detailRoiStillValid()) {
      return;
    }
    const myToken = detailToken;
    detailTimer = setTimeout(() => {
      if (myToken !== detailToken) return;
      runDetailRender();
    }, delay != null ? delay : 300);
  }

  /**
   * Visible stage rect → image pixel ROI in working-image space (iw×ih),
   * expanded by DETAIL_ROI_MARGIN on each side, clamped to bounds.
   * Returns { x, y, w, h, iw, ih } or null.
   */
  function getVisibleImageRoi(margin) {
    margin = margin != null ? margin : DETAIL_ROI_MARGIN;
    if (!state.workingCanvas || !canvasArea) return null;
    const iw = state.workingCanvas.width;
    const ih = state.workingCanvas.height;
    const fw = state.view.fitW || 1;
    const fh = state.view.fitH || 1;
    if (iw < 1 || ih < 1 || fw < 1 || fh < 1) return null;

    const area = canvasArea.getBoundingClientRect();
    const z = state.view.zoom || 1;
    const panX = state.view.panX || 0;
    const panY = state.view.panY || 0;
    const cx = area.left + area.width / 2;
    const cy = area.top + area.height / 2;

    // Screen → image (working) pixels. Transform is scale then translate about center.
    function screenToImage(sx, sy) {
      const dx = (sx - cx - panX) / z;
      const dy = (sy - cy - panY) / z;
      return {
        x: (dx / fw + 0.5) * iw,
        y: (dy / fh + 0.5) * ih
      };
    }

    const corners = [
      screenToImage(area.left, area.top),
      screenToImage(area.right, area.top),
      screenToImage(area.left, area.bottom),
      screenToImage(area.right, area.bottom)
    ];
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (let i = 0; i < 4; i++) {
      minX = Math.min(minX, corners[i].x);
      minY = Math.min(minY, corners[i].y);
      maxX = Math.max(maxX, corners[i].x);
      maxY = Math.max(maxY, corners[i].y);
    }

    const visW = Math.max(1, maxX - minX);
    const visH = Math.max(1, maxY - minY);
    const mx = visW * margin;
    const my = visH * margin;
    minX -= mx;
    minY -= my;
    maxX += mx;
    maxY += my;

    // Clamp to image
    minX = Math.max(0, minX);
    minY = Math.max(0, minY);
    maxX = Math.min(iw, maxX);
    maxY = Math.min(ih, maxY);

    const x = Math.floor(minX);
    const y = Math.floor(minY);
    const w = Math.max(1, Math.ceil(maxX) - x);
    const h = Math.max(1, Math.ceil(maxY) - y);
    return { x: x, y: y, w: Math.min(w, iw - x), h: Math.min(h, ih - y), iw: iw, ih: ih };
  }

  /** True if last detail tile still covers the current view + half-margin. */
  function detailRoiStillValid() {
    const prev = state.view.detailRoi;
    if (!prev || !prev.fullW) return false;
    const cur = getVisibleImageRoi(DETAIL_ROI_MARGIN * 0.5);
    if (!cur) return false;
    // Map current working-space ROI into previous full-frame space
    const sx = prev.fullW / cur.iw;
    const sy = prev.fullH / cur.ih;
    const cx0 = cur.x * sx;
    const cy0 = cur.y * sy;
    const cx1 = (cur.x + cur.w) * sx;
    const cy1 = (cur.y + cur.h) * sy;
    return (
      cx0 >= prev.x - 1 &&
      cy0 >= prev.y - 1 &&
      cx1 <= prev.x + prev.w + 1 &&
      cy1 <= prev.y + prev.h + 1 &&
      state.view.detailLong > 0
    );
  }

  function cropImageData(src, x, y, tw, th) {
    const sw = src.width;
    const sh = src.height;
    x = Math.max(0, Math.min(sw - 1, x | 0));
    y = Math.max(0, Math.min(sh - 1, y | 0));
    tw = Math.max(1, Math.min(tw | 0, sw - x));
    th = Math.max(1, Math.min(th | 0, sh - y));
    const c = document.createElement('canvas');
    c.width = sw;
    c.height = sh;
    const cctx = c.getContext('2d');
    cctx.putImageData(src, 0, 0);
    return cctx.getImageData(x, y, tw, th);
  }

  function buildDetailSource(targetLong) {
    // Prefer original + geometry so filters match export character
    if (state.originalImage && Engine.rebuildGeometry) {
      let rebuilt = Engine.rebuildGeometry(
        state.originalImage,
        state.ops || [],
        targetLong
      );
      if (!rebuilt) return null;
      const long = Math.max(rebuilt.width, rebuilt.height);
      if (long > targetLong) {
        rebuilt = Engine.scaleCanvasToLongEdge(rebuilt, targetLong);
      }
      const rctx = rebuilt.getContext('2d', { willReadFrequently: true });
      return rctx.getImageData(0, 0, rebuilt.width, rebuilt.height);
    }
    // Fallback: scale working canvas up (softer but still better than CSS-only)
    if (!state.workingCanvas) return null;
    const ww = state.workingCanvas.width;
    const wh = state.workingCanvas.height;
    const cur = Math.max(ww, wh);
    if (cur >= targetLong) {
      return state.originalData;
    }
    const s = targetLong / cur;
    const tw = Math.max(1, Math.round(ww * s));
    const th = Math.max(1, Math.round(wh * s));
    const c = document.createElement('canvas');
    c.width = tw;
    c.height = th;
    const cctx = c.getContext('2d');
    cctx.imageSmoothingEnabled = true;
    cctx.imageSmoothingQuality = 'high';
    cctx.drawImage(state.workingCanvas, 0, 0, tw, th);
    return cctx.getImageData(0, 0, tw, th);
  }

  /**
   * Composite HQ tile onto a full-frame canvas (working preview scaled up + tile).
   */
  function drawDetailTile(processed, roi, fullW, fullH) {
    if (!processed || !roi) return;
    if (canvas.width !== fullW || canvas.height !== fullH) {
      canvas.width = fullW;
      canvas.height = fullH;
    }
    // Base: scale current working canvas (last live preview) under the tile
    if (state.workingCanvas) {
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(state.workingCanvas, 0, 0, fullW, fullH);
    } else {
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, fullW, fullH);
    }
    const bctx = ensureBlit(processed.width, processed.height);
    bctx.putImageData(processed, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(blitCanvas, roi.x, roi.y);
  }

  async function runDetailRender() {
    if (!state.hasImage || state.ui.scrubbing || state.isComparing) return;
    if (state.exporting) return;

    const zoom = state.view.zoom;
    if (zoom <= DETAIL_ZOOM_MIN) {
      state.view.detailActive = false;
      state.view.detailLong = 0;
      state.view.detailRoi = null;
      return;
    }

    // Full-frame border / active crop: keep previous full-image detail path
    const borderOn =
      state.border && state.border.id && state.border.id !== 'none';
    const useRoi = !state.crop.active && !borderOn;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const workLong = state.workingCanvas
      ? Math.max(state.workingCanvas.width, state.workingCanvas.height)
      : state.maxWorkingSize;
    const origLong = state.originalImage
      ? Math.max(
          state.originalImage.naturalWidth || 0,
          state.originalImage.naturalHeight || 0
        )
      : workLong;

    const maxLong = detailMaxLong();
    // Density: make the visible+margin region ~screen long-edge * dpr,
    // then back-solve full-frame long edge (roi covers ~1/zoom of the frame).
    const area = canvasArea ? canvasArea.getBoundingClientRect() : null;
    const screenLong = area
      ? Math.max(area.width, area.height) * dpr
      : workLong;
    const roiFrac = Math.min(
      1,
      (1 / Math.max(zoom, 1.001)) * (1 + 2 * DETAIL_ROI_MARGIN)
    );
    let targetLong = Math.round(screenLong / Math.max(0.12, roiFrac));
    // Also allow classic workLong*zoom*dpr when that is larger (desktop)
    targetLong = Math.max(targetLong, Math.round(workLong * zoom * dpr * 0.85));
    targetLong = Math.min(targetLong, origLong || targetLong, maxLong);
    // Prefer at least working long edge; ROI still saves work via crop
    targetLong = Math.max(targetLong, Math.min(workLong, maxLong));

    // Already showing equal-or-better detail that still covers the view?
    if (
      state.view.detailActive &&
      state.view.detailLong >= targetLong * 0.92 &&
      detailRoiStillValid()
    ) {
      return;
    }

    const workRoi = useRoi ? getVisibleImageRoi(DETAIL_ROI_MARGIN) : null;

    // Full-frame path only: skip if no resolution gain. ROI path always worth it when
    // the tile is clearly smaller than the full frame (fewer pixels to process).
    if (!useRoi || !workRoi) {
      if (targetLong < workLong * 1.12) return;
    } else {
      const areaFrac =
        (workRoi.w * workRoi.h) / Math.max(1, workRoi.iw * workRoi.ih);
      if (areaFrac > 0.92 && targetLong < workLong * 1.12) return;
    }

    const token = detailToken;
    const pct = Math.round(zoom * 100);
    const roiLabel =
      workRoi && useRoi
        ? Math.round((workRoi.w * workRoi.h) / ((workRoi.iw * workRoi.ih) || 1) * 100) +
          '% frame'
        : 'full';
    busyStart(
      'detail',
      'Rendering filter detail…',
      pct + '% · ' + targetLong + 'px · ' + roiLabel
    );
    if (canvasArea) canvasArea.classList.add('detail-render');

    try {
      // Yield so busy UI paints
      await new Promise((r) => setTimeout(r, 24));
      if (token !== detailToken) return;

      const fullData = buildDetailSource(targetLong);
      if (!fullData || token !== detailToken) return;

      const fullW = fullData.width;
      const fullH = fullData.height;

      let srcData = fullData;
      let roiPx = null;
      if (useRoi && workRoi) {
        const sx = fullW / workRoi.iw;
        const sy = fullH / workRoi.ih;
        const rx = Math.floor(workRoi.x * sx);
        const ry = Math.floor(workRoi.y * sy);
        const rw = Math.max(1, Math.ceil(workRoi.w * sx));
        const rh = Math.max(1, Math.ceil(workRoi.h * sy));
        // If ROI is almost the whole frame, skip crop overhead
        if (rw * rh < fullW * fullH * 0.88) {
          srcData = cropImageData(fullData, rx, ry, rw, rh);
          roiPx = {
            x: Math.max(0, Math.min(fullW - 1, rx)),
            y: Math.max(0, Math.min(fullH - 1, ry)),
            w: srcData.width,
            h: srcData.height,
            fullW: fullW,
            fullH: fullH
          };
        }
      }

      if (!srcData || token !== detailToken) return;

      const straighten = state.crop.active ? state.params.rotation : 0;
      // Crop active + straighten: full frame (ROI off). Border off for tile path.
      const detailOpts = {
        grain: true,
        grainMode: 'static',
        look: state.look,
        quality: 'export',
        fast: false,
        scene: state.scene,
        border: roiPx ? null : currentBorderOpts(),
        roi: roiPx
          ? {
              x0: roiPx.x,
              y0: roiPx.y,
              fullW: fullW,
              fullH: fullH
            }
          : null,
        optics: {
          enabled: state.optics.enabled && state.debugScene === 'off',
          strength: state.optics.strength,
          apertureStrength: state.optics.apertureStrength,
          focusDepth: state.optics.focusDepth,
          focalRecipe: state.optics.focalRecipe || '50',
          bokehShape: state.optics.bokehShape || 'auto',
          bokehAmount:
            state.optics.bokehAmount != null ? state.optics.bokehAmount : 0.55,
          skinSoft: state.optics.skinSoft || 0,
          subjectPunch: state.optics.subjectPunch || 0
        },
        debugScene: state.debugScene === 'off' ? null : state.debugScene
      };

      let processed = null;
      const ExportApi = window.HermioneExport;
      if (
        ExportApi &&
        typeof ExportApi.processOnWorker === 'function' &&
        srcData.width * srcData.height >= 700 * 700
      ) {
        try {
          processed = await ExportApi.processOnWorker(
            srcData,
            state.params,
            detailOpts
          );
        } catch (e) {
          processed = Engine.process(srcData, state.params, detailOpts);
        }
      } else {
        processed = Engine.process(srcData, state.params, detailOpts);
      }

      if (!processed || token !== detailToken) return;

      // Another zoom/scrub may have started
      if (state.ui.scrubbing || state.view.zoom <= DETAIL_ZOOM_MIN) return;

      if (roiPx && !straighten) {
        drawDetailTile(processed, roiPx, fullW, fullH);
      } else {
        drawToMain(processed, straighten, { native: true });
      }
      state.view.detailActive = true;
      state.view.detailLong = targetLong;
      state.view.detailRoi = roiPx
        ? {
            x: roiPx.x,
            y: roiPx.y,
            w: roiPx.w,
            h: roiPx.h,
            fullW: fullW,
            fullH: fullH
          }
        : {
            x: 0,
            y: 0,
            w: fullW,
            h: fullH,
            fullW: fullW,
            fullH: fullH
          };
      layoutViewport();
      updateCropOverlay();
    } catch (err) {
      console.warn('Detail render failed', err);
    } finally {
      if (token === detailToken) {
        busyEnd('detail');
        if (canvasArea) canvasArea.classList.remove('detail-render');
      }
    }
  }

  // ========== ONE-TAP ENHANCE (wand) ==========
  function updateEnhanceBarUI() {
    if (!enhanceBar) return;
    // Auto / Soft / Vivid live only on Adjust (keeps other tools compact)
    const onAdjust = state.hasImage && state.ui.tool === 'adjust';
    enhanceBar.hidden = !onAdjust;
    enhanceBar.querySelectorAll('.enhance-btn').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.enhance === state.enhanceMode);
    });
  }

  function applyEnhanceMode(modeId) {
    const Auto = window.HermioneAuto;
    if (!Auto || !state.originalData) {
      if (window.HermioneErrors) {
        window.HermioneErrors.showBanner('Enhance unavailable', { tone: 'info' });
      }
      return;
    }

    // Tap active mode again → off (clear only enhance-owned params)
    if (state.enhanceMode === modeId) {
      const cleared = Auto.clearedParams();
      Object.keys(cleared).forEach((k) => {
        state.params[k] = cleared[k];
      });
      state.enhanceMode = null;
      updateEnhanceBarUI();
      updateDialUI();
      markChipModified();
      updateToolDots();
      scheduleHistoryPush();
      render(false);
      if (typeof showToast === 'function') showToast('Enhance off');
      return;
    }

    const result = Auto.enhance(state.originalData, modeId);
    Object.keys(result.params).forEach((k) => {
      state.params[k] = result.params[k];
    });
    state.enhanceMode = result.mode;
    updateEnhanceBarUI();
    updateDialUI();
    markChipModified();
    updateToolDots();
    scheduleHistoryPush();
    render(false);
    if (typeof showToast === 'function') {
      showToast(result.label + ' enhance');
    }
  }

  function clearEnhanceModeFlag() {
    if (state.enhanceMode == null) return;
    state.enhanceMode = null;
    updateEnhanceBarUI();
  }

  // ========== HISTOGRAM (optional tool — off by default) ==========
  let histoRaf = 0;
  let histoPending = null;

  function syncHistoToggleUI() {
    const on = !!state.ui.showHistogram;
    if (btnHistoToggle) {
      btnHistoToggle.classList.toggle('active', on);
      btnHistoToggle.setAttribute('aria-pressed', on ? 'true' : 'false');
    }
    if (!on && histoPanel) histoPanel.hidden = true;
  }

  function setHistoVisible(_on) {
    if (histoPanel) histoPanel.hidden = true;
  }

  function scheduleHistogram(imageData) {
    // Histogram UI removed — skip work
    if (histoPanel) histoPanel.hidden = true;
    return;
    // Skip work entirely when tool is off
    if (!state.ui.showHistogram) {
      if (histoPanel) histoPanel.hidden = true;
      return;
    }
    if (!imageData || !window.HermioneHistogram || !histoCanvas) return;
    histoPending = imageData;
    if (histoRaf) return;
    histoRaf = requestAnimationFrame(() => {
      histoRaf = 0;
      const src = histoPending;
      histoPending = null;
      if (!src || !state.hasImage || !state.ui.showHistogram) return;
      try {
        const H = window.HermioneHistogram;
        const hist = H.compute(src, src.width, src.height, {
          bins: 64,
          maxSide: 256
        });
        H.draw(histoCanvas, hist, { mode: 'rgb' });
        if (histoClipLow) {
          histoClipLow.textContent = '↓ ' + H.formatClip(hist.clipLow);
        }
        if (histoClipHigh) {
          histoClipHigh.textContent = '↑ ' + H.formatClip(hist.clipHigh);
        }
        setHistoVisible(true);
      } catch (e) {
        /* non-fatal */
      }
    });
  }

  function toggleHistogram() {
    // Histogram UI removed
    state.ui.showHistogram = false;
    setHistoVisible(false);
    syncHistoToggleUI();
  }

  function render(fast) {
    if (!state.hasImage) return;

    const straighten = state.crop.active ? state.params.rotation : 0;

    if (state.isComparing) {
      cancelDetailRender();
      const src = fast && state.scrubData ? state.scrubData : state.originalData;
      drawToMain(src, straighten);
      layoutViewport();
      updateCropOverlay();
      return;
    }

    const useFast = !!fast || state.ui.scrubbing;
    // While scrubbing or at fit zoom, always show working-res live preview
    if (useFast || state.view.zoom <= DETAIL_ZOOM_MIN) {
      state.view.detailActive = false;
      state.view.detailLong = 0;
      state.view.detailRoi = null;
    }

    const srcData =
      useFast && state.scrubData ? state.scrubData : state.originalData;

    const quality = useFast ? 'preview' : state.lookQuality || 'preview';
    const gradeKey = buildGradeKey(
      srcData,
      state.params,
      state.look,
      quality,
      useFast
    );
    // Reuse after-looks buffer when only optics / vignette / grain / debug changed
    const canReuseLooks =
      !useFast &&
      pipeCache.afterLooks &&
      pipeCache.gradeKey === gradeKey &&
      pipeCache.w === srcData.width &&
      pipeCache.h === srcData.height;

    const needAfterLooks =
      !useFast &&
      (state.optics.enabled ||
        (state.params.vignette || 0) > 0 ||
        (state.params.grain || 0) > 0 ||
        state.debugScene !== 'off');

    const processOpts = {
      grain: !useFast && state.params.grain > 0,
      grainMode: 'static',
      look: state.look,
      quality: quality,
      fast: useFast,
      scene: useFast ? null : state.scene,
      border: useFast ? null : currentBorderOpts(),
      optics: {
        enabled: !useFast && state.optics.enabled && state.debugScene === 'off',
        strength: state.optics.strength,
        apertureStrength: state.optics.apertureStrength,
        focusDepth: state.optics.focusDepth,
        focalRecipe: state.optics.focalRecipe || '50',
        bokehShape: state.optics.bokehShape || 'auto',
        bokehAmount:
          state.optics.bokehAmount != null ? state.optics.bokehAmount : 0.55,
        skinSoft: state.optics.skinSoft || 0,
        subjectPunch: state.optics.subjectPunch || 0
      },
      debugScene: useFast || state.debugScene === 'off' ? null : state.debugScene,
      fromAfterLooks: canReuseLooks ? pipeCache.afterLooks : null,
      // B6: only snapshot when optics/vignette/grain/debug can consume it
      onAfterLooks: needAfterLooks
        ? function (data, w, h) {
            pipeCache.gradeKey = gradeKey;
            captureAfterLooks(data, w, h);
          }
        : null
    };

    const processed = Engine.process(srcData, state.params, processOpts);
    if (processed) {
      drawToMain(processed, straighten);
      scheduleHistogram(processed);
    }
    layoutViewport();
    updateCropOverlay();
    updateLookChip();

    // After live preview paints, queue real high-res detail if zoomed
    if (!useFast && state.view.zoom > DETAIL_ZOOM_MIN) {
      scheduleDetailRender(280);
    }
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
      setSceneStatus('Scene outdated — analyze again', null);
    }
  }

  async function runSceneAnalysis(opts) {
    opts = opts || {};
    const quiet = !!opts.quiet;
    if (!state.hasImage || !state.workingCanvas || !Scene) return;
    const token = ++analyzeToken;
    state.sceneStatus = 'loading';
    setSceneStatus('Loading AI model…', 'busy');
    setButtonBusy(btnSceneAnalyze, true, '…', 'Analyze');
    // quiet = crop/subject framing — never steal the whole UI with busy overlay
    if (!quiet) {
      busyStart('scene', 'Loading AI model…', 'On-device · first run may take longer');
    }

    try {
      if (!quiet) busyUpdate('scene', 'Analyzing scene…', 'Segmentation · depth');
      state.sceneStatus = 'analyzing';
      setSceneStatus('Analyzing…', 'busy');
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
      const cov =
        analysis.personCoverage != null
          ? Math.round(analysis.personCoverage * 100)
          : conf;
      const partsNote = analysis.parts ? ' · parts' : '';
      const faceNote = analysis.face ? ' · face' : '';
      setSceneStatus(
        cov != null
          ? 'Ready · subject ' + cov + '%' + partsNote + faceNote
          : 'Ready' + partsNote + faceNote,
        'ready'
      );
      scheduleRender(false);
    } catch (err) {
      console.error(err);
      if (token !== analyzeToken) return;
      state.sceneStatus = 'error';
      setSceneStatus('Error: ' + (err.message || err), 'error');
    } finally {
      if (token === analyzeToken) {
        if (!quiet) busyEnd('scene');
        setButtonBusy(btnSceneAnalyze, false, '…', 'Analyze');
      }
    }
  }

  let sceneTimer = null;
  /**
   * @param {number} [delay]
   * @param {{force?:boolean}} [opts] force=true from explicit Analyze button
   */
  function scheduleSceneAnalysis(delay, opts) {
    opts = opts || {};
    clearTimeout(sceneTimer);
    sceneTimer = setTimeout(() => {
      if (!state.hasImage) return;
      // Skip auto profile/scene work unless DoF is on or user forced analysis
      if (!opts.force && !state.optics.enabled) return;
      runSceneAnalysis();
    }, delay || 200);
  }

  // ========== LOOK / PRESET UI ==========
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
        // Manual stack edit breaks curated preset link
        state.look.preset = 'none';
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

    buildPresetCategories();
    buildPresetCards();
    syncLookUI();
  }

  function buildPresetCategories() {
    if (!presetCatsEl || !Looks || !Looks.PRESET_CATEGORIES) return;
    presetCatsEl.innerHTML = '';
    const cats = [{ id: 'mine', name: 'Mine' }].concat(Looks.PRESET_CATEGORIES);
    cats.forEach((cat) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className =
        'preset-cat' + (cat.id === (state.ui.presetCategory || 'all') ? ' active' : '');
      btn.dataset.cat = cat.id;
      btn.textContent = cat.name;
      btn.addEventListener('click', () => {
        state.ui.presetCategory = cat.id;
        presetCatsEl.querySelectorAll('.preset-cat').forEach((b) => {
          b.classList.toggle('active', b.dataset.cat === cat.id);
        });
        buildPresetCards();
        if (presetHint) {
          presetHint.textContent =
            cat.id === 'mine'
              ? 'Your saved looks · this device only'
              : 'Ready looks · film + camera + lens';
        }
      });
      presetCatsEl.appendChild(btn);
    });
  }

  function applyUserLook(id) {
    if (!UserPresets) return;
    const item = UserPresets.get(id);
    if (!item) {
      showToast('Look not found');
      return;
    }
    pushHistory();
    // Full stack from snapshot
    PRESET_PARAM_KEYS.forEach((k) => {
      state.params[k] =
        item.params && item.params[k] != null ? item.params[k] : 0;
    });
    const L = item.look || {};
    state.look.film = L.film || 'none';
    state.look.filmIntensity = L.filmIntensity != null ? L.filmIntensity : 100;
    state.look.camera = L.camera || 'none';
    state.look.cameraIntensity =
      L.cameraIntensity != null ? L.cameraIntensity : 100;
    state.look.lens = L.lens || 'none';
    state.look.lensIntensity = L.lensIntensity != null ? L.lensIntensity : 100;
    state.look.bloom = L.bloom || 0;
    state.look.ca = L.ca || 0;
    state.look.imperf = Object.assign(emptyImperf(), L.imperf || {});
    state.look.imperfManual = !!L.imperfManual;
    state.look.imperfIntensity =
      L.imperfIntensity != null ? L.imperfIntensity : 100;
    state.look.preset = 'none';
    state.look.presetIntensity = 100;
    state.enhanceMode = item.enhanceMode || null;
    state.userLookId = item.id;
    syncLookUI();
    updateDialUI();
    markChipModified();
    updateToolDots();
    updateEnhanceBarUI();
    buildPresetCards();
    scheduleRender(false);
    pushHistory();
    hapticLight();
    showToast(item.name, 900);
  }

  function saveCurrentLook() {
    if (!UserPresets || !state.hasImage) return;
    const n = (UserPresets.list() || []).length + 1;
    const defaultName = 'My look ' + n;
    let name = defaultName;
    try {
      const typed = window.prompt('Name this look', defaultName);
      if (typed === null) return; // cancel
      name = typed.trim() || defaultName;
    } catch (_) {
      /* prompt blocked — use default */
    }
    const result = UserPresets.save(
      {
        params: state.params,
        look: state.look,
        enhanceMode: state.enhanceMode
      },
      name.slice(0, 40)
    );
    if (!result.ok) {
      showToast(result.error || 'Save failed', 2200);
      if (window.HermioneErrors) {
        window.HermioneErrors.showBanner(result.error || 'Save failed', {
          tone: 'error'
        });
      }
      return;
    }
    state.userLookId = result.item.id;
    state.ui.presetCategory = 'mine';
    buildPresetCategories();
    buildPresetCards();
    updateUserLooksHint();
    showToast('Saved · ' + result.item.name, 1200);
  }

  function deleteUserLook(id, e) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (!UserPresets) return;
    const item = UserPresets.get(id);
    if (!item) return;
    if (!window.confirm('Delete “' + item.name + '”?')) return;
    UserPresets.remove(id);
    if (state.userLookId === id) state.userLookId = null;
    buildPresetCards();
    updateUserLooksHint();
    showToast('Deleted');
  }

  function updateUserLooksHint() {
    if (!userLooksHint) return;
    if (!UserPresets) {
      userLooksHint.textContent = '';
      return;
    }
    const n = UserPresets.list().length;
    userLooksHint.textContent =
      n === 0 ? 'On this device only' : n + ' saved · this device';
  }

  function buildPresetCards() {
    if (!presetLooksEl || !Looks || !Looks.PRESETS) return;
    const cat = state.ui.presetCategory || 'all';
    presetLooksEl.innerHTML = '';

    // ——— Mine (user looks) ———
    if (cat === 'mine') {
      const mine = UserPresets ? UserPresets.list() : [];
      if (!mine.length) {
        const empty = document.createElement('p');
        empty.className = 'preset-hint';
        empty.style.padding = '12px 8px';
        empty.textContent = 'No saved looks yet · edit a photo, then Save look';
        presetLooksEl.appendChild(empty);
        return;
      }
      mine.forEach((item) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className =
          'preset-card user-look' +
          (item.id === state.userLookId ? ' active' : '');
        btn.dataset.id = item.id;
        btn.title = item.name;
        btn.innerHTML =
          '<span class="preset-swatch"></span>' +
          '<span class="preset-card-name"></span>' +
          '<span class="preset-card-recipe">Saved look</span>' +
          '<span class="preset-delete" data-del="' +
          item.id +
          '" title="Delete" aria-label="Delete">×</span>';
        btn.querySelector('.preset-card-name').textContent = item.name;
        btn.addEventListener('click', (ev) => {
          if (ev.target.closest('.preset-delete')) {
            deleteUserLook(item.id, ev);
            return;
          }
          applyUserLook(item.id);
        });
        presetLooksEl.appendChild(btn);
      });
      return;
    }

    // ——— Curated ———
    const list =
      Looks.presetsByCategory
        ? Looks.presetsByCategory(cat)
        : Looks.PRESETS.filter(
            (p) => cat === 'all' || p.category === cat || p.id === 'none'
          );

    list.forEach((p) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className =
        'preset-card' +
        (p.id === (state.look.preset || 'none') && !state.userLookId
          ? ' active'
          : '');
      btn.dataset.id = p.id;
      btn.title = (p.desc || p.name) + (p.recipe ? ' · ' + p.recipe : '');
      btn.innerHTML =
        '<span class="preset-swatch" style="background:' +
        (p.swatch || '#333') +
        '"></span>' +
        '<span class="preset-card-name">' +
        p.name +
        '</span>' +
        '<span class="preset-card-recipe">' +
        (p.recipe || p.desc || '') +
        '</span>';
      btn.addEventListener('click', () => {
        pushHistory();
        state.userLookId = null;
        applyPreset(
          p.id,
          state.look.presetIntensity != null ? state.look.presetIntensity : 100
        );
        pushHistory();
        hapticLight();
        if (p.id !== 'none') showToast(p.name, 900);
      });
      presetLooksEl.appendChild(btn);
    });
  }

  /**
   * Apply a curated preset: film + camera + lens + base grade.
   * intensity 0..100 scales look stack + grade strength.
   * @param {string} id
   * @param {number} [intensity]
   * @param {{fast?:boolean}} [opts]
   */
  function applyPreset(id, intensity, opts) {
    opts = opts || {};
    if (!Looks || !Looks.presetById) {
      resetLooks(true);
      scheduleRender(false);
      return;
    }

    const preset = Looks.presetById(id);
    const t = clamp((intensity != null ? intensity : 100) / 100, 0, 1);
    state.look.preset = preset.id;
    state.look.presetIntensity = Math.round(t * 100);

    if (preset.id === 'none') {
      state.look.film = 'none';
      state.look.camera = 'none';
      state.look.lens = 'none';
      state.look.filmIntensity = 100;
      state.look.cameraIntensity = 100;
      state.look.lensIntensity = 100;
      state.look.bloom = 0;
      state.look.ca = 0;
      state.look.imperf = emptyImperf();
      state.look.imperfManual = false;
      state.look.imperfIntensity = 100;
      // Clear grade params that presets typically set (keep rotation)
      PRESET_PARAM_KEYS.forEach((k) => {
        state.params[k] = 0;
      });
    } else {
      state.look.film = preset.film || 'none';
      state.look.camera = preset.camera || 'none';
      state.look.lens = preset.lens || 'none';

      const fBase = preset.filmIntensity != null ? preset.filmIntensity : 100;
      const cBase = preset.cameraIntensity != null ? preset.cameraIntensity : 100;
      const lBase = preset.lensIntensity != null ? preset.lensIntensity : 100;
      const bloomBase = preset.bloom != null ? preset.bloom : 0;
      const caBase = preset.ca != null ? preset.ca : 0;

      state.look.filmIntensity = Math.round(fBase * t);
      state.look.cameraIntensity = Math.round(cBase * t);
      state.look.lensIntensity = Math.round(lBase * t);
      state.look.bloom = Math.round(bloomBase * t);
      state.look.ca = Math.round(caBase * t);

      // Reset grade then apply scaled preset params
      PRESET_PARAM_KEYS.forEach((k) => {
        state.params[k] = 0;
      });
      const g = preset.params || {};
      PRESET_PARAM_KEYS.forEach((k) => {
        if (g[k] == null || g[k] === 0) return;
        state.params[k] = typeof g[k] === 'number' ? g[k] * t : g[k];
        if (k !== 'exposure') {
          state.params[k] = Math.round(state.params[k] * 10) / 10;
          if (Math.abs(state.params[k] - Math.round(state.params[k])) < 0.05) {
            state.params[k] = Math.round(state.params[k]);
          }
        } else {
          state.params[k] = Math.round(state.params[k] * 100) / 100;
        }
      });

      // Spatial imperfections from camera body (scaled by preset strength)
      state.look.imperfManual = false;
      state.look.imperfIntensity = Math.round(100 * t);
      seedImperfFromCamera(true);
      // Scale seeded values by preset intensity
      if (t < 0.999) {
        state.look.imperfManual = true;
        IMPERF_KEYS.forEach((k) => {
          state.look.imperf[k] = Math.round((state.look.imperf[k] || 0) * t);
        });
      }
    }

    if (!opts.fast) {
      syncLookUI();
      updateDialUI();
      markChipModified();
      updateToolDots();
    } else {
      // Lightweight UI while scrubbing intensity
      if (lookIntensityValue) lookIntensityValue.textContent = String(state.look.presetIntensity);
      if (presetLooksEl) {
        presetLooksEl.querySelectorAll('.preset-card').forEach((c) => {
          c.classList.toggle('active', c.dataset.id === (state.look.preset || 'none'));
        });
      }
      updateLookChip();
    }

    state.lookQuality = 'preview';
    scheduleRender(!!opts.fast);
    if (!opts.fast) scheduleLookHQ();
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
      // New body → re-seed spatial imperfections unless user locked manual
      if (!state.look.imperfManual) {
        seedImperfFromCamera(true);
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

    if (presetLooksEl) {
      presetLooksEl.querySelectorAll('.preset-card').forEach((c) => {
        c.classList.toggle('active', c.dataset.id === (state.look.preset || 'none'));
      });
    }

    // intensity slider for active looks tab
    const tab = state.ui.looksTab || 'presets';
    if (lookIntensityWrap) {
      if (tab === 'presets') {
        const hasPreset = state.look.preset && state.look.preset !== 'none';
        lookIntensityWrap.hidden = !hasPreset;
        if (hasPreset) {
          if (lookIntensityName) lookIntensityName.textContent = 'Strength';
          const v = state.look.presetIntensity != null ? state.look.presetIntensity : 100;
          if (lookIntensity) lookIntensity.value = v;
          if (lookIntensityValue) lookIntensityValue.textContent = String(v);
        }
      } else {
        const meta = LOOK_INTENSITY[tab];
        const lookId = state.look[tab];
        if (meta) {
          const show = lookId && lookId !== 'none';
          lookIntensityWrap.hidden = !show;
          if (show) {
            if (lookIntensityName) lookIntensityName.textContent = meta.label;
            if (lookIntensity) lookIntensity.value = state.look[meta.id];
            if (lookIntensityValue) lookIntensityValue.textContent = String(state.look[meta.id]);
          }
        } else {
          lookIntensityWrap.hidden = true;
        }
      }
    }
    updateLookChip();
  }

  function updateLookChip() {
    if (!lookChip || !Looks) return;
    if (!state.hasImage) {
      lookChip.hidden = true;
      lookChip.textContent = '';
      return;
    }
    if (state.look.preset && state.look.preset !== 'none' && Looks.presetById) {
      const p = Looks.presetById(state.look.preset);
      if (p) {
        const strength =
          state.look.presetIntensity != null && state.look.presetIntensity !== 100
            ? ' · ' + state.look.presetIntensity + '%'
            : '';
        lookChip.textContent = p.name + strength;
        lookChip.hidden = false;
        return;
      }
    }
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
    if (!parts.length) {
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
    state.look.preset = 'none';
    state.look.presetIntensity = 100;
    state.look.imperf = emptyImperf();
    state.look.imperfManual = false;
    state.look.imperfIntensity = 100;
    syncLookUI();
    if (!silent) scheduleRender(false);
  }

  // ========== CROP ==========
  /** iOS Photos-style crop session: Cancel discards, Done commits + exits */
  const cropSession = {
    open: false,
    rotation: 0,
    x: 0,
    y: 0,
    w: 1,
    h: 1,
    aspect: 'free',
    frame: 'full',
    committing: false
  };

  function snapshotCropSession() {
    cropSession.rotation = state.params.rotation || 0;
    cropSession.x = state.crop.x;
    cropSession.y = state.crop.y;
    cropSession.w = state.crop.w;
    cropSession.h = state.crop.h;
    cropSession.aspect = state.crop.aspect || 'free';
    cropSession.frame = state.crop.frame || 'full';
  }

  function restoreCropSessionSnap() {
    state.params.rotation = cropSession.rotation;
    state.crop.x = cropSession.x;
    state.crop.y = cropSession.y;
    state.crop.w = cropSession.w;
    state.crop.h = cropSession.h;
    state.crop.aspect = cropSession.aspect;
    state.crop.frame = cropSession.frame;
    markFrameActive(state.crop.frame || 'full');
    $$('.ratio-chip[data-ratio]').forEach((b) => {
      b.classList.toggle('active', b.dataset.ratio === (state.crop.aspect || 'free'));
    });
    updateDialUI();
    updateCropOverlay();
    scheduleRender(false);
  }

  function beginCropSession() {
    if (cropSession.open) return;
    snapshotCropSession();
    cropSession.open = true;
    cropSession.committing = false;
    syncToolChrome();
  }

  function endCropSession(opts) {
    opts = opts || {};
    cropSession.open = false;
    cropSession.committing = false;
    if (opts.restore) restoreCropSessionSnap();
    syncToolChrome();
  }

  /**
   * Main edit chrome vs crop session Cancel / Done (iPhone Photos).
   * body.tool-session-crop drives layout via CSS !important (tb-cluster display
   * otherwise wins over [hidden]). Re-query nodes in case cache was stale.
   */
  function syncToolChrome() {
    const cropMode = !!(state.hasImage && state.ui.tool === 'crop');
    document.body.classList.toggle('tool-session-crop', cropMode);
    const cancel = btnToolCancel || document.getElementById('btnToolCancel');
    const done = btnToolDone || document.getElementById('btnToolDone');
    const main = tbClusterMain || document.getElementById('tbClusterMain');
    const exp = tbClusterExport || document.getElementById('tbClusterExport');
    if (cancel) cancel.hidden = !cropMode;
    if (done) done.hidden = !cropMode;
    if (main) main.hidden = cropMode;
    if (exp) exp.hidden = cropMode;
    // Keep title as "Crop" while session is active (header-busy must not steal it)
    if (cropMode && topbarTitle) {
      setTopbarToolTitle('Crop');
    }
  }

  function cancelCropAndExit() {
    if (!cropSession.open && state.ui.tool !== 'crop') return;
    endCropSession({ restore: true });
    // Avoid re-discard: session already closed before setTool
    setTool('adjust');
    hapticLight();
    showToast('Crop canceled', 900);
  }

  function commitCropAndExit() {
    if (state.ui.tool !== 'crop') return;
    cropSession.committing = true;
    cropSession.open = false; // prevent discard when apply leaves crop
    applyCrop({ exit: true });
    hapticSelect();
  }

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

    // Subject bbox hint on full frame
    if (subjectHint && state.crop.subject) {
      const s = state.crop.subject;
      subjectHint.hidden = false;
      subjectHint.style.left = s.x * 100 + '%';
      subjectHint.style.top = s.y * 100 + '%';
      subjectHint.style.width = s.w * 100 + '%';
      subjectHint.style.height = s.h * 100 + '%';
    } else if (subjectHint) {
      subjectHint.hidden = true;
    }
  }

  // —— Studio framing: subject bbox + soft snap ——
  const SNAP_THR = 0.022;

  function refreshSubjectBBox() {
    state.crop.subject = null;
    if (Scene && Scene.subjectBBox && state.scene) {
      state.crop.subject = Scene.subjectBBox(state.scene);
    }
  }

  function ensureSubjectForCrop() {
    refreshSubjectBBox();
    if (state.crop.subject) {
      if (cropHint) {
        cropHint.textContent =
          'Subject detected · soft-snaps to edges & thirds · scroll to zoom';
      }
      return Promise.resolve(state.crop.subject);
    }
    // Quiet analyze for framing — no full-screen busy (crop stays interactive)
    if (!state.hasImage || !Scene) return Promise.resolve(null);
    if (cropHint) cropHint.textContent = 'Detecting subject…';
    return runSceneAnalysis({ quiet: true })
      .then(() => {
        refreshSubjectBBox();
        if (cropHint) {
          cropHint.textContent = state.crop.subject
            ? 'Subject detected · soft-snaps to edges & thirds · scroll to zoom'
            : 'No subject · using composition guides · scroll to zoom';
        }
        return state.crop.subject;
      })
      .catch(() => {
        if (cropHint) {
          cropHint.textContent = 'Composition guides · scroll to zoom';
        }
        return null;
      });
  }

  function fitRectToAspect(rect, normAspect) {
    // Expand/shrink rect to match normAspect (w/h in normalized image space)
    // keeping center when possible
    let { x, y, w, h } = rect;
    if (!normAspect || normAspect <= 0) return clampRect({ x, y, w, h });
    const cx = x + w / 2;
    const cy = y + h / 2;
    let nw = w;
    let nh = w / normAspect;
    if (nh < h) {
      nh = h;
      nw = h * normAspect;
    }
    if (nw > 1) {
      nw = 1;
      nh = nw / normAspect;
    }
    if (nh > 1) {
      nh = 1;
      nw = nh * normAspect;
    }
    x = clamp(cx - nw / 2, 0, 1 - nw);
    y = clamp(cy - nh / 2, 0, 1 - nh);
    return { x, y, w: nw, h: nh };
  }

  function clampRect(r) {
    let { x, y, w, h } = r;
    w = clamp(w, MIN_CROP_NORM, 1);
    h = clamp(h, MIN_CROP_NORM, 1);
    x = clamp(x, 0, 1 - w);
    y = clamp(y, 0, 1 - h);
    return { x, y, w, h };
  }

  /**
   * Studio frame suggestions relative to subject / composition.
   */
  function applyStudioFrame(frameId) {
    frameId = frameId || 'full';
    state.crop.frame = frameId;
    markFrameActive(frameId);

    const imgW = state.workingCanvas ? state.workingCanvas.width : 1;
    const imgH = state.workingCanvas ? state.workingCanvas.height : 1;
    const aspect = parseAspect(state.crop.aspect, imgW, imgH);
    const normAspect = aspect ? aspect * (imgH / imgW) : null;
    const sub = state.crop.subject;

    // Full frame (or no subject available for subject-based frames)
    if (frameId === 'full' || !sub) {
      if (frameId !== 'full' && !sub) {
        showToast('No subject — try Analyze in Portrait', 1400);
      }
      if (normAspect && state.crop.aspect && state.crop.aspect !== 'free') {
        applyAspectToCrop(state.crop.aspect);
      } else {
        state.crop.x = 0;
        state.crop.y = 0;
        state.crop.w = 1;
        state.crop.h = 1;
      }
      updateCropOverlay();
      scheduleRender(false);
      if (frameId === 'full') showToast('Full frame', 900);
      return;
    }

    let rect = { x: 0, y: 0, w: 1, h: 1 };
    {
      const padLoose = 0.28;
      const padMed = 0.16;
      const padTight = 0.06;

      if (frameId === 'subject') {
        rect = {
          x: sub.x - sub.w * padMed,
          y: sub.y - sub.h * padMed,
          w: sub.w * (1 + padMed * 2),
          h: sub.h * (1 + padMed * 2)
        };
      } else if (frameId === 'center') {
        const tw = Math.min(1, Math.max(sub.w * 1.5, 0.45));
        const th = Math.min(1, Math.max(sub.h * 1.5, 0.45));
        rect = {
          x: sub.cx - tw / 2,
          y: sub.cy - th / 2,
          w: tw,
          h: th
        };
      } else if (frameId === 'tight') {
        rect = {
          x: sub.x - sub.w * padTight,
          y: sub.y - sub.h * padTight,
          w: sub.w * (1 + padTight * 2),
          h: sub.h * (1 + padTight * 2)
        };
      } else if (frameId === 'wide') {
        rect = {
          x: sub.x - sub.w * padLoose,
          y: sub.y - sub.h * padLoose,
          w: sub.w * (1 + padLoose * 2),
          h: sub.h * (1 + padLoose * 2)
        };
      } else if (frameId === 'portrait') {
        // Classic headroom: subject in lower-middle, more space above
        const tw = Math.min(1, Math.max(sub.w * 1.55, 0.42));
        const th = Math.min(1, Math.max(sub.h * 1.85, 0.55));
        let x = sub.cx - tw / 2;
        let y = sub.cy - th * 0.58; // more headroom
        rect = { x, y, w: tw, h: th };
      } else if (frameId === 'thirds') {
        // Place subject center on nearest rule-of-thirds intersection
        const targets = [
          [1 / 3, 1 / 3],
          [2 / 3, 1 / 3],
          [1 / 3, 2 / 3],
          [2 / 3, 2 / 3]
        ];
        let best = targets[0];
        let bestD = Infinity;
        targets.forEach(([tx, ty]) => {
          const d = (sub.cx - tx) * (sub.cx - tx) + (sub.cy - ty) * (sub.cy - ty);
          if (d < bestD) {
            bestD = d;
            best = [tx, ty];
          }
        });
        const tw = Math.min(1, Math.max(sub.w * 1.65, 0.5));
        const th = Math.min(1, Math.max(sub.h * 1.65, 0.5));
        // Offset frame so subject maps toward third point
        let x = best[0] - tw * (sub.cx < 0.5 ? 0.38 : 0.62);
        let y = best[1] - th * (sub.cy < 0.5 ? 0.38 : 0.62);
        // Prefer keeping subject inside
        x = sub.cx - tw / 2 + (best[0] - 0.5) * 0.12;
        y = sub.cy - th / 2 + (best[1] - 0.5) * 0.12;
        rect = { x, y, w: tw, h: th };
      }
    }

    rect = clampRect(rect);
    if (normAspect) rect = fitRectToAspect(rect, normAspect);
    rect = clampRect(rect);

    state.crop.x = rect.x;
    state.crop.y = rect.y;
    state.crop.w = rect.w;
    state.crop.h = rect.h;
    markFrameActive(frameId);
    updateCropOverlay();
    scheduleRender(false);
    showToast(
      frameId === 'full'
        ? 'Full frame'
        : 'Frame: ' + (frameId.charAt(0).toUpperCase() + frameId.slice(1)),
      900
    );
  }

  function markFrameActive(frameId) {
    $$('.frame-chip').forEach((b) => {
      b.classList.toggle('active', b.dataset.frame === frameId);
    });
  }

  function softSnapValue(v, targets, thr) {
    let best = v;
    let bestD = thr;
    let snapped = false;
    for (let i = 0; i < targets.length; i++) {
      const d = Math.abs(v - targets[i]);
      if (d < bestD) {
        bestD = d;
        best = targets[i];
        snapped = true;
      }
    }
    return { v: best, snapped };
  }

  function applySoftSnap(rect, mode) {
    const thirds = [0, 1 / 3, 0.5, 2 / 3, 1];
    const sub = state.crop.subject;
    const edgeTargetsX = thirds.slice();
    const edgeTargetsY = thirds.slice();
    if (sub) {
      edgeTargetsX.push(sub.x, sub.x + sub.w, sub.cx);
      edgeTargetsY.push(sub.y, sub.y + sub.h, sub.cy);
    }

    let { x, y, w, h } = rect;
    let any = false;

    // Move: snap whole frame (preserve size) via edges/center
    if (mode === 'move') {
      const L = softSnapValue(x, edgeTargetsX, SNAP_THR);
      const R = softSnapValue(x + w, edgeTargetsX, SNAP_THR);
      const CX = softSnapValue(x + w / 2, edgeTargetsX, SNAP_THR);
      if (L.snapped) {
        x = L.v;
        any = true;
      } else if (R.snapped) {
        x = R.v - w;
        any = true;
      } else if (CX.snapped) {
        x = CX.v - w / 2;
        any = true;
      }

      const T = softSnapValue(y, edgeTargetsY, SNAP_THR);
      const B = softSnapValue(y + h, edgeTargetsY, SNAP_THR);
      const CY = softSnapValue(y + h / 2, edgeTargetsY, SNAP_THR);
      if (T.snapped) {
        y = T.v;
        any = true;
      } else if (B.snapped) {
        y = B.v - h;
        any = true;
      } else if (CY.snapped) {
        y = CY.v - h / 2;
        any = true;
      }
      return { rect: clampRect({ x, y, w, h }), snapped: any };
    }

    // Resize: snap the edge being dragged (approx: all edges, keep min size)
    const L = softSnapValue(x, edgeTargetsX, SNAP_THR);
    if (L.snapped) {
      const right = x + w;
      x = L.v;
      w = right - x;
      any = true;
    }
    const R = softSnapValue(x + w, edgeTargetsX, SNAP_THR);
    if (R.snapped) {
      w = R.v - x;
      any = true;
    }
    const T = softSnapValue(y, edgeTargetsY, SNAP_THR);
    if (T.snapped) {
      const bottom = y + h;
      y = T.v;
      h = bottom - y;
      any = true;
    }
    const B = softSnapValue(y + h, edgeTargetsY, SNAP_THR);
    if (B.snapped) {
      h = B.v - y;
      any = true;
    }

    return { rect: clampRect({ x, y, w, h }), snapped: any };
  }

  function setCropMode(active) {
    state.crop.active = active && state.hasImage;
    if (canvasArea) canvasArea.classList.toggle('crop-mode', !!state.crop.active);
    if (!cropLayer) return;
    if (state.crop.active) {
      cropLayer.hidden = false;
      if (state.crop.aspect && state.crop.aspect !== 'free') {
        applyAspectToCrop(state.crop.aspect);
      }
      // Fit full image — do NOT auto-run AI here (busy modal kills crop UX).
      // Subject frames analyze lazily when the user taps Subject / Portrait / etc.
      fitView();
      if (state.crop.frame && state.crop.frame !== 'full' && state.crop.frame !== 'custom') {
        if (state.crop.subject) {
          applyStudioFrame(state.crop.frame);
        } else {
          // Apply composition without blocking UI; AI only if already warm
          updateCropOverlay();
        }
      } else {
        updateCropOverlay();
      }
      requestAnimationFrame(() => {
        layoutViewport();
        updateCropOverlay();
      });
    } else {
      cropLayer.hidden = true;
      if (subjectHint) subjectHint.hidden = true;
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
    state.crop.frame = 'custom';
    markFrameActive('custom');

    const move = (ev) => cropPointerMove(ev);
    const up = () => {
      drag.mode = null;
      if (cropRectEl) cropRectEl.classList.remove('snapping');
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

    // Soft snap to thirds / subject (preserve size on move)
    const snapped = applySoftSnap({ x, y, w, h }, drag.mode === 'move' ? 'move' : 'resize');
    x = snapped.rect.x;
    y = snapped.rect.y;
    w = snapped.rect.w;
    h = snapped.rect.h;
    // Re-fit aspect after resize snap
    if (drag.mode !== 'move' && normAspect) {
      const fitted = fitRectToAspect({ x, y, w, h }, normAspect);
      x = fitted.x;
      y = fitted.y;
      w = fitted.w;
      h = fitted.h;
    }
    if (cropRectEl) cropRectEl.classList.toggle('snapping', snapped.snapped);

    state.crop.x = x;
    state.crop.y = y;
    state.crop.w = w;
    state.crop.h = h;
    updateCropOverlay();
  }

  if (cropRectEl) cropRectEl.addEventListener('pointerdown', cropPointerDown);

  // Studio frame chips (Crop only — never Border format chips)
  $$('.frame-chip[data-frame]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.frame || 'full';
      ensureSubjectForCrop().then(() => applyStudioFrame(id));
    });
  });

  function applyCrop(opts) {
    opts = opts || {};
    if (!state.hasImage || !state.workingCanvas) {
      if (opts.exit) {
        endCropSession();
        setTool('adjust');
      }
      return;
    }

    const hasStraighten = Math.abs(state.params.rotation) > 0.001;
    const fullCrop =
      state.crop.x <= 0.0001 &&
      state.crop.y <= 0.0001 &&
      state.crop.w >= 0.999 &&
      state.crop.h >= 0.999;

    if (!hasStraighten && fullCrop) {
      resetCropRect();
      if (opts.exit) {
        endCropSession();
        setTool('adjust');
        showToast('Crop done', 900);
      } else {
        showToast('Nothing to apply');
      }
      return;
    }

    busyStart('crop', 'Applying crop…', hasStraighten ? 'Straighten + crop' : 'Crop');
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
        state.crop.frame = 'full';
        markFrameActive('full');
        invalidateScene();
        state.crop.subject = null;
        pushHistory();
        fitView();
        scheduleRender(false);
        scheduleSceneAnalysis(150);
        showToast('Crop applied');
        if (opts.exit) {
          endCropSession();
          setTool('adjust');
        }
      } finally {
        busyEnd('crop');
        cropSession.committing = false;
      }
    });
  }

  // ========== UI: TOOLS / CHIPS / DIAL ==========
  /** Legacy draft/tool ids → current rail */
  function normalizeToolId(tool) {
    if (tool === 'color' || tool === 'effects' || tool === 'light') return 'adjust';
    if (tool === 'preset' || tool === 'filters') return 'looks';
    if (tool === 'frame') return 'border';
    return tool || 'adjust';
  }

  function setTool(tool) {
    tool = normalizeToolId(tool);
    const prevTool = state.ui.tool;
    const toolChanged = tool !== prevTool;

    // Leaving crop without Done → discard uncommitted straighten/rect (iOS Cancel)
    if (
      prevTool === 'crop' &&
      tool !== 'crop' &&
      cropSession.open &&
      !cropSession.committing
    ) {
      restoreCropSessionSnap();
      cropSession.open = false;
    }

    state.ui.tool = tool;
    $$('.tool-btn').forEach((b) => {
      const on = b.dataset.tool === tool;
      b.classList.toggle('active', on);
      b.setAttribute('aria-selected', on ? 'true' : 'false');
    });

    // Expand dock for content-heavy tools (mobile readability)
    if (dock) {
      dock.classList.toggle(
        'dock-tall',
        tool === 'looks' ||
          tool === 'age' ||
          tool === 'crop' ||
          tool === 'border' ||
          tool === 'portrait'
      );
      dock.dataset.tool = tool || '';
      // Keep active tool rail button visible on narrow screens
      const activeBtn = dock.querySelector('.tool-btn.active');
      if (activeBtn && activeBtn.scrollIntoView) {
        requestAnimationFrame(() => {
          activeBtn.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'auto' });
        });
      }
    }

    // User-driven tool change leaves pure immersive and shows the tool surface.
    // Initial setTool on load keeps photo-first immersive (toolChanged === false).
    if (toolChanged) {
      if (typeof revealChromeForTool === 'function') {
        revealChromeForTool(tool);
      } else if (typeof setChromeHidden === 'function' && isOverlayChrome && isOverlayChrome()) {
        setChromeHidden(false);
        if (typeof setImmersive === 'function') setImmersive(false);
      }
    }

    const isAdj = tool === 'adjust' || tool === 'portrait' || tool === 'age';
    // Border has its own panel (no dial row / no crop handles)
    // Crop: dial only (straighten) — no redundant single-chip strip
    const showDial = isAdj || tool === 'crop';
    const showChips = isAdj;

    if (dialRow) dialRow.hidden = !showDial;
    if (chipsScroll) chipsScroll.hidden = !showChips;
    if (panelLooks) panelLooks.hidden = tool !== 'looks';
    if (panelCrop) panelCrop.hidden = tool !== 'crop';
    if (panelBorder) panelBorder.hidden = tool !== 'border';
    if (panelPortrait) panelPortrait.hidden = tool !== 'portrait';

    // Desktop/side dock: always show top of panel (Analyze / dial meta)
    const dockBodyEl = $('#dockBody');
    if (dockBodyEl) {
      requestAnimationFrame(() => {
        dockBodyEl.scrollTop = 0;
      });
    }

    // Age: hide long hint on small screens (CSS also hides), scroll chips into view
    if (tool === 'age' && chipsScroll) {
      requestAnimationFrame(() => {
        chipsScroll.scrollLeft = 0;
      });
    }
    if (tool === 'looks' && presetsPane) {
      requestAnimationFrame(() => {
        const sc = document.getElementById('presetLooks');
        if (sc) sc.scrollLeft = 0;
      });
    }

    // Crop overlay ONLY on Crop tab — never on Border
    setCropMode(tool === 'crop');

    if (tool === 'crop') {
      beginCropSession();
    } else if (prevTool === 'crop') {
      // Ensure session flag cleared when leaving (commit path already did)
      if (!cropSession.committing) cropSession.open = false;
    }

    if (tool === 'border') {
      syncBorderUI();
      // Ensure no crop handles linger
      if (cropLayer) cropLayer.hidden = true;
      if (canvasArea) canvasArea.classList.remove('crop-mode');
    }

    if (showDial) {
      // When opening Age, surface current camera-baked values in dials
      if (tool === 'age' && !state.look.imperfManual) {
        seedImperfFromCamera(true);
      }
      const list = TOOL_ADJUSTMENTS[tool] || TOOL_ADJUSTMENTS.adjust;
      const prefer = state.ui.activeAdj;
      const next = list.find((a) => a.id === prefer) || list[0];
      if (showChips) {
        buildChips(list, next.id);
      }
      selectAdj(next.id, true);
    }

    if (tool === 'looks') {
      setLooksTab(state.ui.looksTab || 'presets');
    }

    updateEnhanceBarUI();
    syncToolChrome();

    if (topbarTitle) {
      const titles = {
        adjust: 'Adjust',
        age: 'Age',
        looks: 'Filters',
        crop: 'Crop',
        border: 'Frame',
        portrait: 'Portrait'
      };
      if (state.hasImage) {
        setTopbarToolTitle(titles[tool] || 'Edit');
      } else {
        setTopbarBrand();
      }
    }

    // No enter animation on tool switch — prevents flash
  }

  function buildChips(list, activeId) {
    if (!chipsEl) return;
    // Build off-DOM then swap once — avoids empty chips flash for one frame
    const frag = document.createDocumentFragment();
    list.forEach((adj) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'chip' + (activeId && adj.id === activeId ? ' active' : '');
      btn.dataset.adj = adj.id;
      btn.setAttribute('role', 'option');
      btn.innerHTML =
        '<span class="chip-icon">' +
        (CHIP_SVG[adj.id] || CHIP_SVG.exposure) +
        '</span><span class="chip-label">' +
        adj.label +
        '</span>';

      btn.addEventListener('click', (e) => {
        if (btn._ignoreClick) {
          btn._ignoreClick = false;
          return;
        }
        selectAdj(adj.id);
      });

      btn.addEventListener('dblclick', (e) => {
        e.preventDefault();
        resetAdj(adj);
      });

      bindLongPress(btn, {
        onLongPress: (ev) => startFineAdjust(adj, ev),
        onDoubleTap: () => resetAdj(adj)
      });

      frag.appendChild(btn);
    });
    chipsEl.replaceChildren(frag);
    markChipModified();
    if (activeId) {
      const active = chipsEl.querySelector('[data-adj="' + activeId + '"]');
      if (active && active.scrollIntoView) {
        // Instant — smooth scroll also felt like a "jump/flash" on mobile
        active.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'auto' });
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

    const val =
      adj.store === 'imperf' ? getImperfDisplayValue(adj) : getAdjValue(adj);

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
      if (tool === 'adjust') {
        has = (TOOL_ADJUSTMENTS.adjust || []).some(isAdjModified);
      } else if (tool === 'looks') {
        has =
          (state.look.preset && state.look.preset !== 'none') ||
          state.look.film !== 'none' ||
          state.look.camera !== 'none' ||
          state.look.lens !== 'none';
      } else if (tool === 'age') {
        has =
          (TOOL_ADJUSTMENTS.age || []).some(isAdjModified) ||
          (state.look.camera && state.look.camera !== 'none');
      } else if (tool === 'portrait') {
        has =
          state.optics.focusManual ||
          Math.abs(state.optics.strength - 0.55) > 0.01 ||
          Math.abs(state.optics.apertureStrength - 0.55) > 0.01 ||
          Math.abs(state.optics.bokehAmount - 0.55) > 0.01 ||
          (state.optics.skinSoft || 0) > 0.01 ||
          (state.optics.subjectPunch || 0) > 0.01;
      } else if (tool === 'crop') {
        has =
          Math.abs(state.params.rotation) > 0.01 ||
          state.crop.w < 0.999 ||
          state.crop.h < 0.999;
      } else if (tool === 'border') {
        has = !!(state.border && state.border.id && state.border.id !== 'none');
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
    } else if (adj.store === 'imperf') {
      if (!state.look.imperfManual) {
        seedImperfFromCamera(true);
        state.look.imperfManual = true;
      }
      state.look.imperf[adj.id] = 0;
    } else if (adj.id === 'imperfIntensity') {
      state.look.imperfIntensity = 100;
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
        tickDialValue();
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

  // Tool rail — re-tap active tool toggles panels (full ↔ rail) like iOS Photos
  $$('.tool-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const tool = normalizeToolId(btn.dataset.tool);
      if (
        isOverlayChrome() &&
        state.hasImage &&
        tool === state.ui.tool &&
        chromeState.mode !== 'immersive'
      ) {
        setChromeHidden(chromeState.mode !== 'rail');
        hapticSelect();
        return;
      }
      setTool(tool);
      hapticSelect();
    });
  });

  // Looks segment
  function setLooksTab(tab) {
    state.ui.looksTab = tab || 'presets';
    $$('#looksSeg .seg-btn').forEach((b) =>
      b.classList.toggle('active', b.dataset.looks === state.ui.looksTab)
    );
    if (presetsPane) presetsPane.hidden = state.ui.looksTab !== 'presets';
    if (filmLooksEl) filmLooksEl.hidden = state.ui.looksTab !== 'film';
    if (cameraLooksEl) cameraLooksEl.hidden = state.ui.looksTab !== 'camera';
    if (lensLooksEl) lensLooksEl.hidden = state.ui.looksTab !== 'lens';
    if (state.ui.looksTab === 'presets') buildPresetCards();
    syncLookUI();
  }
  $$('#looksSeg .seg-btn').forEach((btn) => {
    btn.addEventListener('click', () => setLooksTab(btn.dataset.looks));
  });

  if (lookIntensity) {
    lookIntensity.addEventListener('pointerdown', () => beginScrub());
    lookIntensity.addEventListener('input', () => {
      const tab = state.ui.looksTab || 'presets';
      const val = parseFloat(lookIntensity.value);
      if (tab === 'presets') {
        // Live rescale full preset recipe (fast scrub path)
        if (state.look.preset && state.look.preset !== 'none') {
          applyPreset(state.look.preset, val, { fast: true });
        }
        if (lookIntensityValue) lookIntensityValue.textContent = String(val);
        return;
      }
      const meta = LOOK_INTENSITY[tab];
      if (!meta) return;
      state.look[meta.id] = val;
      // Manual intensity tweak detaches from named preset
      if (state.look.preset && state.look.preset !== 'none') {
        state.look.preset = 'none';
        if (presetLooksEl) {
          presetLooksEl.querySelectorAll('.preset-card').forEach((c) => {
            c.classList.toggle('active', c.dataset.id === 'none');
          });
        }
      }
      state.lookQuality = 'preview';
      if (lookIntensityValue) lookIntensityValue.textContent = String(val);
      updateLookChip();
      updateToolDots();
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
    let compareStartX = 0;
    let compareStartY = 0;

    const onCanvasTap = (x, y) => {
      const now = Date.now();
      const isDouble =
        now - tapState.lastAt < 300 &&
        Math.abs(x - tapState.lastX) < 44 &&
        Math.abs(y - tapState.lastY) < 44;
      if (isDouble) {
        clearTimeout(tapState.timer);
        tapState.timer = null;
        tapState.lastAt = 0;
        // Double-tap: toggle fit ↔ 2.5× at the tapped point
        if (state.view.zoom > 1.05) {
          setZoom(state.view.minZoom, null, null, true);
        } else {
          setZoom(2.5, x, y, true);
        }
        hapticLight();
        return;
      }
      tapState.lastAt = now;
      tapState.lastX = x;
      tapState.lastY = y;
      clearTimeout(tapState.timer);
      tapState.timer = setTimeout(() => {
        tapState.timer = null;
        // Single tap on the photo: toggle immersive view (iOS Photos)
        // Blocked during crop / export sheet / fine scrub (canEnterImmersive)
        if (isOverlayChrome() && state.hasImage) {
          toggleImmersive();
        }
      }, 290);
    };

    canvasArea.addEventListener('pointerdown', (e) => {
      if (!state.hasImage) return;
      if (state.crop.active) return;
      if (pinch.active) return;
      if (e.altKey || e.button === 1) return;
      if (e.target.closest('.crop-layer, .zoom-hud, button')) return;
      if (e.isPrimary === false) return;

      comparePointerId = e.pointerId;
      compareStartX = e.clientX;
      compareStartY = e.clientY;
      clearTimeout(compareTimer);
      compareTimer = setTimeout(() => {
        if (pinch.active) return;
        // Finger held still — compare wins over the (not yet moved) pan drag
        panDrag.active = false;
        startCompare();
        hapticLight();
      }, 220);
    });

    const cancelCompareGesture = (e) => {
      if (comparePointerId != null && e.pointerId !== comparePointerId) return;
      // Timer still pending = short still press → candidate for tap
      const hadTimer = !!compareTimer;
      const wasComparing = state.isComparing;
      clearTimeout(compareTimer);
      compareTimer = null;
      comparePointerId = null;
      endCompare();
      if (
        e.type === 'pointerup' &&
        hadTimer &&
        !wasComparing &&
        !pinch.active &&
        Date.now() - pinch.endedAt > 350
      ) {
        onCanvasTap(e.clientX, e.clientY);
      }
    };

    canvasArea.addEventListener('pointerup', cancelCompareGesture);
    canvasArea.addEventListener('pointercancel', cancelCompareGesture);
    canvasArea.addEventListener('pointerleave', (e) => {
      if (e.pointerType === 'mouse') cancelCompareGesture(e);
    });
    canvasArea.addEventListener('pointermove', (e) => {
      if (!compareTimer) return;
      const dx = e.clientX - compareStartX;
      const dy = e.clientY - compareStartY;
      if (dx * dx + dy * dy > 36) {
        clearTimeout(compareTimer);
        compareTimer = null;
      }
    });
  }

  // ========== CONTROLS ENABLE / RESET ==========
  function enableControls(enabled) {
    if (!state.exporting) btnDownload.disabled = !enabled;
    if (btnReset) btnReset.disabled = !enabled;
    if (btnClose) btnClose.disabled = !enabled;
    if (btnSaveLook) btnSaveLook.disabled = !enabled;
    if (!enabled) {
      state.ui.showHistogram = false;
      syncHistoToggleUI();
      setHistoVisible(false);
      if (enhanceBar) enhanceBar.hidden = true;
    } else {
      updateEnhanceBarUI();
      syncHistoToggleUI();
    }
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
    state.enhanceMode = null;
    if (!silent) {
      updateDialUI();
      markChipModified();
      updateToolDots();
      updateEnhanceBarUI();
    }
  }

  function hardResetAll() {
    if (!state.hasImage) return;
    pushHistory();
    resetParams(true);
    resetLooks(true);
    state.enhanceMode = null;
    updateEnhanceBarUI();
    PRESET_PARAM_KEYS.forEach((k) => {
      state.params[k] = 0;
    });
    state.optics.strength = 0.55;
    state.optics.apertureStrength = 0.55;
    state.optics.apertureSlider = 55;
    state.optics.bokehAmount = 0.55;
    state.optics.skinSoft = 0;
    state.optics.subjectPunch = 0;
    state.border = { id: 'none', zoom: 1, panX: 0, panY: 0 };
    if (typeof syncBorderUI === 'function') syncBorderUI();
    state.optics.focusManual = false;
    state.optics.focusDepth = 0.3;
    state.optics.focalRecipe = '50';
    state.optics.bokehShape = 'auto';
    state.optics.enabled = false;
    if (opticsEnabledEl) opticsEnabledEl.checked = false;
    state.debugScene = 'off';
    resetCropRect();
    syncFocalBokeh();
    $$('.debug-btn').forEach((b) => b.classList.toggle('active', b.dataset.debug === 'off'));
    updateDialUI();
    markChipModified();
    updateToolDots();
    scheduleRender(false);
    pushHistory();
    showToast('All reset');
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
      // When turning DoF on without a scene map, run analysis once
      if (state.optics.enabled && !state.scene && state.hasImage) {
        scheduleSceneAnalysis(80);
      }
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

  // Borders framing sliders
  function bindBorderSlider(el, key, scale, formatVal) {
    if (!el) return;
    el.addEventListener('input', () => {
      if (!state.border) return;
      const raw = parseFloat(el.value);
      if (key === 'zoom') state.border.zoom = clamp(raw / 100, 1, 2.5);
      else if (key === 'panX') state.border.panX = clamp(raw / 100, -1, 1);
      else if (key === 'panY') state.border.panY = clamp(raw / 100, -1, 1);
      syncBorderUI();
      scheduleRender(false);
    });
    el.addEventListener('change', () => scheduleHistoryPush());
  }
  bindBorderSlider(borderZoom, 'zoom');
  bindBorderSlider(borderPanX, 'panX');
  bindBorderSlider(borderPanY, 'panY');

  // ========== EXPORT ==========
  function estimateExportDims() {
    if (!state.hasImage || !state.workingCanvas) return '';
    const ww = state.workingCanvas.width;
    const wh = state.workingCanvas.height;
    const size = state.export.size;
    if (size === 'working') {
      return 'Output: ' + ww + ' × ' + wh + ' px (preview · fast)';
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
          : ' · source pixels'
        : ' · full pipeline';
    return 'Output ≈ ' + outW + ' × ' + outH + ' px' + note;
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
    // Exit immersive so the sheet isn't buried under photo gestures
    if (typeof setImmersive === 'function') setImmersive(false);
    if (typeof chromeState !== 'undefined') chromeState.sheetOpen = true;
    updateExportSheetUI();
    if (exportBackdrop) exportBackdrop.hidden = false;
    if (exportSheet) exportSheet.hidden = false;
  }

  function closeExportSheet() {
    if (typeof chromeState !== 'undefined') chromeState.sheetOpen = false;
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
        ? 'full resolution'
        : state.export.size === 'working'
          ? 'preview'
          : state.export.size + 'px';
    busyStart(
      'export',
      'Preparing export…',
      sizeLabel + ' · ' + (state.export.format || 'jpeg').toUpperCase()
    );
    setButtonBusy(btnDownload, true, '…', 'Done');

    try {
      busyUpdate('export', 'Applying filters…', sizeLabel);
      const shareFn =
        Export.shareOrDownload || Export.downloadWithFallback || Export.download;
      const result = await shareFn({
        size: state.export.size,
        format: state.export.format,
        quality: state.export.quality,
        fileName: state.sourceFileName || 'hermione-edit',
        workingData: state.originalData,
        workingCanvas: state.workingCanvas,
        originalImage: state.originalImage,
        ops: state.ops,
        params: state.params,
        look: state.look,
        scene: state.scene,
        border: currentBorderOpts(),
        optics: {
          enabled: state.optics.enabled,
          strength: state.optics.strength,
          apertureStrength: state.optics.apertureStrength,
          focusDepth: state.optics.focusDepth,
          focalRecipe: state.optics.focalRecipe || '50',
          bokehShape: state.optics.bokehShape || 'auto',
          bokehAmount: state.optics.bokehAmount != null ? state.optics.bokehAmount : 0.55,
          skinSoft: state.optics.skinSoft || 0,
          subjectPunch: state.optics.subjectPunch || 0
        },
        maxWorkingSize: state.maxWorkingSize
      });
      if (result.cancelled) {
        showToast('Share cancelled', 900);
      } else if (result.activationFallback) {
        showToast('Saved · ' + result.width + '×' + result.height);
      } else if (result.shared) {
        showToast('Shared · ' + result.width + '×' + result.height);
      } else if (result.fallbackFrom) {
        showToast(
          'Saved at ' +
            result.width +
            '×' +
            result.height +
            ' (reduced from ' +
            result.fallbackFrom +
            ')'
        );
      } else {
        showToast('Saved · ' + result.width + '×' + result.height);
      }
      // Keep draft after export so user can continue tweaking
      scheduleDraftSave();
    } catch (err) {
      const Errors = window.HermioneErrors;
      const msg =
        (err && err.message) || 'Export failed — try a smaller size';
      if (Errors) {
        Errors.report(err, 'export');
        Errors.showBanner(msg, { tone: 'error', timeoutMs: 6000 });
      } else {
        console.error(err);
        showToast(msg, 4000);
      }
    } finally {
      state.exporting = false;
      busyEnd('export');
      setButtonBusy(btnDownload, false, '…', 'Done');
      btnDownload.disabled = !state.hasImage;
    }
  }

  // ========== ACTIONS ==========
  if (enhanceBar) {
    enhanceBar.addEventListener('click', (e) => {
      const btn = e.target.closest('.enhance-btn');
      if (!btn || !btn.dataset.enhance) return;
      applyEnhanceMode(btn.dataset.enhance);
    });
  }

  if (btnSaveLook) {
    btnSaveLook.addEventListener('click', () => saveCurrentLook());
  }

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
    if (e.target.closest('a')) return;
    if (e.target.closest('#draftResume')) return;
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
      if (confirm('Close and load a new photo? This clears the on-device draft.')) {
        clearDraft();
        playEditorExit(() => {
          state.hasImage = false;
          state.originalImage = null;
          state.originalData = null;
          state.scrubData = null;
          state.workingCanvas = null;
          state.ops = [];
          state.scene = null;
          state.sourceFileName = null;
          canvas.classList.remove('visible');
          if (dock) dock.hidden = true;
          if (typeof setImmersive === 'function') setImmersive(false);
          if (typeof setChromeHidden === 'function') setChromeHidden(false);
          dropOverlay.classList.remove('hidden');
          enableControls(false);
          if (lookChip) lookChip.hidden = true;
          setTopbarBrand();
          if (typeof updateLayoutMode === 'function') updateLayoutMode();
          fileInput.value = '';
          fileInput.click();
        });
      }
    });
  }

  if (btnDraftContinue) {
    btnDraftContinue.addEventListener('click', (e) => {
      e.stopPropagation();
      continueDraft();
    });
  }
  if (btnDraftDismiss) {
    btnDraftDismiss.addEventListener('click', (e) => {
      e.stopPropagation();
      dismissDraft();
    });
  }

  window.addEventListener('pagehide', () => {
    if (state.hasImage) saveDraftNow();
  });
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
      state.crop.aspect = 'free';
      state.crop.frame = 'full';
      markFrameActive('full');
      $$('.ratio-chip[data-ratio]').forEach((b) => {
        b.classList.toggle('active', b.dataset.ratio === 'free');
      });
      updateDialUI();
      scheduleRender(false);
      scheduleHistoryPush();
    });
  }
  if (btnToolCancel) {
    btnToolCancel.addEventListener('click', () => cancelCropAndExit());
  }
  if (btnToolDone) {
    btnToolDone.addEventListener('click', () => commitCropAndExit());
  }

  // ========== CHROME STATE MACHINE (mobile overlay) ==========
  // mode: 'full' | 'rail' | 'immersive'
  //   full       — topbar + tool surface + rail
  //   rail       — topbar + rail only (panels collapsed via chevron/swipe)
  //   immersive  — photo only (tap photo); restore to beforeImmersive
  const chromeState = {
    mode: 'full',
    beforeImmersive: 'full',
    sheetOpen: false,
    get hidden() {
      return this.mode === 'rail';
    },
    get immersive() {
      return this.mode === 'immersive';
    }
  };

  function isOverlayChrome() {
    return !document.body.classList.contains('layout-side');
  }

  function canEnterImmersive() {
    if (!isOverlayChrome() || !state.hasImage) return false;
    if (state.crop && state.crop.active) return false;
    if (state.ui.tool === 'crop') return false;
    if (chromeState.sheetOpen) return false;
    if (fineOverlay && !fineOverlay.hidden) return false;
    if (exportSheet && !exportSheet.hidden) return false;
    return true;
  }

  function applyChromeUI() {
    const overlay = isOverlayChrome() && state.hasImage;
    const mode = overlay ? chromeState.mode : 'full';

    document.body.classList.toggle('ui-immersive', mode === 'immersive');
    document.body.classList.toggle('chrome-hidden', mode === 'rail');
    // Photo-first shell marker (glass chrome, full-bleed fit)
    document.body.classList.toggle('ui-photo-first', overlay);

    const bodyEl = document.getElementById('dockBody');
    if (bodyEl) {
      // Hard-hide panel stack (more reliable than max-height alone on iOS)
      bodyEl.hidden = mode === 'rail' || mode === 'immersive';
    }

    const handle = document.getElementById('dockHandleHit');
    if (handle) {
      const panelsOpen = mode === 'full';
      handle.setAttribute('aria-expanded', panelsOpen ? 'true' : 'false');
      handle.setAttribute(
        'aria-label',
        panelsOpen ? 'Hide tool panels' : 'Show tool panels'
      );
      handle.setAttribute('title', panelsOpen ? 'Hide panels' : 'Show panels');
      // Immersive: handle is off-screen with dock — keep a11y quiet
      handle.tabIndex = mode === 'immersive' ? -1 : 0;
    }

    if (state.view.zoom > 1.02) clampPan();
    applyViewTransform();
    if (state.crop && state.crop.active) updateCropOverlay();
    // Refit photo to full viewport whenever chrome mode changes
    requestAnimationFrame(() => {
      layoutViewport();
    });
  }

  /** Set chrome mode. Invalid / guarded transitions no-op or fall back. */
  function setChromeMode(mode) {
    if (!isOverlayChrome() || !state.hasImage) {
      chromeState.mode = 'full';
      applyChromeUI();
      return;
    }
    if (mode === 'immersive' && !canEnterImmersive()) {
      return;
    }
    if (mode !== 'full' && mode !== 'rail' && mode !== 'immersive') {
      mode = 'full';
    }
    if (mode === 'immersive' && chromeState.mode !== 'immersive') {
      chromeState.beforeImmersive =
        chromeState.mode === 'rail' ? 'rail' : 'full';
    }
    if (mode !== 'immersive') {
      chromeState.beforeImmersive = mode === 'rail' ? 'rail' : 'full';
    }
    chromeState.mode = mode;
    applyChromeUI();
  }

  /** Full immersive: tap photo hides ALL chrome. Tap again restores. */
  function setImmersive(on) {
    on = !!on;
    if (on) {
      if (!canEnterImmersive()) return;
      if (chromeState.mode === 'immersive') return;
      setChromeMode('immersive');
    } else {
      if (chromeState.mode !== 'immersive') {
        // Still clear class if layout flipped to side
        if (!isOverlayChrome()) applyChromeUI();
        return;
      }
      const restore =
        chromeState.beforeImmersive === 'rail' ? 'rail' : 'full';
      setChromeMode(restore);
    }
  }

  function toggleImmersive() {
    if (chromeState.mode === 'immersive') {
      setImmersive(false);
    } else if (canEnterImmersive()) {
      setImmersive(true);
    } else {
      return;
    }
    hapticLight();
  }

  /** Collapse panels only (rail stays). */
  function setChromeHidden(hidden) {
    if (!isOverlayChrome()) {
      setChromeMode('full');
      return;
    }
    // Crop session needs Cancel/Done topbar + crop panel — stay full
    if (hidden && state.ui.tool === 'crop') {
      setChromeMode('full');
      return;
    }
    if (hidden) {
      setChromeMode('rail');
    } else {
      setChromeMode('full');
    }
  }

  /**
   * Entering a tool exits pure immersive and shows the tool surface.
   * beforeImmersive stays 'rail' so tap-to-hide returns to photo-first rail.
   */
  function revealChromeForTool(_tool) {
    if (!isOverlayChrome() || !state.hasImage) return;
    chromeState.mode = 'full';
    chromeState.beforeImmersive = 'rail';
    applyChromeUI();
  }

  /** Chevron tap + vertical swipe on handle/rail. Tool rail always stays. */
  function bindChromeGestures() {
    const handle = document.getElementById('dockHandleHit');
    const rail = document.getElementById('toolRail');
    // Guard against double-fire (iOS ghost clicks / swipe + click)
    let lastToggle = 0;
    const setPanels = (hidden) => {
      if (!isOverlayChrome() || !state.hasImage) return;
      if (dock && dock.hidden) return;
      if (chromeState.mode === 'immersive') return;
      const now = Date.now();
      if (now - lastToggle < 280) return;
      lastToggle = now;
      setChromeHidden(hidden);
      hapticLight();
    };
    // Swipe down = collapse panels · swipe up = expand (bottom-sheet feel)
    const bindSwipe = (el) => {
      if (!el) return;
      let track = null;
      let swipedAt = 0;
      el.addEventListener(
        'pointerdown',
        (e) => {
          if (e.pointerType !== 'touch') return;
          track = { id: e.pointerId, x: e.clientX, y: e.clientY };
        },
        { passive: true }
      );
      el.addEventListener('pointermove', (e) => {
        if (!track || e.pointerId !== track.id) return;
        const dy = e.clientY - track.y;
        const dx = e.clientX - track.x;
        // Mostly-vertical drag beyond threshold (horizontal stays scroll)
        if (Math.abs(dy) < 24 || Math.abs(dy) < Math.abs(dx) * 1.3) return;
        track = null;
        swipedAt = Date.now();
        if (dy > 0 && chromeState.mode === 'full') setPanels(true);
        else if (dy < 0 && chromeState.mode === 'rail') setPanels(false);
      });
      const clear = () => {
        track = null;
      };
      el.addEventListener('pointerup', clear);
      el.addEventListener('pointercancel', clear);
      // Swallow the ghost click a swipe can leave behind (would hit a tool button)
      el.addEventListener(
        'click',
        (e) => {
          if (Date.now() - swipedAt < 450) {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
          }
        },
        true
      );
    };
    // Swipe suppressors first, then the tap toggle (same-element listener order)
    bindSwipe(handle);
    bindSwipe(rail);
    if (handle) {
      handle.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (chromeState.mode === 'immersive') {
          setImmersive(false);
          hapticLight();
          return;
        }
        setPanels(chromeState.mode !== 'rail');
      });
    }
  }

  /**
   * Accordion open/close — desktop/side only.
   * Mobile overlay uses flat surfaces (CSS always-open bodies).
   */
  function bindAccordions() {
    document.querySelectorAll('[data-acc-toggle]').forEach((btn) => {
      btn.addEventListener('click', () => {
        // Mobile flat UI: headers are hidden; ignore accidental hits
        if (isOverlayChrome()) return;
        const id = btn.getAttribute('data-acc-toggle');
        const panel = btn.closest('.subpanel');
        if (!panel || !id) return;
        const group = panel.querySelector('.acc-group[data-acc="' + id + '"]');
        if (!group) return;
        const wasOpen = group.classList.contains('open');
        group.classList.toggle('open', !wasOpen);
      });
    });
  }

  bindChromeGestures();
  bindAccordions();

  // ========== VIEWPORT HEIGHT (iOS Safari dynamic chrome) ==========
  function syncVisualViewportHeight() {
    const vv = window.visualViewport;
    // Prefer visualViewport — matches what the user actually sees on iPhone Safari
    const h = vv && vv.height ? vv.height : window.innerHeight || 0;
    if (h > 0) {
      document.documentElement.style.setProperty('--vvh', h + 'px');
    }
    if (vv) {
      // Offset when Safari shifts the layout during scroll/keyboard
      document.documentElement.style.setProperty('--vv-offset-top', (vv.offsetTop || 0) + 'px');
    }
  }
  syncVisualViewportHeight();
  window.addEventListener('resize', syncVisualViewportHeight);
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', syncVisualViewportHeight);
    window.visualViewport.addEventListener('scroll', syncVisualViewportHeight);
  }

  // iOS Safari ignores user-scalable=no in the browser tab — block the native
  // page pinch-zoom so two fingers always drive the photo, never the UI.
  ['gesturestart', 'gesturechange', 'gestureend'].forEach((type) => {
    document.addEventListener(type, (e) => e.preventDefault());
  });

  // ========== RESPONSIVE LAYOUT (portrait bottom dock · landscape/desktop side dock) ==========
  function updateLayoutMode() {
    syncVisualViewportHeight();
    const w = window.innerWidth || document.documentElement.clientWidth || 0;
    const h = window.innerHeight || document.documentElement.clientHeight || 0;
    const landscape = w > h;
    // Phones (short edge < 500 or long edge < 900) always use bottom overlay dock.
    // Previous rules (landscape && w>=780 && h>=360) wrongly put iPhone landscape into side layout.
    const isPhone = Math.min(w, h) < 500 || Math.max(w, h) < 900;
    const side =
      !isPhone &&
      ((w >= 900 && h >= 560) || (landscape && w >= 1000 && h >= 600));
    // Compact chrome when height is tight (phone landscape)
    const compact = h > 0 && h < 500;

    document.body.classList.toggle('layout-side', side);
    document.body.classList.toggle('layout-compact', compact);
    document.body.classList.toggle('layout-landscape', landscape);
    document.body.classList.toggle('layout-portrait', !landscape);

    // Side layout always shows full chrome
    if (side && chromeState.mode !== 'full') {
      chromeState.mode = 'full';
      chromeState.beforeImmersive = 'full';
      applyChromeUI();
    }

    // Refit image after reflow — stage size is stable on overlay layout
    requestAnimationFrame(() => {
      layoutViewport();
      if (state.crop.active) {
        updateCropOverlay();
        requestAnimationFrame(updateCropOverlay);
      }
    });
  }

  let layoutRaf = 0;
  function scheduleLayoutMode() {
    if (layoutRaf) return;
    layoutRaf = requestAnimationFrame(() => {
      layoutRaf = 0;
      updateLayoutMode();
    });
  }

  window.addEventListener('resize', scheduleLayoutMode);
  window.addEventListener('orientationchange', () => {
    // iOS fires before viewport settles
    setTimeout(updateLayoutMode, 60);
    setTimeout(updateLayoutMode, 220);
  });
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', scheduleLayoutMode);
  }
  updateLayoutMode();

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
      // Crop session Cancel
      if (state.ui.tool === 'crop' && state.hasImage) {
        cancelCropAndExit();
        return;
      }
      if (chromeState.mode === 'immersive' && isOverlayChrome()) {
        setImmersive(false);
        return;
      }
      if (chromeState.mode === 'rail' && isOverlayChrome()) {
        setChromeHidden(false);
        return;
      }
      return;
    }
    // Toggle dock panels (rail stays) — also exits immersive
    if (e.key === 'h' && !e.metaKey && !e.ctrlKey && state.hasImage && isOverlayChrome()) {
      e.preventDefault();
      if (chromeState.mode === 'immersive') {
        setChromeMode('full');
      } else {
        setChromeHidden(chromeState.mode !== 'rail');
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

    // Zoom: + / - / 0 (fit)
    if (!meta && (e.key === '=' || e.key === '+')) {
      e.preventDefault();
      const area = canvasArea.getBoundingClientRect();
      setZoom(state.view.zoom * 1.2, area.left + area.width / 2, area.top + area.height / 2, true);
      return;
    }
    if (!meta && e.key === '-') {
      e.preventDefault();
      const area = canvasArea.getBoundingClientRect();
      setZoom(state.view.zoom / 1.2, area.left + area.width / 2, area.top + area.height / 2, true);
      return;
    }
    if (!meta && e.key === '0') {
      e.preventDefault();
      fitView();
      return;
    }

    if (e.code === 'Space') {
      e.preventDefault();
      startCompare();
    }
    if (e.code === 'Enter' && state.crop.active) {
      if (meta || state.ui.tool === 'crop') {
        e.preventDefault();
        if (state.ui.tool === 'crop') commitCropAndExit();
        else applyCrop();
      }
    }
  });

  document.addEventListener('keyup', (e) => {
    if (e.code === 'Space') endCompare();
  });

  // Init
  buildLookCards();
  buildBorderFormats();
  syncBorderUI();
  updateUserLooksHint();
  const apInit = apertureFromSlider(55);
  state.optics.apertureStrength = apInit.strength;
  if (dock) dock.hidden = true;
  enableControls(false);
  checkDraftOnBoot();
  requestAnimationFrame(() => playHeroEnter());

  // MediaPipe / portrait pipeline stays cold until user enables DoF or taps Analyze

  console.log('Hermione ready · Iris');
})();
