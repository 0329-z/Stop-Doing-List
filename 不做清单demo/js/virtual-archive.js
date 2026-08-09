/**
 * 虚拟归档数据库 · Virtual Archive DB
 * ──────────────────────────────────────────────────────────────
 * 独立模块 —— 正式上线时只需：
 *   1. 删除 index.html 中的 <script src="js/virtual-archive.js"> 引用
 *   2. 控制台执行 VirtualArchive.clear() 清除 localStorage
 *   3. 删除 js/virtual-archive.js 文件
 * 即可完全移除虚拟数据，不影响真实数据。
 *
 * 数据存储在独立的 localStorage key（stopdoing_virtual_archive_v1），
 * 每条虚拟收据带 _virtual:true 标记，saveData 被拦截过滤，
 * 保证虚拟数据永远不会写入真实数据 key。
 *
 * 时间范围：2025-10-01 ~ 2026-08-01，随机选 100 天生成归档收据。
 * ──────────────────────────────────────────────────────────────
 */
(function () {
'use strict';

/* ==================== 配置 ==================== */
var VIRTUAL_STORE_KEY = 'stopdoing_virtual_archive_v1';
var DATE_START = new Date(2025, 9, 1);    // 2025-10-01
var DATE_END   = new Date(2026, 7, 1);    // 2026-08-01
var TARGET_DAYS = 100;

/* ==================== 条目池（仿真"不做"事项）==================== */
var ITEM_POOL = [
  // 数字沉迷
  '无意义刷短视频', '睡前再看一眼手机', '工作前先刷社交媒体',
  '刷朋友圈超过十分钟', '躺在床上刷手机', '吃饭时看手机',
  '深夜刷短视频到凌晨', '无目的滑动手机屏幕', '刷小红书停不下来',
  // 睡眠
  '熬夜追完下一集', '再说一集就睡', '凌晨还在刷手机',
  '周末赖床到中午', '熬夜看小说', '午睡超过半小时', '关灯后继续玩手机',
  // 饮食
  '不饿却吃零食', '喝第三杯奶茶', '夜宵点外卖',
  '下午喝咖啡提神', '无意识吃甜食', '情绪化进食',
  '喝可乐代替喝水', '饭后来杯甜品',
  // 消费
  '打开购物App闲逛', '直播间冲动下单', '买不需要的东西',
  '被种草就立刻下单', '情绪低落时购物', '囤货超过三个月用量',
  // 社交
  '答应不想去的聚会', '回复非紧急消息到深夜', '不好意思拒绝别人',
  '勉强参加无聊饭局', '为了面子硬撑', '群里无意义接话',
  // 内耗
  '为小事反复纠结', '想太多而不行动', '完美主义导致拖延',
  '反复回放尴尬瞬间', '担心还没发生的事', '过度自我批评',
  // 注意力
  '一边吃饭一边看视频', '工作时频繁看手机', '同时做三件事',
  '频繁切换App', '开会时偷偷刷手机', '写报告时刷消息',
  // 习惯
  '拖延到截止日才动手', '说"等一下"然后忘了', '久坐两小时不站起来',
  '驼背看电脑屏幕', '揉眼睛不休息', '憋尿不去厕所'
];

/* ==================== 工具函数 ==================== */
function pad2(n) { return String(n).padStart(2, '0'); }

function dateKey(d) {
  return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
}

function randInt(lo, hi) { // 含 lo 含 hi
  return lo + Math.floor(Math.random() * (hi - lo + 1));
}

/* 从数组中无重复抽取 n 项 */
function pickUnique(arr, n) {
  var pool = arr.slice();
  for (var i = pool.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var t = pool[i]; pool[i] = pool[j]; pool[j] = t;
  }
  return pool.slice(0, n);
}

/* ==================== 日期选择 ==================== */
/* 在 [DATE_START, DATE_END] 范围内无重复随机选 TARGET_DAYS 天，按日期升序排列 */
function pickRandomDates() {
  var all = [];
  var d = new Date(DATE_START);
  while (d <= DATE_END) {
    all.push(new Date(d));
    d.setDate(d.getDate() + 1);
  }
  // Fisher-Yates 洗牌后取前 TARGET_DAYS 天
  for (var i = all.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var t = all[i]; all[i] = all[j]; all[j] = t;
  }
  return all.slice(0, TARGET_DAYS).sort(function (a, b) { return a - b; });
}

/* ==================== 单张收据生成 ==================== */
function makeReceipt(date, orderNum) {
  var dKey = dateKey(date);
  var itemCount = randInt(3, 7);         // 3~7 条事项
  var items = pickUnique(ITEM_POOL, itemCount);

  /* 决定收据类型：
     ~20% 全部完成（印章） / ~70% 部分完成 / ~10% 全部未完成 */
  var roll = Math.random();
  var receiptType;
  if (roll < 0.20) receiptType = 'allDone';
  else if (roll < 0.90) receiptType = 'partial';
  else receiptType = 'allPending';

  var records = items.map(function (text) {
    var finished;
    if (receiptType === 'allDone') finished = true;
    else if (receiptType === 'allPending') finished = false;
    else finished = Math.random() < 0.55;   // 部分完成：每条 ~55% 概率已完成
    return { text: text, finished: finished };
  });

  /* createdAt：当天随机时刻 07:00~22:59 */
  var created = new Date(date);
  created.setHours(randInt(7, 22), randInt(0, 59), randInt(0, 59), 0);

  /* archivedAt：次日早晨 07:00~10:00（模拟跨天自动归档） */
  var archived = new Date(date);
  archived.setDate(archived.getDate() + 1);
  archived.setHours(randInt(7, 10), randInt(0, 59), randInt(0, 59), 0);

  return {
    id: 'VR_' + dKey.replace(/-/g, '') + '_' + orderNum,
    date: dKey,
    orderNum: orderNum,
    items: records,
    archived: true,
    createdAt: created.getTime(),
    archivedAt: archived.getTime(),
    _virtual: true           // 虚拟数据标记 —— saveData 拦截时据此过滤
  };
}

/* ==================== 生成全部 ==================== */
function generate() {
  var dates = pickRandomDates();
  return dates.map(function (d, i) {
    return makeReceipt(d, i + 1);   // orderNum 从 1 递增
  });
}

/* ==================== 存储 ==================== */
function loadOrGenerate() {
  try {
    var raw = localStorage.getItem(VIRTUAL_STORE_KEY);
    if (raw) {
      var parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) { /* fallthrough */ }
  var data = generate();
  try { localStorage.setItem(VIRTUAL_STORE_KEY, JSON.stringify(data)); } catch (e) {}
  return data;
}

/* ==================== 注入 appData ==================== */
function inject() {
  if (typeof appData === 'undefined') return;
  var virtuals = loadOrGenerate();
  var existing = {};
  for (var i = 0; i < appData.archives.length; i++) {
    existing[appData.archives[i].id] = true;
  }
  var added = 0;
  for (var j = 0; j < virtuals.length; j++) {
    var r = virtuals[j];
    if (!existing[r.id]) {
      appData.archives.push(r);
      added++;
    }
  }
  if (added > 0) {
    var ks = dateKey(DATE_START), ke = dateKey(DATE_END);
    console.log('[VirtualArchive] 已注入 ' + added + ' 条虚拟归档（' + ks + ' ~ ' + ke + '）。'
      + '移除方式：删除 index.html 中的 script 引用 + 控制台执行 VirtualArchive.clear()');
  }
}

/* ==================== 拦截 saveData ==================== */
/* 过滤掉 _virtual:true 的条目后再写入真实 localStorage key，
   确保虚拟数据永不污染真实数据。 */
function hookSaveData() {
  var orig = window.saveData;
  if (typeof orig !== 'function') return;
  window.saveData = function (data) {
    var cleaned = {
      receipts: data.receipts,
      archives: [],
      predictions: data.predictions
    };
    if (data.archives) {
      cleaned.archives = data.archives.filter(function (r) { return !r._virtual; });
    }
    return orig(cleaned);
  };
}

/* ==================== 对外接口 ==================== */
window.VirtualArchive = {
  /* 清除虚拟数据（localStorage） */
  clear: function () {
    try { localStorage.removeItem(VIRTUAL_STORE_KEY); } catch (e) {}
    console.log('[VirtualArchive] 已清除虚拟归档数据。刷新页面后虚拟数据不再加载。');
  },
  /* 重新生成虚拟数据并刷新页面 */
  regenerate: function () {
    try { localStorage.removeItem(VIRTUAL_STORE_KEY); } catch (e) {}
    loadOrGenerate();
    location.reload();
  },
  /* 当前虚拟数据条数 */
  count: function () { return loadOrGenerate().length; }
};

/* ==================== 初始化 ==================== */
hookSaveData();                                 // 解析时立即拦截 saveData
document.addEventListener('DOMContentLoaded', inject);  // DOM 就绪后注入 appData

})();
