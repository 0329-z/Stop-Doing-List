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
    keywords: ['零食', '奶茶', '吃', '外卖', '甜食', '蛋糕', '炸鸡', '烧烤', '喝饮料', '可乐', '夜宵', '加餐', '薯片', '饼干', '甜品', '巧克力'],
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
    keywords: ['多任务', '同时', '接三个', '并行', '切换', 'multitask', '一边', '三心二意', '分心', '打断'],
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

function loadData() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) {
      const data = JSON.parse(raw);
      if (!data.archives) data.archives = [];
      // 迁移旧字段 done -> finished
      [...data.receipts, ...data.archives].forEach(r => {
        r.items.forEach(it => {
          if (it.finished === undefined && it.done !== undefined) it.finished = it.done;
          if (it.finished === undefined) it.finished = false;
        });
      });
      // 迁移：给没有 orderNum 的旧数据补上序号（按创建时间排序）
      const all = [...data.receipts, ...data.archives].sort((a, b) => {
        if (!a.createdAt) return -1;
        if (!b.createdAt) return 1;
        return a.createdAt - b.createdAt;
      });
      all.forEach((r, i) => {
        if (!r.orderNum) r.orderNum = i + 1;
      });
      // 保存迁移后的数据
      localStorage.setItem(STORE_KEY, JSON.stringify(data));
      return data;
    }
  } catch (e) {}
  return { receipts: [], archives: [], predictions: [] };
}

function saveData(data) {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(data));
  } catch (e) {
    console.warn('LocalStorage unavailable (incognito mode?), data will not persist');
    const toast = document.createElement('div');
    toast.style.cssText = 'position:fixed;top:60px;left:50%;transform:translateX(-50%);background:rgba(126,38,37,0.9);color:#fff;padding:8px 16px;font-size:12px;border-radius:4px;z-index:100;pointer-events:none;animation:fadeUp 0.3s ease;';
    toast.textContent = '无痕模式：数据不会保存';
    document.body.appendChild(toast);
    setTimeout(() => { toast.remove(); }, 3000);
  }
}

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

function formatDateUS(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const months = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
  return `${months[m - 1]} ${String(d).padStart(2, '0')}, ${y}`;
}

function formatTime(timestamp) {
  if (!timestamp) return '00:00:00';
  const d = new Date(timestamp);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
}

/* ===================== 页面导航 ===================== */
let pages = {};
let homeBtn, receiptWall;

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
}

function showPage(name) {
  if (!pages.list) getPages();
  Object.values(pages).forEach(p => { if (p) p.classList.remove('active'); });
  if (pages[name]) pages[name].classList.add('active');
  currentPage = name;
  if (homeBtn) {
    // LIST/TIME/DATA 页改用 BACK TO HOME 链接，不再显示叉号
    const useBackLink = name === 'list' || name === 'time' || name === 'stats';
    const shouldShow = name === 'home' ? false : (useBackLink ? false : true);
    homeBtn.classList.toggle('visible', shouldShow);
    homeBtn.classList.remove('on-list');
  }

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
    if (name === 'stats') renderDataGrid();
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
    // 离开归档页时收回门后空间
    if (name !== 'archive' && window.ArchiveSpace && typeof window.ArchiveSpace.reset === 'function') {
      window.ArchiveSpace.reset();
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
  // BACK TO HOME 链接（LIST/TIME/DATA 页右上角）
  document.querySelectorAll('.back-home-link').forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      showPage('home');
    });
  });
});

/* ===================== 清单打印 ===================== */
let printBtn, printStatus, printerSlot;
let printIcon, printIconTimer = null, printIconIdx = 0;
const PRINT_ICON_FRAMES = 68;
const PRINT_ICON_FPS = 12;

function setupPrintButton() {
  printBtn = document.getElementById('btn-print');   // 兼容保留：部分旧逻辑可能仍引用
  printStatus = document.getElementById('print-status');
  printerSlot = document.getElementById('printer-slot');
  printIcon = document.getElementById('print-icon');
  if (printIcon) {
    // 预加载 23 帧
    printIcon._frames = [];
    for (let i = 0; i < PRINT_ICON_FRAMES; i++) {
      const im = new Image();
      im.src = `assets/icon-frames/printer-red/f${String(i).padStart(2, '0')}.png`;
      printIcon._frames.push(im);
    }
    printIcon.addEventListener('click', printToday);
    printIcon.addEventListener('mouseenter', startPrintIconPlay);
    printIcon.addEventListener('mouseleave', stopPrintIconPlay);
  }
}

function startPrintIconPlay() {
  if (!printIcon) return;
  stopPrintIconPlay();
  printIconIdx = 0;
  printIconTimer = setInterval(() => {
    printIconIdx = (printIconIdx + 1) % PRINT_ICON_FRAMES;
    const im = printIcon._frames[printIconIdx];
    if (im) printIcon.src = im.src;
  }, 1000 / PRINT_ICON_FPS);
}

function stopPrintIconPlay() {
  if (printIconTimer) { clearInterval(printIconTimer); printIconTimer = null; }
  printIconIdx = 0;
  if (printIcon) printIcon.src = 'assets/icon-frames/printer-red/f00.png';
}

function getTodayReceipt() {
  return appData.receipts.find(r => r.date === todayKey());
}
function hasTodayReceipt() { return !!getTodayReceipt(); }

function updatePrintButton() {
  if (!printStatus) return;
  if (hasTodayReceipt()) {
    printStatus.textContent = `今日清单已打印：${formatDateZH(todayKey())}`;
  } else {
    printStatus.textContent = '点击上方打印机，打印今天的「不做清单」';
  }
}

function createReceipt(date, items = null) {
  const blankItems = items || [
    { text: '', finished: false },
    { text: '', finished: false },
    { text: '', finished: false }
  ];
  // 基于已打印过的清单总数（receipts + archives）生成递增序号
  const totalCount = appData.receipts.length + appData.archives.length;
  return {
    id: 'R' + Date.now() + Math.random().toString(36).slice(2, 6),
    date,
    orderNum: totalCount + 1,
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
  if (printIcon) printIcon.classList.add('busy');

  setTimeout(() => {
    const receipt = createReceipt(todayKey());
    appData.receipts.unshift(receipt);
    saveData(appData);
    updatePrintButton();
    isNewPrint = true; // 标记为新打印，触发打印动画
    showPage('list');
    // 打印联动钩子：通知流体背景模块
    window.dispatchEvent(new CustomEvent('print-progress', { detail: { active: true, receiptId: receipt.id } }));
    // active:false 改为监听出票动画结束（见 schedulePrintEnd），不再硬编码 800ms
    schedulePrintEnd();
  }, 600);
}

/* 打印结束调度：监听出票动画 transitionend 再解除遮罩，避免硬编码超时导致遮罩提前消失。
   出票动画由 renderReceiptWall 内 JS transition 驱动（transform 4.5s），故监听 transitionend；
   保留 6s 兜底超时（>4.5s 动画 + 余量），防止事件未触发或用户切页导致遮罩永久残留。
   每次调用创建独立闭包，支持重复打印；finish 时移除监听器，无一次性监听残留。 */
function schedulePrintEnd() {
  let finished = false;
  let boundEl = null;
  let boundHandler = null;
  let fallbackTimer = null;

  function finish() {
    if (finished) return;
    finished = true;
    if (boundEl && boundHandler) boundEl.removeEventListener('transitionend', boundHandler);
    clearTimeout(fallbackTimer);
    if (printerSlot) printerSlot.classList.remove('active');
    if (printIcon) printIcon.classList.remove('busy');
    stopPrintAnimation(); // 出票结束即刻停止打印机动画：LED 停闪、机身停震
    window.dispatchEvent(new CustomEvent('print-progress', { detail: { active: false } }));
  }

  fallbackTimer = setTimeout(finish, 6000);

  // 等两帧让 renderReceiptWall 创建 .printing-out 元素并启动 transition
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      const el = document.querySelector('.receipt.printing-out');
      if (!el) return; // 找不到（如已切页）则由兜底超时处理
      boundEl = el;
      boundHandler = (e) => {
        // 只响应 transform（4.5s 主下落），忽略 opacity（0.8s 先结束）
        if (e.target === el && e.propertyName === 'transform') finish();
      };
      el.addEventListener('transitionend', boundHandler);
    });
  });
}

