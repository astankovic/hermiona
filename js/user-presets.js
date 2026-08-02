/**
 * Hermiona — user-saved looks (localStorage, on-device only)
 * Exposes window.HermionaUserPresets
 *
 * Stores light/color/effects + film/camera/lens stack + enhance mode.
 * No photos, no crop geometry.
 */
(function (global) {
  'use strict';

  var STORAGE_KEY = 'hermiona.userLooks.v1';
  var MAX_LOOKS = 40;
  var VERSION = 1;

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
    'clarity',
    'sharpen',
    'vignette',
    'grain'
  ];

  function uid() {
    return (
      'u_' +
      Date.now().toString(36) +
      '_' +
      Math.random().toString(36).slice(2, 7)
    );
  }

  function safeParse(raw) {
    try {
      var data = JSON.parse(raw);
      if (!data || !Array.isArray(data.items)) return [];
      return data.items;
    } catch (e) {
      return [];
    }
  }

  function loadAll() {
    try {
      if (!global.localStorage) return [];
      return safeParse(global.localStorage.getItem(STORAGE_KEY) || '');
    } catch (e) {
      return [];
    }
  }

  function saveAll(items) {
    try {
      if (!global.localStorage) return false;
      global.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ version: VERSION, items: items })
      );
      return true;
    } catch (e) {
      return false;
    }
  }

  function snapshotFromState(state, name) {
    var params = {};
    var i;
    for (i = 0; i < PARAM_KEYS.length; i++) {
      var k = PARAM_KEYS[i];
      params[k] = state.params && state.params[k] != null ? state.params[k] : 0;
    }

    var look = state.look || {};
    var imperf = {};
    if (look.imperf) {
      Object.keys(look.imperf).forEach(function (ik) {
        imperf[ik] = look.imperf[ik];
      });
    }

    return {
      id: uid(),
      name: (name && String(name).trim()) || 'My look',
      created: Date.now(),
      version: VERSION,
      swatch: '#3a3a3c',
      params: params,
      look: {
        film: look.film || 'none',
        filmIntensity: look.filmIntensity != null ? look.filmIntensity : 100,
        camera: look.camera || 'none',
        cameraIntensity:
          look.cameraIntensity != null ? look.cameraIntensity : 100,
        lens: look.lens || 'none',
        lensIntensity: look.lensIntensity != null ? look.lensIntensity : 100,
        bloom: look.bloom || 0,
        ca: look.ca || 0,
        imperf: imperf,
        imperfManual: !!look.imperfManual,
        imperfIntensity:
          look.imperfIntensity != null ? look.imperfIntensity : 100,
        // curated parent if any — for display only
        basePreset: look.preset || 'none'
      },
      enhanceMode: state.enhanceMode || null
    };
  }

  function list() {
    return loadAll().sort(function (a, b) {
      return (b.created || 0) - (a.created || 0);
    });
  }

  function get(id) {
    var items = loadAll();
    for (var i = 0; i < items.length; i++) {
      if (items[i].id === id) return items[i];
    }
    return null;
  }

  /**
   * @param {object} state — app state slice { params, look, enhanceMode }
   * @param {string} [name]
   * @returns {{ ok:boolean, item?:object, error?:string }}
   */
  function save(state, name) {
    var items = loadAll();
    if (items.length >= MAX_LOOKS) {
      return { ok: false, error: 'Limit ' + MAX_LOOKS + ' saved looks' };
    }
    var item = snapshotFromState(state, name);
    items.push(item);
    if (!saveAll(items)) {
      return { ok: false, error: 'Could not save (storage full?)' };
    }
    return { ok: true, item: item };
  }

  function remove(id) {
    var items = loadAll().filter(function (it) {
      return it.id !== id;
    });
    return saveAll(items);
  }

  function rename(id, name) {
    var items = loadAll();
    var n = (name && String(name).trim()) || '';
    if (!n) return false;
    for (var i = 0; i < items.length; i++) {
      if (items[i].id === id) {
        items[i].name = n.slice(0, 40);
        return saveAll(items);
      }
    }
    return false;
  }

  global.HermionaUserPresets = {
    list: list,
    get: get,
    save: save,
    remove: remove,
    rename: rename,
    PARAM_KEYS: PARAM_KEYS.slice(),
    MAX_LOOKS: MAX_LOOKS,
    STORAGE_KEY: STORAGE_KEY
  };
})(typeof window !== 'undefined' ? window : globalThis);
