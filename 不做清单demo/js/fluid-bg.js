/**
 * 不做清单 · 流体抖动背景 (fluid-bg.js)
 * 从 incredibles.dev 复刻改造：WebGL 流体 + Bayer 4×4 有序抖动
 * 分层架构：L0 底纹 / L1 流体 / L3 文字蒙版 / L4 打印联动 / L5 UI 隐没
 * 设计叙事：鼠标 = 热敏打印头，划过烫出字迹；尾迹消散 = 热敏小票褪色
 */
(function () {
'use strict';

/* ==================== 配置中心 ==================== */
const CONFIG = {
  SIM_RESOLUTION: 128,
  DYE_RESOLUTION: 256,
  DENSITY_DISSIPATION: 2.5,
  VELOCITY_DISSIPATION: 0.5,
  SPLAT_RADIUS: 0.15,
  SPLAT_FORCE: 1000,
  DYE_INTENSITY: 0.15,
  DYE_NORMALIZE: 0.15,
  DITHER_BLOCK_SIZE: 3.0,
  NOISE_FLOW_SPEED: 0.03,
  LAYER_BASE: true,
  LAYER_FLUID: true,
  LAYER_TEXT_MASK: true,
  L3_TEXT_SWAP: true,             // L3 双语热显影互换（A 套静止 → B 套擦拭显现）
  SWAP_CURVE: [0.10, 0.35],      // swap smoothstep 上下限
  SWAP_MAX_WIDTH: 0.92,          // B 套文字最大视口宽度（防溢出）
  LAYER_PRINT_LINK: true,
  LAYER_UI_CONCEAL: true,          // L5 UI 隐没层开关
  UI_CONCEAL_MODE: 'full',         // 'full'（整体隐没）| 'structure'（保留结构存在感）
  GUIDE_SWEEP: true,               // 入场引导：虚拟打印头自动扫过导航/按钮
  UI_TEXT_COLOR: '--accent',       // 显现文字基准色（暗红族）
  UI_TEXT_HOT_COLOR: '--accent-light', // 显现上升沿热色（刚烫出感）
  UI_TEXT_SCALE_NAV: 1.2,          // 导航文字蒙版放大倍数（仅蒙版，DOM 不动）
  UI_TEXT_SCALE_BTN: 1.15,         // 按钮文字蒙版放大倍数
  UI_REVEAL_LOW: 0.08,             // reveal smoothstep 下界
  UI_REVEAL_HIGH: 0.28,            // reveal smoothstep 上界
  UI_BASE_DIM: 0.85,               // UI 区域底纹压暗强度
  PERF_DEGRADE: false,
};

/* ==================== 从 :root 读取设计令牌 ==================== */
function readColor(varName) {
  const hex = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  return [r, g, b];
}

let COLORS = {};
function refreshColors() {
  COLORS = {
    bg:          readColor('--bg'),
    bgSecondary: readColor('--bg-secondary'),
    bgDither:    readColor('--bg-dither'),
    paper:       readColor('--paper'),
    accent:      readColor('--accent'),
    accentLight: readColor('--accent-light'),
    heatOrange:  readColor('--heat-orange'),
    heatYellow:  readColor('--heat-yellow'),
    leaf:        readColor('--leaf'),
    leafDark:    readColor('--leaf-dark'),
    text:        readColor('--text'),
    uiTextColor:    readColor(CONFIG.UI_TEXT_COLOR),
    uiTextHotColor: readColor(CONFIG.UI_TEXT_HOT_COLOR),
  };
}

/* ==================== Canvas & WebGL 初始化 ==================== */
const canvas = document.getElementById('bg-canvas');
const gl = canvas.getContext('webgl2', { alpha: false, depth: false, stencil: false, antialias: false });

if (!gl) {
  console.warn('[fluid-bg] WebGL2 不可用，背景降级为纯色');
  canvas.style.background = '#1A1410';
  return;
}

gl.getExtension('EXT_color_buffer_float');
gl.getExtension('OES_texture_float_linear');

/* WebGL 初始化成功：标记 <html>，使 .mask-text / .conceal-text DOM 文字透明（由着色器接管绘制）。
   降级分支（!gl）在此之前已 return，因此 WebGL 不可用时不会添加该类，DOM 文字照常显示。 */
document.documentElement.classList.add('fluid-active');
if (CONFIG.LAYER_UI_CONCEAL) {
  document.documentElement.classList.add(CONFIG.UI_CONCEAL_MODE === 'structure' ? 'ui-mode-structure' : 'ui-mode-full');
}

/* ==================== 着色器编译辅助 ==================== */
function compileShader(type, source) {
  const s = gl.createShader(type);
  gl.shaderSource(s, source);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) console.error(gl.getShaderInfoLog(s));
  return s;
}
function createProgram(vs, fs) {
  const p = gl.createProgram();
  gl.attachShader(p, vs);
  gl.attachShader(p, fs);
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) console.error(gl.getProgramInfoLog(p));
  const uniforms = {};
  const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
  for (let i = 0; i < n; i++) {
    const name = gl.getActiveUniform(p, i).name;
    uniforms[name] = gl.getUniformLocation(p, name);
  }
  return { program: p, uniforms, bind() { gl.useProgram(p); } };
}

/* 全屏 quad */
const quadVS = compileShader(gl.VERTEX_SHADER, '\n  attribute vec2 aPosition;\n  varying highp vec2 vUv;\n  void main () {\n    vUv = aPosition * 0.5 + 0.5;\n    gl_Position = vec4(aPosition, 0.0, 1.0);\n  }\n');
gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, -1,1, 1,1, 1,-1]), gl.STATIC_DRAW);
gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gl.createBuffer());
gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array([0,1,2, 0,2,3]), gl.STATIC_DRAW);
gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
gl.enableVertexAttribArray(0);
function blit(target) {
  if (target == null) {
    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  } else {
    gl.viewport(0, 0, target.width, target.height);
    gl.bindFramebuffer(gl.FRAMEBUFFER, target.fbo);
  }
  gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
}

