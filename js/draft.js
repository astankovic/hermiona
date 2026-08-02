/**
 * Hermione — session draft (IndexedDB, on-device)
 * Exposes window.HermioneDraft
 *
 * Saves photo + edit state so refresh can resume. No cloud.
 * One slot only (latest edit).
 */
(function (global) {
  'use strict';

  var DB_NAME = 'hermione-draft';
  var DB_VER = 1;
  var STORE = 'drafts';
  var KEY = 'latest';
  var META_VERSION = 1;

  function openDb() {
    return new Promise(function (resolve, reject) {
      if (!global.indexedDB) {
        reject(new Error('IndexedDB unavailable'));
        return;
      }
      var req = global.indexedDB.open(DB_NAME, DB_VER);
      req.onerror = function () {
        reject(req.error || new Error('IDB open failed'));
      };
      req.onsuccess = function () {
        resolve(req.result);
      };
      req.onupgradeneeded = function (ev) {
        var db = ev.target.result;
        if (!db.objectStoreNames.contains(STORE)) {
          db.createObjectStore(STORE);
        }
      };
    });
  }

  function idbReq(req) {
    return new Promise(function (resolve, reject) {
      req.onsuccess = function () {
        resolve(req.result);
      };
      req.onerror = function () {
        reject(req.error);
      };
    });
  }

  /**
   * @param {{
   *   blob: Blob,
   *   fileName?: string,
   *   params: object,
   *   look: object,
   *   ops: array,
   *   enhanceMode?: string|null,
   *   optics?: object,
   *   userLookId?: string|null
   * }} payload
   */
  function save(payload) {
    if (!payload || !payload.blob) {
      return Promise.reject(new Error('No image blob'));
    }
    var record = {
      key: KEY,
      version: META_VERSION,
      savedAt: Date.now(),
      fileName: payload.fileName || 'photo.jpg',
      mime: payload.blob.type || 'image/jpeg',
      blob: payload.blob,
      params: payload.params || {},
      look: payload.look || {},
      ops: payload.ops || [],
      enhanceMode: payload.enhanceMode != null ? payload.enhanceMode : null,
      optics: payload.optics || null,
      userLookId: payload.userLookId || null
    };

    return openDb().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(STORE, 'readwrite');
        tx.oncomplete = function () {
          db.close();
          resolve(true);
        };
        tx.onerror = function () {
          db.close();
          reject(tx.error);
        };
        tx.objectStore(STORE).put(record, KEY);
      });
    });
  }

  /** @returns {Promise<object|null>} */
  function load() {
    return openDb()
      .then(function (db) {
        return new Promise(function (resolve, reject) {
          var tx = db.transaction(STORE, 'readonly');
          var req = tx.objectStore(STORE).get(KEY);
          req.onsuccess = function () {
            db.close();
            resolve(req.result || null);
          };
          req.onerror = function () {
            db.close();
            reject(req.error);
          };
        });
      })
      .catch(function () {
        return null;
      });
  }

  /** Meta only for banner (no blob copy if we can) — still returns full record */
  function peek() {
    return load();
  }

  function clear() {
    return openDb()
      .then(function (db) {
        return new Promise(function (resolve, reject) {
          var tx = db.transaction(STORE, 'readwrite');
          tx.oncomplete = function () {
            db.close();
            resolve(true);
          };
          tx.onerror = function () {
            db.close();
            reject(tx.error);
          };
          tx.objectStore(STORE).delete(KEY);
        });
      })
      .catch(function () {
        return false;
      });
  }

  /**
   * Encode HTMLImageElement or canvas to JPEG Blob.
   * @param {HTMLImageElement|HTMLCanvasElement} source
   * @param {number} [maxLong=2400]
   * @param {number} [quality=0.9]
   */
  function blobFromImage(source, maxLong, quality) {
    maxLong = maxLong || 2400;
    quality = quality != null ? quality : 0.9;
    return new Promise(function (resolve, reject) {
      try {
        var w = source.naturalWidth || source.width;
        var h = source.naturalHeight || source.height;
        if (!w || !h) {
          reject(new Error('Empty image'));
          return;
        }
        var long = Math.max(w, h);
        var scale = long > maxLong ? maxLong / long : 1;
        var cw = Math.max(1, Math.round(w * scale));
        var ch = Math.max(1, Math.round(h * scale));
        var c = document.createElement('canvas');
        c.width = cw;
        c.height = ch;
        var ctx = c.getContext('2d');
        ctx.drawImage(source, 0, 0, cw, ch);
        if (c.toBlob) {
          c.toBlob(
            function (blob) {
              if (!blob) reject(new Error('toBlob failed'));
              else resolve(blob);
            },
            'image/jpeg',
            quality
          );
        } else {
          var dataUrl = c.toDataURL('image/jpeg', quality);
          var parts = dataUrl.split(',');
          var bin = atob(parts[1]);
          var arr = new Uint8Array(bin.length);
          for (var i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
          resolve(new Blob([arr], { type: 'image/jpeg' }));
        }
      } catch (e) {
        reject(e);
      }
    });
  }

  function formatAge(savedAt) {
    if (!savedAt) return '';
    var mins = Math.round((Date.now() - savedAt) / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return mins + 'm ago';
    var hrs = Math.round(mins / 60);
    if (hrs < 48) return hrs + 'h ago';
    return Math.round(hrs / 24) + 'd ago';
  }

  global.HermioneDraft = {
    save: save,
    load: load,
    peek: peek,
    clear: clear,
    blobFromImage: blobFromImage,
    formatAge: formatAge,
    KEY: KEY
  };
})(typeof window !== 'undefined' ? window : globalThis);
