/**
 * STOP DOING LIST v7.3 — 不做清单
 * 像素背景、滑动操作、机械动画、跨天保留
 */

/* ===================== 数据层 ===================== */
const STORE_KEY = 'stopdoing_data_v7_3b';

const PRESETS = [
  '无意义刷短视频', '睡前再看一眼手机', '不饿却吃零食',
  '回复非紧急消息到深夜', '打开购物 App 闲逛', '答应不想去的聚会',
  '工作前先刷社交媒体', '为小事反复纠结', '一次性接三个任务',
  '熬夜追完下一集'
];

/* 坏习惯分类及对应预测模板 */
const HABIT_CATEGORIES = [
  {
    keywords: ['短视频', '刷视频', '刷手机', '刷抖音', '刷微博', '刷小红书', '刷朋友圈', '刷B站', '刷ins', '刷tiktok', '刷tik', '滑动', '无意义刷', '刷sns', '刷app'],
    name: '数字沉迷',
    templates: [
      (v) => `一年后，你在无意义滑动上消耗 <strong>${v.y} 小时</strong>，相当于 <strong>${v.d} 个完整白天</strong>。这些时间足够学一门外语到入门水平。`,
      (v) => `持续这个习惯，每周被偷走 <strong>${v.w} 小时</strong>。一年累计可以看完 <strong>${v.b} 本书</strong>，或者跑完 <strong>${v.km} 公里</strong>。`,
      (v) => `算法正在训练你的注意力碎片化。按当前频率，<strong>${v.m} 个月后</strong>你的深度专注能力将明显下降，连续阅读超过 ${v.pages} 页就会走神。`,
      (v) => `每次滑动平均 ${v.sec} 秒，一天 ${v.cnt} 次。一年下来你点过了 <strong>${v.total} 次屏幕</strong>，却说不清自己看了什么。`
    ]
  },
  {
    keywords: ['熬夜', '晚睡', '追剧', '追番', '追综艺', '追小说', '追文', '再看一集', '通宵', '不睡觉', '早起失败', '赖床'],
    name: '睡眠剥夺',
    templates: [
      (v) => `一年后累计少睡 <strong>${v.h} 小时</strong>，相当于 <strong>${v.d} 天</strong>完全没有休息。你的免疫力、记忆力和情绪调节能力都会受到实质性影响。`,
      (v) => `持续晚睡 <strong>${v.min} 分钟</strong>，一个月后你的昼夜节律就会偏移，白天精力下降约 <strong>${v.pct}%</strong>，下午 ${v.time} 开始就进入"僵尸模式"。`,
      (v) => `长期睡眠不足会让大脑的"垃圾清理"时间缩短。一年下来，相当于让大脑带着 <strong>${v.load}% 的代谢废物</strong>在运转。`,
      (v) => `每次"再看一集"平均导致少睡 <strong>${v.min} 分钟</strong>。一年累计，你为此透支了 <strong>${v.d} 个完整的夜晚</strong>。`
    ]
  },
  {
    keywords: ['零食', '奶茶', '吃', '外卖', '甜食', '蛋糕', '炸鸡', '烧烤', '喝饮料', '可乐', '夜宵', '加餐', '零食', '薯片', '饼干', '甜品', '巧克力'],
    name: '无意识进食',
    templates: [
      (v) => `按每次约 <strong>${v.cal} 千卡</strong>计算，一年累计多摄入 <strong>${v.total} 千卡</strong>，相当于纯脂肪增重约 <strong>${v.fat} 公斤</strong>。`,
      (v) => `这个习惯一年花费约 <strong>${v.money} 元</strong>，足够买 <strong>${v.book} 本好书</strong>，或者 <strong>${v.trip} 次健身房私教课</strong>。`,
      (v) => `高糖/高油饮食会引发血糖波动，<strong>${v.min} 分钟后</strong>你会感到比吃之前更困倦。一年下来，这种"饮食过山车"让你的午后效率损失了约 <strong>${v.pct}%</strong>。`,
      (v) => `每一次无意识进食都在强化多巴胺回路。持续一年，你的味觉阈值会提高，需要更重口味的刺激才能获得同样的满足感。`
    ]
  },
  {
    keywords: ['购物', '逛', '买买买', '下单', '拼单', '种草', '拔草', '直播间', '促销', '打折', '满减', '秒杀', '清空购物车', '快递', '退货'],
    name: '冲动消费',
    templates: [
      (v) => `一年累计冲动消费约 <strong>${v.money} 元</strong>，如果这笔钱用于定投，按 5% 年化收益，<strong>${v.year} 年后</strong>将变成 <strong>${v.future} 元</strong>。`,
      (v) => `每次冲动购物后的"多巴胺兴奋"只持续 <strong>${v.min} 分钟</strong>，随后是更长的空虚。一年 <strong>${v.cnt} 次</strong>，你用金钱买了一大堆短暂的快感。`,
      (v) => `购买的物品中约 <strong>${v.pct}%</strong> 使用频率低于每月一次。这些"沉淀物品"占据了你的物理空间和认知负荷。`,
      (v) => `浏览购物页面的时间一年累计 <strong>${v.h} 小时</strong>，如果用来学习一项技能，已经足够达到"能上手使用"的水平。`
    ]
  },
  {
    keywords: ['社交', '聚会', '消息', '聊天', '微信', '回复', '电话', '应酬', '饭局', '合照', '发朋友圈', '点赞', '群聊', '群消息', '不熟的', '面子'],
    name: '无效社交',
    templates: [
      (v) => `一年中约 <strong>${v.h} 小时</strong>花在了让你疲惫的社交上。如果把这些时间留给真正重要的人，你们可以多出 <strong>${v.d} 个高质量整天</strong>。`,
      (v) => `每次勉强赴约后的恢复期约 <strong>${v.h} 小时</strong>。一年 <strong>${v.cnt} 次</strong>无效社交，相当于亏损了 <strong>${v.d} 天</strong>的精力。`,
      (v) => `实时回复非紧急消息的习惯，一年碎片化时间累计 <strong>${v.h} 小时</strong>。如果集中使用，可以完成 <strong>${v.project} 个</strong>小型项目。`,
      (v) => `为了"面子"答应的事情，<strong>${v.pct}%</strong> 事后你会后悔。一年下来，这些"不好意思拒绝"消耗了你 <strong>${v.h} 小时</strong> 的生命。`
    ]
  },
  {
    keywords: ['纠结', '犹豫', '选择困难', '想太多', '内耗', '焦虑', '担心', '胡思乱想', '过度思考', '完美主义', '怕错', '拖延'],
    name: '精神内耗',
    templates: [
      (v) => `每次纠结平均消耗 <strong>${v.min} 分钟</strong>的心理能量。一年下来，内耗偷走了你 <strong>${v.h} 小时</strong>，等于 <strong>${v.d} 天</strong>在原地踏步。`,
      (v) => `过度思考会让决策疲劳累积。到了下午 <strong>${v.time}</strong>，你的判断力已经下降了约 <strong>${v.pct}%</strong>，更容易做出后悔的决定。`,
      (v) => `内耗时大脑的默认模式网络过度活跃，消耗的能量不亚于做数学题。一年累计的认知损耗，相当于 <strong>${v.exam} 场高考</strong>的脑力支出。`,
      (v) => `"想太多"本质是用思维循环逃避行动。如果每次纠结的时间拿来行动（哪怕做得不完美），一年可以完成 <strong>${v.project} 个</strong>实际成果。`
    ]
  },
  {
    keywords: ['多任务', '同时', '接三个', '并行', '切换', ' multitask', '一边', '三心二意', '分心', '打断'],
    name: '注意力分散',
    templates: [
      (v) => `每次任务切换的认知成本约 <strong>${v.min} 分钟</strong>。一天切换 <strong>${v.cnt} 次</strong>，累计浪费 <strong>${v.h} 小时</strong>。一年下来等于 <strong>${v.d} 天</strong>在做"重新进入状态"。`,
      (v) => `多任务处理会让错误率上升 <strong>${v.pct}%</strong>，完成时间反而增加 <strong>${v.extra}%</strong>。你以为在加速，实际在减速。`,
      (v) => `研究发现持续注意力被打断后，恢复专注需要 <strong>${v.min} 分钟</strong>。一年被中断 <strong>${v.cnt} 次</strong>，累计损失 <strong>${v.h} 小时</strong>的深度工作时间。`,
      (v) => `同时处理多件事的错觉来自多巴胺刺激。实际上你的每件事都只得到了 <strong>${v.pct}%</strong> 的注意力。一年后回看，可能没有一件做到你自己满意的程度。`
    ]
  },
  {
    keywords: ['抽烟', '吸烟', '喝酒', '酗酒', '烟', '酒', '啤酒', '白酒', '香烟'],
    name: '成瘾物质',
    templates: [
      (v) => `按当前频率，一年花费约 <strong>${v.money} 元</strong>，足够一次 <strong>${v.trip} 天的旅行</strong>。这笔账不算不知道，一算心跳加速。`,
      (v) => `每次摄入后，身体需要 <strong>${v.min} 分钟</strong>才能代谢完毕并恢复 baseline 状态。一天 <strong>${v.cnt} 次</strong>，你的身体几乎一直在"恢复中"。`,
      (v) => `一年累计摄入次数 <strong>${v.total} 次</strong>。医学数据显示，持续这个频率 <strong>${v.year} 年后</strong>，相关健康风险将显著上升。`,
      (v) => `这个习惯本质上是在用明天的健康透支今天的短暂快感。每次 <strong>${v.cost} 元</strong>，一年就是 <strong>${v.money} 元</strong>的健康税。`
    ]
  }
];