/* ==================== FBO ==================== */
function createFBO(w, h, filtering) {
  const texture = gl.createTexture();
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filtering);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filtering);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, w, h, 0, gl.RGBA, gl.HALF_FLOAT, null);
  const fbo = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
  gl.viewport(0, 0, w, h);
  gl.clearColor(0, 0, 0, 0);
  gl.clear(gl.COLOR_BUFFER_BIT);
  return {
    texture, fbo, width: w, height: h,
    texelSizeX: 1 / w, texelSizeY: 1 / h,
    attach(id) { gl.activeTexture(gl.TEXTURE0 + id); gl.bindTexture(gl.TEXTURE_2D, texture); return id; }
  };
}
function createDoubleFBO(w, h, filtering) {
  let fbo1 = createFBO(w, h, filtering), fbo2 = createFBO(w, h, filtering);
  return {
    width: w, height: h, texelSizeX: 1 / w, texelSizeY: 1 / h,
    get read()  { return fbo1; }, set read(v) { fbo1 = v; },
    get write() { return fbo2; }, set write(v) { fbo2 = v; },
    swap() { const t = fbo1; fbo1 = fbo2; fbo2 = t; }
  };
}
function getResolution(res) {
  let aspect = gl.drawingBufferWidth / gl.drawingBufferHeight;
  if (aspect < 1) aspect = 1 / aspect;
  const min = Math.round(res), max = Math.round(res * aspect);
  return gl.drawingBufferWidth > gl.drawingBufferHeight
    ? { width: max, height: min } : { width: min, height: max };
}

let dye, velocity;
function initFramebuffers() {
  const simRes = getResolution(CONFIG.PERF_DEGRADE ? 64 : CONFIG.SIM_RESOLUTION);
  const dyeRes = getResolution(CONFIG.PERF_DEGRADE ? 128 : CONFIG.DYE_RESOLUTION);
  dye      = createDoubleFBO(dyeRes.width, dyeRes.height, gl.LINEAR);
  velocity = createDoubleFBO(simRes.width, simRes.height, gl.LINEAR);
}

/* ==================== 着色器程序 ==================== */

const splatProgram = createProgram(quadVS, compileShader(gl.FRAGMENT_SHADER, '\n  precision highp float; precision highp sampler2D;\n  varying vec2 vUv;\n  uniform sampler2D uTarget;\n  uniform float aspectRatio;\n  uniform vec3 color;\n  uniform vec2 point;\n  uniform float radius;\n  void main () {\n    vec2 p = vUv - point.xy;\n    p.x *= aspectRatio;\n    float gaussian = exp(-dot(p, p) / radius);\n    vec3 splat = gaussian * color;\n    vec3 base = texture2D(uTarget, vUv).xyz;\n    gl_FragColor = vec4(base + splat, 1.0);\n  }\n'));

const advectionProgram = createProgram(quadVS, compileShader(gl.FRAGMENT_SHADER, '\n  precision highp float; precision highp sampler2D;\n  varying vec2 vUv;\n  uniform sampler2D uVelocity;\n  uniform sampler2D uSource;\n  uniform vec2 texelSize;\n  uniform vec2 dyeTexelSize;\n  uniform float dt;\n  uniform float dissipation;\n  vec4 bilerp (sampler2D sam, vec2 uv, vec2 tsize) {\n    vec2 st = uv / tsize - 0.5;\n    vec2 iuv = floor(st);\n    vec2 fuv = fract(st);\n    vec4 a = texture2D(sam, (iuv + vec2(0.5, 0.5)) * tsize);\n    vec4 b = texture2D(sam, (iuv + vec2(1.5, 0.5)) * tsize);\n    vec4 c = texture2D(sam, (iuv + vec2(0.5, 1.5)) * tsize);\n    vec4 d = texture2D(sam, (iuv + vec2(1.5, 1.5)) * tsize);\n    return mix(mix(a, b, fuv.x), mix(c, d, fuv.x), fuv.y);\n  }\n  void main () {\n    vec2 coord = vUv - dt * bilerp(uVelocity, vUv, texelSize).xy * texelSize;\n    vec4 result = bilerp(uSource, coord, dyeTexelSize);\n    float decay = 1.0 + dissipation * dt;\n    gl_FragColor = result / decay;\n  }\n'));

