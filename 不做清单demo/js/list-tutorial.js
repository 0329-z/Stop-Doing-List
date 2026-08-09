/**
 * LIST 页新手引导 list-tutorial
 * 半透明遮罩 + 手影演示 + 用户实操，5 步顺序走完。
 * 监听 app.js 派发的 5 个 CustomEvent 判定放行，不逆向调用 app.js 内部函数。
 */
(function () {
'use strict';

var TUT_KEY = 'sdl_list_tutorial_v1';
var PAD = 8;

/* ---- 步骤文案（一字不改） ---- */
var TEXTS = [
  '点开这一条，单击文字，把它改得更具体——比如『不刷短视频』改成『不躺着刷短视频』，然后点绿对号保存',
  '按住删除线，从左滑到右，抹掉它——这条就算做到了。再点绿对号保存',
  '后悔了？再点开它，按住从右滑回左，删除线画回来——恢复未完成',
  '长按这张收据，往下滑——把它撕下来归档',
  '撕错了？长按它，往上滑——撤销归档'
];

/* ---- 状态 ---- */
var root, mTop, mBot, mLeft, mRight, cutout, ghost, ghostDot, ghostSvg, ghostLine, arrow, bubble, bubbleNum, bubbleText, bubbleReplay, bubbleNext, progressDots = [], skipBtn, doneCard, replayBtn;
var active = false;
var step = 0;          // 0..4
var phase = 'wall';    // 'wall' | 'zoom'
var originalText = ''; // 步骤1变更检测
var rafId = null;
var demo = null;       // 演示状态机
var demoStopped = false;
var reducedMotion = false;
var startDeferred = null;
var pointerListener = null;

/* ==================== DOM 构建 ==================== */
function buildDom() {
  root = document.createElement('div');
  root.id = 'list-tutorial-root';

  mTop = mk('div', 'lt-mask lt-m-top');
  mBot = mk('div', 'lt-mask lt-m-bottom');
  mLeft = mk('div', 'lt-mask lt-m-left');
  mRight = mk('div', 'lt-mask lt-m-right');
  cutout = mk('div', 'lt-cutout');

  ghost = mk('div', 'lt-ghost');
  ghostSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  ghostSvg.setAttribute('class', 'lt-ghost-svg');
  ghostLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
  ghostSvg.appendChild(ghostLine);
  ghostDot = mk('div', 'lt-ghost-dot');
  arrow = mk('div', 'lt-arrow');
  arrow.textContent = '↓';
  ghost.appendChild(ghostSvg);
  ghost.appendChild(ghostDot);
  ghost.appendChild(arrow);

  bubble = mk('div', 'lt-bubble');
  var head = mk('div', 'lt-bubble-head');
  bubbleNum = mk('span', 'lt-num');
  var prog = mk('div', 'lt-progress');
  for (var i = 0; i < 5; i++) {
    var d = mk('span', 'lt-dot');
    prog.appendChild(d);
    progressDots.push(d);
  }
  head.appendChild(bubbleNum);
  head.appendChild(prog);
  bubbleText = mk('div', 'lt-text');
  var actions = mk('div', 'lt-actions');
  bubbleReplay = mk('span', 'lt-replay');
  bubbleReplay.textContent = '再看一遍';
  bubbleNext = mk('button', 'lt-next');
  bubbleNext.textContent = '下一步 →';
  actions.appendChild(bubbleReplay);
  actions.appendChild(bubbleNext);
  bubble.appendChild(head);
  bubble.appendChild(bubbleText);
  bubble.appendChild(actions);

  skipBtn = mk('button', 'lt-skip');
  skipBtn.textContent = '跳过引导';

  doneCard = mk('div', 'lt-done');
  var mark = mk('div', 'lt-done-mark');
  mark.textContent = 'DONE';
  var dt = mk('div', 'lt-done-text');
  dt.textContent = '全部操作已解锁。这张清单，今天开始不做。';
  doneCard.appendChild(mark);
  doneCard.appendChild(dt);

  root.appendChild(mTop);
  root.appendChild(mBot);
  root.appendChild(mLeft);
  root.appendChild(mRight);
  root.appendChild(cutout);
  root.appendChild(ghost);
  root.appendChild(bubble);
  root.appendChild(skipBtn);
  root.appendChild(doneCard);
  document.body.appendChild(root);
  root.style.display = 'none';

  skipBtn.addEventListener('click', skip);
  bubbleReplay.addEventListener('click', replayDemo);
  bubbleNext.addEventListener('click', nextStep);
}

function mk(tag, cls) {
  var el = document.createElement(tag);
  if (cls) el.className = cls;
  return el;
}

function buildReplayBtn() {
  replayBtn = document.createElement('button');
  replayBtn.id = 'tutorial-replay';
  replayBtn.textContent = 'TUTORIAL';
  var pageList = document.getElementById('page-list');
  if (pageList) pageList.appendChild(replayBtn);
  replayBtn.addEventListener('click', function () {
    start(true);
  });
  syncReplayBtn();
}

function syncReplayBtn() {
  if (!replayBtn) return;
  var done = localStorage.getItem(TUT_KEY);
  replayBtn.classList.toggle('show', !!done && !active);
}

/* ==================== 触发逻辑 ==================== */
function maybeStart() {
  if (active) return;
  if (localStorage.getItem(TUT_KEY)) { syncReplayBtn(); return; }
  if (document.body.classList.contains('intro-pending')) {
    if (startDeferred) return;
    startDeferred = setInterval(function () {
      if (!document.body.classList.contains('intro-pending')) {
        clearInterval(startDeferred); startDeferred = null;
        maybeStart();
      }
    }, 300);
    return;
  }
  if (startDeferred) { clearInterval(startDeferred); startDeferred = null; }

  /* 仅在 LIST 页 */
  var pageList = document.getElementById('page-list');
  if (!pageList || !pageList.classList.contains('active')) return;

  /* 首张收据无非空条目才启动 */
  var target = firstNonEmptyItem();
  if (!target) return;

  /* 等出票/落纸动画结束：检测 .printing-out */
  var firstWrap = document.querySelector('#receipt-wall .receipt-wrap.printing-out');
  if (firstWrap) {
    var tries = 0;
    var w = setInterval(function () {
      if (!document.querySelector('#receipt-wall .receipt-wrap.printing-out') || tries > 35) {
        clearInterval(w);
        if (!active && !localStorage.getItem(TUT_KEY)) start(false);
      }
      tries++;
    }, 200);
  } else {
    setTimeout(function () { if (!active && !localStorage.getItem(TUT_KEY)) start(false); }, 300);
  }
}

/* ==================== 启动 / 终止 ==================== */
function start(isReplay) {
  if (active) return;
  if (!root) { buildDom(); buildReplayBtn(); }
  active = true;
  step = 0;
  phase = 'wall';
  originalText = '';
  root.style.display = '';
  skipBtn.style.display = '';
  doneCard.classList.remove('show');
  syncReplayBtn();
  enterStep(0);
  startTick();
}

function terminate(writeKey) {
  active = false;
  stopDemo();
  stopTick();
  if (pointerListener && pointerListener.el) {
    pointerListener.el.removeEventListener('pointerdown', pointerListener.fn, true);
    pointerListener = null;
  }
  if (root) {
    root.style.display = 'none';
    bubble.classList.remove('show');
    doneCard.classList.remove('show');
    skipBtn.style.display = 'none';
  }
  if (writeKey) localStorage.setItem(TUT_KEY, writeKey);
  syncReplayBtn();
}

function skip() {
  terminate('skipped');
}

/* ==================== 步骤管理 ==================== */
function enterStep(s) {
  step = s;
  phase = 'wall';
  bubbleNum.textContent = (s + 1) + ' / 5';
  bubbleText.textContent = TEXTS[s];
  for (var i = 0; i < 5; i++) progressDots[i].classList.toggle('active', i === s);
  bubble.classList.add('show');
  bubbleNext.classList.remove('show');

  if (s === 0) {
    var it = firstNonEmptyItem();
    originalText = it ? (it.querySelector('.receipt-item-text') || {}).value || '' : '';
  }
  setupStep(s, 'wall');
}

/* 步骤-阶段配置 */
function setupStep(s, ph) {
  stopDemo();
  var target = getTarget(s, ph);
  if (!target) {
    /* 重试 10 次 */
    var tries = 0;
    var w = setInterval(function () {
      if (!active) { clearInterval(w); return; }
      var t = getTarget(s, ph);
      if (t) { clearInterval(w); beginPhase(s, ph, t); }
      else if (++tries > 10) { clearInterval(w); nextStep(); }
    }, 300);
    return;
  }
  beginPhase(s, ph, target);
}

function beginPhase(s, ph, target) {
  phase = ph;
  attachPointerStop(target);
  startDemo(s, ph, target);
}

/* 目标元素解析 */
function getTarget(s, ph) {
  if (s < 3) {
    if (ph === 'wall') return firstNonEmptyItem();
    return document.querySelector('.item-zoom-bar');
  }
  if (s === 3) return document.querySelector('#receipt-wall .receipt-wrap:not(.archived)');
  if (s === 4) return document.querySelector('#receipt-wall .receipt-wrap.archived');
  return null;
}

/* ==================== 演示动画 ==================== */
function startDemo(s, ph, target) {
  demoStopped = false;
  ghostDot.style.opacity = '0';
  ghostLine.style.opacity = '0';
  arrow.style.display = 'none';

  if (reducedMotion) {
    /* 静态箭头指向目标中心 */
    demo = { type: 'static', target: target, staticEl: arrow };
    arrow.style.display = 'block';
    return;
  }

  var actions = demoActions(s, ph, target);
  if (!actions) return;
  demo = { actions: actions, idx: 0, phase: 'enter', phaseStart: 0, loopPause: 0, started: false };
}

function demoActions(s, ph, target) {
  if (s < 3 && ph === 'wall') {
    return [{ type: 'click', el: target }];
  }
  if (s === 0 && ph === 'zoom') {
    var txt = document.querySelector('.item-zoom-text');
    var chk = document.querySelector('.item-zoom-check');
    var arr = [];
    if (txt) arr.push({ type: 'click', el: txt });
    if (chk) arr.push({ type: 'click', el: chk });
    return arr.length ? arr : null;
  }
  if (s === 1 && ph === 'zoom') {
    var t = document.querySelector('.item-zoom-text');
    return t ? [{ type: 'slide', el: t, dir: 'right', dur: 1200, hold: 0 }] : null;
  }
  if (s === 2 && ph === 'zoom') {
    var t2 = document.querySelector('.item-zoom-text');
    return t2 ? [{ type: 'slide', el: t2, dir: 'left', dur: 1200, hold: 0 }] : null;
  }
  if (s === 3) {
    return [{ type: 'slide', el: target, dir: 'down', dur: 1500, hold: 600 }];
  }
  if (s === 4) {
    return [{ type: 'slide', el: target, dir: 'up', dur: 1500, hold: 600 }];
  }
  return null;
}

function centerOf(el) {
  var r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}

function slideEnds(el, dir) {
  var r = el.getBoundingClientRect();
  var midY = r.top + r.height / 2;
  if (dir === 'right') return { sx: r.left + 6, sy: midY, ex: r.right - 6, ey: midY };
  if (dir === 'left')  return { sx: r.right - 6, sy: midY, ex: r.left + 6, ey: midY };
  var c = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  if (dir === 'down') return { sx: c.x, sy: c.y, ex: c.x, ey: c.y + 120 };
  if (dir === 'up')   return { sx: c.x, sy: c.y, ex: c.x, ey: c.y - 120 };
  return { sx: c.x, sy: c.y, ex: c.x, ey: c.y };
}

function easeInOut(t) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }

function stopDemo() {
  demo = null;
  demoStopped = true;
  if (ghostDot) ghostDot.style.opacity = '0';
  if (ghostLine) ghostLine.style.opacity = '0';
  if (arrow) arrow.style.display = 'none';
}

function replayDemo() {
  if (!active) return;
  var target = getTarget(step, phase);
  if (target) startDemo(step, phase, target);
}

/* 演示更新（在 tick 内调用） */
function updateDemo(now) {
  if (!demo) return;
  if (demo.type === 'static') {
    var c = centerOf(demo.target);
    arrow.style.left = c.x + 'px';
    arrow.style.top = (c.y - 36) + 'px';
    return;
  }
  if (!demo.started) { demo.started = true; demo.phaseStart = now; demo.phase = 'enter'; }

  var act = demo.actions[demo.idx];
  if (!act) return;

  if (demo.phase === 'enter') {
    demo.phase = 'play';
    demo.phaseStart = now;
    if (act.type === 'click') {
      var p = centerOf(act.el);
      ghostDot.style.left = p.x + 'px';
      ghostDot.style.top = p.y + 'px';
      ghostDot.style.opacity = '0.85';
      ghostDot.style.transform = 'translate(-50%,-50%) scale(1)';
      ghostLine.style.opacity = '0';
    } else {
      var e = slideEnds(act.el, act.dir);
      ghostDot.style.left = e.sx + 'px';
      ghostDot.style.top = e.sy + 'px';
      ghostDot.style.opacity = '0.85';
      ghostLine.setAttribute('x1', e.sx); ghostLine.setAttribute('y1', e.sy);
      ghostLine.setAttribute('x2', e.ex); ghostLine.setAttribute('y2', e.ey);
      ghostLine.style.opacity = '0.6';
      demo.holdEnd = now + (act.hold || 0);
      demo.moveStart = null;
      demo.endHold = null;
    }
  }

  if (demo.phase === 'play') {
    var elapsed = now - demo.phaseStart;
    if (act.type === 'click') {
      /* 点击：fadeIn(200) → press(200) → release(200) → hold → fadeOut(300) → next */
      var cycle = 1600;
      var t = (elapsed % cycle) / cycle;
      var op, sc;
      if (t < 0.125) { op = 0.85 * (t / 0.125); sc = 1; }
      else if (t < 0.3) { op = 0.85; sc = 1 - 0.15 * ((t - 0.125) / 0.175); }
      else if (t < 0.45) { op = 0.85; sc = 0.85 + 0.15 * ((t - 0.3) / 0.15); }
      else if (t < 0.75) { op = 0.85; sc = 1; }
      else { op = 0.85 * (1 - (t - 0.75) / 0.25); sc = 1; }
      var cp = centerOf(act.el);
      ghostDot.style.left = cp.x + 'px';
      ghostDot.style.top = cp.y + 'px';
      ghostDot.style.opacity = op + '';
      ghostDot.style.transform = 'translate(-50%,-50%) scale(' + sc + ')';
      if (elapsed >= cycle) { demoPhaseEnd(now); }
    } else {
      /* 滑动：hold → move → holdEnd → fadeOut → next */
      if (now < demo.holdEnd) {
        /* 按压中 */
        var e0 = slideEnds(act.el, act.dir);
        ghostDot.style.left = e0.sx + 'px';
        ghostDot.style.top = e0.sy + 'px';
        ghostDot.style.transform = 'translate(-50%,-50%) scale(0.85)';
        ghostDot.style.opacity = '0.85';
      } else {
        if (!demo.moveStart) demo.moveStart = now;
        var mt = Math.min((now - demo.moveStart) / act.dur, 1);
        var eased = easeInOut(mt);
        var e1 = slideEnds(act.el, act.dir);
        var x = e1.sx + (e1.ex - e1.sx) * eased;
        var y = e1.sy + (e1.ey - e1.sy) * eased;
        ghostDot.style.left = x + 'px';
        ghostDot.style.top = y + 'px';
        ghostDot.style.transform = 'translate(-50%,-50%) scale(0.85)';
        ghostDot.style.opacity = '0.85';
        if (mt >= 1) {
          if (!demo.endHold) demo.endHold = now + 400;
          if (now >= demo.endHold) {
            /* fadeOut */
            var fo = Math.min((now - demo.endHold) / 200, 1);
            ghostDot.style.opacity = (0.85 * (1 - fo)) + '';
            ghostLine.style.opacity = (0.6 * (1 - fo)) + '';
            if (fo >= 1) { demoPhaseEnd(now); }
          }
        }
      }
    }
  }
}

function demoPhaseEnd(now) {
  demo.idx++;
  if (demo.idx >= demo.actions.length) {
    /* 演示播放完毕：停下等待用户实际操作，不循环 */
    stopDemo();
  } else {
    demo.phase = 'enter';
  }
}

/* ==================== 用户实操检测 ==================== */
function attachPointerStop(target) {
  if (pointerListener && pointerListener.el) {
    pointerListener.el.removeEventListener('pointerdown', pointerListener.fn, true);
  }
  var fn = function () { stopDemo(); };
  /* 用 capture 监听目标及其子树 */
  target.addEventListener('pointerdown', fn, true);
  pointerListener = { el: target, fn: fn };
}

/* ==================== 主循环 tick ==================== */
function startTick() {
  stopTick();
  rafId = requestAnimationFrame(tick);
}
function stopTick() {
  if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
}

function tick(now) {
  if (!active) return;
  /* 中断检测：离开 LIST 页 → 终止不写标记 */
  var pageList = document.getElementById('page-list');
  if (!pageList || !pageList.classList.contains('active')) {
    terminate(null);
    return;
  }
  reposition(now);
  if (demo) { updateDemo(now); }
  rafId = requestAnimationFrame(tick);
}

/* 重算镂空/气泡位置 */
function reposition(now) {
  var target = getTarget(step, phase);
  if (!target) return;
  var r = target.getBoundingClientRect();
  var top = r.top - PAD, left = r.left - PAD;
  var right = r.right + PAD, bottom = r.bottom + PAD;
  var W = window.innerWidth, H = window.innerHeight;

  /* 4 块遮罩 */
  mTop.style.top = '0'; mTop.style.height = Math.max(0, top) + 'px'; mTop.style.width = W + 'px';
  mBot.style.top = bottom + 'px'; mBot.style.height = Math.max(0, H - bottom) + 'px'; mBot.style.width = W + 'px';
  mLeft.style.top = top + 'px'; mLeft.style.left = '0'; mLeft.style.width = Math.max(0, left) + 'px'; mLeft.style.height = (bottom - top) + 'px';
  mRight.style.top = top + 'px'; mRight.style.left = right + 'px'; mRight.style.width = Math.max(0, W - right) + 'px'; mRight.style.height = (bottom - top) + 'px';

  /* 镂空描边 */
  cutout.style.left = left + 'px'; cutout.style.top = top + 'px';
  cutout.style.width = (right - left) + 'px'; cutout.style.height = (bottom - top) + 'px';

  /* 气泡：默认下方 16px，不足改上方 */
  var bw = bubble.offsetWidth || 320, bh = bubble.offsetHeight || 80;
  var bx, by;
  var belowSpace = H - bottom;
  if (belowSpace >= 120) {
    by = bottom + 16;
  } else {
    by = top - bh - 16;
    if (by < 8) by = 8;
  }
  bx = r.left + r.width / 2 - bw / 2;
  bx = Math.max(8, Math.min(bx, W - bw - 8));
  bubble.style.left = bx + 'px';
  bubble.style.top = by + 'px';
}

/* ==================== 事件判定 ==================== */
function onZoomOpened(detail) {
  if (!active) return;
  if (step < 3 && phase === 'wall') {
    /* 进入 zoom 阶段 */
    stopDemo();
    phase = 'zoom';
    var bar = document.querySelector('.item-zoom-bar');
    if (bar) {
      /* 首张收据无非空条目兜底已在外层处理；zoom 内重新绑定 */
      setTimeout(function () {
        if (!active || step >= 3) return;
        var b = document.querySelector('.item-zoom-bar');
        if (b) beginPhase(step, 'zoom', b);
      }, 250);
    }
  }
}

function onZoomCommitted(detail) {
  if (!active) return;
  var item = detail.item;
  if (step === 0) {
    if (item && String(item.text || '') !== originalText && String(item.text || '').trim()) {
      pass();
    }
    /* 否则保持当前步（用户未改文字），zoom 已关 → 回 wall 阶段等待重开 */
    else if (step === 0) {
      setTimeout(function () { if (active && step === 0) setupStep(0, 'wall'); }, 350);
    }
  } else if (step === 1) {
    if (item && item.finished === true) pass();
    else setTimeout(function () { if (active && step === 1) setupStep(1, 'wall'); }, 350);
  } else if (step === 2) {
    if (item && item.finished === false) pass();
    else setTimeout(function () { if (active && step === 2) setupStep(2, 'wall'); }, 350);
  }
}

function onArchived(detail) {
  if (!active) return;
  if (step === 3) pass();
}

function onUnarchived(detail) {
  if (!active) return;
  if (step === 4) pass();
}

function pass() {
  /* 成功反馈：镂空描边闪绿 + 显示「下一步」按钮等待用户点击 */
  cutout.classList.add('success');
  setTimeout(function () { cutout.classList.remove('success'); }, 300);
  bubbleNext.classList.add('show');
}

function nextStep() {
  if (step >= 4) {
    showDone();
  } else {
    enterStep(step + 1);
  }
}

function showDone() {
  stopDemo();
  if (pointerListener && pointerListener.el) {
    pointerListener.el.removeEventListener('pointerdown', pointerListener.fn, true);
    pointerListener = null;
  }
  mTop.style.height = '0'; mBot.style.height = '0'; mLeft.style.width = '0'; mRight.style.width = '0';
  cutout.style.width = '0'; cutout.style.height = '0';
  bubble.classList.remove('show');
  ghostDot.style.opacity = '0';
  ghostLine.style.opacity = '0';
  arrow.style.display = 'none';
  doneCard.classList.add('show');
  localStorage.setItem(TUT_KEY, 'done');
  setTimeout(function () {
    doneCard.classList.remove('show');
    terminate(null);
  }, 2400);
}

/* ==================== 目标查找 ==================== */
function firstNonEmptyItem() {
  var wraps = document.querySelectorAll('#receipt-wall .receipt-wrap:not(.archived)');
  for (var i = 0; i < wraps.length; i++) {
    var items = wraps[i].querySelectorAll('.receipt-item');
    for (var j = 0; j < items.length; j++) {
      var input = items[j].querySelector('.receipt-item-text');
      if (input && String(input.value || '').trim()) return items[j];
    }
  }
  return null;
}

/* ==================== 初始化 ==================== */
function init() {
  reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  buildDom();
  buildReplayBtn();

  window.addEventListener('sdl:wall-rendered', function () { if (active) reposition(0); else maybeStart(); });
  window.addEventListener('sdl:zoom-opened', function (e) { onZoomOpened(e.detail || {}); });
  window.addEventListener('sdl:zoom-committed', function (e) { onZoomCommitted(e.detail || {}); });
  window.addEventListener('sdl:archived', function (e) { onArchived(e.detail || {}); });
  window.addEventListener('sdl:unarchived', function (e) { onUnarchived(e.detail || {}); });

  window.addEventListener('resize', function () { if (active) reposition(0); });

  /* 首次加载触发检查 */
  setTimeout(maybeStart, 600);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
})();