/* 通用兜底模板（无法匹配分类时使用） */
const GENERIC_TEMPLATES = [
  (habit, v) => `「${habit}」看似微不足道，但习惯的力量在于复利。按每天 <strong>${v.min} 分钟</strong>估算，一年累计 <strong>${v.h} 小时</strong>，足够你系统学习一项新技能。`,
  (habit, v) => `每个"就这一次"都在铺设神经通路。一年 <strong>${v.cnt} 次</strong>后，它会变成你的默认行为。停止的最佳时机是现在，其次是明天。`,
  (habit, v) => `假设每次 <strong>${v.min} 分钟</strong>，一年就是 <strong>${v.h} 小时</strong>。如果这些时间用来做你真正想做的事，你会比现在的自己多走很远。`,
  (habit, v) => `研究表明，一个习惯平均 <strong>${v.day} 天</strong>就会固化。继续下去，它会从"偶尔做"变成"不做不舒服"。现在写下"不做"，就是最好的干预。`
];

const PIXEL_COLORS = [
  '#ff1a1a', '#00ff66', '#ffcc00', '#00ccff',
  '#ff3399', '#ff6600', '#66ffcc', '#cc66ff'
];

function loadData() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) {
      const data = JSON.parse(raw);
      // 迁移旧字段 done -> finished
      [...data.receipts, ...(data.archives || [])].forEach(r => {
        r.items.forEach(it => {
          if (it.finished === undefined && it.done !== undefined) it.finished = it.done;
          if (it.finished === undefined) it.finished = false;
        });
      });
      return data;
    }
  } catch (e) {}
  return { receipts: [], archives: [], predictions: [] };
}

function saveData(data) { localStorage.setItem(STORE_KEY, JSON.stringify(data)); }

let appData = loadData();
let currentPage = 'home';
let currentSnapshot = null;
let isNewPrint = false; // 标记是否是刚打印的，用于播放打印出票动画

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatDateZH(dateStr) {
  const [y, m, d] = dateStr.split('-');
  return `${y}年${m}月${d}日`;
}

/* ===================== 像素背景画布 ===================== */
const canvas = document.getElementById('bg-canvas');
const ctx = canvas.getContext('2d');
let width, height;
let mouse = { x: -1000, y: -1000 };
let mouseOnPage = false;
let pixels = [];
const PIXEL_SIZE = 8;
const GRID_COLOR = 'rgba(255,255,255,0.025)';
const BG_COLOR = '#0d0d0d';

function resizeCanvas() {
  width = canvas.width = window.innerWidth;
  height = canvas.height = window.innerHeight;
  initPixels();
}

function initPixels() {
  const cols = Math.ceil(width / PIXEL_SIZE) + 1;
  const rows = Math.ceil(height / PIXEL_SIZE) + 1;
  pixels = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      pixels.push({
        c, r, x: c * PIXEL_SIZE, y: r * PIXEL_SIZE,
        color: null, life: 0
      });
    }
  }
}

