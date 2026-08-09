/**
 * 不做清单 · ARCHIVE 门后空间 · Roam (archive-space.js)
 * 门序列（闭门 → 敲门 → 开门 → 穿越飞入）+ 3D 漫游空间 + Roam/Browse 切换
 * 纯 CSS 3D（perspective + preserve-3d）+ 原生 JS，无外部依赖。
 *
 * 门位于 Roam 3D 场景内（相机前方 z=+520 平面），开门 = 门板绕右轴真实 rotateY 旋开，
 * 进门 = 相机 camZ 连续推进穿过门框——全程同一相机坐标系，零换帧、零跳切。
 *
 * 依赖（来自 app.js 全局）：formatDateUS / formatTime / escapeHtml
 * 模块对宿主仅暴露 window.ArchiveSpace = { enter, reset }
 *
 * 相机模型：相机固定原点看 -Z；通过反向变换 .roam-world 模拟视角。
 *   world.transform = rotateX(pitch) rotateY(yaw) translateZ(camZ)
 *   - yaw>0  = 视线右转（鼠标右移）  （world rotateY(+yaw)）
 *   - pitch>0= 视线下转（鼠标下移）  （world rotateX(+pitch)）
 *   - camZ>0 = 前进（世界向观察者拉近）
 */
(function () {
'use strict';

/* ==================== 配置中心 ==================== */
const ARCHIVE_CONFIG = {
  doorCss: {
    heightVh: 46, aspect: 0.54, thicknessPx: 12,
    panelColor: '#E8392A', panelBack: '#A81C10',
    frameColor: '#C02517', frameEdge: '#8F130B',
    knobDot: '#2A0A06', knobRing: '#8F130B',
    wayTop: '#120A06', wayBottom: '#070403',
    glowCore: 'rgba(255,170,80,0.5)', glowStartAt: 0.15,
  },
  door: {
    knockMs: 600, knockPauseMs: 300, knockAngle: 5, knockPeekAngle: 8,
    openMs: 1100, openAngle: -105, panelDarkenTo: 0.5,
    z: 520, flyStartAt: 0.55, flyMs: 1700, hideDoorAtZ: 515,
    fovBreath: false,
    hint: '轻点敲门', showHint: true, idleSway: true,
  },
  camera: { perspective: 1200, yawMax: 25, pitchMax: 15, lerp: 0.08,
            zMin: 0, zStart: 600, zMax: 16000,
            wheelDepthRatio: 0.22, wheelStepMin: 120, wheelStepMax: 2200 },
  layout: { zNear: 1200, zFar: 18000,
            coneFill: 0.75,
            coneFillX: 1.2,   // 水平散布额外放宽系数（1.0=不变；"一点点"建议 1.1~1.3）
            minGap: 400, maxTrials: 40, relaxFactor: 0.85,
            fadeStart: 800, fadeEnd: 15000, minOpacity: 0.05,
            cardCap: 366,
            floatAmpPx: 10, floatSecMin: 6, floatSecMax: 10 },
  card:   { width: 240, focusWidth: 336, focusDim: 0.55 },
  browse: {
    cardWidth: 200, cardWidthVw: 32,      // 整体缩小约 17%，移动端卡宽 = 32vw
    strideGap: 160,                       // stride = cardWidth + strideGap
    gapA: 28, gapB: 56,                   // 卡↔括号 / 括号↔标注（CSS 变量 --browse-gap-a/-b）
    braceScale: 1.3,                      // 括号高 ≈ 卡高 ×1.3
    previewOpacity: 0.22,                 // 括号外透明度下限
    snapMs: 450, snapEase: 'cubic-bezier(0.22,0.61,0.36,1)',
    inertiaFriction: 0.92, rubberBand: 0.35, clickSlopPx: 6,
    labelFadeMs: 250, windowSize: 3,
  },
};

/* ==================== 状态 ==================== */
let inited = false;
let roamStage, world, cardsEl, doorWrap, doorEl, doorPanel, doorWay, doorGlow;
let doorUi, doorYear, doorHint, roamEmpty, focusLayer, focusClose, dim;
let browseStage, modeSwitch;

let state = 'idle';      // idle | knocking | opening | flying | roam | focus | browse
let mode = 'roam';       // roam | browse
let doorOpen = false;    // 门序列是否已完成（空间已穿越）
let year = null;
let pendingArchives = [];
let cards = [];          // {wrap, card, data, index, x, y, z}

// 相机（当前值 + 目标值，每帧 lerp）
let yaw = 0, pitch = 0, camZ = 0;
let tYaw = 0, tPitch = 0, tCamZ = 0;
let rafId = null;

// 平移（拖拽控平移，视角恒正）
let panX = 0, panY = 0;         // 当前平移
let tPanX = 0, tPanY = 0;       // 目标平移

// 聚焦
let focusEl = null;
let focusSrc = null;
let focusTimer = null;

// 触控
let pinchDist = 0;
let pinchActive = false;

// ROAM 拖拽平移
let roamDragging = false;
let roamDragId = -1;
let roamDragStartX = 0, roamDragStartY = 0, roamDragStartPanX = 0, roamDragStartPanY = 0;

let reducedMotion = false;

// BROWSE 模块状态
let browseBuilt = false;       // DOM 是否已构建
let browseDirty = false;       // 数据已变，需重建
let browseTrack, browseBraceL, browseBraceR, browseLabelL, browseLabelR;
let browseCards = [];          // [{el, data, index}]
let browseIndex = 0;           // 当前居中卡索引
let browseStride = 0;
let browseCardW = 0;
let browseTrackX = 0;          // 当前轨道位移（px）
let browseTargetX = 0;         // 吸附目标
let browseVelocity = 0;        // 惯性速度（px/帧）
let browseDragging = false;
let browseDragStartX = 0, browseDragStartTrackX = 0, browseDragLastX = 0, browseDragLastT = 0;
let browseMoved = false;
let browseRafId = null;
let browseSnapping = false, browseSnapStartX = 0, browseSnapStartT = 0;
let browseLabelLCur = '', browseLabelRCur = '';

// 飞入时间线
let flyStartTs = 0, flyDuration = 0;
const flyEase = makeBezier(0.6, 0.04, 0.22, 1);

/* ==================== 初始化（懒加载，首次 enter 时挂监听） ==================== */
function init() {
  if (inited) return;
  inited = true;
  roamStage   = document.getElementById('archive-roam-stage');
  world       = document.getElementById('roam-world');
  cardsEl     = document.getElementById('roam-cards');
  doorWrap    = document.getElementById('roam-door-wrap');
  doorEl      = document.getElementById('roam-door');
  doorPanel   = document.getElementById('door-panel');
  doorWay     = doorEl.querySelector('.door-way');
  doorGlow    = doorEl.querySelector('.door-glow');
  doorUi      = document.getElementById('archive-door-ui');
  doorYear    = document.getElementById('archive-door-year');
  doorHint    = document.getElementById('archive-door-hint');
  roamEmpty   = document.getElementById('roam-empty');
  focusLayer  = document.getElementById('roam-focus-layer');
  focusClose  = document.getElementById('roam-focus-close');
  dim         = document.getElementById('roam-dim');
  browseStage = document.getElementById('archive-browse-stage');
  modeSwitch  = document.getElementById('archive-mode-switch');
  reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  doorEl.addEventListener('click', onDoorClick);
  doorEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onDoorClick(); }
  });
  modeSwitch.addEventListener('click', onModeSwitchClick);

  // 漫游：拖拽 = 平移；滚轮/捏合 = 进深；视角恒正
  roamStage.addEventListener('pointerdown', onRoamDown);
  roamStage.addEventListener('pointermove', onRoamMove);
  roamStage.addEventListener('pointerup', onRoamUp);
  roamStage.addEventListener('pointercancel', onRoamUp);
  roamStage.addEventListener('wheel', onWheel, { passive: false });
  roamStage.addEventListener('touchmove', onTouchMove, { passive: false });
  roamStage.addEventListener('touchend', onPinchEnd);
  roamStage.addEventListener('touchcancel', onPinchEnd);

  dim.addEventListener('click', closeFocus);

  window.addEventListener('resize', () => {
    if (!inited) return;
    // BROWSE 激活时重算布局
    if (mode === 'browse' && browseBuilt && browseCards.length) {
      const B = ARCHIVE_CONFIG.browse;
      const mobile = window.innerWidth < 768;
      browseCardW = mobile ? (window.innerWidth * B.cardWidthVw / 100) : B.cardWidth;
      browseStride = browseCardW + B.strideGap;
      browseCards.forEach((c, i) => {
        c.el.style.width = browseCardW + 'px';
        c.el.style.left = (i * browseStride) + 'px';
      });
      browseTrackX = -browseIndex * browseStride;
      browseTargetX = browseTrackX;
      browseTrack.style.transition = 'none';
      applyBrowseTransform();
      updateBrowseLayout();
      updateBrowseOpacity();
    }
  });
}