// 显示着色器：分层合一
const displayProgram = createProgram(quadVS, compileShader(gl.FRAGMENT_SHADER, [
  'precision highp float; precision highp sampler2D;',
  'varying vec2 vUv;',
  'uniform sampler2D uTexture;',
  'uniform sampler2D uTextMask;',
  'uniform sampler2D uSwapMask;',
  'uniform sampler2D uUiMask;',
  'uniform sampler2D uFocusedMask;',
  'uniform float u_time;',
  'uniform vec2 u_resolution;',
  'uniform float u_pixelRatio;',
  'uniform float u_fluidAmount;',
  'uniform float u_textMaskActive;',
  'uniform float u_textSwapActive;',
  'uniform float u_uiConcealActive;',
  'uniform float u_focusedActive;',
  'uniform float u_uiConcealMode;',
  'uniform vec3 u_uiTextColor;',
  'uniform vec3 u_uiTextHotColor;',
  'uniform float u_layerBase;',
  'uniform float u_layerFluid;',
  'uniform vec3 u_bg;',
  'uniform vec3 u_bgSecondary;',
  'uniform vec3 u_bgDither;',
  'uniform vec3 u_paper;',
  'uniform vec3 u_accent;',
  'uniform vec3 u_accentLight;',
  'uniform vec3 u_heatOrange;',
  'uniform vec3 u_heatYellow;',
  'uniform vec3 u_leaf;',
  'uniform vec3 u_leafDark;',
  'uniform vec3 u_text;',
  '',
  'float hash(vec2 p) {',
  '  p = fract(p * vec2(127.1, 311.7));',
  '  p += dot(p, p.yx + 19.19);',
  '  return fract(p.x * p.y);',
  '}',
  'float noise(vec2 p) {',
  '  vec2 i = floor(p);',
  '  vec2 f = fract(p);',
  '  float a = hash(i);',
  '  float b = hash(i + vec2(1.0, 0.0));',
  '  float c = hash(i + vec2(0.0, 1.0));',
  '  float d = hash(i + vec2(1.0, 1.0));',
  '  vec2 u = f * f * (3.0 - 2.0 * f);',
  '  return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;',
  '}',
  'float fbm(vec2 p, float time) {',
  '  float value = 0.0;',
  '  float amplitude = 0.5;',
  '  float phase = time * 0.015;',
  '  for (int i = 0; i < 3; i++) {',
  '    value += amplitude * noise(p);',
  '    float fi = phase + float(i) * 0.5;',
  '    p = p * 1.5 + vec2(12.7 + cos(fi) * 0.5, 4.3 + sin(fi) * 0.5);',
  '    amplitude *= 0.5;',
  '  }',
  '  return value * 0.857;   // 3 倍频上限 0.875 → 归一到原 0.75 区间，保持整体密度不变',
  '}',
  'float shapeNoise(vec2 p, float time) {',
  '  vec2 offset = vec2(fbm(p + vec2(7.1, -3.9), time) - 0.5) * 4.5;',
  '  return fbm(p + offset, time);',
  '}',
  'float bayer4(vec2 pixelPos) {',
  '  vec2 p  = mod(pixelPos, 4.0);',
  '  vec2 p2 = mod(p, 2.0);',
  '  vec2 p4 = floor(p * 0.5);',
  '  float inner = 2.0 * (p2.x + p2.y - 2.0 * p2.x * p2.y) + p2.y;',
  '  float outer = 2.0 * (p4.x + p4.y - 2.0 * p4.x * p4.y) + p4.y;',
  '  return (4.0 * inner + outer) / 16.0;',
  '}',
  '',
  '// 尾迹颜色映射：受限热成像 ramp（白热核心 → 暖黄 → 橙 → 暗红余温 → 冷却溶入底色）',
  '// 叙事：鼠标=热敏打印头，刚烫过=白热，冷却=橙→红，褪尽=黑',
  'vec3 getTrailColor(float s) {',
  '  if (s > 0.85) {',
  '    float t = clamp((s - 0.85) / 0.15, 0.0, 1.0);',
  '    return mix(u_heatYellow, u_paper, t);',
  '  } else if (s > 0.6) {',
  '    float t = (0.85 - s) / 0.25;',
  '    return mix(u_heatOrange, u_heatYellow, t);',
  '  } else if (s > 0.35) {',
  '    float t = (0.6 - s) / 0.25;',
  '    return mix(u_accent, u_heatOrange, t);',
  '  } else {',
  '    float t = clamp(s / 0.35, 0.0, 1.0);',
  '    return mix(u_bg, u_accent, t);',
  '  }',
  '}',
  '',
  'void main () {',
  '  float blockSize = 3.0 * u_pixelRatio;',
  '  vec2 blockCoord = floor(gl_FragCoord.xy / blockSize);',
  '  vec2 blockCenter = (blockCoord + 0.5) * blockSize;',
  '  vec2 blockUv = blockCenter / u_resolution.xy;',
  '  vec2 centeredUv = blockUv - 0.5;',
  '  centeredUv.x *= u_resolution.x / max(u_resolution.y, 1.0);',
  '',
  '  // L0: 底纹层',
  '  float base = 0.0;',
  '  if (u_layerBase > 0.5) {',
  '    float t = u_time * 0.03;',
  '    vec2 flow = vec2(t, -t * 0.65);',
  '    vec2 noiseUv = vec2(centeredUv.x * 1.5, centeredUv.y * 1.5 * 0.9) + flow;',
  '    base = shapeNoise(noiseUv, u_time);',
  '    base = smoothstep(0.15, 0.85, base);          // 1C 软映射：无平台无悬崖，细线边界消融',
  '    base *= 1.2;                                   // 覆盖率微调（1.0~1.3 目视微调）',
  '    base = clamp(base, 0.0, 1.0);',
  '    base += (hash(blockCoord) - 0.5) * 0.06;       // 1B 微扰：±0.03 按块抖动，直线变毛边（0.04~0.08 可微调）',
  '  }',
  '',
  '  // L1: 流体强度',
  '  vec3 dye = texture2D(uTexture, vUv).rgb;',
  '  float fluidLum = max(dye.r, max(dye.g, dye.b));',
  '  float fluidStrength = 0.0;',
  '  if (u_layerFluid > 0.5) {',
  '    fluidStrength = clamp(fluidLum / 0.15, 0.0, 1.0) * u_fluidAmount;',
  '  }',
  '',
  '  // L3: 文字蒙版 + 色差',
  '  float caAmount = fluidStrength * 17.0 / u_resolution.x;',
  '  vec2 caDir = normalize(vec2(1.0, 0.4));',
  '  vec2 caDirPerp = vec2(caDir.y, caDir.x);',
  '  vec2 uvC = vec2(vUv.x, 1.0 - vUv.y);',
  '  vec2 uvR = vec2(vUv.x + caDir.x * caAmount, 1.0 - (vUv.y + caDir.y * caAmount));',
  '  vec2 uvG = vec2(vUv.x + caDirPerp.x * caAmount * 0.5, 1.0 - (vUv.y + caDirPerp.y * caAmount * 0.5));',
  '  // L3: A 套蒙版 + B 套互换蒙版，分别做色差三次采样，按 swap 混合',
  '  float textMaskA  = texture2D(uTextMask, uvC).r * u_textMaskActive;',
  '  float textMaskAR = texture2D(uTextMask, uvR).r * u_textMaskActive;',
  '  float textMaskAG = texture2D(uTextMask, uvG).r * u_textMaskActive;',
  '  float swapMaskB  = texture2D(uSwapMask, uvC).r * u_textMaskActive * u_textSwapActive;',
  '  float swapMaskBR = texture2D(uSwapMask, uvR).r * u_textMaskActive * u_textSwapActive;',
  '  float swapMaskBG = texture2D(uSwapMask, uvG).r * u_textMaskActive * u_textSwapActive;',
  '  float swap = smoothstep(' + CONFIG.SWAP_CURVE[0] + ', ' + CONFIG.SWAP_CURVE[1] + ', fluidStrength) * u_textSwapActive;',
  '  float textMask  = textMaskA  * (1.0 - swap) + swapMaskB  * swap;',
  '  float textMaskR = textMaskAR * (1.0 - swap) + swapMaskBR * swap;',
  '  float textMaskG = textMaskAG * (1.0 - swap) + swapMaskBG * swap;',
  '',
  '  // L5: UI 蒙版 + reveal（提前计算，用于压暗底纹形成净底）',
  '  float uiMask = texture2D(uUiMask, uvC).r * u_uiConcealActive;',
  '  float focusedMask = texture2D(uFocusedMask, uvC).r * u_focusedActive;',
  '  float uiReveal = 0.0;',
  '  if (uiMask > 0.001) {',
  '    uiReveal = smoothstep(0.08, 0.28, fluidStrength);',
  '    uiReveal = max(uiReveal, focusedMask);',
  '    uiReveal = max(uiReveal, 0.08 * u_uiConcealMode);',
  '  }',
  '',
  '  // 流体掏空抖动底纹（文字区域不受影响）',
  '  float modifiedBase = clamp(base - fluidStrength * (1.0 - textMask), 0.0, 1.0);',
  '  // L5: UI 区域净底压暗（擦拭过的纸面更干净，文字自然跳出）',
  '  modifiedBase *= (1.0 - uiReveal * uiMask * 0.85);',
  '',
  '  // Bayer 有序抖动量化',
  '  float threshold = (bayer4(blockCoord) - 0.5) * 2.0;',
  '  float dithered = step(0.5, clamp(modifiedBase + threshold, 0.0, 1.0));',
  '',
  '  // 调色板（深色主题：--bg / --bg-dither，网点色明显亮于底色以肉眼可辨）',
  '  vec3 bgColor = mix(u_bg, u_bgDither, dithered);',
  '',
  '  // L1: 尾迹颜色叠加',
  '  if (u_layerFluid > 0.5) {',
  '    vec3 trailColor = getTrailColor(fluidStrength);',
  '    bgColor = mix(bgColor, trailColor, fluidStrength * 0.85);',
  '  }',
  '',
  '  // L1.5: 掏空边缘冷蓝晕染——空洞外缘幸存网点染微弱冷蓝，随染料消散自动复原',
  '  if (u_layerFluid > 0.5) {',
  '    float edgeBand = smoothstep(0.03, 0.07, fluidStrength) * (1.0 - smoothstep(0.10, 0.20, fluidStrength));',
  '    edgeBand = pow(edgeBand, 1.5);                                            // 向外汇聚式衰减：靠洞一点、向外即隐',
  '    float blueGrad = smoothstep(0.03, 0.20, fluidStrength);                   // 带内渐变',
  '    vec3 coolBlue = mix(vec3(0.29, 0.42, 0.54), vec3(0.14, 0.23, 0.32), blueGrad);  // 低饱和钢蓝 #4A6B8A → #243B52',
  '    bgColor = mix(bgColor, coolBlue, edgeBand * dithered * 0.45);',
  '  }',
  '',
  '  // L3: 文字效果（流体经过时变为热成像橙 + 色差）',
  '  vec3 textEffect = mix(u_text, u_heatOrange, fluidStrength * 0.9);',
  '  float r = mix(bgColor.r, textEffect.r, textMaskR);',
  '  float g = mix(bgColor.g, textEffect.g, textMaskG);',
  '  float b = mix(bgColor.b, textEffect.b, textMaskG);',
  '  vec3 finalColor = vec3(r, g, b);',
  '',
  '  // L5: UI 文字合成（基准色 --accent，上升沿叠 --accent-light 热感，随流体消退隐没）',
  '  if (uiMask > 0.001 && uiReveal > 0.001) {',
  '    // fluidStrength 高=刚烫出=热色(--accent-light)，消退=沉淀=基准色(--accent)',
  '    float hotWeight = smoothstep(0.08, 0.28, fluidStrength);',
  '    vec3 uiColor = mix(u_uiTextColor, u_uiTextHotColor, hotWeight);',
  '    finalColor = mix(finalColor, uiColor, uiMask * uiReveal);',
  '  }',
  '',
  '  gl_FragColor = vec4(finalColor, 1.0);',
  '}',
].join('\n')));