function drawPixelBackground() {
  ctx.fillStyle = BG_COLOR;
  ctx.fillRect(0, 0, width, height);

  for (const p of pixels) {
    const cx = p.x + PIXEL_SIZE / 2;
    const cy = p.y + PIXEL_SIZE / 2;
    const dist = Math.hypot(cx - mouse.x, cy - mouse.y);

    // 鼠标在页面上且附近时才触发颜色
    if (mouseOnPage && dist < 90 && p.life <= 0) {
      const chance = 1 - (dist / 90);
      if (Math.random() < chance * 0.12) {
        p.color = PIXEL_COLORS[Math.floor(Math.random() * PIXEL_COLORS.length)];
        p.life = 1;
      }
    }

    if (p.life > 0) {
      // 约 0.3 秒消散 (1 / 0.055 ≈ 18 帧 @60fps)
      p.life -= 0.055;
      if (p.life < 0) p.life = 0;
    }

    // 网格
    ctx.fillStyle = GRID_COLOR;
    ctx.fillRect(p.x + 0.5, p.y + 0.5, PIXEL_SIZE - 1, PIXEL_SIZE - 1);

    // 彩色像素
    if (p.life > 0) {
      const alpha = Math.min(p.life / 0.25, 1) * 0.85;
      ctx.fillStyle = p.color;
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.arc(cx, cy, PIXEL_SIZE * 0.35, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;

      if (p.life > 0.3) {
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 5 * (p.life - 0.3) * 3;
        ctx.beginPath();
        ctx.arc(cx, cy, PIXEL_SIZE * 0.35, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    }
  }

  requestAnimationFrame(drawPixelBackground);
}

/* ===================== 页面导航 ===================== */
let pages = {};
let homeBtn, receiptWall, archiveEmpty;
let folderEl, folderCanvas, flyingTickets, folderLabel;

function getPages() {
  pages = {
    home:   document.getElementById('page-home'),
    list:   document.getElementById('page-list'),
    archive: document.getElementById('page-archive'),
    time:   document.getElementById('page-time'),
    stats:  document.getElementById('page-stats')
  };
  homeBtn = document.getElementById('btn-home');
  receiptWall = document.getElementById('receipt-wall');
  archiveEmpty = document.getElementById('archive-empty');
  folderEl = document.getElementById('pixel-folder');
  folderCanvas = document.getElementById('folder-canvas');
  flyingTickets = document.getElementById('flying-tickets');
  folderLabel = document.getElementById('folder-label');
}

function showPage(name) {
  if (!pages.list) getPages();
  Object.values(pages).forEach(p => { if (p) p.classList.remove('active'); });
  if (pages[name]) pages[name].classList.add('active');
  currentPage = name;
  if (homeBtn) homeBtn.classList.toggle('visible', name !== 'home');

  // 高亮导航
  document.querySelectorAll('.nav-link').forEach(l => {
    l.classList.toggle('active', l.dataset.page === name);
  });

  try {
    if (name === 'list' && appData.receipts.length > 0) renderReceiptWall();
    else if (name === 'list') {
      if (!receiptWall) receiptWall = document.getElementById('receipt-wall');
      if (receiptWall) receiptWall.innerHTML = '<div style="color:#888;font-family:Space Mono;margin-top:20vh">还没有打印过清单。回到主页点击 PRINT TODAY。</div>';
    }
    if (name === 'archive') renderArchive();
    if (name === 'stats') renderStats();
    if (name === 'time') {
      const card = document.getElementById('snapshot-card');
      if (card) card.classList.add('hidden');
      currentSnapshot = null;
    }
    
    // 离开清单页时隐藏顶部打印机
    if (name !== 'list') {
      const printer = getListPrinter();
      if (printer) printer.classList.remove('visible', 'printing');
      isNewPrint = false; // 重置打印标记
    }
  } catch (e) { console.warn('showPage error:', e); }
}

// 顶部导航事件
document.addEventListener('DOMContentLoaded', () => {
  getPages();
  document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      showPage(link.dataset.page);
    });
  });
  if (homeBtn) homeBtn.addEventListener('click', () => showPage('home'));
});

/* ===================== 清单打印 ===================== */
let printBtn, printStatus, printerSlot;

function setupPrintButton() {
  printBtn = document.getElementById('btn-print');
  printStatus = document.getElementById('print-status');
  printerSlot = document.getElementById('printer-slot');
  if (printBtn) printBtn.addEventListener('click', printToday);
}

function getTodayReceipt() {
  return appData.receipts.find(r => r.date === todayKey());
}
function hasTodayReceipt() { return !!getTodayReceipt(); }

function updatePrintButton() {
  if (!printBtn || !printStatus) return;
  if (hasTodayReceipt()) {
    printBtn.disabled = false;
    printBtn.querySelector('.btn-glitch').textContent = 'VIEW LISTS';
    printBtn.querySelector('.btn-quiet').textContent = '查看今日清单';
    printStatus.textContent = `今日清单已打印：${formatDateZH(todayKey())}`;
  } else {
    printBtn.disabled = false;
    printBtn.querySelector('.btn-glitch').textContent = 'PRINT TODAY';
    printBtn.querySelector('.btn-quiet').textContent = '打印今日清单';
    printStatus.textContent = '点击下方按钮，打印今天的「不做清单」';
  }
}

function createReceipt(date, items = null) {
  const blankItems = items || [
    { text: '', finished: false },
    { text: '', finished: false },
    { text: '', finished: false }
  ];
  return {
    id: 'R' + Date.now() + Math.random().toString(36).slice(2, 6),
    date,
    items: blankItems.map(t => (typeof t === 'string' ? { text: t, finished: false } : { ...t })),
    archived: false,
    createdAt: Date.now()
  };
}

function printToday(e) {
  if (e) e.preventDefault();

  // 如果今日已打印，直接跳转清单页
  if (hasTodayReceipt()) {
    isNewPrint = false;
    showPage('list');
    return;
  }
  if (printerSlot) printerSlot.classList.add('active');
  if (printBtn) printBtn.disabled = true;

  setTimeout(() => {
    const receipt = createReceipt(todayKey());
    appData.receipts.unshift(receipt);
    saveData(appData);
    updatePrintButton();
    isNewPrint = true; // 标记为新打印，触发打印动画
    showPage('list');
    setTimeout(() => { if (printerSlot) printerSlot.classList.remove('active'); }, 800);
  }, 600);
}

/* ===================== 收据墙渲染 ===================== */
function getListPrinter() {
  return document.getElementById('list-printer');
}

function startPrintAnimation() {
  const printer = getListPrinter();
  if (printer) printer.classList.add('visible', 'printing');
}

function stopPrintAnimation() {
  const printer = getListPrinter();
  if (printer) printer.classList.remove('printing');
  // 打印机保持可见状态，作为页面顶部装饰
}

