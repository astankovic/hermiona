/**
 * Hermione G3 — WebGL2 DoF (dual-level blur + CoC mix)
 * Exposes window.HermioneGpuDoF
 *
 * apply(data, w, h, coc, opts) → boolean
 * Matches CPU layered DoF intent; bokeh stamps stay on CPU after.
 */
(function (global) {
  'use strict';

  var gl = null;
  var canvas = null;
  var failed = false;
  var maxTex = 0;

  var progBlur = null;
  var progComp = null;
  var vao = null;
  var quadBuf = null;

  var texSrc = null;
  var texCoc = null;
  var texPing = null;
  var texPong = null;
  var texBlur1 = null;
  var texBlur2 = null;
  var fbo = null;

  var blurUni = {};
  var compUni = {};

  var VS = [
    '#version 300 es',
    'layout(location=0) in vec2 aPos;',
    'out vec2 vUv;',
    'void main(){',
    '  vUv = aPos * 0.5 + 0.5;',
    '  gl_Position = vec4(aPos, 0.0, 1.0);',
    '}'
  ].join('\n');

  // Separable Gaussian-ish (9-tap) in one direction
  var FS_BLUR = [
    '#version 300 es',
    'precision highp float;',
    'in vec2 vUv;',
    'out vec4 outColor;',
    'uniform sampler2D uTex;',
    'uniform vec2 uDir; // pixel step in UV',
    'uniform float uRadius; // blur scale',
    'void main(){',
    '  // 9-tap weights ~ gaussian',
    '  float w0 = 0.227027;',
    '  float w1 = 0.1945946;',
    '  float w2 = 0.1216216;',
    '  float w3 = 0.054054;',
    '  float w4 = 0.016216;',
    '  vec2 d = uDir * uRadius;',
    '  vec3 c = texture(uTex, vUv).rgb * w0;',
    '  c += texture(uTex, vUv + d * 1.0).rgb * w1;',
    '  c += texture(uTex, vUv - d * 1.0).rgb * w1;',
    '  c += texture(uTex, vUv + d * 2.0).rgb * w2;',
    '  c += texture(uTex, vUv - d * 2.0).rgb * w2;',
    '  c += texture(uTex, vUv + d * 3.0).rgb * w3;',
    '  c += texture(uTex, vUv - d * 3.0).rgb * w3;',
    '  c += texture(uTex, vUv + d * 4.0).rgb * w4;',
    '  c += texture(uTex, vUv - d * 4.0).rgb * w4;',
    '  outColor = vec4(c, 1.0);',
    '}'
  ].join('\n');

  // Composite sharp / blur1 / blur2 by CoC (matches CPU thresholds)
  var FS_COMP = [
    '#version 300 es',
    'precision highp float;',
    'in vec2 vUv;',
    'out vec4 outColor;',
    'uniform sampler2D uSharp;',
    'uniform sampler2D uBlur1;',
    'uniform sampler2D uBlur2;',
    'uniform sampler2D uCoc;',
    'uniform float uStrength;',
    'uniform float uAnamo; // 1 = slight horizontal bias already in blurs',
    'void main(){',
    '  vec2 uv = vec2(vUv.x, 1.0 - vUv.y);',
    '  vec3 sharp = texture(uSharp, uv).rgb;',
    '  vec3 b1 = texture(uBlur1, uv).rgb;',
    '  vec3 b2 = texture(uBlur2, uv).rgb;',
    '  float c = texture(uCoc, uv).r * uStrength;',
    '  c = clamp(c, 0.0, 1.0);',
    '  vec3 col = sharp;',
    '  if (c >= 0.02) {',
    '    if (c < 0.45) {',
    '      float t = c / 0.45;',
    '      col = mix(sharp, b1, t);',
    '    } else {',
    '      float t = (c - 0.45) / 0.55;',
    '      col = mix(b1, b2, t);',
    '    }',
    '  }',
    '  outColor = vec4(col, 1.0);',
    '}'
  ].join('\n');

  function compile(type, src) {
    var s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      var log = gl.getShaderInfoLog(s);
      gl.deleteShader(s);
      throw new Error(log || 'shader compile');
    }
    return s;
  }

  function link(vsSrc, fsSrc) {
    var vs = compile(gl.VERTEX_SHADER, vsSrc);
    var fs = compile(gl.FRAGMENT_SHADER, fsSrc);
    var p = gl.createProgram();
    gl.attachShader(p, vs);
    gl.attachShader(p, fs);
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
      throw new Error(gl.getProgramInfoLog(p) || 'link');
    }
    return p;
  }

  function makeTex() {
    var t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return t;
  }

  function allocTex(tex, w, h) {
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      w,
      h,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      null
    );
  }

  function ensure() {
    if (failed) return false;
    if (gl && progBlur && progComp) return true;
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

      progBlur = link(VS, FS_BLUR);
      progComp = link(VS, FS_COMP);

      quadBuf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, quadBuf);
      gl.bufferData(
        gl.ARRAY_BUFFER,
        new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
        gl.STATIC_DRAW
      );
      vao = gl.createVertexArray();
      gl.bindVertexArray(vao);
      gl.enableVertexAttribArray(0);
      gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

      texSrc = makeTex();
      texCoc = makeTex();
      texPing = makeTex();
      texPong = makeTex();
      texBlur1 = makeTex();
      texBlur2 = makeTex();
      fbo = gl.createFramebuffer();

      function loc(prog, name) {
        return gl.getUniformLocation(prog, name);
      }
      blurUni.uTex = loc(progBlur, 'uTex');
      blurUni.uDir = loc(progBlur, 'uDir');
      blurUni.uRadius = loc(progBlur, 'uRadius');

      compUni.uSharp = loc(progComp, 'uSharp');
      compUni.uBlur1 = loc(progComp, 'uBlur1');
      compUni.uBlur2 = loc(progComp, 'uBlur2');
      compUni.uCoc = loc(progComp, 'uCoc');
      compUni.uStrength = loc(progComp, 'uStrength');
      compUni.uAnamo = loc(progComp, 'uAnamo');

      return true;
    } catch (e) {
      console.warn('[HermioneGpuDoF] init failed', e);
      failed = true;
      gl = null;
      return false;
    }
  }

  function isAvailable() {
    if (failed) return false;
    return ensure();
  }

  function bindFbo(tex, w, h) {
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(
      gl.FRAMEBUFFER,
      gl.COLOR_ATTACHMENT0,
      gl.TEXTURE_2D,
      tex,
      0
    );
    gl.viewport(0, 0, w, h);
  }

  /**
   * Blur texIn → texOut at size (bw,bh) with radius scale.
   * Uses ping/pong for H then V.
   */
  function blurPass(texIn, texOut, bw, bh, radiusPx, anamo) {
    gl.useProgram(progBlur);
    gl.bindVertexArray(vao);

    // horizontal
    allocTex(texPing, bw, bh);
    bindFbo(texPing, bw, bh);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texIn);
    gl.uniform1i(blurUni.uTex, 0);
    var hx = (1.0 / bw) * (anamo ? 1.35 : 1.0);
    gl.uniform2f(blurUni.uDir, hx, 0);
    gl.uniform1f(blurUni.uRadius, radiusPx);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    // vertical
    allocTex(texOut, bw, bh);
    bindFbo(texOut, bw, bh);
    gl.bindTexture(gl.TEXTURE_2D, texPing);
    var vy = 1.0 / bh;
    gl.uniform2f(blurUni.uDir, 0, vy * (anamo ? 0.75 : 1.0));
    gl.uniform1f(blurUni.uRadius, radiusPx);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  /**
   * @param {Uint8ClampedArray} data — full RGBA, modified in place
   * @param {number} w
   * @param {number} h
   * @param {Float32Array} coc — length w*h, 0..1
   * @param {{ strength?:number, maxR?:number, anamo?:boolean }} opts
   */
  function apply(data, w, h, coc, opts) {
    if (!data || !coc || !w || !h) return false;
    if (w > maxTex || h > maxTex) return false;
    if (!ensure()) return false;
    opts = opts || {};

    var strength = opts.strength != null ? opts.strength : 1;
    if (strength <= 0.01) return true;

    var maxR = opts.maxR != null ? opts.maxR : 12;
    var anamo = !!opts.anamo;

    // Half-res blur targets (like CPU softBlur)
    var bw = Math.max(1, (w / 2) | 0);
    var bh = Math.max(1, (h / 2) | 0);
    var r1 = Math.max(1.2, maxR * 0.35 * 0.55);
    var r2 = Math.max(2.0, maxR * 0.55);

    try {
      // Upload source (ImageData top-left)
      gl.pixelStorei(gl.UNPACK_ALIGNMENT, 4);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, texSrc);
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

      // CoC → R8 texture (full res)
      var cocBytes = new Uint8Array(w * h * 4);
      for (var i = 0; i < w * h; i++) {
        var v = Math.max(0, Math.min(1, coc[i] || 0));
        var b = (v * 255 + 0.5) | 0;
        cocBytes[i * 4] = b;
        cocBytes[i * 4 + 1] = b;
        cocBytes[i * 4 + 2] = b;
        cocBytes[i * 4 + 3] = 255;
      }
      gl.bindTexture(gl.TEXTURE_2D, texCoc);
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA,
        w,
        h,
        0,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        cocBytes
      );

      // Downsample sharp → half into texPong as start of blur chain
      // Use blur with radius 0.5 equivalent via drawing scaled — simple copy downsample
      allocTex(texPong, bw, bh);
      bindFbo(texPong, bw, bh);
      gl.useProgram(progBlur);
      gl.bindVertexArray(vao);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, texSrc);
      gl.uniform1i(blurUni.uTex, 0);
      gl.uniform2f(blurUni.uDir, 0, 0);
      gl.uniform1f(blurUni.uRadius, 0);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

      // blur1 and blur2 from half-res
      blurPass(texPong, texBlur1, bw, bh, r1, anamo);
      blurPass(texPong, texBlur2, bw, bh, r2, anamo);

      // Second soft pass on blur2 for smoother far field
      blurPass(texBlur2, texPing, bw, bh, Math.max(1, r2 * 0.45), anamo);
      // swap ping into blur2
      var tmp = texBlur2;
      texBlur2 = texPing;
      texPing = tmp;

      // Composite full-res to default framebuffer
      canvas.width = w;
      canvas.height = h;
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, w, h);
      gl.useProgram(progComp);
      gl.bindVertexArray(vao);

      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, texSrc);
      gl.uniform1i(compUni.uSharp, 0);

      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, texBlur1);
      gl.uniform1i(compUni.uBlur1, 1);

      gl.activeTexture(gl.TEXTURE2);
      gl.bindTexture(gl.TEXTURE_2D, texBlur2);
      gl.uniform1i(compUni.uBlur2, 2);

      gl.activeTexture(gl.TEXTURE3);
      gl.bindTexture(gl.TEXTURE_2D, texCoc);
      gl.uniform1i(compUni.uCoc, 3);

      gl.uniform1f(compUni.uStrength, strength);
      gl.uniform1f(compUni.uAnamo, anamo ? 1 : 0);

      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

      // Read back + flip Y
      var pixels = new Uint8Array(w * h * 4);
      gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
      for (var y = 0; y < h; y++) {
        var srcRow = (h - 1 - y) * w * 4;
        var dstRow = y * w * 4;
        data.set(pixels.subarray(srcRow, srcRow + w * 4), dstRow);
      }
      return true;
    } catch (e) {
      console.warn('[HermioneGpuDoF] apply failed', e);
      return false;
    }
  }

  global.HermioneGpuDoF = {
    isAvailable: isAvailable,
    apply: apply
  };
})(typeof window !== 'undefined' ? window : globalThis);