/* ==================== 蒙版纹理 ==================== */
const maskCanvas = document.createElement('canvas');
const swapCanvas = document.createElement('canvas');
const uiCanvas = document.createElement('canvas');
const focusedCanvas = document.createElement('canvas');
let textMaskTexture = null;
let swapMaskTexture = null;
let uiMaskTexture = null;
let focusedMaskTexture = null;

function createBlankTexture() {
  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0,0,0,0]));
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  return tex;
}
textMaskTexture = createBlankTexture();
swapMaskTexture = createBlankTexture();
uiMaskTexture = createBlankTexture();
focusedMaskTexture = createBlankTexture();

function uploadMaskTexture(tex, canvasEl) {
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvasEl);
}

function buildTextMask() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  maskCanvas.width  = Math.floor(window.innerWidth  * dpr);
  maskCanvas.height = Math.floor(window.innerHeight * dpr);
  const ctx = maskCanvas.getContext('2d');
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, maskCanvas.width, maskCanvas.height);
  ctx.scale(dpr, dpr);
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  document.querySelectorAll('.mask-text').forEach(el => {
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    const cs = getComputedStyle(el);
    ctx.font = cs.fontWeight + ' ' + cs.fontSize + ' ' + cs.fontFamily;
    ctx.fillText(el.textContent, rect.left + rect.width / 2, rect.top + rect.height / 2);
  });
  uploadMaskTexture(textMaskTexture, maskCanvas);
}