function renderReceiptWall() {
  window._renderCount = (window._renderCount || 0) + 1;
  if (!receiptWall) receiptWall = document.getElementById('receipt-wall');
  if (!receiptWall) return;
  console.log('renderReceiptWall call #', window._renderCount, 'isNewPrint:', isNewPrint);
  receiptWall.innerHTML = '';
  if (appData.receipts.length === 0) {
    receiptWall.innerHTML = '<div style="color:#888;font-family:Space Mono;margin-top:20vh">还没有打印过清单。回到主页点击 PRINT TODAY。</div>';
    // 没有清单时隐藏打印机
    const printer = getListPrinter();
    if (printer) printer.classList.remove('visible', 'printing');
    return;
  }

  // 如果是新打印，显示打印机并启动动画
  const isFirstNew = isNewPrint;
  if (isNewPrint) {
    startPrintAnimation();
  } else {
    // 不是新打印，显示静态打印机作为装饰
    const printer = getListPrinter();
    if (printer) printer.classList.add('visible');
  }

  appData.receipts.forEach((receipt, index) => {
    const wrap = document.createElement('div');
    wrap.className = 'receipt-wrap';
    const isPrintingOut = index === 0 && isFirstNew;
    if (isPrintingOut) {
      wrap.classList.add('printing-out');
    } else if (receipt.date === todayKey() && !receipt._animated && !isFirstNew) {
      wrap.classList.add('printing');
      receipt._animated = true;
    }
    wrap.style.animationDelay = (index * 0.06) + 's';

    const receiptEl = document.createElement('div');
    receiptEl.className = 'receipt';
    if (receipt.archived) receiptEl.style.opacity = '0.55';

    // 顶部条形码
    const topBarcode = document.createElement('div');
    topBarcode.className = 'receipt-top-barcode';
    receiptEl.appendChild(topBarcode);

    // 条形码下方波浪分隔线
    const wavyDivider = document.createElement('div');
    wavyDivider.className = 'receipt-wavy-divider';
    receiptEl.appendChild(wavyDivider);

    // 打印扫描遮罩层（新打印时显示）
    if (isPrintingOut) {
      const scanOverlay = document.createElement('div');
      scanOverlay.className = 'print-scan-overlay';
      receiptEl.appendChild(scanOverlay);
    }

    // Header
    const header = document.createElement('div');
    header.className = 'receipt-header';
    header.innerHTML = `
      <span class="receipt-tag">DAY RECEIPT · STOP DOING LIST</span>
      <h3 class="receipt-title">Day Receipt</h3>
      <div class="receipt-date">${formatDateZH(receipt.date)} · ORDER #${String(index + 1).padStart(4, '0')}</div>
    `;

    // Items
    const itemsEl = document.createElement('div');
    itemsEl.className = 'receipt-items';
    renderItems(receipt, itemsEl);

    // Footer
    const footer = document.createElement('div');
    footer.className = 'receipt-footer';
    const finishedCount = receipt.items.filter(i => i.finished).length;
    const total = receipt.items.length;
    footer.innerHTML = `
      <div>${finishedCount === total && total > 0 ? 'GOOOOOD !' : 'HAVE A NICE DAY.'}</div>
      <div class="receipt-barcode"></div>
    `;

    receiptEl.appendChild(header);
    receiptEl.appendChild(itemsEl);
    receiptEl.appendChild(footer);

    // 底部波浪边缘
    const bottomWave = document.createElement('div');
    bottomWave.className = 'receipt-bottom-wave';
    receiptEl.appendChild(bottomWave);

    wrap.appendChild(receiptEl);

    // Connector
    if (index < appData.receipts.length - 1) {
      const connector = document.createElement('div');
      connector.className = 'receipt-connector';
      if (receipt.archived) connector.classList.add('cut');
      wrap.appendChild(connector);
    }

    // Stamp
    if (receipt.archived) {
      const stamp = document.createElement('div');
      stamp.className = 'stamp archived';
      stamp.textContent = receipt.items.every(i => i.finished) ? 'DONE' : 'ARCHIVED';
      receiptEl.appendChild(stamp);
    }

    receiptWall.appendChild(wrap);

    // 新打印的收据：JS 驱动下滑动画
    if (isPrintingOut) {
      receiptEl.classList.add('printing-out');
      // 第一帧：设置初始状态（无过渡）
      receiptEl.style.transition = 'none';
      receiptEl.style.transform = 'translateY(-600px)';
      receiptEl.style.opacity = '0.3';
      receiptEl.offsetHeight; // 强制 reflow
      // 第二帧：启动过渡
      requestAnimationFrame(() => {
        receiptEl.style.transition = 'transform 4.5s cubic-bezier(0.22, 0.61, 0.36, 1), opacity 0.8s ease';
        receiptEl.style.transform = 'translateY(0)';
        receiptEl.style.opacity = '1';
      });
      setTimeout(() => {
        stopPrintAnimation();
        receiptEl.classList.remove('printing-out');
        receiptEl.style.transition = '';
        receiptEl.style.transform = '';
        receiptEl.style.opacity = '';
      }, 5000);
    }
  });
}

/* ===================== 清单行渲染（含滑动操作）===================== */
function renderItems(receipt, container) {
  container.innerHTML = '';

  receipt.items.forEach((item, i) => {
    const wrap = document.createElement('div');
    wrap.className = 'receipt-item-wrap' + (item.finished ? ' finished' : '');

    // 滑动操作按钮层
    const swipeActions = document.createElement('div');
    swipeActions.className = 'receipt-swipe-actions';

    const finishBtn = document.createElement('button');
    finishBtn.className = 'receipt-swipe-btn finish';
    finishBtn.textContent = 'Finish';
    finishBtn.addEventListener('click', e => {
      e.stopPropagation();
      item.finished = !item.finished;
      saveData(appData);
      renderItems(receipt, container);
    });

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'receipt-swipe-btn delete';
    deleteBtn.textContent = 'Delete';
    deleteBtn.addEventListener('click', e => {
      e.stopPropagation();
      receipt.items.splice(i, 1);
      saveData(appData);
      renderItems(receipt, container);
    });

    swipeActions.appendChild(finishBtn);
    swipeActions.appendChild(deleteBtn);

    // 行内容
    const row = document.createElement('div');
    row.className = 'receipt-item';

    row.innerHTML = `
      <span class="receipt-item-index">${String(i + 1).padStart(2, '0')}</span>
      <input class="receipt-item-text" value="${escapeHtml(item.text)}"
             placeholder="填写今天不做的第${i + 1}件事…" data-index="${i}"
             ${item.finished ? 'readonly' : ''} />
    `;

    const input = row.querySelector('input');
    input.addEventListener('change', () => {
      item.text = input.value;
      saveData(appData);
    });

    // ----- 触摸/鼠标滑动交互 -----
    let startX = 0, startY = 0, isDragging = false, isHorizontal = false;

    row.addEventListener('pointerdown', e => {
      startX = e.clientX;
      startY = e.clientY;
      isDragging = false;
      isHorizontal = false;
      row.setPointerCapture(e.pointerId);
    });

    row.addEventListener('pointermove', e => {
      if (!row.hasPointerCapture(e.pointerId)) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      if (!isDragging && (Math.abs(dx) > 5 || Math.abs(dy) > 5)) {
        isDragging = true;
        isHorizontal = Math.abs(dx) > Math.abs(dy);
      }
      if (!isDragging || !isHorizontal) return;
      // 只允许左滑
      if (dx < 0) {
        const offset = Math.max(dx, -140);
        row.style.transition = 'none';
        row.style.transform = `translateX(${offset}px)`;
      }
    });

    row.addEventListener('pointerup', e => {
      row.style.transition = '';
      if (!isDragging || !isHorizontal) {
        // 点击行为：没有拖动则聚焦输入框
        if (!item.finished) input.focus();
        row.style.transform = '';
        return;
      }
      const dx = e.clientX - startX;
      if (dx < -40) {
        row.classList.add('swiped-left');
        row.classList.remove('swiped-right');
      } else {
        row.classList.add('swiped-right');
        row.classList.remove('swiped-left');
      }
    });

    row.addEventListener('pointercancel', () => {
      row.style.transition = '';
      row.style.transform = '';
    });

    // 点击行外部关闭滑动
    row.addEventListener('pointerleave', () => {
      // 不做任何事，让 pointerup 处理
    });

    // 点击其他地方重置滑动
    document.addEventListener('pointerdown', function resetSwipe(e) {
      if (!wrap.contains(e.target)) {
        row.classList.remove('swiped-left');
        row.classList.add('swiped-right');
      }
    });

    wrap.appendChild(swipeActions);
    wrap.appendChild(row);
    container.appendChild(wrap);
  });

  // 最后一行的 + 添加行按钮（无边框）
  const addBtn = document.createElement('button');
  addBtn.className = 'receipt-add-row';
  addBtn.innerHTML = '<span class="plus-icon">+</span> 添加一行';
  addBtn.addEventListener('click', () => {
    receipt.items.push({ text: '', finished: false });
    saveData(appData);
    renderItems(receipt, container);
  });
  container.appendChild(addBtn);
}