/* ==================== 对外接口 ==================== */
function enter(allArchives) {
  init();
  reset(false);
  // 隐藏首页按钮（归档页自带 ROAM/BROWSE 导航，不需要红 ×）
  const hb = document.getElementById('btn-home');
  if (hb) hb.style.display = 'none';
  // 过滤空收据：所有条目文字为空的收据在 ROAM/BROWSE 中不显示
  const hasContent = r => {
    const items = typeof nonEmptyItems === 'function' ? nonEmptyItems(r) : (r.items || []);
    return items.length > 0;
  };
  const nonEmpty = (allArchives || []).filter(hasContent);
  // 选年份：当前年；若当前年无归档则取最近有归档的年份
  const now = new Date().getFullYear();
  const years = [];
  nonEmpty.forEach(r => {
    const y = yearOf(r);
    if (y && !years.includes(y)) years.push(y);
  });
  year = years.includes(now) ? now : (years.length ? Math.max(...years) : now);
  doorYear.textContent = String(year);

  // 按年份过滤 + 最近归档优先 + 数量上限
  pendingArchives = nonEmpty
    .filter(r => yearOf(r) === year)
    .sort((a, b) => (b.archivedAt || 0) - (a.archivedAt || 0))
    .slice(0, ARCHIVE_CONFIG.layout.cardCap);

  buildRoam(pendingArchives);

  // 初始 UI：门序列就绪——显示门、门牌、敲门提示，门轻微摆动，等待用户敲门
  roamStage.classList.add('active');
  if (doorWrap) doorWrap.classList.add('idle-sway');
  if (doorHint) doorHint.classList.remove('hidden');
  if (doorUi) doorUi.classList.remove('hidden', 'hint-hidden');
  yaw = tYaw = 0; pitch = tPitch = 0;
  camZ = tCamZ = 0;        // 相机在原点，门在前方 z=520
  panX = tPanX = 0; panY = tPanY = 0;
  world.style.transform = '';
  roamStage.style.perspective = ARCHIVE_CONFIG.camera.perspective + 'px';
  browseStage.classList.remove('active');
  setMode('roam', true);
  state = 'idle';          // 等待用户敲门
  doorOpen = false;
  browseDirty = true;   // 数据可能已变，下次切到 BROWSE 时重建
}