// L3 B 套互换蒙版：读取 .mask-text[data-swap-text]，用 B 文字绘制（同字号/字重/字体/中心点）
// 仅主页激活时绘制；B 文字渲染宽度超过视口 92% 时整体等比缩小防溢出
function buildSwapMask() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  swapCanvas.width  = Math.floor(window.innerWidth  * dpr);
  swapCanvas.height = Math.floor(window.innerHeight * dpr);
  const ctx = swapCanvas.getContext('2d');
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, swapCanvas.width, swapCanvas.height);
  ctx.scale(dpr, dpr);
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  var vw = window.innerWidth;
  var maxW = vw * CONFIG.SWAP_MAX_WIDTH;
  document.querySelectorAll('.mask-text[data-swap-text]').forEach(el => {
    const page = el.closest('.page');
    if (page && !page.classList.contains('active')) return;
    const swapText = el.getAttribute('data-swap-text');
    if (!swapText) return;
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    const cs = getComputedStyle(el);
    var baseFont = cs.fontWeight + ' ' + cs.fontSize + ' ' + cs.fontFamily;
    ctx.font = baseFont;
    var measured = ctx.measureText(swapText).width;
    var scale = 1.0;
    if (measured > maxW) scale = maxW / measured;
    if (scale !== 1.0) {
      var sizeNum = parseFloat(cs.fontSize) * scale;
      ctx.font = cs.fontWeight + ' ' + sizeNum + 'px ' + cs.fontFamily;
    }
    ctx.fillText(swapText, rect.left + rect.width / 2, rect.top + rect.height / 2);
  });
  uploadMaskTexture(swapMaskTexture, swapCanvas);
}

// L5 UI 蒙版：绘制 .conceal-text 元素（导航文字 + 主页按钮文字）
// 仅绘制当前可见页内的元素（导航始终可见；按钮仅在主页 active 时绘制）
// 蒙版级字号放大（DOM 不动）：导航 ×UI_TEXT_SCALE_NAV，按钮 ×UI_TEXT_SCALE_BTN
function buildUiMask() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  uiCanvas.width  = Math.floor(window.innerWidth  * dpr);
  uiCanvas.height = Math.floor(window.innerHeight * dpr);
  const ctx = uiCanvas.getContext('2d');
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, uiCanvas.width, uiCanvas.height);
  ctx.scale(dpr, dpr);
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  document.querySelectorAll('.conceal-text').forEach(el => {
    // 跳过非活动页内的元素（按钮位于 #page-home，离开主页时不绘制）
    const page = el.closest('.page');
    if (page && !page.classList.contains('active')) return;
    drawConcealText(ctx, el);
  });
  uploadMaskTexture(uiMaskTexture, uiCanvas);
}

// 单元素聚焦蒙版：键盘 Tab 聚焦时只点亮该元素（替代全局 forceReveal）
function buildFocusedMask(el) {
  if (!el) { clearFocusedMask(); return; }
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  focusedCanvas.width  = Math.floor(window.innerWidth  * dpr);
  focusedCanvas.height = Math.floor(window.innerHeight * dpr);
  const ctx = focusedCanvas.getContext('2d');
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, focusedCanvas.width, focusedCanvas.height);
  ctx.scale(dpr, dpr);
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  drawConcealText(ctx, el);
  uploadMaskTexture(focusedMaskTexture, focusedCanvas);
}

function clearFocusedMask() {
  gl.bindTexture(gl.TEXTURE_2D, focusedMaskTexture);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0,0,0,0]));
}

// 共用：按元素类型应用放大倍数绘制文字到蒙版
function drawConcealText(ctx, el) {
  const rect = el.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) return;
  const cs = getComputedStyle(el);
  var scale = 1.0;
  if (el.classList.contains('nav-link')) {
    scale = CONFIG.UI_TEXT_SCALE_NAV;
  } else if (el.closest('#btn-print')) {
    scale = CONFIG.UI_TEXT_SCALE_BTN;
  }
  var fontSize = parseFloat(cs.fontSize) * scale;
  ctx.font = cs.fontWeight + ' ' + fontSize + 'px ' + cs.fontFamily;
  ctx.fillText(el.textContent, rect.left + rect.width / 2, rect.top + rect.height / 2);
}