/* ===================== 归档 ===================== */
function archiveReceipt(receipt) {
  if (receipt.archived) return;
  receipt.archived = true;
  appData.archives.push({ ...receipt, archivedAt: Date.now() });
  saveData(appData);
  renderReceiptWall();
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, m =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}

/* ===================== 跨天自动归档 ===================== */
function carryOverUnarchived() {
  const today = todayKey();
  const oldReceipts = appData.receipts.filter(r => r.date !== today);
  if (oldReceipts.length > 0) {
    oldReceipts.forEach(r => {
      if (!r.archived) {
        r.archived = true;
        r.archivedAt = Date.now();
        appData.archives.push({ ...r });
      }
    });
    // 移除非今日收据，只保留今天的
    appData.receipts = appData.receipts.filter(r => r.date === today);
    saveData(appData);
  }
}

/* ===================== 票夹回顾（像素文件夹 + 飞出小票）===================== */
let archiveOpened = false;
let archiveCollectBtn = null;

function drawPixelFolder(canvas) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const s = 3; // 每个像素放大3倍 → canvas 96x80 显示 32x~27 像素
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // 颜色定义
  const BLUE = '#3B7BC0';
  const BLUE_LIGHT = '#5A9AD6';
  const BLACK = '#1a1a1a';
  const RED = '#E53935';
  const RED_LIGHT = '#FF8A80';
  const RED_DARK = '#8B1A1A';

  // 像素绘制函数
  function px(x, y, color) {
    ctx.fillStyle = color;
    ctx.fillRect(x * s, y * s, s, s);
  }

  // 文件夹 Tab（标签页部分）
  const tabPixels = [
    // tab 外框
    [1,0,BLACK],[2,0,BLACK],[3,0,BLACK],[4,0,BLACK],[5,0,BLACK],[6,0,BLACK],[7,0,BLACK],[8,0,BLACK],[9,0,BLACK],[10,0,BLACK],[11,0,BLACK],[12,0,BLACK],[13,0,BLACK],
    [1,1,BLACK],[2,1,BLUE_LIGHT],[3,1,BLUE_LIGHT],[4,1,BLUE_LIGHT],[5,1,BLUE_LIGHT],[6,1,BLUE_LIGHT],[7,1,BLUE_LIGHT],[8,1,BLUE_LIGHT],[9,1,BLUE_LIGHT],[10,1,BLUE_LIGHT],[11,1,BLUE_LIGHT],[12,1,BLUE_LIGHT],[13,1,BLACK],
    [1,2,BLACK],[2,2,BLUE_LIGHT],[3,2,BLUE_LIGHT],[4,2,BLUE_LIGHT],[5,2,BLUE_LIGHT],[6,2,BLUE_LIGHT],[7,2,BLUE_LIGHT],[8,2,BLUE_LIGHT],[9,2,BLUE_LIGHT],[10,2,BLUE_LIGHT],[11,2,BLUE_LIGHT],[12,2,BLUE_LIGHT],[13,2,BLACK],
    [1,3,BLACK],[2,3,BLACK],[3,3,BLACK],[4,3,BLACK],[5,3,BLACK],[6,3,BLACK],[7,3,BLACK],[8,3,BLACK],[9,3,BLACK],[10,3,BLACK],[11,3,BLACK],[12,3,BLACK],[13,3,BLACK],
  ];
  tabPixels.forEach(([x, y, c]) => px(x, y, c));

  // 文件夹主体
  const bodyPixels = [
    // 第4行（与tab底部连接）
    [0,4,BLACK],[1,4,BLACK],[2,4,BLACK],[3,4,BLUE],[4,4,BLUE],[5,4,BLUE],[6,4,BLUE],[7,4,BLUE],[8,4,BLUE],[9,4,BLUE],[10,4,BLUE],[11,4,BLUE],[12,4,BLUE],[13,4,BLACK],[14,4,BLACK],[15,4,BLACK],[16,4,BLACK],[17,4,BLACK],[18,4,BLACK],[19,4,BLACK],[20,4,BLACK],[21,4,BLACK],[22,4,BLACK],[23,4,BLACK],[24,4,BLACK],[25,4,BLACK],[26,4,BLACK],[27,4,BLACK],[28,4,BLACK],[29,4,BLACK],[30,4,BLACK],[31,4,BLACK],
    // 第5行
    [0,5,BLACK],[1,5,BLUE],[2,5,BLUE],[3,5,BLUE],[4,5,BLUE],[5,5,BLUE],[6,5,BLUE],[7,5,BLUE],[8,5,BLUE],[9,5,BLUE],[10,5,BLUE],[11,5,BLUE],[12,5,BLUE],[13,5,BLUE],[14,5,BLUE],[15,5,BLUE],[16,5,BLUE],[17,5,BLUE],[18,5,BLUE],[19,5,BLUE],[20,5,BLUE],[21,5,BLUE],[22,5,BLUE],[23,5,BLUE],[24,5,BLUE],[25,5,BLUE],[26,5,BLUE],[27,5,BLUE],[28,5,BLUE],[29,5,BLUE],[30,5,BLUE],[31,5,BLACK],
    // 第6~20行（主体内容区域）
  ];

  // 生成中间行
  for (let row = 6; row <= 20; row++) {
    bodyPixels.push([0, row, BLACK]);
    for (let col = 1; col <= 30; col++) {
      bodyPixels.push([col, row, BLUE]);
    }
    bodyPixels.push([31, row, BLACK]);
  }

  // 第21行（底部）
  bodyPixels.push([0,21,BLACK]);
  for (let col = 1; col <= 30; col++) {
    bodyPixels.push([col, 21, BLUE]);
  }
  bodyPixels.push([31,21,BLACK]);

  // 第22行（底部边框高光）
  bodyPixels.push([0,22,BLACK]);
  for (let col = 1; col <= 30; col++) {
    bodyPixels.push([col, 22, BLACK]);
  }
  bodyPixels.push([31,22,BLACK]);

  bodyPixels.forEach(([x, y, c]) => px(x, y, c));

  // 心形图标（居中在文件夹主体上）
  const heartCx = 14, heartCy = 11;
  const heart = [
    [0,-2,RED],[1,-2,RED_LIGHT],[3,-2,RED],[4,-2,RED],
    [-1,-1,RED],[0,-1,RED_LIGHT],[1,-1,RED],[2,-1,RED],[3,-1,RED],[4,-1,RED],[5,-1,RED_DARK],
    [-2,0,RED],[-1,0,RED_LIGHT],[0,0,RED],[1,0,RED],[2,0,RED],[3,0,RED],[4,0,RED],[5,0,RED],[6,0,RED_DARK],
    [-2,1,RED],[-1,1,RED],[0,1,RED],[1,1,RED],[2,1,RED],[3,1,RED],[4,1,RED],[5,1,RED],[6,1,RED_DARK],
    [-1,2,RED],[0,2,RED],[1,2,RED],[2,2,RED],[3,2,RED],[4,2,RED],[5,2,RED_DARK],
    [0,3,RED],[1,3,RED],[2,3,RED],[3,3,RED],[4,3,RED_DARK],
    [1,4,RED],[2,4,RED],[3,4,RED_DARK],
    [2,5,RED_DARK],
  ];
  heart.forEach(([dx, dy, c]) => px(heartCx + dx, heartCy + dy, c));
}