/* 打印机遮罩：计数式驱动，任何出票动画期间显示，最后一个动画结束才消失。
   active:true → 计数+1 并显示；active:false → 计数-1，归零时隐藏。
   这样多张收据连续动画、重播与首打并存时，遮罩不会因先结束的动画而提前消失。 */
var printMaskCount = 0;
window.addEventListener('print-progress', function(e) {
  const printerMask = document.getElementById('printer-mask');
  if (!printerMask) return;
  if (e.detail.active) {
    printMaskCount++;
    printerMask.classList.add('show');
  } else {
    printMaskCount = Math.max(0, printMaskCount - 1);
    if (printMaskCount === 0) printerMask.classList.remove('show');
  }
});

/* 重播路径遮罩退出调度：监听 .printing 收据的 animationend（CSS receiptDrop 1.4s），
   结束后 dispatch active:false；6s 兜底防切页/重渲染导致事件丢失后遮罩永久残留。
   与 schedulePrintEnd（.printing-out 的 transitionend 调度）并行，互不干扰。 */
function scheduleReplayMaskExit(el) {
  let finished = false;
  let handler = null;
  let timer = null;
  function finish() {
    if (finished) return;
    finished = true;
    if (handler) el.removeEventListener('animationend', handler);
    clearTimeout(timer);
    window.dispatchEvent(new CustomEvent('print-progress', { detail: { active: false } }));
  }
  timer = setTimeout(finish, 6000);
  handler = (e) => { if (e.target === el) finish(); };
  el.addEventListener('animationend', handler);
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
    isNewPrint = false; // 消费即复位：出票动画只播一次，后续重渲染全部走静态分支
    startPrintAnimation();
  } else {
    // 不是新打印，显示静态打印机作为装饰
    const printer = getListPrinter();
    if (printer) printer.classList.add('visible');
  }

  appData.receipts.forEach((receipt, index) => {
    const wrap = document.createElement('div');
    wrap.className = 'receipt-wrap';
    let receiptEl = null; // 提升到回调顶层：供 else 块外的 isPrintingOut 分支引用
    const isPrintingOut = index === 0 && isFirstNew;
    if (isPrintingOut) {
      wrap.classList.add('printing-out');
      receipt._animated = true; // 已播出票动画：堵住下方 .printing 重播路径
    } else if (receipt.date === todayKey() && !receipt._animated && !isFirstNew) {
      wrap.classList.add('printing');
      receipt._animated = true;
    }
    wrap.style.animationDelay = (index * 0.06) + 's';
    wrap.dataset.receiptIndex = index;

    if (receipt.archived) {
      // 已归档收据：撕下来的独立单张形态（复用 .roam-receipt 体系，宽度沿用清单墙宽度）
      wrap.classList.add('archived');
      const archivedEl = buildArchivedReceiptDom(receipt, index);
      wrap.appendChild(archivedEl);
      // 已归档收据之间不渲染 connector，间距自然收拢
    } else {
      // 未归档收据：连续小票形态
      receiptEl = document.createElement('div');
      receiptEl.className = 'receipt';

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
        <span class="receipt-tag">STOP-DOING LIST</span>
        <h3 class="receipt-title">Day Receipt</h3>
        <div class="receipt-date">${formatDateUS(receipt.date)} · ${formatTime(receipt.createdAt)}</div>
        <div class="receipt-order">ORDER #${String(receipt.orderNum || index + 1).padStart(4, '0')}</div>
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

      // Connector：仅当下一张收据也未归档时才渲染（连续小票只在未归档收据间连接）
      if (index < appData.receipts.length - 1) {
        const nextReceipt = appData.receipts[index + 1];
        if (!nextReceipt.archived) {
          const connector = document.createElement('div');
          connector.className = 'receipt-connector';
          wrap.appendChild(connector);
        }
      }
    }

    // 绑定长按手势（归档/撤销归档）
    attachReceiptGesture(wrap, receipt);

    receiptWall.appendChild(wrap);

    // 重播路径（.printing，CSS receiptDrop 动画）：dispatch 遮罩显示，animationend 时解除
    if (wrap.classList.contains('printing')) {
      window.dispatchEvent(new CustomEvent('print-progress', { detail: { active: true } }));
      scheduleReplayMaskExit(wrap);
    }

    // 新打印的收据：JS 驱动下滑动画
    if (isPrintingOut && receiptEl) {
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
  window.dispatchEvent(new CustomEvent('sdl:wall-rendered', { detail: { receiptCount: appData.receipts.length } }));
}

/* ===================== 清单行渲染 ===================== */
function renderItems(receipt, container) {
  container.innerHTML = '';

  receipt.items.forEach((item, i) => {
    const wrap = document.createElement('div');
    wrap.className = 'receipt-item-wrap' + (item.finished ? ' finished' : '');

    // 行内容（input 始终 readonly，编辑移到放大视图）
    const row = document.createElement('div');
    row.className = 'receipt-item';

    // 固定"不"字前缀（纯展示层，不可选/不可删/不可编辑）。
    // item.text 已以"不"开头时不重复加（防重复）。
    const showPrefix = !String(item.text || '').startsWith('不');

    // 前缀与 input 包在同一个 .receipt-item-body 里（内部无间距），
    // 保证"不"与正文视觉一体、删除线连续；.receipt-item 的 gap 只作用于序号与内容体之间
    row.innerHTML = `
      <span class="receipt-item-index">${String(i + 1).padStart(2, '0')}</span>
      <span class="receipt-item-body">${showPrefix ? '<span class="receipt-item-prefix" aria-hidden="true">不</span>' : ''}<input class="receipt-item-text" value="${escapeHtml(item.text)}"
             placeholder="做的第${i + 1}件事" data-index="${i}" readonly /></span>
    `;

    row.addEventListener('click', () => {
      openItemZoom(receipt, item, i, container);
    });

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

/* ===================== 放大视图（删除线手势 + 文字编辑）=====================
   语义：有删除线 = 未完成（待办）；抹掉删除线 = 完成；画回 = 撤销完成。
   视图内一切改动只写暂存，点绿对号才统一提交并同步收据；遮罩空白无响应。 */
function openItemZoom(receipt, item, i, container) {
  // 移除已有实例（避免叠加）
  const existing = document.querySelector('.item-zoom-overlay');
  if (existing) existing.remove();

  let stagedFinished = item.finished;
  let stagedText = item.text;

  const overlay = document.createElement('div');
  overlay.className = 'item-zoom-overlay';

  const bar = document.createElement('div');
  bar.className = 'item-zoom-bar';

  const textEl = document.createElement('div');
  textEl.className = 'item-zoom-text';

  // 固定"不"字前缀（不可选/不可删/不可编辑）；item.text 已以"不"开头时不重复加
  const showPrefix = !String(stagedText || '').startsWith('不');
  let prefixEl = null;
  if (showPrefix) {
    prefixEl = document.createElement('span');
    prefixEl.className = 'item-zoom-prefix';
    prefixEl.setAttribute('aria-hidden', 'true');
    prefixEl.textContent = '不';
    textEl.appendChild(prefixEl);
  }

  let span = document.createElement('span');
  span.textContent = stagedText;
  textEl.appendChild(span);

  // 删除线：left:0; width:100% 覆盖"前缀 + 正文"整体（前缀在 textEl 最左，起点即"不"字左缘）
  const strike = document.createElement('div');
  strike.className = 'item-zoom-strike';
  textEl.appendChild(strike);

  const checkBtn = document.createElement('button');
  checkBtn.className = 'item-zoom-check';
  checkBtn.setAttribute('aria-label', '保存并返回');
  checkBtn.innerHTML = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="var(--leaf)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="4,12 10,18 20,6"/></svg>';

  const trashBtn = document.createElement('button');
  trashBtn.className = 'item-zoom-trash';
  trashBtn.setAttribute('aria-label', '删除整条');
  trashBtn.innerHTML = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#C02517" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3,6 21,6"/><path d="M19,6l-1,14a2,2 0 0,1 -2,2H8a2,2 0 0,1 -2,-2L5,6"/><path d="M10,11v6"/><path d="M14,11v6"/><path d="M9,6V4a1,1 0 0,1 1,-1h4a1,1 0 0,1 1,1v2"/></svg>';

  bar.appendChild(textEl);
  bar.appendChild(checkBtn);
  bar.appendChild(trashBtn);
  const hint = document.createElement('div');
  hint.className = 'item-zoom-hint';
  function updateZoomHint() {
    hint.textContent = stagedFinished ? '长按内容左滑标记未完成' : '长按删除线右滑标记完成';
  }
  updateZoomHint();
  overlay.appendChild(hint);
  overlay.appendChild(bar);
  document.body.appendChild(overlay);

  requestAnimationFrame(() => overlay.classList.add('show'));
  window.dispatchEvent(new CustomEvent('sdl:zoom-opened', { detail: { overlay: overlay, itemIndex: i } }));

  // ---- 删除线手势 + 文字编辑 ----
  // 按住即拖（与开头动画第二幕一致），水平 ≥8px 激活，垂直滑动判为滚动
  // eraseX = 删除线被抹除的宽度（0=线完整=未完成；W=线全隐=完成）
  let W = textEl.clientWidth;
  let eraseX = stagedFinished ? W : 0;
  let dragging = false;
  let pointerStartX = 0, pointerStartY = 0;
  let moved = false;
  let editing = false;

  function renderStrike() {
    strike.style.clipPath = `inset(0 0 0 ${eraseX}px)`;
  }
  renderStrike();

  function remeasure() {
    W = textEl.clientWidth;
    if (eraseX > W) eraseX = W;
    renderStrike();
  }

  function commitErase() {
    // ≥70% 吸附到目标视觉态，否则回弹到当前暂存态
    const target = eraseX >= W * 0.7 ? W : 0;
    strike.style.transition = 'clip-path 0.3s';
    eraseX = target;
    renderStrike();
    setTimeout(() => { strike.style.transition = ''; }, 320);
    stagedFinished = (eraseX >= W && W > 0);
    updateZoomHint();   // 提示文案跟随暂存状态实时切换
  }

  function enterEdit() {
    if (editing || stagedFinished) return;
    editing = true;
    textEl.classList.add('editing'); // 编辑态切 flex 布局：前缀"不"与输入框同行不被挤走
    const input = document.createElement('input');
    input.className = 'item-zoom-input';
    input.value = stagedText;
    input.setAttribute('placeholder', '填写内容…');
    span.replaceWith(input);
    input.focus();
    input.setSelectionRange(input.value.length, input.value.length);

    input.addEventListener('input', () => {
      stagedText = input.value;
      remeasure();
    });

    function finishEdit() {
      const newSpan = document.createElement('span');
      newSpan.textContent = stagedText;
      input.replaceWith(newSpan);
      span = newSpan;
      editing = false;
      textEl.classList.remove('editing');
      remeasure();
    }

    input.addEventListener('blur', finishEdit);
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); input.blur(); }
    });
  }

  textEl.addEventListener('pointerdown', e => {
    if (editing) return;
    pointerStartX = e.clientX;
    pointerStartY = e.clientY;
    moved = false;
    dragging = false;
    try { textEl.setPointerCapture(e.pointerId); } catch (_) {}
  });

  textEl.addEventListener('pointermove', e => {
    if (!textEl.hasPointerCapture(e.pointerId)) return;
    const dx = e.clientX - pointerStartX;
    const dy = e.clientY - pointerStartY;
    if (!dragging) {
      // 水平 ≥8px 且水平占优 → 立即激活；垂直 >10px 且垂直占优 → 判为滚动
      if (Math.abs(dx) >= 8 && Math.abs(dx) > Math.abs(dy)) {
        dragging = true;
        bar.classList.add('dragging');
        hint.classList.add('fade');
        remeasure();
      } else if (Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx)) {
        moved = true;
        return;
      } else {
        return;
      }
    }
    // 已激活：手指 x 位置直接映射为 eraseX（跟手）
    const rect = textEl.getBoundingClientRect();
    W = rect.width;
    const x = e.clientX - rect.left;
    eraseX = Math.max(0, Math.min(W, x));
    strike.style.transition = 'none';
    renderStrike();
  });

  function endPointer(e) {
    bar.classList.remove('dragging');
    if (textEl.hasPointerCapture(e.pointerId)) {
      try { textEl.releasePointerCapture(e.pointerId); } catch (_) {}
    }
    if (dragging) {
      commitErase();           // 仅更新暂存，不写数据、不动收据、不关闭
      dragging = false;
    } else if (!moved) {
      enterEdit();             // 单击 → 进入文字编辑
    }
  }

  textEl.addEventListener('pointerup', endPointer);
  textEl.addEventListener('pointercancel', endPointer);

  // ---- 两个出口：绿对号提交 / 红垃圾桶删除（遮罩空白无响应）----
  checkBtn.addEventListener('click', e => {
    e.stopPropagation();
    item.text = stagedText;
    item.finished = stagedFinished;
    saveData(appData);
    window.dispatchEvent(new CustomEvent('sdl:zoom-committed', { detail: { item: item, itemIndex: i } }));
    renderItems(receipt, container);
    close();
  });

  trashBtn.addEventListener('click', e => {
    e.stopPropagation();
    receipt.items.splice(i, 1);
    saveData(appData);
    renderItems(receipt, container);
    close();
  });

  function close() {
    overlay.classList.remove('show');
    setTimeout(() => overlay.remove(), 250);
  }
}