/* ==================== 交互 ==================== */
function correctRadius(radius) {
  const aspect = canvas.width / canvas.height;
  if (aspect > 1) radius *= aspect;
  return radius;
}

const state = { isHome: true, rafId: null, focusedActive: 0, focusedEl: null };

function splat(x, y, dx, dy, intensity) {
  const aspect = canvas.width / canvas.height;
  splatProgram.bind();
  gl.uniform1i(splatProgram.uniforms.uTarget, velocity.read.attach(0));
  gl.uniform1f(splatProgram.uniforms.aspectRatio, aspect);
  gl.uniform2f(splatProgram.uniforms.point, x, y);
  gl.uniform3f(splatProgram.uniforms.color, dx, dy, 0.0);
  gl.uniform1f(splatProgram.uniforms.radius, correctRadius(CONFIG.SPLAT_RADIUS / 100.0));
  blit(velocity.write);
  velocity.swap();
  // 染料注入：暗红色（--accent），归一化使 max(r,g,b) = intensity
  var aR = COLORS.accent[0], aG = COLORS.accent[1], aB = COLORS.accent[2];
  var maxC = Math.max(aR, aG, aB);
  gl.uniform1i(splatProgram.uniforms.uTarget, dye.read.attach(0));
  gl.uniform3f(splatProgram.uniforms.color,
    intensity * aR / maxC,
    intensity * aG / maxC,
    intensity * aB / maxC
  );
  blit(dye.write);
  dye.swap();
}

const pointer = { x: 0.5, y: 0.5, lastX: 0.5, lastY: 0.5, moved: false };
function updatePointer(clientX, clientY) {
  var cw = canvas.clientWidth, ch = canvas.clientHeight;
  if (cw === 0 || ch === 0) return;   // canvas 不可见（display:none）时跳过，避免除零产生 NaN 注入流体场
  pointer.lastX = pointer.x;
  pointer.lastY = pointer.y;
  pointer.x = clientX / cw;
  pointer.y = 1.0 - clientY / ch;
  pointer.moved = true;
}

// 真实鼠标/触摸移动即中止入场引导
var guideAborted = false;
function abortGuide() { guideAborted = true; }
window.addEventListener('mousemove', function(e) { abortGuide(); updatePointer(e.clientX, e.clientY); }, { passive: true });
window.addEventListener('touchstart', function(e) {
  abortGuide();
  lastTouchTime = performance.now();
  var cw = canvas.clientWidth, ch = canvas.clientHeight;
  if (cw === 0 || ch === 0) return;
  var t = e.touches[0];
  pointer.x = t.clientX / cw;
  pointer.y = 1.0 - t.clientY / ch;
  pointer.lastX = pointer.x;
  pointer.lastY = pointer.y;
}, { passive: true });
window.addEventListener('touchmove', function(e) {
  updatePointer(e.touches[0].clientX, e.touches[0].clientY);
}, { passive: true });

/* ==================== L5: 键盘可达性 ==================== */
// 区分键盘焦点与鼠标焦点：仅键盘 Tab 聚焦时才点亮元素，鼠标/触摸点击不触发常亮
var hadKeyboardEvent = false;
document.addEventListener('keydown', function(e) { if (e.key === 'Tab') hadKeyboardEvent = true; });
document.addEventListener('mousedown', function() { hadKeyboardEvent = false; });
document.addEventListener('touchstart', function() { hadKeyboardEvent = false; }, { passive: true });

// Tab 聚焦隐没元素时，仅点亮该元素（focusedMask 单独绘制，非全局 forceReveal）
document.addEventListener('focusin', function(e) {
  if (!hadKeyboardEvent) return; // 鼠标/触摸点击导致的 focus 不触发
  var el = e.target;
  if (!el || !el.classList || !el.classList.contains('conceal-text')) return;
  state.focusedEl = el;
  state.focusedActive = 1;
  buildFocusedMask(el);
});
// focusout 无条件清理：无论焦点来源如何，移走焦点即解除点亮
document.addEventListener('focusout', function(e) {
  var el = e.target;
  if (!el || !el.classList || !el.classList.contains('conceal-text')) return;
  state.focusedEl = null;
  state.focusedActive = 0;
  clearFocusedMask();
});

/* ==================== L5: 移动端两段式触摸 ==================== */
// 首次触摸落在隐没元素 = 擦拭显现（注入流体，不触发动作）；
// 元素已显现（2.5s 内再次触摸）时才执行原动作。
var lastTouchTime = 0;
var lastTouchReveal = {}; // 按元素标识记录最近一次显现时间
document.addEventListener('click', function(e) {
  // 仅拦截触摸派生的 click
  if (performance.now() - lastTouchTime > 600) return;
  var el = e.target.closest ? e.target.closest('.conceal-text') : null;
  if (!el) return;
  var key = el.getAttribute('data-page') || el.id || el.textContent.slice(0, 8);
  var now = performance.now();
  if (lastTouchReveal[key] && (now - lastTouchReveal[key]) < 2500) {
    // 已显现，放行原动作
    delete lastTouchReveal[key];
    return;
  }
  // 首次触摸：阻断动作，注入流体显现
  e.preventDefault();
  e.stopPropagation();
  lastTouchReveal[key] = now;
  var r = el.getBoundingClientRect();
  var x = (r.left + r.width / 2) / window.innerWidth;
  var y = 1 - (r.top + r.height / 2) / window.innerHeight;
  splat(x, y, 0, 0, CONFIG.DYE_INTENSITY * 1.5);
}, true);

