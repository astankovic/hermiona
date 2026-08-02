/**
 * Hermione error reporting — ring buffer + recoverable banner
 * Exposes window.HermioneErrors
 */
(function (global) {
  'use strict';

  var LOG_MAX = 20;
  var log = [];
  var styleInjected = false;
  var bannerEl = null;
  var hideTimer = null;

  function pushLog(entry) {
    log.push(entry);
    if (log.length > LOG_MAX) log.shift();
  }

  /**
   * @param {*} error
   * @param {string} [context]
   */
  function report(error, context) {
    var message =
      error && error.message
        ? String(error.message)
        : error != null
          ? String(error)
          : 'Unknown error';
    var entry = {
      t: Date.now(),
      message: message,
      context: context || ''
    };
    pushLog(entry);
    if (context) {
      console.error('[Hermione]', context, error);
    } else {
      console.error('[Hermione]', error);
    }
  }

  /**
   * @returns {Array<{t:number,message:string,context:string}>}
   */
  function getLog() {
    return log.slice();
  }

  function ensureStyle() {
    if (styleInjected || typeof document === 'undefined') return;
    styleInjected = true;
    var style = document.createElement('style');
    style.id = 'hermione-error-banner-style';
    style.textContent =
      '#errorBanner{' +
      'position:fixed;left:12px;right:12px;bottom:calc(12px + env(safe-area-inset-bottom,0px));' +
      'z-index:10050;padding:12px 14px;border-radius:12px;' +
      'font:600 13px/1.35 -apple-system,BlinkMacSystemFont,system-ui,sans-serif;' +
      'color:#fff;background:rgba(28,28,30,0.94);border:1px solid rgba(255,255,255,0.12);' +
      'box-shadow:0 8px 28px rgba(0,0,0,0.45);backdrop-filter:blur(12px);' +
      '-webkit-backdrop-filter:blur(12px);display:none;pointer-events:auto;' +
      'max-width:520px;margin:0 auto;word-break:break-word;' +
      '}' +
      '#errorBanner[data-tone="error"]{background:rgba(120,20,30,0.94);border-color:rgba(255,80,100,0.35)}' +
      '#errorBanner[data-tone="info"]{background:rgba(20,40,80,0.94);border-color:rgba(100,160,255,0.35)}' +
      '#errorBanner.is-visible{display:block}';
    (document.head || document.documentElement).appendChild(style);
  }

  function ensureBanner() {
    if (bannerEl || typeof document === 'undefined') return bannerEl;
    ensureStyle();
    bannerEl = document.getElementById('errorBanner');
    if (!bannerEl) {
      bannerEl = document.createElement('div');
      bannerEl.id = 'errorBanner';
      bannerEl.setAttribute('role', 'alert');
      bannerEl.setAttribute('aria-live', 'assertive');
      document.body.appendChild(bannerEl);
    }
    return bannerEl;
  }

  /**
   * @param {string} message
   * @param {{tone?: 'error'|'info', timeoutMs?: number}} [opts]
   */
  function showBanner(message, opts) {
    opts = opts || {};
    var el = ensureBanner();
    if (!el) return;
    el.textContent = message || 'Something went wrong';
    el.setAttribute('data-tone', opts.tone === 'info' ? 'info' : 'error');
    el.classList.add('is-visible');
    if (hideTimer) {
      clearTimeout(hideTimer);
      hideTimer = null;
    }
    var ms = opts.timeoutMs;
    if (ms == null) ms = 5000;
    if (ms > 0) {
      hideTimer = setTimeout(function () {
        hideBanner();
      }, ms);
    }
  }

  function hideBanner() {
    if (hideTimer) {
      clearTimeout(hideTimer);
      hideTimer = null;
    }
    if (bannerEl) {
      bannerEl.classList.remove('is-visible');
    }
  }

  function installGlobalHandlers() {
    if (typeof window === 'undefined') return;
    if (window.__hermioneErrorsInstalled) return;
    window.__hermioneErrorsInstalled = true;

    var prevOnError = window.onerror;
    window.onerror = function (message, source, lineno, colno, error) {
      report(error || message, 'window.onerror' + (source ? ' @ ' + source + ':' + lineno : ''));
      try {
        showBanner('Something went wrong — you can keep editing.', { tone: 'error', timeoutMs: 6000 });
      } catch (_) { /* ignore */ }
      if (typeof prevOnError === 'function') {
        try {
          return prevOnError.apply(this, arguments);
        } catch (_) { /* ignore */ }
      }
      return false;
    };

    window.addEventListener('unhandledrejection', function (ev) {
      var reason = ev && ev.reason != null ? ev.reason : 'Unhandled promise rejection';
      report(reason, 'unhandledrejection');
      try {
        showBanner('Something went wrong — you can keep editing.', { tone: 'error', timeoutMs: 6000 });
      } catch (_) { /* ignore */ }
    });
  }

  global.HermioneErrors = {
    report: report,
    getLog: getLog,
    installGlobalHandlers: installGlobalHandlers,
    showBanner: showBanner,
    hideBanner: hideBanner
  };

  installGlobalHandlers();
})(typeof window !== 'undefined' ? window : globalThis);