function reset(full) {
  stopRaf();
  stopBrowseRaf();
  if (focusTimer) { clearTimeout(focusTimer); focusTimer = null; }
  if (focusEl && focusEl.parentNode) focusEl.parentNode.removeChild(focusEl);
  if (focusSrc && focusSrc.card) focusSrc.card.style.visibility = '';
  focusEl = null; focusSrc = null;
  if (cardsEl) cardsEl.innerHTML = '';
  cards = [];
  if (dim) dim.classList.remove('active');
  if (focusClose) focusClose.classList.remove('active');
  if (focusLayer) focusLayer.classList.remove('active');
  if (roamEmpty) roamEmpty.classList.remove('show');
  if (world) world.classList.remove('lighting');
  if (doorEl) doorEl.classList.remove('hidden', 'opening', 'entering');
  if (doorPanel) doorPanel.classList.remove('open', 'knocking');
  if (doorGlow) doorGlow.classList.remove('glowing');
  if (doorWrap) doorWrap.classList.remove('idle-sway');
  if (doorUi) doorUi.classList.remove('hidden', 'hint-hidden');
  if (roamStage) {
    roamStage.classList.remove('active');
    roamStage.style.perspective = ARCHIVE_CONFIG.camera.perspective + 'px';
  }
  if (browseStage) browseStage.classList.remove('active');
  browseTrackX = 0; browseTargetX = 0; browseVelocity = 0;
  browseDragging = false; browseSnapping = false; browseIndex = 0;
  yaw = tYaw = 0; pitch = tPitch = 0; camZ = tCamZ = 0;
  panX = tPanX = 0; panY = tPanY = 0;
  if (world) world.style.transform = '';
  doorOpen = false;
  state = 'idle';
  mode = 'roam';
  if (full && modeSwitch) {
    modeSwitch.querySelectorAll('.mode-item').forEach(el => {
      el.classList.toggle('active', el.dataset.mode === 'roam');
    });
  }
}
// 宿主离开归档页时调用：完全收回
function resetOnLeave() {
  reset(true);
  // 恢复首页按钮（enter 时隐藏）
  const hb = document.getElementById('btn-home');
  if (hb) hb.style.display = '';
}

/* ==================== 门序列 ==================== */
function onDoorClick() {
  if (state !== 'idle') return;   // 敲门期间忽略重复点击
  state = 'knocking';
  doorHint.classList.add('hidden');
  doorUi.classList.add('hint-hidden');
  doorWrap.classList.remove('idle-sway');
  // 重启星爆闪烁动画（门面不动）
  const burst = doorEl.querySelector('#knock-burst');
  if (burst) {
    burst.classList.remove('flash');
    void burst.offsetWidth;
    burst.classList.add('flash');
  }
  setTimeout(() => {
    if (burst) burst.classList.remove('flash');
    if (state !== 'knocking') return;   // 期间被 reset/切模式则中止
    setTimeout(startOpening, ARCHIVE_CONFIG.door.knockPauseMs);
  }, ARCHIVE_CONFIG.door.knockMs);
}

function startOpening() {
  if (state !== 'knocking') return;
  state = 'opening';
  doorEl.classList.add('entering');          // 整门放大渐隐（替代门板旋开）
  // 门内暖光在开门进度 glowStartAt 处渐亮（仪式核心）
  const glowDelay = ARCHIVE_CONFIG.door.openMs * ARCHIVE_CONFIG.doorCss.glowStartAt;
  setTimeout(() => { if (doorGlow && state === 'opening') doorGlow.classList.add('glowing'); }, glowDelay);
  // 开门进度到 flyStartAt 时相机起步（不等门开完，形成重叠）
  const flyStartDelay = ARCHIVE_CONFIG.door.openMs * ARCHIVE_CONFIG.door.flyStartAt;
  setTimeout(startFlying, flyStartDelay);
}

function startFlying() {
  if (state !== 'opening') return;
  state = 'flying';
  doorOpen = true;
  flyStartTs = performance.now();
  flyDuration = ARCHIVE_CONFIG.door.flyMs;
  // UI 覆盖层（年份/提示）随相机飞入淡出
  doorUi.classList.add('hidden');
  // 飞入期间逐帧写卡片 opacity，关闭过渡避免滞后
  world.classList.add('lighting');
  startRaf();
}

/* ==================== Roam 空间构建 ==================== */
function buildRoam(archives) {
  cardsEl.innerHTML = '';
  cards = [];
  if (!archives || archives.length === 0) {
    roamEmpty.textContent = '这一年的档案室空空如也 —— 去打印并归档一张清单';
    roamEmpty.classList.add('show');
    return;
  }
  roamEmpty.classList.remove('show');
  const L = ARCHIVE_CONFIG.layout;
  const P = ARCHIVE_CONFIG.camera.perspective;
  const vw = window.innerWidth, vh = window.innerHeight;

  // 视锥填充式散布 + 拒绝采样防重叠
  // 每个深度 z 上散布范围 = 该深度视锥半宽/半高 × coneFill
  const placed = [];   // 已放置卡片的 {x,y,z}
  archives.forEach((r, i) => {
    const wrap = document.createElement('div');
    wrap.className = 'roam-card-wrap';
    wrap.style.opacity = '0';   // 初始隐藏，由空气透视 + reveal 逐帧点亮
    const card = document.createElement('div');
    card.className = 'roam-card' + (reducedMotion ? '' : ' float');
    const inner = document.createElement('div');
    inner.className = 'roam-card-inner';
    inner.appendChild(buildReceiptDom(r, i));
    card.appendChild(inner);
    wrap.appendChild(card);

    // 拒绝采样：随机取点，与已放置卡片 3D 距离 ≥ minGap；超 maxTrials 则放宽 gap
    let gap = L.minGap, trials = 0;
    let x = 0, y = 0, z = L.zNear;
    while (true) {
      z = L.zNear + Math.random() * (L.zFar - L.zNear);
      const halfW = (z / P) * (vw / 2) * L.coneFill * (L.coneFillX || 1);
      const halfH = (z / P) * (vh / 2) * L.coneFill;
      x = (Math.random() * 2 - 1) * halfW;
      y = (Math.random() * 2 - 1) * halfH;
      let ok = true;
      for (let q = 0; q < placed.length; q++) {
        const p = placed[q];
        const dx = x - p.x, dy = y - p.y, dz = z - p.z;
        if (Math.sqrt(dx * dx + dy * dy + dz * dz) < gap) { ok = false; break; }
      }
      if (ok) break;
      if (++trials > L.maxTrials) { gap *= L.relaxFactor; trials = 0; }
    }
    placed.push({ x, y, z });

    // 漂浮相位/时长随机（仅 translateY 平移，无旋转分量）
    const dur = L.floatSecMin + Math.random() * (L.floatSecMax - L.floatSecMin);
    inner.style.animationDuration = dur.toFixed(2) + 's';
    inner.style.animationDelay = (-Math.random() * dur).toFixed(2) + 's';

    const obj = { wrap, card, data: r, index: i, x, y, z };
    cards.push(obj);
    applyCardTransform(obj);
    cardsEl.appendChild(wrap);
  });
}