/* ===================== 归档 ===================== */
function archiveReceipt(receipt) {
  if (receipt.archived) return;
  receipt.archived = true;
  appData.archives.push({ ...receipt, archivedAt: Date.now() });
  saveData(appData);
  renderReceiptWall();
}

/* 全部完成判定（基于非空条目；空条目不再阻止盖章） */
function isAllFinished(receipt) {
  const items = nonEmptyItems(receipt);
  return items.length > 0 && items.every(i => i.finished);
}

/* 给"不"字前缀用：item.text 已以"不"开头时不重复加 */
function withNotPrefix(text) {
  if (!text) return text;
  return String(text).startsWith('不') ? text : '不' + text;
}

/* 归档/展示用非空条目：text trim 后为空的条目视为未填写，展示时过滤（数据层不动） */
function nonEmptyItems(receipt) {
  return (receipt.items || []).filter(it => String(it.text || '').trim() !== '');
}

/* LIST 墙已归档收据 DOM：复用 .roam-receipt 体系（上下锯齿撕边、无条码、ChangBanDianSong 字体），
   宽度沿用清单墙收据宽度 min(280px, 68vw)。条目带固定"不"字前缀。 */
function buildArchivedReceiptDom(receipt, index) {
  const el = document.createElement('div');
  el.className = 'roam-receipt roam-on-wall';

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
  const shown = nonEmptyItems(receipt);
  shown.forEach((it, i) => {
    const row = document.createElement('div');
    row.className = 'rr-item' + (it.finished ? ' finished' : '');
    const idx = document.createElement('span'); idx.className = 'rr-item-index';
    idx.textContent = String(i + 1).padStart(2, '0');
    const txt = document.createElement('span'); txt.className = 'rr-item-text';
    txt.textContent = withNotPrefix(it.text || '');
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

  // 全部完成 → 方形 Completed 印章（盖章落下动画由 .drop 类触发）
  if (isAllFinished(receipt)) {
    const stamp = document.createElement('div');
    stamp.className = 'completed-stamp';
    stamp.textContent = 'Completed';
    el.appendChild(stamp);
  }

  return el;
}

/* ===================== 长按手势：下拉归档 / 上划撤销 =====================
   目标元素：整张 .receipt-wrap。激活前 touch-action: pan-y 不挡滚动；激活后才阻止默认滚动。
   不破坏条目行点击放大（点击位移 < 阈值且未长按 → 不进入拖拽）。
   修复要点：
   1) pointerdown 即 setPointerCapture —— 否则指针移出 wrap 后 pointerup 丢失，手势整个失效；
   2) 激活时内联 animation:none —— 入场动画 receiptSlide/receiptDrop 是 fill:both，
      完成后仍压制内联 transform，导致收据不跟手；
   3) 移动端 touch-action 在手势开始时被锁定，激活后再改 CSS 已来不及，
      用非 passive 的 touchmove + preventDefault 阻止浏览器接管滚动；
   4) 手势结束后抑制 click —— 避免松手误触条目放大编辑。 */
function attachReceiptGesture(wrap, receipt) {
  let longPressTimer = null;
  let activated = false;
  let startY = 0, startX = 0;
  let lastDy = 0;
  let connectorEl = null;
  let suppressClick = false;
  let activePointerId = null;

  const HOLD_MS = 300;
  const THRESHOLD_PX = 100;

  function clearLongPress() {
    if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null; }
  }

  function findConnector() {
    return wrap.querySelector('.receipt-connector');
  }

  function onPointerDown(e) {
    // 已在拖拽动画/盖章中 → 忽略；非主指针 / 鼠标非左键 → 忽略
    if (wrap.classList.contains('gesture-busy')) return;
    if (!e.isPrimary) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    activated = false;
    lastDy = 0;
    startX = e.clientX;
    startY = e.clientY;
    connectorEl = findConnector();
    // 不在 down 时立即 capture：否则 pointerup 被重定向到 wrap，
    // click 派发到 wrap 与 row 的公共祖先，row 的 click 监听器永远收不到（条目放大打不开）。
    // capture 推迟到长按激活之后（见下方 timer 回调）。
    activePointerId = e.pointerId;
    clearLongPress();
    longPressTimer = setTimeout(() => {
      activated = true;
      // 长按激活后才捕获指针：拖拽跟手、移出 wrap 不丢事件
      try { wrap.setPointerCapture(activePointerId); } catch (_) {}
      // 杀掉 fill:both 的入场动画（receiptSlide / receiptDrop），
      // 否则已完成的动画在级联中压过内联 transform，收据不跟手
      wrap.style.animation = 'none';
      wrap.classList.add('gesture-activated');
      try { navigator.vibrate(10); } catch (_) {}
    }, HOLD_MS);
  }

  function onPointerMove(e) {
    if (!activated) {
      // 未激活时若手指明显移动则取消长按（视为页面滚动）
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      if (Math.abs(dy) > 15 || Math.abs(dx) > 15) clearLongPress();
      return;
    }
    const dy = e.clientY - startY;
    lastDy = dy;
    // 已归档收据只允许向上划（撤销）；未归档只允许向下拉（归档）
    if (receipt.archived) {
      // 向上划跟随（dy 为负）
      const follow = Math.min(0, dy);
      wrap.style.transform = 'translateY(' + follow + 'px)';
    } else {
      // 向下拉跟随
      const follow = Math.max(0, dy);
      wrap.style.transform = 'translateY(' + follow + 'px)';
      // connector 预兆：拉扯越大越淡
      if (connectorEl) {
        const ratio = Math.min(1, follow / THRESHOLD_PX);
        connectorEl.style.opacity = String(1 - ratio * 0.7);
      }
    }
    e.preventDefault();
  }

  function onPointerUp() {
    clearLongPress();
    activePointerId = null; // capture 在 pointerup 后由浏览器自动释放，无需手动 release
    if (!activated) return;
    activated = false;
    suppressClick = true; // 本次是手势而非点击，抑制随之而来的 click（防误开条目放大）
    wrap.classList.remove('gesture-activated');

    const delta = receipt.archived ? -lastDy : lastDy; // 归一化为"正向位移"
    if (delta >= THRESHOLD_PX) {
      // 达阈值 → 执行
      wrap.style.transform = '';
      if (connectorEl) connectorEl.style.opacity = '';
      if (receipt.archived) {
        unarchiveReceipt(receipt);
      } else {
        archiveWithAnimation(wrap, receipt);
      }
    } else {
      // 不足 → 回弹
      wrap.style.transition = 'transform 0.25s ease-out';
      wrap.style.transform = '';
      if (connectorEl) {
        connectorEl.style.transition = 'opacity 0.25s ease-out';
        connectorEl.style.opacity = '';
        setTimeout(() => { if (connectorEl) connectorEl.style.transition = ''; }, 280);
      }
      setTimeout(() => { wrap.style.transition = ''; }, 280);
    }
  }

  wrap.addEventListener('pointerdown', onPointerDown);
  wrap.addEventListener('pointermove', onPointerMove);
  wrap.addEventListener('pointerup', onPointerUp);
  wrap.addEventListener('pointercancel', () => {
    clearLongPress();
    activePointerId = null;
    if (activated) {
      activated = false;
      suppressClick = true;
      wrap.classList.remove('gesture-activated');
      wrap.style.transition = 'transform 0.25s ease-out';
      wrap.style.transform = '';
      if (connectorEl) connectorEl.style.opacity = '';
      setTimeout(() => { wrap.style.transition = ''; }, 280);
    }
  });
  // 屏蔽原生长按菜单：否则移动端 ~500ms 时触发 contextmenu → pointercancel → 长按计时器被清
  wrap.addEventListener('contextmenu', (e) => { e.preventDefault(); });
  // 移动端兜底：激活后 preventDefault 第一个 touchmove，浏览器就不会接管滚动
  // （touch-action 在手势开始时被锁定，激活后再改 CSS touch-action 已无效）
  wrap.addEventListener('touchmove', function (e) {
    if (activated) e.preventDefault();
  }, { passive: false });
  // 手势（或取消）后的那一次 click 直接吃掉，不传给条目行
  wrap.addEventListener('click', function (e) {
    if (suppressClick) {
      suppressClick = false;
      e.preventDefault();
      e.stopPropagation();
    }
  }, true);
}

/* 归档 + 撕纸动效 + 形态切换 + 全完成盖章 */
function archiveWithAnimation(wrap, receipt) {
  if (receipt.archived) return;
  wrap.classList.add('gesture-busy');
  // 1. 撕纸反馈：快速小幅抖动 + 向下轻微抽离后回位
  wrap.classList.add('tearing');
  try { navigator.vibrate(15); } catch (_) {}
  setTimeout(() => {
    wrap.classList.remove('tearing');
    // 2. 写入归档数据（复用 archiveReceipt 的数据流，但不调用其内部 renderReceiptWall，
    //    改为就地形态切换以保留动画上下文）
    receipt.archived = true;
    receipt.archivedAt = Date.now();
    appData.archives.push({ ...receipt, archivedAt: receipt.archivedAt });
    saveData(appData);

    const allDone = isAllFinished(receipt);
    // 3. 就地切换为撕下来的单张形态
    wrap.innerHTML = '';
    wrap.classList.add('archived');
    const archivedEl = buildArchivedReceiptDom(receipt, parseInt(wrap.dataset.receiptIndex, 10) || 0);
    wrap.appendChild(archivedEl);
    // 移除前一张收据的 connector（前一张 wrap 的最后一个子元素若是 .receipt-connector），
    // 避免已归档收据与相邻收据之间残留连接段
    const prevWrap = wrap.previousElementSibling;
    if (prevWrap) {
      const prevConn = prevWrap.querySelector('.receipt-connector');
      if (prevConn) prevConn.remove();
    }
    window.dispatchEvent(new CustomEvent('sdl:archived', { detail: { receiptIndex: parseInt(wrap.dataset.receiptIndex, 10) || 0 } }));

    // 4. 全完成 → 盖章动画
    if (allDone) {
      const stamp = archivedEl.querySelector('.completed-stamp');
      if (stamp) {
        // 先隐藏默认显形态，避免动画起手前闪一下
        stamp.style.opacity = '0';
        // 下一帧触发落下动画（动画 0% 关键帧接管 opacity:0）
        requestAnimationFrame(() => {
          stamp.style.opacity = '';
          stamp.classList.add('drop');
        });
      }
      // 盖章停留约 600ms 后解除 busy
      setTimeout(() => {
        wrap.classList.remove('gesture-busy');
      }, 700);
    } else {
      // 未全完成：无章，直接解除
      setTimeout(() => {
        wrap.classList.remove('gesture-busy');
      }, 150);
    }
    // 注意：不调用 renderReceiptWall() —— 就地切换已足够，
    // connector 已随 wrap.innerHTML='' 清除；下一张收据若未归档会保留自己的 connector。
    // 但需修正相邻已归档收据的间距：通过 CSS .receipt-wrap.archived + .receipt-wrap 已处理。
  }, 200); // 撕纸抖动约 150ms，留 50ms 余量
}

/* 撤销归档：恢复为普通连续小票形态（含 connector），从 appData.archives 中精确移除一份 */
function unarchiveReceipt(receipt) {
  if (!receipt.archived) return;
  receipt.archived = false;
  delete receipt.archivedAt;
  // 精确移除 archives 中最近的一份匹配（按 id 找到后仅移除一个，避免误删其他归档）
  const rid = receipt.id;
  const idx = appData.archives.findIndex(a => a.id === rid);
  if (idx >= 0) appData.archives.splice(idx, 1);
  saveData(appData);
  window.dispatchEvent(new CustomEvent('sdl:unarchived', { detail: { receiptIndex: appData.receipts.indexOf(receipt) } }));
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

/* ===================== 票夹回顾（门后空间 · Roam）===================== */
function renderArchive() {
  // 进入归档页：交给门后空间模块（门序列 + 3D 漫游 + Roam/Browse）
  // 数据层（appData.archives）只读；年份选择与过滤在 ArchiveSpace 内部完成。
  if (window.ArchiveSpace && typeof window.ArchiveSpace.enter === 'function') {
    window.ArchiveSpace.enter(appData.archives);
  }
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

/* ===================== 时钟触发按钮：hover 逐帧动效（复刻 icon-hover-frames-demo.html 的 clock 逻辑） ===================== */
(function () {
  const clockBtn = document.getElementById('btn-predict');
  const clockImg = document.getElementById('clock-predict-img');
  if (!clockBtn || !clockImg) return;
  const CLOCK_FRAMES = 48;
  const CLOCK_FPS = 12;
  const frames = [];
  for (let i = 1; i <= CLOCK_FRAMES; i++) {
    const im = new Image();
    im.src = 'assets/icon-frames/clock/frame_' + String(i).padStart(3, '0') + '.png';
    frames.push(im);
  }
  let timer = null;
  let idx = 0;
  clockBtn.addEventListener('mouseenter', function () {
    idx = 0;
    timer = setInterval(function () {
      idx = (idx + 1) % CLOCK_FRAMES;
      clockImg.src = frames[idx].src;
    }, 1000 / CLOCK_FPS);
  });
  clockBtn.addEventListener('mouseleave', function () {
    if (timer) { clearInterval(timer); timer = null; }
    idx = 0;
    clockImg.src = frames[0].src;
  });
})();

/* ===================== 数据统计 ===================== */

/* 节省时间估算：解析显式时长 → 按类型分类估算 → 兜底 */
function estimateSavedMinutes(text) {
  if (!text) return 25;
  const t = text.trim();

  // 1. 解析显式时长（如"30分钟""1小时""2h""45min""1.5h"）
  const hourMatch = t.match(/(\d+(?:\.\d+)?)\s*(小时|h|hr|H)/);
  if (hourMatch) return Math.round(parseFloat(hourMatch[1]) * 60);
  const minMatch = t.match(/(\d+(?:\.\d+)?)\s*(分钟|min|m(?![a-z]))/i);
  if (minMatch) return Math.round(parseFloat(minMatch[1]));

  // 2. 按不做类型分类估算（基于关键词匹配，每类基准不同，加文本哈希微扰避免同质化）
  const HABIT_TIME_RULES = [
    { keywords: ['短视频', '刷视频', '刷手机', '刷抖音', '刷微博', '刷小红书', '刷朋友圈', '刷B站', '刷ins', '刷tiktok', '刷sns', '刷app', '无意义刷'], base: 35 },
    { keywords: ['熬夜', '晚睡', '追剧', '追番', '追综艺', '追小说', '再看一集', '通宵', '不睡觉', '赖床'], base: 50 },
    { keywords: ['零食', '奶茶', '外卖', '甜食', '蛋糕', '炸鸡', '烧烤', '喝饮料', '可乐', '夜宵', '加餐', '薯片', '饼干', '甜品', '巧克力'], base: 15 },
    { keywords: ['购物', '逛', '买买买', '下单', '拼单', '种草', '拔草', '直播间', '促销', '打折', '满减', '秒杀', '清空购物车'], base: 20 },
    { keywords: ['社交', '聚会', '消息', '聊天', '微信', '回复', '电话', '应酬', '饭局', '群聊', '群消息'], base: 45 },
    { keywords: ['纠结', '犹豫', '选择困难', '想太多', '内耗', '焦虑', '担心', '胡思乱想', '过度思考', '完美主义', '拖延'], base: 25 },
    { keywords: ['多任务', '同时', '并行', '切换', 'multitask', '一边', '三心二意', '分心', '打断'], base: 20 },
    { keywords: ['抽烟', '吸烟', '喝酒', '酗酒', '烟', '酒', '啤酒', '白酒', '香烟'], base: 30 },
  ];

  let base = 25;
  for (const rule of HABIT_TIME_RULES) {
    if (rule.keywords.some(kw => t.includes(kw))) {
      base = rule.base;
      break;
    }
  }

  // 3. 基于文本哈希加 ±5 分钟微扰，避免同质化
  let hash = 0;
  for (let i = 0; i < t.length; i++) hash = ((hash << 5) - hash + t.charCodeAt(i)) | 0;
  const offset = (Math.abs(hash) % 11) - 5; // -5 ~ +5
  return Math.max(5, base + offset);
}

/* ===================== DATA 页：维度×月份 热成像网格 ===================== */
/* 12 维度（已删 财务规划/物质成瘾/亲密关系/职业工作）；命中数最高者胜出；全 0 命中兜底「时间管理」 */
const DATA_DIMENSIONS = [
  { name: '时间管理', keywords: ['拖延','截止','迟到','赶','来不及','磨蹭','等一下','计划打乱'] },
  { name: '专注管理', keywords: ['多任务','切换','分心','打断','三心二意','一边','并行','走神','频繁看'] },
  { name: '数字媒体', keywords: ['短视频','刷视频','刷手机','刷抖音','刷微博','刷小红书','刷朋友圈','刷B站','刷ins','tiktok','刷sns','刷app','滑动','无意义刷','游戏','看直播'] },
  { name: '消费理财', keywords: ['购物','逛逛','买买买','下单','拼单','种草','拔草','直播间','促销','打折','满减','秒杀','清空购物车','囤货','退货'] },
  { name: '睡眠作息', keywords: ['熬夜','晚睡','追剧','追番','追综艺','追小说','再看一集','通宵','不睡觉','赖床','早起失败','午睡'] },
  { name: '饮食健康', keywords: ['零食','奶茶','外卖','甜食','蛋糕','炸鸡','烧烤','饮料','可乐','夜宵','加餐','薯片','饼干','甜品','巧克力','咖啡'] },
  { name: '运动锻炼', keywords: ['久坐','不运动','瘫着','躺平','驼背','揉眼睛'] },
  { name: '情绪管理', keywords: ['焦虑','烦躁','发脾气','生气','崩溃','情绪化','emo','暴躁'] },
  { name: '心态思维', keywords: ['纠结','犹豫','选择困难','想太多','内耗','担心','胡思乱想','过度思考','完美主义','怕错','自我批评','回放','攀比','尴尬'] },
  { name: '人际社交', keywords: ['社交','聚会','应酬','饭局','面子','拒绝','讨好','接话','回复消息','群聊','群消息'] },
  { name: '学习成长', keywords: ['囤课','买书不读','收藏不学','半途而废'] },
  { name: '环境秩序', keywords: ['不收拾','乱堆','桌面乱','房间乱','拖延整理'] },
];
const DATA_MONTH_ABBR = ['Jan.','Feb.','Mar.','Apr.','May.','Jun.','Jul.','Aug.','Sep.','Oct.','Nov.','Dec.'];
/* 连续色谱锚点（t=v/10，值域 0~10；暖=高海拔，最右端新增黄 #FFC107） */
const DATA_COLOR_STOPS = [
  { t: 0.00, c: [31, 196, 212] },   /* 青 #1FC4D4 */
  { t: 0.20, c: [61, 107, 208] },   /* 蓝 #3D6BD0 */
  { t: 0.40, c: [107, 80, 188] },   /* 紫 #6B50BC */
  { t: 0.60, c: [216, 64, 124] },   /* 品红 #D8407C */
  { t: 0.80, c: [242, 56, 63] },    /* 红 #F2383F */
  { t: 1.00, c: [255, 193, 7] },    /* 黄 #FFC107 */
];
/* 渲染列序（渲染层重排，不改 DATA_DIMENSIONS 原数组）；删去 学习成长(10)/环境秩序(11) 两列 */
const DATA_COL_ORDER = [
  0, 1,        /* 时间效率：时间管理、专注管理 */
  2, 3, 9,     /* 数字生活：数字媒体、消费理财、人际社交 */
  4, 5, 6,     /* 身体节律：睡眠作息、饮食健康、运动锻炼 */
  7, 8         /* 内心秩序：情绪管理、心态思维 */
];

function classifyDimension(text) {
  if (!text) return 0;
  const t = text.trim();
  let bestIdx = 0, bestHits = 0;
  for (let i = 0; i < DATA_DIMENSIONS.length; i++) {
    let hits = 0;
    const kws = DATA_DIMENSIONS[i].keywords;
    for (let k = 0; k < kws.length; k++) if (t.indexOf(kws[k]) >= 0) hits++;
    if (hits > bestHits) { bestHits = hits; bestIdx = i; }
  }
  return bestIdx; /* 全 0 命中 → 0（时间管理）兜底 */
}

function getDataTier(minutes) {
  if (minutes < 90) return 2;
  if (minutes < 240) return 3;
  if (minutes < 480) return 4;
  return 5;
}

function renderDataGrid() {
  const wrap = document.getElementById('data-scroll');
  if (!wrap) return;
  const archives = (appData.archives || []).slice();

  /* 月份范围：最早归档月 → 当前月（过滤掉归档中超出当前月的未来月），逐月一行 */
  const now = new Date();
  const curMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const monthSet = new Set();
  archives.forEach(r => {
    if (!r.date) return;
    const ym = r.date.slice(0, 7);
    if (ym <= curMonth) monthSet.add(ym);   /* 仅取不晚于当前月 */
  });
  monthSet.add(curMonth);
  const monthsAsc = [...monthSet].sort();                 /* 升序：最早→当前 */
  const rowsTopDown = monthsAsc.slice().reverse();        /* 最新在最上 */
  const validMonth = new Set(monthsAsc);

  /* 聚合：某月×某维度 = {minutes, count}，仅 finished 条目，仅范围内月份 */
  const cells = {};
  archives.forEach(r => {
    if (!r.date) return;
    const month = r.date.slice(0, 7);
    if (!validMonth.has(month)) return;                   /* 排除范围外的未来月 */
    (r.items || []).forEach(it => {
      if (!it || !it.finished) return;
      const dim = classifyDimension(it.text);
      const key = month + '|' + dim;
      if (!cells[key]) cells[key] = { minutes: 0, count: 0 };
      cells[key].minutes += estimateSavedMinutes(it.text);
      cells[key].count += 1;
    });
  });

  let maxMinutes = 0;
  Object.values(cells).forEach(c => { if (c.minutes > maxMinutes) maxMinutes = c.minutes; });

  /* 布局参数：10 列均匀铺排（无组缝，竖线等距 COL_W） */
  const COL_W = 72, ROW_H = 68, YAXIS_W = 104, XAXIS_H = 150;
  const COL_N = DATA_COL_ORDER.length;                     /* 10 */
  /* 每渲染列的 x 偏移（均匀，无组缝） */
  const colX = [];
  for (let i = 0; i < COL_N; i++) colX[i] = i * COL_W;
  const N = rowsTopDown.length;
  const gridW = COL_N * COL_W;                              /* 10*COL_W */
  const gridH = N * ROW_H;

  /* 年份分组（按 rowsTopDown 顺序，连续同年为组，用于 [ 括号）*/
  const yearGroups = [];
  rowsTopDown.forEach((ym, i) => {
    const y = ym.slice(0, 4);
    const last = yearGroups[yearGroups.length - 1];
    if (!last || last.year !== y) yearGroups.push({ year: y, start: i, count: 1 });
    else last.count++;
  });

  /* 连续五色色谱插值：t∈[0,1] → {r,g,b,css}，5 锚点分段线性（无 gamma，必要时再压缩） */
  function dataColor(t) {
    const tt = Math.max(0, Math.min(1, t));
    const s = DATA_COLOR_STOPS;
    for (let i = 0; i < s.length - 1; i++) {
      const a = s[i], b = s[i + 1];
      if (tt >= a.t && tt <= b.t) {
        const k = (tt - a.t) / (b.t - a.t);
        const r = Math.round(a.c[0] + (b.c[0] - a.c[0]) * k);
        const g = Math.round(a.c[1] + (b.c[1] - a.c[1]) * k);
        const bl = Math.round(a.c[2] + (b.c[2] - a.c[2]) * k);
        return { r, g, b: bl, css: `rgb(${r},${g},${bl})` };
      }
    }
    const last = s[s.length - 1].c;
    return { r: last[0], g: last[1], b: last[2], css: `rgb(${last.join(',')})` };
  }

  /* 单层画布：轴标签并入 SVG，网格内容统一偏移 (OX, OY)；
     OY < XAXIS_H：网格上移，横轴维度文字保持 XAXIS_H/2 原位不动 */
  const OX = YAXIS_W, OY = XAXIS_H - 30;
  const totalW = YAXIS_W + gridW, totalH = OY + gridH;
  const svgNS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(svgNS, 'svg');
  svg.setAttribute('class', 'data-grid-svg');
  svg.setAttribute('width', totalW);
  svg.setAttribute('height', totalH);
  svg.setAttribute('viewBox', `0 0 ${totalW} ${totalH}`);
  svg.style.overflow = 'visible';   /* 大圆溢出 viewBox 不裁切 */

  /* defs：地形图与等高线无滤镜依赖，无图例渐变则留空 */
  const defs = document.createElementNS(svgNS, 'defs');
  svg.appendChild(defs);

  /* 底部网格垫底（地形图之下）：竖线在每列中心、横线在每行中心，交点=横纵坐标交点；暗灰虚线 */
  const underG = document.createElementNS(svgNS, 'g');
  underG.setAttribute('class', 'data-undergrid');
  underG.setAttribute('transform', `translate(${OX},${OY})`);
  for (let i = 0; i < COL_N; i++) {
    const x = colX[i] + COL_W / 2;
    const ln = document.createElementNS(svgNS, 'line');
    ln.setAttribute('x1', x); ln.setAttribute('y1', 0);
    ln.setAttribute('x2', x); ln.setAttribute('y2', gridH);
    underG.appendChild(ln);
  }
  for (let i = 0; i < N; i++) {
    const y = i * ROW_H + ROW_H / 2;
    const ln = document.createElementNS(svgNS, 'line');
    ln.setAttribute('x1', 0); ln.setAttribute('y1', y);
    ln.setAttribute('x2', gridW); ln.setAttribute('y2', y);
    underG.appendChild(ln);
  }
  svg.appendChild(underG);

  /* X 轴：维度名竖排（真竖版文字 writing-mode，非旋转）；列居中，垂直居中于顶部 150px 标签带 */
  const axisXG = document.createElementNS(svgNS, 'g');
  axisXG.setAttribute('class', 'data-svg-axis-x');
  DATA_COL_ORDER.forEach((dim, i) => {
    const cx = colX[i] + COL_W / 2 + OX;
    const cy = XAXIS_H / 2;
    const t = document.createElementNS(svgNS, 'text');
    t.setAttribute('class', 'data-svg-dim');
    t.setAttribute('x', cx);
    t.setAttribute('y', cy);
    t.setAttribute('text-anchor', 'middle');
    t.setAttribute('dominant-baseline', 'central');
    t.textContent = DATA_DIMENSIONS[dim].name;
    axisXG.appendChild(t);
  });
  svg.appendChild(axisXG);

  /* Y 轴：月份右对齐 + 年份 [ 括号/竖排年号（并入 SVG） */
  const axisYG = document.createElementNS(svgNS, 'g');
  axisYG.setAttribute('class', 'data-svg-axis-y');
  rowsTopDown.forEach((ym, i) => {
    const m = parseInt(ym.slice(5, 7), 10);
    const cy = i * ROW_H + ROW_H / 2 + OY;
    const t = document.createElementNS(svgNS, 'text');
    t.setAttribute('class', 'data-svg-month');
    t.setAttribute('x', OX - 30);
    t.setAttribute('y', cy);
    t.setAttribute('text-anchor', 'end');
    t.setAttribute('dominant-baseline', 'middle');
    t.textContent = DATA_MONTH_ABBR[m - 1];
    axisYG.appendChild(t);
  });
  yearGroups.forEach(g => {
    const top = g.start * ROW_H + OY;
    const bot = top + g.count * ROW_H;
    const bx = 22, bw = 8;                                /* 括号竖杆 x=22，右翻边到 x=30 */
    const p = document.createElementNS(svgNS, 'path');
    p.setAttribute('class', 'data-svg-year-bracket');
    p.setAttribute('d', `M ${bx + bw} ${top} L ${bx} ${top} L ${bx} ${bot} L ${bx + bw} ${bot}`);
    axisYG.appendChild(p);
    const yMid = (top + bot) / 2;
    const yx = bx - 12;                                   /* 年号移到 [ 左侧，竖排居中 */
    const yt = document.createElementNS(svgNS, 'text');
    yt.setAttribute('class', 'data-svg-year');
    yt.setAttribute('x', yx);
    yt.setAttribute('y', yMid);
    yt.setAttribute('text-anchor', 'middle');
    yt.setAttribute('transform', `rotate(-90 ${yx} ${yMid})`);
    yt.textContent = g.year;
    axisYG.appendChild(yt);
  });
  svg.appendChild(axisYG);

  /* 地形场（离屏 canvas 低分辨率累加，再上色落回 SVG <image>）：
     每格点泼溅径向渐变"山丘"，globalCompositeOperation='lighter' 累加——交融是场的叠加而非图形变形 */
  const TERRAIN_SCALE = 0.5;
  const cw = Math.max(2, Math.round(gridW * TERRAIN_SCALE));
  const ch = Math.max(2, Math.round(gridH * TERRAIN_SCALE));
  const offCv = document.createElement('canvas');
  offCv.width = cw; offCv.height = ch;
  const octx = offCv.getContext('2d');
  octx.clearRect(0, 0, cw, ch);
  octx.globalCompositeOperation = 'lighter';
  const hillR = 1.2 * COL_W * TERRAIN_SCALE;            /* ~43px canvas 空间，相邻格点自然叠加 */
  rowsTopDown.forEach((ym, rowIdx) => {
    DATA_COL_ORDER.forEach((dim, renderCol) => {
      const cell = cells[ym + '|' + dim];
      if (!cell || cell.minutes <= 0) return;
      const gx = (colX[renderCol] + COL_W / 2) * TERRAIN_SCALE;
      const gy = (rowIdx * ROW_H + ROW_H / 2) * TERRAIN_SCALE;
      const v = cell.minutes / (maxMinutes || 1) * 10;     /* 海拔 0~10 */
      const a = v / 10;                                    /* 中心 alpha = 海拔归一化 */
      const g = octx.createRadialGradient(gx, gy, 0, gx, gy, hillR);
      g.addColorStop(0, `rgba(255,255,255,${a})`);
      g.addColorStop(1, 'rgba(255,255,255,0)');
      octx.fillStyle = g;
      octx.beginPath();
      octx.arc(gx, gy, hillR, 0, Math.PI * 2);
      octx.fill();
    });
  });

  /* 逐像素上色：读回强度场 → 归一化 → 色带插值；gamma 压缩避免单点极高把其余地形压成全青 */
  const img = octx.getImageData(0, 0, cw, ch);
  const d = img.data;
  let maxA = 0;
  for (let p = 3; p < d.length; p += 4) if (d[p] > maxA) maxA = d[p];
  const intensity = new Float32Array(cw * ch);
  for (let i = 0, p = 3; i < intensity.length; i++, p += 4) {
    intensity[i] = d[p] / (maxA || 1);
  }
  const FEATHER = 10;                                       /* canvas px，边缘羽化宽度（地形最外侧渐隐） */
  for (let i = 0, p = 0; i < intensity.length; i++, p += 4) {
    const raw = intensity[i];
    if (raw < 0.06) { d[p + 3] = 0; continue; }           /* 接近 0 区域完全透明，不蒙色雾 */
    const x = i % cw, y = (i / cw) | 0;
    const ed = Math.min(x, y, cw - 1 - x, ch - 1 - y) / FEATHER;
    const edgeFade = ed > 1 ? 1 : (ed < 0 ? 0 : ed);      /* 边缘 0→中心 1，软过渡，裁掉画布硬边 */
    const t = Math.pow(raw, 0.6);                          /* gamma 压缩：抬升中低端，避免极端值压扁地形 */
    const col = dataColor(t);
    const a = (0.25 + 0.75 * t) * 0.7 * edgeFade;           /* 整体半透明 ×0.7 ×边缘羽化 */
    d[p] = col.r; d[p + 1] = col.g; d[p + 2] = col.b; d[p + 3] = Math.round(a * 255);
  }
  octx.putImageData(img, 0, 0);

  /* 落回 SVG <image>：平滑放大回全分辨率，边缘自然柔和 */
  const terrImg = document.createElementNS(svgNS, 'image');
  terrImg.setAttribute('class', 'data-terrain');
  terrImg.setAttribute('x', OX);
  terrImg.setAttribute('y', OY);
  terrImg.setAttribute('width', gridW);
  terrImg.setAttribute('height', gridH);
  const dataURL = offCv.toDataURL();
  terrImg.setAttributeNS('http://www.w3.org/1999/xlink', 'href', dataURL);
  terrImg.setAttribute('href', dataURL);
  svg.appendChild(terrImg);

  /* 等高线（marching squares on intensity 场，5 级 → SVG <path> 虚线） */
  const LEVELS = [0.2, 0.35, 0.5, 0.65, 0.8];
  const SEG_TABLE = [
    [], [[0,3]], [[0,1]], [[1,3]], [[1,2]], [[0,3],[1,2]], [[0,2]], [[2,3]],
    [[2,3]], [[0,2]], [[0,1],[2,3]], [[1,2]], [[1,3]], [[0,1]], [[0,3]], []
  ];
  function edgePt(edge, x, y, tl, tr, br, bl, level) {
    if (edge === 0) return [x + (level - tl) / ((tr - tl) || 1e-6), y];           /* top */
    if (edge === 1) return [x + 1, y + (level - tr) / ((br - tr) || 1e-6)];     /* right */
    if (edge === 2) return [x + (level - bl) / ((br - bl) || 1e-6), y + 1];      /* bottom */
    return [x, y + (level - tl) / ((bl - tl) || 1e-6)];                          /* left */
  }
  let contourD = '';
  const INV = 1 / TERRAIN_SCALE;                            /* canvas 坐标 → 全分辨率网格坐标 */
  LEVELS.forEach(level => {
    for (let y = 0; y < ch - 1; y++) {
      for (let x = 0; x < cw - 1; x++) {
        const tl = intensity[y * cw + x], tr = intensity[y * cw + x + 1];
        const bl = intensity[(y + 1) * cw + x], br = intensity[(y + 1) * cw + x + 1];
        let idx = 0;
        if (tl >= level) idx |= 1;
        if (tr >= level) idx |= 2;
        if (br >= level) idx |= 4;
        if (bl >= level) idx |= 8;
        const segs = SEG_TABLE[idx];
        if (!segs.length) continue;
        for (let s = 0; s < segs.length; s++) {
          const [e1, e2] = segs[s];
          const p1 = edgePt(e1, x, y, tl, tr, br, bl, level);
          const p2 = edgePt(e2, x, y, tl, tr, br, bl, level);
          const x1 = p1[0] * INV + OX, y1 = p1[1] * INV + OY;
          const x2 = p2[0] * INV + OX, y2 = p2[1] * INV + OY;
          contourD += `M${x1.toFixed(1)} ${y1.toFixed(1)}L${x2.toFixed(1)} ${y2.toFixed(1)}`;
        }
      }
    }
  });
  if (contourD) {
    const contPath = document.createElementNS(svgNS, 'path');
    contPath.setAttribute('class', 'data-contour');
    contPath.setAttribute('d', contourD);
    contPath.setAttribute('fill', 'none');
    svg.appendChild(contPath);
  }

  /* 命中区：每格点中心固定 r=20 透明 circle（tooltip 与地形无关） */
  const hitG = document.createElementNS(svgNS, 'g');
  hitG.setAttribute('class', 'data-hit');
  rowsTopDown.forEach((ym, rowIdx) => {
    DATA_COL_ORDER.forEach((dim, renderCol) => {
      const cell = cells[ym + '|' + dim];
      if (!cell || cell.minutes <= 0) return;
      const cx = colX[renderCol] + COL_W / 2 + OX;
      const cy = rowIdx * ROW_H + ROW_H / 2 + OY;
      const hit = document.createElementNS(svgNS, 'circle');
      hit.setAttribute('cx', cx); hit.setAttribute('cy', cy);
      hit.setAttribute('r', 20);
      hit.setAttribute('fill', 'transparent');
      hit.setAttribute('class', 'data-hit-circle');
      hit.setAttribute('data-dim', dim);
      hit.setAttribute('data-ym', ym);
      hit.setAttribute('data-count', cell.count);
      hit.setAttribute('data-minutes', cell.minutes);
      hitG.appendChild(hit);
    });
  });
  svg.appendChild(hitG);

  /* 单层容器：svg 直入 .data-scroll，取消 grid table / sticky 轴 */
  wrap.innerHTML = '';
  wrap.appendChild(svg);

  /* tooltip */
  let tip = document.getElementById('data-tip');
  if (!tip) {
    tip = document.createElement('div');
    tip.id = 'data-tip';
    tip.className = 'data-tip';
    document.body.appendChild(tip);
  }
  const hitCircles = svg.querySelectorAll('.data-hit-circle');
  hitCircles.forEach(c => {
    c.addEventListener('mouseenter', () => showDataTip(tip, c));
    c.addEventListener('mousemove', e => moveDataTip(tip, e));
    c.addEventListener('mouseleave', () => tip.classList.remove('show'));
    c.addEventListener('click', () => showDataTip(tip, c));
  });

  /* 入场动画：地形图淡入（reduced-motion 跳过） */
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!reduce) {
    terrImg.style.opacity = '0';
    terrImg.style.transition = 'opacity 0.5s ease-out';
    requestAnimationFrame(() => { terrImg.style.opacity = '1'; });
  }
}

function showDataTip(tip, circle) {
  const dim = parseInt(circle.getAttribute('data-dim'), 10);
  const ym = circle.getAttribute('data-ym');
  const count = parseInt(circle.getAttribute('data-count'), 10);
  const minutes = parseInt(circle.getAttribute('data-minutes'), 10);
  const [y, m] = ym.split('-').map(Number);
  const h = Math.floor(minutes / 60);
  const min = minutes % 60;
  tip.innerHTML =
    `<div class="data-tip-dim">${DATA_DIMENSIONS[dim].name}</div>` +
    `<div class="data-tip-date">${y}年${m}月</div>` +
    `<div class="data-tip-line">完成 <strong>${count}</strong> 件</div>` +
    `<div class="data-tip-line">预计节约 <strong>${h}h ${min}min</strong></div>`;
  tip.classList.add('show');
}

function moveDataTip(tip, e) {
  let x = e.clientX + 14, y = e.clientY + 14;
  const r = tip.getBoundingClientRect();
  if (x + r.width > window.innerWidth - 8) x = e.clientX - r.width - 14;
  if (y + r.height > window.innerHeight - 8) y = e.clientY - r.height - 14;
  tip.style.left = x + 'px';
  tip.style.top = y + 'px';
}

/* ===================== 初始化 ===================== */
document.addEventListener('DOMContentLoaded', () => {
  getPages();
  setupPrintButton();
  carryOverUnarchived();
  updatePrintButton();
  showPage('home');
});

document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && e.target.tagName !== 'INPUT') showPage('home');
});