function renderArchive() {
  if (!flyingTickets) flyingTickets = document.getElementById('flying-tickets');
  if (!archiveEmpty) archiveEmpty = document.getElementById('archive-empty');
  if (!folderEl) folderEl = document.getElementById('pixel-folder');
  if (!folderCanvas) folderCanvas = document.getElementById('folder-canvas');
  if (!folderLabel) folderLabel = document.getElementById('folder-label');

  // 绘制像素文件夹
  drawPixelFolder(folderCanvas);

  const sorted = [...appData.archives].sort((a, b) => b.archivedAt - a.archivedAt);
  if (archiveEmpty) archiveEmpty.classList.toggle('visible', sorted.length === 0);

  // 没有归档时隐藏文件夹
  // （始终显示文件夹）
  if (flyingTickets) flyingTickets.innerHTML = '';

  // 重置状态
  archiveOpened = false;
  if (folderEl) folderEl.classList.remove('opened');

  // 更新文件夹标签
  if (folderLabel) {
    folderLabel.textContent = sorted.length > 0
      ? `${sorted.length} 份归档 · 点击打开`
      : '暂无归档 · 点击查看';
  }

  // 移除旧的收回按钮
  if (archiveCollectBtn) { archiveCollectBtn.remove(); archiveCollectBtn = null; }

  // 文件夹点击事件
  if (folderEl) {
    // 克隆替换以移除旧事件
    const newFolder = folderEl.cloneNode(true);
    folderEl.parentNode.replaceChild(newFolder, folderEl);
    folderEl = newFolder;
    folderCanvas = document.getElementById('folder-canvas');
    folderLabel = document.getElementById('folder-label');
    drawPixelFolder(folderCanvas);

    newFolder.addEventListener('click', () => {
      if (archiveOpened) return;
      archiveOpened = true;
      folderEl.classList.add('opened');
      flyOutTickets(sorted);
    });
  }
}

/* ===================== 轮播逻辑 ===================== */
let carouselArchives = [];
let carouselIndex = 0;
let currentCarouselTicket = null;
let carouselPrevBtn = null;
let carouselNextBtn = null;
let carouselIndicator = null;

function flyOutTickets(archives) {
  if (!flyingTickets) flyingTickets = document.getElementById('flying-tickets');
  flyingTickets.innerHTML = '';

  if (archives.length === 0) return;

  carouselArchives = archives;
  carouselIndex = 0;

  // 创建轮播 wrapper
  const wrapper = document.createElement('div');
  wrapper.className = 'carousel-wrapper';

  // 左右按钮
  carouselPrevBtn = document.createElement('button');
  carouselPrevBtn.className = 'carousel-btn prev';
  carouselPrevBtn.textContent = '‹';
  carouselPrevBtn.disabled = true;
  carouselPrevBtn.addEventListener('click', () => switchCarousel(-1));

  carouselNextBtn = document.createElement('button');
  carouselNextBtn.className = 'carousel-btn next';
  carouselNextBtn.textContent = '›';
  carouselNextBtn.disabled = archives.length <= 1;
  carouselNextBtn.addEventListener('click', () => switchCarousel(1));

  // 页码
  carouselIndicator = document.createElement('div');
  carouselIndicator.className = 'carousel-indicator';
  carouselIndicator.textContent = `1 / ${archives.length}`;

  wrapper.appendChild(carouselPrevBtn);
  wrapper.appendChild(carouselNextBtn);
  wrapper.appendChild(carouselIndicator);

  // 创建第一张卡片并播放入场动画
  currentCarouselTicket = createArchiveTicket(archives[0], 0);
  currentCarouselTicket.classList.add('fly-in-carousel');
  wrapper.appendChild(currentCarouselTicket);

  flyingTickets.appendChild(wrapper);

  // 显示轮播区域
  flyingTickets.classList.add('active');

  // 添加收回按钮
  archiveCollectBtn = document.createElement('button');
  archiveCollectBtn.className = 'archive-collect-btn';
  archiveCollectBtn.textContent = 'COLLECT ALL';
  archiveCollectBtn.addEventListener('click', collectTickets);
  const area = document.getElementById('archive-folder-area');
  if (area) area.appendChild(archiveCollectBtn);
  setTimeout(() => archiveCollectBtn && archiveCollectBtn.classList.add('visible'), 600);
}

function switchCarousel(direction) {
  if (!flyingTickets || carouselArchives.length === 0) return;

  const oldTicket = currentCarouselTicket;
  if (!oldTicket) return;

  const newIndex = carouselIndex + direction;
  if (newIndex < 0 || newIndex >= carouselArchives.length) return;

  carouselIndex = newIndex;

  // 旧卡片滑出
  oldTicket.classList.add(direction > 0 ? 'slide-left' : 'slide-right');

  // 延迟后替换为新卡片
  setTimeout(() => {
    oldTicket.remove();

    const wrapper = flyingTickets.querySelector('.carousel-wrapper');
    if (!wrapper) return;

    currentCarouselTicket = createArchiveTicket(carouselArchives[carouselIndex], carouselIndex);
    currentCarouselTicket.classList.add(direction > 0 ? 'slide-in-right' : 'slide-in-left');
    wrapper.appendChild(currentCarouselTicket);

    // 更新按钮和页码
    if (carouselPrevBtn) carouselPrevBtn.disabled = carouselIndex === 0;
    if (carouselNextBtn) carouselNextBtn.disabled = carouselIndex === carouselArchives.length - 1;
    if (carouselIndicator) carouselIndicator.textContent = `${carouselIndex + 1} / ${carouselArchives.length}`;
  }, 280);
}

