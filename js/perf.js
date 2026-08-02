/**
 * Hermiona — lightweight performance marks (G0)
 * Enable: ?perf=1 or localStorage hermiona.perf=1
 * Exposes window.HermionaPerf
 */
(function (global) {
  'use strict';

  var enabled = false;
  try {
    var q = new URLSearchParams(global.location && global.location.search);
    if (q.get('perf') === '1' || q.get('perf') === 'true') enabled = true;
    if (global.localStorage && global.localStorage.getItem('hermiona.perf') === '1') {
      enabled = true;
    }
  } catch (e) {
    /* ignore */
  }

  var last = null;
  var marks = [];

  function now() {
    return global.performance && performance.now ? performance.now() : Date.now();
  }

  function mark(name) {
    if (!enabled) return;
    var t = now();
    if (global.performance && performance.mark) {
      try {
        performance.mark('h:' + name);
      } catch (e) {
        /* ignore */
      }
    }
    marks.push({ name: name, t: t });
  }

  function start(label) {
    if (!enabled) return { end: function () {} };
    var t0 = now();
    var name = label || 'op';
    mark(name + ':start');
    return {
      end: function (extra) {
        var dt = now() - t0;
        mark(name + ':end');
        last = { label: name, ms: Math.round(dt * 10) / 10, extra: extra || null };
        if (global.console && console.debug) {
          console.debug(
            '[Hermiona perf]',
            name,
            last.ms + 'ms',
            extra || ''
          );
        }
        return last;
      }
    };
  }

  function measure(label, fn) {
    var s = start(label);
    var out = fn();
    s.end();
    return out;
  }

  function getLast() {
    return last;
  }

  function isEnabled() {
    return enabled;
  }

  function setEnabled(on) {
    enabled = !!on;
    try {
      if (global.localStorage) {
        if (enabled) localStorage.setItem('hermiona.perf', '1');
        else localStorage.removeItem('hermiona.perf');
      }
    } catch (e) {
      /* ignore */
    }
  }

  global.HermionaPerf = {
    mark: mark,
    start: start,
    measure: measure,
    getLast: getLast,
    isEnabled: isEnabled,
    setEnabled: setEnabled
  };
})(typeof window !== 'undefined' ? window : self);