/* ==================== L5: 入场引导（GUIDE_SWEEP） ==================== */
function delay(ms) { return new Promise(function(res) { setTimeout(res, ms); }); }

async function runGuideSweep() {
  if (!CONFIG.GUIDE_SWEEP || !CONFIG.LAYER_UI_CONCEAL) return;
  guideAborted = false;
  await delay(500); // 等页面/字体就绪
  if (guideAborted) return;

  // 1. 扫过导航栏
  var navLinks = document.querySelectorAll('.nav-link.conceal-text');
  for (var i = 0; i < navLinks.length; i++) {
    if (guideAborted) return;
    var r = navLinks[i].getBoundingClientRect();
    if (r.width === 0) continue;
    var x = (r.left + r.width / 2) / window.innerWidth;
    var y = 1 - (r.top + r.height / 2) / window.innerHeight;
    splat(x, y, 80, 0, CONFIG.DYE_INTENSITY * 1.3);
    await delay(90);
  }
  if (guideAborted) return;

  // 2. 扫过主页打印按钮（仅主页）
  var btn = document.getElementById('btn-print');
  if (btn && state.isHome) {
    var br = btn.getBoundingClientRect();
    if (br.width > 0) {
      var lastNav = navLinks[navLinks.length - 1];
      var nr = lastNav ? lastNav.getBoundingClientRect() : { left: window.innerWidth/2, top: window.innerHeight-60, width: 0, height: 0 };
      var startX = (nr.left + nr.width / 2) / window.innerWidth;
      var startY = 1 - (nr.top + nr.height / 2) / window.innerHeight;
      var endX = (br.left + br.width / 2) / window.innerWidth;
      var endY = 1 - (br.top + br.height / 2) / window.innerHeight;
      // 从导航移动到按钮
      for (var s = 0; s < 6; s++) {
        if (guideAborted) return;
        var t = s / 5;
        splat(startX + (endX - startX) * t, startY + (endY - startY) * t, 0, 90, CONFIG.DYE_INTENSITY * 1.1);
        await delay(55);
      }
      // 停顿微亮
      for (var p = 0; p < 4; p++) {
        if (guideAborted) return;
        splat(endX, endY, 0, 0, CONFIG.DYE_INTENSITY * 0.55);
        await delay(110);
      }
    }
  }
  // 引导结束，尾迹自然消散
}

/* ==================== L4: 打印联动 ==================== */
var printSplatInterval = null;
window.addEventListener('print-progress', function(e) {
  if (!CONFIG.LAYER_PRINT_LINK) return;
  if (e.detail.active) {
    if (printSplatInterval) return;
    printSplatInterval = setInterval(function() {
      var printer = document.getElementById('list-printer');
      if (!printer) return;
      var rect = printer.getBoundingClientRect();
      var x = (rect.left + rect.width * (0.3 + Math.random() * 0.4)) / window.innerWidth;
      var y = 1.0 - (rect.bottom + 10) / window.innerHeight;
      var dx = (Math.random() - 0.5) * 200;
      var dy = -250;
      splat(x, y, dx, dy, CONFIG.DYE_INTENSITY * 0.6);
    }, 80);
  } else {
    if (printSplatInterval) {
      clearInterval(printSplatInterval);
      printSplatInterval = null;
    }
  }
});

/* ==================== 主循环 ==================== */
var lastTime = performance.now();

