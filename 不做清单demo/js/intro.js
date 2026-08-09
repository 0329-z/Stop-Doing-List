/**
 * 不做清单 · 首次启动交互序列 (intro.js)
 * 分阶段状态机：ChatStage → CursorMaximizeStage → StrikeRevealStage → TransitionStage
 * 每阶段实现 mount/play/teardown，仅通过共享 IntroContext 通信。
 * 所有可调参数集中在顶部 INTRO_CONFIG。过渡阶段(TransitionStage)可整体替换。
 */
(function () {
'use strict';

/* ==================== 集中配置（改效果只动这里） ==================== */
const INTRO_CONFIG = {
  // 注：每次打开网站都播放，不再用 storageKey 做首次门控（保留字段供 reduced-motion 跳过用）
  storageKey: 'hasSeenIntro',
  chat: {
    // 放慢节奏：typing → 滑入 → hold(阅读) → 下一条；总聊天段约 12s
    typingMs: 470, slideMs: 350, gapMs: 80, holdMs: 1200, rightTypingMs: 1500,
    modalEnterMs: 450, // 弹窗入场时长
    // 每条消息可选 avatarImg(URL) 字段；存在时渲染 <img> 覆盖 emoji avatar
    messages: [
      { avatar: '😺', name: '老子',         avatarImg: 'assets/avatar_laozi.png',   text: '为学日益，为道日损。损之又损，以至于无为，无为而无不为。' },
      { avatar: '🦉', name: '段永平',       avatarImg: 'assets/avatar_duan.png',    text: '最重要的是不做什么。', nowrap: true },
      { avatar: '🦉', name: '史蒂夫·乔布斯', avatarImg: 'assets/avatar_jobs.png',    text: 'Totally. Focusing is about saying no.', nowrap: true },
      { avatar: '🦉', name: '沃伦·巴菲特',   avatarImg: 'assets/avatar_buffett.png', text: "We'd rather miss 100 good opportunities than make one big mistake." },
    ],
  },
  // 第一幕→第二幕衔接：虚拟光标点击最大化按钮 → 弹窗全屏化 → 渐变为纯白
  cursorClick: {
    fadeInMs: 200, moveMs: 650, arcPx: 40, pressMs: 120,
    expandMs: 550, whitenMs: 400, fadeOutMs: 200,
    ease: 'cubic-bezier(0.22,0.61,0.36,1)',
  },
  // 第二幕：白底黑字 + 删除线揭示交互
  // ★ 大字与 HOME 的 B 层文字（fluid-bg.js buildSwapMask）同位同字体：
  //   运行时读取 .brand-title 的 rect 中心 + computed font，文本 = "STOP-DOING LIST"。
  strike: {
    bgColor: '#FFFFFF', textColor: '#000000',
    thicknessRatio: 0.035,     // 删除线宽 = fontSize × 0.035（原 0.07 的 50%）
    yOffsetRatio: 0.04,        // 删除线 y = cy - fontSize × 0.04
    extendPx: 15,              // 删除线左右各往文字外延伸 15px
    bandHeightRatio: 1.0,      // 触发带高 = 字形高 × 1.0
    bandPadX: 32,              // 触发带水平外延 px
    hiddenLetters: ['S','P','-','I','N','G'],  // 顺序匹配，各匹配一次
    snapTolerancePx: 2,
    hint: '长按并沿删除线从左向右拖动',
  },
  // 结束序列：停留 → 故障闪现 ×2 → 过渡到主页
  finish: {
    holdMs: 1200, flashCount: 2, flashMs: 150,
    flashGapMs: 130, flashIntensity: 0.65, fadeOutMs: 250,
  },
};

/* ==================== 共享 IntroContext ==================== */
function createCtx(overlay) {
  const ctx = {
    overlay,
    config: INTRO_CONFIG,
    shared: {           // 跨阶段复用的元素引用，由产生它的阶段挂入，后续阶段读取
      chatLayer: null,    // Stage1 产出（弹窗），Stage2 改造为全屏白底
      whiteBg: null,      // Stage2 产出（纯白全屏层），Stage3 底层
      sceneSharp: null,   // Stage3 产出（最终揭示态画布），Stage4 故障源
    },
    signal: { skipped: false, aborted: false, skipToStrike: false },
    timers: new Set(),
    _waitResolvers: new Set(),
    _skipResolvers: [],
    /* config 驱动的延时；SKIP 时可被一并 resolve 以快速收尾 */
    wait(ms) {
      return new Promise((resolve) => {
        const t = setTimeout(() => {
          ctx.timers.delete(t);
          ctx._waitResolvers.delete(resolve);
          resolve();
        }, ms);
        ctx.timers.add(t);
        ctx._waitResolvers.add(resolve);
      });
    },
  };
  ctx.skippedPromise = new Promise((r) => ctx._skipResolvers.push(r));
  return ctx;
}

/* ==================== 调度器 ==================== */
const STAGES = []; // 顺序注入：ChatStage, CursorMaximizeStage, StrikeRevealStage, TransitionStage

async function runSequencer(ctx) {
  for (let i = 0; i < STAGES.length; i++) {
    ctx._stageIndex = i;
    if (jumpToStrike(ctx)) { i = 1; continue; }   // i++ → 2 = StrikeRevealStage
    if (ctx.signal.skipped) return;
    const stage = STAGES[i];
    try {
      if (stage.mount) await stage.mount(ctx);
      if (jumpToStrike(ctx)) { i = 1; continue; }
      if (ctx.signal.skipped) return;
      if (stage.play) await stage.play(ctx);
      if (jumpToStrike(ctx)) { i = 1; continue; }
      if (ctx.signal.skipped) return;
      if (stage.teardown) stage.teardown(ctx);
    } catch (err) {
      console.warn('[intro] stage error:', err);
      if (!ctx.signal.skipped) finalize(ctx);
      return;
    }
  }
}

/* 第一跳：skipToStrike 置位时，清理第一幕 DOM、复位 skipped，让循环跳到 StrikeRevealStage */
function jumpToStrike(ctx) {
  if (!ctx.signal.skipToStrike) return false;
  ctx.signal.skipToStrike = false;
  ctx.signal.skipped = false;        // 复位：让后续 StrikeRevealStage 正常运行
  cleanupPhase1Dom(ctx);
  return true;
}

/* 清理第一幕遗留 DOM：聊天弹窗 + 光标元素，避免压在白底画布上 */
function cleanupPhase1Dom(ctx) {
  if (ctx.shared.chatLayer && ctx.shared.chatLayer.parentNode) ctx.shared.chatLayer.remove();
  if (ctx._cursor && ctx._cursor.parentNode) ctx._cursor.remove();
  ctx.shared.chatLayer = null;
  ctx.shared.whiteBg = null;
}

/* ==================== 收尾 / SKIP ==================== */
function finalize(ctx) {
  // 每次打开都播放，不再写 localStorage
  const home = document.getElementById('page-home');
  if (home && !home.classList.contains('active')) home.classList.add('active');
  const overlay = ctx.overlay;
  if (!overlay || !overlay.parentNode) { setChromeHidden(false); return; }
  overlay.style.transition = 'opacity 300ms ease-out';
  overlay.style.opacity = '0';
  setTimeout(() => {
    if (overlay.parentNode) overlay.remove();
    document.body.classList.remove('intro-pending'); // intro 结束，恢复主页可见
    setChromeHidden(false);            // overlay 移除后恢复导航栏
  }, 340);
}

function skipIntro(ctx) {
  if (ctx.signal.skipped) return;   // 正在收尾中（第二跳已触发），忽略
  // 第一跳：ChatStage(0) / CursorMaximizeStage(1) 期间 → 跳到 StrikeRevealStage 初始态
  var idx = ctx._stageIndex;
  if (idx === 0 || idx === 1) {
    ctx.signal.skipToStrike = true;
    ctx.signal.skipped = true;          // 让当前阶段的 await 检查尽快 bail（jumpToStrike 会复位）
    ctx.timers.forEach((t) => clearTimeout(t));
    ctx.timers.clear();
    ctx._waitResolvers.forEach((r) => r());
    ctx._waitResolvers.clear();
    // 不 resolve skippedPromise —— StrikeRevealStage 仍需等待手动揭示
    return;
  }
  // 第二跳：StrikeRevealStage(2) / TransitionStage(3) 期间 → 直接进主页
  ctx.signal.skipped = true;
  ctx.timers.forEach((t) => clearTimeout(t));
  ctx.timers.clear();
  ctx._waitResolvers.forEach((r) => r());
  ctx._waitResolvers.clear();
  ctx._skipResolvers.forEach((r) => r());
  ctx._skipResolvers.length = 0;
  finalize(ctx);
}

/* ==================== 小工具 ==================== */
function forceReflow(el) { void el.offsetHeight; }
function dpr() { return Math.min(window.devicePixelRatio || 1, 2); }

/* 开场播放期间隐藏底部导航栏（#top-nav 文字 + #nav-icon-canvas 像素圆点），
   overlay 透明否则会透出；由 intro.css 的 body.intro-playing 规则生效。 */
function setChromeHidden(hidden) {
  document.body.classList.toggle('intro-playing', !!hidden);
}

/* cubic-bezier 缓动求值器（用于光标弧线移动，与 CSS cubic-bezier 同构） */
function makeCubicBezier(x1, y1, x2, y2) {
  function sampleX(t) { return ((1 - 3 * x2 + 3 * x1) * t + (3 * x2 - 6 * x1)) * t * t + 3 * x1 * t; }
  function sampleY(t) { return ((1 - 3 * y2 + 3 * y1) * t + (3 * y2 - 6 * y1)) * t * t + 3 * y1 * t; }
  function solveX(x) {
    let t = x;
    for (let i = 0; i < 8; i++) {
      const err = sampleX(t) - x;
      if (Math.abs(err) < 1e-6) break;
      const d = (3 * (1 - 3 * x2 + 3 * x1) * t + 2 * (3 * x2 - 6 * x1)) * t + 3 * x1;
      if (Math.abs(d) < 1e-6) break;
      t -= err / d;
    }
    return t;
  }
  return function (t) { return sampleY(solveX(t)); };
}

/* ============ Stage 1: ChatStage — 群聊弹窗（Win95 复古风，带输入栏） ============ */
const ChatStage = {
  mount(ctx) {
    const cfg = ctx.config.chat;
    const modal = document.createElement('div');
    modal.className = 'intro-chat-modal';
    modal.style.setProperty('--intro-slide', cfg.slideMs + 'ms');

    // --- 标题栏：图标 + 群聊名 + 时间 + 窗口控制按钮 ---
    const titlebar = document.createElement('div');
    titlebar.className = 'intro-chat-titlebar';
    const icon = document.createElement('span');
    icon.className = 'intro-chat-titlebar-icon';
    icon.textContent = '💬';
    const title = document.createElement('span');
    title.className = 'intro-chat-titlebar-title';
    title.textContent = '智者群聊 — 网上邻居';
    const timeEl = document.createElement('span');
    timeEl.className = 'intro-chat-titlebar-time';
    timeEl.textContent = '20:40';
    const ctrls = document.createElement('span');
    ctrls.className = 'intro-chat-titlebar-ctrls';
    ['_', '□', '×'].forEach(function (sym) {
      const b = document.createElement('button');
      b.className = 'intro-chat-ctrl-btn' + (sym === '×' ? ' close' : '');
      b.textContent = sym;
      ctrls.appendChild(b);
    });
    titlebar.appendChild(icon);
    titlebar.appendChild(title);
    titlebar.appendChild(timeEl);
    titlebar.appendChild(ctrls);
    modal.appendChild(titlebar);

    // --- 菜单栏：文件/编辑/查看/帮助 ---
    const menubar = document.createElement('div');
    menubar.className = 'intro-chat-menubar';
    ['<u>F</u>文件', '<u>E</u>编辑', '<u>V</u>查看', '<u>H</u>帮助'].forEach(function (t) {
      const item = document.createElement('span');
      item.className = 'intro-chat-menubar-item';
      item.innerHTML = t;
      menubar.appendChild(item);
    });
    modal.appendChild(menubar);

    // --- 工具栏：快捷图标 ---
    const toolbar = document.createElement('div');
    toolbar.className = 'intro-chat-toolbar';
    ['🔤', '😊', '📎', '🖼'].forEach(function (sym, i) {
      if (i > 0) {
        const sep = document.createElement('span');
        sep.className = 'intro-chat-toolbar-sep';
        toolbar.appendChild(sep);
      }
      const btn = document.createElement('button');
      btn.className = 'intro-chat-toolbar-btn';
      btn.textContent = sym;
      toolbar.appendChild(btn);
    });
    modal.appendChild(toolbar);

    // --- body：消息区 ---
    const body = document.createElement('div');
    body.className = 'intro-chat-body';
    modal.appendChild(body);

    // --- 输入栏：输入框(含光标) + 发送按钮 ---
    const inputbar = document.createElement('div');
    inputbar.className = 'intro-chat-inputbar';
    const inputField = document.createElement('div');
    inputField.className = 'intro-chat-input-field';
    inputField.setAttribute('contenteditable', 'false'); // 不可编辑，纯展示
    const cursor = document.createElement('span');
    cursor.className = 'intro-chat-input-cursor';
    cursor.style.display = 'none'; // 默认隐藏，右侧 typing 时显示
    inputField.appendChild(cursor);
    const sendBtn = document.createElement('button');
    sendBtn.className = 'intro-chat-send-btn';
    sendBtn.textContent = '发送';
    inputbar.appendChild(inputField);
    inputbar.appendChild(sendBtn);
    modal.appendChild(inputbar);

    // --- 状态栏：在线指示 + 正在输入 ---
    const statusbar = document.createElement('div');
    statusbar.className = 'intro-chat-statusbar';
    const dot = document.createElement('span');
    dot.className = 'intro-chat-statusbar-dot';
    const statusText = document.createElement('span');
    statusText.className = 'intro-chat-statusbar-text';
    statusText.textContent = cfg.messages.length + ' 人在线';
    const typingInd = document.createElement('span');
    typingInd.className = 'intro-chat-statusbar-typing';
    typingInd.textContent = '正在输入...';
    statusbar.appendChild(dot);
    statusbar.appendChild(statusText);
    statusbar.appendChild(typingInd);
    modal.appendChild(statusbar);

    ctx.overlay.appendChild(modal);
    ctx.shared.chatLayer = modal;
    ctx._modal = modal;
    ctx._body = body;
    ctx._cursor = cursor;
    ctx._typingInd = typingInd;
  },
  async play(ctx) {
    const cfg = ctx.config.chat;
    const body = ctx._body;

    // 弹窗入场
    forceReflow(ctx._modal);
    ctx._modal.classList.add('shown');
    await ctx.wait(cfg.modalEnterMs);
    if (ctx.signal.skipped) return;

    // 4 条左侧消息：每条前 typing(打字指示) → 移除 → 该消息滑入 → hold(阅读) → 下一条
    for (let i = 0; i < cfg.messages.length; i++) {
      if (ctx.signal.skipped) return;
      const typing = makeTypingBubble('left');
      body.appendChild(typing);
      forceReflow(typing);
      typing.classList.add('shown');
      await ctx.wait(cfg.typingMs);
      if (ctx.signal.skipped) return;
      typing.remove();

      const msg = makeMessage('left', cfg.messages[i], i);
      body.appendChild(msg);
      forceReflow(msg);
      msg.classList.add('shown');
      await ctx.wait(cfg.slideMs);          // 等滑入动画完成
      if (ctx.signal.skipped) return;
      await ctx.wait(cfg.holdMs);           // 阅读时间
      if (ctx.signal.skipped) return;
      await ctx.wait(cfg.gapMs);            // 与下一条之间的呼吸
    }
    if (ctx.signal.skipped) return;

    // 右侧"我"typing：输入框光标 + 状态栏"正在输入..."同步亮起
    ctx._cursor.style.display = 'inline-block';
    ctx._typingInd.classList.add('on');
    const meTyping = makeTypingBubble('right');
    body.appendChild(meTyping);
    forceReflow(meTyping);
    meTyping.classList.add('shown');
    await ctx.wait(cfg.slideMs);
    if (ctx.signal.skipped) return;
    await ctx.wait(Math.max(0, cfg.rightTypingMs - cfg.slideMs));
  },
};

function makeTypingBubble(side) {
  const msg = document.createElement('div');
  msg.className = 'intro-msg ' + side;
  const bubble = document.createElement('div');
  bubble.className = 'intro-bubble typing';
  bubble.innerHTML = '<span class="dot"></span><span class="dot"></span><span class="dot"></span>';
  msg.appendChild(bubble);
  return msg;
}

function makeMessage(side, m, idx) {
  const msg = document.createElement('div');
  msg.className = 'intro-msg ' + side;
  const head = document.createElement('div');
  head.className = 'intro-msg-head';
  const av = document.createElement('div');
  av.className = 'intro-avatar';
  if (m.avatarImg) {
    const img = document.createElement('img');
    img.src = m.avatarImg;
    img.alt = '';
    av.appendChild(img);
  } else {
    av.textContent = m.avatar || '';
  }
  head.appendChild(av);
  const name = document.createElement('span');
  name.className = 'intro-name';
  name.textContent = m.name || '';
  head.appendChild(name);
  msg.appendChild(head);
  const bubble = document.createElement('div');
  bubble.className = 'intro-bubble';
  if (m.nowrap) bubble.classList.add('nowrap');   // 短消息单行显示
  bubble.textContent = m.text || '';
  msg.appendChild(bubble);
  // 时间戳：从 20:37 起，每条 +1 分钟（与标题栏 20:40 呼应）
  const timeEl = document.createElement('div');
  timeEl.className = 'intro-msg-time';
  const baseMin = 37 + (idx || 0);
  timeEl.textContent = '20:' + (baseMin < 10 ? '0' : '') + baseMin;
  msg.appendChild(timeEl);
  return msg;
}

/* ============ Stage 2: CursorMaximizeStage — 光标点击最大化 → 全屏化 → 渐变纯白 ============ */
const CursorMaximizeStage = {
  mount(ctx) {
    const modal = ctx.shared.chatLayer;
    const cursor = document.createElement('div');
    cursor.className = 'intro-cursor';
    // 经典鼠标箭头：白填充黑描边，约 22×32px，像素硬边无阴影滤镜
    cursor.innerHTML =
      '<svg width="30" height="44" viewBox="0 0 22 32" style="display:block;">' +
      '<polygon points="1,1 1,20 5,16 8,24 11,23 8,14 14,14" ' +
      'fill="#ffffff" stroke="#000000" stroke-width="1.5" stroke-linejoin="miter"/></svg>';
    cursor.style.opacity = '0';
    ctx.overlay.appendChild(cursor);
    ctx._cursor = cursor;
    // 第 2 个按钮为最大化按钮 □
    ctx._maxBtn = modal ? modal.querySelectorAll('.intro-chat-ctrl-btn')[1] : null;
  },
  async play(ctx) {
    const cfg = ctx.config.cursorClick;
    const modal = ctx.shared.chatLayer;
    const cursor = ctx._cursor;
    const maxBtn = ctx._maxBtn;
    if (!modal || !maxBtn) return;

    // 1. 光标淡入：初始位于弹窗消息区中心
    const body = modal.querySelector('.intro-chat-body');
    const bodyRect = body.getBoundingClientRect();
    const sx = bodyRect.left + bodyRect.width / 2;
    const sy = bodyRect.top + bodyRect.height / 2;
    cursor.style.transform = 'translate(' + sx + 'px,' + sy + 'px)';
    forceReflow(cursor);
    cursor.style.transition = 'opacity ' + cfg.fadeInMs + 'ms ease-out';
    cursor.style.opacity = '1';
    await ctx.wait(cfg.fadeInMs);
    if (ctx.signal.skipped) return;

    // 2. 弧线移动到最大化按钮中心（二次贝塞尔，控制点相对直线中点向上偏移 arcPx）
    const btnRect = maxBtn.getBoundingClientRect();
    const ex = btnRect.left + btnRect.width / 2;
    const ey = btnRect.top + btnRect.height / 2;
    const cx = (sx + ex) / 2;
    const cy = (sy + ey) / 2 - cfg.arcPx;
    await animateCursorArc(ctx, cursor, sx, sy, ex, ey, cx, cy, cfg.moveMs, makeCubicBezier(0.25, 0.46, 0.45, 0.94));
    if (ctx.signal.skipped) return;

    // 3. 点击反馈：光标 scale 0.85→1；按钮 .pressed（Win95 凹陷）120ms
    cursor.style.transition = 'transform ' + (cfg.pressMs / 2) + 'ms ease-out';
    cursor.style.transform = 'translate(' + ex + 'px,' + ey + 'px) scale(0.85)';
    maxBtn.classList.add('pressed');
    await ctx.wait(cfg.pressMs / 2);
    if (ctx.signal.skipped) return;
    cursor.style.transform = 'translate(' + ex + 'px,' + ey + 'px) scale(1)';
    await ctx.wait(cfg.pressMs / 2);
    if (ctx.signal.skipped) return;
    maxBtn.classList.remove('pressed');

    // 4. 弹窗全屏化：当前 rect → fixed → 铺满视口
    const rect = modal.getBoundingClientRect();
    modal.style.transition = 'none';
    modal.style.position = 'fixed';
    modal.style.top = rect.top + 'px';
    modal.style.left = rect.left + 'px';
    modal.style.width = rect.width + 'px';
    modal.style.height = rect.height + 'px';
    modal.style.maxHeight = 'none';
    modal.style.transform = 'none';
    forceReflow(modal);
    const ease = cfg.ease;
    modal.style.transition =
      'top ' + cfg.expandMs + 'ms ' + ease +
      ', left ' + cfg.expandMs + 'ms ' + ease +
      ', width ' + cfg.expandMs + 'ms ' + ease +
      ', height ' + cfg.expandMs + 'ms ' + ease +
      ', box-shadow ' + cfg.expandMs + 'ms ' + ease;
    modal.style.boxShadow = 'none';
    modal.style.top = '0';
    modal.style.left = '0';
    modal.style.width = '100vw';
    modal.style.height = '100vh';
    await ctx.wait(cfg.expandMs + 60);
    if (ctx.signal.skipped) return;

    // 5. 渐变为纯白：子元素 opacity→0（200ms）；弹窗背景→#FFFFFF（400ms）
    Array.prototype.forEach.call(modal.children, function (child) {
      child.style.transition = 'opacity 200ms ease-out';
      child.style.opacity = '0';
    });
    modal.style.transition = 'background ' + cfg.whitenMs + 'ms ease-out';
    modal.style.background = '#FFFFFF';
    await ctx.wait(cfg.whitenMs + 40);
    if (ctx.signal.skipped) return;

    // 6. 光标淡出
    cursor.style.transition = 'opacity ' + cfg.fadeOutMs + 'ms ease-out';
    cursor.style.opacity = '0';
    await ctx.wait(cfg.fadeOutMs);
    if (ctx.signal.skipped) return;

    ctx.shared.whiteBg = modal; // 纯白全屏层，供第二幕做底层
  },
  teardown(ctx) {
    if (ctx._cursor && ctx._cursor.parentNode) ctx._cursor.remove();
  },
};

/* 光标沿二次贝塞尔弧线移动（SKIP 可打断） */
function animateCursorArc(ctx, cursor, sx, sy, ex, ey, cx, cy, ms, easeFn) {
  return new Promise(function (resolve) {
    let stopped = false;
    function stop() { if (stopped) return; stopped = true; resolve(); }
    ctx.skippedPromise.then(stop);
    const start = performance.now();
    function frame(now) {
      if (stopped) return;
      if (ctx.signal.skipped) { stop(); return; }
      const t = Math.min(1, (now - start) / ms);
      const e = easeFn(t);
      const x = (1 - e) * (1 - e) * sx + 2 * (1 - e) * e * cx + e * e * ex;
      const y = (1 - e) * (1 - e) * sy + 2 * (1 - e) * e * cy + e * e * ey;
      cursor.style.transform = 'translate(' + x + 'px,' + y + 'px)';
      if (t >= 1) { stop(); return; }
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  });
}

/* ============ Stage 3: StrikeRevealStage — 白底黑字 + 删除线揭示交互 ============ */
/* Win95 风手掌光标：白填充黑描边像素硬边，与第一幕箭头同风格。
   HAND=张开手掌（hover 触发带），GRAB=握拳（按下拖拽）。热点分别为食指尖/拳心。 */
const STRIKE_CURSOR_HAND = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='28' height='31' viewBox='0 0 20 22'%3E%3Cpath d='M7 1 L9 1 L9 8 L10 8 L10 1.5 L12 1.5 L12 8 L13 8 L13 2.5 L15 2.5 L15 9 L16 9 L16 5 L18 5 L18 13 Q18 19 12 19 L10 19 Q5 19 4 14 L2 9.5 Q1.5 7.5 3 7 Q4.5 6.5 5 8.5 L6 10.5 L6 2 Z' fill='%23ffffff' stroke='%23000000' stroke-width='1.2' stroke-linejoin='round'/%3E%3C/svg%3E\") 11 1, pointer";
const STRIKE_CURSOR_GRAB = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='28' height='25' viewBox='0 0 20 18'%3E%3Cpath d='M5 6 Q5 2 9 2 L13 2 Q17 2 17 6 L17 11 Q17 16 12 16 L8 16 Q3 16 3 11 L3 9 Q3 6 5 6 Z M7 2 L7 6 M10 2 L10 6 M13 2 L13 6 M3 8 Q1 8 1.6 10.5 Q2.2 13 4.5 12.5' fill='%23ffffff' stroke='%23000000' stroke-width='1.2' stroke-linejoin='round'/%3E%3C/svg%3E\") 14 13, grabbing";
const StrikeRevealStage = {
  mount(ctx) {
    const revealed = document.createElement('canvas');
    revealed.id = 'intro-scene-sharp';       // 复用 id，TransitionStage 据此取故障源
    const unrevealed = document.createElement('canvas');
    unrevealed.id = 'intro-strike-unrevealed';

    const layer = document.createElement('div');
    layer.className = 'intro-strike-layer';

    const hint = document.createElement('div');
    hint.className = 'intro-hint';
    hint.textContent = ctx.config.strike.hint;

    ctx.overlay.appendChild(revealed);
    ctx.overlay.appendChild(unrevealed);
    ctx.overlay.appendChild(layer);
    ctx.overlay.appendChild(hint);

    ctx._revealed = revealed;
    ctx._unrevealed = unrevealed;
    ctx._layer = layer;
    ctx._hint = hint;
  },
  async play(ctx) {
    const cfg = ctx.config.strike;
    // ★ 必须等本地字体就绪，否则 measureText 用回退字体致字母 rect 与 HOME 错位
    if (document.fonts && document.fonts.ready) await document.fonts.ready;
    if (ctx.signal.skipped) return;

    const m = measureBrandText(ctx);
    ctx.shared.brandMetrics = m;

    // 两块全屏 canvas：revealed（下层，完整 STOP-DOING LIST，无删除线）
    //                  unrevealed（上层，仅常驻字母 TODO LIST + 删除线，clip-path 随前沿裁剪）
    drawStrikeScene(ctx._revealed, m, 'revealed', cfg);
    drawStrikeScene(ctx._unrevealed, m, 'unrevealed', cfg);

    const layer = ctx._layer;
    const hint = ctx._hint;
    let frontX = m.strikeLeft;            // 揭示前沿，初始 = 删除线左端（含延伸）
    let dragging = false;
    let done = false;

    function applyClip() {
      ctx._unrevealed.style.clipPath = 'inset(0 0 0 ' + frontX + 'px)';
    }
    function inBand(x, y) {
      return x >= m.bandLeft && x <= m.bandRight && y >= m.bandTop && y <= m.bandBottom;
    }
    function setFront(x) {
      frontX = Math.max(m.strikeLeft, Math.min(m.strikeRight, x));
      applyClip();
      if (!done && frontX >= m.strikeRight - cfg.snapTolerancePx) {
        done = true;
        frontX = m.strikeRight;
        applyClip();
        layer.style.cursor = 'default';
        layer.removeEventListener('pointerdown', onDown);
        layer.removeEventListener('pointermove', onMove);
        layer.removeEventListener('pointerup', onUp);
        layer.removeEventListener('pointercancel', onUp);
        if (ctx._strikeResolve) { ctx._strikeResolve(); ctx._strikeResolve = null; }
      }
    }
    function onDown(e) {
      if (ctx.signal.skipped || done) return;
      const r = layer.getBoundingClientRect();
      const x = e.clientX - r.left, y = e.clientY - r.top;
      if (!inBand(x, y)) return;           // 触发带外完全无效
      dragging = true;
      hint.classList.add('fade');           // 首次按下淡出提示
      layer.style.cursor = STRIKE_CURSOR_GRAB;
      try { layer.setPointerCapture(e.pointerId); } catch (_) {}
      setFront(x);
      e.preventDefault();
    }
    function onMove(e) {
      if (ctx.signal.skipped) return;
      const r = layer.getBoundingClientRect();
      const x = e.clientX - r.left, y = e.clientY - r.top;
      if (dragging) {
        setFront(x);
        e.preventDefault();
      } else if (!done) {
        layer.style.cursor = inBand(x, y) ? STRIKE_CURSOR_HAND : 'default';
      }
    }
    function onUp(e) {
      if (!dragging) return;
      dragging = false;
      try { layer.releasePointerCapture(e.pointerId); } catch (_) {}
      if (!done) {
        const r = layer.getBoundingClientRect();
        const x = e.clientX - r.left, y = e.clientY - r.top;
        layer.style.cursor = inBand(x, y) ? STRIKE_CURSOR_HAND : 'default';
      }
    }

    applyClip();
    layer.addEventListener('pointerdown', onDown);
    layer.addEventListener('pointermove', onMove);
    layer.addEventListener('pointerup', onUp);
    layer.addEventListener('pointercancel', onUp);
    ctx._strikeHandlers = { onDown, onMove, onUp };

    // 等揭示完成或 SKIP（松手保留进度，不弹回）
    await Promise.race([
      new Promise(function (resolve) { ctx._strikeResolve = resolve; }),
      ctx.skippedPromise,
    ]);
  },
  teardown(ctx) {
    // 移除交互层与提示；保留两块画布供 TransitionStage 作故障源
    if (ctx._layer && ctx._layer.parentNode) ctx._layer.remove();
    if (ctx._hint && ctx._hint.parentNode) ctx._hint.remove();
    ctx.shared.sceneSharp = ctx._revealed;
  },
};

/**
 * 共享测量：读 .brand-title 的 rect 中心 + computed font + 92vw 宽度保护
 * （与 fluid-bg.js buildSwapMask 同构），并标记隐藏字母。
 * 不设 letterSpacing，与 buildSwapMask 一致。
 */
function measureBrandText(ctx) {
  const cfg = ctx.config.strike;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const c = document.createElement('canvas').getContext('2d');

  // B. 读品牌文字（.brand-title，与 buildSwapMask 同源）
  let cx, cy, baseFont, fontSize, weight, family;
  const el = document.querySelector('.brand-title');
  if (el) {
    const rect = el.getBoundingClientRect();
    cx = rect.left + rect.width / 2;
    cy = rect.top + rect.height / 2;
    const cs = getComputedStyle(el);
    weight = cs.fontWeight;
    family = cs.fontFamily;
    fontSize = parseFloat(cs.fontSize);
    baseFont = weight + ' ' + cs.fontSize + ' ' + family;
  } else {
    // 兜底（元素缺失）：ctx.font 不接受 clamp()，必须给具体 px
    cx = vw / 2;
    cy = vh * 0.32;
    fontSize = Math.min(96, Math.max(38, vw * 0.08));
    weight = 'normal';
    family = 'ChangBanDianSong';
    baseFont = weight + ' ' + fontSize + 'px ' + family;
  }
  const text = 'STOP-DOING LIST';

  // C. 宽度保护（与 buildSwapMask 同构）
  c.font = baseFont;
  let measured = c.measureText(text).width;
  const maxW = vw * 0.92;
  if (measured > maxW) {
    const scale = maxW / measured;
    fontSize = fontSize * scale;
    baseFont = weight + ' ' + fontSize + 'px ' + family;
    c.font = baseFont;
    measured = c.measureText(text).width;
  }

  // E. 计算每字母 rect（子串测量，保留 kerning，与 fillText 落字一致）
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  const full = c.measureText(text);
  const left0 = cx - full.width / 2;
  const ascent = full.actualBoundingBoxAscent || fontSize * 0.36;
  const descent = full.actualBoundingBoxDescent || fontSize * 0.12;
  const yTop = cy - ascent;
  const yBottom = cy + descent;
  const letters = [];
  for (let k = 0; k < text.length; k++) {
    const xL = left0 + c.measureText(text.slice(0, k)).width;
    const xR = left0 + c.measureText(text.slice(0, k + 1)).width;
    letters.push({ char: text[k], index: k, x: xL, y: yTop, w: xR - xL, h: yBottom - yTop, hidden: false });
  }

  // F. 标记隐藏字母：按 hiddenLetters 顺序，从上次匹配位置继续向后找（各匹配一次）
  //    天然只取 STOP 的 S(0)/P(3)/-(4) + DOING 的 I(7)/N(8)/G(9)，不会误配 LIST 里的 S(13)
  let searchFrom = 0;
  for (let i = 0; i < cfg.hiddenLetters.length; i++) {
    const target = cfg.hiddenLetters[i];
    for (let k = searchFrom; k < text.length; k++) {
      if (text[k] === target) {
        letters[k].hidden = true;
        searchFrom = k + 1;
        break;
      }
    }
  }

  // 删除线几何 + 触发带
  const strikeY = cy - fontSize * cfg.yOffsetRatio;
  const strikeThickness = fontSize * cfg.thicknessRatio;
  const textLeft = left0;
  const textRight = left0 + full.width;
  // 删除线左右各往文字外延伸 extendPx（frontX 与裁剪均按此范围）
  const strikeLeft = textLeft - cfg.extendPx;
  const strikeRight = textRight + cfg.extendPx;
  const bandHeight = (ascent + descent) * cfg.bandHeightRatio;
  const bandTop = strikeY - bandHeight / 2;
  const bandBottom = strikeY + bandHeight / 2;

  return {
    letters, cx, cy, fontSize, baseFont, text,
    textLeft, textRight, strikeLeft, strikeRight, strikeY, strikeThickness,
    bandLeft: textLeft - cfg.bandPadX, bandRight: textRight + cfg.bandPadX,
    bandTop, bandBottom,
  };
}

/* 绘制揭示场景：revealed = 全部字母无删除线；unrevealed = 仅常驻字母 + 删除线 */
function drawStrikeScene(canvas, m, scene, cfg) {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const d = dpr();
  canvas.width = Math.floor(vw * d);
  canvas.height = Math.floor(vh * d);
  canvas.style.width = vw + 'px';
  canvas.style.height = vh + 'px';
  const c = canvas.getContext('2d');
  c.setTransform(d, 0, 0, d, 0, 0); // 此后坐标均用 CSS px，与 getBoundingClientRect 同坐标系

  // 白底
  c.fillStyle = cfg.bgColor;
  c.fillRect(0, 0, vw, vh);

  // 文字
  c.fillStyle = cfg.textColor;
  c.font = m.baseFont;
  c.textBaseline = 'middle';
  if (scene === 'revealed') {
    c.textAlign = 'center';
    c.fillText(m.text, m.cx, m.cy);          // 全部 15 个字符
  } else {
    c.textAlign = 'left';
    for (let k = 0; k < m.letters.length; k++) {
      if (m.letters[k].hidden) continue;     // 跳过隐藏字母（S/P/-/I/N/G）
      c.fillText(m.letters[k].char, m.letters[k].x, m.cy);
    }
    // 删除线（左右各延伸 extendPx，clip-path 随前沿裁剪上层，自然实现 frontX→右缘可见）
    c.fillStyle = cfg.textColor;
    c.fillRect(m.strikeLeft, m.strikeY - m.strikeThickness / 2, m.strikeRight - m.strikeLeft, m.strikeThickness);
  }
}

/* ============ Stage 4: TransitionStage — 停留 → 故障闪现 ×2 → 过渡到主页 ============ */
/* 当前 v3：完全揭示后停留 2s → 故障闪现恰好 2 次 → 平滑落到主页。
   源画面 = ctx.shared.sceneSharp（最终揭示态：白底黑字 STOP-DOING LIST）。 */
const TransitionStage = {
  mount() {},
  async play(ctx) {
    const cfg = ctx.config.finish;
    const overlay = ctx.overlay;
    const src = ctx.shared.sceneSharp;
    const home = document.getElementById('page-home');

    // 1. 停留 2s（最终揭示态静止展示，交互已锁定）
    await ctx.wait(cfg.holdMs);
    if (ctx.signal.skipped) return;

    // 无源画布兜底：直接激活主页并淡出
    if (!src) {
      if (home && !home.classList.contains('active')) home.classList.add('active');
      overlay.style.transition = 'opacity ' + cfg.fadeOutMs + 'ms ease-out';
      overlay.style.opacity = '0';
      await ctx.wait(cfg.fadeOutMs + 60);
      if (overlay.parentNode) overlay.remove();
      return;
    }

    const d = dpr();
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    // 故障 canvas（z:7，最高）
    const glitch = document.createElement('canvas');
    glitch.id = 'intro-glitch';
    glitch.width = Math.floor(vw * d);
    glitch.height = Math.floor(vh * d);
    glitch.style.width = vw + 'px';
    glitch.style.height = vh + 'px';
    overlay.appendChild(glitch);
    const gc = glitch.getContext('2d');
    gc.setTransform(d, 0, 0, d, 0, 0);

    const tmp = document.createElement('canvas');
    const tctx = tmp.getContext('2d');

    // 2. 故障闪现 ×2：单次 = 故障 flashMs → 干净 flashGapMs（最后一次后直接过渡）
    for (let i = 0; i < cfg.flashCount; i++) {
      if (ctx.signal.skipped) return;
      await runGlitchFlash(ctx, gc, src, tmp, tctx, vw, vh, d, cfg.flashMs, cfg.flashIntensity);
      if (ctx.signal.skipped) return;
      if (i < cfg.flashCount - 1) {
        gc.clearRect(0, 0, vw, vh);          // 干净画面间隔
        await ctx.wait(cfg.flashGapMs);
        if (ctx.signal.skipped) return;
      }
    }

    // 3. 过渡到主页：清掉故障层 → home active → overlay 淡出并移除
    gc.clearRect(0, 0, vw, vh);
    if (home && !home.classList.contains('active')) home.classList.add('active');
    document.body.classList.add('intro-glitch-in'); // 主页故障余波，与 overlay 淡出并行（480ms 后自动移除）
    setTimeout(function(){ document.body.classList.remove('intro-glitch-in'); }, 520);
    overlay.style.transition = 'opacity ' + cfg.fadeOutMs + 'ms ease-out';
    overlay.style.opacity = '0';
    await ctx.wait(cfg.fadeOutMs + 60);
    if (overlay.parentNode) overlay.remove();
    document.body.classList.remove('intro-pending'); // intro 结束，恢复主页可见
    setChromeHidden(false);              // overlay 移除后恢复导航栏
  },
  teardown() {},
};

/* 单次故障闪现：ms 内每帧绘制固定强度（+小幅随机抖动）的故障画面，SKIP 可打断 */
function runGlitchFlash(ctx, gc, src, tmp, tctx, vw, vh, d, ms, intensity) {
  return new Promise(function (resolve) {
    let stopped = false;
    function stop() { if (stopped) return; stopped = true; resolve(); }
    ctx.skippedPromise.then(stop);
    const start = performance.now();
    function frame(now) {
      if (stopped) return;
      if (ctx.signal.skipped) { stop(); return; }
      const elapsed = now - start;
      if (elapsed >= ms) { stop(); return; }
      const jitter = (Math.random() - 0.5) * 0.1;
      const t = Math.max(0, Math.min(1, intensity + jitter));
      drawGlitchFrame(gc, src, tmp, tctx, vw, vh, d, t);
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  });
}

/**
 * 单帧像素故障绘制。
 * RGB 色散 + 水平条带撕裂 + 像素化降采样 + 扫描线 + 噪点。
 * 白底画面直接闪现，不做末段暗化。
 */
function drawGlitchFrame(gc, src, tmp, tctx, vw, vh, d, t) {
  gc.globalCompositeOperation = 'source-over';
  gc.globalAlpha = 1;
  gc.clearRect(0, 0, vw, vh);

  // 像素化降采样（随 t 增强）：src → tmp（小尺寸）→ gc（放大回 vw×vh）
  const pix = Math.max(1, Math.floor(1 + t * t * 14)); // 1..15
  const sw = Math.max(1, Math.floor(vw / pix));
  const sh = Math.max(1, Math.floor(vh / pix));
  tmp.width = sw; tmp.height = sh;
  tctx.imageSmoothingEnabled = false;
  tctx.clearRect(0, 0, sw, sh);
  tctx.drawImage(src, 0, 0, src.width, src.height, 0, 0, sw, sh);

  // 基础层（像素化）
  gc.imageSmoothingEnabled = false;
  gc.drawImage(tmp, 0, 0, sw, sh, 0, 0, vw, vh);

  // RGB 色散：偏移副本用 'lighter' 合成，造红/青色散感
  const shift = Math.floor(2 + t * 16);
  gc.globalCompositeOperation = 'lighter';
  gc.globalAlpha = 0.4;
  gc.drawImage(tmp, 0, 0, sw, sh, -shift, 0, vw, vh);
  gc.drawImage(tmp, 0, 0, sw, sh, shift, 0, vw, vh);
  gc.globalAlpha = 1;
  gc.globalCompositeOperation = 'source-over';

  // 水平条带撕裂（从源清晰画布直接取，制造清晰条带错位）
  const bands = Math.floor(1 + t * 6);
  for (let b = 0; b < bands; b++) {
    const by = Math.floor(Math.random() * vh);
    const bh = Math.floor(6 + Math.random() * 26);
    const bx = Math.floor((Math.random() - 0.5) * 70 * t);
    const sy = Math.floor(by * d);
    const sh2 = Math.floor(bh * d);
    if (sy + sh2 > src.height) continue;
    gc.drawImage(src, 0, sy, src.width, sh2, bx, by, vw, bh);
  }

  // 扫描线（暗色横线，每 3px 一条）
  gc.fillStyle = 'rgba(0,0,0,0.26)';
  for (let y = 0; y < vh; y += 3) gc.fillRect(0, y, vw, 1);

  // 随机白色噪点块
  gc.globalAlpha = 0.5;
  gc.fillStyle = '#fff';
  const noiseCount = Math.floor(10 + t * 40);
  for (let i = 0; i < noiseCount; i++) {
    gc.fillRect(Math.random() * vw, Math.random() * vh, 2, 2);
  }
  gc.globalAlpha = 1;
  // 末段暗化已移除：白底画面直接闪现，不做暗化
}

/* ==================== 注入阶段顺序 ==================== */
STAGES.push(ChatStage, CursorMaximizeStage, StrikeRevealStage, TransitionStage);

/* ==================== 启动 ==================== */
function boot() {
  // 每次打开网站都播放（不再做首次门控）；右上角 SKIP 按钮可跳过
  // reduced-motion → 直接放行 HOME，不播
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    document.body.classList.remove('intro-pending'); // 不播 intro 时恢复主页可见
    return;
  }

  setChromeHidden(true);                // 开场期间隐藏底部导航栏
  const overlay = document.createElement('div');
  overlay.id = 'intro-overlay';
  // 插入 <body> 起始（bg-canvas 之后）
  const bg = document.getElementById('bg-canvas');
  if (bg && bg.parentNode) bg.parentNode.insertBefore(overlay, bg.nextSibling);
  else document.body.insertBefore(overlay, document.body.firstChild);

  const ctx = createCtx(overlay);

  // SKIP 按钮（任意时刻可点）
  const skip = document.createElement('button');
  skip.className = 'intro-skip';
  skip.type = 'button';
  skip.textContent = 'SKIP';
  skip.addEventListener('click', function () { skipIntro(ctx); });
  overlay.appendChild(skip);

  runSequencer(ctx);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}

})();