function applyCardTransform(c) {
  // 卡片定位：中心对齐 world 原点(屏幕中心) + translate3d，无旋转（正面朝前、垂直地面）
  c.wrap.style.transform = `translate3d(${c.x}px, ${c.y}px, ${-c.z}px)`;
}

/* ==================== 收据卡片 DOM（独立组件 .roam-receipt，按模板 1:1 重建） ==================== */
function buildReceiptDom(receipt, index) {
  const el = document.createElement('div');
  el.className = 'roam-receipt';

  const brand = document.createElement('div'); brand.className = 'rr-brand';
  brand.textContent = 'STOP-DOING LIST'; el.appendChild(brand);

  const title = document.createElement('div'); title.className = 'rr-title';
  title.textContent = 'Day Receipt'; el.appendChild(title);

  const dt = document.createElement('div'); dt.className = 'rr-datetime';
  dt.textContent = formatDateUS(receipt.date) + ' · ' + formatTime(receipt.createdAt);
  el.appendChild(dt);

  const order = document.createElement('div'); order.className = 'rr-order';
  order.textContent = 'ORDER #' + String(receipt.orderNum || index + 1).padStart(4, '0');
  el.appendChild(order);

  const d1 = document.createElement('div'); d1.className = 'rr-divider'; el.appendChild(d1);

  const items = document.createElement('div'); items.className = 'rr-items';
  var shown = typeof nonEmptyItems === 'function' ? nonEmptyItems(receipt) : (receipt.items || []);
  shown.forEach((it, i) => {
    const row = document.createElement('div');
    row.className = 'rr-item' + (it.finished ? ' finished' : '');
    const idx = document.createElement('span'); idx.className = 'rr-item-index';
    idx.textContent = String(i + 1).padStart(2, '0');
    const txt = document.createElement('span'); txt.className = 'rr-item-text';
    // 固定"不"字前缀（纯展示层）；it.text 已以"不"开头时不重复加（防重复）
    const raw = it.text || '';
    txt.textContent = String(raw).startsWith('不') ? raw : '不' + raw;
    row.appendChild(idx); row.appendChild(txt);
    items.appendChild(row);
  });
  el.appendChild(items);

  const d2 = document.createElement('div'); d2.className = 'rr-divider'; el.appendChild(d2);

  const fin = shown.filter(i => i.finished).length;
  const tot = shown.length;
  const footer = document.createElement('div'); footer.className = 'rr-footer';
  footer.textContent = (fin === tot && tot > 0 ? 'GOOOOOD !' : 'HAVE A NICE DAY.');
  el.appendChild(footer);

  const bc = document.createElement('div'); bc.className = 'rr-barcode'; el.appendChild(bc);

  // 全部完成 → 印章标志（区分于其他归档收据）
  var _tot = shown.length;
  if (_tot > 0 && shown.every(function (it) { return it.finished; })) {
    var stamp = document.createElement('div');
    stamp.className = 'rr-stamp';
    stamp.textContent = 'Completed';
    el.appendChild(stamp);
  }

  return el;
}

/* ==================== 相机循环（飞入时间线 + 漫游 lerp） ==================== */
function startRaf() {
  if (rafId) return;
  const loop = () => {
    rafId = null;
    if (state === 'flying') {
      const elapsed = performance.now() - flyStartTs;
      const t = Math.min(elapsed / flyDuration, 1);
      const eased = flyEase(t);
      camZ = eased * ARCHIVE_CONFIG.camera.zStart;
      // 相机笔直进入，正视角（无摆动）
      yaw = 0; pitch = 0;
      // FOV 呼吸（默认关闭）
      if (ARCHIVE_CONFIG.door.fovBreath && !reducedMotion) {
        const breath = (1 - Math.cos(t * Math.PI * 2)) / 2;
        roamStage.style.perspective = (ARCHIVE_CONFIG.camera.perspective - breath * 100) + 'px';
      }
      // 相机越过门框平面后隐藏门（避免穿越后背面渲染 artifact）
      if (camZ > ARCHIVE_CONFIG.door.hideDoorAtZ) doorEl.classList.add('hidden');
      // 卡片随 reveal 整体渐次显现，叠加空气透视（远淡近清）
      updateCardOpacity(t);
      world.style.transform =
        'rotateX(0deg) rotateY(0deg) translateZ(' + camZ.toFixed(1) + 'px)';
      if (t >= 1) {
        // 落场 → 漫游：同帧交接相机控制权，无跳切
        state = 'roam';
        tYaw = 0; tPitch = 0;
        camZ = ARCHIVE_CONFIG.camera.zStart;
        tCamZ = ARCHIVE_CONFIG.camera.zStart;
        roamStage.style.perspective = ARCHIVE_CONFIG.camera.perspective + 'px';
        world.classList.remove('lighting'); // 恢复 opacity 过渡
        updateCardOpacity(1);               // reveal=1，纯空气透视
      }
    } else if (state === 'roam') {
      const lerp = ARCHIVE_CONFIG.camera.lerp;
      camZ  += (tCamZ - camZ) * lerp;
      panX  += (tPanX - panX) * lerp;
      panY  += (tPanY - panY) * lerp;
      // 视角恒正：仅平移 + 进深，无旋转
      world.style.transform =
        'translate(' + panX.toFixed(1) + 'px,' + panY.toFixed(1) + 'px) translateZ(' + camZ.toFixed(1) + 'px)';
      // camZ 变化时重算空气透视（远处随相机深入而变近变清）
      updateCardOpacity(1);
    }
    if (state === 'flying' || state === 'roam') {
      rafId = requestAnimationFrame(loop);
    }
  };
  rafId = requestAnimationFrame(loop);
}
function stopRaf() {
  if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
}

