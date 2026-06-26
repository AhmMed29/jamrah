var SHADER_VERTEX = [
  'attribute vec4 aVertexPosition;',
  'attribute vec2 aTextureCoord;',
  'varying vec2 vTextureCoord;',
  'void main() {',
  '  gl_Position = aVertexPosition;',
  '  vTextureCoord = aTextureCoord;',
  '}',
].join('\n');

var SHADER_FRAGMENT = [
  'precision mediump float;',
  'uniform vec2 iResolution;',
  'uniform float iTime;',
  'uniform vec2 iMouse;',
  'uniform vec3 iColor1;',
  'uniform vec3 iColor2;',
  'uniform vec3 iBgColor;',
  'varying vec2 vTextureCoord;',
  'void mainImage(out vec4 fragColor, in vec2 fragCoord) {',
  '  vec2 uv = (2.0 * fragCoord - iResolution.xy) / min(iResolution.x, iResolution.y);',
  '  for(float i = 1.0; i < 10.0; i++){',
  '    uv.x += 0.6 / i * cos(i * 2.5 * uv.y + iTime);',
  '    uv.y += 0.6 / i * cos(i * 1.5 * uv.x + iTime);',
  '  }',
  '  float r = length(uv);',
  '  float a = atan(uv.y, uv.x);',
  '  float w1 = 0.5 + 0.5 * sin(a * 3.0 + iTime * 1.2 + r * 4.0);',
  '  float w2 = 0.5 + 0.5 * cos(a * 5.0 - iTime * 0.8 + r * 6.0);',
  '  float w3 = 0.5 + 0.5 * sin(uv.x * 2.0 + uv.y * 3.0 + iTime * 1.5);',
  '  float blend = (w1 * 0.5 + w2 * 0.3 + w3 * 0.2);',
  '  vec3 col = mix(iBgColor, iColor1, blend * 0.8);',
  '  col = mix(col, iColor2, w2 * 0.4);',
  '  col *= (0.8 + 0.2 * w3);',
  '  fragColor = vec4(col, 1.0);',
  '}',
  'void main() {',
  '  vec2 fragCoord = vTextureCoord * iResolution;',
  '  vec2 center = iResolution * 0.5;',
  '  float dist = distance(fragCoord, center);',
  '  float radius = min(iResolution.x, iResolution.y) * 0.5;',
  '  if (dist < radius) {',
  '    vec4 color;',
  '    mainImage(color, fragCoord);',
  '    gl_FragColor = color;',
  '  } else {',
  '    discard;',
  '  }',
  '}',
].join('\n');

var THEMES = {
  dark:    { color1: [0.15, 0.15, 0.15], color2: [0.0, 0.0, 0.0], bg: [0.0, 0.0, 0.0], label: 'Dark', preview: ['#262626','#000','#000'] },
  ocean:   { color1: [0.0, 0.55, 0.85], color2: [0.3, 0.7, 0.9], bg: [0.0, 0.0, 0.0], label: 'Ocean', preview: ['#0088CC','#4DA8DA','#000'] },
  forest:  { color1: [0.05, 0.5, 0.2], color2: [0.2, 0.7, 0.3], bg: [0.0, 0.0, 0.0], label: 'Forest', preview: ['#0D8040','#33B35A','#000'] },
  sunset:  { color1: [0.75, 0.2, 0.1], color2: [0.9, 0.5, 0.1], bg: [0.0, 0.0, 0.0], label: 'Sunset', preview: ['#BF331A','#E68A19','#000'] },
  lavender:{ color1: [0.45, 0.15, 0.75], color2: [0.65, 0.45, 0.85], bg: [0.0, 0.0, 0.0], label: 'Lavender', preview: ['#7326BF','#A673D9','#000'] },
};
window.shaderThemes = THEMES;