function step(dt) {
  gl.disable(gl.BLEND);
  if (pointer.moved) {
    pointer.moved = false;
    var dx = (pointer.x - pointer.lastX) * CONFIG.SPLAT_FORCE;
    var dy = (pointer.y - pointer.lastY) * CONFIG.SPLAT_FORCE;
    splat(pointer.x, pointer.y, dx, dy, CONFIG.DYE_INTENSITY * (0.6 + Math.random() * 0.4));
  }
  advectionProgram.bind();
  gl.uniform1i(advectionProgram.uniforms.uVelocity, velocity.read.attach(0));
  gl.uniform1i(advectionProgram.uniforms.uSource, velocity.read.attach(0));
  gl.uniform2f(advectionProgram.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
  gl.uniform2f(advectionProgram.uniforms.dyeTexelSize, velocity.texelSizeX, velocity.texelSizeY);
  gl.uniform1f(advectionProgram.uniforms.dt, dt);
  gl.uniform1f(advectionProgram.uniforms.dissipation, CONFIG.VELOCITY_DISSIPATION);
  blit(velocity.write);
  velocity.swap();
  gl.uniform1i(advectionProgram.uniforms.uVelocity, velocity.read.attach(0));
  gl.uniform1i(advectionProgram.uniforms.uSource, dye.read.attach(1));
  gl.uniform2f(advectionProgram.uniforms.dyeTexelSize, dye.texelSizeX, dye.texelSizeY);
  gl.uniform1f(advectionProgram.uniforms.dissipation, CONFIG.DENSITY_DISSIPATION);
  blit(dye.write);
  dye.swap();
}

function render(time) {
  var dpr = Math.min(window.devicePixelRatio || 1, 2);
  displayProgram.bind();
  gl.uniform1i(displayProgram.uniforms.uTexture, dye.read.attach(0));
  gl.activeTexture(gl.TEXTURE1);
  gl.bindTexture(gl.TEXTURE_2D, textMaskTexture);
  gl.uniform1i(displayProgram.uniforms.uTextMask, 1);
  gl.activeTexture(gl.TEXTURE2);
  gl.bindTexture(gl.TEXTURE_2D, swapMaskTexture);
  gl.uniform1i(displayProgram.uniforms.uSwapMask, 2);
  gl.activeTexture(gl.TEXTURE3);
  gl.bindTexture(gl.TEXTURE_2D, uiMaskTexture);
  gl.uniform1i(displayProgram.uniforms.uUiMask, 3);
  gl.activeTexture(gl.TEXTURE4);
  gl.bindTexture(gl.TEXTURE_2D, focusedMaskTexture);
  gl.uniform1i(displayProgram.uniforms.uFocusedMask, 4);
  gl.uniform1f(displayProgram.uniforms.u_time, time);
  gl.uniform2f(displayProgram.uniforms.u_resolution, canvas.width, canvas.height);
  gl.uniform1f(displayProgram.uniforms.u_fluidAmount, 1.0);
  gl.uniform1f(displayProgram.uniforms.u_pixelRatio, dpr);
  var textActive = (state.isHome && CONFIG.LAYER_TEXT_MASK) ? 1.0 : 0.0;
  gl.uniform1f(displayProgram.uniforms.u_textMaskActive, textActive);
  gl.uniform1f(displayProgram.uniforms.u_textSwapActive, (state.isHome && CONFIG.L3_TEXT_SWAP) ? 1.0 : 0.0);
  gl.uniform1f(displayProgram.uniforms.u_uiConcealActive, CONFIG.LAYER_UI_CONCEAL ? 1.0 : 0.0);
  gl.uniform1f(displayProgram.uniforms.u_focusedActive, state.focusedActive);
  gl.uniform1f(displayProgram.uniforms.u_uiConcealMode, CONFIG.UI_CONCEAL_MODE === 'structure' ? 1.0 : 0.0);
  gl.uniform1f(displayProgram.uniforms.u_layerBase, CONFIG.LAYER_BASE ? 1.0 : 0.0);
  gl.uniform1f(displayProgram.uniforms.u_layerFluid, CONFIG.LAYER_FLUID ? 1.0 : 0.0);
  gl.uniform3fv(displayProgram.uniforms.u_bg, COLORS.bg);
  gl.uniform3fv(displayProgram.uniforms.u_bgDither, COLORS.bgDither);
  gl.uniform3fv(displayProgram.uniforms.u_paper, COLORS.paper);
  gl.uniform3fv(displayProgram.uniforms.u_accent, COLORS.accent);
  gl.uniform3fv(displayProgram.uniforms.u_accentLight, COLORS.accentLight);
  gl.uniform3fv(displayProgram.uniforms.u_heatOrange, COLORS.heatOrange);
  gl.uniform3fv(displayProgram.uniforms.u_heatYellow, COLORS.heatYellow);
  gl.uniform3fv(displayProgram.uniforms.u_leaf, COLORS.leaf);
  gl.uniform3fv(displayProgram.uniforms.u_leafDark, COLORS.leafDark);
  gl.uniform3fv(displayProgram.uniforms.u_text, COLORS.text);
  gl.uniform3fv(displayProgram.uniforms.u_uiTextColor, COLORS.uiTextColor);
  gl.uniform3fv(displayProgram.uniforms.u_uiTextHotColor, COLORS.uiTextHotColor);
  blit(null);
}

function frame(now) {
  var dt = Math.min((now - lastTime) / 1000, 0.0166);
  lastTime = now;
  step(dt);
  render(now / 1000);
  state.rafId = requestAnimationFrame(frame);
}

/* ==================== 自适应 ==================== */
function resize() {
  var dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width  = Math.floor(canvas.clientWidth  * dpr);
  canvas.height = Math.floor(canvas.clientHeight * dpr);
  initFramebuffers();
}

var resizeTimer;
window.addEventListener('resize', function() {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(function() {
    resize();
    buildTextMask();
    buildSwapMask();
    buildUiMask();
    if (state.focusedEl) buildFocusedMask(state.focusedEl);
  }, 150);
});

/* ==================== 可见性暂停 ==================== */
document.addEventListener('visibilitychange', function() {
  if (document.hidden) {
    if (state.rafId) { cancelAnimationFrame(state.rafId); state.rafId = null; }
  } else {
    if (!state.rafId) {
      lastTime = performance.now();
      state.rafId = requestAnimationFrame(frame);
    }
  }
});

/* ==================== 页面切换监听 ==================== */
var pageObserver = new MutationObserver(function() {
  var homeEl = document.getElementById('page-home');
  var isHome = homeEl && homeEl.classList.contains('active');
  state.isHome = isHome;
  if (isHome) {
    buildTextMask();
    buildSwapMask();
  }
  buildUiMask(); // 任何页面切换都重建 UI 蒙版（导航始终在；按钮随主页）
  if (state.focusedEl) buildFocusedMask(state.focusedEl);
});
var homeElForObs = document.getElementById('page-home');
if (homeElForObs) {
  pageObserver.observe(homeElForObs, { attributes: true, attributeFilter: ['class'] });
}

/* ==================== 字体加载后重建蒙版 ==================== */
if (document.fonts && document.fonts.ready) {
  document.fonts.ready.then(function() {
    buildTextMask();
    buildSwapMask();
    buildUiMask();
    if (state.focusedEl) buildFocusedMask(state.focusedEl);
  });
}

/* ==================== 初始化 ==================== */
function init() {
  refreshColors();
  resize();
  buildTextMask();
  buildSwapMask();
  buildUiMask();
  lastTime = performance.now();
  state.rafId = requestAnimationFrame(frame);
  runGuideSweep(); // 入场引导
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

/* ==================== 公开 API ==================== */
window.FluidBG = {
  CONFIG: CONFIG,
  refreshColors: refreshColors,
  rebuildMasks: function() { buildTextMask(); buildSwapMask(); buildUiMask(); if (state.focusedEl) buildFocusedMask(state.focusedEl); },
};

})();