/* 空气透视：按卡片与相机的距离计算透明度，远处向背景淡出。
   reveal 为飞入期间的全局渐显因子（0→1），落场后恒为 1。 */
function updateCardOpacity(reveal) {
  const L = ARCHIVE_CONFIG.layout;
  for (let i = 0; i < cards.length; i++) {
    const c = cards[i];
    const rel = c.z - camZ;                                   // 卡片在相机前方的距离
    const k = clamp((rel - L.fadeStart) / (L.fadeEnd - L.fadeStart), 0, 1);
    const aerial = L.minOpacity + (1 - L.minOpacity) * Math.pow(1 - k, 1.6);
    c.wrap.style.opacity = (aerial * reveal).toFixed(3);
  }
}

/* ==================== 漫游输入 ==================== */
/* 视角恒正（yaw/pitch 始终 0），拖拽 = 平移；滚轮/捏合 = 进深 */

function onRoamDown(e) {
  if (state !== 'roam' || pinchActive) return;
  roamDragging = true;
  roamDragId = e.pointerId;
  roamDragStartX = e.clientX;
  roamDragStartY = e.clientY;
  roamDragStartPanX = tPanX;
  roamDragStartPanY = tPanY;
  try { roamStage.setPointerCapture(e.pointerId); } catch (_) {}
}

function onRoamMove(e) {
  if (!roamDragging || e.pointerId !== roamDragId) return;
  // 跟手平移：拖拽方向 = 世界平移方向
  const dx = e.clientX - roamDragStartX;
  const dy = e.clientY - roamDragStartY;
  tPanX = roamDragStartPanX + dx;
  tPanY = roamDragStartPanY + dy;
}

function onWheel(e) {
  if (state !== 'roam') return;
  e.preventDefault();
  const C = ARCHIVE_CONFIG.camera;
  // 滚轮步进随深度自适应：越深步越大，浅处仍精细
  const step = clamp(tCamZ * C.wheelDepthRatio, C.wheelStepMin, C.wheelStepMax);
  const delta = -Math.sign(e.deltaY) * step;   // 滚轮向下(δY+) = 后退
  tCamZ = clamp(tCamZ + delta, C.zMin, C.zMax);
}

function onRoamUp(e) {
  if (!roamDragging) return;
  roamDragging = false;
  roamDragId = -1;
}

function onTouchMove(e) {
  if (state !== 'roam') return;
  if (e.touches.length === 2) {
    e.preventDefault();
    pinchActive = true;
    roamDragging = false;   // 取消单指拖拽
    const C = ARCHIVE_CONFIG.camera;
    const d = pinchDistance(e.touches);
    if (pinchDist) {
      const delta = (d - pinchDist) * 1.5;
      tCamZ = clamp(tCamZ + delta, C.zMin, C.zMax);
    }
    pinchDist = d;
  }
}
function onPinchEnd() { pinchDist = 0; pinchActive = false; }
function pinchDistance(touches) {
  const dx = touches[0].clientX - touches[1].clientX;
  const dy = touches[0].clientY - touches[1].clientY;
  return Math.hypot(dx, dy);
}

/* ==================== 聚焦：飞到面前放大（轻量 FLIP） ==================== */
function openFocus(obj) {
  if (state !== 'roam') return;
  state = 'focus';
  stopRaf();
  const rect = obj.card.getBoundingClientRect();
  obj.card.style.visibility = 'hidden';   // 隐藏原卡，避免穿透

  const fc = document.createElement('div');
  fc.className = 'roam-focus-card';
  fc.appendChild(buildReceiptDom(obj.data, obj.index));
  focusLayer.appendChild(fc);
  focusEl = fc;
  focusSrc = obj;

  // 起始：原卡屏幕位置
  fc.style.left = rect.left + 'px';
  fc.style.top = rect.top + 'px';
  fc.style.width = rect.width + 'px';
  fc.style.transform = 'translate(0,0)';
  fc.style.transition = 'none';
  void fc.offsetWidth;
  fc.style.transition =
    'left 0.45s cubic-bezier(0.22,0.61,0.36,1),' +
    'top 0.45s cubic-bezier(0.22,0.61,0.36,1),' +
    'width 0.45s cubic-bezier(0.22,0.61,0.36,1),' +
    'transform 0.45s cubic-bezier(0.22,0.61,0.36,1)';
  // 目标：居中放大
  const fw = Math.min(ARCHIVE_CONFIG.card.focusWidth, window.innerWidth * 0.88);
  fc.style.left = (window.innerWidth / 2) + 'px';
  fc.style.top = (window.innerHeight / 2) + 'px';
  fc.style.width = fw + 'px';
  fc.style.transform = 'translate(-50%,-50%)';

  dim.classList.add('active');
  focusClose.classList.add('active');
  focusLayer.classList.add('active');
}

function closeFocus() {
  if (state !== 'focus' || !focusEl || !focusSrc) return;
  const obj = focusSrc;
  const fc = focusEl;
  const rect = obj.card.getBoundingClientRect();   // 原位（仍占布局）
  fc.style.left = rect.left + 'px';
  fc.style.top = rect.top + 'px';
  fc.style.width = rect.width + 'px';
  fc.style.transform = 'translate(0,0)';
  focusTimer = setTimeout(() => {
    if (fc.parentNode) fc.parentNode.removeChild(fc);
    obj.card.style.visibility = '';
    focusEl = null; focusSrc = null; focusTimer = null;
    dim.classList.remove('active');
    focusClose.classList.remove('active');
    focusLayer.classList.remove('active');
    state = 'roam';
    startRaf();
  }, 460);
}

/* ==================== Roam / Browse 切换 ==================== */
function onModeSwitchClick(e) {
  const item = e.target.closest('.mode-item');
  if (!item) return;
  setMode(item.dataset.mode, false);
}