function createArchiveTicket(arc, index) {
  const ticket = document.createElement('div');
  ticket.className = 'archive-ticket';

  const finishedCount = arc.items.filter(it => it.finished).length;
  const total = arc.items.length;

  // 顶部波浪
  const waveTop = document.createElement('div');
  waveTop.className = 'archive-ticket-wave-top';
  ticket.appendChild(waveTop);

  // 简洁视图：日期 + 条形码
  const simpleView = document.createElement('div');
  simpleView.className = 'archive-ticket-simple';
  simpleView.innerHTML = `
    <div class="archive-ticket-simple-date">${formatDateZH(arc.date)}</div>
    <div class="archive-ticket-simple-barcode"></div>
  `;
  ticket.appendChild(simpleView);

  // 详细视图（默认隐藏）
  const detailView = document.createElement('div');
  detailView.className = 'archive-ticket-detail';

  // 顶部条形码
  const topBarcode = document.createElement('div');
  topBarcode.className = 'archive-ticket-top-barcode';
  detailView.appendChild(topBarcode);

  // Header
  const header = document.createElement('div');
  header.className = 'archive-ticket-header';
  header.innerHTML = `
    <span class="archive-ticket-tag">STOP DOING LIST</span>
    <div class="archive-ticket-title">Day Receipt</div>
    <div class="archive-ticket-date">${formatDateZH(arc.date)} · #${String(index + 1).padStart(3, '0')}</div>
  `;
  detailView.appendChild(header);

  // Divider
  const divider = document.createElement('div');
  divider.className = 'archive-ticket-divider';
  detailView.appendChild(divider);

  // Items
  const itemsEl = document.createElement('div');
  itemsEl.className = 'archive-ticket-items';
  arc.items.forEach((it, i) => {
    const itemEl = document.createElement('div');
    itemEl.className = 'archive-ticket-item';
    const text = it.text || '';
    itemEl.innerHTML = `
      <span class="archive-ticket-item-index">${String(i + 1).padStart(2, '0')}</span>
      <span class="archive-ticket-item-text${text ? '' : ' empty'}">${escapeHtml(text) || '（空白）'}</span>
    `;
    itemsEl.appendChild(itemEl);
  });
  detailView.appendChild(itemsEl);

  // Footer
  const footer = document.createElement('div');
  footer.className = 'archive-ticket-footer';
  footer.textContent = finishedCount === total && total > 0 ? 'GOOOOOD !' : 'ARCHIVED';
  detailView.appendChild(footer);

  // Bottom barcode
  const bottomBarcode = document.createElement('div');
  bottomBarcode.className = 'archive-ticket-bottom-barcode';
  detailView.appendChild(bottomBarcode);

  ticket.appendChild(detailView);

  // 底部波浪
  const waveBottom = document.createElement('div');
  waveBottom.className = 'archive-ticket-wave';
  ticket.appendChild(waveBottom);

  // 点击切换展开/收起详细视图
  ticket.addEventListener('click', (e) => {
    e.stopPropagation();
    // 如果已经展开，收起
    if (ticket.classList.contains('expanded')) {
      ticket.classList.remove('expanded');
      return;
    }
    // 收起其他已展开的卡片
    flyingTickets.querySelectorAll('.archive-ticket.expanded').forEach(t => {
      t.classList.remove('expanded');
    });
    // 展开当前
    ticket.classList.add('expanded');
    // 提升z-index
    ticket.style.zIndex = 100;
    // 展开后再次点击外部收起
    setTimeout(() => {
      const closeHandler = (ev) => {
        if (!ticket.contains(ev.target)) {
          ticket.classList.remove('expanded');
          ticket.style.zIndex = '';
          document.removeEventListener('pointerdown', closeHandler);
        }
      };
      document.addEventListener('pointerdown', closeHandler);
    }, 10);
  });

  return ticket;
}

function collectTickets() {
  if (!flyingTickets) return;

  // 淡出轮播区域
  flyingTickets.classList.remove('active');

  // 重置轮播状态
  carouselArchives = [];
  carouselIndex = 0;
  currentCarouselTicket = null;
  carouselPrevBtn = null;
  carouselNextBtn = null;
  carouselIndicator = null;

  setTimeout(() => {
    flyingTickets.innerHTML = '';
    if (folderEl) folderEl.classList.remove('opened');
    archiveOpened = false;
    if (archiveCollectBtn) { archiveCollectBtn.remove(); archiveCollectBtn = null; }
    renderArchive();
  }, 500);
}

function showReceiptModal(receipt) {
  const wrap = document.createElement('div');
  wrap.style.cssText = 'position:fixed;inset:0;z-index:90;background:rgba(0,0,0,0.85);display:flex;align-items:center;justify-content:center;padding:20px;overflow:auto;';
  const inner = document.createElement('div');
  inner.style.cssText = 'max-width:520px;width:100%;transform:scale(0.95);animation:receiptSlide 0.4s ease forwards;';
  inner.innerHTML = `
    <div class="receipt" style="padding:0 28px 38px">
      <div class="receipt-top-barcode" style="margin:0 10px"></div>
      <div class="receipt-wavy-divider"></div>
      <div class="receipt-header">
        <span class="receipt-tag">ARCHIVED RECEIPT</span>
        <h3 class="receipt-title">Day Receipt</h3>
        <div class="receipt-date">${formatDateZH(receipt.date)}</div>
      </div>
      ${receipt.items.map((it, i) => `
        <div class="receipt-item-wrap${it.finished ? ' finished' : ''}">
          <div class="receipt-item" style="cursor:default;padding:10px 12px">
            <span class="receipt-item-index">${String(i + 1).padStart(2, '0')}</span>
            <div class="receipt-item-text" style="border:none;cursor:default">${escapeHtml(it.text) || '<span style="color:#bbb">（空白）</span>'}</div>
          </div>
        </div>
      `).join('')}
      <div class="receipt-footer">
        <div>${receipt.items.every(i => i.finished) ? 'GOOOOOD !' : 'ARCHIVED'}</div>
        <div class="receipt-barcode"></div>
      </div>
      <div class="receipt-bottom-wave"></div>
    </div>
  `;
  wrap.appendChild(inner);
  wrap.addEventListener('click', e => { if (e.target === wrap) wrap.remove(); });
  document.body.appendChild(wrap);
}

/* ===================== 时光机 ===================== */
const badInput = document.getElementById('bad-habit-input');
const predictBtn = document.getElementById('btn-predict');
const snapshotCard = document.getElementById('snapshot-card');
const snapshotText = document.getElementById('snapshot-text');
const addTodayBtn = document.getElementById('btn-add-today');

function generateSnapshot(habit) {
  const input = habit.toLowerCase();

  // 匹配分类
  let matched = null;
  for (const cat of HABIT_CATEGORIES) {
    if (cat.keywords.some(kw => input.includes(kw))) {
      matched = cat;
      break;
    }
  }

  // 生成随机变量池
  const rv = () => Math.floor(Math.random() * 40) + 5;  // 5~44
  const rvSmall = () => Math.floor(Math.random() * 15) + 3; // 3~17
  const rvBig = () => Math.floor(Math.random() * 200) + 50;  // 50~249

  if (matched) {
    // 根据分类生成有针对性的变量
    const v = generateCategoryVars(matched.name, rv, rvSmall, rvBig);
    const tpl = matched.templates[Math.floor(Math.random() * matched.templates.length)];
    return tpl(v);
  }

  // 兜底：通用模板
  const tpl = GENERIC_TEMPLATES[Math.floor(Math.random() * GENERIC_TEMPLATES.length)];
  const v = {
    min: rvSmall() * 5,
    h: rv() * 20,
    cnt: rv() * 10,
    day: 21 + Math.floor(Math.random() * 45) // 21~66 天
  };
  return tpl(habit, v);
}

