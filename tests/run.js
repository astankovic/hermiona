/**
 * Hermione P0-TEST — browser smoke tests (zero deps)
 * Expects HermioneEngine / HermioneExport globals from scripts loaded by index.html
 */
(function () {
  'use strict';

  var results = [];
  var passCount = 0;
  var failCount = 0;

  function assert(cond, msg) {
    if (cond) {
      results.push({ ok: true, msg: msg });
      passCount++;
    } else {
      results.push({ ok: false, msg: msg });
      failCount++;
    }
  }

  function assertClose(a, b, eps, msg) {
    var ok = Math.abs(a - b) <= eps;
    if (ok) {
      results.push({ ok: true, msg: msg + ' (' + a + ' ≈ ' + b + ' ±' + eps + ')' });
      passCount++;
    } else {
      results.push({
        ok: false,
        msg: msg + ' (got ' + a + ', expected ' + b + ' ±' + eps + ')'
      });
      failCount++;
    }
  }

  /** Neutral params matching app.js state.params defaults (all zeros). */
  function neutralParams() {
    return {
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
  }

  function solidGrayImageData(w, h, gray) {
    var data = new Uint8ClampedArray(w * h * 4);
    for (var i = 0; i < data.length; i += 4) {
      data[i] = gray;
      data[i + 1] = gray;
      data[i + 2] = gray;
      data[i + 3] = 255;
    }
    return new ImageData(data, w, h);
  }

  function meanRGB(imageData) {
    var d = imageData.data;
    var n = d.length / 4;
    var sr = 0;
    var sg = 0;
    var sb = 0;
    for (var i = 0; i < d.length; i += 4) {
      sr += d[i];
      sg += d[i + 1];
      sb += d[i + 2];
    }
    return { r: sr / n, g: sg / n, b: sb / n };
  }

  function meanLuma(imageData) {
    var m = meanRGB(imageData);
    return 0.2126 * m.r + 0.7152 * m.g + 0.0722 * m.b;
  }

  function makeCanvas(w, h, fill) {
    var c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    var ctx = c.getContext('2d');
    if (fill) {
      ctx.fillStyle = fill;
      ctx.fillRect(0, 0, w, h);
    }
    return c;
  }

  // ——— Tests ———

  function engine() {
    return typeof HermioneEngine !== 'undefined' ? HermioneEngine : null;
  }

  function testEngineExists() {
    var Engine = engine();
    assert(Engine != null && typeof Engine === 'object', 'HermioneEngine exists');
    assert(
      Engine != null && typeof Engine.process === 'function',
      'HermioneEngine.process is a function'
    );
  }

  function testNeutralPassthrough() {
    var Engine = engine();
    if (!Engine || !Engine.process) {
      assert(false, 'neutral process: HermioneEngine.process unavailable');
      return;
    }
    var src = solidGrayImageData(64, 64, 128);
    var out = Engine.process(src, neutralParams(), { grain: false });
    assert(out != null, 'process(neutral) returns ImageData');
    if (!out) return;
    var m = meanRGB(out);
    assertClose(m.r, 128, 3, 'neutral process mean R stays ~128');
    assertClose(m.g, 128, 3, 'neutral process mean G stays ~128');
    assertClose(m.b, 128, 3, 'neutral process mean B stays ~128');
  }

  function testExposureRaisesLuma() {
    var Engine = engine();
    if (!Engine || !Engine.process) {
      assert(false, 'exposure test: HermioneEngine.process unavailable');
      return;
    }
    var src = solidGrayImageData(64, 64, 128);
    var base = Engine.process(src, neutralParams(), { grain: false });
    var brightParams = neutralParams();
    brightParams.exposure = 1; // +1 EV → ×2 linear
    var bright = Engine.process(src, brightParams, { grain: false });
    assert(base != null && bright != null, 'exposure test: both process calls return data');
    if (!base || !bright) return;
    var lumaBase = meanLuma(base);
    var lumaBright = meanLuma(bright);
    assert(
      lumaBright > lumaBase + 10,
      'positive exposure increases mean luma (' +
        lumaBase.toFixed(1) +
        ' → ' +
        lumaBright.toFixed(1) +
        ')'
    );
  }

  function testProcessPreservesSize() {
    var Engine = engine();
    if (!Engine || !Engine.process) {
      assert(false, 'size test: HermioneEngine.process unavailable');
      return;
    }
    var src = solidGrayImageData(64, 48, 100);
    var out = Engine.process(src, neutralParams(), { grain: false });
    assert(out != null, 'process returns data for size check');
    if (!out) return;
    assert(out.width === 64, 'process preserves width (64)');
    assert(out.height === 48, 'process preserves height (48)');
  }

  function testExportWorking() {
    if (typeof HermioneExport === 'undefined' || !HermioneExport.buildExportCanvas) {
      results.push({
        ok: true,
        msg: 'HermioneExport.buildExportCanvas not present — skipped'
      });
      passCount++;
      return;
    }
    var src = solidGrayImageData(32, 24, 128);
    var threw = null;
    var result = null;
    try {
      result = HermioneExport.buildExportCanvas({
        size: 'working',
        format: 'jpeg',
        quality: 0.9,
        workingData: src,
        workingCanvas: null,
        originalImage: null,
        ops: [],
        params: neutralParams(),
        look: null,
        maxWorkingSize: 1600
      });
    } catch (e) {
      threw = e;
    }
    assert(
      threw === null,
      'buildExportCanvas(working) does not throw' + (threw ? ': ' + threw.message : '')
    );
    if (result) {
      assert(result.width === 32, 'export working width matches (32)');
      assert(result.height === 24, 'export working height matches (24)');
      assert(!!result.canvas, 'export returns a canvas');
    }
  }

  function testScaleCanvasToLongEdge() {
    var Engine = engine();
    if (!Engine || typeof Engine.scaleCanvasToLongEdge !== 'function') {
      results.push({
        ok: true,
        msg: 'scaleCanvasToLongEdge not public — skipped'
      });
      passCount++;
      return;
    }
    var src = makeCanvas(200, 100, '#808080');
    var scaled = Engine.scaleCanvasToLongEdge(src, 100);
    assert(scaled != null, 'scaleCanvasToLongEdge returns a canvas');
    if (!scaled) return;
    assert(scaled.width === 100, 'scale down: long edge width becomes 100');
    assert(scaled.height === 50, 'scale down: height becomes 50');

    // Never upscales
    var small = makeCanvas(40, 30, '#404040');
    var same = Engine.scaleCanvasToLongEdge(small, 200);
    assert(same.width === 40 && same.height === 30, 'scaleCanvasToLongEdge never upscales');
  }

  /**
   * @returns {boolean} true if final render is deferred (async image load)
   */
  function testRebuildGeometryNoOp() {
    var Engine = engine();
    if (!Engine || typeof Engine.rebuildGeometry !== 'function') {
      results.push({
        ok: true,
        msg: 'rebuildGeometry not public — skipped'
      });
      passCount++;
      return false;
    }
    // Synthetic drawable via canvas → data URL image
    var c = makeCanvas(80, 60, '#aabbcc');
    var img = new Image();
    img.src = c.toDataURL('image/png');

    function runWhenReady() {
      try {
        var rebuilt = Engine.rebuildGeometry(img, [], 0);
        assert(rebuilt != null, 'rebuildGeometry([], empty ops) returns canvas');
        if (rebuilt) {
          assert(rebuilt.width === 80, 'rebuild no-op preserves width');
          assert(rebuilt.height === 60, 'rebuild no-op preserves height');
        }
      } catch (e) {
        assert(false, 'rebuildGeometry threw: ' + (e && e.message ? e.message : e));
      }
      render();
    }

    if (img.complete && img.naturalWidth > 0) {
      runWhenReady();
      return true;
    }
    img.onload = runWhenReady;
    img.onerror = function () {
      assert(false, 'rebuildGeometry test: failed to load synthetic image');
      render();
    };
    return true;
  }

  function render() {
    var el = document.getElementById('results');
    if (!el) return;
    var lines = [];
    lines.push(
      '<div class="summary ' +
        (failCount === 0 ? 'pass' : 'fail') +
        '">' +
        passCount +
        ' passed, ' +
        failCount +
        ' failed</div>'
    );
    lines.push('<ul class="list">');
    for (var i = 0; i < results.length; i++) {
      var r = results[i];
      lines.push(
        '<li class="' +
          (r.ok ? 'ok' : 'bad') +
          '">' +
          (r.ok ? '✓' : '✗') +
          ' ' +
          escapeHtml(r.msg) +
          '</li>'
      );
    }
    lines.push('</ul>');
    el.innerHTML = lines.join('');
    document.title =
      (failCount === 0 ? 'PASS' : 'FAIL') +
      ' — Hermione tests (' +
      passCount +
      '/' +
      (passCount + failCount) +
      ')';
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function run() {
    try {
      testEngineExists();
      testNeutralPassthrough();
      testExposureRaisesLuma();
      testProcessPreservesSize();
      testExportWorking();
      testScaleCanvasToLongEdge();
      // rebuildGeometry is async (image load); render called from its completion
      var asyncPending = testRebuildGeometryNoOp();
      if (!asyncPending) render();
    } catch (e) {
      assert(false, 'runner threw: ' + (e && e.message ? e.message : e));
      render();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run);
  } else {
    run();
  }
})();