function setMode(next, skip) {
  mode = next;
  modeSwitch.querySelectorAll('.mode-item').forEach(el => {
    el.classList.toggle('active', el.dataset.mode === next);
  });
  if (next === 'browse') {
    // 隐藏门与空间，激活 BROWSE 模块
    doorUi.classList.add('hidden');
    roamStage.classList.remove('active');
    browseStage.classList.add('active');
    stopRaf();
    enterBrowse();
    state = 'browse';
  } else {
    // ROAM
    stopBrowseRaf();
    browseStage.classList.remove('active');
    roamStage.classList.add('active');
    if (doorOpen) {
      // 已穿越：直接呈现漫游现场，不重播门序列（相机复位到 zStart）
      doorUi.classList.add('hidden');
      doorEl.classList.add('hidden');
      yaw = tYaw = 0; pitch = tPitch = 0;
      camZ = tCamZ = ARCHIVE_CONFIG.camera.zStart;
      world.classList.remove('lighting');
      updateCardOpacity(1);   // 按空气透视重算透明度
      state = 'roam';
      startRaf();
    } else {
      // 门尚未开：回到闭门态
      doorUi.classList.remove('hidden', 'hint-hidden');
      doorHint.classList.toggle('hidden', !ARCHIVE_CONFIG.door.showHint);
      doorEl.classList.remove('hidden', 'opening');
      doorPanel.classList.remove('open', 'knocking');
      if (doorGlow) doorGlow.classList.remove('glowing');
      doorWrap.classList.toggle('idle-sway', ARCHIVE_CONFIG.door.idleSway && !reducedMotion);
      stopRaf();
      yaw = tYaw = 0; pitch = tPitch = 0; camZ = tCamZ = 0;
      panX = tPanX = 0; panY = tPanY = 0;
      world.style.transform = '';
      roamStage.style.perspective = ARCHIVE_CONFIG.camera.perspective + 'px';
      for (const c of cards) c.wrap.style.opacity = '0';
      state = 'idle';
    }
  }
}

/* ==================== BROWSE 模块（水平卡片浏览器 · obys 复刻） ==================== */
/* 数据源 = pendingArchives（同年份、archivedAt 降序 = 最新归档优先）。
   DOM 全部由 JS 生成挂载到 #archive-browse-stage。空态全空。 */

function enterBrowse() {
  if (browseDirty || !browseBuilt) {
    buildBrowseDOM();
    browseDirty = false;
    browseBuilt = true;
  }
  if (browseCards.length === 0) return;   // 空态：舞台全空
  // 重置到第 0 张（最新归档）居中
  browseIndex = 0;
  browseTrackX = 0; browseTargetX = 0; browseVelocity = 0;
  browseSnapping = false; browseDragging = false;
  browseTrack.style.transition = 'none';
  browseTrack.style.transform = 'translateX(0)';
  updateBrowseWindow();
  updateBrowseOpacity();
  updateBrowseLabels(true);
  startBrowseRaf();
}

function buildBrowseDOM() {
  browseStage.innerHTML = '';
  browseCards = [];
  const B = ARCHIVE_CONFIG.browse;
  // 计算卡宽（移动端 46vw）
  const mobile = window.innerWidth < 768;
  browseCardW = mobile ? (window.innerWidth * B.cardWidthVw / 100) : B.cardWidth;
  browseStride = browseCardW + B.strideGap;

  // 空态：不渲染任何元素
  if (!pendingArchives || pendingArchives.length === 0) return;

  // CSS 变量：gap-a / gap-b
  browseStage.style.setProperty('--browse-gap-a', B.gapA + 'px');
  browseStage.style.setProperty('--browse-gap-b', B.gapB + 'px');

  // 轨道（卡片挂载其上，随 trackX 平移）
  browseTrack = document.createElement('div');
  browseTrack.className = 'browse-track';
  browseStage.appendChild(browseTrack);

  // 大括号对 + 左右标注（舞台直接子元素，不随轨道动）
  browseBraceL = document.createElement('div'); browseBraceL.className = 'browse-brace browse-brace-l';
  browseBraceL.textContent = '{';
  browseBraceR = document.createElement('div'); browseBraceR.className = 'browse-brace browse-brace-r';
  browseBraceR.textContent = '}';
  browseLabelL = document.createElement('div'); browseLabelL.className = 'browse-label browse-label-l';
  browseLabelR = document.createElement('div'); browseLabelR.className = 'browse-label browse-label-r';
  browseStage.appendChild(browseBraceL);
  browseStage.appendChild(browseBraceR);
  browseStage.appendChild(browseLabelL);
  browseStage.appendChild(browseLabelR);

  // 生成全部卡片占位（仅窗口内挂载真实 DOM）
  pendingArchives.forEach((r, i) => {
    const el = document.createElement('div');
    el.className = 'browse-card';
    el.style.width = browseCardW + 'px';
    el.style.left = (i * browseStride) + 'px';
    // data 暂存，挂载时再 buildReceiptDom
    browseCards.push({ el, data: r, index: i, mounted: false });
    browseTrack.appendChild(el);
  });

  // 事件：pointer 拖拽（统一鼠标/触控）
  browseStage.addEventListener('pointerdown', onBrowseDown);
  browseStage.addEventListener('pointermove', onBrowseMove);
  browseStage.addEventListener('pointerup', onBrowseUp);
  browseStage.addEventListener('pointercancel', onBrowseUp);

  // 时间轴：连续月份刻度（最早归档月 → 当前月），年刻度粗长、月刻度细短
  buildBrowseTimeline();

  updateBrowseLayout();
}

