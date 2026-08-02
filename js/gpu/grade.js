/**
 * Hermiona G2 — WebGL2 GPU grade (light/color + film curves)
 * Exposes window.HermionaGpuGrade
 *
 * apply(data, w, h, params, film?, filmIntensity?) → boolean
 * Falls back silently; caller uses CPU on false.
 */
(function (global) {
  'use strict';

  var gl = null;
  var canvas = null;
  var program = null;
  var vao = null;
  var texImage = null;
  var texLut = null;
  var fbo = null;
  var failed = false;
  var maxTex = 0;
  var uni = {};

  var VS = [
    '#version 300 es',
    'layout(location=0) in vec2 aPos;',
    'out vec2 vUv;',
    'void main(){',
    '  vUv = aPos * 0.5 + 0.5;',
    '  gl_Position = vec4(aPos, 0.0, 1.0);',
    '}'
  ].join('\n');

  // Matches engine.js grade + looks.applyFilm core (no grain)
  var FS = [
    '#version 300 es',
    'precision highp float;',
    'in vec2 vUv;',
    'out vec4 outColor;',
    'uniform sampler2D uImage;',
    'uniform sampler2D uLut; // 256x1 RGB LUTs',
    'uniform float uExp;',
    'uniform float uContrast;',
    'uniform float uSat;',
    'uniform float uVib;',
    'uniform float uTemp;',
    'uniform float uTint;',
    'uniform float uHi;',
    'uniform float uSh;',
    'uniform float uWh;',
    'uniform float uBl;',
    'uniform float uFilmT;',
    'uniform float uFilmSat;',
    'uniform float uFilmContrast;',
    'uniform float uWarmth;',
    'uniform float uFade;',
    'uniform float uGreenShadow;',
    'uniform float uCoolLift;',
    'uniform float uMagenta;',
    'uniform float uHalation;',
    'uniform float uMono;',
    'uniform float uUseLut;',

    'float luma(vec3 c){ return dot(c, vec3(0.2126, 0.7152, 0.0722)); }',

    'vec3 applyGrade(vec3 c){',
    '  c *= uExp;',
    '  c = (c - 0.5) * uContrast + 0.5;',
    '  float L = luma(c);',
    '  if (uSh != 0.0 && L < 0.5) {',
    '    float a = uSh * (1.0 - L * 2.0);',
    '    c += a * 0.35;',
    '  }',
    '  if (uHi != 0.0 && L > 0.5) {',
    '    float a = uHi * ((L - 0.5) * 2.0);',
    '    c -= a * 0.25;',
    '  }',
    '  L = luma(c);',
    '  if (uWh != 0.0) {',
    '    float t = max(0.0, (L - 0.7) / 0.3);',
    '    c = mix(c, c + uWh * 0.3, t);',
    '  }',
    '  if (uBl != 0.0) {',
    '    float t = max(0.0, (0.3 - L) / 0.3);',
    '    c = mix(c, c + uBl * 0.25, t);',
    '  }',
    '  if (uTemp != 0.0) { c.r += uTemp * 0.15; c.b -= uTemp * 0.15; }',
    '  if (uTint != 0.0) { c.g += uTint * 0.12; c.r -= uTint * 0.04; c.b -= uTint * 0.04; }',
    '  if (uSat != 1.0) {',
    '    float g = luma(c);',
    '    c = g + (c - g) * uSat;',
    '  }',
    '  if (uVib != 0.0) {',
    '    float mx = max(c.r, max(c.g, c.b));',
    '    float mn = min(c.r, min(c.g, c.b));',
    '    float satLevel = mx == 0.0 ? 0.0 : (mx - mn) / mx;',
    '    float amount = uVib * (1.0 - satLevel);',
    '    float g = luma(c);',
    '    c = g + (c - g) * (1.0 + amount);',
    '  }',
    '  return c;',
    '}',

    'vec3 sampleLut(vec3 c255){',
    '  // LUT: x = channel/255, y = 0.5',
    '  float r = texture(uLut, vec2((c255.r + 0.5) / 256.0, 0.5)).r * 255.0;',
    '  float g = texture(uLut, vec2((c255.g + 0.5) / 256.0, 0.5)).g * 255.0;',
    '  float b = texture(uLut, vec2((c255.b + 0.5) / 256.0, 0.5)).b * 255.0;',
    '  return vec3(r, g, b);',
    '}',

    'vec3 applyFilm(vec3 c01){',
    '  float t = uFilmT;',
    '  if (t <= 0.0) return c01;',
    '  vec3 c255 = clamp(c01, 0.0, 1.0) * 255.0;',
    '  if (uUseLut > 0.5) {',
    '    vec3 lut = sampleLut(c255);',
    '    c255 = mix(c255, lut, t);',
    '  }',
    '  vec3 c = c255 / 255.0;',
    '  if (uFilmContrast != 1.0) {',
    '    c = (c - 0.5) * uFilmContrast + 0.5;',
    '  }',
    '  float g = luma(c);',
    '  if (uMono > 0.5) {',
    '    c = vec3(g * (1.0 + 0.02 * t), g, g * (1.0 - 0.02 * t));',
    '  } else if (uFilmSat != 1.0) {',
    '    c = g + (c - g) * uFilmSat;',
    '  }',
    '  if (uWarmth != 0.0) { c.r += uWarmth * 0.12; c.b -= uWarmth * 0.1; }',
    '  g = luma(c);',
    '  if (uGreenShadow != 0.0 && g < 0.45) {',
    '    float a = uGreenShadow * (1.0 - g / 0.45);',
    '    c.g += a * 0.1; c.b += a * 0.04;',
    '  }',
    '  if (uCoolLift != 0.0) { c.b += uCoolLift * 0.08; c.g += uCoolLift * 0.02; }',
    '  if (uMagenta != 0.0) {',
    '    c.r += uMagenta * 0.06; c.b += uMagenta * 0.05; c.g -= uMagenta * 0.03;',
    '  }',
    '  if (uFade > 0.0) {',
    '    float f = uFade;',
    '    c = mix(c, vec3(1.0), f * 0.08) * (1.0 - f * 0.05) + vec3(f * 0.12, f * 0.11, f * 0.1);',
    '    c = c * (1.0 - f * 0.15) + vec3(f * 0.12, f * 0.11, f * 0.1);',
    '  }',
    '  if (uHalation > 0.0) {',
    '    float L = luma(c);',
    '    if (L > 0.55) {',
    '      float a = ((L - 0.55) / 0.45) * uHalation;',
    '      c.r = min(c.r + a * 0.35, 1.2);',
    '      c.g = min(c.g + a * 0.08, 1.2);',
    '      c.b = max(c.b - a * 0.05, 0.0);',
    '    }',
    '  }',
    '  return c;',
    '}',

    'void main(){',
    '  // ImageData upload is top-left origin; flip Y for GL',
    '  vec2 uv = vec2(vUv.x, 1.0 - vUv.y);',
    '  vec4 texel = texture(uImage, uv);',
    '  vec3 c = applyGrade(texel.rgb);',
    '  c = applyFilm(c);',
    '  outColor = vec4(clamp(c, 0.0, 1.0), 1.0);',
    '}'
  ].join('\n');

  function compile(type, src) {
    var s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      var log = gl.getShaderInfoLog(s);
      gl.deleteShader(s);
      throw new Error(log || 'shader compile failed');
    }
    return s;
  }

  function ensure() {
    if (failed) return false;
    if (gl && program) return true;
    try {
      canvas = document.createElement('canvas');
      gl = canvas.getContext('webgl2', {
        alpha: false,
        depth: false,
        antialias: false,
        premultipliedAlpha: false,
        preserveDrawingBuffer: true
      });
      if (!gl) {
        failed = true;
        return false;
      }
      maxTex = gl.getParameter(gl.MAX_TEXTURE_SIZE) || 4096;

      var vs = compile(gl.VERTEX_SHADER, VS);
      var fs = compile(gl.FRAGMENT_SHADER, FS);
      program = gl.createProgram();
      gl.attachShader(program, vs);
      gl.attachShader(program, fs);
      gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        throw new Error(gl.getProgramInfoLog(program) || 'link failed');
      }
      gl.useProgram(program);

      // Fullscreen triangle via clip-space quad
      var buf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(
        gl.ARRAY_BUFFER,
        new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
        gl.STATIC_DRAW
      );
      vao = gl.createVertexArray();
      gl.bindVertexArray(vao);
      gl.enableVertexAttribArray(0);
      gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

      texImage = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, texImage);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

      texLut = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, texLut);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      // identity LUT default
      var idLut = new Uint8Array(256 * 4);
      for (var i = 0; i < 256; i++) {
        idLut[i * 4] = i;
        idLut[i * 4 + 1] = i;
        idLut[i * 4 + 2] = i;
        idLut[i * 4 + 3] = 255;
      }
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA,
        256,
        1,
        0,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        idLut
      );

      fbo = gl.createFramebuffer();

      function U(name) {
        uni[name] = gl.getUniformLocation(program, name);
      }
      [
        'uImage',
        'uLut',
        'uExp',
        'uContrast',
        'uSat',
        'uVib',
        'uTemp',
        'uTint',
        'uHi',
        'uSh',
        'uWh',
        'uBl',
        'uFilmT',
        'uFilmSat',
        'uFilmContrast',
        'uWarmth',
        'uFade',
        'uGreenShadow',
        'uCoolLift',
        'uMagenta',
        'uHalation',
        'uMono',
        'uUseLut'
      ].forEach(U);

      gl.uniform1i(uni.uImage, 0);
      gl.uniform1i(uni.uLut, 1);

      return true;
    } catch (e) {
      console.warn('[HermionaGpuGrade] init failed', e);
      failed = true;
      gl = null;
      return false;
    }
  }

  function isAvailable() {
    if (failed) return false;
    return ensure();
  }

  function uploadLut(luts) {
    var rgba = new Uint8Array(256 * 4);
    for (var i = 0; i < 256; i++) {
      rgba[i * 4] = luts ? luts.r[i] : i;
      rgba[i * 4 + 1] = luts ? luts.g[i] : i;
      rgba[i * 4 + 2] = luts ? luts.b[i] : i;
      rgba[i * 4 + 3] = 255;
    }
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, texLut);
    gl.texSubImage2D(
      gl.TEXTURE_2D,
      0,
      0,
      0,
      256,
      1,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      rgba
    );
  }

  /**
   * @param {Uint8ClampedArray} data
   * @param {number} w
   * @param {number} h
   * @param {object} p params
   * @param {object|null} film
   * @param {number} filmIntensity 0..1
   * @returns {boolean}
   */
  function apply(data, w, h, p, film, filmIntensity) {
    if (!data || !w || !h) return false;
    if (w > maxTex || h > maxTex) return false;
    if (!ensure()) return false;

    p = p || {};
    var exp = Math.pow(2, p.exposure || 0);
    var contrast = ((p.contrast || 0) + 100) / 100;
    var sat = ((p.saturation || 0) + 100) / 100;
    var vib = (p.vibrance || 0) / 100;
    var temp = (p.temperature || 0) / 100;
    var tintVal = (p.tint || 0) / 100;
    var hi = (p.highlights || 0) / 100;
    var sh = (p.shadows || 0) / 100;
    var wh = (p.whites || 0) / 100;
    var bl = (p.blacks || 0) / 100;

    var t = film && film.id !== 'none' ? Math.max(0, Math.min(1, filmIntensity || 0)) : 0;
    var luts = null;
    var Looks = global.HermionaLooks;
    if (t > 0 && Looks && Looks.filmById && film) {
      // Prefer cached LUTs via getFilm — use public build if available
      if (typeof Looks.getFilmLUTs === 'function') {
        luts = Looks.getFilmLUTs(film);
      }
    }

    try {
      canvas.width = w;
      canvas.height = h;
      gl.viewport(0, 0, w, h);
      gl.useProgram(program);
      gl.bindVertexArray(vao);

      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, texImage);
      // UNPACK flip not needed — shader flips V
      gl.pixelStorei(gl.UNPACK_ALIGNMENT, 4);
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA,
        w,
        h,
        0,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        data
      );

      if (t > 0 && luts) {
        uploadLut(luts);
        gl.uniform1f(uni.uUseLut, 1);
      } else {
        uploadLut(null);
        gl.uniform1f(uni.uUseLut, 0);
      }

      gl.uniform1f(uni.uExp, exp);
      gl.uniform1f(uni.uContrast, contrast);
      gl.uniform1f(uni.uSat, sat);
      gl.uniform1f(uni.uVib, vib);
      gl.uniform1f(uni.uTemp, temp);
      gl.uniform1f(uni.uTint, tintVal);
      gl.uniform1f(uni.uHi, hi);
      gl.uniform1f(uni.uSh, sh);
      gl.uniform1f(uni.uWh, wh);
      gl.uniform1f(uni.uBl, bl);

      gl.uniform1f(uni.uFilmT, t);
      if (t > 0 && film) {
        gl.uniform1f(uni.uFilmSat, 1 + (film.sat || 0) * t);
        gl.uniform1f(uni.uFilmContrast, 1 + (film.contrast || 0) * t);
        gl.uniform1f(uni.uWarmth, (film.warmth || 0) * t);
        gl.uniform1f(uni.uFade, (film.fade || 0) * t);
        gl.uniform1f(uni.uGreenShadow, (film.greenShadow || 0) * t);
        gl.uniform1f(uni.uCoolLift, (film.coolLift || 0) * t);
        gl.uniform1f(uni.uMagenta, (film.magentaShift || 0) * t);
        gl.uniform1f(uni.uHalation, (film.halation || 0) * t);
        gl.uniform1f(
          uni.uMono,
          film.mono || film.sat === -1 ? 1 : 0
        );
      } else {
        gl.uniform1f(uni.uFilmSat, 1);
        gl.uniform1f(uni.uFilmContrast, 1);
        gl.uniform1f(uni.uWarmth, 0);
        gl.uniform1f(uni.uFade, 0);
        gl.uniform1f(uni.uGreenShadow, 0);
        gl.uniform1f(uni.uCoolLift, 0);
        gl.uniform1f(uni.uMagenta, 0);
        gl.uniform1f(uni.uHalation, 0);
        gl.uniform1f(uni.uMono, 0);
      }

      // Draw to default framebuffer of our canvas
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

      // Read back (bottom-up in GL → flip rows into data)
      var pixels = new Uint8Array(w * h * 4);
      gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
      // Flip Y into ImageData orientation
      for (var y = 0; y < h; y++) {
        var srcRow = (h - 1 - y) * w * 4;
        var dstRow = y * w * 4;
        data.set(pixels.subarray(srcRow, srcRow + w * 4), dstRow);
      }
      return true;
    } catch (e) {
      console.warn('[HermionaGpuGrade] apply failed', e);
      return false;
    }
  }

  global.HermionaGpuGrade = {
    isAvailable: isAvailable,
    apply: apply,
    // for tests / debug
    _failed: function () {
      return failed;
    }
  };
})(typeof window !== 'undefined' ? window : globalThis);