function initShader(canvas) {
  if (!canvas) return null;
  var gl = canvas.getContext('webgl');
  if (!gl) return null;

  var program = createProgram(gl, SHADER_VERTEX, SHADER_FRAGMENT);
  if (!program) return null;

  var u = {
    iResolution: gl.getUniformLocation(program, 'iResolution'),
    iTime: gl.getUniformLocation(program, 'iTime'),
    iMouse: gl.getUniformLocation(program, 'iMouse'),
    iColor1: gl.getUniformLocation(program, 'iColor1'),
    iColor2: gl.getUniformLocation(program, 'iColor2'),
    iBgColor: gl.getUniformLocation(program, 'iBgColor'),
  };

  var buffers = createBuffers(gl);
  var startTime = Date.now();
  var mouseX = 0.5, mouseY = 0.5;
  var running = true;
  var theme = THEMES.ocean;

  function resize() {
    var rect = canvas.getBoundingClientRect();
    var dpr = window.devicePixelRatio || 1;
    var w = Math.round(rect.width * dpr);
    var h = Math.round(rect.height * dpr);
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
      gl.viewport(0, 0, w, h);
    }
  }

  function setUniforms(time) {
    gl.uniform2f(u.iResolution, canvas.width, canvas.height);
    gl.uniform1f(u.iTime, time);
    gl.uniform2f(u.iMouse, mouseX, mouseY);
    gl.uniform3f(u.iColor1, theme.color1[0], theme.color1[1], theme.color1[2]);
    gl.uniform3f(u.iColor2, theme.color2[0], theme.color2[1], theme.color2[2]);
    gl.uniform3f(u.iBgColor, theme.bg[0], theme.bg[1], theme.bg[2]);
  }

  function draw() {
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(program);

    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.position);
    gl.vertexAttribPointer(gl.getAttribLocation(program, 'aVertexPosition'), 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(gl.getAttribLocation(program, 'aVertexPosition'));

    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.texCoord);
    gl.vertexAttribPointer(gl.getAttribLocation(program, 'aTextureCoord'), 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(gl.getAttribLocation(program, 'aTextureCoord'));

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffers.indices);
    gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
  }

  function render() {
    if (!running) return;
    resize();
    setUniforms((Date.now() - startTime) / 1000);
    draw();
    requestAnimationFrame(render);
  }

  requestAnimationFrame(render);

  return {
    destroy: function() { running = false; },
    updateMouse: function(x, y) { mouseX = x; mouseY = y; },
    setTheme: function(id) { theme = THEMES[id] || THEMES.dark; },
    setColors: function(c1, c2, bg) {
      theme = { color1: c1, color2: c2, bg: bg };
    },
  };
}

function createProgram(gl, vsSrc, fsSrc) {
  var vs = loadShader(gl, gl.VERTEX_SHADER, vsSrc);
  var fs = loadShader(gl, gl.FRAGMENT_SHADER, fsSrc);
  if (!vs || !fs) return null;
  var prog = gl.createProgram();
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    gl.deleteProgram(prog);
    return null;
  }
  return prog;
}

function loadShader(gl, type, src) {
  var s = gl.createShader(type);
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    gl.deleteShader(s);
    return null;
  }
  return s;
}

function createBuffers(gl) {
  var pos = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, pos);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, 1, 1, -1, 1]), gl.STATIC_DRAW);

  var tc = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, tc);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 0, 1, 0, 1, 1, 0, 1]), gl.STATIC_DRAW);

  var idx = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, idx);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array([0, 1, 2, 0, 2, 3]), gl.STATIC_DRAW);

  return { position: pos, texCoord: tc, indices: idx };
}

var _shaderInstance = null;

function hexToRgb(h) {
  var r = parseInt(h.slice(1,3), 16) / 255;
  var g = parseInt(h.slice(3,5), 16) / 255;
  var b = parseInt(h.slice(5,7), 16) / 255;
  return [r, g, b];
}

window.initPomoShader = function() {
  if (_shaderInstance) return;
  var canvas = document.getElementById('pomoShaderCanvas');
  if (!canvas) return;
  _shaderInstance = initShader(canvas);
  var savedTheme = window.db && window.db.getSetting && window.db.getSetting('pomoTheme') || 'ocean';
  if (savedTheme === 'custom') {
    var cc1 = window.db.getSetting('customColor1');
    var cc2 = window.db.getSetting('customColor2');
    var cbg = window.db.getSetting('customBgColor');
    if (cc1 && cc2 && cbg) {
      _shaderInstance.setColors(hexToRgb(cc1), hexToRgb(cc2), hexToRgb(cbg));
    } else {
      _shaderInstance.setTheme(savedTheme);
    }
  } else {
    _shaderInstance.setTheme(savedTheme);
  }
  var circle = document.getElementById('timerCircle');
  if (circle && _shaderInstance) {
    circle.addEventListener('mousemove', function(e) {
      var rect = canvas.getBoundingClientRect();
      var x = (e.clientX - rect.left) / rect.width;
      var y = (e.clientY - rect.top) / rect.height;
      _shaderInstance.updateMouse(x, y);
    });
    circle.addEventListener('mouseleave', function() {
      _shaderInstance.updateMouse(0.5, 0.5);
    });
  }
};

window.destroyPomoShader = function() {
  if (_shaderInstance) {
    _shaderInstance.destroy();
    _shaderInstance = null;
  }
};

window.shaderSetRunning = function() {
};

window.shaderSetTheme = function(id) {
  if (_shaderInstance) {
    _shaderInstance.setTheme(id);
  }
};

window.shaderSetColors = function(c1, c2, bg) {
  if (_shaderInstance) {
    _shaderInstance.setColors(c1, c2, bg);
  }
};