const BT_MONTHS = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
function buildBrowseTimeline() {
  const old = browseStage.querySelector('.browse-timeline');
  if (old) old.remove();
  if (!browseCards.length) return;   // 空态不渲染
  // 月份范围：最早归档月 → 当前月（连续）
  const first = browseCards[browseCards.length - 1].data;   // 最近优先排序 → 末尾为最早
  const start = new Date((first.date || '').slice(0, 7) + '-01');
  if (isNaN(start)) return;
  const now = new Date();
  const timeline = document.createElement('div');
  timeline.className = 'browse-timeline';
  // 刻度容器拦截 pointerdown，防触发 browseStage 拖拽
  timeline.addEventListener('pointerdown', function (e) { e.stopPropagation(); });
  const cur = new Date(start);
  while (cur <= now) {
    const y = cur.getFullYear(), m = cur.getMonth();   // m: 0-11
    const ym = y + '-' + String(m + 1).padStart(2, '0');
    const isYear = (m === 0) || (cur.getTime() === start.getTime());  // 每年1月或序列首月 = 年刻度
    const tick = document.createElement('div');
    tick.className = 'bt-tick' + (isYear ? ' bt-year' : '');
    tick.innerHTML = '<div class="bt-tip">' + (isYear ? String(y) : BT_MONTHS[m]) + '</div><div class="bt-line"></div>';
    tick.addEventListener('click', function () {
      const idx = browseCards.findIndex(c => String(c.data.date || '').slice(0, 7) === ym);
      if (idx >= 0) snapTo(idx);   // 现成的快速滚动定位
    });
    timeline.appendChild(tick);
    cur.setMonth(cur.getMonth() + 1);
  }
  browseStage.appendChild(timeline);
}

/* 计算括号与标注位置（resize 时重算）。
   括号宽度由实际渲染测量，确保 gap-a/gap-b 左右严格镜像。 */
function updateBrowseLayout() {
  if (!browseCards.length) return;
  const B = ARCHIVE_CONFIG.browse;
  const stageW = browseStage.clientWidth;
  const cx = stageW / 2;
  // 卡片左右边缘（stage-local）
  const cardLeft = cx - browseCardW / 2;
  const cardRight = cx + browseCardW / 2;
  // 先把括号移到 0 处测量实际渲染宽度
  browseBraceL.style.left = '0px';
  browseBraceR.style.left = '0px';
  const blW = browseBraceL.getBoundingClientRect().width;
  const brW = browseBraceR.getBoundingClientRect().width;
  // 左括号：右缘 = cardLeft - gapA → center = cardLeft - gapA - blW/2
  browseBraceL.style.left = (cardLeft - B.gapA - blW / 2) + 'px';
  // 右括号：左缘 = cardRight + gapA → center = cardRight + gapA + brW/2
  browseBraceR.style.left = (cardRight + B.gapA + brW / 2) + 'px';
  // 括号左/右边缘（stage-local）
  const braceLLeft = cardLeft - B.gapA - blW;
  const braceRRight = cardRight + B.gapA + brW;
  // 左标注：右对齐，右缘 = 左括号左缘 - gapB
  browseLabelL.style.right = (stageW - (braceLLeft - B.gapB)) + 'px';
  // 右标注：左对齐，左缘 = 右括号右缘 + gapB
  browseLabelR.style.left = (braceRRight + B.gapB) + 'px';
}

/* 窗口化渲染：仅挂载当前 ±windowSize */
function updateBrowseWindow() {
  const B = ARCHIVE_CONFIG.browse;
  const lo = Math.max(0, browseIndex - B.windowSize);
  const hi = Math.min(browseCards.length - 1, browseIndex + B.windowSize);
  for (const c of browseCards) {
    if (c.index >= lo && c.index <= hi) {
      if (!c.mounted) {
        c.el.appendChild(buildReceiptDom(c.data, c.index));
        c.mounted = true;
      }
      c.el.style.display = '';
    } else if (c.mounted) {
      // 卸载（保留壳，避免索引位移）
      c.el.innerHTML = '';
      c.mounted = false;
      c.el.style.display = 'none';
    }
  }
}

/* 透明度插值：d = 卡心距中线的水平距离 */
function updateBrowseOpacity() {
  const B = ARCHIVE_CONFIG.browse;
  const cx = browseStage.clientWidth / 2;
  for (const c of browseCards) {
    if (!c.mounted) continue;
    // 卡心屏幕 x = stageW/2 + i*stride + trackX
    const cardCenterX = cx + c.index * browseStride + browseTrackX;
    const d = Math.abs(cardCenterX - cx);
    const op = 1 - (1 - B.previewOpacity) * clamp(d / browseStride, 0, 1);
    c.el.style.opacity = op.toFixed(3);
  }
}

/* 标注更新：交叉淡换 */
function updateBrowseLabels(instant) {
  if (!browseCards.length) return;
  const r = browseCards[browseIndex].data;
  const leftText = formatDateUS(r.date);
  const savedMin = (r.items || []).filter(i => i.finished)
    .reduce((s, it) => s + estimateSavedMinutes(it.text), 0);
  const hours = savedMin / 60;
  const rightText = '预计节省 ' + formatHours(hours) + ' 小时';
  if (instant || browseLabelLCur === '') {
    browseLabelL.textContent = leftText;
    browseLabelR.textContent = rightText;
    browseLabelLCur = leftText;
    browseLabelRCur = rightText;
  } else if (leftText !== browseLabelLCur || rightText !== browseLabelRCur) {
    fadeSwapLabel(browseLabelL, browseLabelLCur, leftText);
    fadeSwapLabel(browseLabelR, browseLabelRCur, rightText);
    browseLabelLCur = leftText;
    browseLabelRCur = rightText;
  }
}
function fadeSwapLabel(el, oldText, newText) {
  const B = ARCHIVE_CONFIG.browse;
  const ms = reducedMotion ? 0 : B.labelFadeMs;
  if (ms === 0) { el.textContent = newText; return; }
  // 双层交叉淡换：旧上移淡出，新下移淡入
  const old = document.createElement('span'); old.className = 'browse-label-old';
  old.textContent = oldText;
  const cur = document.createElement('span'); cur.className = 'browse-label-new';
  cur.textContent = newText;
  el.innerHTML = '';
  el.appendChild(old); el.appendChild(cur);
  // 强制重排后触发过渡
  void el.offsetWidth;
  old.style.transform = 'translateY(-6px)'; old.style.opacity = '0';
  cur.style.transform = 'translateY(0)'; cur.style.opacity = '1';
  setTimeout(() => { if (el.firstChild) el.textContent = newText; }, ms);
}
function formatHours(h) {
  // 保留 1 位小数并去尾零：1.5→"1.5"、3.0→"3"、0→"0"
  const v = Math.floor(h * 10) / 10;
  return String(v);
}

