/**
 * 不做清单 · 导航像素圆点图标 (nav-pixel-icons.js)
 * 静止时显示白色像素圆点图标（替代隐藏的导航文字）；
 * 鼠标移动扰动时圆点散开+热成像变色，让位文字显现；
 * 停止移动且不在导航范围内 → 弹簧归位+褪色复白。
 *
 * 与 fluid-bg.js 的文字显现是同一 mousemove 驱动的两个并行结果，互不调用。
 * 依赖 <html>.fluid-active（WebGL 不可用时不启动，文字照常显示）。
 */
(function () {
'use strict';

// WebGL 不可用时（无 .fluid-active）不启动像素图标，文字照常显示
if (!document.documentElement.classList.contains('fluid-active')) return;

const canvas = document.getElementById('nav-icon-canvas');
if (!canvas) return;
const ctx = canvas.getContext('2d');

/* ==================== 形状数据（改 0/1 即可改形状，5 个图标暂共用此形状） ==================== */
const SHAPE = [
  '01110',
  '11111',
  '11111',
  '11111',
  '01110',
];

/* ==================== 参数 ==================== */
const CONFIG = {
  pixelSize: 3,          // 网格单元尺寸(px) —— 与背景 Bayer 抖动块对齐
  dotRadius: 1.2,        // 圆点半径(px)
  scatterDist: 60,       // 散开最大距离(px)
  scatterJitter: 0.45,   // 散开方向随机扰动
  repelRadius: 60,       // 鼠标排斥半径(px)
  repelPower: 40,        // 鼠标排斥强度(px)
  stiffness: 0.16,       // 弹簧刚度
  damping: 0.82,         // 阻尼
  hoverRampSpeed: 0.18,  // 散开强度升降速度
  ambientWave: 0.04,     // 随机微抖动
  scatterHeat: 0.35,     // 散开时额外加热
};

/* ==================== 热成像配色（复用参考文件 STOPS） ==================== */
const STOPS = [
  [0.00, [  6,  2, 28]],
  [0.12, [ 28,  8, 92]],
  [0.26, [ 55, 20,160]],
  [0.40, [ 20, 90,210]],
  [0.52, [  0,190,205]],
  [0.63, [ 40,225, 90]],
  [0.73, [210,235,  0]],
  [0.83, [255,150,  0]],
  [0.92, [255, 55, 20]],
  [1.00, [255,245,225]],
];
function thermal(t) {
  if (t <= 0) return STOPS[0][1];
  if (t >= 1) return STOPS[STOPS.length-1][1];
  for (let i = 1; i < STOPS.length; i++) {
    if (t <= STOPS[i][0]) {
      const [t0, c0] = STOPS[i-1];
      const [t1, c1] = STOPS[i];
      const k = (t - t0) / (t1 - t0);
      return [c0[0]+(c1[0]-c0[0])*k, c0[1]+(c1[1]-c0[1])*k, c0[2]+(c1[2]-c0[2])*k];
    }
  }
  return STOPS[STOPS.length-1][1];
}

/* ==================== Canvas 初始化 ==================== */
let DPR = 1, W = 0, H = 0;
function resize() {
  DPR = Math.min(window.devicePixelRatio || 1, 2);
  W = window.innerWidth; H = window.innerHeight;
  canvas.width = W * DPR; canvas.height = H * DPR;
  canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
}

/* ==================== 像素数据 ==================== */
let pixels = [];
let iconHover = [0,0,0,0,0];   // 每个图标的散开强度 0~1
let navRects = [];             // 5 个 .nav-link 的 boundingClientRect（缓存）
let firstLayout = true;

function buildPixels() {
  pixels = [];
  const rows = SHAPE.length;
  const cols = SHAPE[0].length;
  // 算质心
  let sx=0, sy=0, n=0;
  for (let r=0; r<rows; r++) for (let c=0; c<cols; c++) if (SHAPE[r][c]==='1') { sx+=c; sy+=r; n++; }
  const cx = n ? sx/n : cols/2;
  const cy = n ? sy/n : rows/2;
  const cells = [];
  for (let r=0; r<rows; r++) for (let c=0; c<cols; c++) {
    if (SHAPE[r][c]==='1') {
      const dxg=c-cx, dyg=r-cy, dg=Math.hypot(dxg,dyg)||0.0001;
      cells.push({r, c, dirx:dxg/dg, diry:dyg/dg});
    }
  }
  // 为 5 个图标各生成一份像素
  for (let idx=0; idx<5; idx++) {
    cells.forEach(({r,c,dirx,diry}) => {
      const ang = Math.atan2(diry,dirx) + (Math.random()-0.5)*CONFIG.scatterJitter*Math.PI;
      pixels.push({
        lr:r, lc:c, r:CONFIG.dotRadius, iconIdx:idx,
        ox:0, oy:0, px:0, py:0, vx:0, vy:0,
        dirx:Math.cos(ang), diry:Math.sin(ang),
        spread:0.7+Math.random()*0.6, heat:0,
      });
    });
  }
}

/* ==================== 布局：对齐 .nav-link 中心 ==================== */
function layout() {
  const navLinks = document.querySelectorAll('.nav-link');
  if (!navLinks.length) return;
  const ps = CONFIG.pixelSize;
  navRects = [];
  navLinks.forEach((link, idx) => {
    if (idx >= 5) return;
    const rect = link.getBoundingClientRect();
    navRects.push(rect);
    const cx = rect.left + rect.width/2;
    const cy = rect.top + rect.height/2;
    // 5×5 网格以 .nav-link 中心为基准居中排布
    const startX = cx - (SHAPE[0].length*ps)/2 + ps/2;
    const startY = cy - (SHAPE.length*ps)/2 + ps/2;
    for (const p of pixels) {
      if (p.iconIdx !== idx) continue;
      p.ox = startX + p.lc*ps;
      p.oy = startY + p.lr*ps;
    }
  });
  // 首次 layout 时初始化像素当前位置到原位（后续 layout 只更新原位，由弹簧拉回）
  if (firstLayout) {
    for (const p of pixels) { p.px = p.ox; p.py = p.oy; }
    firstLayout = false;
  }
}

/* ==================== 鼠标 ==================== */
let mouseActive = false;
let mouseX = -9999, mouseY = -9999;

window.addEventListener('mousemove', e => {
  mouseX = e.clientX; mouseY = e.clientY;
  mouseActive = true;
});
window.addEventListener('mouseleave', () => { mouseActive = false; });
window.addEventListener('mouseenter', () => { mouseActive = true; });
window.addEventListener('touchmove', e => {
  if (!e.touches[0]) return;
  mouseX = e.touches[0].clientX; mouseY = e.touches[0].clientY;
  mouseActive = true;
}, {passive:true});
window.addEventListener('touchend', () => { mouseActive = false; });

// 鼠标悬停哪个图标（用 .nav-link 的 boundingClientRect 判定，5 个图标互相独立）
function hitTestIcon() {
  if (!mouseActive) return -1;
  for (let i = 0; i < navRects.length; i++) {
    const r = navRects[i];
    if (mouseX >= r.left && mouseX <= r.right && mouseY >= r.top && mouseY <= r.bottom) {
      return i;
    }
  }
  return -1;
}

/* ==================== 动画循环 ==================== */
let t0 = performance.now();
function frame(now) {
  const dt = Math.min((now - t0)/16.67, 3);
  t0 = now;
  const time = now/1000;

  ctx.clearRect(0, 0, W, H);

  // 散开判定：鼠标在哪个 .nav-link 内，哪个图标散开（5 个互相独立）
  const hoverIdx = hitTestIcon();
  for (let i = 0; i < 5; i++) {
    const target = (i === hoverIdx) ? 1 : 0;
    iconHover[i] += (target - iconHover[i]) * CONFIG.hoverRampSpeed * dt;
    if (iconHover[i] < 0.001) iconHover[i] = 0;
    if (iconHover[i] > 1) iconHover[i] = 1;
  }

  const repelR = CONFIG.repelRadius;
  const repelR2 = repelR * repelR;
  const repelP = CONFIG.repelPower;

  for (let i=0; i<pixels.length; i++) {
    const p = pixels[i];
    const hover = iconHover[p.iconIdx];

    // 目标位置：原位 + 径向散开
    const dist = CONFIG.scatterDist * hover * p.spread;
    let tx = p.ox + p.dirx * dist;
    let ty = p.oy + p.diry * dist;

    // 鼠标排斥：鼠标附近的像素额外被推开（仅在鼠标悬停该图标时生效）
    if (hover > 0.01 && mouseActive) {
      const dx = p.px - mouseX, dy = p.py - mouseY;
      const d2 = dx*dx + dy*dy;
      if (d2 < repelR2 && d2 > 0.01) {
        const d = Math.sqrt(d2);
        const f = (1 - d/repelR) * repelP;
        tx += (dx/d) * f;
        ty += (dy/d) * f;
      }
    }

    // 弹簧 + 阻尼物理
    const ax = (tx - p.px) * CONFIG.stiffness;
    const ay = (ty - p.py) * CONFIG.stiffness;
    p.vx = (p.vx + ax) * CONFIG.damping;
    p.vy = (p.vy + ay) * CONFIG.damping;
    p.px += p.vx;
    p.py += p.vy;

    // 热度：静止=0(白)，散开/被鼠标加热→1(热成像色)
    const wave = (Math.sin(time*2 + (p.lr*0.6 + p.lc*0.4))*0.5+0.5) * CONFIG.ambientWave;
    let targetHeat = hover * CONFIG.scatterHeat + wave;
    if (hover > 0.01 && mouseActive) {
      const dx = p.px - mouseX, dy = p.py - mouseY;
      const d2 = dx*dx + dy*dy;
      if (d2 < repelR2) targetHeat += (1 - Math.sqrt(d2)/repelR) * 0.45;
    }
    targetHeat = Math.min(targetHeat, 1);
    // 升温快、降温稍慢
    const heatSpeed = targetHeat > p.heat ? 0.22 : 0.08;
    p.heat += (targetHeat - p.heat) * heatSpeed * dt;
    if (p.heat < 0) p.heat = 0;
    if (p.heat > 1) p.heat = 1;

    // 颜色：静止白(255,255,255)，散开→热成像色
    const hot = thermal(0.85);
    const k = p.heat;
    const cr = 255 + (hot[0]-255)*k;
    const cg = 255 + (hot[1]-255)*k;
    const cb = 255 + (hot[2]-255)*k;
    const a = 0.55 + p.heat*0.45;
    ctx.fillStyle = 'rgba(' + (cr|0) + ',' + (cg|0) + ',' + (cb|0) + ',' + a + ')';

    // 发光：有热度时
    if (p.heat > 0.2) {
      ctx.shadowColor = 'rgba(' + (cr|0) + ',' + (cg|0) + ',' + (cb|0) + ',0.9)';
      ctx.shadowBlur = 2 + p.heat*9;
    } else {
      ctx.shadowBlur = 0;
    }

    // 圆点：热度/散开时略放大
    const rad = p.r * (1 + p.heat*0.5 + hover*0.1);
    ctx.beginPath();
    ctx.arc(p.px, p.py, rad, 0, Math.PI*2);
    ctx.fill();
  }
  ctx.shadowBlur = 0;

  requestAnimationFrame(frame);
}

/* ==================== 初始化 ==================== */
function init() {
  resize();
  buildPixels();
  layout();

  window.addEventListener('resize', function() { resize(); layout(); });

  // ResizeObserver 监听 .top-nav：字体异步加载等导致 .nav-link 尺寸变化时重新对齐
  var topNav = document.querySelector('.top-nav');
  if (topNav && window.ResizeObserver) {
    new ResizeObserver(function() { layout(); }).observe(topNav);
  }
  // fonts.ready 兜底：Google Fonts 加载完成后重新测量
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(function() { layout(); });
  }

  requestAnimationFrame(frame);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

})();