function generateCategoryVars(categoryName, rv, rvSmall, rvBig) {
  const base = {
    h: rv() * 10,        // 年累计小时
    min: rvSmall() * 5,   // 每次分钟
    cnt: rv() * 8,        // 年/周次数
    d: Math.floor(rv() * 10 / 8), // 折算天数
    pct: rvSmall() + 10,  // 百分比 13~27
  };

  switch (categoryName) {
    case '数字沉迷':
      return { ...base, y: base.h, d: Math.floor(base.h / 8), w: Math.floor(base.h / 52), b: Math.floor(base.h / 6), km: base.h * 3, m: rvSmall(), pages: rvSmall() * 3, sec: 15 + Math.floor(Math.random() * 30), cnt: 30 + Math.floor(Math.random() * 100), total: 10000 + Math.floor(Math.random() * 40000) };
    case '睡眠剥夺':
      return { ...base, min: 30 + Math.floor(Math.random() * 90), time: ['1点', '2点', '3点', '14:00', '15:00'][Math.floor(Math.random() * 5)], load: 15 + Math.floor(Math.random() * 25), d: Math.floor(base.h / 8) };
    case '无意识进食':
      return { ...base, cal: 150 + Math.floor(Math.random() * 350), total: (150 + Math.floor(Math.random() * 350)) * 365, fat: +(2 + Math.random() * 8).toFixed(1), money: 2000 + Math.floor(Math.random() * 8000), book: 10 + Math.floor(Math.random() * 40), trip: 20 + Math.floor(Math.random() * 80) };
    case '冲动消费':
      return { ...base, money: 3000 + Math.floor(Math.random() * 15000), year: 5 + Math.floor(Math.random() * 10), future: Math.floor((3000 + Math.random() * 15000) * Math.pow(1.05, 5 + Math.random() * 10)), min: 10 + Math.floor(Math.random() * 30), cnt: 20 + Math.floor(Math.random() * 80), pct: 50 + Math.floor(Math.random() * 30) };
    case '无效社交':
      return { ...base, d: Math.floor(base.h / 8), cnt: 10 + Math.floor(Math.random() * 50), project: 2 + Math.floor(Math.random() * 5), pct: 60 + Math.floor(Math.random() * 30) };
    case '精神内耗':
      return { ...base, d: Math.floor(base.h / 8), time: ['2:00', '3:00', '4:00'][Math.floor(Math.random() * 3)], exam: 3 + Math.floor(Math.random() * 8), project: 3 + Math.floor(Math.random() * 10) };
    case '注意力分散':
      return { ...base, cnt: 5 + Math.floor(Math.random() * 15), extra: 20 + Math.floor(Math.random() * 40), d: Math.floor(base.h / 8), pct: 20 + Math.floor(Math.random() * 40) };
    case '成瘾物质':
      return { ...base, money: 1000 + Math.floor(Math.random() * 10000), trip: 3 + Math.floor(Math.random() * 10), cnt: 1 + Math.floor(Math.random() * 8), total: (1 + Math.floor(Math.random() * 8)) * 365, year: 3 + Math.floor(Math.random() * 10), cost: 5 + Math.floor(Math.random() * 50), min: 30 + Math.floor(Math.random() * 120) };
    default:
      return base;
  }
}

if (predictBtn) predictBtn.addEventListener('click', () => {
  const habit = badInput.value.trim();
  if (!habit) return;
  currentSnapshot = habit;
  snapshotText.innerHTML = `如果继续「<strong>${escapeHtml(habit)}</strong>」……<br><br>${generateSnapshot(habit)}`;
  snapshotCard.classList.remove('hidden');
  appData.predictions.push({ habit, at: Date.now() });
  saveData(appData);
});

if (addTodayBtn) addTodayBtn.addEventListener('click', () => {
  if (!currentSnapshot) return;
  let today = appData.receipts.find(r => r.date === todayKey());
  if (!today) {
    today = createReceipt(todayKey());
    appData.receipts.unshift(today);
    isNewPrint = true; // 新建清单，触发打印动画
  } else {
    isNewPrint = false; // 已存在的清单，不播放打印动画
  }
  today.items.push({ text: `不做：${currentSnapshot}`, finished: false });
  saveData(appData);
  snapshotCard.classList.add('hidden');
  badInput.value = '';
  currentSnapshot = null;
  showPage('list');
});

if (badInput) badInput.addEventListener('keydown', e => { if (e.key === 'Enter' && predictBtn) predictBtn.click(); });

/* ===================== 数据统计 ===================== */
function renderStats() {
  const now = new Date();
  const counts = { today: 0, week: 0, month: 0, year: 0 };
  const times = { today: 0, week: 0, month: 0, year: 0 };

  const all = [...appData.receipts, ...appData.archives];
  const seen = new Set();
  const unique = [];

  all.forEach(r => {
    const key = r.date + r.id;
    if (seen.has(key)) return;
    seen.add(key);
    unique.push(r);
  });
  unique.forEach(r => {
    const [y, m, d] = r.date.split('-').map(Number);
    const rDate = new Date(y, m - 1, d);
    const finishedCount = r.items.filter(i => i.finished).length;
    const savedMin = finishedCount * 25;

    if (r.date === todayKey()) { counts.today += finishedCount; times.today += savedMin; }
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    weekStart.setHours(0, 0, 0, 0);
    if (rDate >= weekStart) { counts.week += finishedCount; times.week += savedMin; }
    if (y === now.getFullYear() && m === now.getMonth() + 1) { counts.month += finishedCount; times.month += savedMin; }
    if (y === now.getFullYear()) { counts.year += finishedCount; times.year += savedMin; }
  });

  updateStat('today', counts.today, times.today);
  updateStat('week', counts.week, times.week);
  updateStat('month', counts.month, times.month);
  updateStat('year', counts.year, times.year);
  renderTrendBars(unique, seen);
}

function updateStat(period, count, minutes) {
  const elCount = document.getElementById(`stat-${period}-count`);
  const elTime = document.getElementById(`stat-${period}-time`);
  if (elCount) elCount.textContent = count;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (elTime) elTime.textContent = `节省 ${h}h${m ? m + 'm' : ''}`;
}

function renderTrendBars(all, seen) {
  const container = document.getElementById('trend-bars');
  if (!container) return;
  container.innerHTML = '';
  const days = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    days.push({ date: key, count: 0 });
  }
  const map = new Map();
  all.forEach(r => {
    if (!seen.has(r.date + r.id)) return;
    map.set(r.date, (map.get(r.date) || 0) + r.items.filter(i => i.finished).length);
  });
  days.forEach(d => { d.count = map.get(d.date) || 0; });
  const max = Math.max(1, ...days.map(d => d.count));
  days.forEach(d => {
    const bar = document.createElement('div');
    bar.className = 'trend-bar' + (d.count === 0 ? ' zero' : '');
    bar.style.height = (Math.max(4, (d.count / max) * 100)) + '%';
    bar.title = `${formatDateZH(d.date)}: ${d.count} 件`;
    container.appendChild(bar);
  });
}

/* ===================== 初始化 ===================== */
window.addEventListener('resize', resizeCanvas);
window.addEventListener('mousemove', e => {
  mouse.x = e.clientX;
  mouse.y = e.clientY;
  mouseOnPage = true;
  // 清单页收据区域不触发像素交互
  if (currentPage === 'list') { mouseOnPage = false; mouse.x = -1000; mouse.y = -1000; return; }
});
window.addEventListener('mouseleave', () => {
  mouseOnPage = false;
  mouse.x = -1000;
  mouse.y = -1000;
});
window.addEventListener('mouseenter', () => {
  mouseOnPage = true;
});
window.addEventListener('touchmove', e => {
  const t = e.touches[0];
  mouse.x = t.clientX;
  mouse.y = t.clientY;
  mouseOnPage = true;
}, { passive: true });

document.addEventListener('DOMContentLoaded', () => {
  getPages();
  setupPrintButton();
  resizeCanvas();
  drawPixelBackground();
  carryOverUnarchived();
  updatePrintButton();
  showPage('home');
});

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') showPage('home');
});