/* ---- 拖拽 ---- */
function onBrowseDown(e) {
  if (browseCards.length === 0) return;
  browseDragging = true;
  browseMoved = false;
  browseDragStartX = e.clientX;
  browseDragLastX = e.clientX;
  browseDragStartTrackX = browseTrackX;
  browseDragLastT = performance.now();
  browseVelocity = 0;
  browseSnapping = false;
  browseStage.style.cursor = 'grabbing';
  browseTrack.style.transition = 'none';
  try { browseStage.setPointerCapture(e.pointerId); } catch (_) {}
}
function onBrowseMove(e) {
  if (!browseDragging) return;
  const dx = e.clientX - browseDragStartX;
  if (Math.abs(dx) > ARCHIVE_CONFIG.browse.clickSlopPx) browseMoved = true;
  let nx = browseDragStartTrackX + dx;
  // 过界橡皮筋
  const minx = -(browseCards.length - 1) * browseStride;
  if (nx > 0) nx = nx * ARCHIVE_CONFIG.browse.rubberBand;
  else if (nx < minx) nx = minx + (nx - minx) * ARCHIVE_CONFIG.browse.rubberBand;
  browseTrackX = nx;
  // 速度采样
  const now = performance.now();
  const dt = now - browseDragLastT;
  if (dt > 0) browseVelocity = (e.clientX - browseDragLastX) / dt * 16;  // px/帧
  browseDragLastX = e.clientX; browseDragLastT = now;
  applyBrowseTransform();
  updateBrowseOpacity();
  // 拖拽中实时更新当前 index（用于窗口挂载）
  const idx = clamp(Math.round(-browseTrackX / browseStride), 0, browseCards.length - 1);
  if (idx !== browseIndex) { browseIndex = idx; updateBrowseWindow(); updateBrowseLabels(false); }
}
function onBrowseUp(e) {
  if (!browseDragging) return;
  browseDragging = false;
  browseStage.style.cursor = 'grab';
  try { browseStage.releasePointerCapture(e.pointerId); } catch (_) {}
  if (!browseMoved) {
    // 点击：命中卡片则跳转
    const target = e.target.closest('.browse-card');
    if (target) {
      const idx = browseCards.findIndex(c => c.el === target);
      if (idx >= 0 && idx !== browseIndex) snapTo(idx);
    }
    return;
  }
  // 惯性 + 吸附
  startInertia();
}

function snapTo(idx) {
  browseIndex = clamp(idx, 0, browseCards.length - 1);
  browseTargetX = -browseIndex * browseStride;
  browseSnapping = true;
  browseSnapStartX = browseTrackX;
  browseSnapStartT = performance.now();
  browseTrack.style.transition = 'none';
  browseVelocity = 0;
  startBrowseRaf();
}

function startInertia() {
  // 落点预测 = 当前 + 速度外推，吸附到最近卡位
  const pred = browseTrackX + browseVelocity * 8;   // 外推 ~8 帧
  let idx = Math.round(-pred / browseStride);
  idx = clamp(idx, 0, browseCards.length - 1);
  snapTo(idx);
}

function applyBrowseTransform() {
  browseTrack.style.transform = 'translateX(' + browseTrackX.toFixed(2) + 'px)';
}

/* ---- rAF：惯性 + 吸附动画 ---- */
function startBrowseRaf() {
  if (browseRafId) return;
  const loop = () => {
    browseRafId = null;
    if (state !== 'browse') return;
    if (browseSnapping) {
      const B = ARCHIVE_CONFIG.browse;
      const ms = reducedMotion ? 120 : B.snapMs;
      const t = Math.min((performance.now() - browseSnapStartT) / ms, 1);
      const eased = browseSnapEase(t);
      browseTrackX = browseSnapStartX + (browseTargetX - browseSnapStartX) * eased;
      applyBrowseTransform();
      updateBrowseOpacity();
      const idx = clamp(Math.round(-browseTrackX / browseStride), 0, browseCards.length - 1);
      if (idx !== browseIndex) { browseIndex = idx; updateBrowseWindow(); updateBrowseLabels(false); }
      if (t >= 1) {
        browseSnapping = false;
        browseTrackX = browseTargetX;
        applyBrowseTransform();
      }
    }
    if (browseSnapping) browseRafId = requestAnimationFrame(loop);
  };
  browseRafId = requestAnimationFrame(loop);
}
function stopBrowseRaf() {
  if (browseRafId) { cancelAnimationFrame(browseRafId); browseRafId = null; }
  browseSnapping = false;
}
/* snapEase 求值器（cubic-bezier(0.22,0.61,0.36,1)） */
const browseSnapEase = makeBezier(0.22, 0.61, 0.36, 1);

/* ==================== 工具 ==================== */
function yearOf(r) {
  const d = r.date || (r.createdAt ? new Date(r.createdAt).toISOString().slice(0, 10) : null);
  if (!d) return null;
  const y = parseInt(String(d).slice(0, 4), 10);
  return isNaN(y) ? null : y;
}
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

/* cubic-bezier 求值器：给定进度 x∈[0,1]，返回 y（用于飞入 camZ 缓动） */
function makeBezier(x1, y1, x2, y2) {
  function sampleX(t) { return 3*(1-t)*(1-t)*t*x1 + 3*(1-t)*t*t*x2 + t*t*t; }
  function sampleY(t) { return 3*(1-t)*(1-t)*t*y1 + 3*(1-t)*t*t*y2 + t*t*t; }
  return function(x) {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let lo = 0, hi = 1, t = x;
    for (let i = 0; i < 24; i++) {
      const sx = sampleX(t);
      if (Math.abs(sx - x) < 1e-4) break;
      if (sx < x) lo = t; else hi = t;
      t = (lo + hi) / 2;
    }
    return sampleY(t);
  };
}

/* ==================== 导出 ==================== */
window.ArchiveSpace = { enter, reset: resetOnLeave };

})();
