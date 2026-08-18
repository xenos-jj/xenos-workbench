// xenos workbench app —— 人生系统工作台

// ---------- 成长提升：外语模块默认数据（提前定义，避免初始化 TDZ） ----------
const DEFAULT_LANGUAGE = {
  lang: 'en',
  level: 'middle',
  dailyGoal: 20,
  learned: {},
  today: '',
  todayCount: 0,
  listenTotal: 0,
  points: 0,
  awarded: {},
  stats: { totalLearned: 0, studyMinutes: 0, gameScore: 0, listenCount: 0, speakCount: 0 }
};

// ---------- 学习成长：英语打卡（v9144） ----------
const ENGLISH_DAILY_TASKS = [
  { key: 'words', name: '背单词', sub: '完成新词 + 复习旧词', points: 3, color: '#A99BD6', bg: '#F3F0FA' },
  { key: 'listening', name: '听力练习', sub: '完成精听 + 泛听', points: 3, color: '#6FBFB0', bg: '#EAF6F4' },
  { key: 'speaking', name: '口语练习', sub: '跟读 + 口头输出练习', points: 5, color: '#F4B678', bg: '#FFF5E9' },
  { key: 'review', name: '当日复盘', sub: '标记难词、难点', points: 2, color: '#8FA3C7', bg: '#EEF2F9' }
];

const ENGLISH_WEEKLY_TASKS = [
  { key: 'wordReview', name: '本周单词复盘整理', points: 5, color: '#A99BD6', bg: '#F3F0FA' },
  { key: 'listeningPassage', name: '完整听力短篇练习', points: 5, color: '#6FBFB0', bg: '#EAF6F4' },
  { key: 'speakingTopic', name: '口语话题口述练习', points: 5, color: '#F4B678', bg: '#FFF5E9' },
  { key: 'vocabTest', name: '词汇简单自测', points: 3, color: '#8FA3C7', bg: '#EEF2F9' }
];

const ENGLISH_STAGES = [
  { key: 'stage1', name: '基础夯实', months: '1‑2月', startMonth: 1, endMonth: 2, color: '#A99BD6' },
  { key: 'stage2', name: '能力进阶', months: '3‑4月', startMonth: 3, endMonth: 4, color: '#6FBFB0' },
  { key: 'stage3', name: '熟练运用', months: '5‑6月', startMonth: 5, endMonth: 6, color: '#F4B678' }
];

const DEFAULT_ENGLISH_CHECKIN = {
  version: 1,
  dailyMode: 'standard', // 'standard' | 'simplified'
  totalPoints: 0,
  history: {} // { '2026-08-17': { mode, restDay, tasks:{words:{done,note},...}, weekly:{wordReview:{done,note},...}, note } }
};

// ---------- 本周洞察：可选数据模块（新增板块时在此扩展） ----------
// 仅选用工作台已存在的板块；新增板块后在此追加一项即可自动出现在 DIY 选项中。
const INSIGHT_MODULES = [
  {
    id: 'focus',
    name: '专注',
    icon: 'clock',
    color: '#8FA3C7',
    bg: '#EDF1F8',
    metricName: '累计专注时长',
    metricUnit: 'min',
    avgName: '日均专注',
    avgUnit: 'min',
    compute(weekStart) {
      const daily = [], dailyItems = [], levels = [];
      let items = 0, metric = 0;
      for (let i = 0; i < 7; i++) {
        const d = shiftDate(weekStart, i);
        const min = getFocusMinutes(d);
        daily.push(min); metric += min;
        const sessions = state.focusSessions.filter(x => x.date === d).length;
        dailyItems.push(sessions); items += sessions;
        levels.push(min <= 0 ? 0 : min < 30 ? 1 : min < 90 ? 2 : 3);
      }
      return { daily, dailyItems, levels, items, metric };
    }
  },
  {
    id: 'health',
    name: '健康',
    icon: 'health',
    color: '#A0BB7A',
    bg: '#F1F6E9',
    metricName: '累计运动时长',
    metricUnit: 'min',
    avgName: '日均运动',
    avgUnit: 'min',
    compute(weekStart) {
      const daily = [], dailyItems = [], levels = [];
      let items = 0, metric = 0;
      for (let i = 0; i < 7; i++) {
        const d = shiftDate(weekStart, i);
        const list = state.exerciseLogs[d] || [];
        const min = list.filter(e => e.done).reduce((a, e) => a + (Number(e.duration) || 0), 0);
        daily.push(min); metric += min;
        const di = list.filter(e => e.done).length
          + ((state.dietLogs[d] || []).length ? 1 : 0)
          + ((state.domains.health && Number(state.domains.health.log[d]) > 0) ? 1 : 0);
        dailyItems.push(di); items += di;
        levels.push(di === 0 ? 0 : di === 1 ? 1 : di === 2 ? 2 : 3);
      }
      return { daily, dailyItems, levels, items, metric };
    }
  },
  {
    id: 'looks',
    name: '外貌',
    icon: 'sparkles',
    color: '#D6A6C7',
    bg: '#F8EEF4',
    metricName: '累计完成',
    metricUnit: '项',
    avgName: '日均完成',
    avgUnit: '项',
    compute(weekStart) {
      const daily = [], dailyItems = [], levels = [];
      let items = 0, metric = 0;
      const dom = state.domains.looks;
      for (let i = 0; i < 7; i++) {
        const d = shiftDate(weekStart, i);
        let di = 0;
        if (dom && Array.isArray(dom.tasks)) di = dom.tasks.filter(t => t.done && t.doneDate === d).length;
        if (dom && Number(dom.log[d]) > 0) di += 1;
        daily.push(di); metric += di;
        dailyItems.push(di); items += di;
        levels.push(di === 0 ? 0 : di === 1 ? 1 : di === 2 ? 2 : 3);
      }
      return { daily, dailyItems, levels, items, metric };
    }
  },
  {
    id: 'money',
    name: '记账',
    icon: 'coins',
    color: '#F4B75B',
    bg: '#FFF4E3',
    metricName: '累计支出',
    metricUnit: '元',
    avgName: '日均支出',
    avgUnit: '元',
    compute(weekStart) {
      const daily = [], dailyItems = [], levels = [];
      let items = 0, metric = 0;
      for (let i = 0; i < 7; i++) {
        const d = shiftDate(weekStart, i);
        const dayTx = state.transactions.filter(t => t.date === d && t.type === 'expense');
        const amount = dayTx.reduce((a, t) => a + (Number(t.amount) || 0), 0);
        daily.push(Math.round(amount)); metric += amount;
        const di = dayTx.length;
        dailyItems.push(di); items += di;
        levels.push(amount <= 0 ? 0 : amount < 60 ? 1 : amount < 200 ? 2 : 3);
      }
      return { daily, dailyItems, levels, items, metric };
    }
  },
  {
    id: 'learning',
    name: '学习成长',
    icon: 'bookOpen',
    color: '#A99BD6',
    bg: '#F3F0FA',
    metricName: '累计专注时长',
    metricUnit: 'min',
    avgName: '日均专注',
    avgUnit: 'min',
    compute(weekStart) {
      const daily = [], dailyItems = [], levels = [];
      let items = 0, metric = 0;
      for (let i = 0; i < 7; i++) {
        const d = shiftDate(weekStart, i);
        const min = getFocusMinutesByDomain(d, 'learning');
        daily.push(min); metric += min;
        const eng = (state.englishCheckin.history || {})[d];
        let di = state.focusSessions.filter(x => x.date === d && x.domain === 'learning').length;
        if (eng) {
          di += Object.values(eng.tasks || {}).filter(t => t && t.done).length;
          di += Object.values(eng.weekly || {}).filter(t => t && t.done).length;
        }
        dailyItems.push(di); items += di;
        levels.push(di === 0 ? 0 : di <= 2 ? 1 : di <= 4 ? 2 : 3);
      }
      return { daily, dailyItems, levels, items, metric };
    }
  },
  {
    id: 'review',
    name: '每日复盘',
    icon: 'review',
    color: '#7FB0A0',
    bg: '#EAF4F1',
    metricName: '累计复盘',
    metricUnit: '篇',
    avgName: '日均复盘',
    avgUnit: '篇',
    compute(weekStart) {
      const daily = [], dailyItems = [], levels = [];
      let items = 0, metric = 0;
      for (let i = 0; i < 7; i++) {
        const d = shiftDate(weekStart, i);
        const rev = state.dailyReviews[d];
        const done = !!(rev && (rev.reflection || '').trim());
        const di = done ? 1 : 0;
        daily.push(di); metric += di;
        dailyItems.push(di); items += di;
        levels.push(di === 0 ? 0 : 1);
      }
      return { daily, dailyItems, levels, items, metric };
    }
  }
];

let insightWeekOffset = 0;

function getWeekStart(offsetWeeks = 0) {
  const dow = (new Date().getDay() + 6) % 7;
  return shiftDate(getTodayKey(), -dow + offsetWeeks * 7);
}

function getInsightModules() {
  return loadJSON('xenos-insight-modules', INSIGHT_MODULES.map(m => m.id));
}
function saveInsightModules(ids) {
  saveJSON('xenos-insight-modules', ids);
}

function computeInsightStats(module, weekStart) {
  const cur = module.compute(weekStart);
  const prev = module.compute(shiftDate(weekStart, -7));
  return {
    id: module.id, name: module.name, icon: module.icon, color: module.color, bg: module.bg,
    metricName: module.metricName, metricUnit: module.metricUnit,
    avgName: module.avgName, avgUnit: module.avgUnit,
    daily: cur.daily, dailyItems: cur.dailyItems, levels: cur.levels,
    items: cur.items, itemsLast: prev.items,
    metric: cur.metric, metricLast: prev.metric,
    avg: Math.round(cur.metric / 7),
    avgLast: Math.round(prev.metric / 7),
    weekStart
  };
}


const DEFAULT_ASSET_ACCOUNTS = [
  { id: 'balance', name: '余额', amount: 0 },
  { id: 'secret', name: '悄悄攒', amount: 0 },
  { id: 'week52', name: '52周攒钱', amount: 0 },
  { id: 'salary', name: '工资卡', amount: 0 },
  { id: 'wechat', name: '微信', amount: 0 },
  { id: 'meituan', name: '美团月付', amount: 0, debt: true }
];

// ---------- 线性图标系统（细描边 SVG，currentColor） ----------
const ICONS = {
  home: '<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M9 22V12h6v10"/>',
  review: '<path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1"/><path d="M9 12h6M9 16h4"/>',
  insight: '<path d="M9 18h6"/><path d="M10 22h4"/><path d="M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.2 1 2V17h6v-.3c0-.8.4-1.5 1-2A7 7 0 0 0 12 2z"/>',
  voice: '<rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10a7 7 0 0 0 14 0"/><path d="M12 19v3"/>',
  mic: '<rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10a7 7 0 0 0 14 0"/><path d="M12 19v3"/>',
  rewards: '<rect x="3" y="8" width="18" height="4" rx="1"/><path d="M5 12v9h14v-9"/><path d="M12 8v13"/><path d="M12 8S10 3 7.5 3 4 5 4 6s1.5 2 3 2h5z"/><path d="M12 8s2-5 4.5-5S20 5 20 6s-1.5 2-3 2h-5z"/>',
  gift: '<rect x="3" y="8" width="18" height="4" rx="1"/><path d="M5 12v9h14v-9"/><path d="M12 8v13"/><path d="M12 8S10 3 7.5 3 4 5 4 6s1.5 2 3 2h5z"/><path d="M12 8s2-5 4.5-5S20 5 20 6s-1.5 2-3 2h-5z"/>',
  achievements: '<path d="M8 21h8"/><path d="M12 17v4"/><path d="M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M7 5H4v2a3 3 0 0 0 3 3"/><path d="M17 5h3v2a3 3 0 0 1-3 3"/>',
  trophy: '<path d="M8 21h8"/><path d="M12 17v4"/><path d="M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M7 5H4v2a3 3 0 0 0 3 3"/><path d="M17 5h3v2a3 3 0 0 1-3 3"/>',
  panel: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
  content: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18"/><path d="M8 14h8M8 17h5"/>',
  memo: '<path d="M4 4h16v12l-4 4H4z"/><path d="M15 20v-4h4"/><path d="M8 9h8M8 13h5"/>',
  note: '<path d="M4 4h16v12l-4 4H4z"/><path d="M15 20v-4h4"/><path d="M8 9h8M8 13h5"/>',
  health: '<path d="M3 12h4l2 5 4-14 2 9h6"/>',
  looks: '<path d="M12 3l1.8 4.6L18 9l-4.2 1.4L12 15l-1.8-4.6L6 9l4.2-1.4z"/><path d="M18 15l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z"/>',
  sparkles: '<path d="M12 3l1.8 4.6L18 9l-4.2 1.4L12 15l-1.8-4.6L6 9l4.2-1.4z"/><path d="M18 15l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z"/>',
  love: '<path d="M12 21s-7-4.3-9.5-8.5C1 9 2.5 5.5 6 5.5c2 0 3.2 1.2 4 2.3.8-1.1 2-2.3 4-2.3 3.5 0 5 3.5 3.5 7C19 16.7 12 21 12 21z"/>',
  heart: '<path d="M12 21s-7-4.3-9.5-8.5C1 9 2.5 5.5 6 5.5c2 0 3.2 1.2 4 2.3.8-1.1 2-2.3 4-2.3 3.5 0 5 3.5 3.5 7C19 16.7 12 21 12 21z"/>',
  family: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.5-7 8-7s8 3 8 7"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.5-7 8-7s8 3 8 7"/>',
  friend: '<circle cx="9" cy="8" r="3.2"/><path d="M2.5 20c0-3.3 2.9-5.5 6.5-5.5"/><circle cx="16.5" cy="9.5" r="3"/><path d="M13 20c.3-3 3-5 6-5 1 0 2 .2 2.8.6"/>',
  career: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M3 12h18"/>',
  briefcase: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M3 12h18"/>',
  money: '<circle cx="9" cy="9" r="6"/><path d="M15 3.5a6 6 0 0 1 0 12"/><path d="M11 6.5c-.5-.6-1.3-1-2-1-1.1 0-2 .7-2 1.5S7.9 8.5 9 8.5s2 .7 2 1.5-.9 1.5-2 1.5c-.7 0-1.5-.4-2-1"/><path d="M9 4.5v1M9 12.5v1"/>',
  coins: '<circle cx="9" cy="9" r="6"/><path d="M15 3.5a6 6 0 0 1 0 12"/><path d="M11 6.5c-.5-.6-1.3-1-2-1-1.1 0-2 .7-2 1.5S7.9 8.5 9 8.5s2 .7 2 1.5-.9 1.5-2 1.5c-.7 0-1.5-.4-2-1"/><path d="M9 4.5v1M9 12.5v1"/>',
  intro: '<rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="8.5" cy="11" r="2"/><path d="M4.8 16c.5-1.5 2-2.3 3.7-2.3S11.7 14.5 12.2 16"/><path d="M14 9.5h4M14 12.5h4M14 15h3"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
  focus: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  book: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>',
  bookOpen: '<path d="M12 7v14"/><path d="M3 5h5a3 3 0 0 1 3 3v12a2.5 2.5 0 0 0-2.5-2.5H3z"/><path d="M21 5h-5a3 3 0 0 0-3 3v12a2.5 2.5 0 0 1 2.5-2.5H21z"/>',
  history: '<path d="M3 3v5h5"/><path d="M3.05 13A9 9 0 1 0 6 5.3L3 8"/><path d="M12 7v5l4 2"/>',
  language: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3a15 15 0 0 1 0 18 15 15 0 0 1 0-18z"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3a15 15 0 0 1 0 18 15 15 0 0 1 0-18z"/>',
  video: '<rect x="3" y="6" width="13" height="12" rx="2"/><path d="M16 10l5-3v10l-5-3z"/>',
  model3d: '<path d="M12 2l9 5v10l-9 5-9-5V7z"/><path d="M12 12l9-5M12 12v10M12 12L3 7"/>',
  cube: '<path d="M12 2l9 5v10l-9 5-9-5V7z"/><path d="M12 12l9-5M12 12v10M12 12L3 7"/>',
  calendar: '<rect x="3" y="4" width="18" height="17" rx="2"/><path d="M3 9h18M8 2v4M16 2v4"/>',
  chart: '<path d="M3 3v18h18"/><path d="M7 14v4M12 10v8M17 6v12"/>',
  wallet: '<path d="M3 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2"/><rect x="3" y="7" width="18" height="12" rx="2"/><path d="M16 12h4v4h-4a2 2 0 0 1 0-4z"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  delete: '<path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/>',
  edit: '<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4z"/>',
  back: '<path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/>',
  chevronLeft: '<path d="M15 18l-6-6 6-6"/>',
  close: '<path d="M18 6L6 18M6 6l12 12"/>',
  check: '<path d="M20 6L9 17l-5-5"/>',
  fire: '<path d="M12 3c.5 3 3 4.3 3 7.5a3 3 0 0 1-6 0c0-.8.3-1.5.7-2C7 10 6 12 6 14a6 6 0 0 0 12 0c0-4.5-3.5-7-6-11z"/>',
  star: '<path d="M12 3l2.9 5.9 6.5.9-4.7 4.6 1.1 6.5L12 18.8 6.2 21.9l1.1-6.5L2.6 9.8l6.5-.9z"/>',
  target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
  folder: '<path d="M3 7a2 2 0 0 1 2-2h4l2 3h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
  file: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/>',
  list: '<path d="M8 6h13M8 12h13M8 18h13"/><path d="M3 6h.01M3 12h.01M3 18h.01"/>',
  ear: '<path d="M6 8.5a6 6 0 0 1 12 0c0 2.5-1.5 3.5-2.5 4.5S14 15 14 17a3 3 0 0 1-6 0"/><path d="M9 9a3 3 0 0 1 6 0"/>',
  flag: '<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V4s-1 1-4 1-5-2-8-2-4 1-4 1z"/><path d="M4 22V4"/>',
  layers: '<path d="M12 3l9 5-9 5-9-5z"/><path d="M3 13l9 5 9-5"/>',
  scissors: '<circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M20 4L8.5 15.5M14.5 14.5L20 20M8.5 8.5L12 12"/>',
  dumbbell: '<path d="M6 7v10M3 9v6M18 7v10M21 9v6M6 12h12"/>',
  leaf: '<path d="M4 20c0-8 6-14 16-15C19 14 13 20 5 20z"/><path d="M4 20c3-4 6-6 10-8"/>',
  smile: '<circle cx="12" cy="12" r="9"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><path d="M9 9h.01M15 9h.01"/>',
  refresh: '<path d="M21 12a9 9 0 1 1-3-6.7L21 8"/><path d="M21 3v5h-5"/>',
  inbox: '<path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.5 5h13l3.5 7v6a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-6z"/>',
  utensils: '<path d="M4 3v6c0 1 .6 1.6 1.5 1.6S7 10 7 9V3M5.5 10.6V21"/><path d="M16 3c-1.5 0-2.5 2-2.5 5s1 3.5 2.5 3.5V21"/>',
  ruler: '<path d="M3 16.5L16.5 3 21 7.5 7.5 21z"/><path d="M7 12l2 2M10 9l2 2M13 6l2 2"/>',
  image: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8.5" cy="9.5" r="1.5"/><path d="M3 16l5-5 4 4 6-6 3 3"/>',
  // 奖励池 / 成就 / 记账分类线性图标
  flower: '<path d="M12 7c.8-1.5 2.7-1.5 3.5 0 .8 1.5-.3 3-2 3.5 1.7.5 2.8 2 2 3.5-.8 1.5-2.7 1.5-3.5 0-.8 1.5-2.7 1.5-3.5 0-.8-1.5.3-3 2-3.5-1.7-.5-2.8-2-2-3.5.8-1.5 2.7-1.5 3.5 0z"/><circle cx="12" cy="12" r="1.2" fill="currentColor"/>',
  sparkle: '<path d="M12 2v4M12 18v4M2 12h4M18 12h4M4.9 4.9l2.8 2.8M16.3 16.3l2.8 2.8M4.9 19.1l2.8-2.8M16.3 7.7l2.8-2.8"/>',
  sunrise: '<path d="M3 18h18"/><path d="M12 4v8"/><path d="M7 9L5 7"/><path d="M17 9l2-2"/><path d="M12 4V2"/>',
  mountain: '<path d="M3 19h18L14 9l-4 7-3-4-4 7z"/>',
  mountains: '<path d="M3 19h18l-5-9-4 6-2-3-4 6z"/><path d="M14 11l4 8"/>',
  timer: '<circle cx="12" cy="13" r="7"/><path d="M12 9v4l3 2"/><path d="M12 4V2"/><path d="M15 3H9"/>',
  meditate: '<path d="M12 5a3 3 0 1 0 0 6 3 3 0 1 0 0-6z"/><path d="M6 19c0-3.3 2.7-6 6-6s6 2.7 6 6"/><path d="M6 19h12"/>',
  gem: '<path d="M6 8l6-5 6 5-6 10-6-10z"/><path d="M6 8h12"/><path d="M9 8l3 10 3-10"/>',
  muscle: '<path d="M6 11c0-2 1.5-4 3.5-4s3.5 2 3.5 4"/><path d="M18 11c0-2-1.5-4-3.5-4s-3.5 2-3.5 4"/><path d="M9 16c2 1 4 1 6 0"/>',
  food: '<path d="M6 8h12"/><path d="M5 8c0 4 3 8 7 8s7-4 7-8"/><path d="M8 8v2M12 8v3M16 8v2"/>',
  card: '<rect x="3" y="6" width="18" height="12" rx="2"/><path d="M3 10h18"/><circle cx="7" cy="14" r="1" fill="currentColor"/><path d="M11 14h8"/>',
  train: '<rect x="5" y="5" width="14" height="14" rx="2"/><path d="M5 10h14M8 5v14M16 5v14M8 19l-2 3M16 19l2 3"/>',
  shopping: '<path d="M6 7h12l1 13H5z"/><path d="M9 7V5a3 3 0 0 1 6 0v2"/>',
  film: '<rect x="3" y="6" width="18" height="12" rx="2"/><path d="M7 6v12M17 6v12"/>',
  pill: '<rect x="8" y="4" width="8" height="16" rx="4"/><path d="M8 12h8"/>',
  box: '<path d="M12 3l9 4.5v9L12 21 3 16.5v-9z"/><path d="M12 12l9-4.5M12 12v9M12 12L3 7.5"/>',
  envelope: '<path d="M3 6h18v12H3z"/><path d="M3 6l9 6 9-6"/>',
  laptop: '<rect x="3" y="5" width="18" height="12" rx="2"/><path d="M2 17h20"/>',
  chartLine: '<path d="M3 17h18"/><path d="M3 13l5-5 4 4 6-7"/>'
};

function icon(name, size = 16) {
  const inner = ICONS[name] || ICONS['file'];
  return `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`;
}

// 菜单项图标：兼容旧的内联 <svg>/emoji 与新的图标名称
function renderItemIcon(value, size = 16) {
  if (typeof value !== 'string' || !value) return icon('file', size);
  const v = value.trim();
  if (v.charAt(0) === '<') return v;            // 旧的内联 SVG，原样输出
  if (ICONS[v]) return icon(v, size);           // 新的图标名称
  return v;                                      // 兼容旧 emoji / 自定义文本
}

const DEFAULT_GROUPS = [
  {
    id: 'g-overview',
    name: '概览',
    icon: 'layers',
    collapsed: false,
    items: [
      { id: 'i-home', name: '工作台首页', icon: 'home' },
      { id: 'i-review', name: '每日复盘', icon: 'review', todo: true },
      { id: 'i-money', name: '记账', icon: 'coins' },
      { id: 'i-insight', name: '本周洞察', icon: 'insight' },
      { id: 'i-branches', name: '我的支线', icon: 'layers' }
    ]
  },
  {
    id: 'g-motivate',
    name: '激励',
    icon: 'fire',
    collapsed: false,
    items: [
      { id: 'i-rewards', name: '奖励池', icon: 'rewards' },
      { id: 'i-achievements', name: '成就殿堂', icon: 'trophy' }
    ]
  },
  {
    id: 'g-growth',
    name: '成长提升',
    icon: 'star',
    collapsed: false,
    items: [
      { id: 'i-book', name: '书籍阅读', icon: 'book' },
      { id: 'i-history', name: '历史', icon: 'history' },
      { id: 'i-study', name: '学习成长', icon: 'bookOpen' },
      { id: 'i-video-edit', name: '视频剪辑', icon: 'video' },
      { id: 'i-3d', name: '3D建模', icon: 'model3d' }
    ]
  },
  {
    id: 'g-system',
    name: '系统',
    icon: 'panel',
    collapsed: false,
    items: [
      { id: 'i-panel', name: '系统面板', icon: 'panel' },
      { id: 'i-content', name: '内容素材库', icon: 'content' },
      { id: 'i-memos', name: '碎碎念', icon: 'note' }
    ]
  },
  {
    id: 'g-domains',
    name: '人生领域',
    icon: 'leaf',
    collapsed: false,
    items: [
      { id: 'i-health', name: '健康', icon: 'health' },
      { id: 'i-look', name: '外貌', icon: 'sparkles' }
    ]
  },
  {
    id: 'g-self',
    name: '自我',
    icon: 'user',
    collapsed: false,
    items: [
      { id: 'i-intro', name: '自我介绍', icon: 'intro' },
      { id: 'i-settings', name: '设置', icon: 'settings' }
    ]
  }
];

const MOBILE_TABS = [
  { id: 'tab-home', name: '首页', icon: 'home', target: '工作台首页' },
  { id: 'tab-plan', name: '计划', icon: 'review', target: '每日计划' },
  { id: 'tab-focus', name: '专注', icon: 'clock', action: 'focus' },
  { id: 'tab-money', name: '记账', icon: 'coins', target: '记账' },
  { id: 'tab-health', name: '健康', icon: 'health', target: '健康' }
];

// 人生领域配置（领域页模板）
const DOMAIN_CONFIG = {
  '健康': {
    key: 'health', icon: 'health', subtitle: '身体是所有事情的地基',
    tags: ['生活', '健康', '运动'],
    tools: [
      { name: '饮食记录', sub: '热量 / 三餐', icon: 'utensils', target: '饮食' },
      { name: '健身训练', sub: '运动 / 跟练', icon: 'dumbbell', target: '健身' }
    ],
    tasks: [
      { text: '喝水 1500ml', points: 2 },
      { text: '12点前睡觉', points: 5 },
      { text: '饮食记录', points: 2 }
    ]
  },
  '外貌': {
    key: 'looks', icon: 'sparkles', subtitle: '把自己当作长期作品来打磨',
    tags: ['护肤', '仪态', '穿搭', '妆容'],
    tools: [
      { name: '护肤日常', sub: '清洁 / 保湿 / 防晒', icon: 'sparkles', action: 'looks-content', payload: '护肤' },
      { name: '仪态练习', sub: '体态 / 气质 / 穿搭', icon: 'user', action: 'looks-content', payload: '仪态' },
      { name: '灵感素材', sub: '穿搭参考', icon: 'content', target: '内容素材库' }
    ],
    tasks: [
      { text: '早晚护肤', points: 2 },
      { text: '挺胸收腹 10 分钟', points: 2 },
      { text: '搭配今日穿搭', points: 2 },
      { text: '拉伸 / 体态训练', points: 5 }
    ]
  },
  '记账': {
    key: 'money', icon: 'coins', subtitle: '记录每一笔，掌控现金流',
    tags: ['记账', '预算', '存钱', '理财'],
    subTabs: [
      { key: 'ledger', name: '记账' },
      { key: 'save', name: '存钱' },
      { key: 'invest', name: '理财' }
    ],
    tasks: [
      { text: '不超日预算', points: 1 },
      { text: '记录今日所有支出', points: 1 }
    ]
  }
};

const MOOD_LIST = [
  { emoji: '😄', name: '开心' },
  { emoji: '🙂', name: '平静' },
  { emoji: '😐', name: '一般' },
  { emoji: '😔', name: '低落' },
  { emoji: '😤', name: '烦躁' },
  { emoji: '🥱', name: '疲惫' },
  { emoji: '🤩', name: '兴奋' }
];

const QUOTES = [
  { text: '不要因为走得太远，忘了当初为什么出发。', author: '纪伯伦' },
  { text: '种一棵树最好的时间是十年前，其次是现在。', author: '谚语' },
  { text: '你不需要很厉害才能开始，但你需要开始才会很厉害。', author: '佚名' },
  { text: '把每一件小事做好，人生自然会好起来。', author: '佚名' },
  { text: '慢慢来，比较快。', author: '佚名' },
  { text: '自律不是自虐，是给未来的自己留一条更宽的路。', author: '佚名' },
  { text: '人生不是短跑，而是一场需要耐心的长跑。', author: '佚名' }
];

const DEFAULT_PROFILE = {
  name: 'Xenos',
  age: '',
  gender: '',
  birthdaySolar: '',
  birthdayLunar: '',
  job: '',
  hobby: '',
  skill: '',
  personality: '',
  swot: { s: '', w: '', o: '', t: '' }
};

const DEFAULT_REWARDS = [
  // 小奖励（0–100 分）柔和浅暖米色 / 淡奶咖色
  { id: 'rw-s1', tier: 'small', emoji: '🍰', img: '', name: '甜品', desc: '甜一下', cost: 60 },
  { id: 'rw-s2', tier: 'small', emoji: '🧋', img: '', name: '一杯奶茶', desc: '日常小犒赏', cost: 50 },
  { id: 'rw-s3', tier: 'small', emoji: '🍿', img: '', name: '零食', desc: '解馋小快乐', cost: 40 },
  { id: 'rw-s4', tier: 'small', emoji: '🍓', img: '', name: '新鲜水果', desc: '健康小补给', cost: 45 },
  // 中奖励（100–300 分）清新浅豆绿色
  { id: 'rw-m1', tier: 'medium', emoji: '🎬', img: '', name: '看一场影院电影', desc: '影院大屏观影', cost: 200 },
  { id: 'rw-m2', tier: 'medium', emoji: '🤖', img: '', name: 'AI 动漫观影', desc: '沉浸式追番', cost: 120 },
  { id: 'rw-m3', tier: 'medium', emoji: '📺', img: '', name: '综艺畅看', desc: '休闲放松时刻', cost: 130 },
  { id: 'rw-m4', tier: 'medium', emoji: '📖', img: '', name: '小说会员', desc: '随心看网文', cost: 160 },
  { id: 'rw-m5', tier: 'medium', emoji: '🎞️', img: '', name: '影视会员', desc: '海量剧集随心刷', cost: 180 },
  { id: 'rw-m6', tier: 'medium', emoji: '🏬', img: '', name: '商场观影', desc: '商圈影院体验', cost: 220 },
  { id: 'rw-m7', tier: 'medium', emoji: '🥡', img: '', name: '点外卖', desc: '省心干饭自由', cost: 250 },
  { id: 'rw-m8', tier: 'medium', emoji: '📚', img: '', name: '买一本想读的书', desc: '知识投资', cost: 150 },
  // 大奖励（300–1000 分）温柔浅香芋紫色
  { id: 'rw-l1', tier: 'large', emoji: '🏋️', img: '', name: '单次健身消费', desc: '运动焕新状态', cost: 400 },
  { id: 'rw-l2', tier: 'large', emoji: '🚗', img: '', name: '短途出门游玩', desc: '短途散心出行', cost: 700 },
  { id: 'rw-l3', tier: 'large', emoji: '🧵', img: '', name: '手工 DIY 体验', desc: '动手创作乐趣', cost: 550 },
  { id: 'rw-l4', tier: 'large', emoji: '💍', img: '', name: '配饰选购', desc: '穿搭小点缀', cost: 800 },
  // 超大奖励（1000–3000 分）暖橘浅橙色
  { id: 'rw-x1', tier: 'xlarge', emoji: '👗', img: '', name: '心仪已久的一件衣服', desc: '穿搭大额犒赏', cost: 1500 },
  { id: 'rw-x2', tier: 'xlarge', emoji: '🛋️', img: '', name: '心仪已久的家具', desc: '居家品质升级', cost: 2200 },
  { id: 'rw-x3', tier: 'xlarge', emoji: '🎁', img: '', name: '心仪已久的一件好物', desc: '大额犒赏', cost: 1500 }
];

const REWARD_TIERS = [
  { key: 'small', name: '小奖励', icon: 'flower', min: 0, max: 100, bg: '#FDF6ED', border: '#F3E8DA', text: '#A68B6F' },
  { key: 'medium', name: '中奖励', icon: 'star', min: 100, max: 300, bg: '#F0F7EB', border: '#DDEED5', text: '#6E9A5E' },
  { key: 'large', name: '大奖励', icon: 'crown', min: 300, max: 1000, bg: '#F2EFF9', border: '#E6E0F3', text: '#8F7DB8' },
  { key: 'xlarge', name: '超大奖励', icon: 'sparkle', min: 1000, max: 3000, bg: '#FFF4EB', border: '#F9E3CF', text: '#D99861' }
];

function rewardTierByCost(cost) {
  const c = Number(cost) || 0;
  if (c >= 1000) return 'xlarge';
  if (c >= 300) return 'large';
  if (c >= 100) return 'medium';
  return 'small';
}
function rewardTierMeta(key) { return REWARD_TIERS.find(t => t.key === key) || REWARD_TIERS[0]; }

const DEFAULT_ACHIEVEMENTS = [
  { id: 'ac-1', icon: 'sunrise', name: '启程', desc: '完成第一次打卡', type: 'checkin', need: 1 },
  { id: 'ac-2', icon: 'fire', name: '连续三日', desc: '连续打卡 3 天', type: 'streak', need: 3 },
  { id: 'ac-3', icon: 'mountain', name: '坚持一周', desc: '连续打卡 7 天', type: 'streak', need: 7 },
  { id: 'ac-4', icon: 'mountains', name: '月度长跑', desc: '连续打卡 30 天', type: 'streak', need: 30 },
  { id: 'ac-5', icon: 'timer', name: '专注新手', desc: '累计专注 60 分钟', type: 'focus', need: 60 },
  { id: 'ac-6', icon: 'meditate', name: '心流达人', desc: '累计专注 600 分钟', type: 'focus', need: 600 },
  { id: 'ac-7', icon: 'gem', name: '积分百分', desc: '累计获得 100 积分', type: 'points', need: 100 },
  { id: 'ac-8', icon: 'crown', name: '积分千分', desc: '累计获得 1000 积分', type: 'points', need: 1000 },
  { id: 'ac-9', icon: 'review', name: '复盘习惯', desc: '完成 7 次每日复盘', type: 'review', need: 7 },
  { id: 'ac-10', icon: 'mic', name: '开口说话', desc: '完成 3 次语音复盘', type: 'voice', need: 3 },
  { id: 'ac-11', icon: 'muscle', name: '运动起步', desc: '累计运动 300 分钟', type: 'exercise', need: 300 },
  { id: 'ac-12', icon: 'gift', name: '第一次兑换', desc: '兑换任意一个奖励', type: 'redeem', need: 1 }
];

const CONTENT_TABS = [
  { key: 'hot', name: '热点库' },
  { key: 'tool', name: '二创工具' },
  { key: 'review', name: '内容复盘' }
];

const CONTENT_FILTERS = ['全部', '小红书', '抖音', 'B站'];

const DEFAULT_CONTENT_ITEMS = [
  { id: 'ct-1', tab: 'hot', platform: '小红书', category: '生活方式', title: '一个人住的第 365 天', hook: '开头 3 秒展示反差场景：空房间 → 温馨小家', views: 12800, likes: 940, collects: 320, url: 'https://www.xiaohongshu.com/search_result?keyword=%E4%B8%80%E4%B8%AA%E4%BA%BA%E4%BD%8F' },
  { id: 'ct-2', tab: 'hot', platform: '抖音', category: '自律成长', title: '早上 5 点起床的一天', hook: '用倒计时数字卡点，制造紧凑感', views: 45200, likes: 3800, collects: 1120, url: 'https://www.douyin.com/search/%E6%97%A9%E4%B8%8A%205%20%E7%82%B9%E8%B5%B7%E5%BA%8A' },
  { id: 'ct-3', tab: 'hot', platform: 'B站', category: '效率工具', title: '我的人生管理系统长这样', hook: '先抛结论：一年做完 200 件事的方法', views: 23100, likes: 1900, collects: 2400, url: 'https://search.bilibili.com/all?keyword=%E4%BA%BA%E7%94%9F%E7%AE%A1%E7%90%86%E7%B3%BB%E7%BB%9F' },
  { id: 'ct-4', tab: 'hot', platform: '小红书', category: '穿搭', title: '小个子女生显高穿搭公式', hook: '高腰线 + 同色系 + 尖头鞋，视觉拉高 10cm', views: 33200, likes: 2100, collects: 1800, url: 'https://www.xiaohongshu.com/search_result?keyword=%E6%98%BE%E9%AB%98%E7%A9%BF%E6%90%AD' },
  { id: 'ct-5', tab: 'hot', platform: '抖音', category: '护肤', title: '早 C 晚 A 到底怎么用', hook: '先用 VC 抗氧化，晚上用 A 醇抗老，注意建立耐受', views: 58900, likes: 4200, collects: 2600, url: 'https://www.douyin.com/search/%E6%97%A9%20C%20%E6%99%9A%20A' },
  { id: 'ct-6', tab: 'hot', platform: 'B站', category: '理财', title: '月薪 5 千如何开始存钱', hook: '先讲「支付顺序」：先存后花，再谈投资', views: 17800, likes: 1500, collects: 1900, url: 'https://search.bilibili.com/all?keyword=%E6%9C%88%E8%96%AA%E5%AD%98%E9%92%B1' },
  { id: 'ct-7', tab: 'hot', platform: '抖音', category: '健身', title: '10 分钟跟练瘦小腿', hook: '垫上动作，无跳跃，睡前也能做', views: 71500, likes: 5600, collects: 3100, url: 'https://www.douyin.com/search/10%20%E5%88%86%E9%92%9F%E7%98%A6%E5%B0%8F%E8%85%BF' },
  { id: 'ct-8', tab: 'hot', platform: '小红书', category: '仪态', title: '改善富贵包的日常练习', hook: '靠墙站立 + 收下巴，每天 5 分钟', views: 22400, likes: 1700, collects: 1500, url: 'https://www.xiaohongshu.com/search_result?keyword=%E5%AF%8C%E8%B4%B5%E5%8C%85' },
  { id: 'ct-9', tab: 'tool', platform: '通用', category: '标题公式', title: '爆款标题 12 个模板', hook: '数字 + 身份 + 结果 + 时间限定', views: 0, likes: 0, collects: 0, url: '' },
  { id: 'ct-10', tab: 'tool', platform: '通用', category: '脚本结构', title: '三段式短视频脚本', hook: '钩子 → 干货 → 行动号召', views: 0, likes: 0, collects: 0, url: '' },
  { id: 'ct-11', tab: 'tool', platform: '通用', category: '拍摄技巧', title: '手机也能拍出电影感', hook: '三分构图 + 逆光 + 手动对焦锁定', views: 0, likes: 0, collects: 0, url: '' },
  { id: 'ct-12', tab: 'tool', platform: '小红书', category: '封面排版', title: '3 种高点击封面模板', hook: '大字标题 + 对比图 + 统一色系', views: 0, likes: 0, collects: 0, url: '' },
  { id: 'ct-13', tab: 'tool', platform: '抖音', category: '流量逻辑', title: '完播率为什么重要', hook: '前 3 秒决定推流，黄金 5 秒给信息', views: 0, likes: 0, collects: 0, url: '' },
  { id: 'ct-14', tab: 'tool', platform: 'B站', category: '剪辑思路', title: '转场不花哨也好看', hook: '匹配剪辑 + 音效卡点，比特效更高级', views: 0, likes: 0, collects: 0, url: '' },
  { id: 'ct-15', tab: 'review', platform: '小红书', category: '本周复盘', title: '本周发布 3 条，涨粉 120', hook: '数据最好的是「早起 vlog」，说明真实感更受欢迎', views: 8600, likes: 520, collects: 210, url: '' },
  { id: 'ct-16', tab: 'review', platform: '抖音', category: '数据复盘', title: '爆了一条 13 万播放', hook: '共同点：开头直接给结果，不废话', views: 13200, likes: 980, collects: 410, url: '' },
  { id: 'ct-17', tab: 'review', platform: 'B站', category: '月度复盘', title: '三月做了 8 期，踩的坑', hook: '更新频率 > 单条质量，先稳定再优化', views: 6400, likes: 430, collects: 360, url: '' },
  { id: 'ct-18', tab: 'hot', platform: '小红书', category: '好物', title: '百元内提升幸福感小物', hook: '每个都附使用场景，不硬广', views: 28900, likes: 2010, collects: 2400, url: 'https://www.xiaohongshu.com/search_result?keyword=%E7%99%BE%E5%85%83%E5%B0%8F%E7%89%A9' },
  { id: 'ct-19', tab: 'hot', platform: '抖音', category: '美食', title: '10 分钟快手减脂餐', hook: '一锅出，少洗碗，好吃不胖', views: 49300, likes: 3300, collects: 2900, url: 'https://www.douyin.com/search/10%20%E5%88%86%E9%92%9F%E5%87%8F%E8%84%82%E9%A4%90' },
  { id: 'ct-20', tab: 'hot', platform: 'B站', category: '学习', title: '我是怎么坚持早起的', hook: '把起床和一件期待的事绑定，降低阻力', views: 15400, likes: 1200, collects: 1700, url: 'https://search.bilibili.com/all?keyword=%E5%9D%9A%E6%8C%81%E6%97%A9%E8%B5%B7' },
  { id: 'ct-21', tab: 'tool', platform: '通用', category: '选题方法', title: '评论区挖选题法', hook: '高赞评论 = 下一条内容方向', views: 0, likes: 0, collects: 0, url: '' },
  { id: 'ct-22', tab: 'review', platform: '小红书', category: '账号诊断', title: '为什么我的笔记没流量', hook: '封面不统一 + 标题太泛，先改这两点', views: 9700, likes: 610, collects: 520, url: '' }
];

const DEFAULT_DAILY_REVIEW = {
  mood: '🙂',
  energy: 3,
  focusMinutes: 0,
  sleepHours: 0,
  exerciseMinutes: 0,
  reflection: ''
};

const DEFAULT_PLANS = [
  { text: '12点前睡觉', group: '生活计划', points: 2 },
  { text: '每日做饭', group: '生活计划', points: 2 },
  { text: '喝水 1500ml', group: '健康计划', points: 2 },
  { text: '锻炼足弓10分钟', group: '运动计划', points: 2 },
  { text: '站轴10分钟', group: '运动计划', points: 2 },
  { text: '练习前驱5分钟', group: '运动计划', points: 2 },
  { text: '滚泡沫轴', group: '运动计划', points: 2 },
  { text: '每日30个单词', group: '学习计划', points: 5 },
  { text: '音标学习', group: '学习计划', points: 5 },
  { text: '早晚护肤', group: '生活计划', points: 2 },
  { text: '挺胸收腹 10 分钟', group: '运动计划', points: 2 },
  { text: '搭配今日穿搭', group: '生活计划', points: 2 },
  { text: '拉伸 / 体态训练', group: '运动计划', points: 5 }
];

const DEFAULT_PLAN_GROUPS = ['工作计划', '生活计划', '健康计划', '运动计划', '学习计划', '日常'];

const DEFAULT_MONEY = {
  total: 0,
  income: 0,
  expense: 0
};

const DEFAULT_BUDGET = 0;

const DEFAULT_TRANSACTIONS = [];

const DEFAULT_EXPENSE_CATEGORIES = [
  { name: '房租', icon: 'home' },
  { name: '餐饮', icon: 'food' },
  { name: 'APP会员', icon: 'card' },
  { name: '交通出行', icon: 'train' },
  { name: '购物', icon: 'shopping' },
  { name: '娱乐', icon: 'film' },
  { name: '医疗', icon: 'pill' },
  { name: '其他', icon: 'box' }
];

const DEFAULT_INCOME_CATEGORIES = [
  { name: '工资', icon: 'coins' },
  { name: '奖金', icon: 'envelope' },
  { name: '兼职', icon: 'laptop' },
  { name: '理财', icon: 'chartLine' },
  { name: '其他', icon: 'box' }
];

const DEFAULT_SETTINGS = {
  brandTitle: '早日实现财富自由',
  brandSubtitle: 'Freedom Workbench',
  brandAvatar: '🐰',
  userName: 'Xenos',
  userAvatar: '🐰',
  mood: '平静',
  currentPhase: '成长',
  phaseOptions: ['成长', '生活', '自律', '学习', '英语', '剪辑', 'AI'],
  monthlyFocus: ['英语', '健康', '记账'],
  focusOptions: ['英语', '健康', '记账', '睡眠', '自媒体', '阅读', '锻炼', '生活', '护肤'],
  keepBranches: [
    { name: '攒钱', emoji: '💰', freq: '每周 2 天', color: '#f4b75b' },
    { name: '生活秩序', emoji: '📋', freq: '每周 2 天', color: '#a0bb7a' },
    { name: '内在成长', emoji: '🌱', freq: '每周 1 天', color: '#f4b75b' },
    { name: '阅读积累', emoji: '📖', freq: '每周 4 天', color: '#8978c3' }
  ],
  slowBranches: [
    { name: '旅行体验', emoji: '✈️' },
    { name: '社交拓展', emoji: '💬' }
  ],
  slowPool: [
    { name: '旅行体验', emoji: '✈️', desc: '探索世界，记录美好风景' },
    { name: '社交拓展', emoji: '💬', desc: '维护关系，认识新朋友' },
    { name: '摄影审美', emoji: '📷', desc: '练习构图与后期，积累作品集' },
    { name: '技能考证', emoji: '📜', desc: '考取职业或兴趣相关证书' },
    { name: '家居整理', emoji: '🏠', desc: '打造舒适整洁的生活空间' },
    { name: '烹饪美食', emoji: '🍳', desc: '学习新菜式，照顾好自己的胃' },
    { name: '音乐练习', emoji: '🎵', desc: '乐器或声乐，享受旋律疗愈' },
    { name: '志愿公益', emoji: '💝', desc: '参与社区或公益活动' }
  ]
};

const APP_VERSION = '2.0.0';

const DEFAULT_BODY = {
  weight: 53.95,
  bodyFat: 28,
  height: 162,
  age: 30,
  targetWeight: 47,
  waist: 71,
  thigh: 52,
  calf: 37
};

const DEFAULT_MEASUREMENTS = [];

const DEFAULT_FOOD_LIBRARY = [
  // 主食（每100g）
  { name: '米饭', unit: '100g', calories: 116 },
  { name: '面条', unit: '100g', calories: 137 },
  { name: '馒头', unit: '100g', calories: 223 },
  { name: '包子', unit: '1个', calories: 220 },
  { name: '饺子', unit: '1个', calories: 50 },
  { name: '馄饨', unit: '1碗', calories: 300 },
  { name: '面包', unit: '100g', calories: 265 },
  { name: '吐司', unit: '1片', calories: 80 },
  { name: '燕麦', unit: '50g', calories: 190 },
  { name: '麦片', unit: '30g', calories: 110 },
  { name: '玉米', unit: '1根', calories: 120 },
  { name: '红薯', unit: '100g', calories: 86 },
  { name: '土豆', unit: '100g', calories: 77 },
  { name: '紫薯', unit: '100g', calories: 82 },
  { name: '南瓜', unit: '100g', calories: 23 },
  { name: '荞麦面', unit: '100g', calories: 132 },
  { name: '意面', unit: '100g', calories: 157 },
  { name: '米粉', unit: '100g', calories: 116 },
  { name: '河粉', unit: '100g', calories: 150 },
  { name: '煎饼', unit: '1个', calories: 250 },
  { name: '手抓饼', unit: '1个', calories: 350 },
  // 肉蛋奶（每100g 或按件）
  { name: '鸡胸肉', unit: '100g', calories: 165 },
  { name: '鸡腿', unit: '1个', calories: 180 },
  { name: '鸡翅', unit: '1个', calories: 120 },
  { name: '鸡蛋', unit: '1个', calories: 70 },
  { name: '鸭蛋', unit: '1个', calories: 90 },
  { name: '牛奶', unit: '100ml', calories: 54 },
  { name: '酸奶', unit: '1杯', calories: 116 },
  { name: '豆浆', unit: '100ml', calories: 32 },
  { name: '牛肉', unit: '100g', calories: 250 },
  { name: '牛排', unit: '100g', calories: 270 },
  { name: '猪肉', unit: '100g', calories: 242 },
  { name: '排骨', unit: '100g', calories: 278 },
  { name: '羊肉', unit: '100g', calories: 294 },
  { name: '虾', unit: '100g', calories: 85 },
  { name: '虾仁', unit: '100g', calories: 95 },
  { name: '鱼', unit: '100g', calories: 120 },
  { name: '三文鱼', unit: '100g', calories: 208 },
  { name: '金枪鱼', unit: '100g', calories: 144 },
  { name: '豆腐', unit: '100g', calories: 76 },
  { name: '豆干', unit: '100g', calories: 140 },
  { name: '火腿肠', unit: '1根', calories: 80 },
  { name: '培根', unit: '2片', calories: 90 },
  { name: '香肠', unit: '1根', calories: 120 },
  // 蔬菜（每100g）
  { name: '西兰花', unit: '100g', calories: 34 },
  { name: '空心菜', unit: '100g', calories: 50 },
  { name: '菠菜', unit: '100g', calories: 23 },
  { name: '生菜', unit: '100g', calories: 15 },
  { name: '油麦菜', unit: '100g', calories: 12 },
  { name: '黄瓜', unit: '100g', calories: 16 },
  { name: '番茄', unit: '100g', calories: 18 },
  { name: '西红柿炒鸡蛋', unit: '1份', calories: 180 },
  { name: '胡萝卜', unit: '100g', calories: 41 },
  { name: '茄子', unit: '100g', calories: 25 },
  { name: '青椒', unit: '100g', calories: 22 },
  { name: '洋葱', unit: '100g', calories: 40 },
  { name: '蘑菇', unit: '100g', calories: 22 },
  { name: '香菇', unit: '100g', calories: 26 },
  { name: '海带', unit: '100g', calories: 13 },
  { name: '紫菜', unit: '100g', calories: 250 },
  { name: '豆芽', unit: '100g', calories: 18 },
  // 水果（按件或100g）
  { name: '苹果', unit: '1个', calories: 106 },
  { name: '香蕉', unit: '1根', calories: 89 },
  { name: '橙子', unit: '1个', calories: 70 },
  { name: '橘子', unit: '1个', calories: 50 },
  { name: '猕猴桃', unit: '1个', calories: 61 },
  { name: '葡萄', unit: '100g', calories: 69 },
  { name: '西瓜', unit: '100g', calories: 30 },
  { name: '草莓', unit: '100g', calories: 32 },
  { name: '蓝莓', unit: '100g', calories: 57 },
  { name: '梨', unit: '1个', calories: 100 },
  { name: '桃子', unit: '1个', calories: 80 },
  { name: '芒果', unit: '1个', calories: 135 },
  { name: '火龙果', unit: '1个', calories: 120 },
  { name: '榴莲', unit: '100g', calories: 147 },
  { name: '荔枝', unit: '100g', calories: 66 },
  { name: '樱桃', unit: '100g', calories: 63 },
  // 零食/饮料/其他
  { name: '可乐', unit: '100ml', calories: 42 },
  { name: '雪碧', unit: '100ml', calories: 44 },
  { name: '果汁', unit: '100ml', calories: 48 },
  { name: '奶茶', unit: '1杯', calories: 350 },
  { name: '咖啡', unit: '1杯', calories: 5 },
  { name: '拿铁', unit: '1杯', calories: 150 },
  { name: '巧克力', unit: '20g', calories: 107 },
  { name: '坚果', unit: '30g', calories: 180 },
  { name: '饼干', unit: '100g', calories: 502 },
  { name: '蛋糕', unit: '100g', calories: 350 },
  { name: '冰淇淋', unit: '100g', calories: 207 },
  { name: '薯片', unit: '30g', calories: 160 },
  { name: '爆米花', unit: '100g', calories: 387 },
  { name: '糖果', unit: '10g', calories: 40 },
  { name: '花生米', unit: '30g', calories: 170 },
  { name: '瓜子', unit: '30g', calories: 180 },
  { name: '汉堡', unit: '1个', calories: 450 },
  { name: '披萨', unit: '1片', calories: 285 },
  { name: '炸鸡', unit: '100g', calories: 290 },
  { name: '薯条', unit: '100g', calories: 312 },
  { name: '寿司', unit: '1个', calories: 45 },
  { name: '沙拉', unit: '1份', calories: 120 },
  { name: '关东煮', unit: '1份', calories: 200 },
  { name: '麻辣烫', unit: '1份', calories: 400 },
  { name: '火锅', unit: '1份', calories: 600 },
  { name: '烧烤', unit: '1份', calories: 500 }
];

const DEFAULT_WORKOUT_VIDEOS = [
  { id: 'wv-1', title: '韩小四 12 分钟瘦腿', url: 'https://search.bilibili.com/all?keyword=%E9%9F%A9%E5%B0%8F%E5%9B%9B12%E5%88%86%E9%92%9F%E7%98%A6%E8%85%BF' },
  { id: 'wv-2', title: '欧阳春晓 直角肩少女背', url: 'https://search.bilibili.com/all?keyword=%E6%AC%A7%E9%98%B3%E6%98%A5%E6%99%93%E7%9B%B4%E8%A7%92%E8%82%A9%E5%B0%91%E5%A5%B3%E8%83%8C' },
  { id: 'wv-3', title: '欧阳春晓 足弓训练', url: 'https://search.bilibili.com/all?keyword=%E6%AC%A7%E9%98%B3%E6%98%A5%E6%99%93%E8%B6%B3%E5%BC%93%E8%AE%AD%E7%BB%83' }
];

const EXERCISE_METS = {
  '热身': 2.5,
  '健身视频': 4.0,
  '爬楼梯': 8.0,
  '跑步': 9.0,
  '快走': 4.5,
  '跳绳': 10.0,
  '瑜伽': 3.0,
  '游泳': 7.0,
  '骑车': 7.5,
  '力量训练': 5.0,
  '跳舞': 6.0,
  '其他运动': 4.0
};

// TASK2：一次性清空旧的示例记账数据（仅执行一次）
function clearLegacyMoneyData() {
  try {
    if (localStorage.getItem('xenos-money-reset-v1') === null) {
      localStorage.setItem('xenos-money', JSON.stringify({ total: 0, income: 0, expense: 0 }));
      localStorage.setItem('xenos-budget', '0');
      localStorage.setItem('xenos-transactions', '[]');
      localStorage.removeItem('xenos-budget-settled');
      localStorage.setItem('xenos-money-reset-v1', '1');
    }
  } catch (e) {}
}
clearLegacyMoneyData();

const state = {
  groups: loadGroups(),
  activeItem: '工作台首页',
  navStack: [],
  plans: loadPlans(),
  editingPlanId: null,
  sidebarOpen: false,
  settings: loadSettings(),
  checkins: loadCheckins(),
  body: loadBody(),
  measurements: loadMeasurements(),
  foodLibrary: loadFoodLibrary(),
  dietLogs: loadDietLogs(),
  exerciseLogs: loadExerciseLogs(),
  workoutVideos: loadWorkoutVideos(),
  dietView: 'overview',
  memos: loadMemos(),
  money: loadMoney(),
  budget: loadBudget(),
  monthBudget: loadMonthBudget(),
  transactions: loadTransactions(),
  points: loadPoints(),
  expenseCategories: loadExpenseCategories(),
  incomeCategories: loadIncomeCategories(),
  planGroups: loadPlanGroups(),
  budgetSettled: loadBudgetSettled(),
  moneyView: 'overview',
  selectedDate: null,
  moneyMonth: null,
  moneySubView: 'ledger', // 金钱领域子视图：ledger 记账 / budget 预算 / save 存钱 / invest 理财
  assetAccounts: loadAssetAccounts(),
  // ---- 新模块 ----
  profile: loadProfile(),
  dailyReviews: loadDailyReviews(),
  voiceReviews: loadVoiceReviews(),
  rewards: loadRewards(),
  achievements: loadAchievements(),
  contentItems: loadContentItems(),
  focusSessions: loadFocusSessions(),
  domains: loadDomains(),
  planHistory: loadPlanHistory(),
  dailySnapshot: loadDailySnapshot(),
  domainHistory: loadDomainHistory(),
  quote: loadQuote(),
  // ---- 成长提升模块 ----
  books: loadBooks(),
  historyNotes: loadHistoryNotes(),
  language: loadLanguage(),
  englishCheckin: loadEnglishCheckin(),
  videoEdit: loadVideoEdit(),
  modeling: loadModeling(),
  reviewDate: null,
  contentTab: 'hot',
  contentStyle: '',
  looksStyle: '',
  viewDate: '',
  domainTagFilter: {},
  looksType: '',
  contentFilter: '全部',
  contentSearch: '',
  focus: { total: 25 * 60, remaining: 25 * 60, running: false, timer: null, preset: 25 },
  clockTimer: null,
  recording: false,
  investNote: localStorage.getItem('xenos-invest-note') || ''
};

const touchState = {
  timer: null,
  target: null,
  startX: 0,
  startY: 0,
  dragging: false,
  dragType: null,
  dragEl: null,
  ghost: null,
  placeholder: null,
  container: null,
  list: [],
  dragId: null,
  groupId: null
};

function resetProgressData() {
  // 清空积分
  state.points = 0;
  savePoints();
  // 清空领域日志与任务完成状态
  Object.keys(state.domains).forEach(key => {
    const d = state.domains[key];
    d.log = {};
    if (Array.isArray(d.tasks)) d.tasks.forEach(t => { t.done = false; t.doneDate = ''; });
  });
  saveDomains();
  // 清空专注记录
  state.focusSessions = [];
  saveFocusSessions();
  // 清空语言学习进度
  state.language = JSON.parse(JSON.stringify(DEFAULT_LANGUAGE));
  saveLanguage();
  // 清空英语打卡记录
  state.englishCheckin = JSON.parse(JSON.stringify(DEFAULT_ENGLISH_CHECKIN));
  saveEnglishCheckin();
  // 清空计划完成状态
  state.plans.forEach(p => { p.done = false; p.doneDate = ''; });
  savePlans();
  state.planHistory = {};
  savePlanHistory();
  // 清空打卡、运动/饮食记录、成就
  state.checkins = {};
  saveCheckins();
  state.exerciseLogs = {};
  saveExerciseLogs();
  state.dietLogs = {};
  saveDietLogs();
  state.achievements = {};
  saveAchievements();
  state.dailyReviews = {};
  saveDailyReviews();
  state.dailySnapshot = {};
  saveDailySnapshot();
}

function resetRewardsDefaults() {
  // v9067：奖励池大改版，保留兑换记录，重置奖励列表为新预设
  const redeemed = (state.rewards && Array.isArray(state.rewards.redeemed)) ? state.rewards.redeemed : [];
  state.rewards = {
    items: JSON.parse(JSON.stringify(DEFAULT_REWARDS)),
    redeemed
  };
  saveRewards();
}

// Persistence
// v4：改版为「人生系统」菜单结构，旧的分组数据会被新的默认菜单替换
// v5：新增「成长提升」分组（书籍/历史/外语/视频剪辑/3D建模），旧菜单会被新默认菜单替换
// v6：人生领域菜单清理——移除「爱情」「朋友」，将「金钱」改名为「记账」并纳入概览
// v7：将「记账」从侧边栏人生领域分组移除，仅作为概览页领域卡片 + 移动端底部标签存在（真正「挪到概览里面」）
// v8：领域任务与计划默认数据调整
// v9：本批次——新增「记账」概览项与记账领域；健康/外貌/记账领域任务与新计划组（健康计划）对齐；清理旧任务文本；测量记录清空
const SCHEMA_VERSION = 9;

// 通用 JSON 读写
function loadJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return typeof fallback === 'function' ? fallback() : fallback;
    const parsed = JSON.parse(raw);
    if (parsed === null || parsed === undefined) return typeof fallback === 'function' ? fallback() : fallback;
    return parsed;
  } catch (e) {
    return typeof fallback === 'function' ? fallback() : fallback;
  }
}

function saveJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {}
}

function loadProfile() {
  const p = loadJSON('xenos-profile', null);
  if (!p) return JSON.parse(JSON.stringify(DEFAULT_PROFILE));
  return { ...DEFAULT_PROFILE, ...p, swot: { ...DEFAULT_PROFILE.swot, ...(p.swot || {}) } };
}
function saveProfile() { saveJSON('xenos-profile', state.profile); }

function loadDailyReviews() { return loadJSON('xenos-daily-reviews', {}); }
function saveDailyReviews() { saveJSON('xenos-daily-reviews', state.dailyReviews); }

function loadVoiceReviews() { return loadJSON('xenos-voice-reviews', []); }
function saveVoiceReviews() { saveJSON('xenos-voice-reviews', state.voiceReviews); }

function loadRewards() {
  const r = loadJSON('xenos-rewards', null);
  if (!r || !Array.isArray(r.items)) {
    return { items: JSON.parse(JSON.stringify(DEFAULT_REWARDS)), redeemed: [] };
  }
  return { items: r.items, redeemed: Array.isArray(r.redeemed) ? r.redeemed : [] };
}
function saveRewards() { saveJSON('xenos-rewards', state.rewards); }

function loadAchievements() { return loadJSON('xenos-achievements', {}); }
function saveAchievements() { saveJSON('xenos-achievements', state.achievements); }

function loadContentItems() {
  const items = loadJSON('xenos-content-items', null);
  if (!Array.isArray(items)) return JSON.parse(JSON.stringify(DEFAULT_CONTENT_ITEMS));
  return items;
}
function saveContentItems() { saveJSON('xenos-content-items', state.contentItems); }

function loadFocusSessions() { return loadJSON('xenos-focus-sessions', []); }
function saveFocusSessions() { saveJSON('xenos-focus-sessions', state.focusSessions); }

// 领域数据：{ health: { tasks:[{id,text,points,done,doneDate}], log:{ '2026-07-31': 20 } } }
function loadDomains() {
  const saved = loadJSON('xenos-domains', {});
  const result = {};
  Object.keys(DOMAIN_CONFIG).forEach(name => {
    const cfg = DOMAIN_CONFIG[name];
    const prev = saved[cfg.key] || {};
    result[cfg.key] = {
      tasks: Array.isArray(prev.tasks) && prev.tasks.length
        ? prev.tasks
        : cfg.tasks.map((t, i) => ({ id: `${cfg.key}-t${i}`, text: t.text, points: t.points, done: false, doneDate: '' })),
      log: prev.log && typeof prev.log === 'object' ? prev.log : {}
    };
  });
  return result;
}
function saveDomains() { saveJSON('xenos-domains', state.domains); }

function loadPlanHistory() { return loadJSON('xenos-plan-history', {}); }
function savePlanHistory() { saveJSON('xenos-plan-history', state.planHistory || {}); }

function loadDomainHistory() { return loadJSON('xenos-domain-history', {}); }
function saveDomainHistory() { saveJSON('xenos-domain-history', state.domainHistory || {}); }

function loadQuote() {
  const q = loadJSON('xenos-quote', null);
  const today = dateStr(new Date());
  if (q && q.date === today && q.text) return q;
  const pick = QUOTES[Math.floor(Math.random() * QUOTES.length)];
  const fresh = { date: today, text: pick.text, author: pick.author };
  saveJSON('xenos-quote', fresh);
  return fresh;
}

function migrateData() {
  // 1. 领域任务：重命名旧文本 + 记账积分统一为2 + 补全默认 + 清理失效
  const taskRename = {
    '23 点前睡觉': '12点前睡觉',
    '23点前睡觉': '12点前睡觉',
    '11点前睡觉': '12点前睡觉',
    '11点睡觉': '12点前睡觉',
    '三餐规律记录': '饮食记录'
  };
  Object.keys(state.domains).forEach(key => {
    const cfg = Object.values(DOMAIN_CONFIG).find(c => c.key === key);
    if (!cfg) { delete state.domains[key]; return; }
    const d = state.domains[key];
    if (!Array.isArray(d.tasks)) d.tasks = [];
    d.tasks.forEach(t => {
      if (taskRename[t.text]) t.text = taskRename[t.text];
      if (cfg.key === 'money' && (t.text === '不超日预算' || t.text === '记录今日所有支出')) t.points = 2;
    });
    cfg.tasks.forEach(def => {
      if (!d.tasks.find(t => t.text === def.text)) {
        d.tasks.push({ id: uid(key + '-t'), text: def.text, points: def.points, done: false, doneDate: '' });
      }
    });
    const valid = cfg.tasks.map(t => t.text);
    d.tasks = d.tasks.filter(t => valid.includes(t.text));
  });
  saveDomains();

  // 2. 计划：重命名 / 删除旧项；跨日继承以「快照」为准，不再自动回退 DEFAULT_PLANS（允许自由增删，含默认系统任务）
  const planRemove = ['运动 30 分钟', '英语30分钟'];
  const planRename = { '喝水1L': '喝水 1500ml', '喝水 1L': '喝水 1500ml' };
  state.plans = state.plans.filter(p => !planRemove.includes(p.text));
  state.plans.forEach(p => { if (planRename[p.text]) p.text = planRename[p.text]; });
  if (state.dailySnapshot && Array.isArray(state.dailySnapshot.plans) && state.dailySnapshot.plans.length) {
    // 以快照为模板重建：保留现存项（含完成状态）、补齐快照新增项、移除快照外的项
    const snap = state.dailySnapshot.plans;
    const kept = [];
    snap.forEach(s => {
      let cur = state.plans.find(p => p.text === s.text && (p.group || '日常') === (s.group || '日常'));
      if (!cur) {
        cur = { id: uid('p'), text: s.text, group: s.group || '日常', points: typeof s.points === 'number' ? s.points : 2, done: false };
      } else {
        cur.points = typeof s.points === 'number' ? s.points : (cur.points || 2);
      }
      kept.push(cur);
    });
    state.plans = kept;
  } else if (state.plans.length === 0) {
    // 首次使用（无快照）：回退 DEFAULT_PLANS
    DEFAULT_PLANS.forEach(def => {
      state.plans.push({ id: uid('p'), text: def.text, group: def.group, points: def.points, done: false });
    });
  }
  if (state.planGroups) {
    state.planGroups = state.planGroups.filter(g => DEFAULT_PLAN_GROUPS.includes(g));
    DEFAULT_PLAN_GROUPS.forEach(g => { if (!state.planGroups.includes(g)) state.planGroups.push(g); });
  }
  savePlans();
}

function resetPlansForNewDay() {
  const today = getTodayKey();
  const lastReset = localStorage.getItem('xenos-plans-reset');
  if (lastReset === today) {
    // 同日加载：刷新今日快照（反映用户当天新增/删除）
    snapshotTodayPlans();
    return;
  }
  // 新的一天：先保存昨日计划历史（含完成状态）
  if (!state.planHistory) state.planHistory = {};
  const yesterday = shiftDate(today, -1);
  state.planHistory[yesterday] = state.plans.map(p => ({ id: p.id, text: p.text, group: p.group, done: p.done, points: p.points }));
  savePlanHistory();

  // 以「前一天快照」为模板生成新一天计划（携带用户增删后的计划），否则回退 DEFAULT_PLANS
  const template = (state.dailySnapshot && Array.isArray(state.dailySnapshot.plans) && state.dailySnapshot.plans.length)
    ? state.dailySnapshot.plans
    : DEFAULT_PLANS.map(d => ({ text: d.text, group: d.group, points: d.points }));
  state.plans = template.map(s => ({
    id: uid('p'),
    text: s.text,
    group: s.group || '日常',
    points: typeof s.points === 'number' ? s.points : 5,
    done: false
  }));
  savePlans();

  // 记录今日快照
  snapshotTodayPlans();

  // 快照昨日领域任务完成情况
  const yesterdayDomain = {};
  Object.keys(DOMAIN_CONFIG).forEach(name => {
    const cfg = DOMAIN_CONFIG[name];
    const d = state.domains[cfg.key];
    if (d) yesterdayDomain[cfg.key] = { tasks: d.tasks.map(t => ({ id: t.id, text: t.text, points: t.points, done: t.done })), log: { ...(d.log || {}) } };
  });
  state.domainHistory[yesterday] = yesterdayDomain;
  saveDomainHistory();
  // 重置领域任务勾选
  Object.values(state.domains).forEach(d => {
    d.tasks.forEach(t => { t.done = false; t.doneDate = ''; });
  });
  saveDomains();
  localStorage.setItem('xenos-plans-reset', today);
}

// ---------- 成长提升模块：数据持久化 ----------
function loadBooks() { return loadJSON('xenos-books', []); }
function saveBooks() { saveJSON('xenos-books', state.books); }

function loadHistoryNotes() { return loadJSON('xenos-history', []); }
function saveHistoryNotes() { saveJSON('xenos-history', state.historyNotes); }

function loadLanguage() {
  const l = loadJSON('xenos-language', null);
  const base = JSON.parse(JSON.stringify(DEFAULT_LANGUAGE));
  if (!l || typeof l !== 'object') return base;
  // v9143：外语学习页已移除，学习进度统一归零（一次性迁移）
  if (!l.reset9143) {
    l.learned = {};
    l.todayCount = 0;
    l.listenTotal = 0;
    l.awarded = {};
    l.stats = JSON.parse(JSON.stringify(DEFAULT_LANGUAGE.stats));
    l.reset9143 = true;
  }
  return {
    ...base,
    ...l,
    learned: l.learned && typeof l.learned === 'object' ? l.learned : {},
    phoneticsDone: Array.isArray(l.phoneticsDone) ? l.phoneticsDone : [],
    awarded: l.awarded && typeof l.awarded === 'object' ? l.awarded : {},
    points: typeof l.points === 'number' ? l.points : 0,
    stats: l.stats && typeof l.stats === 'object' ? { ...DEFAULT_LANGUAGE.stats, ...l.stats } : JSON.parse(JSON.stringify(DEFAULT_LANGUAGE.stats))
  };
}
function saveLanguage() { saveJSON('xenos-language', state.language); }
function getLanguagePoints() { return (state.language && state.language.points) || 0; }

function loadEnglishCheckin() {
  const raw = loadJSON('xenos-english-checkin', null);
  const base = JSON.parse(JSON.stringify(DEFAULT_ENGLISH_CHECKIN));
  if (!raw || typeof raw !== 'object') return base;
  return { ...base, ...raw, history: raw.history && typeof raw.history === 'object' ? raw.history : {} };
}
function saveEnglishCheckin() { saveJSON('xenos-english-checkin', state.englishCheckin); }

function getEnglishToday() {
  const today = getTodayKey();
  if (!state.englishCheckin.history[today]) {
    state.englishCheckin.history[today] = {
      mode: state.englishCheckin.dailyMode || 'standard',
      restDay: false,
      tasks: {},
      weekly: {},
      note: ''
    };
    ENGLISH_DAILY_TASKS.forEach(t => { state.englishCheckin.history[today].tasks[t.key] = { done: false, note: '' }; });
    ENGLISH_WEEKLY_TASKS.forEach(t => { state.englishCheckin.history[today].weekly[t.key] = { done: false, note: '' }; });
  }
  return state.englishCheckin.history[today];
}

function getEnglishWeekKey(d) {
  const dt = d ? parseDateKey(d) : new Date();
  const oneJan = new Date(dt.getFullYear(), 0, 1);
  const dayOfYear = Math.floor((dt - oneJan) / 86400000) + 1;
  const week = Math.ceil(dayOfYear / 7);
  return `${dt.getFullYear()}-W${week}`;
}

function getEnglishWeeklyState() {
  const weekKey = getEnglishWeekKey();
  const entries = Object.entries(state.englishCheckin.history || {})
    .filter(([k]) => getEnglishWeekKey(k) === weekKey);
  const tasks = {};
  ENGLISH_WEEKLY_TASKS.forEach(t => { tasks[t.key] = { done: false, note: '' }; });
  for (const [, day] of entries) {
    ENGLISH_WEEKLY_TASKS.forEach(t => {
      const w = (day.weekly || {})[t.key];
      if (w && w.done) tasks[t.key] = { done: true, note: w.note || '' };
    });
  }
  return tasks;
}

function setEnglishWeeklyDone(taskKey, done, note) {
  const today = getTodayKey();
  const day = getEnglishToday();
  if (!day.weekly) day.weekly = {};
  if (!day.weekly[taskKey]) day.weekly[taskKey] = { done: false, note: '' };
  const prev = day.weekly[taskKey].done;
  day.weekly[taskKey].done = done;
  if (note !== undefined) day.weekly[taskKey].note = note;
  const task = ENGLISH_WEEKLY_TASKS.find(t => t.key === taskKey);
  if (task) state.englishCheckin.totalPoints = (state.englishCheckin.totalPoints || 0) + (done ? 1 : -1) * task.points * (prev === done ? 0 : 1);
  saveEnglishCheckin();
}

function toggleEnglishTask(type, taskKey) {
  const today = getTodayKey();
  const day = getEnglishToday();
  const pool = type === 'weekly' ? day.weekly : day.tasks;
  if (!pool[taskKey]) pool[taskKey] = { done: false, note: '' };
  pool[taskKey].done = !pool[taskKey].done;
  const task = type === 'weekly'
    ? ENGLISH_WEEKLY_TASKS.find(t => t.key === taskKey)
    : ENGLISH_DAILY_TASKS.find(t => t.key === taskKey);
  if (task) {
    state.englishCheckin.totalPoints = (state.englishCheckin.totalPoints || 0) + (pool[taskKey].done ? task.points : -task.points);
  }
  saveEnglishCheckin();
}

function setEnglishTaskNote(type, taskKey, note) {
  const day = getEnglishToday();
  const pool = type === 'weekly' ? day.weekly : day.tasks;
  if (!pool[taskKey]) pool[taskKey] = { done: false, note: '' };
  pool[taskKey].note = note;
  saveEnglishCheckin();
}

function setEnglishDailyMode(mode) {
  state.englishCheckin.dailyMode = mode;
  const day = getEnglishToday();
  day.mode = mode;
  saveEnglishCheckin();
}

function setEnglishRestDay(restDay) {
  const day = getEnglishToday();
  day.restDay = restDay;
  saveEnglishCheckin();
}

function getEnglishRestDaysLeft() {
  const weekKey = getEnglishWeekKey();
  const today = getTodayKey();
  let used = 0;
  Object.entries(state.englishCheckin.history || {}).forEach(([k, d]) => {
    if (getEnglishWeekKey(k) === weekKey && d.restDay) used++;
  });
  return Math.max(0, 1 - used);
}

function calcEnglishStreak() {
  const h = state.englishCheckin.history || {};
  let streak = 0;
  const d = new Date();
  while (true) {
    const k = dateStr(d);
    const day = h[k];
    if (!day) break;
    if (day.restDay) { streak++; d.setDate(d.getDate() - 1); continue; }
    const allDone = ENGLISH_DAILY_TASKS.every(t => (day.tasks || {})[t.key] && (day.tasks || {})[t.key].done);
    if (allDone) { streak++; d.setDate(d.getDate() - 1); }
    else break;
  }
  return streak;
}

function getEnglishStageProgress() {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  return ENGLISH_STAGES.map(s => {
    const start = new Date(year, s.startMonth - 1, 1);
    const end = new Date(year, s.endMonth, 0, 23, 59, 59);
    const total = (end - start) + 1;
    let pct = 0, active = false, past = false;
    if (month < s.startMonth) pct = 0;
    else if (month > s.endMonth) { pct = 100; past = true; }
    else {
      active = true;
      const elapsed = Math.max(0, now - start) + 1;
      pct = Math.min(100, Math.round(elapsed / total * 100));
    }
    return { ...s, pct, active, past };
  });
}

function getEnglishDailyDone() {
  const day = getEnglishToday();
  if (day.restDay) return { exempt: true, done: !!(day.tasks || {}).words && (day.tasks || {}).words.done, total: ENGLISH_DAILY_TASKS.length };
  let done = 0;
  ENGLISH_DAILY_TASKS.forEach(t => { if ((day.tasks || {})[t.key] && (day.tasks || {})[t.key].done) done++; });
  return { done, total: ENGLISH_DAILY_TASKS.length };
}

function loadVideoEdit() {
  const v = loadJSON('xenos-video-edit', null);
  if (!v || typeof v !== 'object') return { projects: [], notes: [] };
  return { projects: Array.isArray(v.projects) ? v.projects : [], notes: Array.isArray(v.notes) ? v.notes : [] };
}
function saveVideoEdit() { saveJSON('xenos-video-edit', state.videoEdit); }

function loadModeling() {
  const m = loadJSON('xenos-3d', null);
  if (!m || typeof m !== 'object') return { works: [], notes: [] };
  return { works: Array.isArray(m.works) ? m.works : [], notes: Array.isArray(m.notes) ? m.notes : [] };
}
function saveModeling() { saveJSON('xenos-3d', state.modeling); }

function loadGroups() {
  try {
    const raw = localStorage.getItem('xenos-groups');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.version === SCHEMA_VERSION && Array.isArray(parsed.data)) {
        return parsed.data;
      }
    }
  } catch (e) {}
  return DEFAULT_GROUPS;
}

function saveGroups() {
  localStorage.setItem('xenos-groups', JSON.stringify({ version: SCHEMA_VERSION, data: state.groups }));
}

// Check-ins (consecutive streak)
function dateStr(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function loadCheckins() {
  try {
    const raw = localStorage.getItem('xenos-checkins');
    const data = raw ? JSON.parse(raw) : {};
    return data && typeof data === 'object' ? data : {};
  } catch (e) {
    return {};
  }
}

function saveCheckins() {
  localStorage.setItem('xenos-checkins', JSON.stringify(state.checkins));
}

function loadBody() {
  try {
    const data = localStorage.getItem('xenos-body');
    if (!data) return DEFAULT_BODY;
    const parsed = JSON.parse(data);
    // 旧数据可能包含手动消耗/活动系数，现在改为自动计算
    delete parsed.activity;
    delete parsed.caloriesTarget;
    // 旧字段 leg 迁移为 thigh/calf
    if ('leg' in parsed && !('thigh' in parsed || 'calf' in parsed)) {
      parsed.thigh = parsed.leg;
      parsed.calf = parsed.leg;
      delete parsed.leg;
    }
    return { ...DEFAULT_BODY, ...parsed };
  } catch (e) {
    return DEFAULT_BODY;
  }
}

function saveBody() {
  localStorage.setItem('xenos-body', JSON.stringify(state.body));
}

function calcBMI(body) {
  const h = (body.height || 162) / 100;
  return h > 0 ? (body.weight / (h * h)).toFixed(1) : '0.0';
}

// Katch-McArdle 公式：只需要体重和体脂率，不依赖年龄/性别/活动系数输入
function calcBMR(body) {
  const bodyFat = body.bodyFat || 0;
  const leanBodyMass = body.weight * (1 - bodyFat / 100);
  return 370 + 21.6 * leanBodyMass;
}

function calcTDEE(body) {
  const bmr = calcBMR(body);
  // 默认日常活动系数 1.5（轻体力活动），不再让用户手动输入
  return Math.round(bmr * 1.5);
}

// 今日总消耗 = 基础日常消耗 + 今日运动消耗
function calcTodayTotalBurn(body) {
  return calcTDEE(body) + getTodayExerciseCalories();
}

function formatBodyValue(v, unit) {
  if (typeof v !== 'number' || isNaN(v)) return '-';
  return `${v.toFixed(2)}${unit ? ' ' + unit : ''}`;
}

function getTodayExerciseCalories() {
  const key = getTodayKey();
  const ex = state.exerciseLogs[key] || [];
  const customBurn = ex.reduce((s, e) => s + (e.calories || 0), 0);
  const planBurn = state.plans
    .filter(p => p.group === '运动计划' && p.done)
    .reduce((s, p) => s + estimateExerciseCalories(p.text, parsePlanDuration(p.text)), 0);
  return customBurn + planBurn;
}

function loadMeasurements() {
  try {
    const data = localStorage.getItem('xenos-measurements');
    return data ? JSON.parse(data) : DEFAULT_MEASUREMENTS;
  } catch (e) {
    return DEFAULT_MEASUREMENTS;
  }
}

function saveMeasurements() {
  localStorage.setItem('xenos-measurements', JSON.stringify(state.measurements));
}

function getNextMeasureDays() {
  if (!state.measurements.length) return 7;
  const last = state.measurements[state.measurements.length - 1].date;
  const [y, m, d] = last.split('-').map(Number);
  const lastDate = new Date(y, m - 1, d);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const next = new Date(lastDate);
  next.setDate(next.getDate() + 7);
  return Math.max(0, Math.ceil((next - today) / 86400000));
}

function updateMeasureHeader() {
  const card = document.querySelector('.fitness-card');
  if (!card) return;
  const countMeta = card.querySelector('.measure-count-meta');
  if (countMeta) countMeta.textContent = `${state.measurements.length} 条`;
  const clearBtn = card.querySelector('#measure-clear');
  if (clearBtn && !state.measurements.length) clearBtn.remove();
}

function loadFoodLibrary() {
  try {
    const data = localStorage.getItem('xenos-food-library');
    const stored = data ? JSON.parse(data) : [];
    const map = new Map(DEFAULT_FOOD_LIBRARY.map(f => [f.name, f]));
    // 保留用户自定义/修改的食物
    stored.forEach(f => { if (f && f.name) map.set(f.name, f); });
    return Array.from(map.values());
  } catch (e) {
    return DEFAULT_FOOD_LIBRARY;
  }
}

function saveFoodLibrary() {
  localStorage.setItem('xenos-food-library', JSON.stringify(state.foodLibrary));
}

function loadDietLogs() {
  try {
    const data = localStorage.getItem('xenos-diet-logs');
    return data ? JSON.parse(data) : {};
  } catch (e) {
    return {};
  }
}

function saveDietLogs() {
  localStorage.setItem('xenos-diet-logs', JSON.stringify(state.dietLogs));
}

function loadExerciseLogs() {
  try {
    const data = localStorage.getItem('xenos-exercise-logs');
    return data ? JSON.parse(data) : {};
  } catch (e) {
    return {};
  }
}

function saveExerciseLogs() {
  localStorage.setItem('xenos-exercise-logs', JSON.stringify(state.exerciseLogs));
}

function loadMemos() {
  try {
    const raw = localStorage.getItem('xenos-memos');
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function saveMemos() {
  localStorage.setItem('xenos-memos', JSON.stringify(state.memos));
}

function loadWorkoutVideos() {
  try {
    const data = localStorage.getItem('xenos-workout-videos');
    const stored = data ? JSON.parse(data) : [];
    const map = new Map(DEFAULT_WORKOUT_VIDEOS.map(v => [v.id, v]));
    // 用户自定义的视频保留；默认视频用最新链接覆盖（修复失效链接）
    stored.forEach(v => { if (v && v.id) map.set(v.id, v); });
    return Array.from(map.values());
  } catch (e) {
    return DEFAULT_WORKOUT_VIDEOS;
  }
}

function saveWorkoutVideos() {
  localStorage.setItem('xenos-workout-videos', JSON.stringify(state.workoutVideos));
}

// Today counts as checked-in only when every daily plan is done
function updateTodayCheckin() {
  const today = dateStr(new Date());
  if (state.plans.length > 0 && state.plans.every(p => p.done)) {
    state.checkins[today] = true;
  } else {
    delete state.checkins[today];
  }
  saveCheckins();
  renderStreak();
}

// Consecutive check-in days (counts today if done)
function calcStreak() {
  let streak = 0;
  const d = new Date();
  if (state.checkins[dateStr(d)]) {
    streak = 1;
    d.setDate(d.getDate() - 1);
  }
  while (state.checkins[dateStr(d)]) {
    streak++;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}

function renderStreak() {
  const el = document.getElementById('user-meta');
  if (!el) return;
  const streak = calcStreak();
  const todayStr = dateStr(new Date());
  if (streak === 0) {
    el.textContent = state.plans.length === 0 ? '还没有打卡记录' : '今日待打卡';
  } else {
    el.textContent = `已连续打卡 ${streak} 天` + (state.checkins[todayStr] ? '' : ' · 今日待打卡');
  }
}

function loadPlans() {
  try {
    const data = localStorage.getItem('xenos-plans');
    if (data) {
      const arr = JSON.parse(data);
      return arr.map((p, idx) => ({
        id: p.id || 'p-' + Date.now() + '-' + idx,
        text: p.text || (typeof p === 'string' ? p : ''),
        done: !!p.done,
        group: p.group || '日常',
        points: typeof p.points === 'number' ? p.points : 5
      }));
    }
  } catch (e) {}
  return DEFAULT_PLANS.map((p, idx) => ({
    id: 'p-' + Date.now() + '-' + idx,
    text: p.text,
    done: false,
    group: p.group,
    points: p.points
  }));
}

function savePlans() {
  localStorage.setItem('xenos-plans', JSON.stringify(state.plans));
}

// ====== 跨日继承：计划快照 ======
function loadDailySnapshot() {
  try {
    const raw = localStorage.getItem('xenos-plan-snapshot');
    if (raw) {
      const o = JSON.parse(raw);
      if (o && typeof o.date === 'string' && Array.isArray(o.plans)) return o;
    }
  } catch (e) {}
  return null;
}
function saveDailySnapshot() {
  if (state.dailySnapshot) {
    try { localStorage.setItem('xenos-plan-snapshot', JSON.stringify(state.dailySnapshot)); } catch (e) {}
  }
}
// 记录「当日最终计划模板」（含用户新增/删除后的计划，不含完成状态）
function snapshotTodayPlans() {
  state.dailySnapshot = {
    date: getTodayKey(),
    plans: state.plans.map(p => ({
      id: p.id,
      text: p.text,
      group: p.group || '日常',
      points: typeof p.points === 'number' ? p.points : 5
    }))
  };
  saveDailySnapshot();
}
// 统一删除计划（按 id），并刷新快照
function deletePlanById(id) {
  state.plans = state.plans.filter(p => p.id !== id);
  savePlans();
  snapshotTodayPlans();
}

function loadMoney() {
  try {
    const data = localStorage.getItem('xenos-money');
    if (data) return { ...DEFAULT_MONEY, ...JSON.parse(data) };
  } catch (e) {}
  return DEFAULT_MONEY;
}

function saveMoney() {
  localStorage.setItem('xenos-money', JSON.stringify(state.money));
}

function loadBudget() {
  try {
    const data = localStorage.getItem('xenos-budget');
    if (data) return parseInt(data) || DEFAULT_BUDGET;
  } catch (e) {}
  return DEFAULT_BUDGET;
}

function saveBudget() {
  localStorage.setItem('xenos-budget', String(state.budget));
}

function loadMonthBudget() {
  try {
    const data = localStorage.getItem('xenos-month-budget');
    if (data) return parseInt(data) || 0;
  } catch (e) {}
  return 0;
}

function saveMonthBudget() {
  localStorage.setItem('xenos-month-budget', String(state.monthBudget || 0));
}

function loadAssetAccounts() {
  try {
    const data = localStorage.getItem('xenos-asset-accounts');
    if (data) {
      const parsed = JSON.parse(data);
      const map = new Map(parsed.map(a => [a.id, a]));
      return DEFAULT_ASSET_ACCOUNTS.map(def => ({ ...def, ...(map.get(def.id) || {}) }));
    }
  } catch (e) {}
  return DEFAULT_ASSET_ACCOUNTS;
}

function saveAssetAccounts() {
  localStorage.setItem('xenos-asset-accounts', JSON.stringify(state.assetAccounts));
}

function calcAssetTotal() {
  return (state.assetAccounts || []).reduce((s, a) => s + (a.debt ? -1 : 1) * (Number(a.amount) || 0), 0);
}

function formatMoney(n) {
  return (Math.round((Number(n) || 0) * 100) / 100).toFixed(2);
}

function loadTransactions() {
  try {
    const data = localStorage.getItem('xenos-transactions');
    if (data) return JSON.parse(data);
  } catch (e) {}
  return DEFAULT_TRANSACTIONS;
}

function saveTransactions() {
  localStorage.setItem('xenos-transactions', JSON.stringify(state.transactions));
}

function loadPoints() {
  try {
    const data = localStorage.getItem('xenos-points');
    if (data) return parseInt(data) || 0;
  } catch (e) {}
  return 0;
}

function savePoints() {
  localStorage.setItem('xenos-points', String(state.points));
}

function loadExpenseCategories() {
  try {
    const data = localStorage.getItem('xenos-expense-categories');
    if (data) return JSON.parse(data);
  } catch (e) {}
  return DEFAULT_EXPENSE_CATEGORIES;
}

function saveExpenseCategories() {
  localStorage.setItem('xenos-expense-categories', JSON.stringify(state.expenseCategories));
}

function loadIncomeCategories() {
  try {
    const data = localStorage.getItem('xenos-income-categories');
    if (data) return JSON.parse(data);
  } catch (e) {}
  return DEFAULT_INCOME_CATEGORIES;
}

function saveIncomeCategories() {
  localStorage.setItem('xenos-income-categories', JSON.stringify(state.incomeCategories));
}

function loadPlanGroups() {
  try {
    const data = localStorage.getItem('xenos-plan-groups');
    if (data) return JSON.parse(data);
  } catch (e) {}
  return DEFAULT_PLAN_GROUPS;
}

function savePlanGroups() {
  localStorage.setItem('xenos-plan-groups', JSON.stringify(state.planGroups));
}

function loadBudgetSettled() {
  try {
    const data = localStorage.getItem('xenos-budget-settled');
    if (data) return JSON.parse(data);
  } catch (e) {}
  return {};
}

function saveBudgetSettled() {
  localStorage.setItem('xenos-budget-settled', JSON.stringify(state.budgetSettled || {}));
}

function loadSettings() {
  try {
    const data = localStorage.getItem('xenos-settings');
    return data ? { ...DEFAULT_SETTINGS, ...JSON.parse(data) } : DEFAULT_SETTINGS;
  } catch (e) {
    return DEFAULT_SETTINGS;
  }
}

function saveSettings() {
  localStorage.setItem('xenos-settings', JSON.stringify(state.settings));
}

// Helpers
function uid(prefix = 'id') {
  return prefix + '-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);
}

// 轻提示：底部居中，短暂显示后淡出
let toastTimer = null;
function toast(msg) {
  let el = document.getElementById('app-toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'app-toast';
    el.className = 'app-toast';
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 1600);
}

function findItemByName(name) {
  for (const g of state.groups) {
    for (const i of g.items) {
      if (i.name === name) return i;
    }
  }
  return null;
}

function getVideoHost(url) {
  try {
    const host = new URL(url).hostname.replace(/^www\./, '').toLowerCase();
    if (host.includes('bilibili') || host.includes('b23.tv')) return 'B站';
    if (host.includes('youtube') || host.includes('youtu.be')) return 'YouTube';
    if (host.includes('xiaohongshu') || host.includes('xhslink')) return '小红书';
    if (host.includes('douyin') || host.includes('iesdouyin')) return '抖音';
    return host || '外部链接';
  } catch (e) {
    return '外部链接';
  }
}

function getVideoTitleFromUrl(url) {
  try {
    const u = new URL(url);
    const host = u.hostname;
    if (host.includes('bilibili')) {
      const bv = u.pathname.match(/\/video\/(BV[\w]+)/)?.[1];
      return bv ? `B站视频 ${bv}` : '';
    }
    if (host.includes('douyin') || host.includes('iesdouyin')) {
      const id = u.pathname.match(/\/video\/(\d+)/)?.[1] || u.searchParams.get('modal_id');
      return id ? `抖音视频 ${id}` : '';
    }
    return '';
  } catch (e) {
    return '';
  }
}

function isVideoUrlValid(url) {
  try {
    const u = new URL(url);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch (e) {
    return false;
  }
}

function extractDouyinVideoId(url) {
  try {
    const u = new URL(url);
    const host = u.hostname.toLowerCase();
    if (host.includes('douyin.com') || host.includes('iesdouyin.com')) {
      const m = u.pathname.match(/\/video\/(\d+)/);
      if (m) return m[1];
      const modal = u.searchParams.get('modal_id');
      if (modal) return modal;
    }
  } catch (e) {}
  return null;
}

function openVideo(url, title = '') {
  if (!url) return;
  const host = getVideoHost(url).toLowerCase();
  const douyinId = extractDouyinVideoId(url);

  if (host === '抖音' && douyinId) {
    // 优先尝试唤起抖音 App；同时用普通网页兜底
    const scheme = `snssdk1128://aweme/detail/${douyinId}`;
    const web = `https://www.douyin.com/video/${douyinId}`;
    const tryApp = () => {
      try { window.location.href = scheme; } catch (e) {}
    };
    // 移动设备尝试 App scheme，桌面直接打开网页
    if (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) {
      tryApp();
      setTimeout(() => { window.open(web, '_blank'); }, 400);
    } else {
      window.open(web, '_blank');
    }
    return;
  }

  if (host === '抖音' && !douyinId) {
    // 短链/口令：先尝试原链接，同时给出 App 唤起提示
    window.open(url, '_blank');
    return;
  }

  // B站/YouTube/小红书/其他：直接跳转
  window.open(url, '_blank');
}

function findItem(id) {
  for (const g of state.groups) {
    for (const i of g.items) {
      if (i.id === id) return i;
    }
  }
  return null;
}

// DOM refs
const sidebar = document.getElementById('sidebar');
const overlay = document.getElementById('overlay');
const menu = document.getElementById('menu');
const mobileTabs = document.getElementById('mobile-tabs');
const content = document.getElementById('content');
const menuToggle = document.getElementById('menu-toggle');
const modal = document.getElementById('modal');
const modalTitle = document.getElementById('modal-title');
const modalInput = document.getElementById('modal-input');
const modalConfirm = document.getElementById('modal-confirm');
const modalCancel = document.getElementById('modal-cancel');
const importFile = document.getElementById('import-file');
const avatarInput = document.getElementById('avatar-input');
const greetLine = document.getElementById('greet-line');
const greetDate = document.getElementById('greet-date');
const topbar = document.querySelector('.topbar');
const topbarChips = document.getElementById('topbar-chips');
const fab = document.getElementById('fab');
const fabTime = document.getElementById('fab-time');
const focusModal = document.getElementById('focus-modal');

let modalResolve = null;
let modalReject = null;

// Modal
function openModal(title, value = '', placeholder = '请输入名称') {
  modalTitle.textContent = title;
  modalInput.value = value;
  modalInput.placeholder = placeholder;
  modal.classList.add('active');
  modalInput.focus();
  return new Promise((resolve, reject) => {
    modalResolve = resolve;
    modalReject = reject;
  });
}

function closeModal() {
  modal.classList.remove('active');
  // 取消时以 null 结束，避免未处理的 Promise 拒绝
  if (modalResolve) modalResolve(null);
  modalResolve = null;
  modalReject = null;
}

modalConfirm.addEventListener('click', () => {
  if (modalResolve) modalResolve(modalInput.value.trim());
  closeModal();
});

modalCancel.addEventListener('click', closeModal);

modalInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') modalConfirm.click();
  if (e.key === 'Escape') modalCancel.click();
});

// Sidebar open/close
function openSidebar() {
  state.sidebarOpen = true;
  sidebar.classList.add('open');
  overlay.classList.add('active');
}

function closeSidebar() {
  state.sidebarOpen = false;
  sidebar.classList.remove('open');
  overlay.classList.remove('active');
}

menuToggle.addEventListener('click', openSidebar);
overlay.addEventListener('click', () => {
  clearActiveActions();
  closeSidebar();
});

// ---------- 侧边栏用户资料卡 / 顶栏 ----------
function isImageSource(v) {
  return typeof v === 'string' && (v.startsWith('data:') || v.includes('://'));
}

function renderProfileCard() {
  const avatar = document.getElementById('profile-avatar');
  const nameEl = document.getElementById('profile-name');
  const levelEl = document.getElementById('profile-level');
  const fill = document.getElementById('exp-fill');
  const text = document.getElementById('exp-text');
  if (!avatar) return;

  if (isImageSource(state.settings.userAvatar)) {
    avatar.innerHTML = `<img src="${state.settings.userAvatar}" alt="avatar">`;
  } else {
    avatar.innerHTML = `<span>${state.settings.userAvatar || '🐰'}</span>`;
  }
  nameEl.textContent = state.settings.userName;
  const lv = getLevelInfo();
  levelEl.textContent = 'Lv.' + lv.level;
  fill.style.width = Math.min(100, Math.round((lv.exp / lv.need) * 100)) + '%';
  text.textContent = `${lv.exp}/${lv.need}`;
}

// 兼容旧调用
function renderBrand() { renderProfileCard(); }
function renderUser() { renderProfileCard(); }

function getGreeting() {
  const h = new Date().getHours();
  if (h < 5) return '夜深了';
  if (h < 11) return '早上好';
  if (h < 13) return '中午好';
  if (h < 18) return '下午好';
  if (h < 22) return '晚上好';
  return '晚安';
}

function formatShortDate(d = new Date()) {
  const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  return `${d.getMonth() + 1}月${d.getDate()}日 ${weekdays[d.getDay()]}`;
}

function formatLongDate(d = new Date()) {
  const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日 ${weekdays[d.getDay()]}`;
}

function renderTopbar() {
  if (!greetLine) return;

  if (topbar) topbar.classList.remove('branches-topbar');
  greetLine.textContent = `${getGreeting()}，${state.settings.userName}`;
  greetLine.classList.remove('branches-page-title');
  if (greetDate) {
    greetDate.style.display = '';
    greetDate.textContent = formatShortDate();
  }

  const lv = getLevelInfo();
  const available = getAvailablePoints();
  topbarChips.innerHTML = `
    <button class="chip" data-chip="rewards">${icon('rewards', 14)} 奖励池</button>
    <button class="chip" data-chip="mood">心情：${state.settings.mood || '平静'}</button>
    <button class="chip chip-gold" data-chip="level">Lv.${lv.level} ${available}分</button>
    <span class="chip chip-green"><i class="chip-dot"></i>已同步</span>
  `;
  topbarChips.querySelectorAll('[data-chip]').forEach(btn => {
    btn.addEventListener('click', () => {
      const kind = btn.dataset.chip;
      if (kind === 'rewards') selectItem('奖励池');
      if (kind === 'level') selectItem('成就殿堂');
      if (kind === 'mood') cycleMood();
    });
  });
}

function cycleMood() {
  const names = MOOD_LIST.map(m => m.name);
  const idx = names.indexOf(state.settings.mood || '平静');
  state.settings.mood = names[(idx + 1) % names.length];
  saveSettings();
  renderTopbar();
}

function readFileAsDataURL(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.readAsDataURL(file);
  });
}

document.getElementById('profile-avatar').addEventListener('click', () => avatarInput.click());
avatarInput.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  state.settings.userAvatar = await readFileAsDataURL(file);
  saveSettings();
  saveProfile();
  renderProfileCard();
  renderTopbar();
  renderContent();
  avatarInput.value = '';
});

document.getElementById('profile-name').addEventListener('click', async (e) => {
  e.stopPropagation();
  try {
    const name = await openModal('修改名字', state.settings.userName);
    if (name) {
      state.settings.userName = name;
      state.profile.name = name;
      saveSettings();
      saveProfile();
      renderProfileCard();
      renderTopbar();
    }
  } catch (err) {}
});

// Long press to show actions
function setupLongPress(el, callback) {
  let timer = null;
  let startX = 0;
  let startY = 0;
  const threshold = 8;
  const duration = 500;

  const clear = () => {
    if (timer) clearTimeout(timer);
    timer = null;
  };

  const start = (e) => {
    const touch = e.touches ? e.touches[0] : e;
    startX = touch.clientX;
    startY = touch.clientY;
    timer = setTimeout(() => {
      timer = null;
      callback(e);
    }, duration);
  };

  const move = (e) => {
    if (!timer) return;
    const touch = e.touches ? e.touches[0] : e;
    if (Math.abs(touch.clientX - startX) > threshold || Math.abs(touch.clientY - startY) > threshold) {
      clear();
    }
  };

  el.addEventListener('touchstart', start, { passive: true });
  el.addEventListener('touchend', clear, { passive: true });
  el.addEventListener('touchcancel', clear, { passive: true });
  el.addEventListener('touchmove', move, { passive: true });

  el.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return;
    start(e);
    const up = () => { clear(); document.removeEventListener('mouseup', up); };
    document.addEventListener('mouseup', up);
  });
}

function clearActiveActions() {
  document.querySelectorAll('.menu-item.active-actions, .group-header.active-actions').forEach(x => x.classList.remove('active-actions'));
}

function showActions(el) {
  clearActiveActions();
  el.classList.add('active-actions');
}

// Drag and drop (desktop + touch)
function initDragHandlers() {
  // 左侧导航栏不再支持拖拽排序，仅保留点击选择
  // （长按仍然可以唤出编辑/删除按钮）
}

function handleTouchStart(e) {
  const el = e.target.closest('.menu-item') || e.target.closest('.group-header');
  if (!el || e.target.closest('.icon-action')) return;

  touchState.target = el;
  touchState.startX = e.touches[0].clientX;
  touchState.startY = e.touches[0].clientY;
  touchState.dragging = false;
  touchState.dragType = null;

  touchState.timer = setTimeout(() => {
    if (touchState.dragging) return;
    showActions(el);
  }, 500);
}

function handleTouchMove(e) {
  if (!touchState.target) return;
  const x = e.touches[0].clientX;
  const y = e.touches[0].clientY;
  const dx = x - touchState.startX;
  const dy = y - touchState.startY;

  if (!touchState.dragging && (Math.abs(dx) > 8 || Math.abs(dy) > 8)) {
    clearTimeout(touchState.timer);
  }

  // Raise threshold to 40px to avoid accidental drag while scrolling
  if (!touchState.dragging && Math.abs(dy) > 40) {
    startTouchDrag(e);
  }

  if (touchState.dragging) {
    e.preventDefault();
    moveGhost(e.touches[0].clientX, e.touches[0].clientY);
  }
}

function handleTouchEnd(e) {
  clearTimeout(touchState.timer);
  if (touchState.dragging) {
    endTouchDrag(e.changedTouches[0].clientX, e.changedTouches[0].clientY);
  }
  resetTouchState();
}

function resetTouchState() {
  if (touchState.ghost) touchState.ghost.remove();
  if (touchState.placeholder) touchState.placeholder.remove();
  touchState.ghost = null;
  touchState.placeholder = null;
  touchState.target = null;
  touchState.dragging = false;
  touchState.dragType = null;
  touchState.dragId = null;
  touchState.groupId = null;
}

function startTouchDrag(e) {
  // Clean up any leftover ghost from previous aborted drag
  if (touchState.ghost) touchState.ghost.remove();
  if (touchState.placeholder) touchState.placeholder.remove();
  touchState.dragging = true;
  const el = touchState.target;
  touchState.dragType = el.classList.contains('group-header') ? 'group' : 'item';
  touchState.dragId = el.closest('.menu-item') ? el.closest('.menu-item').dataset.id : el.closest('.menu-group').dataset.id;
  touchState.groupId = el.closest('.menu-group') ? el.closest('.menu-group').dataset.id : null;

  const rect = el.getBoundingClientRect();
  touchState.ghost = el.cloneNode(true);
  touchState.ghost.classList.add('dragging');
  touchState.ghost.style.position = 'fixed';
  touchState.ghost.style.left = rect.left + 'px';
  touchState.ghost.style.top = rect.top + 'px';
  touchState.ghost.style.width = rect.width + 'px';
  touchState.ghost.style.zIndex = '300';
  touchState.ghost.style.opacity = '0.9';
  touchState.ghost.style.pointerEvents = 'none';
  document.body.appendChild(touchState.ghost);

  touchState.placeholder = document.createElement('div');
  touchState.placeholder.style.height = rect.height + 'px';
  touchState.placeholder.style.border = '1.5px dashed var(--primary)';
  touchState.placeholder.style.borderRadius = 'var(--radius-sm)';
  touchState.placeholder.style.margin = '1px 0';
  touchState.placeholder.style.background = 'var(--primary-light)';
  el.parentElement.insertBefore(touchState.placeholder, el.nextSibling);
  el.style.opacity = '0';
}

function moveGhost(x, y) {
  if (!touchState.ghost) return;
  const rect = touchState.ghost.getBoundingClientRect();
  touchState.ghost.style.left = (x - rect.width / 2) + 'px';
  touchState.ghost.style.top = (y - rect.height / 2) + 'px';

  // Find element below and move placeholder
  touchState.ghost.style.display = 'none';
  let target = document.elementFromPoint(x, y);
  touchState.ghost.style.display = '';
  if (!target) return;

  if (touchState.dragType === 'group') {
    const groupEl = target.closest('.menu-group');
    if (groupEl && groupEl !== touchState.placeholder.closest('.menu-group')) {
      reorderGroups(touchState.dragId, groupEl.dataset.id);
      touchState.placeholder.remove();
      const dragEl = menu.querySelector(`[data-id="${touchState.dragId}"]`);
      if (dragEl) dragEl.parentElement.insertBefore(touchState.placeholder, dragEl.nextSibling);
    }
  } else {
    const itemEl = target.closest('.menu-item');
    if (itemEl) {
      const groupEl = itemEl.closest('.menu-group');
      if (groupEl && groupEl.dataset.id === touchState.groupId && itemEl.dataset.id !== touchState.dragId) {
        reorderItems(touchState.dragId, itemEl.dataset.id, touchState.groupId);
        touchState.placeholder.remove();
        const dragEl = groupEl.querySelector(`[data-id="${touchState.dragId}"]`);
        if (dragEl) dragEl.parentElement.insertBefore(touchState.placeholder, dragEl.nextSibling);
      }
    }
  }
}

function endTouchDrag(x, y) {
  if (touchState.ghost) {
    touchState.ghost.remove();
    touchState.ghost = null;
  }
  if (touchState.placeholder) {
    touchState.placeholder.remove();
    touchState.placeholder = null;
  }

  // Restore opacity of the original dragged element if still in DOM
  const el = menu.querySelector(`[data-id="${touchState.dragId}"]`);
  if (el) el.style.opacity = '';

  // Finalize reorder by whatever position was last set
  saveGroups();
  renderMenu();
  resetTouchState();
}

function reorderGroups(dragId, targetId) {
  if (dragId === targetId) return;
  const dragIdx = state.groups.findIndex(g => g.id === dragId);
  const targetIdx = state.groups.findIndex(g => g.id === targetId);
  if (dragIdx === -1 || targetIdx === -1) return;
  const [g] = state.groups.splice(dragIdx, 1);
  state.groups.splice(targetIdx, 0, g);
  saveGroups();
  renderMenu();
}

function reorderItems(dragId, targetId, groupId) {
  if (dragId === targetId) return;
  const group = state.groups.find(g => g.id === groupId);
  if (!group) return;
  const dragIdx = group.items.findIndex(i => i.id === dragId);
  const targetIdx = group.items.findIndex(i => i.id === targetId);
  if (dragIdx === -1 || targetIdx === -1) return;
  const [item] = group.items.splice(dragIdx, 1);
  group.items.splice(targetIdx, 0, item);
  saveGroups();
  renderMenu();
}

// Render menu
function renderMenu() {
  menu.innerHTML = '';

  state.groups.forEach((group) => {
    const isSelfGroup = group.id === 'g-self';
    const groupEl = document.createElement('div');
    groupEl.className = 'menu-group' + (group.collapsed ? ' collapsed' : '') + (isSelfGroup ? ' no-header' : '');
    groupEl.dataset.id = group.id;

    if (!isSelfGroup) {
      const header = document.createElement('div');
      header.className = 'group-header';
      header.innerHTML = `
        <svg class="group-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>
        <span class="group-icon">${renderItemIcon(group.icon, 14)}</span>
        <span class="group-name">${group.name}</span>
        <span class="group-actions">
          <button class="icon-action" data-action="edit-group" title="重命名分组"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
          <button class="icon-action delete" data-action="delete-group" title="删除分组"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>
        </span>
      `;
      header.addEventListener('click', (e) => {
        if (e.target.closest('.icon-action')) return;
        if (header.classList.contains('active-actions')) {
          header.classList.remove('active-actions');
          return;
        }
        clearActiveActions();
        group.collapsed = !group.collapsed;
        saveGroups();
        renderMenu();
      });

      setupLongPress(header, () => showActions(header));
      groupEl.appendChild(header);
    }

    const itemsEl = document.createElement('div');
    itemsEl.className = 'group-items';
    group.items.forEach((item) => {
      const active = state.activeItem === item.name ? ' active' : '';
      const itemEl = document.createElement('div');
      itemEl.className = 'menu-item' + active;
      itemEl.dataset.id = item.id;
      let badgeHtml = '';
      if (item.todo) {
        const pending = state.plans.filter(p => !p.done).length;
        if (pending > 0) {
          badgeHtml = `<span class="item-badge" style="background:var(--hot); min-width:7px; width:7px; height:7px; border-radius:50%; padding:0;"></span>`;
        }
      }
      itemEl.innerHTML = `
        <span class="item-icon">${renderItemIcon(item.icon, 16)}</span>
        <span class="item-name">${item.name}</span>
        ${badgeHtml}
        <span class="item-actions">
          <button class="icon-action" data-action="edit-item" title="重命名"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
          <button class="icon-action delete" data-action="delete-item" title="删除"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>
        </span>
      `;
      itemEl.addEventListener('click', (e) => {
        if (e.target.closest('.icon-action')) return;
        if (itemEl.classList.contains('active-actions')) {
          itemEl.classList.remove('active-actions');
          return;
        }
        clearActiveActions();
        selectItem(item.name);
        closeSidebar();
      });
      setupLongPress(itemEl, () => showActions(itemEl));
      itemsEl.appendChild(itemEl);
    });

    groupEl.appendChild(itemsEl);
    menu.appendChild(groupEl);
  });
}

// Menu actions
menu.addEventListener('click', async (e) => {
  const btn = e.target.closest('.icon-action');
  if (!btn) return;
  clearActiveActions();
  const action = btn.dataset.action;
  const groupEl = btn.closest('.menu-group');
  const groupId = groupEl.dataset.id;
  const group = state.groups.find(g => g.id === groupId);

  if (action === 'edit-group') {
    const name = await openModal('重命名分组', group.name);
    if (name) {
      group.name = name;
      saveGroups();
      renderMenu();
    }
  }

  if (action === 'delete-group') {
    if (confirm(`确定删除分组「${group.name}」吗？`)) {
      state.groups = state.groups.filter(g => g.id !== groupId);
      saveGroups();
      renderMenu();
    }
  }

  if (action === 'edit-item') {
    const itemEl = btn.closest('.menu-item');
    const item = findItem(itemEl.dataset.id);
    const name = await openModal('重命名项目', item.name);
    if (name) {
      const oldName = item.name;
      item.name = name;
      if (state.activeItem === oldName) state.activeItem = name;
      saveGroups();
      renderMenu();
      renderContent();
      renderMobileTabs();
    }
  }

  if (action === 'delete-item') {
    const itemEl = btn.closest('.menu-item');
    const item = findItem(itemEl.dataset.id);
    if (confirm(`确定删除「${item.name}」吗？`)) {
      group.items = group.items.filter(i => i.id !== item.id);
      if (state.activeItem === item.name) state.activeItem = '工作台首页';
      saveGroups();
      renderMenu();
      renderContent();
      renderMobileTabs();
    }
  }
});

// Add group / item
function addGroup() {
  openModal('新建分组').then(name => {
    if (!name) return;
    state.groups.push({
      id: uid('g'),
      name,
      icon: 'folder',
      collapsed: false,
      items: []
    });
    saveGroups();
    renderMenu();
  });
}

function addItemToActiveGroup() {
  let targetGroup = state.groups[0];
  for (const g of state.groups) {
    if (g.items.some(i => i.name === state.activeItem)) {
      targetGroup = g;
      break;
    }
  }
  openModal('新建项目').then(name => {
    if (!name) return;
    targetGroup.items.push({
      id: uid('i'),
      name,
      icon: 'file'
    });
    saveGroups();
    renderMenu();
  });
}

document.getElementById('btn-add-group').addEventListener('click', addGroup);

// Mobile tabs
function renderMobileTabs() {
  if (!mobileTabs) return;
  mobileTabs.innerHTML = '';
  const ul = document.createElement('ul');
  ul.className = 'tab-list';
  MOBILE_TABS.forEach(tab => {
    const active = tab.target && state.activeItem === tab.target ? ' active' : '';
    const li = document.createElement('button');
    li.className = 'tab-item' + active;
    li.innerHTML = `<span class="tab-icon">${icon(tab.icon, 22)}</span><span class="tab-label">${tab.name}</span>`;
    li.addEventListener('click', () => {
      if (tab.action === 'focus') {
        openFocusModal();
        return;
      }
      selectItem(tab.target);
    });
    ul.appendChild(li);
  });
  mobileTabs.appendChild(ul);
}

// Content rendering
function selectItem(name, skipHistory = false) {
  if (!skipHistory && state.activeItem && state.activeItem !== name) {
    state.navStack.push(state.activeItem);
    if (state.navStack.length > 50) state.navStack.shift();
  }
  state.activeItem = name;
  stopClock();
  renderMenu();
  renderContent();
  renderMobileTabs();
  updateBottomNav();
  updateBackBtn();
  renderTopbar();
  content.scrollTop = 0;
}

// 底部导航高亮联动
function updateBottomNav() {
  const map = { '工作台首页': 'home', '我的支线': 'branches', '本周洞察': 'insight', '自我介绍': 'mine' };
  const active = map[state.activeItem];
  document.querySelectorAll('#bottom-nav .bn-item').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.bn === active);
  });
}

// 绑定底部导航点击事件
function bindBottomNav() {
  const nav = document.getElementById('bottom-nav');
  if (!nav) return;
  nav.querySelectorAll('.bn-item').forEach(btn => {
    btn.addEventListener('click', () => {
      const key = btn.dataset.bn;
      if (key === 'plus') { openFocusModal(); return; }
      const target = { home: '工作台首页', branches: '我的支线', insight: '本周洞察', mine: '自我介绍' }[key];
      if (target) selectItem(target);
    });
  });
}

// 全局返回：回到导航栈上一个页面
function goBack() {
  if (!state.navStack.length) return;
  const prev = state.navStack.pop();
  selectItem(prev, true);
}

function updateBackBtn() {
  const btn = document.getElementById('back-btn');
  if (!btn) return;
  btn.style.display = state.navStack.length ? 'inline-flex' : 'none';
}

// 页面路由表：菜单项名称 -> 渲染函数
const PAGE_ROUTES = {
  '工作台首页': renderOverview,
  '每日复盘': renderDailyReview,
  '本周洞察': renderInsightPage,
  '语音复盘': renderVoiceReview,
  '奖励池': renderRewards,
  '成就殿堂': renderAchievements,
  '系统面板': renderSystemPanel,
  '内容素材库': renderContentLibrary,
  'looks-content': renderLooksContent,
  '碎碎念': renderMemos,
  '自我介绍': renderSelfIntro,
  '设置': renderSettingsPage,
  '我的支线': renderBranchesPage,
  '记账': renderMoney,
  '学习成长': renderStudyPage,
  '项目计划': renderProjectPage,
  '生活秩序': renderLifeOrderPage,
  '内在成长': renderInnerGrowthPage,
  '阅读积累': renderReadingAccumPage,
  '旅行体验': renderTravelPage,
  '社交拓展': renderSocialPage,
  // 成长提升
  '书籍阅读': renderBookReading,
  '历史': renderHistoryLearning,
  '视频剪辑': renderVideoEditing,
  '3D建模': render3DModeling,
  // 保留的功能页（由领域页的工具入口跳转）
  '每日计划': renderDailyPlan,
  '饮食': renderDiet,
  '健身': renderFitness,
  '记账存钱': renderMoney
};

// 功能子页 -> 返回目标（这些页面由领域页/系统面板跳转进来）
const SUB_PAGE_PARENT = {
  '每日计划': '工作台首页',
  '饮食': '健康',
  '健身': '健康',
  '记账存钱': '金钱'
};

function prependBackBar(target) {
  const bar = document.createElement('button');
  bar.className = 'domain-back sub-back';
  bar.textContent = `‹ 返回${target}`;
  bar.addEventListener('click', () => selectItem(target));
  content.insertBefore(bar, content.firstChild);
}

// 全局：把所有可见文本中的阿拉伯数字 0 与百分号 % 包裹为 <span class="zpct">，
// 使其字重（600）与进度环数字 .mr-num 一致；仅设置字重，颜色沿用父级，不改变既有颜色。
function boldZeroPct(root) {
  if (!root) return;
  const sep = '[\\s\\(\\[\\{（【「『\\-]'; // 0 前面的分隔符
  const sepAfter = '[\\s\\)\\]\\}）】」』.,!?;：，。！？、；\\/]|$'; // 后面的分隔符
  // 匹配独立的 0 / 0% / 0.0 / 0.00；10.0 / 10.00 等数字内部的 0 不处理
  const re = new RegExp('(^|' + sep + ')((?:0(?:\\.0{1,2})?%|0(?:\\.0{1,2})?))(?=' + sepAfter + ')', 'g');
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const p = node.parentNode;
      if (!p) return NodeFilter.FILTER_REJECT;
      const tag = p.tagName;
      if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'TEXTAREA' || tag === 'INPUT') return NodeFilter.FILTER_REJECT;
      if (p.namespaceURI && String(p.namespaceURI).indexOf('svg') >= 0) return NodeFilter.FILTER_REJECT;
      if (p.classList && p.classList.contains('zpct')) return NodeFilter.FILTER_REJECT;
      return re.test(node.nodeValue) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
    }
  });
  const targets = [];
  let n;
  while ((n = walker.nextNode())) targets.push(n);
  for (const t of targets) {
    const text = t.nodeValue;
    re.lastIndex = 0;
    if (!re.test(text)) continue;
    re.lastIndex = 0;
    const frag = document.createDocumentFragment();
    let lastIndex = 0, m;
    while ((m = re.exec(text))) {
      const before = text.slice(lastIndex, m.index + m[1].length);
      if (before) frag.appendChild(document.createTextNode(before));
      const span = document.createElement('span');
      span.className = 'zpct';
      span.textContent = m[2];
      frag.appendChild(span);
      lastIndex = m.index + m[0].length;
    }
    const tail = text.slice(lastIndex);
    if (tail) frag.appendChild(document.createTextNode(tail));
    if (frag.childNodes.length) t.parentNode.replaceChild(frag, t);
  }
}

function renderContent() {
  content.innerHTML = '';

  const route = PAGE_ROUTES[state.activeItem];
  if (route) {
    route();
    const parent = SUB_PAGE_PARENT[state.activeItem];
    if (parent) prependBackBar(parent);
    boldZeroPct(document.body);
    return;
  }

  if (DOMAIN_CONFIG[state.activeItem]) {
    renderDomainPage(state.activeItem);
    boldZeroPct(document.body);
    return;
  }

  const card = document.createElement('div');
  card.className = 'content-card';
  card.innerHTML = `
    <div class="content-empty">
      <div class="empty-icon">${icon('inbox', 48)}</div>
      <p>这里是「${state.activeItem}」页面</p>
      <p style="font-size: 12px; margin-top: 6px;">后续内容可在此补充</p>
    </div>
  `;
  content.appendChild(card);
  boldZeroPct(document.body);
}

// Daily plan
function getPlanTag(text) {
  const t = text.toLowerCase();
  if (t.includes('运动') || t.includes('锻炼') || t.includes('健身') || t.includes('前驱') || t.includes('爬楼梯') || t.includes('足弓') || t.includes('站轴') || t.includes('体态') || t.includes('挺胸')) return '运动';
  if (t.includes('英语') || t.includes('单词') || t.includes('音标') || t.includes('外语') || t.includes('日语')) return '英语';
  if (t.includes('睡觉') || t.includes('睡眠')) return '睡眠';
  if (t.includes('喝水') || t.includes('护肤') || t.includes('健康') || t.includes('饮食')) return '健康';
  if (t.includes('做饭') || t.includes('穿搭') || t.includes('生活') || t.includes('仪态')) return '生活';
  if (t.includes('阅读') || t.includes('书') || t.includes('微信')) return '阅读';
  return '日常';
}

function getPlanBadgeColor(tag) {
  const colors = {
    '运动': '#6CB99A',
    '英语': '#E8A86B',
    '睡眠': '#8FA4C7',
    '生活': '#D6A6C7',
    '健康': '#8FBFA9',
    '阅读': '#9AABA3',
    '日常': '#9AABA3'
  };
  return colors[tag] || '#9AABA3';
}

function renderDailyPlan(host, embedded = false) {
  const mount = host || content;
  if (!host) content.innerHTML = '';

  const card = document.createElement('div');
  card.className = 'content-card plan-card';

  const doneCount = state.plans.filter(p => p.done).length;
  const total = state.plans.length;
  const percent = total ? Math.round((doneCount / total) * 100) : 0;
  const earnedPoints = state.plans.filter(p => p.done).reduce((s, p) => s + (p.points || 0), 0);
  const today = new Date();
  const weekdays = ['周日','周一','周二','周三','周四','周五','周六'];
  const dateString = `${today.getFullYear()}年${today.getMonth()+1}月${today.getDate()}日 ${weekdays[today.getDay()]}`;

  const progressCircle = `
    <div class="plan-progress-circle">
      <svg viewBox="0 0 80 80">
        <circle class="pc-bg" cx="40" cy="40" r="34"></circle>
        <circle class="pc-fg" cx="40" cy="40" r="34" style="stroke-dasharray: ${(2 * Math.PI * 34).toFixed(1)}; stroke-dashoffset: ${(2 * Math.PI * 34 * (1 - percent / 100)).toFixed(1)}"></circle>
      </svg>
      <div class="pc-text">${percent}<span>%</span></div>
    </div>
  `;

  card.innerHTML = `
    <div class="plan-overview">
      ${progressCircle}
      <div class="plan-overview-info">
        <h3 class="plan-title">当日计划</h3>
        <p class="plan-desc">坚持比天赋更重要。今日任务完成得越多，离目标就越近。</p>
        <div class="plan-overview-stats">
          <div class="pos-stat"><span class="pos-num">${doneCount}/${total}</span><span class="pos-label">已完成</span></div>
          <div class="pos-stat"><span class="pos-num pos-points">+${earnedPoints}</span><span class="pos-label">今日积分</span></div>
        </div>
      </div>
      <div class="plan-date">${dateString}</div>
    </div>

    ${embedded ? '' : `
    <div class="plan-datebar">
      <input type="date" id="plan-history-date" value="${getTodayKey()}" max="${getTodayKey()}" style="display:none">
      <button class="ghost-btn date-trigger" id="plan-history-trigger" data-date="${getTodayKey()}">${formatDateCN(getTodayKey())}</button>
      <button class="text-btn" id="plan-history-btn">查看该日</button>
    </div>
    `}

    <div class="plan-input-row">
      <input type="text" class="plan-input" id="plan-input" placeholder="新增任务，如：拍一条阳台改造 vlog">
      <button class="plan-add-btn" id="plan-add-btn">+ 新增</button>
    </div>
    <div id="plan-groups"></div>
  `;
  mount.appendChild(card);

  const input = card.querySelector('#plan-input');
  const addBtn = card.querySelector('#plan-add-btn');
  const groupsWrap = card.querySelector('#plan-groups');

  // 历史回顾：非嵌入模式下绑定日期选择
  if (!embedded) {
    const historyDate = card.querySelector('#plan-history-date');
    const historyBtn = card.querySelector('#plan-history-btn');
    const openHistory = () => {
      const d = historyDate?.value;
      if (!d) return;
      if (d === getTodayKey()) {
        state.planDate = null;
        renderContent();
      } else {
        renderPlanHistory(d);
      }
    };
    if (historyBtn) historyBtn.addEventListener('click', openHistory);
    if (historyDate) historyDate.addEventListener('change', openHistory);

    const historyTrigger = card.querySelector('#plan-history-trigger');
    if (historyTrigger) {
      historyTrigger.addEventListener('click', () => {
        openDatePicker({
          initial: historyDate.value || getTodayKey(),
          max: getTodayKey(),
          onSelect: (k) => {
            historyDate.value = k;
            historyTrigger.textContent = formatDateCN(k);
            historyTrigger.dataset.date = k;
            openHistory();
          }
        });
      });
    }

  }

  function refreshOverview() {
    const d = state.plans.filter(p => p.done).length;
    const t = state.plans.length;
    const pct = t ? Math.round((d / t) * 100) : 0;
    const ep = state.plans.filter(p => p.done).reduce((s, p) => s + (p.points || 0), 0);
    const fg = card.querySelector('.pc-fg');
    const txt = card.querySelector('.pc-text');
    const totalEl = card.querySelector('.pos-stat .pos-num');
    const ptsEl = card.querySelector('.pos-points');
    if (fg) {
      const r = 2 * Math.PI * 34;
      fg.style.strokeDashoffset = (r * (1 - pct / 100)).toFixed(1);
    }
    if (txt) txt.innerHTML = `${pct}<span>%</span>`;
    if (totalEl) totalEl.textContent = `${d}/${t}`;
    if (ptsEl) ptsEl.textContent = `+${ep}`;
  }

  function renderPlanItemContent(li, plan) {
    const tag = getPlanTag(plan.text);
    const tagColor = getPlanBadgeColor(tag);
    li.className = 'plan-item' + (plan.done ? ' done' : '');
    li.dataset.id = plan.id;

    if (state.editingPlanId === plan.id) {
      li.innerHTML = `
        <input type="text" class="plan-item-input" value="${plan.text}">
        <input type="number" class="plan-points-input" value="${plan.points}" min="0" title="完成积分">
        <span class="plan-item-actions">
          <button class="icon-action" data-action="save-plan"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></button>
          <button class="icon-action delete" data-action="cancel-plan"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
        </span>
      `;
      const inputEdit = li.querySelector('.plan-item-input');
      inputEdit.focus();
      inputEdit.select();
    } else {
      li.innerHTML = `
        <span class="plan-check"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></span>
        <span class="plan-tag" style="background:${tagColor}">${tag}</span>
        <span class="plan-text">${plan.text}</span>
        <span class="plan-points">+${plan.points}</span>
        <span class="plan-item-actions">
          <button class="icon-action" data-action="edit-plan" title="编辑（可改积分）"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
          <button class="icon-action delete" data-action="delete-plan" title="删除"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>
        </span>
      `;
    }
  }

  function renderGroups() {
    groupsWrap.innerHTML = '';
    state.planGroups.forEach(groupName => {
      const items = state.plans.filter(p => p.group === groupName);
      if (items.length === 0) return;
      const section = document.createElement('div');
      section.className = 'plan-group-section';
      section.innerHTML = `
        <div class="plan-group-title">
          <span class="plan-group-name">${groupName}</span>
          <span class="plan-group-count">${items.filter(i => i.done).length}/${items.length}</span>
        </div>
        <ul class="plan-list" data-group="${groupName}"></ul>
      `;
      const ul = section.querySelector('.plan-list');
      items.forEach(plan => {
        const li = document.createElement('li');
        renderPlanItemContent(li, plan);
        ul.appendChild(li);
      });
      groupsWrap.appendChild(section);
    });

    // 没有分组的计划（兼容数据）
    const orphans = state.plans.filter(p => !state.planGroups.includes(p.group));
    if (orphans.length) {
      const section = document.createElement('div');
      section.className = 'plan-group-section';
      section.innerHTML = `
        <div class="plan-group-title"><span class="plan-group-name">其他</span></div>
        <ul class="plan-list" data-group="__orphan"></ul>
      `;
      const ul = section.querySelector('.plan-list');
      orphans.forEach(plan => {
        const li = document.createElement('li');
        renderPlanItemContent(li, plan);
        ul.appendChild(li);
      });
      groupsWrap.appendChild(section);
    }
  }

  function appendPlanItemDirect(plan) {
    let ul = groupsWrap.querySelector(`.plan-list[data-group="${plan.group}"]`);
    if (!ul) {
      renderGroups();
      ul = groupsWrap.querySelector(`.plan-list[data-group="${plan.group}"]`);
    }
    if (!ul) return;
    const li = document.createElement('li');
    renderPlanItemContent(li, plan);
    ul.appendChild(li);
  }

  function addPlan() {
    const text = input.value.trim();
    if (!text) return;
    const plan = { id: uid('p'), text, done: false, group: '日常', points: 2 };
    state.plans.push(plan);
    savePlans();
    snapshotTodayPlans();
    input.value = '';
    appendPlanItemDirect(plan);
    refreshOverview();
    updateTodayCheckin();
  }

  addBtn.addEventListener('click', addPlan);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') addPlan();
  });

  groupsWrap.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) {
      const check = e.target.closest('.plan-check');
      if (check) {
        const li = check.closest('.plan-item');
        const plan = state.plans.find(p => p.id === li.dataset.id);
        if (plan) togglePlanDone(plan.id);
      }
      return;
    }

    const li = btn.closest('.plan-item');
    const planId = li.dataset.id;
    const action = btn.dataset.action;
    const plan = state.plans.find(p => p.id === planId);

    if (action === 'edit-plan') {
      state.editingPlanId = planId;
      renderPlanItemContent(li, plan);
    }

    if (action === 'delete-plan') {
      deletePlanById(planId);
      li.remove();
      refreshOverview();
      updateTodayCheckin();
    }

    if (action === 'save-plan') {
      const inputEl = li.querySelector('.plan-item-input');
      const pointsEl = li.querySelector('.plan-points-input');
      const text = inputEl.value.trim();
      if (text) {
        plan.text = text;
        const np = parseInt(pointsEl.value);
        plan.points = isNaN(np) ? 0 : np;
        savePlans();
        snapshotTodayPlans();
      }
      state.editingPlanId = null;
      renderPlanItemContent(li, plan);
      refreshOverview();
    }

    if (action === 'cancel-plan') {
      state.editingPlanId = null;
      renderPlanItemContent(li, plan);
    }
  });

  groupsWrap.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' && e.key !== 'Escape') return;
    const li = e.target.closest('.plan-item');
    if (!li) return;
    if (e.key === 'Enter') li.querySelector('[data-action="save-plan"]')?.click();
    if (e.key === 'Escape') li.querySelector('[data-action="cancel-plan"]')?.click();
  });

  renderGroups();
  updateTodayCheckin();
}

function getWeeklyPlanInsight() {
  const days = [];
  for (let i = 6; i >= 0; i--) days.push(shiftDate(getTodayKey(), -i));
  const stats = {};
  const totals = {};
  days.forEach(d => {
    const plans = d === getTodayKey() ? state.plans : (state.planHistory[d] || []);
    plans.forEach(p => {
      if (!stats[p.group]) { stats[p.group] = 0; totals[p.group] = 0; }
      if (p.done) stats[p.group]++;
      totals[p.group]++;
    });
  });
  const insights = [];
  Object.keys(stats).forEach(g => {
    const rate = totals[g] ? Math.round((stats[g] / totals[g]) * 100) : 0;
    if (rate < 40) insights.push(`${g}完成率仅 ${rate}%，建议减少任务数量或固定一个时间段集中完成。`);
    else if (rate < 70) insights.push(`${g}完成率 ${rate}%，还有提升空间，建议把最困难的任务放在精力最好的时段。`);
    else insights.push(`${g}完成率 ${rate}%，保持得很好，下周可以继续这个节奏。`);
  });
  if (!insights.length) insights.push('本周数据不足，坚持记录几天后会出现个性化建议。');
  return insights;
}

function renderPlanHistory(dateKey) {
  content.innerHTML = '';
  const card = document.createElement('div');
  card.className = 'content-card plan-card';
  const plans = state.planHistory[dateKey] || [];
  const doneCount = plans.filter(p => p.done).length;
  const total = plans.length;
  const percent = total ? Math.round((doneCount / total) * 100) : 0;
  const earnedPoints = plans.filter(p => p.done).reduce((s, p) => s + (p.points || 0), 0);
  const d = new Date(dateKey);
  const weekdays = ['周日','周一','周二','周三','周四','周五','周六'];
  const dateString = `${d.getFullYear()}年${d.getMonth()+1}月${d.getDate()}日 ${weekdays[d.getDay()]}`;

  card.innerHTML = `
    <div class="plan-overview">
      <div class="plan-progress-circle">
        <svg viewBox="0 0 80 80">
          <circle class="pc-bg" cx="40" cy="40" r="34"></circle>
          <circle class="pc-fg" cx="40" cy="40" r="34" style="stroke-dasharray: ${(2 * Math.PI * 34).toFixed(1)}; stroke-dashoffset: ${(2 * Math.PI * 34 * (1 - percent / 100)).toFixed(1)}"></circle>
        </svg>
        <div class="pc-text">${percent}<span>%</span></div>
      </div>
      <div class="plan-overview-info">
        <h3 class="plan-title">历史计划</h3>
        <p class="plan-desc">${dateString} 的完成情况</p>
        <div class="plan-overview-stats">
          <div class="pos-stat"><span class="pos-num">${doneCount}/${total}</span><span class="pos-label">已完成</span></div>
          <div class="pos-stat"><span class="pos-num pos-points">+${earnedPoints}</span><span class="pos-label">当日积分</span></div>
        </div>
      </div>
      <div class="plan-date">${dateString}</div>
    </div>
    <div id="plan-history-groups"></div>
    <div class="plan-datebar" style="margin-top:12px;">
      <button class="text-btn" id="plan-back-today">返回今日计划</button>
    </div>
  `;
  content.appendChild(card);

  const groupsWrap = card.querySelector('#plan-history-groups');
  const groups = {};
  plans.forEach(p => {
    const g = p.group || '其他';
    if (!groups[g]) groups[g] = [];
    groups[g].push(p);
  });
  Object.keys(groups).forEach(g => {
    const section = document.createElement('div');
    section.className = 'plan-group-section';
    section.innerHTML = `
      <div class="plan-group-title"><span class="plan-group-name">${g}</span><span class="plan-group-count">${groups[g].filter(i => i.done).length}/${groups[g].length}</span></div>
      <ul class="plan-list"></ul>
    `;
    const ul = section.querySelector('.plan-list');
    groups[g].forEach(plan => {
      const tag = getPlanTag(plan.text);
      const tagColor = getPlanBadgeColor(tag);
      const li = document.createElement('li');
      li.className = 'plan-item' + (plan.done ? ' done' : '');
      li.innerHTML = `
        <span class="plan-check"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></span>
        <span class="plan-tag" style="background:${tagColor}">${tag}</span>
        <span class="plan-text">${escapeHTML(plan.text)}</span>
        <span class="plan-points">+${plan.points}</span>
      `;
      ul.appendChild(li);
    });
    groupsWrap.appendChild(section);
  });

  card.querySelector('#plan-back-today').addEventListener('click', () => {
    state.planDate = null;
    renderContent();
  });
}

function renderHistoricalPlan(host, dateKey) {
  const card = document.createElement('div');
  card.className = 'content-card plan-card';
  const plans = dateKey === getTodayKey() ? state.plans : (state.planHistory[dateKey] || []);
  const doneCount = plans.filter(p => p.done).length;
  const total = plans.length;
  const percent = total ? Math.round((doneCount / total) * 100) : 0;
  const earnedPoints = plans.filter(p => p.done).reduce((s, p) => s + (p.points || 0), 0);
  const d = new Date(dateKey);
  const weekdays = ['周日','周一','周二','周三','周四','周五','周六'];
  const dateString = `${d.getFullYear()}年${d.getMonth()+1}月${d.getDate()}日 ${weekdays[d.getDay()]}`;

  card.innerHTML = `
    <div class="plan-overview">
      <div class="plan-progress-circle">
        <svg viewBox="0 0 80 80">
          <circle class="pc-bg" cx="40" cy="40" r="34"></circle>
          <circle class="pc-fg" cx="40" cy="40" r="34" style="stroke-dasharray: ${(2 * Math.PI * 34).toFixed(1)}; stroke-dashoffset: ${(2 * Math.PI * 34 * (1 - percent / 100)).toFixed(1)}"></circle>
        </svg>
        <div class="pc-text">${percent}<span>%</span></div>
      </div>
      <div class="plan-overview-info">
        <h3 class="plan-title">${dateKey === getTodayKey() ? '当日计划' : '历史计划'}</h3>
        <p class="plan-desc">${dateString} 的完成情况</p>
        <div class="plan-overview-stats">
          <div class="pos-stat"><span class="pos-num">${doneCount}/${total}</span><span class="pos-label">已完成</span></div>
          <div class="pos-stat"><span class="pos-num pos-points">+${earnedPoints}</span><span class="pos-label">当日积分</span></div>
        </div>
      </div>
      <div class="plan-date">${dateString}</div>
    </div>
    <div id="plan-history-groups"></div>
  `;
  host.appendChild(card);

  const groupsWrap = card.querySelector('#plan-history-groups');
  if (!plans.length) {
    groupsWrap.innerHTML = '<p class="plan-empty">当天没有计划记录</p>';
    return;
  }
  const groups = {};
  plans.forEach(p => {
    const g = p.group || '其他';
    if (!groups[g]) groups[g] = [];
    groups[g].push(p);
  });
  Object.keys(groups).forEach(g => {
    const section = document.createElement('div');
    section.className = 'plan-group-section';
    section.innerHTML = `
      <div class="plan-group-title"><span class="plan-group-name">${g}</span><span class="plan-group-count">${groups[g].filter(i => i.done).length}/${groups[g].length}</span></div>
      <ul class="plan-list"></ul>
    `;
    const ul = section.querySelector('.plan-list');
    groups[g].forEach(plan => {
      const tag = getPlanTag(plan.text);
      const tagColor = getPlanBadgeColor(tag);
      const li = document.createElement('li');
      li.className = 'plan-item' + (plan.done ? ' done' : '');
      li.innerHTML = `
        <span class="plan-check"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></span>
        <span class="plan-tag" style="background:${tagColor}">${tag}</span>
        <span class="plan-text">${escapeHTML(plan.text)}</span>
        <span class="plan-points">+${plan.points}</span>
      `;
      ul.appendChild(li);
    });
    groupsWrap.appendChild(section);
  });
}

// ---------- Money / 记账存钱 ----------
function getTransactionsByDate(date) {
  return state.transactions.filter(t => t.date === date);
}

function getDayExpense(date) {
  return getTransactionsByDate(date)
    .filter(t => t.type === 'expense')
    .reduce((s, t) => s + (t.amount || 0), 0);
}

function getDayIncome(date) {
  return getTransactionsByDate(date)
    .filter(t => t.type === 'income')
    .reduce((s, t) => s + (t.amount || 0), 0);
}

function getMonthTransactions(year, month) {
  const prefix = `${year}-${String(month + 1).padStart(2, '0')}`;
  return state.transactions.filter(t => t.date && t.date.startsWith(prefix));
}

function getMonthExpenseCategories(year, month) {
  const txs = getMonthTransactions(year, month).filter(t => t.type === 'expense');
  const map = {};
  txs.forEach(t => {
    map[t.category] = (map[t.category] || 0) + (t.amount || 0);
  });
  return Object.keys(map).map(name => ({ name, value: map[name] }))
    .sort((a, b) => b.value - a.value);
}

// 记账领域每日积分结算：依据「记录今日所有支出」与「不超日预算」两项任务自动加减分
function settleMoneyDaily(dateKey) {
  const domain = ensureDomain('money');
  const budget = state.budget || 0;
  const expense = getDayExpense(dateKey);
  const hasRecord = state.transactions.some(t => t.type === 'expense' && t.date === dateKey);
  let target = 0;
  if (hasRecord) {
    const recordTask = domain.tasks.find(t => t.text === '记录今日所有支出');
    if (recordTask) target += 2;
  }
  if (budget > 0) {
    const budgetTask = domain.tasks.find(t => t.text === '不超日预算');
    if (budgetTask) target += expense <= budget ? 2 : -2;
  }
  const current = Number(domain.log[dateKey]) || 0;
  if (target !== current) {
    if (target === 0) delete domain.log[dateKey];
    else domain.log[dateKey] = target;
    saveDomains();
  }
  // sync today's task done states for display (historical states are reconstructed from snapshots)
  const today = getTodayKey();
  if (dateKey === today) {
    const recordTask = domain.tasks.find(t => t.text === '记录今日所有支出');
    const budgetTask = domain.tasks.find(t => t.text === '不超日预算');
    if (recordTask) { recordTask.done = hasRecord; recordTask.doneDate = hasRecord ? today : ''; }
    if (budgetTask) {
      if (budget > 0) { budgetTask.done = expense <= budget; budgetTask.doneDate = budgetTask.done ? today : ''; }
      else { budgetTask.done = false; budgetTask.doneDate = ''; }
    }
    saveDomains();
  }
}

// 在「记账」领域页里内嵌时用 append 模式，避免清空领域头部
function refreshMoneyView() {
  if (state.activeItem === '金钱' || state.activeItem === '记账') {
    renderContent();
  } else {
    renderMoney();
  }
}

let moneyMount = null;

function renderMoney(opts) {
  const append = !!(opts && opts.append);
  moneyMount = (opts && opts.mount) || content;
  if (!append) {
    moneyMount = content;
    content.innerHTML = '';
  }
  const card = document.createElement('div');
  card.className = 'content-card money-card';

  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const todayKey = dateStr(today);

  // 结算今日积分
  settleMoneyDaily(todayKey);

  if (state.moneyView === 'detail' && state.selectedDate) {
    settleMoneyDaily(state.selectedDate);
    renderMoneyDetail(card, state.selectedDate);
    return;
  }

  // 当前查看的月份（可切换）
  const view = state.moneyMonth || { y: year, m: month };
  const vy = view.y;
  const vm = view.m;

  const todayExpense = getDayExpense(todayKey);
  const todayIncome = getDayIncome(todayKey);
  const remain = Math.max(0, state.budget - todayExpense);
  const budgetPct = state.budget > 0 ? Math.min(100, Math.round((todayExpense / state.budget) * 100)) : 0;
  const todayOver = todayExpense > state.budget;
  const monthExpense = getMonthTransactions(vy, vm).filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const monthIncome = getMonthTransactions(vy, vm).filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const catData = getMonthExpenseCategories(vy, vm);
  const maxCat = catData.length ? catData[0].value : 1;

  // 总资产按资产账户余额汇总自动计算；收入/支出按交易流水累计
  const assetTotal = calcAssetTotal();
  const totalIncome = state.transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const totalExpense = state.transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

  card.innerHTML = `
    <div class="money-header">
      <div>
        <h3 class="page-title-main">记账存钱</h3>
        <p class="page-subtitle">${year}年${month + 1}月 · 我的积分 <strong class="money-points">${state.points}</strong></p>
      </div>
    </div>

    <div class="money-total-card clickable" id="money-total-card" title="点击查看资产分类">
      <div class="mt-label">总资产（元）</div>
      <div class="mt-value">¥${formatMoney(assetTotal)}</div>
      <div class="mt-row">
        <div class="mt-col"><span class="mt-col-label">收入</span><span class="mt-col-val income">+¥${formatMoney(totalIncome)}</span></div>
        <div class="mt-col"><span class="mt-col-label">支出</span><span class="mt-col-val expense">-¥${formatMoney(totalExpense)}</span></div>
      </div>
    </div>

    <div class="section-card">
      <div class="section-header">
        <span class="section-icon">${icon('calendar', 16)}</span>
        <span class="section-title">每日预算与消费</span>
        <span class="section-meta">预算 ¥${formatMoney(state.budget)}/天</span>
      </div>
      <div class="mini-card-row">
        <div class="mini-card clickable" data-act="budget">
          <span class="mc-val">¥${formatMoney(state.budget)}</span>
          <span class="mc-label">今日预算</span>
        </div>
        <div class="mini-card clickable" data-act="expense">
          <span class="mc-val">¥${formatMoney(todayExpense)}</span>
          <span class="mc-label">今日消费</span>
        </div>
        <div class="mini-card clickable" data-act="remain">
          <span class="mc-val ${todayOver ? 'over' : 'good'}">${todayOver ? '-¥' + formatMoney(todayExpense - state.budget) : '¥' + formatMoney(remain)}</span>
          <span class="mc-label">${todayOver ? '超出预算' : '今日剩余'}</span>
        </div>
        <div class="mini-card clickable" data-act="month">
          <span class="mc-val">¥${formatMoney(monthExpense)}</span>
          <span class="mc-label">${vm + 1}月消费${state.monthBudget > 0 ? ` / ¥${formatMoney(state.monthBudget)}` : ''}</span>
        </div>
      </div>
      <div class="budget-bar">
        <div class="budget-bar-fill ${todayOver ? 'over' : ''}" style="width:${budgetPct}%"></div>
      </div>
      <div class="budget-hint ${todayOver ? 'over' : ''}">
        ${todayOver ? '今日已超预算，积分 -1' : (state.budget > 0 ? '今日未超预算，可获得 +1 积分' : '未设置预算，仅记录支出')}
      </div>
    </div>

    <div class="section-card">
      <div class="section-header">
        <span class="section-icon">${icon('chart', 16)}</span>
        <span class="section-title">${vm + 1}月消费分布</span>
      </div>
      ${catData.length === 0 ? '<p class="section-note">本月还没有支出记录</p>' : ''}
      <div class="cat-bars">
        ${catData.map(c => `
          <div class="cat-bar-row">
            <div class="cat-bar-name">${c.name}</div>
            <div class="cat-bar-track">
              <div class="cat-bar-fill" style="width:${Math.max(4, Math.round((c.value / maxCat) * 100))}%"></div>
            </div>
            <div class="cat-bar-val">¥${formatMoney(c.value)}</div>
          </div>
        `).join('')}
      </div>
      <div class="month-summary">
        <span>本月收入 ¥${formatMoney(monthIncome)}</span>
        <span>本月支出 ¥${formatMoney(monthExpense)}</span>
      </div>
    </div>

    <div class="section-card">
      <div class="section-header">
        <span class="section-icon">${icon('calendar', 16)}</span>
        <span class="section-title">每日消费</span>
        <div class="cal-nav">
          <button class="cal-arrow" data-cal="prev" aria-label="上一月">‹</button>
          <span class="cal-month">${vy}年${vm + 1}月</span>
          <button class="cal-arrow" data-cal="next" aria-label="下一月">›</button>
        </div>
      </div>
      <div class="cal-grid" id="cal-grid"></div>
      <p class="section-note">双击某一天可查看当天消费明细 · 箭头切换月份</p>
    </div>
  `;
  (moneyMount || content).appendChild(card);

  // 总资产卡片：点击进入资产账户管理
  card.querySelector('#money-total-card').addEventListener('click', () => {
    renderAssetAccounts();
  });

  // 迷你卡片：点击编辑 / 快速记账
  card.querySelectorAll('.mini-card.clickable').forEach(mc => {
    mc.addEventListener('click', async () => {
      const act = mc.dataset.act;
      if (act === 'budget') {
        const v = await openModal('设置每日预算（元）：', state.budget, '请输入每日预算');
        if (v !== null && !isNaN(parseInt(v))) {
          state.budget = Math.max(0, parseInt(v));
          saveBudget();
          refreshMoneyView();
        }
      } else if (act === 'expense') {
        // 快速记一笔今日支出
        const amount = await openModal('今日消费金额（元）：', '', '请输入消费金额');
        if (amount !== null && !isNaN(parseFloat(amount)) && parseFloat(amount) > 0) {
          const amt = Math.round(parseFloat(amount) * 100) / 100;
          const note = await openModal('备注（可选）：', '', '请输入备注') || '';
          const category = state.expenseCategories[0]?.name || '其他';
          state.transactions.push({
            id: uid('tx'),
            date: todayKey,
            type: 'expense',
            amount: amt,
            category,
            note
          });
          saveTransactions();
          refreshMoneyView();
        }
      } else if (act === 'remain') {
        // 今日剩余只读，点击跳转到今日明细
        state.selectedDate = todayKey;
        state.moneyView = 'detail';
        refreshMoneyView();
      } else if (act === 'month') {
        const v = await openModal('设置本月预算（元）：', state.monthBudget || 0, '请输入本月预算');
        if (v !== null && !isNaN(parseInt(v))) {
          state.monthBudget = Math.max(0, parseInt(v));
          saveMonthBudget();
          refreshMoneyView();
        }
      }
    });
  });

  // 日历
  const calGrid = card.querySelector('#cal-grid');
  const firstDay = new Date(vy, vm, 1).getDay();
  const daysInMonth = new Date(vy, vm + 1, 0).getDate();
  const weekNames = ['日', '一', '二', '三', '四', '五', '六'];
  weekNames.forEach(w => {
    const el = document.createElement('div');
    el.className = 'cal-weekname';
    el.textContent = w;
    calGrid.appendChild(el);
  });
  for (let i = 0; i < firstDay; i++) {
    const el = document.createElement('div');
    el.className = 'cal-cell empty';
    calGrid.appendChild(el);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const dateKey = `${vy}-${String(vm + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const expense = getDayExpense(dateKey);
    const income = getDayIncome(dateKey);
    const cell = document.createElement('div');
    cell.className = 'cal-cell';
    cell.dataset.date = dateKey;
    if (dateKey === todayKey) cell.classList.add('is-today');
    if (expense > 0 || income > 0) {
      const over = expense > state.budget;
      cell.classList.add(expense > 0 ? (over ? 'over' : 'has-expense') : 'has-income');
      cell.innerHTML = `
        <div class="cal-day">${d}</div>
        ${expense > 0 ? `<div class="cal-amt ${over ? 'over' : ''}">-${formatMoney(expense)}</div>` : ''}
        ${expense === 0 && income > 0 ? `<div class="cal-amt income">+${formatMoney(income)}</div>` : ''}
      `;
    } else {
      cell.innerHTML = `<div class="cal-day">${d}</div>`;
    }
    cell.addEventListener('dblclick', () => {
      state.selectedDate = dateKey;
      state.moneyView = 'detail';
      refreshMoneyView();
    });
    calGrid.appendChild(cell);
  }

  // 月份导航
  card.querySelector('[data-cal="prev"]').addEventListener('click', () => {
    let m = vm - 1, y = vy;
    if (m < 0) { m = 11; y--; }
    state.moneyMonth = { y, m };
    refreshMoneyView();
  });
  card.querySelector('[data-cal="next"]').addEventListener('click', () => {
    let m = vm + 1, y = vy;
    if (m > 11) { m = 0; y++; }
    state.moneyMonth = { y, m };
    refreshMoneyView();
  });
}

// 资产账户管理（总资产卡片点击进入）
function renderAssetAccounts() {
  const total = calcAssetTotal();
  const overlay = document.createElement('div');
  overlay.className = 'asset-overlay';
  overlay.innerHTML = `
    <div class="asset-panel">
      <div class="asset-header">
        <button class="asset-back" id="asset-back">${icon('back', 18)} 返回</button>
        <h3 class="asset-title">资产账户</h3>
      </div>
      <div class="asset-total">
        <div class="asset-total-label">总资产（元）</div>
        <div class="asset-total-value">¥${formatMoney(total)}</div>
      </div>
      <div class="asset-list" id="asset-list"></div>
      <div class="asset-actions">
        <button class="gold-btn" id="asset-save" style="flex:1">保存</button>
      </div>
      <p class="asset-tip">美团月付等负债账户输入正数会自动记为负值，从总资产中扣除。</p>
    </div>
  `;
  document.body.appendChild(overlay);

  const list = overlay.querySelector('#asset-list');
  state.assetAccounts.forEach((acc, idx) => {
    const row = document.createElement('div');
    row.className = 'asset-row';
    row.innerHTML = `
      <div class="asset-info">
        <span class="asset-name">${escapeHTML(acc.name)}</span>
        ${acc.debt ? '<span class="asset-debt-badge">负债</span>' : ''}
      </div>
      <div class="asset-input-wrap">
        <span class="asset-sign">${acc.debt ? '-' : ''}¥</span>
        <input type="number" class="asset-input" data-idx="${idx}" value="${formatMoney(Math.abs(Number(acc.amount) || 0))}" placeholder="0">
      </div>
    `;
    list.appendChild(row);
  });

  function close() {
    overlay.remove();
  }

  overlay.querySelector('#asset-back').addEventListener('click', close);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close();
  });

  overlay.querySelector('#asset-save').addEventListener('click', () => {
    overlay.querySelectorAll('.asset-input').forEach(input => {
      const idx = parseInt(input.dataset.idx);
      const val = parseFloat(input.value) || 0;
      const acc = state.assetAccounts[idx];
      acc.amount = acc.debt ? -Math.abs(val) : Math.abs(val);
    });
    saveAssetAccounts();
    // 同步到旧的 money.total 以保持兼容
    state.money.total = calcAssetTotal();
    saveMoney();
    close();
    refreshMoneyView();
    renderProfileCard();
    renderTopbar();
  });
}

// 金钱领域 - 存钱子页
function renderSavePlan(mount) {
  if (!mount) return;
  mount.innerHTML = `
    <div class="soft-card">
      <div class="soft-card-title">${icon('target', 16)} 存钱计划</div>
      <div class="save-intro">
        <p>52 周攒钱：每周比上周多存 10 元，一年可存 ¥13,780。</p>
        <p>悄悄攒：把零散收入悄悄存起来，积少成多。</p>
      </div>
      <div class="save-progress-list" id="save-progress"></div>
    </div>
    <div class="soft-card">
      <div class="soft-card-title">${icon('plus', 16)} 添加存钱记录</div>
      <div class="review-datebar">
        <select class="pf-input" id="save-type">
          <option value="week52">52周攒钱</option>
          <option value="secret">悄悄攒</option>
        </select>
        <input type="number" class="pf-input" id="save-amount" placeholder="金额" style="max-width:100px">
        <button class="gold-btn" id="save-add">存入</button>
      </div>
    </div>
  `;

  const weekNow = 1;
  const weekTarget = 10 + (weekNow - 1) * 10;
  const secretAcc = state.assetAccounts.find(a => a.id === 'secret');
  const weekAcc = state.assetAccounts.find(a => a.id === 'week52');
  mount.querySelector('#save-progress').innerHTML = `
    <div class="save-row">
      <span>52周攒钱</span>
      <span class="save-amt">¥${formatMoney(Math.abs(weekAcc?.amount || 0))}</span>
    </div>
    <div class="save-row">
      <span>悄悄攒</span>
      <span class="save-amt">¥${formatMoney(Math.abs(secretAcc?.amount || 0))}</span>
    </div>
    <div class="save-row muted">
      <span>本周（第 ${weekNow} 周）建议存入</span>
      <span>¥${formatMoney(weekTarget)}</span>
    </div>
  `;

  mount.querySelector('#save-add').addEventListener('click', () => {
    const type = mount.querySelector('#save-type').value;
    const amount = parseFloat(mount.querySelector('#save-amount').value);
    if (isNaN(amount) || amount <= 0) return;
    const acc = state.assetAccounts.find(a => a.id === type);
    if (acc) {
      acc.amount = (Number(acc.amount) || 0) + amount;
      saveAssetAccounts();
      state.money.total = calcAssetTotal();
      saveMoney();
      renderContent();
    }
  });
}

// 金钱领域 - 理财子页
function renderInvestPage(mount) {
  if (!mount) return;
  mount.innerHTML = `
    <div class="soft-card">
      <div class="soft-card-title">${icon('chart', 16)} 理财学习</div>
      <div class="invest-tips">
        <p>· 先存够 3-6 个月生活费的应急金</p>
        <p>· 不了解的产品不碰，不懂不投</p>
        <p>· 分散投资，不把鸡蛋放一个篮子</p>
        <p>· 定期复盘，记录每次投资决策的原因</p>
      </div>
    </div>
    <div class="soft-card">
      <div class="soft-card-title">${icon('note', 16)} 理财笔记</div>
      <textarea class="soft-textarea" id="invest-note" placeholder="今天学到了什么理财知识？">${escapeHTML(state.investNote || '')}</textarea>
      <button class="gold-btn" id="invest-save" style="margin-top:10px">保存笔记</button>
    </div>
  `;

  mount.querySelector('#invest-save').addEventListener('click', () => {
    state.investNote = mount.querySelector('#invest-note').value;
    localStorage.setItem('xenos-invest-note', state.investNote);
  });
}

function renderMoneyDetail(card, dateKey) {
  const parts = dateKey.split('-');
  const y = parts[0], m = parts[1], d = parts[2];
  const txs = getTransactionsByDate(dateKey);
  const expense = getDayExpense(dateKey);
  const income = getDayIncome(dateKey);
  const over = expense > state.budget;

  card.innerHTML = `
    <div class="money-detail-header">
      <button class="text-btn" id="back-cal">← 返回月历</button>
      <div class="md-title">${y}年${parseInt(m)}月${parseInt(d)}日</div>
      <div class="md-budget">预算 ¥${formatMoney(state.budget)}</div>
    </div>

    <div class="money-total-card md-card">
      <div class="mt-row" style="margin-top:0">
        <div class="mt-col"><span class="mt-col-label">支出</span><span class="mt-col-val expense">-¥${formatMoney(expense)}</span></div>
        <div class="mt-col"><span class="mt-col-label">收入</span><span class="mt-col-val income">+¥${formatMoney(income)}</span></div>
      </div>
      <div class="budget-hint ${over ? 'over' : ''}" style="margin-top:10px">
        ${over ? `超出预算 ¥${formatMoney(expense - state.budget)} · 积分 -${Math.max(1, Math.round(expense - state.budget))}` : `未超预算 · 积分 +5`}
      </div>
    </div>

    <div class="section-card">
      <div class="section-header">
        <span class="section-icon">${icon('wallet', 16)}</span>
        <span class="section-title">当日明细</span>
      </div>
      <div class="tx-list" id="tx-list">
        ${txs.length === 0 ? '<p class="section-note">这一天还没有记录，添加一笔吧</p>' : ''}
        ${txs.map(t => `
          <div class="tx-row" data-id="${t.id}">
            <span class="tx-icon">${renderItemIcon(t.type === 'income' ? 'coins' : (state.expenseCategories.find(c => c.name === t.category)?.icon || 'box'), 18)}</span>
            <div class="tx-info">
              <div class="tx-cat">${t.category}</div>
              ${t.note ? `<div class="tx-note">${t.note}</div>` : ''}
            </div>
            <div class="tx-amt ${t.type === 'income' ? 'income' : 'expense'}">${t.type === 'income' ? '+' : '-'}¥${formatMoney(t.amount)}</div>
            <button class="icon-action delete" data-action="delete-tx"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>
          </div>
        `).join('')}
      </div>
    </div>

    <div class="section-card tx-add-card">
      <div class="section-header">
        <span class="section-icon">${icon('plus', 16)}</span>
        <span class="section-title">添加一笔</span>
      </div>
      <div class="tx-type-toggle">
        <button class="txt-btn active" data-type="expense">支出</button>
        <button class="txt-btn" data-type="income">收入</button>
      </div>
      <div class="tx-form">
        <input type="number" class="small-input" id="tx-amount" placeholder="金额（元）">
        <select class="small-input" id="tx-category"></select>
      </div>
      <input type="text" class="small-input" id="tx-note" placeholder="备注（可选）" style="margin-top:8px">
      <button class="plan-add-btn" id="tx-add-btn" style="width:100%;margin-top:10px;justify-content:center">添加记录</button>
    </div>
  `;
  (moneyMount || content).appendChild(card);

  card.querySelector('#back-cal').addEventListener('click', () => {
    state.moneyView = 'overview';
    state.selectedDate = null;
    refreshMoneyView();
  });

  // 删除交易
  card.querySelector('#tx-list').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action="delete-tx"]');
    if (!btn) return;
    const id = btn.closest('.tx-row').dataset.id;
    state.transactions = state.transactions.filter(t => t.id !== id);
    saveTransactions();
    refreshMoneyView();
  });

  let curType = 'expense';
  const catSelect = card.querySelector('#tx-category');
  function fillCategories() {
    const list = curType === 'income' ? state.incomeCategories : state.expenseCategories;
    catSelect.innerHTML = list.map(c => `<option value="${c.name}">${c.name}</option>`).join('');
  }
  fillCategories();

  card.querySelectorAll('.txt-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      card.querySelectorAll('.txt-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      curType = btn.dataset.type;
      fillCategories();
    });
  });

  card.querySelector('#tx-add-btn').addEventListener('click', () => {
    const amount = parseFloat(card.querySelector('#tx-amount').value);
    if (isNaN(amount) || amount <= 0) {
      alert('请输入有效金额');
      return;
    }
    const category = catSelect.value;
    const note = card.querySelector('#tx-note').value.trim();
    state.transactions.push({
      id: uid('tx'),
      date: dateKey,
      type: curType,
      amount: Math.round(amount * 100) / 100,
      category,
      note
    });
    saveTransactions();
    refreshMoneyView();
  });
}

// ---------- Body / Fitness / Diet helpers ----------
function getTodayKey() {
  return dateStr(new Date());
}

function parseDateKey(k) {
  const [y, m, d] = k.split('-').map(Number);
  return new Date(y, m - 1, d);
}
function weekdayCN(dt) {
  return ['日', '一', '二', '三', '四', '五', '六'][dt.getDay()];
}
function formatDateCN(k) {
  const d = parseDateKey(k);
  return `${d.getMonth() + 1}月${d.getDate()}日 周${weekdayCN(d)}`;
}

/* 自定义日期选择器：替换原生 input[type=date]，风格与全局 UI 统一 */
function openDatePicker(opts) {
  opts = opts || {};
  const initial = opts.initial || getTodayKey();
  const maxKey = opts.max || null;
  let view = parseDateKey(initial);
  let selectedKey = initial;

  const old = document.getElementById('dp-overlay');
  if (old) old.remove();

  const overlay = document.createElement('div');
  overlay.className = 'datepicker-overlay';
  overlay.id = 'dp-overlay';
  overlay.innerHTML = `
    <div class="datepicker-card">
      <div class="datepicker-head">
        <button class="datepicker-nav" data-dp-nav="-1" aria-label="上个月">‹</button>
        <div class="datepicker-title" id="dp-title"></div>
        <button class="datepicker-nav" data-dp-nav="1" aria-label="下个月">›</button>
      </div>
      <div class="datepicker-weekdays">
        <span>一</span><span>二</span><span>三</span><span>四</span><span>五</span><span>六</span><span>日</span>
      </div>
      <div class="datepicker-grid" id="dp-grid"></div>
      <div class="datepicker-actions">
        <button class="ghost-btn" id="dp-clear">清除</button>
        <button class="ghost-btn" id="dp-cancel">取消</button>
        <button class="gold-btn" id="dp-set">设置</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);

  const titleEl = overlay.querySelector('#dp-title');
  const gridEl = overlay.querySelector('#dp-grid');

  function fmtKey(y, m, d) {
    return dateStr(new Date(y, m, d));
  }
  function render() {
    const y = view.getFullYear();
    const m = view.getMonth();
    titleEl.textContent = `${y}年${m + 1}月`;
    const first = new Date(y, m, 1);
    const startDay = (first.getDay() + 6) % 7; // 周一为 0
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const prevDays = new Date(y, m, 0).getDate();
    const cells = [];
    for (let i = 0; i < startDay; i++) {
      const dd = prevDays - startDay + 1 + i;
      cells.push({ day: dd, muted: true, key: fmtKey(y, m - 1, dd) });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push({ day: d, muted: false, key: fmtKey(y, m, d) });
    }
    let idx = cells.length;
    while (idx % 7 !== 0) {
      const dd = idx - startDay - daysInMonth + 1;
      cells.push({ day: dd, muted: true, key: fmtKey(y, m + 1, dd) });
      idx++;
    }
    gridEl.innerHTML = cells.map(c => {
      let cls = 'dp-cell';
      if (c.muted) cls += ' muted';
      if (c.key === selectedKey) cls += ' selected';
      if (c.key === getTodayKey()) cls += ' today';
      if (maxKey && c.key > maxKey) cls += ' disabled';
      return `<button class="${cls}" data-dp-key="${c.key}">${c.day}</button>`;
    }).join('');
  }
  function close() {
    overlay.classList.remove('active');
    setTimeout(() => overlay.remove(), 150);
  }

  overlay.querySelector('[data-dp-nav="-1"]').addEventListener('click', () => {
    view = new Date(view.getFullYear(), view.getMonth() - 1, 1);
    render();
  });
  overlay.querySelector('[data-dp-nav="1"]').addEventListener('click', () => {
    view = new Date(view.getFullYear(), view.getMonth() + 1, 1);
    render();
  });
  gridEl.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-dp-key]');
    if (!btn || btn.classList.contains('disabled')) return;
    selectedKey = btn.dataset.dpKey;
    render();
  });
  overlay.querySelector('#dp-cancel').addEventListener('click', close);
  overlay.querySelector('#dp-clear').addEventListener('click', () => {
    if (opts.onClear) opts.onClear();
    close();
  });
  overlay.querySelector('#dp-set').addEventListener('click', () => {
    if (opts.onSelect) opts.onSelect(selectedKey);
    close();
  });
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close();
  });

  requestAnimationFrame(() => overlay.classList.add('active'));
  render();
}

function getTodayExercise() {
  const key = getTodayKey();
  if (!state.exerciseLogs[key]) {
    state.exerciseLogs[key] = [];
  }
  return state.exerciseLogs[key];
}

function getTodayDiet() {
  const key = getTodayKey();
  if (!state.dietLogs[key]) {
    state.dietLogs[key] = { meals: [], total: 0 };
  }
  return state.dietLogs[key];
}

function recalcExerciseCalories(list) {
  list.forEach(ex => {
    const met = EXERCISE_METS[ex.name] || EXERCISE_METS['其他运动'];
    ex.calories = Math.round(met * state.body.weight * ex.duration / 60);
  });
}

function estimateExerciseCalories(name, duration) {
  const met = EXERCISE_METS[name] || EXERCISE_METS['其他运动'];
  return Math.round(met * state.body.weight * duration / 60);
}

function parsePlanDuration(text) {
  const m = String(text).match(/(\d+)\s*分钟/);
  return m ? parseInt(m[1], 10) : 10;
}

function lookupFoodCalories(name) {
  const lib = state.foodLibrary;
  const q = name.trim();
  if (!q) return 0;
  const exact = lib.find(f => f.name === q);
  if (exact) return exact.calories;
  const contains = lib.find(f => q.includes(f.name) || f.name.includes(q));
  if (contains) return contains.calories;
  return 0;
}

function bodyCardHTML(body, title = '我的身体数据', mode = 'default') {
  if (mode === 'fitness') {
    const burn = calcTodayTotalBurn(body);
    const exerciseBurn = getTodayExerciseCalories();
    return `
      <div class="body-card body-card-fitness" data-body-card data-mode="fitness">
        <div class="body-card-header">
          <span class="section-title">${title}</span>
        </div>
        <div class="body-grid body-grid-2">
          <div class="body-cell"><span class="body-label">每日消耗大卡</span><span class="body-val">${burn.toFixed(0)} <small>kcal</small></span></div>
          <div class="body-cell"><span class="body-label">当日锻炼消耗</span><span class="body-val">${exerciseBurn.toFixed(0)} <small>kcal</small></span></div>
        </div>
      </div>
    `;
  }

  return `
    <div class="body-card" data-body-card>
      <div class="body-card-header">
        <span class="section-title">${title}</span>
      </div>
      <div class="body-grid body-grid-3">
        <div class="body-cell" data-edit="bodyFat"><span class="body-label">体脂率</span><span class="body-val">${formatBodyValue(body.bodyFat, '%')}</span></div>
        <div class="body-cell" data-edit="weight"><span class="body-label">体重</span><span class="body-val">${formatBodyValue(body.weight, 'kg')}</span></div>
        <div class="body-cell" data-edit="targetWeight"><span class="body-label">目标体重</span><span class="body-val">${formatBodyValue(body.targetWeight, 'kg')}</span></div>
      </div>
    </div>
  `;
}

function bindBodyCard(container, onUpdate) {
  container.addEventListener('click', async (e) => {
    const cell = e.target.closest('[data-edit]');
    if (!cell) return;
    const key = cell.dataset.edit;
    const current = state.body[key];
    const label = cell.querySelector('.body-label')?.textContent || key;
    const unit = key === 'bodyFat' ? '%' : 'kg';
    const v = await openModal(`修改${label}（${unit}，当前 ${current}${unit}）：`, current, `请输入${label}`);
    if (v !== null && v.trim() !== '' && !isNaN(parseFloat(v))) {
      state.body = { ...state.body, [key]: parseFloat(v) };
      delete state.body.activity;
      delete state.body.caloriesTarget;
      delete state.body.leg; // 旧字段迁移
      saveBody();
      Object.values(state.exerciseLogs).forEach(recalcExerciseCalories);
      saveExerciseLogs();
      onUpdate?.();
    }
  });
}

function drawTrendChart(containerSelector, measurements) {
  const container = document.querySelector(containerSelector);
  if (!container) return;
  container.innerHTML = '';
  if (!measurements || measurements.length < 2) {
    container.innerHTML = '<p class="chart-empty">记录至少 2 次身体维度后生成趋势图</p>';
    return;
  }
  const keys = ['weight', 'arm', 'waist', 'hip', 'thigh', 'calf'];
  const labels = { weight: '体重', arm: '大臂', waist: '腰围', hip: '臀围', thigh: '大腿', calf: '小腿' };
  const colors = { weight: '#E39183', arm: '#8FBFA9', waist: '#74A58E', hip: '#9EB5AB', thigh: '#A4B8AE', calf: '#D9C4A9' };
  const w = 600;
  const h = 220;
  const pad = { top: 16, right: 16, bottom: 28, left: 32 };
  const chartW = w - pad.left - pad.right;
  const chartH = h - pad.top - pad.bottom;

  // find min/max across all series
  let min = Infinity, max = -Infinity;
  measurements.forEach(m => {
    keys.forEach(k => {
      const v = m[k];
      if (typeof v === 'number') {
        if (v < min) min = v;
        if (v > max) max = v;
      }
    });
  });
  if (!isFinite(min) || !isFinite(max)) {
    container.innerHTML = '<p class="chart-empty">数据异常，无法绘图</p>';
    return;
  }
  const range = max - min || 1;
  min = Math.max(0, min - range * 0.1);
  max = max + range * 0.1;
  const xScale = (i) => pad.left + (i / (measurements.length - 1)) * chartW;
  const yScale = (v) => pad.top + chartH - ((v - min) / (max - min)) * chartH;

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
  svg.setAttribute('class', 'trend-chart');

  // grid lines
  for (let i = 0; i <= 4; i++) {
    const y = pad.top + (i / 4) * chartH;
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', pad.left);
    line.setAttribute('x2', pad.left + chartW);
    line.setAttribute('y1', y);
    line.setAttribute('y2', y);
    line.setAttribute('stroke', 'var(--border)');
    line.setAttribute('stroke-width', '1');
    svg.appendChild(line);
  }

  // lines
  keys.forEach(key => {
    const points = measurements.map((m, i) => `${xScale(i)},${yScale(m[key])}`).join(' ');
    const poly = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
    poly.setAttribute('points', points);
    poly.setAttribute('fill', 'none');
    poly.setAttribute('stroke', colors[key]);
    poly.setAttribute('stroke-width', '2');
    poly.setAttribute('stroke-linecap', 'round');
    poly.setAttribute('stroke-linejoin', 'round');
    svg.appendChild(poly);
    // dots
    measurements.forEach((m, i) => {
      const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      c.setAttribute('cx', xScale(i));
      c.setAttribute('cy', yScale(m[key]));
      c.setAttribute('r', '3');
      c.setAttribute('fill', colors[key]);
      svg.appendChild(c);
    });
  });

  // x labels
  measurements.forEach((m, i) => {
    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('x', xScale(i));
    text.setAttribute('y', h - 8);
    text.setAttribute('text-anchor', 'middle');
    text.setAttribute('fill', 'var(--text-muted)');
    text.setAttribute('font-size', '10');
    text.textContent = m.date.slice(5);
    svg.appendChild(text);
  });

  // y labels
  for (let i = 0; i <= 2; i++) {
    const v = min + (i / 2) * (max - min);
    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('x', pad.left - 6);
    text.setAttribute('y', pad.top + chartH - (i / 2) * chartH + 3);
    text.setAttribute('text-anchor', 'end');
    text.setAttribute('fill', 'var(--text-muted)');
    text.setAttribute('font-size', '9');
    text.textContent = Math.round(v);
    svg.appendChild(text);
  }

  // legend
  const legend = document.createElement('div');
  legend.className = 'chart-legend';
  keys.forEach(key => {
    const span = document.createElement('span');
    span.innerHTML = `<i style="background:${colors[key]}"></i>${labels[key]}`;
    legend.appendChild(span);
  });

  container.appendChild(svg);
  container.appendChild(legend);
}

// ---------- Fitness page ----------
function renderFitness() {
  content.innerHTML = '';
  const card = document.createElement('div');
  card.className = 'content-card fitness-card';

  const today = new Date();
  const weekdays = ['周日','周一','周二','周三','周四','周五','周六'];
  const dateString = `${today.getFullYear()}年${today.getMonth()+1}月${today.getDate()}日 ${weekdays[today.getDay()]}`;
  const todayEx = getTodayExercise();
  const totalEx = todayEx.reduce((s, ex) => s + (ex.calories || 0), 0);

  card.innerHTML = `
    <div class="page-header">
      <div>
        <h3 class="page-title-main">健身</h3>
        <p class="page-subtitle">${dateString}</p>
      </div>
    </div>

    <div class="fitness-body">${bodyCardHTML(state.body, '我的身体数据', 'fitness')}</div>

    <div class="section-card">
      <div class="section-header">
        <span class="section-icon">${icon('dumbbell', 16)}</span>
        <span class="section-title">今日运动</span>
        <span class="section-meta">已消耗 ${totalEx} kcal</span>
      </div>
      <div class="exercise-list" id="exercise-list"></div>
      <div class="exercise-add-row">
        <input type="text" id="ex-name" class="small-input" placeholder="运动名称，如爬楼梯">
        <input type="number" id="ex-duration" class="small-input" placeholder="分钟" value="20">
        <button class="btn btn-primary" id="ex-add-btn">新增</button>
      </div>
    </div>

    <div class="section-card">
      <div class="section-header">
        <span class="section-icon">🎬</span>
        <span class="section-title">跟练视频</span>
      </div>
      <div class="video-list" id="video-list"></div>
      <div class="video-add-row">
        <input type="text" id="video-title" class="small-input" placeholder="视频标题，如韩小四瘦腿">
        <input type="text" id="video-url" class="small-input" placeholder="链接">
        <button class="btn btn-primary" id="video-add-btn">新增</button>
      </div>
    </div>

    <div class="section-card">
      <div class="section-header">
        <span class="section-icon">📏</span>
        <span class="section-title">身体维度</span>
      </div>
      <div class="measure-form-row">
        <div class="measure-form">
          <label><span class="m-label">体重 kg</span><input type="number" id="m-weight" step="0.1"></label>
          <label><span class="m-label">大臂 cm</span><input type="number" id="m-arm" step="0.1"></label>
          <label><span class="m-label">腰围 cm</span><input type="number" id="m-waist" step="0.1"></label>
          <label><span class="m-label">臀围 cm</span><input type="number" id="m-hip" step="0.1"></label>
          <label><span class="m-label">大腿 cm</span><input type="number" id="m-thigh" step="0.1"></label>
          <label><span class="m-label">小腿 cm</span><input type="number" id="m-calf" step="0.1"></label>
        </div>
        <button class="btn btn-green save-measure-btn" id="save-measure-btn">保存</button>
      </div>
    </div>

    <div class="section-card">
      <div class="section-header">
        <span class="section-icon">${icon('ruler', 16)}</span>
        <span class="section-title">测量记录</span>
        <span class="section-meta measure-count-meta">${state.measurements.length} 条</span>
        ${state.measurements.length ? `<button class="text-btn measure-clear" id="measure-clear">清空记录</button>` : ''}
      </div>
      <div class="measure-history" id="measure-history"></div>
    </div>

    <div class="section-card">
      <div class="section-header">
        <span class="section-icon">${icon('chart', 16)}</span>
        <span class="section-title">综合趋势图</span>
      </div>
      <div class="chart-wrap" id="fitness-chart"></div>
    </div>
  `;
  content.appendChild(card);

  renderMeasurements();

  const bodyWrap = card.querySelector('.fitness-body');
  bindBodyCard(bodyWrap, () => renderFitness());

  const list = card.querySelector('#exercise-list');
  function renderExerciseList() {
    list.innerHTML = '';
    // 运动计划默认项（与计划页/健康领域同步）
    const planExercises = state.plans.filter(p => p.group === '运动计划');
    planExercises.forEach(plan => {
      const duration = parsePlanDuration(plan.text);
      const calories = estimateExerciseCalories(plan.text, duration);
      const row = document.createElement('div');
      row.className = 'exercise-row' + (plan.done ? ' done' : '');
      row.dataset.planId = plan.id;
      row.innerHTML = `
        <span class="ex-check"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></span>
        <span class="ex-name">${plan.text}</span>
        <span class="ex-duration">${duration} 分钟</span>
        <span class="ex-kcal">${calories} kcal</span>
        <button class="item-delete" data-del-type="plan" data-id="${plan.id}" aria-label="删除"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>
      `;
      list.appendChild(row);
    });
    // 自定义运动
    todayEx.forEach((ex, idx) => {
      const row = document.createElement('div');
      row.className = 'exercise-row' + (ex.done ? ' done' : '');
      row.dataset.idx = idx;
      row.innerHTML = `
        <span class="ex-check"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></span>
        <span class="ex-name">${ex.name}</span>
        <span class="ex-duration">${ex.duration} 分钟</span>
        <span class="ex-kcal">${ex.calories} kcal</span>
        <button class="item-delete" data-del-type="exercise" data-idx="${idx}" aria-label="删除"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>
      `;
      list.appendChild(row);
    });
    // 已消耗 = 自定义运动消耗 + 已完成运动计划估算消耗
    const planBurn = planExercises.filter(p => p.done).reduce((s, p) => {
      const d = parsePlanDuration(p.text);
      return s + estimateExerciseCalories(p.text, d);
    }, 0);
    const customBurn = todayEx.reduce((s, ex) => s + (ex.done ? (ex.calories || 0) : 0), 0);
    card.querySelector('.section-meta').textContent = `已消耗 ${planBurn + customBurn} kcal`;
    // 运动变化时同步更新身体卡片上的今日总消耗
    const tdeeEl = card.querySelector('.tdee-value');
    if (tdeeEl) tdeeEl.textContent = calcTodayTotalBurn(state.body);
  }
  renderExerciseList();

  const nameInput = card.querySelector('#ex-name');
  const durationInput = card.querySelector('#ex-duration');
  const addBtn = card.querySelector('#ex-add-btn');
  addBtn.addEventListener('click', () => {
    const name = nameInput.value.trim() || '其他运动';
    const duration = parseInt(durationInput.value) || 20;
    const calories = estimateExerciseCalories(name, duration);
    todayEx.push({ id: uid('ex'), name, duration, calories, done: false });
    saveExerciseLogs();
    nameInput.value = '';
    durationInput.value = '20';
    renderExerciseList();
  });

  list.addEventListener('click', (e) => {
    const check = e.target.closest('.ex-check');
    if (!check) return;
    const row = check.closest('.exercise-row');
    const planId = row.dataset.planId;
    if (planId) {
      togglePlanDone(planId);
    } else {
      const idx = parseInt(row.dataset.idx);
      todayEx[idx].done = !todayEx[idx].done;
      saveExerciseLogs();
      renderExerciseList();
    }
  });

  // workout videos
  const videoList = card.querySelector('#video-list');
  function renderVideoList() {
    videoList.innerHTML = '';
    if (state.workoutVideos.length === 0) {
      videoList.innerHTML = '<p class="video-empty">还没有收藏视频，点击下方添加</p>';
      return;
    }
    state.workoutVideos.forEach((v, idx) => {
      const host = getVideoHost(v.url);
      const valid = isVideoUrlValid(v.url);
      const el = document.createElement('div');
      el.className = 'video-card' + (valid ? '' : ' invalid');
      el.innerHTML = `
        <span class="video-play">▶</span>
        <span class="video-title">${v.title}</span>
        <span class="video-host">${host}${valid ? '' : ' · 链接无效'}</span>
        <button class="icon-action delete" data-idx="${idx}" data-action="delete-video"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>
      `;
      el.addEventListener('click', (e) => {
        if (e.target.closest('[data-action="delete-video"]')) return;
        openVideo(v.url, v.title);
      });
      videoList.appendChild(el);
    });
  }
  renderVideoList();

  const videoTitleInput = card.querySelector('#video-title');
  const videoUrlInput = card.querySelector('#video-url');
  const videoAddBtn = card.querySelector('#video-add-btn');
  videoAddBtn.addEventListener('click', () => {
    let title = videoTitleInput.value.trim();
    let url = videoUrlInput.value.trim();
    if (!url) return;
    if (!isVideoUrlValid(url)) {
      alert('请输入有效的 http/https 链接');
      return;
    }
    if (!title) {
      title = getVideoTitleFromUrl(url) || '未命名视频';
    }
    state.workoutVideos.push({ id: uid('wv'), title, url });
    saveWorkoutVideos();
    videoTitleInput.value = '';
    videoUrlInput.value = '';
    renderVideoList();
  });

  videoList.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action="delete-video"]');
    if (!btn) return;
    e.stopPropagation();
    const idx = parseInt(btn.dataset.idx);
    state.workoutVideos.splice(idx, 1);
    saveWorkoutVideos();
    renderVideoList();
  });

  card.querySelector('#save-measure-btn').addEventListener('click', () => {
    const get = id => parseFloat(card.querySelector(id)?.value) || 0;
    const todayKey = getTodayKey();
    const m = {
      date: todayKey,
      weight: get('#m-weight'),
      arm: get('#m-arm'),
      waist: get('#m-waist'),
      hip: get('#m-hip'),
      thigh: get('#m-thigh'),
      calf: get('#m-calf')
    };
    if (m.weight <= 0) {
      alert('请至少填写体重');
      return;
    }
    const existing = state.measurements.find(x => x.date === todayKey);
    if (existing) {
      Object.assign(existing, m);
    } else {
      state.measurements.push(m);
    }
    saveMeasurements();
    card.querySelectorAll('.measure-form input').forEach(i => i.value = '');
    renderMeasurements();
    drawTrendChart('#fitness-chart', state.measurements);
    updateMeasureHeader();
  });

  const clearBtn = card.querySelector('#measure-clear');
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      if (confirm('确定清空所有测量记录？此操作不可撤销。')) {
        state.measurements = [];
        saveMeasurements();
        renderMeasurements();
        drawTrendChart('#fitness-chart', state.measurements);
        updateMeasureHeader();
      }
    });
  }

  drawTrendChart('#fitness-chart', state.measurements);
}

function renderMeasurements() {
  const host = document.getElementById('measure-history');
  if (!host) return;
  if (!state.measurements.length) {
    host.innerHTML = '<p class="section-note">还没有测量记录，在上方保存一次吧。</p>';
    return;
  }
  const reversed = state.measurements.slice().reverse();
  const fmt = v => v ? v : '-';
  const rows = reversed.map((m, ri) => {
    const origIdx = state.measurements.length - 1 - ri;
    return `
      <tr>
        <td>${m.date}</td>
        <td>${fmt(m.weight)}</td>
        <td>${fmt(m.arm)}</td>
        <td>${fmt(m.waist)}</td>
        <td>${fmt(m.hip)}</td>
        <td>${fmt(m.thigh)}</td>
        <td>${fmt(m.calf)}</td>
        <td><button class="measure-del" data-idx="${origIdx}" aria-label="删除"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button></td>
      </tr>`;
  }).join('');
  host.innerHTML = `
    <div class="measure-table-wrap">
      <table class="measure-table">
        <thead>
          <tr>
            <th>日期</th>
            <th>体重(kg)</th>
            <th>大臂(cm)</th>
            <th>腰围(cm)</th>
            <th>臀围(cm)</th>
            <th>大腿(cm)</th>
            <th>小腿(cm)</th>
            <th></th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
  host.querySelectorAll('.measure-del').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.idx);
      state.measurements.splice(idx, 1);
      saveMeasurements();
      renderMeasurements();
      drawTrendChart('#fitness-chart', state.measurements);
      updateMeasureHeader();
    });
  });
}

// ---------- Diet page ----------
function renderDiet() {
  content.innerHTML = '';
  if (state.dietView === 'records') {
    renderDietRecords();
    return;
  }
  renderDietOverview();
}

function renderMemos() {
  content.innerHTML = '';
  const card = document.createElement('div');
  card.className = 'content-card memo-card';
  const today = new Date();
  const weekdays = ['周日','周一','周二','周三','周四','周五','周六'];
  const dateString = `${today.getFullYear()}年${today.getMonth()+1}月${today.getDate()}日 ${weekdays[today.getDay()]}`;

  card.innerHTML = `
    <div class="page-header">
      <div>
        <h3 class="page-title-main">碎碎念</h3>
        <p class="page-subtitle">${dateString}</p>
      </div>
    </div>
    <div class="memo-input-row">
      <input type="text" id="memo-text" class="small-input" placeholder="随手记点什么...">
      <button class="btn btn-primary" id="memo-add">+ 新增</button>
    </div>
    <div class="memo-list" id="memo-list"></div>
  `;
  content.appendChild(card);

  const list = card.querySelector('#memo-list');
  function renderList() {
    list.innerHTML = '';
    if (state.memos.length === 0) {
      list.innerHTML = '<p class="memo-empty">还没有碎碎念，写点什么吧</p>';
      return;
    }
    [...state.memos].reverse().forEach((m, idx) => {
      const row = document.createElement('div');
      row.className = 'memo-item';
      const time = m.time || '';
      row.innerHTML = `
        <div class="memo-bubble">
          <p class="memo-item-text">${m.text}</p>
          <span class="memo-item-time">${time}</span>
        </div>
        <button class="icon-action delete" data-idx="${state.memos.length - 1 - idx}" data-action="delete-memo"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>
      `;
      list.appendChild(row);
    });
  }
  renderList();

  const input = card.querySelector('#memo-text');
  const addBtn = card.querySelector('#memo-add');
  const addMemo = () => {
    const text = input.value.trim();
    if (!text) return;
    const now = new Date();
    const timeStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')} ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
    state.memos.push({ id: uid('memo'), text, time: timeStr });
    saveMemos();
    input.value = '';
    renderList();
  };
  addBtn.addEventListener('click', addMemo);
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') addMemo(); });

  list.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action="delete-memo"]');
    if (!btn) return;
    const idx = parseInt(btn.dataset.idx);
    state.memos.splice(idx, 1);
    saveMemos();
    renderList();
  });
}

function getDietTotals() {
  const base = calcTDEE(state.body);
  const exercise = getTodayExerciseCalories();
  const tdee = base + exercise;
  const todayLog = getTodayDiet();
  const total = todayLog.meals.reduce((s, m) => s + m.items.reduce((is, it) => is + (it.calories || 0), 0), 0);
  return { tdee, total, remaining: Math.max(0, tdee - total), gap: tdee - total, base, exercise };
}

function renderDietOverview() {
  content.innerHTML = '';
  const card = document.createElement('div');
  card.className = 'content-card diet-card';

  const { tdee, total, gap } = getDietTotals();
  const today = new Date();
  const weekdays = ['周日','周一','周二','周三','周四','周五','周六'];
  const dateString = `${today.getFullYear()}年${today.getMonth()+1}月${today.getDate()}日 ${weekdays[today.getDay()]}`;

  card.innerHTML = `
    <div class="diet-overview-header">
      <div>
        <h3 class="page-title-main">饮食</h3>
        <p class="page-subtitle">${dateString}</p>
      </div>
      <button class="text-btn diet-records-link" id="diet-records-link">饮食记录 <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg></button>
    </div>

    <div class="section-card diet-dashboard">
      <div class="calorie-gauge">
        <div class="gauge-label">热量缺口</div>
        <div class="gauge-value">${gap > 0 ? gap : 0}</div>
      </div>
      <div class="calorie-stats">
        <div class="calorie-stat">
          <div class="stat-icon">${icon('fire', 18)}</div>
          <div class="stat-label">总消耗</div>
          <div class="stat-value">${tdee} <span>千卡</span></div>
        </div>
        <div class="calorie-stat">
          <div class="stat-icon">${icon('utensils', 18)}</div>
          <div class="stat-label">总摄入</div>
          <div class="stat-value">${total} <span>千卡</span></div>
        </div>
      </div>
      <div class="meal-cards" id="meal-cards">
        <div class="meal-card" data-type="早餐">
          <div class="meal-card-icon">🍳</div>
          <div class="meal-card-name">早餐</div>
          <button class="meal-card-add">+</button>
        </div>
        <div class="meal-card" data-type="午餐">
          <div class="meal-card-icon">🍲</div>
          <div class="meal-card-name">午餐</div>
          <button class="meal-card-add">+</button>
        </div>
        <div class="meal-card" data-type="晚餐">
          <div class="meal-card-icon">🍕</div>
          <div class="meal-card-name">晚餐</div>
          <button class="meal-card-add">+</button>
        </div>
      </div>
      <div class="meal-extra-actions">
        <button class="text-btn" id="snack-btn">+ 加餐</button>
        <button class="text-btn" id="photo-record-btn">📷 拍照录入</button>
      </div>
      <input type="file" id="overview-photo" accept="image/*" capture="environment" hidden>
    </div>

    <div class="section-card">
      <div class="section-header">
        <span class="section-icon">${icon('note', 16)}</span>
        <span class="section-title">饮食计划 / 备忘录</span>
      </div>
      <div class="diet-memo" id="diet-memo"></div>
      <div class="memo-add-row">
        <input type="text" id="memo-input" class="small-input" placeholder="输入饮食安排或备忘，如晚餐吃西兰花鸡胸肉">
        <button class="btn btn-primary" id="memo-add-btn">+ 新增</button>
      </div>
    </div>
  `;
  content.appendChild(card);

  card.querySelector('#diet-records-link').addEventListener('click', () => {
    state.dietView = 'records';
    renderDiet();
  });

  // meal cards add (event delegation + per-button binding for mobile robustness)
  const mealCards = card.querySelector('#meal-cards');
  async function triggerMealAdd(type) {
    const text = await openModal(`添加${type}：食物名称 + 份量，如米饭 100g`, '', '请输入食物名称 + 份量') || '';
    if (text.trim()) {
      addDietMeal(type, text);
      renderDietOverview();
    }
  }
  mealCards.addEventListener('click', (e) => {
    const cardEl = e.target.closest('.meal-card');
    if (!cardEl) return;
    triggerMealAdd(cardEl.dataset.type);
  });
  mealCards.querySelectorAll('.meal-card-add').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const cardEl = e.target.closest('.meal-card');
      triggerMealAdd(cardEl.dataset.type);
    });
  });

  // snack
  card.querySelector('#snack-btn').addEventListener('click', async () => {
    const text = await openModal('添加加餐：食物名称 + 份量，如苹果 1个', '', '请输入食物名称 + 份量') || '';
    if (text.trim()) {
      addDietMeal('加餐', text);
      renderDietOverview();
    }
  });

  // photo
  const photoInput = card.querySelector('#overview-photo');
  card.querySelector('#photo-record-btn').addEventListener('click', () => photoInput.click());
  photoInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const url = await readFileAsDataURL(file);
    const name = await openModal('请填写照片中的食物名称：', '米饭', '请输入食物名称');
    if (name) {
      addDietMeal('加餐', name + ' 1份');
      renderDietOverview();
    }
    photoInput.value = '';
  });

  // memo
  const memoInput = card.querySelector('#memo-input');
  const memoAddBtn = card.querySelector('#memo-add-btn');
  const memoList = card.querySelector('#diet-memo');
  if (!state.dietMemos) state.dietMemos = loadDietMemos();
  function renderMemos() {
    memoList.innerHTML = '';
    if (state.dietMemos.length === 0) {
      memoList.innerHTML = '<p class="memo-empty">暂无备忘，可在上方输入</p>';
      return;
    }
    state.dietMemos.forEach((m, idx) => {
      const row = document.createElement('div');
      row.className = 'memo-row' + (m.done ? ' done' : '');
      row.dataset.idx = idx;
      row.innerHTML = `
        <span class="memo-check"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></span>
        <span class="memo-text">${m.text}</span>
        <button class="icon-action delete" data-idx="${idx}" data-action="delete-memo"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>
      `;
      memoList.appendChild(row);
    });
  }
  renderMemos();

  function addMemo() {
    const text = memoInput.value.trim();
    if (!text) return;
    state.dietMemos.push({ id: uid('memo'), text, done: false });
    saveDietMemos();
    memoInput.value = '';
    renderMemos();
  }
  memoAddBtn.addEventListener('click', addMemo);
  memoInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') addMemo(); });

  memoList.addEventListener('click', (e) => {
    const check = e.target.closest('.memo-check');
    if (check) {
      const row = check.closest('.memo-row');
      const idx = parseInt(row.dataset.idx);
      state.dietMemos[idx].done = !state.dietMemos[idx].done;
      saveDietMemos();
      renderMemos();
      return;
    }
    const btn = e.target.closest('[data-action="delete-memo"]');
    if (!btn) return;
    const idx = parseInt(btn.dataset.idx);
    state.dietMemos.splice(idx, 1);
    saveDietMemos();
    renderMemos();
  });
}

function renderDietRecords() {
  content.innerHTML = '';
  const card = document.createElement('div');
  card.className = 'content-card diet-card';

  const { tdee, total } = getDietTotals();
  const todayLog = getTodayDiet();
  const today = new Date();
  const weekdays = ['周日','周一','周二','周三','周四','周五','周六'];
  const dateString = `${today.getFullYear()}年${today.getMonth()+1}月${today.getDate()}日 ${weekdays[today.getDay()]}`;

  card.innerHTML = `
    <div class="diet-records-header">
      <button class="text-btn" id="back-to-overview"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg> 返回</button>
      <h3 class="page-title-main">饮食记录</h3>
      <span class="section-meta">${total} / ${tdee} kcal</span>
    </div>

    <div class="records-search">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
      <input type="text" id="food-search" class="small-input" placeholder="请输入食物名称">
    </div>

    <div class="records-date">
      <button class="text-btn" id="prev-date"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg></button>
      <span>${dateString}</span>
      <button class="text-btn" id="next-date"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg></button>
    </div>

    <div class="section-card records-meals" id="records-meals"></div>

    <div class="records-bottom">
      <button class="records-bottom-btn" id="today-recipes">
        <span class="rbb-icon">📋</span>
        <span>今日食谱</span>
      </button>
      <button class="records-bottom-btn" id="diet-analysis">
        <span class="rbb-icon">${icon('chart', 16)}</span>
        <span>饮食分析</span>
      </button>
    </div>
  `;
  content.appendChild(card);

  card.querySelector('#back-to-overview').addEventListener('click', () => {
    state.dietView = 'overview';
    renderDiet();
  });

  const mealsWrap = card.querySelector('#records-meals');
  const suggestions = {
    '早餐': '建议 ' + Math.round(tdee * 0.25) + '~' + Math.round(tdee * 0.35) + ' 千卡',
    '午餐': '建议 ' + Math.round(tdee * 0.35) + '~' + Math.round(tdee * 0.45) + ' 千卡',
    '晚餐': '建议 ' + Math.round(tdee * 0.25) + '~' + Math.round(tdee * 0.35) + ' 千卡',
    '加餐': '建议 0~' + Math.round(tdee * 0.1) + ' 千卡'
  };
  function renderRecordsMeals() {
    mealsWrap.innerHTML = '';
    const mealTypes = ['早餐', '午餐', '晚餐', '加餐'];
    const groups = {};
    todayLog.meals.forEach(m => {
      if (!groups[m.type]) groups[m.type] = [];
      groups[m.type].push(m);
    });

    mealTypes.forEach(type => {
      const items = groups[type] || [];
      const groupTotal = items.reduce((s, m) => s + m.items.reduce((is, it) => is + (it.calories || 0), 0), 0);
      const section = document.createElement('div');
      section.className = 'record-meal-group';
      section.innerHTML = `
        <div class="record-meal-title">
          <span class="record-meal-icon">${type === '早餐' ? '🍳' : type === '午餐' ? '🍲' : type === '晚餐' ? '🍕' : '🍊'}</span>
          <span>${type}</span>
          <span class="record-meal-kcal">${groupTotal} kcal</span>
          <button class="text-btn record-add-btn" data-type="${type}">+</button>
        </div>
        <div class="record-meal-suggest">${suggestions[type]}</div>
      `;
      if (items.length === 0) {
        section.innerHTML += `<p class="record-meal-empty">暂无记录</p>`;
      } else {
        items.forEach((meal, mIdx) => {
          meal.items.forEach((it, iIdx) => {
            const row = document.createElement('div');
            row.className = 'record-meal-row';
            row.innerHTML = `
              <span class="meal-dot"></span>
              <span class="meal-name">${it.name}</span>
              <span class="meal-kcal">${it.calories} kcal</span>
              <button class="icon-action delete" data-midx="${mIdx}" data-iidx="${iIdx}" data-type="${type}" data-action="delete-record-item"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>
            `;
            section.appendChild(row);
          });
        });
      }
      mealsWrap.appendChild(section);
    });
  }
  renderRecordsMeals();

  mealsWrap.addEventListener('click', async (e) => {
    const addBtn = e.target.closest('.record-add-btn');
    if (addBtn) {
      const type = addBtn.dataset.type;
      const text = await openModal(`添加${type}：食物名称 + 份量，如米饭 100g`, '', '请输入食物名称 + 份量') || '';
      if (text.trim()) {
        addDietMeal(type, text);
        renderDietRecords();
      }
      return;
    }
    const delBtn = e.target.closest('[data-action="delete-record-item"]');
    if (!delBtn) return;
    const type = delBtn.dataset.type;
    const mIdx = parseInt(delBtn.dataset.midx);
    const iIdx = parseInt(delBtn.dataset.iidx);
    const typeMeals = todayLog.meals.filter(m => m.type === type);
    const meal = typeMeals[mIdx];
    if (!meal) return;
    const realIdx = todayLog.meals.findIndex(m => m.id === meal.id);
    if (realIdx > -1) {
      todayLog.meals[realIdx].items.splice(iIdx, 1);
      if (todayLog.meals[realIdx].items.length === 0) todayLog.meals.splice(realIdx, 1);
      saveDietLogs();
      renderDietRecords();
    }
  });
}

function addDietMeal(type, text) {
  const todayLog = getTodayDiet();
  const match = text.match(/(.+?)\s*(\d+(?:\.\d+)?)\s*(g|克|ml|份|个|根|碗|勺|杯|片|串)?/);
  let name = text.trim();
  let qty = 1, unit = '份';
  if (match) {
    name = match[1].trim();
    qty = parseFloat(match[2]) || 1;
    unit = match[3] || '份';
  }
  const base = lookupFoodCalories(name);
  let calories = base;
  if ((unit === 'g' || unit === '克' || unit === 'ml') && base) {
    // 库中 g/ml 类食物统一按每100g/100ml计
    calories = Math.round(base * qty / 100);
  } else if (base) {
    calories = Math.round(base * qty);
  }
  todayLog.meals.push({ id: uid('meal'), type, items: [{ name, qty, unit, calories }] });
  saveDietLogs();
}

function loadDietMemos() {
  try {
    const data = localStorage.getItem('xenos-diet-memos');
    return data ? JSON.parse(data) : [];
  } catch (e) {
    return [];
  }
}

function saveDietMemos() {
  localStorage.setItem('xenos-diet-memos', JSON.stringify(state.dietMemos));
}

// ============ 新模块：通用工具与积分体系 ============
function escapeHTML(str) {
  return String(str == null ? '' : str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function pad2(n) { return String(n).padStart(2, '0'); }

function formatMMSS(sec) {
  const s = Math.max(0, Math.round(sec));
  return `${pad2(Math.floor(s / 60))}:${pad2(s % 60)}`;
}

function shiftDate(key, delta) {
  const [y, m, d] = key.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + delta);
  return dateStr(dt);
}

// ---- 积分 / 等级 ----
function getDomainPointsTotal() {
  let total = 0;
  Object.values(state.domains || {}).forEach(d => {
    Object.values((d && d.log) || {}).forEach(v => { total += Number(v) || 0; });
  });
  return total;
}

function getDomainPoints(key) {
  const d = state.domains[key];
  if (!d) return 0;
  return Object.values(d.log || {}).reduce((s, v) => s + (Number(v) || 0), 0);
}

function getPlanPoints() {
  const domainTaskTexts = new Set();
  Object.values(state.domains || {}).forEach(d => {
    (d.tasks || []).forEach(t => { if (t.text) domainTaskTexts.add(t.text); });
  });
  return state.plans
    .filter(p => p.done && !domainTaskTexts.has(p.text))
    .reduce((s, p) => s + (p.points || 0), 0);
}

function getFocusMinutes(dateKey) {
  return state.focusSessions
    .filter(s => !dateKey || s.date === dateKey)
    .reduce((s, item) => s + (Number(item.minutes) || 0), 0);
}

// 按领域（支线）统计专注分钟数，用于「继续专注」差异化统计
function getFocusMinutesByDomain(dateKey, domain) {
  return state.focusSessions
    .filter(s => (!dateKey || s.date === dateKey) && (s.domain || null) === domain)
    .reduce((s, item) => s + (Number(item.minutes) || 0), 0);
}

function getFocusPoints() {
  return Math.floor(getFocusMinutes() / 25) * 5;
}

function getReviewCount() {
  return Object.keys(state.dailyReviews || {})
    .filter(k => (state.dailyReviews[k].reflection || '').trim()).length;
}

function getTotalEarnedPoints() {
  return getDomainPointsTotal()
    + getPlanPoints()
    + getFocusPoints()
    + getReviewCount() * 5
    + getLanguagePoints()
    + Math.max(0, state.points || 0);
}

function getSpentPoints() {
  const list = (state.rewards && state.rewards.redeemed) || [];
  return list.reduce((s, r) => s + (Number(r.cost) || 0), 0);
}

function getAvailablePoints() {
  return Math.max(0, getTotalEarnedPoints() - getSpentPoints());
}

function getLevelInfo() {
  const total = getTotalEarnedPoints();
  const need = 100;
  return { level: Math.floor(total / need) + 1, exp: total % need, need, total };
}

function getLevelTitle(level) {
  const titles = ['觉醒者', '行动者', '坚持者', '掌控者', '深耕者', '长期主义者', '人生玩家'];
  return titles[Math.min(titles.length - 1, Math.floor((level - 1) / 3))];
}

// ---- 今日数据 ----
function getTodayExerciseMinutes(dateKey) {
  const list = state.exerciseLogs[dateKey || getTodayKey()] || [];
  return list.filter(e => e.done).reduce((s, e) => s + (Number(e.duration) || 0), 0);
}

function getTodayDomainTasks() {
  const today = getTodayKey();
  let total = 0;
  let done = 0;
  Object.values(state.domains || {}).forEach(d => {
    (d.tasks || []).forEach(t => {
      total++;
      if (t.done && t.doneDate === today) done++;
    });
  });
  return { total, done };
}

function getTodayProgress() {
  const dt = getTodayDomainTasks();
  const total = state.plans.length + dt.total;
  const done = state.plans.filter(p => p.done).length + dt.done;
  return { total, done, percent: total ? Math.round((done / total) * 100) : 0 };
}

function getTodayPoints() {
  const today = getTodayKey();
  let pts = 0;
  Object.values(state.domains || {}).forEach(d => { pts += Number((d.log || {})[today]) || 0; });
  pts += getPlanPoints();
  return pts;
}

// ---- 领域数据 ----
function getDomainKey(name) {
  return DOMAIN_CONFIG[name] ? DOMAIN_CONFIG[name].key : null;
}

function ensureDomain(key) {
  if (!state.domains[key]) state.domains[key] = { tasks: [], log: {} };
  if (!Array.isArray(state.domains[key].tasks)) state.domains[key].tasks = [];
  if (!state.domains[key].log) state.domains[key].log = {};
  return state.domains[key];
}

// 跨天自动重置勾选状态（历史积分保留在 log 中）
function normalizeDomainTasks(key) {
  const today = getTodayKey();
  ensureDomain(key).tasks.forEach(t => {
    if (t.done && t.doneDate !== today) t.done = false;
  });
}

function getDomainStreak(key) {
  const log = ensureDomain(key).log;
  let streak = 0;
  const d = new Date();
  if ((log[dateStr(d)] || 0) > 0) {
    streak = 1;
  }
  d.setDate(d.getDate() - 1);
  while ((log[dateStr(d)] || 0) > 0) {
    streak++;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}

function getWeeklyInsight(key, name) {
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const k = shiftDate(getTodayKey(), -i);
    const d = state.domains[key];
    days.push({ key: k, points: Number((d && d.log && d.log[k]) || 0) });
  }
  const total = days.reduce((s, d) => s + d.points, 0);
  const activeDays = days.filter(d => d.points > 0).length;
  const rate = Math.round((activeDays / 7) * 100);
  let text = '';
  if (rate >= 80) text = `本周${name}完成度很高，保持节奏即可，可以尝试增加难度或新习惯。`;
  else if (rate >= 50) text = `本周${name}完成度过半，建议把固定事项放到固定时段，减少决策消耗。`;
  else text = `本周${name}完成度偏低，建议先只保留 1-2 个核心动作，把任务做得足够小再启动。`;
  return { total, activeDays, rate, text };
}

function renderDomainInsight(key, name) {
  const insight = getWeeklyInsight(key, name);
  return `
    <div class="plan-insight-card">
      <div class="plan-insight-title">本周${name}洞察</div>
      <div class="plan-insight-item"><span>7 天总积分</span><strong>${insight.total}</strong></div>
      <div class="plan-insight-item"><span>活跃天数</span><strong>${insight.activeDays}/7</strong></div>
      <div class="plan-insight-item"><span>完成率</span><strong>${insight.rate}%</strong></div>
      <p class="plan-insight-text">${insight.text}</p>
    </div>
  `;
}

// ============ 专注时钟（番茄钟） ============
const FOCUS_RING_LEN = 2 * Math.PI * 52;

function openFocusModal(branchName) {
  if (!focusModal) return;
  state.focus.branch = branchName || null;
  renderFocusTicks();
  focusModal.classList.add('active');
  updateFocusKnob(state.focus.preset);
  updateFocusUI();
}

function closeFocusModal() {
  if (focusModal) focusModal.classList.remove('active');
}

function setFocusPreset(min) {
  state.focus.preset = min;
  state.focus.total = min * 60;
  state.focus.remaining = min * 60;
  pauseFocus();
  updateFocusUI();
}

function startFocus() {
  if (state.focus.running) return;
  if (state.focus.remaining <= 0) state.focus.remaining = state.focus.total;
  state.focus.running = true;
  state.focus.timer = setInterval(tickFocus, 1000);
  updateFocusUI();
}

function pauseFocus() {
  state.focus.running = false;
  if (state.focus.timer) clearInterval(state.focus.timer);
  state.focus.timer = null;
}

function toggleFocus() {
  if (state.focus.running) {
    pauseFocus();
    updateFocusUI();
  } else {
    startFocus();
  }
}

function resetFocus() {
  pauseFocus();
  state.focus.remaining = state.focus.total;
  updateFocusUI();
}

function tickFocus() {
  state.focus.remaining--;
  if (state.focus.remaining <= 0) {
    finishFocus();
    return;
  }
  updateFocusUI();
}

function finishFocus() {
  pauseFocus();
  const minutes = state.focus.preset;
  state.focusSessions.push({
    id: uid('fs'),
    date: getTodayKey(),
    minutes,
    domain: state.focus.branch || null,
    at: new Date().toISOString()
  });
  saveFocusSessions();
  state.focus.remaining = state.focus.total;
  updateFocusUI();
  renderProfileCard();
  renderTopbar();
  renderContent();
  setTimeout(() => alert(`专注完成，本次 ${minutes} 分钟，已记入今日专注时长`), 60);
}

function updateFocusUI() {
  const { total, remaining, running } = state.focus;
  const timeText = formatMMSS(remaining);
  const timeEl = document.getElementById('focus-time');
  if (timeEl) timeEl.textContent = timeText;
  if (fabTime) fabTime.textContent = timeText;
  if (fab) fab.classList.toggle('running', running);

  const ring = document.getElementById('focus-ring-fg');
  if (ring) {
    const pct = total > 0 ? remaining / total : 0;
    ring.style.strokeDasharray = FOCUS_RING_LEN;
    ring.style.strokeDashoffset = FOCUS_RING_LEN * (1 - pct);
  }

  const toggle = document.getElementById('focus-toggle');
  if (toggle) toggle.textContent = running ? '暂停' : (remaining < total ? '继续' : '开始');

  const minLabel = document.getElementById('focus-min-label');
  if (minLabel) minLabel.textContent = `${Math.round(state.focus.total / 60)} 分钟`;

  const note = document.getElementById('focus-note');
  if (note) note.textContent = `今日已专注 ${getFocusMinutes(getTodayKey())} 分钟 · 累计 ${getFocusMinutes()} 分钟`;

  updateFocusKnob(state.focus.preset);
}

// 专注时长环形拨盘（0-120 分钟，0 在顶部，顺时针，两圈共 720°）
const FOCUS_DIAL_MAX = 120;

function renderFocusTicks() {
  const g = document.getElementById('focus-ticks');
  if (!g || g.childElementCount) return;
  const cx = 60, cy = 60, r = 52;
  for (let i = 0; i < 12; i++) {
    const ang = (i / 12) * 2 * Math.PI - Math.PI / 2;
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', (cx + Math.cos(ang) * (r - 7)).toFixed(2));
    line.setAttribute('y1', (cy + Math.sin(ang) * (r - 7)).toFixed(2));
    line.setAttribute('x2', (cx + Math.cos(ang) * (r - 2)).toFixed(2));
    line.setAttribute('y2', (cy + Math.sin(ang) * (r - 2)).toFixed(2));
    line.setAttribute('class', 'fr-tick');
    g.appendChild(line);
  }
}

function updateFocusKnob(minutes) {
  const knob = document.getElementById('focus-knob');
  if (!knob) return;
  const m = Math.max(0, Math.min(FOCUS_DIAL_MAX, minutes));
  const ang = (m / FOCUS_DIAL_MAX) * 4 * Math.PI - Math.PI / 2;
  const cx = 60, cy = 60, r = 52;
  knob.setAttribute('cx', (cx + Math.cos(ang) * r).toFixed(2));
  knob.setAttribute('cy', (cy + Math.sin(ang) * r).toFixed(2));
}

function bindFocusDial() {
  const svg = document.getElementById('focus-ring-svg');
  if (!svg) return;
  let dragging = false;
  let lastAng = null;
  let accum = 0;
  function pointAngle(e) {
    const rect = svg.getBoundingClientRect();
    const px = e.clientX - (rect.left + rect.width / 2);
    const py = e.clientY - (rect.top + rect.height / 2);
    return Math.atan2(py, px);
  }
  function down(e) {
    dragging = true;
    lastAng = pointAngle(e);
    accum = (state.focus.preset / FOCUS_DIAL_MAX) * 4 * Math.PI;
    e.preventDefault();
  }
  function move(e) {
    if (!dragging) return;
    const ang = pointAngle(e);
    let d = ang - lastAng;
    if (d > Math.PI) d -= 2 * Math.PI;
    if (d < -Math.PI) d += 2 * Math.PI;
    accum += d;
    lastAng = ang;
    const m = Math.max(0, Math.min(FOCUS_DIAL_MAX, Math.round((accum / (4 * Math.PI)) * FOCUS_DIAL_MAX)));
    setFocusMinutes(m);
    e.preventDefault();
  }
  function up() { dragging = false; }
  svg.addEventListener('pointerdown', down);
  window.addEventListener('pointermove', move);
  window.addEventListener('pointerup', up);
}

// 悬浮挂件：可拖动吸附边缘，点击打开专注
function makeFabDraggable() {
  const wrap = document.getElementById('fab-wrap');
  if (!wrap || !fab) return;
  const TH = 8;
  let dragging = false, moved = false;
  let startX = 0, startY = 0, originX = 0, originY = 0;
  fab.addEventListener('pointerdown', (e) => {
    dragging = true; moved = false;
    startX = e.clientX; startY = e.clientY;
    const rect = wrap.getBoundingClientRect();
    originX = rect.left; originY = rect.top;
    fab.classList.add('dragging');
    if (fab.setPointerCapture) { try { fab.setPointerCapture(e.pointerId); } catch (err) {} }
    e.preventDefault();
  });
  fab.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    if (!moved && Math.hypot(dx, dy) < TH) return;
    moved = true;
    wrap.style.transition = 'none';
    wrap.style.right = 'auto';
    wrap.style.bottom = 'auto';
    wrap.style.left = (originX + dx) + 'px';
    wrap.style.top = (originY + dy) + 'px';
  });
  fab.addEventListener('pointerup', (e) => {
    if (!dragging) return;
    dragging = false;
    fab.classList.remove('dragging');
    if (!moved) { openFocusModal(); return; }
    const rect = wrap.getBoundingClientRect();
    const w = window.innerWidth, h = window.innerHeight;
    const cx = rect.left + rect.width / 2;
    wrap.style.transition = 'left .2s ease, top .2s ease, right .2s ease, bottom .2s ease';
    if (cx < w / 2) { wrap.style.left = '14px'; wrap.style.right = 'auto'; }
    else { wrap.style.left = 'auto'; wrap.style.right = '14px'; }
    let top = rect.top;
    const maxTop = h - rect.height - 14;
    if (top < 14) top = 14;
    if (top > maxTop) top = maxTop;
    wrap.style.top = top + 'px';
    wrap.style.bottom = 'auto';
    setTimeout(() => { wrap.style.transition = ''; }, 220);
  });
}

function setFocusMinutes(min) {
  state.focus.preset = min;
  state.focus.total = min * 60;
  state.focus.remaining = min * 60;
  pauseFocus();
  updateFocusUI();
}

// ============ 首页大时钟 ============
function stopClock() {
  if (state.clockTimer) {
    clearInterval(state.clockTimer);
    state.clockTimer = null;
  }
}

function startClock() {
  stopClock();
  const el = document.getElementById('overview-clock');
  if (!el) return;
  const tick = () => {
    const node = document.getElementById('overview-clock');
    if (!node) { stopClock(); return; }
    const now = new Date();
    node.textContent = `${pad2(now.getHours())}:${pad2(now.getMinutes())}:${pad2(now.getSeconds())}`;
  };
  tick();
  state.clockTimer = setInterval(tick, 1000);
}

// ============ 工作台首页 ============
// ============ 实时天气（Open-Meteo，无需 API key） ============
function weatherDesc(code) {
  if (code === 0) return '晴';
  if (code >= 1 && code <= 3) return '多云';
  if (code === 45 || code === 48) return '雾';
  if ((code >= 51 && code <= 55) || (code >= 61 && code <= 65) || (code >= 80 && code <= 82)) return '雨';
  if ((code >= 71 && code <= 77) || (code >= 85 && code <= 86)) return '雪';
  if (code >= 95) return '雷雨';
  return '多云';
}

async function fetchWeather(city) {
  try {
    const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=zh&format=json`;
    const geo = await fetch(geoUrl).then(r => r.json());
    if (!geo || !geo.results || !geo.results.length) return null;
    const { latitude, longitude } = geo.results[0];
    const wxUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true`;
    const w = await fetch(wxUrl).then(r => r.json());
    if (!w || !w.current_weather) return null;
    const temp = Math.round(w.current_weather.temperature);
    const desc = weatherDesc(w.current_weather.weathercode);
    return `${temp}° ${city} · ${desc}`;
  } catch (e) {
    return null;
  }
}

function overviewRingHTML(pct, colorClass, iconSvg, name, pctLabel, val, color, route) {
  const r = 26, c = 2 * Math.PI * r;
  pct = Math.max(0, Math.min(100, pct || 0));
  return `<div class="ov-ring ${colorClass}" data-jump="${escapeHTML(route || '')}">
    <div class="ov-ring-circle">
      <svg viewBox="0 0 64 64" class="ov-ring-svg">
        <circle class="mr-bg" cx="32" cy="32" r="${r}"></circle>
        <circle class="mr-fg" cx="32" cy="32" r="${r}" style="stroke-dasharray:${c.toFixed(1)};stroke-dashoffset:${(c * (1 - pct / 100)).toFixed(1)}"></circle>
      </svg>
      <span class="ov-ring-icon" style="color:${color}">${iconSvg}</span>
    </div>
    <div class="ov-ring-name">${name}</div>
    <div class="ov-ring-pct" style="color:${color}">${pctLabel}</div>
    <div class="ov-ring-val">${val}</div>
  </div>`;
}

// 根据任务文字推断跳转目标界面
function routeForText(text) {
  const n = String(text || '');
  if (/英语|单词|听力|音标|外语|口语/.test(n)) return '学习成长';
  if (/健身|运动|锻炼|跑步|力量|瑜伽|体态|拉伸/.test(n)) return '健身';
  if (/阅读|读书|书单|看书/.test(n)) return '阅读积累';
  if (/记账|存钱|理财|收支|预算|自媒体|副业|收入/.test(n)) return '记账';
  if (/冥想|护肤|睡眠|喝水|饮食|作息|早起|减肥/.test(n)) return '生活秩序';
  if (/写作|技能|复盘|计划|学习|提升|考证|备考/.test(n)) return '内在成长';
  return '我的支线';
}

// 首页主任务「+」号弹窗：可输入新增、删除、点击编辑（积分/时长）
function openMainTaskPicker() {
  if (!state.mainTasks) state.mainTasks = loadMainTasks();
  const SUGGESTS = [
    '完成英语核心词汇 30min',
    '每日 30 个单词',
    '阅读 30 分钟',
    '健身训练 20 分钟',
    '冥想 10 分钟',
    '写作 500 字',
    '护肤 routine',
    '学习一个新技能'
  ];
  const overlay = document.createElement('div');
  overlay.className = 'modal active';

  function bodyHTML() {
    const items = state.mainTasks.map((t, i) => `
      <div class="mtk-item">
        <span class="mtk-text">${escapeHTML(t.text)}</span>
        <span class="mtk-pts">+${t.points || 0}</span>
        <button class="mtk-edit" data-edit="${i}" aria-label="编辑">✎</button>
        <button class="mtk-del" data-del="${i}" aria-label="删除">✕</button>
      </div>`).join('');
    const suggests = SUGGESTS.filter(s => !state.mainTasks.some(t => t.text === s))
      .map(s => `<div class="mtk-suggest" data-add="${escapeHTML(s)}">+ ${escapeHTML(s)}</div>`).join('');
    return `
      <div class="modal-card mtk-card">
        <h3 class="modal-title">今日主任务</h3>
        <div class="mtk-add-row">
          <input class="mtk-input" id="mtk-input" placeholder="输入自定义任务，如：背单词 30 个">
          <button class="btn btn-primary mtk-add-btn">添加</button>
        </div>
        <div class="mtk-label">已添加（${state.mainTasks.length}）</div>
        <div class="mtk-list">${items || '<p class="mtk-empty">还没有添加，下面是推荐 ✨</p>'}</div>
        ${suggests ? `<div class="mtk-label">推荐添加</div><div class="mtk-suggests">${suggests}</div>` : ''}
        <div class="modal-actions"><button class="btn btn-secondary mtk-done">完成</button></div>
      </div>`;
  }

  overlay.innerHTML = bodyHTML();
  document.body.appendChild(overlay);

  function rerender() {
    const card = overlay.querySelector('.mtk-card');
    if (card) card.outerHTML = bodyHTML();
    bind();
  }
  async function editItem(i) {
    const t = state.mainTasks[i];
    if (!t) return;
    const nv = await openModal('编辑任务内容', t.text, '任务内容');
    if (nv === null || !nv.trim()) return;
    const np = await openModal('设置积分 / 时长', String(t.points || 0), '积分（如 10）');
    if (np === null) return;
    t.text = nv.trim();
    t.points = Math.max(0, parseInt(np, 10) || 0);
    saveMainTasks();
    rerender();
  }
  function bind() {
    const card = overlay.querySelector('.mtk-card');
    if (!card) return;
    card.querySelector('.mtk-add-btn').addEventListener('click', () => {
      const inp = card.querySelector('#mtk-input');
      const v = inp.value.trim();
      if (!v) return;
      state.mainTasks.push({ id: uid('mt'), text: v, points: 5, done: false, targetMinutes: 30 });
      saveMainTasks();
      rerender();
    });
    card.querySelectorAll('[data-add]').forEach(s => s.addEventListener('click', () => {
      state.mainTasks.push({ id: uid('mt'), text: s.dataset.add, points: 5, done: false, targetMinutes: 30 });
      saveMainTasks();
      rerender();
    }));
    card.querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', () => {
      state.mainTasks.splice(+b.dataset.del, 1);
      saveMainTasks();
      rerender();
    }));
    card.querySelectorAll('[data-edit]').forEach(b => b.addEventListener('click', () => editItem(+b.dataset.edit)));
    card.querySelector('.mtk-done').addEventListener('click', () => { overlay.remove(); renderContent(); });
  }
  bind();
  overlay.addEventListener('click', (e) => { if (e.target === overlay) { overlay.remove(); renderContent(); } });
}

function saveMainTasks() { saveJSON('xenos-main-tasks', state.mainTasks || []); }
function loadMainTasks() { return loadJSON('xenos-main-tasks', []); }

// 首页「今日支持任务 / 今日支线」数据
function loadSupportBranches() {
  return loadJSON('xenos-support-branches', [
    { id: 'sp1', title: '健身训练', sub: '20 分钟力量训练', kw: '健身', route: '健身', color: '#9ACB86', bg: '#F0F7EB', emoji: '🏋️' },
    { id: 'sp2', title: '阅读 30 分钟', sub: '持续输入，稳步积累', kw: '阅读', route: '阅读积累', color: '#B8AAD8', bg: '#F2EFF9', emoji: '📚' },
    { id: 'sp3', title: '自媒体更新', sub: '发布笔记 / 视频', kw: '自媒体', route: '记账', color: '#F7D88A', bg: '#FFF9E8', emoji: '📷' }
  ]);
}
function saveSupportBranches(list) { saveJSON('xenos-support-branches', list || []); }

// 今日支线「查看全部」弹窗：可添加不限量支线、按序排列、支持编辑/删除
function openSupportBranchPicker() {
  if (!state.supportBranches) state.supportBranches = loadSupportBranches();
  const overlay = document.createElement('div');
  overlay.className = 'modal active';
  function bodyHTML() {
    const items = state.supportBranches.map((c, i) => `
      <div class="mtk-item">
        <span class="mtk-swatch" style="background:${c.color}26;color:${c.color}">${c.emoji || '✦'}</span>
        <span class="mtk-text">${escapeHTML(c.title)}</span>
        <button class="mtk-edit" data-edit="${i}" aria-label="编辑">✎</button>
        <button class="mtk-del" data-del="${i}" aria-label="删除">✕</button>
      </div>`).join('');
    return `
      <div class="modal-card mtk-card">
        <h3 class="modal-title">今日支线</h3>
        <div class="mtk-add-row">
          <input class="mtk-input" id="sp-input" placeholder="添加一条支线，如：练字 15 分钟">
          <button class="btn btn-primary sp-add-btn">添加</button>
        </div>
        <div class="mtk-label">共 ${state.supportBranches.length} 条（按添加顺序排列）</div>
        <div class="mtk-list">${items || '<p class="mtk-empty">还没有支线，先添加一条吧 ✨</p>'}</div>
        <div class="modal-actions"><button class="btn btn-secondary sp-done">完成</button></div>
      </div>`;
  }
  overlay.innerHTML = bodyHTML();
  document.body.appendChild(overlay);
  function rerender() { const card = overlay.querySelector('.mtk-card'); if (card) card.outerHTML = bodyHTML(); bind(); }
  async function editItem(i) {
    const c = state.supportBranches[i];
    if (!c) return;
    const nv = await openModal('编辑支线', c.title, '支线名称');
    if (nv === null || !nv.trim()) return;
    const ns = await openModal('编辑说明', c.sub || '', '一句话说明');
    if (ns === null) return;
    c.title = nv.trim();
    c.sub = ns.trim();
    saveSupportBranches(state.supportBranches);
    rerender();
  }
  function bind() {
    const card = overlay.querySelector('.mtk-card');
    if (!card) return;
    card.querySelector('.sp-add-btn').addEventListener('click', () => {
      const inp = card.querySelector('#sp-input');
      const v = inp.value.trim();
      if (!v) return;
      const route = routeForText(v);
      const palette = { '健身': '#9ACB86', '阅读积累': '#B8AAD8', '记账': '#F7D88A', '学习成长': '#C9B6EC', '生活秩序': '#A6CF8C', '内在成长': '#F4B75B' };
      const color = palette[route] || '#F4B75B';
      state.supportBranches.push({ id: uid('sp'), title: v, sub: '按节奏稳步推进', kw: v.slice(0, 4), route, color, bg: color + '22', emoji: '✦' });
      saveSupportBranches(state.supportBranches);
      rerender();
    });
    card.querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', () => {
      state.supportBranches.splice(+b.dataset.del, 1);
      saveSupportBranches(state.supportBranches);
      rerender();
    }));
    card.querySelectorAll('[data-edit]').forEach(b => b.addEventListener('click', () => editItem(+b.dataset.edit)));
    card.querySelector('.sp-done').addEventListener('click', () => { overlay.remove(); renderContent(); });
  }
  bind();
  overlay.addEventListener('click', (e) => { if (e.target === overlay) { overlay.remove(); renderContent(); } });
}

// 本周睡眠趋势图（带坐标轴）
function sleepTrendChart(values) {
  if (!values || values.length < 2) return '<p class="chart-empty">数据不足</p>';
  const w = 220, h = 130;
  const pad = { t: 14, r: 10, b: 22, l: 24 };
  const cw = w - pad.l - pad.r, ch = h - pad.t - pad.b;
  const days = ['一', '二', '三', '四', '五', '六', '日'];
  const min = 5, max = 9;
  const x = i => pad.l + (i / (values.length - 1)) * cw;
  const y = v => pad.t + ch - ((Math.max(min, Math.min(max, v || min)) - min) / (max - min)) * ch;
  const pts = values.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  const area = `${pad.l},${pad.t + ch} ${pts} ${pad.l + cw},${pad.t + ch}`;
  const gradId = 'sleep-' + Math.random().toString(36).slice(2, 8);
  const gridLines = [5, 7, 9].map(v => {
    const gy = y(v);
    return `<line x1="${pad.l}" y1="${gy.toFixed(1)}" x2="${pad.l + cw}" y2="${gy.toFixed(1)}" stroke="#F3E8DF" stroke-width="0.8" stroke-dasharray="2 2"></line>`;
  }).join('');
  const yLabels = [5, 7, 9].map(v => `<text x="${pad.l - 4}" y="${y(v).toFixed(1)}" fill="#B8A99A" font-size="8" text-anchor="end" dominant-baseline="middle">${v}h</text>`).join('');
  const xLabels = days.slice(0, values.length).map((d, i) => `<text x="${x(i).toFixed(1)}" y="${(h - 6).toFixed(1)}" fill="#B8A99A" font-size="8" text-anchor="middle">${d}</text>`).join('');
  const dots = values.map((v, i) => `<circle cx="${x(i).toFixed(1)}" cy="${y(v).toFixed(1)}" r="2.5" fill="#B8AAD8" stroke="#fff" stroke-width="1.2"></circle>`).join('');
  return `<svg class="sleep-trend-chart" viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMid meet">
    <defs><linearGradient id="${gradId}" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#B8AAD8" stop-opacity="0.35"/><stop offset="100%" stop-color="#B8AAD8" stop-opacity="0.02"/></linearGradient></defs>
    ${gridLines}
    <polygon points="${area}" fill="url(#${gradId})"></polygon>
    <polyline points="${pts}" fill="none" stroke="#B8AAD8" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"></polyline>
    ${dots}
    ${yLabels}
    ${xLabels}
  </svg>`;
}

// 轻点 = 跳转；长按 = 编辑（移动端友好）
function bindItemPress(el, onTap, onLong) {
  let timer = null, longFired = false;
  el.addEventListener('pointerdown', () => {
    longFired = false;
    timer = setTimeout(() => { longFired = true; if (onLong) onLong(); }, 480);
  });
  ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev =>
    el.addEventListener(ev, () => { if (timer) { clearTimeout(timer); timer = null; } }));
  el.addEventListener('click', (e) => {
    if (longFired) { e.stopPropagation(); e.preventDefault(); longFired = false; return; }
    if (onTap) onTap(e);
  });
}

function renderOverview() {
  const page = document.createElement('div');
  page.className = 'page home-page';

  if (greetLine) greetLine.textContent = '人生计划工作台';

  const prog = getTodayProgress();
  const todayKey = getTodayKey();
  const exerciseToday = getTodayExerciseMinutes(todayKey);
  const streak = calcStreak();

  const EX_GOAL = 30;
  const sportPct = Math.min(100, Math.round(exerciseToday / EX_GOAL * 100));
  const sportVal = `${exerciseToday}/${EX_GOAL} 分钟`;

  const review = getReview(todayKey);
  const sleepHours = review.sleepHours || 0;
  const SLEEP_GOAL = 8;
  const sleepPct = Math.min(100, Math.round(sleepHours / SLEEP_GOAL * 100));
  const sleepVal = `${sleepHours.toFixed(1)}/${SLEEP_GOAL} 小时`;

  const langPct = state.language.dailyGoal ? Math.min(100, Math.round((state.language.todayCount || 0) / state.language.dailyGoal * 100)) : 0;
  const langVal = `${state.language.todayCount || 0}/${state.language.dailyGoal || 20} 分钟`;

  const planDone = state.plans.filter(p => p.done).length;
  const planTotal = state.plans.length;
  const habitPct = planTotal ? Math.round(planDone / planTotal * 100) : 0;
  const habitVal = `${planDone}/${planTotal} 项完成`;

  const greeting = getGreeting();
  const weather = '26° 上海 · 雷雨';

  // 主任务列表：只显示用户自己添加的 mainTasks，选多少显示多少，新增追加到底部
  if (!state.mainTasks) state.mainTasks = loadMainTasks();
  const mainTaskList = (state.mainTasks || []).filter(t => !t.done);

  if (!state.supportBranches) state.supportBranches = loadSupportBranches();
  const supportCards = state.supportBranches;

  // 图标 SVG
  const sportIcon = `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 15l4-4 3 3 4-4 5 5"/><path d="M4 15v4h16v-4"/></svg>`;
  const sleepIcon = `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`;
  const langIcon = `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/><path d="M8 7h8"/></svg>`;
  const habitIcon = `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;

  page.innerHTML = `
    <div class="hp-top-block">
    <div class="hp-header">
      <div class="hp-greet-wrap">
        <h2 class="hp-greet">${greeting}呀！☀️</h2>
        <p class="hp-sub">愿你稳步向理想的自己靠近✨</p>
        <div class="hp-weather" id="hp-weather">
          <span class="hp-weather-icon">${weatherBunnyIconSVG()}</span>
          <span id="hp-weather-text">${weather}</span>
        </div>
      </div>
    </div>

    <div class="quote-card soft-card hp-quote">
      <div class="hp-quote-left">
        <div class="hp-quote-label"><span class="hp-quote-star">⭐</span> 今日一句</div>
        <p class="quote-text">${escapeHTML(state.quote.text)}</p>
        <div class="quote-author">—— ${escapeHTML(state.quote.author || '佚名')}</div>
      </div>
      <div class="hp-quote-right">${quoteFlowersSVG()}</div>
    </div>
    </div>

    <div class="hp-section-title">今日概览 <span class="hp-more">${streak > 0 ? '🔥 已连续打卡 ' + streak + ' 天' : '今天也要好好生活'}</span></div>
    <div class="hp-rings">
      ${overviewRingHTML(habitPct, 'ring-peach', habitIcon, '习惯完成', habitPct + '%', habitVal, '#E8B4A8', '每日计划')}
      ${overviewRingHTML(sleepPct, 'ring-purple', sleepIcon, '睡眠', sleepPct + '%', sleepVal, '#B8AAD8', '健康')}
      ${overviewRingHTML(sportPct, 'ring-green', sportIcon, '运动', sportPct + '%', sportVal, '#9ACB86', '健康')}
      ${overviewRingHTML(langPct, 'ring-yellow', langIcon, '学英语', langPct + '%', langVal, '#F4B678', '学习成长')}
    </div>

    <div class="hp-section-title">今日主任务 <button class="hmt-add" id="hmt-add" title="添加主任务">+</button></div>
    <div class="hp-main-task">
      <div class="hmt-list">
        ${mainTaskList.length ? mainTaskList.map((t, i) => {
          const target = t.targetMinutes || 30;
          const actual = getFocusMinutesByDomain(todayKey, t.text);
          const pct = Math.min(100, target ? Math.round(actual / target * 100) : 0);
          const isPaused = state.focus.branch === t.text && !state.focus.running && state.focus.remaining < state.focus.total;
          const isDone = target > 0 && actual >= target;
          let focusLabel = '专注';
          let focusCls = 'hmt-focus';
          if (isPaused) { focusLabel = '继续专注'; }
          else if (isDone) { focusLabel = '已专注'; focusCls = 'hmt-focus hmt-focus-done'; }
          return `
          <div class="hmt-item" data-main-id="${t.id}">
            <div class="hmt-item-body">
              <div class="hmt-title-row">
                <h4 class="hmt-title">${escapeHTML(t.text)}</h4>
                <button class="hmt-del" data-del-main="${t.id}" aria-label="删除">✕</button>
              </div>
              <p class="hmt-sub">${i === 0 ? '第 1 优先级' : '按添加顺序'} · +${t.points || 0} 积分</p>
              <div class="hmt-prog-row">
                <div class="hmt-prog"><div class="hmt-prog-fill" style="width:${pct}%"></div></div>
              </div>
              <div class="hmt-meta-row">
                <span class="hmt-prog-text">${pct}% · ${actual}/${target} 分钟</span>
                <button class="hmt-target-edit" data-target-edit="${t.id}" title="编辑目标专注时长">🎯 ${target}分</button>
                <button class="${focusCls}" data-focus-main="${escapeHTML(t.text)}">${isPaused ? '▶ ' : (isDone ? '✓ ' : '▶ ')}${focusLabel}</button>
              </div>
            </div>
          </div>`;
        }).join('') : `
          <div class="hmt-item">
            <div class="hmt-item-body">
              <h4 class="hmt-title">每日 30 个单词</h4>
              <p class="hmt-sub">第 1 优先级 · +5 积分</p>
            </div>
          </div>`}
      </div>
    </div>

    <div class="hp-section-title"><span class="hp-sec-heart">💗</span> 今日支持任务 <span class="hp-more hp-link" id="hp-support-more">查看全部 ›</span></div>
    <div class="hp-support-scroll">
      ${supportCards.map(c => `
        <div class="hp-support-card" data-jump="${escapeHTML(c.route)}" style="border-color:${c.color}33;background:${c.bg}">
          <div class="hsc-top">
            <div class="hsc-icon" style="background:${c.color}26;color:${c.color}">${c.emoji}</div>
            <button class="hsc-arrow" aria-label="去完成"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg></button>
          </div>
          <div class="hsc-body">
            <div class="hsc-title">${c.title}</div>
            <div class="hsc-sub">${c.sub}</div>
          </div>
        </div>
      `).join('')}
    </div>

    <div class="hp-quick">
      <div class="hp-section-title">⚡ 快速记录</div>
      <div class="hp-quick-grid">
        <button class="hp-quick-btn hp-qb-sport" data-qr="sport"><span class="hq-icon hq-sport">🏃</span><span class="hq-label">记运动</span></button>
        <button class="hp-quick-btn hp-qb-sleep" data-qr="sleep"><span class="hq-icon hq-sleep">🌙</span><span class="hq-label">记睡眠</span></button>
        <button class="hp-quick-btn hp-qb-money" data-qr="money"><span class="hq-icon hq-money">💰</span><span class="hq-label">记收支</span></button>
        <button class="hp-quick-btn hp-qb-idea" data-qr="idea"><span class="hq-icon hq-idea">💡</span><span class="hq-label">记想法</span></button>
      </div>
    </div>
  `;
  content.appendChild(page);

  const wEl = page.querySelector('#hp-weather-text');
  if (wEl) fetchWeather('上海').then(t => { if (t) wEl.textContent = t; }).catch(() => {});

  const addBtn = page.querySelector('#hmt-add');
  if (addBtn) addBtn.addEventListener('click', openMainTaskPicker);
  const supportMore = page.querySelector('#hp-support-more');
  if (supportMore) supportMore.addEventListener('click', openSupportBranchPicker);

  // 今日主任务：轻点开始专注、长按出现删除按钮
  page.querySelectorAll('.hmt-item[data-main-id]').forEach(item => {
    const id = item.dataset.mainId;
    const t = (state.mainTasks || []).find(x => x.id === id);
    bindItemPress(item,
      () => { if (t) openFocusModal(t.text); },
      () => { item.classList.add('show-delete'); }
    );
  });
  page.querySelectorAll('[data-del-main]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.dataset.delMain;
      if ((state.mainTasks || []).some(t => t.id === id)) {
        state.mainTasks = (state.mainTasks || []).filter(t => t.id !== id);
        saveMainTasks();
      } else {
        state.plans = state.plans.filter(p => p.id !== id);
        savePlans();
      }
      renderContent();
    });
  });
  page.querySelectorAll('[data-focus-main]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      openFocusModal(btn.dataset.focusMain);
    });
  });
  // 编辑主任务目标专注时长（自定时长，驱动进度条与百分比）
  page.querySelectorAll('[data-target-edit]').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const id = btn.dataset.targetEdit;
      const tk = (state.mainTasks || []).find(x => x.id === id);
      if (!tk) return;
      const v = await openModal('设定目标专注时长（分钟）', String(tk.targetMinutes || 30), '如 30');
      if (v === null || v === '') return;
      const n = parseInt(v, 10);
      if (!isNaN(n) && n > 0) { tk.targetMinutes = n; saveMainTasks(); renderContent(); }
    });
  });
  // 点击卡片外部取消删除按钮显示
  page.addEventListener('click', (e) => {
    if (!e.target.closest('.hmt-item')) {
      page.querySelectorAll('.hmt-item.show-delete').forEach(el => el.classList.remove('show-delete'));
    }
  });

  page.querySelectorAll('[data-go]').forEach(b => b.addEventListener('click', () => selectItem(b.dataset.go)));
  page.querySelectorAll('[data-jump]').forEach(el => el.addEventListener('click', (e) => {
    if (e.target.closest('[data-del-main]')) return;
    selectItem(el.dataset.jump);
  }));
  page.querySelectorAll('.hp-quick-btn').forEach(b => b.addEventListener('click', () => openQuickRecordModal(b.dataset.qr)));
}

// ============ 人生领域页模板 ============
function renderDomainPage(name) {
  const cfg = DOMAIN_CONFIG[name];
  if (!cfg) return;
  const key = cfg.key;
  normalizeDomainTasks(key);
  const domain = ensureDomain(key);
  const todayKey = getTodayKey();
  const isToday = !state.viewDate || state.viewDate === todayKey;
  // 记账领域：在渲染任务/统计前先结算当日积分，避免勾选状态滞后一轮
  if (key === 'money' && isToday) settleMoneyDaily(todayKey);

  const page = document.createElement('div');
  page.className = 'page';

  const viewKey = state.viewDate || todayKey;
  const readOnly = !isToday;
  const historical = state.domainHistory[viewKey] && state.domainHistory[viewKey][key];
  const viewTasks = readOnly && historical ? historical.tasks : domain.tasks;
  const activeTag = (state.domainTagFilter && state.domainTagFilter[key]) || '';

  const doneCount = viewTasks.filter(t => t.done).length;
  const totalCount = viewTasks.length;
  const percent = totalCount ? Math.round((doneCount / totalCount) * 100) : 0;

  page.innerHTML = `
    <div class="domain-hero">
      <button class="domain-back" data-action="back">‹ 返回概览</button>
      <div class="domain-head">
        <div class="domain-icon">${icon(cfg.icon, 24)}</div>
        <div>
          <h3 class="domain-title">${name}</h3>
          <p class="domain-subtitle">${cfg.subtitle}</p>
        </div>
      </div>
      ${cfg.tags && cfg.tags.length ? `<div class="domain-tags tag-filter">${cfg.tags.map(t => `<button class="tag-chip${activeTag === t ? ' active' : ''}" data-tagfilter="${escapeHTML(t)}">${escapeHTML(t)}</button>`).join('')}</div>` : ''}
    </div>

    <div class="domain-datebar">
      <button class="ghost-btn nav-arrow" data-nav="-1">‹</button>
      <input type="date" id="domain-date" class="domain-date-pill" value="${viewKey}" style="display:none">
      <button class="domain-date-pill date-trigger" id="domain-date-trigger" data-date="${viewKey}">${formatDateCN(viewKey)}</button>
      <button class="ghost-btn nav-arrow" data-nav="1">›</button>
      ${readOnly ? '<button class="ghost-btn" data-nav="today">当日</button>' : '<button class="ghost-btn" data-nav="today">当日</button>'}
    </div>

    <div class="stat-boxes">
      <div class="stat-box">
        <span class="stb-icon ic-green"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#5DAE6C" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="8"/><path d="M12 8v8M9.5 10.2c0-1 1.1-1.7 2.5-1.7s2.5 .7 2.5 1.7-1.1 1.5-2.5 1.5-2.5 .7-2.5 1.7 1.1 1.7 2.5 1.7 2.5-.7 2.5-1.7"/></svg></span>
        <div class="stb-val">${getDomainPoints(key)}</div><div class="stb-label">累计积分</div>
      </div>
      <div class="stat-box">
        <span class="stb-icon ic-yellow"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#E8A24E" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"><path d="M12 3c1 3-2 4-2 7a2 2 0 0 0 4 0c0-1-.4-1.6-1-2 2 1 4 3 4 6a5 5 0 0 1-9.6-2A5 5 0 0 1 17 9c0-4.2-3.6-6-5-11z"/></svg></span>
        <div class="stb-val">${getDomainStreak(key)}</div><div class="stb-label">连续天数</div>
      </div>
      <div class="stat-box">
        <span class="stb-icon ic-purple"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#9C8AD0" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg></span>
        <div class="stb-val">${percent}%</div><div class="stb-label">${readOnly ? viewKey.slice(5) : '今日进度'}</div>
      </div>
    </div>

    <div class="soft-card" id="domain-extra" hidden></div>

    <div class="soft-card">
      <div class="soft-card-title">${icon('briefcase', 16)} 工具 / 资产</div>
      <div class="tool-grid" id="domain-tools"></div>
    </div>

    <div class="soft-card">
      <div class="soft-card-title">${icon('check', 16)} 每日打卡${readOnly ? ` · ${viewKey}（只读）` : `<span class="stitle-meta">今日 +${domain.log[todayKey] || 0} 分</span>`}</div>
      <div class="task-list" id="domain-tasks"></div>
      ${readOnly ? '<p class="section-note">历史日期为只读快照，切换回今天可继续打卡。</p>' : `<div class="review-datebar" style="margin-top:12px;">
        <input type="text" class="pf-input" id="domain-new-task" placeholder="添加一个每日任务...">
        <input type="number" class="pf-input" id="domain-new-points" value="5" style="max-width:72px;">
        <button class="gold-btn" id="domain-add-task">添加任务</button>
      </div>`}
    </div>

    <div id="domain-mount"></div>

    <div class="soft-card" id="domain-insight-card" hidden></div>
  `;
  content.appendChild(page);

  // 任务3：本周领域洞察移到页面最下方（所有 body 数据卡之后）
  const insightCard = page.querySelector('#domain-insight-card');
  if (insightCard && (key === 'health' || key === 'money')) {
    insightCard.innerHTML = renderDomainInsight(key, name);
    insightCard.hidden = false;
  }

  page.querySelector('[data-action="back"]').addEventListener('click', () => {
    state.viewDate = '';
    selectItem('工作台首页');
  });

  // 日期导航
  page.querySelectorAll('[data-nav]').forEach(btn => {
    btn.addEventListener('click', () => {
      const nav = btn.dataset.nav;
      state.viewDate = nav === 'today' ? '' : shiftDate(viewKey, Number(nav));
      renderContent();
    });
  });
  const dateInput = page.querySelector('#domain-date');
  if (dateInput) dateInput.addEventListener('change', (e) => {
    if (e.target.value) { state.viewDate = e.target.value; renderContent(); }
  });

  const dateTrigger = page.querySelector('#domain-date-trigger');
  if (dateTrigger) {
    dateTrigger.addEventListener('click', () => {
      openDatePicker({
        initial: viewKey,
        onSelect: (k) => {
          if (dateInput) dateInput.value = k;
          dateTrigger.textContent = formatDateCN(k);
          dateTrigger.dataset.date = k;
          state.viewDate = k;
          renderContent();
        }
      });
    });
  }

  // 标签筛选
  page.querySelectorAll('[data-tagfilter]').forEach(btn => {
    btn.addEventListener('click', () => {
      if (!state.domainTagFilter) state.domainTagFilter = {};
      state.domainTagFilter[key] = state.domainTagFilter[key] === btn.dataset.tagfilter ? '' : btn.dataset.tagfilter;
      renderContent();
    });
  });

  // 选中分类标签时高亮对应「每日打卡」卡片区域（border 变主色、背景加浅主色）
  const tasksCard = page.querySelector('#domain-tasks') && page.querySelector('#domain-tasks').closest('.soft-card');
  if (tasksCard) tasksCard.classList.toggle('tag-highlight', !!activeTag);

  // 工具入口
  const tools = page.querySelector('#domain-tools');
  (cfg.tools || []).forEach(tool => {
    const btn = document.createElement('button');
    btn.className = 'tool-btn';
    btn.innerHTML = `<span class="tb-icon">${icon(tool.icon, 18)}</span><span><b>${escapeHTML(tool.name)}</b><span class="tb-sub">${escapeHTML(tool.sub)}</span></span>`;
    btn.addEventListener('click', () => {
      if (tool.action === 'focus') { openFocusModal(); return; }
      if (tool.action === 'looks-content') { state.looksType = tool.payload; selectItem('looks-content'); return; }
      selectItem(tool.target);
    });
    tools.appendChild(btn);
  });

  // 任务列表
  const taskList = page.querySelector('#domain-tasks');
  function taskMatchesTag(t) {
    if (!activeTag) return true;
    return getPlanTag(t.text) === activeTag;
  }
  function renderTasks() {
    taskList.innerHTML = '';
    const planTasks = !readOnly && name === '健康' ? state.plans.filter(p => p.group === '运动计划') : [];
    const showTasks = viewTasks.filter(taskMatchesTag);
    const showPlans = planTasks.filter(taskMatchesTag);
    if (!showTasks.length && !showPlans.length) {
      taskList.innerHTML = '<p class="empty-note">' + (readOnly ? '这一天没有打卡记录' : '还没有任务，先添加一个吧') + '</p>';
      return;
    }
    showTasks.forEach(task => {
      const row = document.createElement('div');
      row.className = 'task-row' + (task.done ? ' done' : '');
      row.innerHTML = `
        <span class="task-check"><svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg></span>
        <span class="task-text">${escapeHTML(task.text)}</span>
        <span class="task-points">+${task.points}</span>
        ${readOnly ? '' : `<button class="item-delete" data-del-type="domain-task" data-id="${task.id}" data-domain="${key}" aria-label="删除"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>`}
      `;
      if (!readOnly) {
        row.addEventListener('click', (e) => {
          if (e.target.closest('.item-delete')) return;
          toggleDomainTask(key, task.id);
        });
      }
      taskList.appendChild(row);
    });
    showPlans.forEach(plan => {
      const row = document.createElement('div');
      row.className = 'task-row plan-task-row' + (plan.done ? ' done' : '');
      row.innerHTML = `
        <span class="task-check"><svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg></span>
        <span class="task-text">${escapeHTML(plan.text)}</span>
        <span class="task-points">+${plan.points}</span>
        <button class="item-delete" data-id="${plan.id}" data-del-type="plan" aria-label="删除"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>
      `;
      row.addEventListener('click', (e) => {
        if (e.target.closest('.item-delete')) return;
        togglePlanDone(plan.id);
      });
      taskList.appendChild(row);
    });
  }
  renderTasks();

  if (!readOnly) {
    const addTask = () => {
      const input = page.querySelector('#domain-new-task');
      const ptsInput = page.querySelector('#domain-new-points');
      const text = input.value.trim();
      if (!text) return;
      const points = Math.max(0, parseInt(ptsInput.value) || 5);
      domain.tasks.push({ id: uid(key + '-t'), text, points, done: false, doneDate: '' });
      saveDomains();
      input.value = '';
      renderContent();
    };
    page.querySelector('#domain-add-task').addEventListener('click', addTask);
    page.querySelector('#domain-new-task').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') addTask();
    });
  }

  // 健康领域：身体数据卡 + 快捷入口
  if (name === '健康' && !readOnly) {
    const extra = page.querySelector('#domain-extra');
    extra.hidden = false;
    extra.innerHTML = `<div class="soft-card-title">🫀 身体数据</div>` + bodyCardHTML(state.body, '我的身体数据');
    bindBodyCard(extra, () => renderContent());
  }

  // 记账领域：内嵌记账页 + 子标签导航
  if (name === '记账') {
    // 隐藏「工具/资产」section
    const toolsCard = page.querySelector('#domain-tools').closest('.soft-card');
    if (toolsCard) toolsCard.hidden = true;

    // 把标签换成可点击的子视图切换标签
    const tagsEl = page.querySelector('.domain-tags');
    if (tagsEl && cfg.subTabs) {
      tagsEl.innerHTML = cfg.subTabs.map(tab => `
        <button class="tag-chip sub-tab${state.moneySubView === tab.key ? ' active' : ''}" data-sub="${tab.key}">${tab.name}</button>
      `).join('');
      tagsEl.querySelectorAll('[data-sub]').forEach(btn => {
        btn.addEventListener('click', () => {
          state.moneySubView = btn.dataset.sub;
          renderContent();
        });
      });
    }

    const mount = page.querySelector('#domain-mount');
    if (state.moneySubView === 'ledger') {
      renderMoney({ append: true, mount });
    } else if (state.moneySubView === 'save') {
      renderSavePlan(mount);
    } else if (state.moneySubView === 'invest') {
      renderInvestPage(mount);
    }
  }
}

function adjustDomainLog(key, dateKey, delta) {
  const domain = ensureDomain(key);
  const next = (Number(domain.log[dateKey]) || 0) + delta;
  if (next > 0) domain.log[dateKey] = next;
  else delete domain.log[dateKey];
}

function syncPlanWithDomainTask(plan) {
  Object.entries(state.domains || {}).forEach(([key, domain]) => {
    const task = (domain.tasks || []).find(t => t.text === plan.text);
    if (!task || task.done === plan.done) return;
    const today = getTodayKey();
    task.done = plan.done;
    task.doneDate = plan.done ? today : '';
    adjustDomainLog(key, today, plan.done ? (task.points || 0) : -(task.points || 0));
  });
  saveDomains();
}

function syncDomainTaskWithPlan(task, domainKey) {
  const plan = state.plans.find(p => p.text === task.text);
  if (!plan || plan.done === task.done) return;
  plan.done = task.done;
  savePlans();
}

function togglePlanDone(planId) {
  const plan = state.plans.find(p => p.id === planId);
  if (!plan) return;
  plan.done = !plan.done;
  savePlans();
  syncPlanWithDomainTask(plan);
  updateTodayCheckin();
  renderProfileCard();
  renderTopbar();
  renderContent();
}

function toggleDomainTask(key, taskId) {
  const domain = ensureDomain(key);
  const task = domain.tasks.find(t => t.id === taskId);
  if (!task) return;
  const today = getTodayKey();
  task.done = !task.done;
  if (task.done) {
    task.doneDate = today;
    adjustDomainLog(key, today, task.points || 0);
  } else {
    task.doneDate = '';
    adjustDomainLog(key, today, -(task.points || 0));
  }
  syncDomainTaskWithPlan(task, key);
  saveDomains();
  renderProfileCard();
  renderTopbar();
  renderContent();
}

// ============ 每日复盘 ============
function getReview(dateKey) {
  if (!state.dailyReviews[dateKey]) {
    state.dailyReviews[dateKey] = { ...DEFAULT_DAILY_REVIEW };
  }
  return state.dailyReviews[dateKey];
}

function renderDailyReview() {
  const dateKey = state.reviewDate || getTodayKey();
  state.reviewDate = dateKey;
  const review = getReview(dateKey);
  const isToday = dateKey === getTodayKey();

  const focusMin = isToday ? getFocusMinutes(dateKey) : (getFocusMinutes(dateKey) || review.focusMinutes || 0);
  const exerciseMin = isToday ? getTodayExerciseMinutes(dateKey) : (review.exerciseMinutes || 0);
  const prog = getTodayProgress();
  const dayPoints = Object.values(state.domains || {})
    .reduce((s, d) => s + (Number((d.log || {})[dateKey]) || 0), 0);

  const page = document.createElement('div');
  page.className = 'page';
  page.innerHTML = `
    <div class="review-datebar">
      <button class="ghost-btn nav-arrow" data-nav="-1">‹</button>
      <input type="date" id="review-date" value="${dateKey}" style="display:none">
      <button class="ghost-btn date-trigger" id="review-date-trigger" data-date="${dateKey}">${formatDateCN(dateKey)}</button>
      <button class="ghost-btn nav-arrow" data-nav="1">›</button>
      <button class="ghost-btn" data-nav="today">当日</button>
    </div>

    <div class="review-stats">
      <div class="review-stat" data-jump="每日计划"><div class="rs-val">${isToday ? prog.done : '-'}</div><div class="rs-label">完成任务</div></div>
      <div class="review-stat" data-jump="本周洞察"><div class="rs-val">${focusMin}</div><div class="rs-label">专注分钟</div></div>
      <div class="review-stat" data-jump="成就殿堂"><div class="rs-val gold">${dayPoints}</div><div class="rs-label">当日积分</div></div>
      <div class="review-stat" data-jump="本周洞察"><div class="rs-val">${calcStreak()}</div><div class="rs-label">连续天数</div></div>
    </div>

    <div class="soft-card">
      <div class="soft-card-title">${icon('note', 16)} 反思与规划</div>
      <textarea class="soft-textarea" id="rv-reflection" placeholder="今天做得好的三件事 / 可以改进的一件事 / 明天最重要的一件事...">${escapeHTML(review.reflection || '')}</textarea>
      <div class="focus-actions" style="margin-top:10px;">
        <button class="gold-btn" id="rv-save">保存复盘</button>
      </div>
    </div>

    <div id="review-plan-mount"></div>
  `;
  content.appendChild(page);

  // 复盘页内嵌当日/历史计划模块
  if (isToday) {
    renderDailyPlan(page.querySelector('#review-plan-mount'));
  } else {
    renderHistoricalPlan(page.querySelector('#review-plan-mount'), dateKey);
  }

  page.querySelectorAll('[data-nav]').forEach(btn => {
    btn.addEventListener('click', () => {
      const nav = btn.dataset.nav;
      state.reviewDate = nav === 'today' ? getTodayKey() : shiftDate(dateKey, Number(nav));
      renderContent();
    });
  });

  page.querySelectorAll('[data-jump]').forEach(el => {
    el.addEventListener('click', () => selectItem(el.dataset.jump));
  });

  page.querySelector('#review-date').addEventListener('change', (e) => {
    if (e.target.value) {
      state.reviewDate = e.target.value;
      renderContent();
    }
  });

  const reviewTrigger = page.querySelector('#review-date-trigger');
  if (reviewTrigger) {
    reviewTrigger.addEventListener('click', () => {
      openDatePicker({
        initial: dateKey,
        onSelect: (k) => {
          const ri = page.querySelector('#review-date');
          if (ri) ri.value = k;
          reviewTrigger.textContent = formatDateCN(k);
          reviewTrigger.dataset.date = k;
          state.reviewDate = k;
          renderContent();
        }
      });
    });
  }

  page.querySelector('#rv-save').addEventListener('click', () => {
    review.reflection = page.querySelector('#rv-reflection').value;
    review.focusMinutes = focusMin;
    saveDailyReviews();
    renderProfileCard();
    renderTopbar();
    const tip = page.querySelector('#rv-tip');
    if (tip) tip.textContent = '已保存 ✓ ' + new Date().toLocaleTimeString('zh-CN');
  });
}

function renderDailyReviewInsight() {
  const insights = getWeeklyPlanInsight();
  return `
    <div class="plan-insight-card">
      <div class="plan-insight-title">本周计划洞察</div>
      ${insights.map(t => `<p class="plan-insight-text">${t}</p>`).join('')}
    </div>
  `;
}

// ============ 本周洞察 ============
function renderInsights() {
  const page = document.createElement('div');
  page.className = 'page';

  const totalFocus = getFocusMinutes();
  const totalExercise = Object.values(state.exerciseLogs || {})
    .reduce((s, list) => s + list.filter(e => e.done).reduce((a, e) => a + (Number(e.duration) || 0), 0), 0);
  const checkinDays = Object.keys(state.checkins || {}).length;
  const reviewCount = getReviewCount();
  const totalIncome = state.transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const totalExpense = state.transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const lv = getLevelInfo();

  const domainRank = Object.keys(DOMAIN_CONFIG)
    .map(name => ({ name, icon: DOMAIN_CONFIG[name].icon, value: getDomainPoints(DOMAIN_CONFIG[name].key) }))
    .sort((a, b) => b.value - a.value);
  const maxDomain = Math.max(1, domainRank[0] ? domainRank[0].value : 1);

  // 近 7 天积分
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const key = shiftDate(getTodayKey(), -i);
    const pts = Object.values(state.domains || {}).reduce((s, d) => s + (Number((d.log || {})[key]) || 0), 0);
    days.push({ key, label: key.slice(5).replace('-', '/'), value: pts });
  }
  const maxDay = Math.max(1, ...days.map(d => d.value));

  page.innerHTML = `
    <div class="insight-grid">
      <div class="insight-card"><div class="ic-icon">${icon('coins', 18)}</div><div class="ic-val">${lv.total}</div><div class="ic-label">累计积分</div></div>
      <div class="insight-card"><div class="ic-icon">${icon('clock', 18)}</div><div class="ic-val">${totalFocus}<small>分</small></div><div class="ic-label">累计专注</div></div>
      <div class="insight-card"><div class="ic-icon">${icon('dumbbell', 18)}</div><div class="ic-val">${totalExercise}<small>分</small></div><div class="ic-label">累计运动</div></div>
      <div class="insight-card"><div class="ic-icon">${icon('calendar', 18)}</div><div class="ic-val">${checkinDays}<small>天</small></div><div class="ic-label">打卡天数</div></div>
      <div class="insight-card"><div class="ic-icon">${icon('note', 18)}</div><div class="ic-val">${reviewCount}<small>次</small></div><div class="ic-label">复盘次数</div></div>
      <div class="insight-card"><div class="ic-icon">${icon('mic', 18)}</div><div class="ic-val">${state.voiceReviews.length}<small>条</small></div><div class="ic-label">语音复盘</div></div>
      <div class="insight-card"><div class="ic-icon">${icon('coins', 18)}</div><div class="ic-val">¥${formatMoney(totalIncome)}</div><div class="ic-label">累计收入</div></div>
      <div class="insight-card"><div class="ic-icon">${icon('wallet', 18)}</div><div class="ic-val">¥${formatMoney(totalExpense)}</div><div class="ic-label">累计支出</div></div>
    </div>

    <div class="soft-card">
      <div class="soft-card-title">${icon('leaf', 16)} 领域积分分布</div>
      <div class="bar-list">
        ${domainRank.map(d => `
          <div class="bar-row">
            <span class="bar-name"><span class="bar-ico">${icon(d.icon, 13)}</span>${d.name}</span>
            <span class="bar-track"><span class="bar-fill" style="width:${Math.round((d.value / maxDomain) * 100)}%"></span></span>
            <span class="bar-val">${d.value} 分</span>
          </div>
        `).join('')}
      </div>
    </div>

    <div class="soft-card">
      <div class="soft-card-title">📆 近 7 天积分</div>
      <div class="bar-list">
        ${days.map(d => `
          <div class="bar-row">
            <span class="bar-name">${d.label}</span>
            <span class="bar-track"><span class="bar-fill" style="width:${Math.round((d.value / maxDay) * 100)}%"></span></span>
            <span class="bar-val">${d.value} 分</span>
          </div>
        `).join('')}
      </div>
    </div>
  `;
  content.appendChild(page);
}

// ============ 语音复盘 ============
function renderVoiceReview() {
  const page = document.createElement('div');
  page.className = 'page';
  page.innerHTML = `
    <div class="soft-card">
      <div class="soft-card-title">${icon('mic', 16)} 语音复盘</div>
      <div class="mic-wrap">
        <button class="mic-btn${state.recording ? ' recording' : ''}" id="mic-btn">${icon('mic', 28)}</button>
        <div class="mic-hint" id="mic-hint">${state.recording ? '正在聆听，再次点击结束' : '点击麦克风开始说，说完自动转成文字'}</div>
      </div>
      <p class="muted-note">若浏览器不支持语音识别，会切换为手动输入模式。</p>
    </div>

    <div class="soft-card">
      <div class="soft-card-title">${icon('folder', 16)} 复盘记录<span class="stitle-meta">共 ${state.voiceReviews.length} 条</span></div>
      <div class="voice-list" id="voice-list"></div>
    </div>
  `;
  content.appendChild(page);

  const list = page.querySelector('#voice-list');
  function renderList() {
    list.innerHTML = '';
    if (!state.voiceReviews.length) {
      list.innerHTML = '<p class="empty-note">还没有语音复盘记录</p>';
      return;
    }
    [...state.voiceReviews].reverse().forEach(item => {
      const row = document.createElement('div');
      row.className = 'voice-item';
      row.innerHTML = `
        <span class="voice-wave">${icon('ear', 22)}</span>
        <div class="voice-body">
          <p class="voice-text">${escapeHTML(item.text)}</p>
          <div class="voice-meta">${item.time}</div>
        </div>
        <button class="icon-action delete" data-del="${item.id}" aria-label="删除"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>
      `;
      row.querySelector('[data-del]').addEventListener('click', () => {
        state.voiceReviews = state.voiceReviews.filter(v => v.id !== item.id);
        saveVoiceReviews();
        renderContent();
      });
      list.appendChild(row);
    });
  }
  renderList();

  const micBtn = page.querySelector('#mic-btn');
  const hint = page.querySelector('#mic-hint');

  function addVoiceRecord(text) {
    const value = (text || '').trim();
    if (!value) return;
    const now = new Date();
    state.voiceReviews.push({
      id: uid('vr'),
      text: value,
      date: dateStr(now),
      time: `${formatLongDate(now)} ${pad2(now.getHours())}:${pad2(now.getMinutes())}`
    });
    saveVoiceReviews();
    renderContent();
  }

  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  micBtn.addEventListener('click', async () => {
    if (!SR) {
      const text = await openModal('手动输入复盘内容', '', '说说今天的感受...');
      addVoiceRecord(text);
      return;
    }
    if (state.recording && state.recognition) {
      state.recognition.stop();
      return;
    }
    try {
      const rec = new SR();
      rec.lang = 'zh-CN';
      rec.continuous = false;
      rec.interimResults = false;
      rec.onresult = (e) => {
        const text = Array.from(e.results).map(r => r[0].transcript).join('');
        addVoiceRecord(text);
      };
      rec.onerror = () => { hint.textContent = '识别失败，请重试或使用手动输入'; };
      rec.onend = () => {
        state.recording = false;
        state.recognition = null;
        micBtn.classList.remove('recording');
        hint.textContent = '点击麦克风开始说，说完自动转成文字';
      };
      rec.start();
      state.recognition = rec;
      state.recording = true;
      micBtn.classList.add('recording');
      hint.textContent = '正在聆听，再次点击结束';
    } catch (err) {
      const text = await openModal('手动输入复盘内容', '', '说说今天的感受...');
      addVoiceRecord(text);
    }
  });
}

// ============ 奖励池 ============
function rewardThumbHTML(item) {
  if (item.img) return `<span class="reward-thumb" style="background-image:url('${escapeHTML(item.img)}')"></span>`;
  return `<span class="reward-thumb reward-emoji-fallback">${item.emoji || '🎁'}</span>`;
}
function openRewardDetail(item) {
  const modal = document.getElementById('reward-detail-modal');
  const body = modal.querySelector('.reward-detail-body');
  const available = getAvailablePoints();
  const locked = available < item.cost;
  const tier = rewardTierMeta(item.tier);
  let scale = 1;
  body.innerHTML = `
    <div class="rd-visual" style="background:${tier.bg};border-color:${tier.border}">
      ${item.img ? `<div class="rd-img-wrap"><img id="rd-img" src="${escapeHTML(item.img)}" alt="${escapeHTML(item.name)}"></div>` : `<div class="rd-emoji">${item.emoji || '🎁'}</div>`}
      ${item.img ? `<div class="rd-zoom-bar"><button class="rd-zoom-btn" id="rd-zoom-out">−</button><span class="rd-zoom-val">100%</span><button class="rd-zoom-btn" id="rd-zoom-in">+</button></div>` : ''}
    </div>
    <div class="rd-info">
      <h3 class="rd-name">${escapeHTML(item.name)}</h3>
      <p class="rd-desc">${escapeHTML(item.desc || tier.name + ' · ' + item.cost + ' 积分')}</p>
      <div class="rd-meta">
        <span class="rd-tier" style="background:${tier.bg};color:${tier.text};border-color:${tier.border}">${renderItemIcon(tier.icon, 14)} ${tier.name}</span>
        <span class="rd-cost">${item.cost} 积分</span>
      </div>
    </div>
    <div class="rd-actions">
      <button class="btn btn-secondary" id="rd-close">关闭</button>
      <button class="btn btn-primary" id="rd-redeem" ${locked ? 'disabled' : ''}>${locked ? '积分不足' : '立即兑换'}</button>
    </div>
  `;
  modal.classList.add('active');
  const close = () => modal.classList.remove('active');
  body.querySelector('#rd-close').addEventListener('click', close);
  const img = body.querySelector('#rd-img');
  if (img) {
    const val = body.querySelector('.rd-zoom-val');
    const apply = () => { img.style.transform = `scale(${scale})`; val.textContent = Math.round(scale * 100) + '%'; };
    body.querySelector('#rd-zoom-in').addEventListener('click', () => { scale = Math.min(3, scale + 0.25); apply(); });
    body.querySelector('#rd-zoom-out').addEventListener('click', () => { scale = Math.max(0.5, scale - 0.25); apply(); });
  }
  const redeemBtn = body.querySelector('#rd-redeem');
  if (!locked) {
    redeemBtn.addEventListener('click', () => { close(); redeemReward(item.id); });
  }
}

function renderRewards() {
  const page = document.createElement('div');
  page.className = 'page';
  const available = getAvailablePoints();
  const earned = getTotalEarnedPoints();
  const spent = getSpentPoints();

  page.innerHTML = `
    <div class="reward-stats">
      <div class="reward-stat"><div class="rw-val">${available}</div><div class="rw-label">可用积分</div></div>
      <div class="reward-stat"><div class="rw-val">${earned}</div><div class="rw-label">累计获得</div></div>
      <div class="reward-stat"><div class="rw-val">${spent}</div><div class="rw-label">已消耗</div></div>
    </div>

    <div id="reward-tiers"></div>

    <div class="soft-card reward-form-card">
      <div class="soft-card-title">${icon('plus', 16)} 自定义奖励</div>
      <div class="reward-form">
        <div class="rw-form-row">
          <input type="text" class="pf-input" id="rw-name" placeholder="奖励名称，如：一杯奶茶">
          <input type="number" class="pf-input" id="rw-cost" value="50" style="max-width:90px;" min="0">
          <select class="pf-input" id="rw-tier" style="max-width:100px;">
            ${REWARD_TIERS.map(t => `<option value="${t.key}">${t.name}</option>`).join('')}
          </select>
        </div>
        <div class="rw-form-row">
          <button type="button" class="rw-img-btn" id="rw-pick-img">${icon('image', 14)} 选择配图</button>
          <span class="rw-img-name" id="rw-img-name">未选择图片</span>
          <input type="file" id="reward-img-input" accept="image/*" hidden>
        </div>
        <div class="rw-form-preview" id="rw-img-preview"></div>
        <button class="gold-btn rw-add-btn" id="rw-add">添加归档</button>
      </div>
    </div>

    <div class="soft-card">
      <div class="soft-card-title">${icon('wallet', 16)} 兑换记录<span class="stitle-meta">${state.rewards.redeemed.length} 次</span></div>
      <div class="voice-list" id="redeem-list"></div>
    </div>
  `;
  content.appendChild(page);

  const imgInput = page.querySelector('#reward-img-input');
  const imgName = page.querySelector('#rw-img-name');
  const imgPreview = page.querySelector('#rw-img-preview');
  let pendingImg = '';
  page.querySelector('#rw-pick-img').addEventListener('click', () => imgInput.click());
  imgInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    pendingImg = await readFileAsDataURL(file);
    imgName.textContent = file.name;
    imgPreview.innerHTML = `<div class="rw-thumb-preview" style="background-image:url('${escapeHTML(pendingImg)}')"></div>`;
    imgInput.value = '';
  });

  const costInput = page.querySelector('#rw-cost');
  const tierSelect = page.querySelector('#rw-tier');
  const syncTier = () => { tierSelect.value = rewardTierByCost(costInput.value); };
  costInput.addEventListener('input', syncTier);
  syncTier();

  const tiersWrap = page.querySelector('#reward-tiers');
  REWARD_TIERS.forEach(tier => {
    const items = state.rewards.items.filter(r => r.tier === tier.key);
    const card = document.createElement('div');
    card.className = 'soft-card reward-tier-card';
    card.style.background = tier.bg;
    card.style.borderColor = tier.border;
    card.innerHTML = `
      <div class="soft-card-title" style="color:${tier.text}">${renderItemIcon(tier.icon, 16)} ${tier.name}<span class="stitle-meta">${items.length} 项</span></div>
      <div class="reward-list"></div>
    `;
    const list = card.querySelector('.reward-list');
    if (!items.length) {
      list.innerHTML = '<p class="empty-note">暂无奖励</p>';
    }
    items.forEach(item => {
      const locked = available < item.cost;
      const row = document.createElement('div');
      row.className = 'reward-row' + (locked ? ' locked' : '');
      row.dataset.rewardId = item.id;
      row.innerHTML = `
        ${rewardThumbHTML(item)}
        <span class="reward-name">${escapeHTML(item.name)}${item.desc ? `<small>${escapeHTML(item.desc)}</small>` : ''}</span>
        <span class="reward-cost" style="color:${tier.text}">${item.cost} 分</span>
        <button class="reward-btn" data-redeem="${item.id}" ${locked ? 'disabled' : ''}>${locked ? '积分不足' : '兑换'}</button>
        <button class="item-delete" data-del="${item.id}" aria-label="删除" style="margin-left:6px;"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>
      `;
      row.addEventListener('click', (e) => {
        if (e.target.closest('.reward-btn, .item-delete')) return;
        openRewardDetail(item);
      });
      const btn = row.querySelector('[data-redeem]');
      if (!locked) {
        btn.addEventListener('click', (e) => { e.stopPropagation(); redeemReward(item.id); });
      }
      row.querySelector('[data-del]').addEventListener('click', (e) => {
        e.stopPropagation();
        state.rewards.items = state.rewards.items.filter(r => r.id !== item.id);
        saveRewards();
        renderContent();
      });
      list.appendChild(row);
    });
    tiersWrap.appendChild(card);
  });

  page.querySelector('#rw-add').addEventListener('click', () => {
    const name = page.querySelector('#rw-name').value.trim();
    if (!name) return;
    const cost = Math.max(0, parseInt(page.querySelector('#rw-cost').value) || 0);
    const tier = page.querySelector('#rw-tier').value;
    const emoji = pendingImg ? '' : '🎁';
    state.rewards.items.push({ id: uid('rw'), tier, emoji, img: pendingImg, name, desc: '', cost });
    saveRewards();
    renderContent();
  });

  const redeemList = page.querySelector('#redeem-list');
  if (!state.rewards.redeemed.length) {
    redeemList.innerHTML = '<p class="empty-note">还没有兑换记录，攒够积分犒赏自己吧</p>';
  } else {
    [...state.rewards.redeemed].reverse().forEach(r => {
      const row = document.createElement('div');
      row.className = 'voice-item';
      row.innerHTML = `
        <span class="voice-wave">${r.emoji || '🎁'}</span>
        <div class="voice-body">
          <p class="voice-text">${escapeHTML(r.name)}</p>
          <div class="voice-meta">${r.time} · 消耗 ${r.cost} 分</div>
        </div>
      `;
      redeemList.appendChild(row);
    });
  }
}

function redeemReward(id) {
  const item = state.rewards.items.find(r => r.id === id);
  if (!item) return;
  if (getAvailablePoints() < item.cost) {
    alert('积分不足，再攒攒吧');
    return;
  }
  if (!confirm(`确认用 ${item.cost} 积分兑换「${item.name}」？`)) return;
  const now = new Date();
  state.rewards.redeemed.push({
    id: uid('rd'),
    rewardId: item.id,
    name: item.name,
    emoji: item.emoji,
    cost: item.cost,
    date: dateStr(now),
    time: `${formatLongDate(now)} ${pad2(now.getHours())}:${pad2(now.getMinutes())}`
  });
  saveRewards();
  renderProfileCard();
  renderTopbar();
  renderContent();
}

// ============ 成就殿堂 ============
function getAchievementProgress(ac) {
  switch (ac.type) {
    case 'checkin': return Object.keys(state.checkins || {}).length;
    case 'streak': return calcStreak();
    case 'focus': return getFocusMinutes();
    case 'points': return getTotalEarnedPoints();
    case 'review': return getReviewCount();
    case 'voice': return state.voiceReviews.length;
    case 'exercise':
      return Object.values(state.exerciseLogs || {})
        .reduce((s, list) => s + list.filter(e => e.done).reduce((a, e) => a + (Number(e.duration) || 0), 0), 0);
    case 'redeem': return state.rewards.redeemed.length;
    default: return 0;
  }
}

function evaluateAchievements() {
  let changed = false;
  DEFAULT_ACHIEVEMENTS.forEach(ac => {
    const progress = getAchievementProgress(ac);
    if (progress >= ac.need && !state.achievements[ac.id]) {
      state.achievements[ac.id] = { unlockedAt: new Date().toISOString() };
      changed = true;
    }
  });
  if (changed) saveAchievements();
}

function renderAchievements() {
  evaluateAchievements();
  const lv = getLevelInfo();
  const unlocked = DEFAULT_ACHIEVEMENTS.filter(a => state.achievements[a.id]).length;

  const domainRank = Object.keys(DOMAIN_CONFIG)
    .map(name => ({ name, icon: DOMAIN_CONFIG[name].icon, value: getDomainPoints(DOMAIN_CONFIG[name].key) }))
    .sort((a, b) => b.value - a.value);
  const maxDomain = Math.max(1, domainRank[0] ? domainRank[0].value : 1);

  const page = document.createElement('div');
  page.className = 'page';
  page.innerHTML = `
    <div class="level-banner">
      <div class="level-badge"><b>${lv.level}</b><span>LEVEL</span></div>
      <div class="level-info">
        <h4 class="level-name">${getLevelTitle(lv.level)} · 累计 ${lv.total} 积分</h4>
        <div class="exp-bar"><div class="exp-fill" style="width:${Math.round((lv.exp / lv.need) * 100)}%"></div></div>
        <div class="exp-text">${lv.exp}/${lv.need} 距离 Lv.${lv.level + 1}</div>
      </div>
    </div>

    <div class="soft-card">
      <div class="soft-card-title">${icon('trophy', 16)} 成就徽章<span class="stitle-meta">已解锁 ${unlocked}/${DEFAULT_ACHIEVEMENTS.length}</span></div>
      <div class="achieve-grid">
        ${DEFAULT_ACHIEVEMENTS.map(ac => {
          const on = !!state.achievements[ac.id];
          const progress = Math.min(ac.need, getAchievementProgress(ac));
          return `
            <div class="achieve-card${on ? ' unlocked' : ''}">
              <div class="ac-icon">${renderItemIcon(ac.icon, 28)}</div>
              <div class="ac-name">${ac.name}</div>
              <div class="ac-desc">${on ? ac.desc : `${progress}/${ac.need}`}</div>
            </div>
          `;
        }).join('')}
      </div>
    </div>

    <div class="soft-card">
      <div class="soft-card-title">${icon('chart', 16)} 领域积分排行</div>
      <div class="bar-list">
        ${domainRank.map(d => `
          <div class="bar-row">
            <span class="bar-name"><span class="bar-ico">${icon(d.icon, 13)}</span>${d.name}</span>
            <span class="bar-track"><span class="bar-fill" style="width:${Math.round((d.value / maxDomain) * 100)}%"></span></span>
            <span class="bar-val">${d.value} 分</span>
          </div>
        `).join('')}
      </div>
    </div>
  `;
  content.appendChild(page);
}

// ============ 系统面板 ============
function renderSystemPanel() {
  const lv = getLevelInfo();
  const prog = getTodayProgress();
  const page = document.createElement('div');
  page.className = 'page';

  const cells = [
    { name: '每日复盘', icon: 'review', meta: `${getReviewCount()} 次`, target: '每日复盘' },
    { name: '本周洞察', icon: 'chart', meta: `Lv.${lv.level}`, target: '本周洞察' },
    { name: '语音复盘', icon: 'mic', meta: `${state.voiceReviews.length} 条`, target: '语音复盘' },
    { name: '奖励池', icon: 'rewards', meta: `${getAvailablePoints()} 分可用`, target: '奖励池' },
    { name: '成就殿堂', icon: 'trophy', meta: `${DEFAULT_ACHIEVEMENTS.filter(a => state.achievements[a.id]).length} 枚徽章`, target: '成就殿堂' },
    { name: '内容素材库', icon: 'content', meta: `${state.contentItems.length} 条素材`, target: '内容素材库' },
    { name: '碎碎念', icon: 'note', meta: `${state.memos.length} 条`, target: '碎碎念' },
    { name: '当日计划', icon: 'calendar', meta: `${prog.done}/${prog.total}`, target: '每日计划' },
    { name: '饮食', icon: 'utensils', meta: `${getDietTotals().total} kcal`, target: '饮食' },
    { name: '健身', icon: 'dumbbell', meta: `${getTodayExerciseMinutes()} 分钟`, target: '健身' },
    { name: '记账存钱', icon: 'wallet', meta: `¥${formatMoney(calcAssetTotal())}`, target: '记账存钱' },
    { name: '自我介绍', icon: 'intro', meta: state.profile.name || '未填写', target: '自我介绍' },
    { name: '设置', icon: 'settings', meta: `v${APP_VERSION}`, target: '设置' }
  ];

  page.innerHTML = `
    <div class="stat-boxes">
      <div class="stat-box"><div class="stb-val">Lv.${lv.level}</div><div class="stb-label">当前等级</div></div>
      <div class="stat-box"><div class="stb-val">${getAvailablePoints()}</div><div class="stb-label">可用积分</div></div>
      <div class="stat-box"><div class="stb-val">${calcStreak()}</div><div class="stb-label">连续打卡</div></div>
    </div>
    <div class="soft-card">
      <div class="soft-card-title">${icon('layers', 16)} 全部模块</div>
      <div class="panel-grid" id="panel-grid"></div>
    </div>
    <div class="soft-card">
      <div class="soft-card-title">${icon('leaf', 16)} 人生领域</div>
      <div class="panel-grid" id="panel-domains"></div>
    </div>
  `;
  content.appendChild(page);

  const grid = page.querySelector('#panel-grid');
  cells.forEach(c => {
    const btn = document.createElement('button');
    btn.className = 'panel-cell';
    btn.innerHTML = `<div class="pc-icon">${icon(c.icon, 20)}</div><div class="pc-name">${c.name}</div><div class="pc-meta">${c.meta}</div>`;
    btn.addEventListener('click', () => selectItem(c.target));
    grid.appendChild(btn);
  });

  const dgrid = page.querySelector('#panel-domains');
  Object.keys(DOMAIN_CONFIG).forEach(name => {
    const cfg = DOMAIN_CONFIG[name];
    const btn = document.createElement('button');
    btn.className = 'panel-cell';
    btn.innerHTML = `<div class="pc-icon">${icon(cfg.icon, 20)}</div><div class="pc-name">${name}</div><div class="pc-meta">${getDomainPoints(cfg.key)} 分 · ${getDomainStreak(cfg.key)} 天</div>`;
    btn.addEventListener('click', () => selectItem(name));
    dgrid.appendChild(btn);
  });
}

// ============ 内容素材库 ============
function platformSearchUrl(platform, kw) {
  const q = encodeURIComponent(kw);
  if (platform === '小红书') return `https://www.xiaohongshu.com/search_result?keyword=${q}`;
  if (platform === '抖音') return `https://www.douyin.com/search/${q}`;
  if (platform === 'B站') return `https://search.bilibili.com/all?keyword=${q}`;
  return `https://www.baidu.com/s?wd=${q}`;
}

function generateContentItems(count, tab, filter, style) {
  const platforms = (filter && filter !== '全部') ? [filter] : ['小红书', '抖音', 'B站'];
  const styleSuffix = style ? `（${style}风格）` : '';
  const titleBits = {
    hot: ['普通人也能做的', '我坚持 30 天的', '新手友好的', '被低估的', '一周见效的'],
    tool: ['超好用的', '保姆级', '少有人知的', '效率翻倍的', '一看就会的'],
    review: ['做完 100 天后的', '踩坑后的', '数据告诉我的', '复盘这一个月', '回头看才懂的']
  };
  const topicBits = ['早起', '护肤', '穿搭', '存钱', '健身', '读书', '减脂餐', '收纳', '时间管理', '副业', '仪态', '专注'];
  const hookBits = ['前 3 秒给出结果，不绕弯', '用对比图制造冲击', '把步骤拆到最小可执行', '先抛结论再讲过程', '真实记录比精致更打动人'];
  const cats = ['自律成长', '生活方式', '护肤', '穿搭', '理财', '健身', '学习', '好物'];
  const out = [];
  for (let i = 0; i < count; i++) {
    const platform = platforms[i % platforms.length];
    const topic = topicBits[(i + count) % topicBits.length];
    const title = `${titleBits[tab][i % titleBits[tab].length]}${topic}${styleSuffix}`;
    const category = cats[(i + count) % cats.length];
    const hook = hookBits[i % hookBits.length];
    const kw = `${topic}${style ? ' ' + style : ''}`;
    out.push({
      id: uid('ct'),
      tab,
      platform,
      category,
      title,
      hook,
      views: 0, likes: 0, collects: 0,
      url: platformSearchUrl(platform, kw)
    });
  }
  return out;
}

function openContentUrl(url) {
  if (!url) return;
  window.open(url, '_blank', 'noopener');
}

function generateLooksItems(count, type, styleKw) {
  const topicMap = {
    '护肤': ['早 C 晚 A 怎么用', '敏感肌修护步骤', '平价护肤流程', '防晒到底怎么选', '去黑头不伤肤', '换季不烂脸'],
    '仪态': ['改善富贵包', '走路体态练习', '含胸驼背矫正', '气质肩颈拉伸', '坐姿矫正', '显高站姿'],
    '穿搭': ['小个子显高', '通勤穿搭', '梨形身材穿搭', '极简衣橱', '复古风搭配', '学生党穿搭'],
    '妆容': ['伪素颜妆', '新手化妆步骤', '通勤淡妆', '放大双眼眼妆', '持妆不脱妆', '约会妆容']
  };
  const hookMap = {
    '护肤': ['先建立耐受，从低浓度开始', '精简步骤比堆砌更有效', '防晒是抗老第一步'],
    '仪态': ['每天 5 分钟，坚持就有效', '靠墙站是性价比最高的练习', '收下巴比抬头更重要'],
    '穿搭': ['高腰线拉长比例', '同色系显高级', '少买多搭更省钱'],
    '妆容': ['底妆服帖的关键在保湿', '眼线顺着眼形画更自然', '定妆喷雾锁住妆容']
  };
  const topics = topicMap[type] || topicMap['护肤'];
  const hooks = hookMap[type] || hookMap['护肤'];
  const out = [];
  for (let i = 0; i < count; i++) {
    const topic = topics[i % topics.length];
    const kw = `${type} ${topic}${styleKw ? ' ' + styleKw : ''}`;
    out.push({
      title: `${topic}${styleKw ? '（' + styleKw + '）' : ''}`,
      category: type,
      hook: hooks[i % hooks.length],
      url: `https://www.douyin.com/search/${encodeURIComponent(kw)}`
    });
  }
  return out;
}

function renderLooksContent(type) {
  const t = type || state.looksType || '护肤';
  state.looksType = t;
  content.innerHTML = '';
  const card = document.createElement('div');
  card.className = 'content-card';
  const types = ['护肤', '仪态', '穿搭', '妆容'];
  card.innerHTML = `
    <div class="page-header">
      <div>
        <h3 class="page-title-main">${t}推荐</h3>
        <p class="page-subtitle">来自抖音的灵感参考</p>
      </div>
    </div>
    <div class="soft-card">
      <div class="style-bar">
        <span>${icon('sparkles', 16)}</span>
        <input type="text" id="looks-style" placeholder="自定义风格，如：油皮/通勤/学生党" value="${escapeHTML(state.looksStyle || '')}">
      </div>
      <div class="tab-bar">
        ${types.map(x => `<button class="tab-btn${t === x ? ' active' : ''}" data-type="${x}">${x}</button>`).join('')}
      </div>
      <div class="soft-card-title">
        <span class="stitle-lead">${icon('video', 16)} 推荐<span class="stitle-meta" id="looks-count"></span></span>
        <button class="refresh-btn" id="looks-refresh" aria-label="刷新">${icon('refresh', 16)}</button>
      </div>
      <div class="looks-grid" id="looks-grid"></div>
    </div>
  `;
  content.appendChild(card);

  const grid = card.querySelector('#looks-grid');
  function renderList() {
    const styleKw = (state.looksStyle || '').trim();
    const items = generateLooksItems(6, t, styleKw);
    card.querySelector('#looks-count').textContent = items.length + ' 条';
    grid.innerHTML = '';
    items.forEach(it => {
      const el = document.createElement('div');
      el.className = 'looks-card';
      el.innerHTML = `
        <div class="looks-top"><span class="looks-badge">抖音</span><span class="looks-cat">${escapeHTML(it.category)}</span></div>
        <h4 class="looks-title">${escapeHTML(it.title)}</h4>
        <p class="looks-hook">${escapeHTML(it.hook)}</p>
      `;
      el.addEventListener('click', () => { window.open(it.url, '_blank', 'noopener'); });
      grid.appendChild(el);
    });
  }
  renderList();

  const styleInput = card.querySelector('#looks-style');
  if (styleInput) styleInput.addEventListener('input', () => { state.looksStyle = styleInput.value; });
  card.querySelectorAll('[data-type]').forEach(btn => {
    btn.addEventListener('click', () => { state.looksType = btn.dataset.type; renderContent(); });
  });
  card.querySelector('#looks-refresh').addEventListener('click', () => { renderList(); toast('已刷新'); });
}

function renderContentLibrary() {
  const page = document.createElement('div');
  page.className = 'page';

  const kw = (state.contentSearch || '').trim().toLowerCase();
  const items = state.contentItems.filter(it => {
    if (it.tab !== state.contentTab) return false;
    if (state.contentFilter !== '全部' && it.platform !== state.contentFilter) return false;
    if (!kw) return true;
    return (`${it.title} ${it.hook} ${it.category} ${it.platform}`).toLowerCase().includes(kw);
  });

  page.innerHTML = `
    <div class="soft-card">
      <div class="search-bar">
        <span>${icon('search', 16)}</span>
        <input type="text" id="ct-search" placeholder="搜索标题 / 钩子 / 分类" value="${escapeHTML(state.contentSearch)}">
      </div>
      <div class="style-bar">
        <span>${icon('sparkles', 16)}</span>
        <input type="text" id="ct-style" placeholder="自定义风格关键词，如：极简/复古/通勤" value="${escapeHTML(state.contentStyle)}">
      </div>
      <div class="tab-bar">
        ${CONTENT_TABS.map(t => `<button class="tab-btn${state.contentTab === t.key ? ' active' : ''}" data-tab="${t.key}">${t.name}</button>`).join('')}
      </div>
      <div class="filter-bar">
        ${CONTENT_FILTERS.map(f => `<button class="filter-chip${state.contentFilter === f ? ' active' : ''}" data-filter="${f}">${f}</button>`).join('')}
      </div>
    </div>

    <div class="soft-card">
      <div class="soft-card-title">
        <span class="stitle-lead">${icon('content', 16)} 素材列表<span class="stitle-meta">${items.length} 条</span></span>
        <button class="refresh-btn" id="ct-refresh" aria-label="刷新素材">${icon('refresh', 16)}</button>
      </div>
      <div class="pull-hint" id="ct-pull-hint">下拉刷新</div>
      <div class="content-grid" id="ct-grid"></div>
    </div>

    <div class="soft-card">
      <div class="soft-card-title">${icon('plus', 16)} 添加素材</div>
      <div class="profile-fields">
        <div class="pf-field"><span class="pf-label">标题</span><input class="pf-input" id="ct-title" placeholder="选题标题"></div>
        <div class="pf-field"><span class="pf-label">平台</span>
          <select class="pf-input" id="ct-platform">${CONTENT_FILTERS.filter(f => f !== '全部').map(f => `<option>${f}</option>`).join('')}</select>
        </div>
        <div class="pf-field"><span class="pf-label">分类</span><input class="pf-input" id="ct-cat" placeholder="如：自律成长"></div>
        <div class="pf-field"><span class="pf-label">钩子 / 备注</span><input class="pf-input" id="ct-hook" placeholder="开头怎么抓人"></div>
      </div>
      <div class="focus-actions" style="margin-top:10px;">
        <button class="gold-btn" id="ct-add">添加到「${CONTENT_TABS.find(t => t.key === state.contentTab).name}」</button>
      </div>
    </div>
  `;
  content.appendChild(page);

  const grid = page.querySelector('#ct-grid');
  if (!items.length) {
    grid.innerHTML = '<p class="empty-note">没有匹配的素材，换个筛选条件试试</p>';
  }
  items.forEach(it => {
    const el = document.createElement('div');
    el.className = 'content-item';
    el.dataset.url = it.url || '';
    el.innerHTML = `
      <div class="ci-top">
        <span class="ci-platform">${it.platform}</span>
        <span class="ci-cat">${escapeHTML(it.category || '')}</span>
        ${it.url ? `<span class="ci-link" title="打开链接">${icon('link', 12)}</span>` : ''}
      </div>
      <h4 class="ci-title">${escapeHTML(it.title)}</h4>
      <p class="ci-hook">${escapeHTML(it.hook || '')}</p>
      <div class="ci-stats">
        <span>${icon('insight', 13)} ${it.views || 0}</span>
        <span>${icon('heart', 13)} ${it.likes || 0}</span>
        <span>${icon('star', 13)} ${it.collects || 0}</span>
      </div>
      <button class="icon-action delete" data-del="${it.id}" aria-label="删除"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>
    `;
    el.addEventListener('click', (e) => {
      if (e.target.closest('[data-del]')) return;
      openContentUrl(it.url);
    });
    el.querySelector('[data-del]').addEventListener('click', () => {
      state.contentItems = state.contentItems.filter(c => c.id !== it.id);
      saveContentItems();
      renderContent();
    });
    grid.appendChild(el);
  });

  const search = page.querySelector('#ct-search');
  search.addEventListener('input', () => {
    state.contentSearch = search.value;
    renderContent();
    const next = document.getElementById('ct-search');
    if (next) { next.focus(); next.setSelectionRange(next.value.length, next.value.length); }
  });

  page.querySelectorAll('[data-tab]').forEach(btn => {
    btn.addEventListener('click', () => { state.contentTab = btn.dataset.tab; renderContent(); });
  });
  page.querySelectorAll('[data-filter]').forEach(btn => {
    btn.addEventListener('click', () => { state.contentFilter = btn.dataset.filter; renderContent(); });
  });

  page.querySelector('#ct-add').addEventListener('click', () => {
    const title = page.querySelector('#ct-title').value.trim();
    if (!title) return;
    state.contentItems.push({
      id: uid('ct'),
      tab: state.contentTab,
      platform: page.querySelector('#ct-platform').value,
      category: page.querySelector('#ct-cat').value.trim(),
      title,
      hook: page.querySelector('#ct-hook').value.trim(),
      views: 0, likes: 0, collects: 0
    });
    saveContentItems();
    renderContent();
  });

  // 刷新按钮：依据当前标签 / 筛选 / 风格生成一批新素材
  const refreshBtn = page.querySelector('#ct-refresh');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => {
      refreshBtn.classList.add('spinning');
      const gen = generateContentItems(6, state.contentTab, state.contentFilter, state.contentStyle);
      state.contentItems = state.contentItems.concat(gen);
      saveContentItems();
      renderContent();
      toast('已生成 6 条新素材');
    });
  }

  const styleInput = page.querySelector('#ct-style');
  if (styleInput) {
    styleInput.addEventListener('input', () => { state.contentStyle = styleInput.value; });
  }

  // 下拉刷新：内容区在顶部时下拉超过 70px 触发
  const hint = page.querySelector('#ct-pull-hint');
  let pullStartY = 0;
  let pulling = false;
  content.addEventListener('touchstart', (e) => {
    if (content.scrollTop === 0) {
      pulling = true;
      pullStartY = e.touches[0].clientY;
    }
  }, { passive: true });
  content.addEventListener('touchmove', (e) => {
    if (!pulling) return;
    const dy = e.touches[0].clientY - pullStartY;
    if (dy > 0 && hint) {
      hint.classList.add('show');
      hint.textContent = dy > 70 ? '松开刷新' : '下拉刷新';
    }
  }, { passive: true });
  content.addEventListener('touchend', (e) => {
    if (!pulling) return;
    pulling = false;
    const dy = e.changedTouches[0].clientY - pullStartY;
    if (hint) hint.classList.remove('show');
    if (content.scrollTop === 0 && dy > 70) {
      renderContent();
      toast('已刷新');
    }
  }, { passive: true });
}

// ============ 成长提升：书籍阅读 ============
function renderBookReading() {
  const page = document.createElement('div');
  page.className = 'page';
  const books = state.books;
  const finished = books.filter(b => b.current >= b.total && b.total > 0).length;
  const reading = books.length - finished;

  page.innerHTML = `
    <div class="growth-hero">
      <div class="growth-hero-icon">${icon('book', 26)}</div>
      <div>
        <h3 class="page-title-main">书籍阅读</h3>
        <p class="page-subtitle">在读 ${reading} 本 · 已读完 ${finished} 本</p>
      </div>
    </div>

    <div class="soft-card">
      <div class="soft-card-title">${icon('plus', 16)} 添加书籍</div>
      <div class="profile-fields">
        <div class="pf-field"><span class="pf-label">书名</span><input class="pf-input" id="bk-title" placeholder="书名"></div>
        <div class="pf-field"><span class="pf-label">作者</span><input class="pf-input" id="bk-author" placeholder="作者（可选）"></div>
        <div class="pf-field"><span class="pf-label">总页数</span><input class="pf-input" id="bk-total" type="number" placeholder="如 300"></div>
      </div>
      <div class="focus-actions" style="margin-top:10px;">
        <button class="gold-btn" id="bk-add">加入书架</button>
      </div>
    </div>

    <div class="soft-card">
      <div class="soft-card-title">${icon('list', 16)} 我的书架<span class="stitle-meta">${books.length} 本</span></div>
      <div class="book-list" id="bk-list">
        ${books.length === 0 ? '<p class="empty-note">还没有书籍，添加一本开始阅读吧</p>' : ''}
      </div>
    </div>
  `;
  content.appendChild(page);

  const list = page.querySelector('#bk-list');
  books.forEach(b => {
    const pct = b.total > 0 ? Math.min(100, Math.round((b.current / b.total) * 100)) : 0;
    const el = document.createElement('div');
    el.className = 'book-row';
    el.innerHTML = `
      <div class="book-main">
        <div class="book-title">${escapeHTML(b.title)}${pct >= 100 ? ` <span class="book-done">${icon('check', 12)} 已读完</span>` : ''}</div>
        <div class="book-author">${escapeHTML(b.author || '佚名')} · ${b.current}/${b.total || '?'} 页</div>
        <div class="budget-bar"><div class="budget-bar-fill" style="width:${pct}%"></div></div>
      </div>
      <div class="book-ops">
        <button class="mini-btn" data-act="minus" title="-10页">-10</button>
        <button class="mini-btn" data-act="plus" title="+10页">+10</button>
        <button class="icon-action delete" data-act="del" aria-label="删除">${icon('delete', 14)}</button>
      </div>
    `;
    el.querySelector('[data-act="plus"]').addEventListener('click', () => {
      b.current = Math.min(b.total || b.current + 10, b.current + 10);
      saveBooks(); renderContent();
    });
    el.querySelector('[data-act="minus"]').addEventListener('click', () => {
      b.current = Math.max(0, b.current - 10);
      saveBooks(); renderContent();
    });
    el.querySelector('[data-act="del"]').addEventListener('click', () => {
      state.books = state.books.filter(x => x.id !== b.id);
      saveBooks(); renderContent();
    });
    list.appendChild(el);
  });

  page.querySelector('#bk-add').addEventListener('click', () => {
    const title = page.querySelector('#bk-title').value.trim();
    if (!title) return;
    state.books.push({
      id: uid('bk'),
      title,
      author: page.querySelector('#bk-author').value.trim(),
      total: parseInt(page.querySelector('#bk-total').value) || 0,
      current: 0
    });
    saveBooks();
    renderContent();
  });
}

// ============ 成长提升：历史 ============
function renderHistoryLearning() {
  const page = document.createElement('div');
  page.className = 'page';
  const notes = state.historyNotes;

  page.innerHTML = `
    <div class="growth-hero">
      <div class="growth-hero-icon">${icon('history', 26)}</div>
      <div>
        <h3 class="page-title-main">历史</h3>
        <p class="page-subtitle">以史为鉴 · 共记录 ${notes.length} 条笔记</p>
      </div>
    </div>

    <div class="soft-card">
      <div class="soft-card-title">${icon('plus', 16)} 添加历史笔记</div>
      <div class="profile-fields">
        <div class="pf-field"><span class="pf-label">朝代 / 时期</span><input class="pf-input" id="hs-era" placeholder="如：唐 / 文艺复兴"></div>
        <div class="pf-field"><span class="pf-label">主题</span><input class="pf-input" id="hs-title" placeholder="事件 / 人物"></div>
      </div>
      <textarea class="pf-input" id="hs-note" placeholder="要点、感悟…" style="margin-top:8px;min-height:70px;"></textarea>
      <div class="focus-actions" style="margin-top:10px;">
        <button class="gold-btn" id="hs-add">保存笔记</button>
      </div>
    </div>

    <div class="soft-card">
      <div class="soft-card-title">${icon('list', 16)} 历史时间线</div>
      <div class="history-timeline" id="hs-list">
        ${notes.length === 0 ? '<p class="empty-note">还没有笔记，记录第一条吧</p>' : ''}
      </div>
    </div>
  `;
  content.appendChild(page);

  const list = page.querySelector('#hs-list');
  notes.slice().reverse().forEach(n => {
    const el = document.createElement('div');
    el.className = 'hs-item';
    el.innerHTML = `
      <div class="hs-dot"></div>
      <div class="hs-body">
        <div class="hs-head"><span class="hs-era">${escapeHTML(n.era || '未分期')}</span><span class="hs-date">${n.date || ''}</span></div>
        <div class="hs-title">${escapeHTML(n.title)}</div>
        ${n.note ? `<div class="hs-note">${escapeHTML(n.note)}</div>` : ''}
        <button class="icon-action delete hs-del" data-id="${n.id}" aria-label="删除">${icon('delete', 14)}</button>
      </div>
    `;
    el.querySelector('.hs-del').addEventListener('click', () => {
      state.historyNotes = state.historyNotes.filter(x => x.id !== n.id);
      saveHistoryNotes(); renderContent();
    });
    list.appendChild(el);
  });

  page.querySelector('#hs-add').addEventListener('click', () => {
    const title = page.querySelector('#hs-title').value.trim();
    if (!title) return;
    state.historyNotes.push({
      id: uid('hs'),
      era: page.querySelector('#hs-era').value.trim(),
      title,
      note: page.querySelector('#hs-note').value.trim(),
      date: getTodayKey()
    });
    saveHistoryNotes();
    renderContent();
  });
}

// ============ 成长提升：视频剪辑 ============
function renderVideoEditing() {
  const page = document.createElement('div');
  page.className = 'page';
  const data = state.videoEdit;

  page.innerHTML = `
    <div class="growth-hero">
      <div class="growth-hero-icon">${icon('video', 26)}</div>
      <div>
        <h3 class="page-title-main">视频剪辑</h3>
        <p class="page-subtitle">进行中 ${data.projects.filter(p => p.status !== 'done').length} 个项目</p>
      </div>
    </div>

    <div class="soft-card">
      <div class="soft-card-title">${icon('plus', 16)} 新建剪辑项目</div>
      <div class="profile-fields">
        <div class="pf-field"><span class="pf-label">项目名</span><input class="pf-input" id="ve-title" placeholder="如：旅行 vlog"></div>
        <div class="pf-field"><span class="pf-label">软件</span><input class="pf-input" id="ve-tool" placeholder="剪映 / PR / Final Cut"></div>
      </div>
      <input class="pf-input" id="ve-note" placeholder="备注 / 卡点思路" style="margin-top:8px;">
      <div class="focus-actions" style="margin-top:10px;">
        <button class="gold-btn" id="ve-add">添加项目</button>
      </div>
    </div>

    <div class="soft-card">
      <div class="soft-card-title">${icon('list', 16)} 项目清单<span class="stitle-meta">${data.projects.length} 个</span></div>
      <div id="ve-list">
        ${data.projects.length === 0 ? '<p class="empty-note">还没有项目，新建一个吧</p>' : ''}
      </div>
    </div>
  `;
  content.appendChild(page);

  const list = page.querySelector('#ve-list');
  data.projects.forEach(p => {
    const done = p.status === 'done';
    const el = document.createElement('div');
    el.className = 'proj-row' + (done ? ' done' : '');
    el.innerHTML = `
      <button class="proj-check" data-act="toggle" aria-label="完成">${done ? icon('check', 14) : ''}</button>
      <div class="proj-body">
        <div class="proj-title">${escapeHTML(p.title)}</div>
        <div class="proj-sub">${escapeHTML(p.tool || '')}${p.note ? ' · ' + escapeHTML(p.note) : ''}</div>
      </div>
      <button class="icon-action delete" data-act="del" aria-label="删除">${icon('delete', 14)}</button>
    `;
    el.querySelector('[data-act="toggle"]').addEventListener('click', () => {
      p.status = done ? 'doing' : 'done';
      saveVideoEdit(); renderContent();
    });
    el.querySelector('[data-act="del"]').addEventListener('click', () => {
      state.videoEdit.projects = state.videoEdit.projects.filter(x => x.id !== p.id);
      saveVideoEdit(); renderContent();
    });
    list.appendChild(el);
  });

  page.querySelector('#ve-add').addEventListener('click', () => {
    const title = page.querySelector('#ve-title').value.trim();
    if (!title) return;
    state.videoEdit.projects.push({
      id: uid('ve'),
      title,
      tool: page.querySelector('#ve-tool').value.trim(),
      note: page.querySelector('#ve-note').value.trim(),
      status: 'doing'
    });
    saveVideoEdit();
    renderContent();
  });
}

// ============ 成长提升：3D建模 ============
function render3DModeling() {
  const page = document.createElement('div');
  page.className = 'page';
  const data = state.modeling;

  page.innerHTML = `
    <div class="growth-hero">
      <div class="growth-hero-icon">${icon('model3d', 26)}</div>
      <div>
        <h3 class="page-title-main">3D建模</h3>
        <p class="page-subtitle">作品 ${data.works.length} 件</p>
      </div>
    </div>

    <div class="soft-card">
      <div class="soft-card-title">${icon('plus', 16)} 记录建模作品</div>
      <div class="profile-fields">
        <div class="pf-field"><span class="pf-label">作品名</span><input class="pf-input" id="md-title" placeholder="如：低多边形小屋"></div>
        <div class="pf-field"><span class="pf-label">软件</span><input class="pf-input" id="md-soft" placeholder="Blender / C4D / Maya"></div>
      </div>
      <input class="pf-input" id="md-note" placeholder="练习要点 / 难点" style="margin-top:8px;">
      <div class="focus-actions" style="margin-top:10px;">
        <button class="gold-btn" id="md-add">添加作品</button>
      </div>
    </div>

    <div class="soft-card">
      <div class="soft-card-title">${icon('cube', 16)} 作品集<span class="stitle-meta">${data.works.length} 件</span></div>
      <div class="model-grid" id="md-list">
        ${data.works.length === 0 ? '<p class="empty-note">还没有作品，记录第一件吧</p>' : ''}
      </div>
    </div>
  `;
  content.appendChild(page);

  const list = page.querySelector('#md-list');
  data.works.forEach(w => {
    const el = document.createElement('div');
    el.className = 'model-card';
    el.innerHTML = `
      <div class="model-thumb">${icon('cube', 30)}</div>
      <div class="model-title">${escapeHTML(w.title)}</div>
      <div class="model-sub">${escapeHTML(w.soft || '')}</div>
      ${w.note ? `<div class="model-note">${escapeHTML(w.note)}</div>` : ''}
      <button class="icon-action delete model-del" data-id="${w.id}" aria-label="删除">${icon('delete', 14)}</button>
    `;
    el.querySelector('.model-del').addEventListener('click', () => {
      state.modeling.works = state.modeling.works.filter(x => x.id !== w.id);
      saveModeling(); renderContent();
    });
    list.appendChild(el);
  });

  page.querySelector('#md-add').addEventListener('click', () => {
    const title = page.querySelector('#md-title').value.trim();
    if (!title) return;
    state.modeling.works.push({
      id: uid('md'),
      title,
      soft: page.querySelector('#md-soft').value.trim(),
      note: page.querySelector('#md-note').value.trim()
    });
    saveModeling();
    renderContent();
  });
}

// ============ 自我介绍 ============
function renderSelfIntro() {
  const p = state.profile;
  const fields = [
    { key: 'name', label: '名字' },
    { key: 'age', label: '年龄' },
    { key: 'job', label: '职业' },
    { key: 'hobby', label: '爱好' },
    { key: 'skill', label: '技能' },
    { key: 'personality', label: '性格' }
  ];

  const page = document.createElement('div');
  page.className = 'page';
  page.innerHTML = `
    <div class="domain-hero">
      <div class="domain-head">
        <div class="domain-icon">${icon('intro', 24)}</div>
        <div>
          <h3 class="domain-title">${escapeHTML(p.name || 'Xenos')}</h3>
          <p class="domain-subtitle">认识自己，是所有改变的起点</p>
        </div>
      </div>
    </div>

    <div class="soft-card">
      <div class="soft-card-title">${icon('user', 16)} 基本信息</div>
      <div class="profile-fields">
        ${fields.map(f => `
          <div class="pf-field">
            <span class="pf-label">${f.label}</span>
            <input class="pf-input" data-pf="${f.key}" value="${escapeHTML(p[f.key] || '')}" placeholder="${f.label}">
          </div>
        `).join('')}
      </div>
    </div>

    <div class="soft-card">
      <div class="soft-card-title">${icon('layers', 16)} SWOT 自我分析</div>
      <div class="swot-grid">
        <div class="swot-cell s">
          <div class="swot-title">${icon('star', 14)} S 优势</div>
          <textarea class="swot-area" data-swot="s" placeholder="我擅长什么...">${escapeHTML(p.swot.s || '')}</textarea>
        </div>
        <div class="swot-cell w">
          <div class="swot-title">${icon('close', 14)} W 劣势</div>
          <textarea class="swot-area" data-swot="w" placeholder="我的短板是...">${escapeHTML(p.swot.w || '')}</textarea>
        </div>
        <div class="swot-cell o">
          <div class="swot-title">${icon('leaf', 14)} O 机会</div>
          <textarea class="swot-area" data-swot="o" placeholder="外部有哪些机会...">${escapeHTML(p.swot.o || '')}</textarea>
        </div>
        <div class="swot-cell t">
          <div class="swot-title">${icon('flag', 14)} T 威胁</div>
          <textarea class="swot-area" data-swot="t" placeholder="需要提防什么...">${escapeHTML(p.swot.t || '')}</textarea>
        </div>
      </div>
      <div class="focus-actions" style="margin-top:12px;">
        <button class="gold-btn" id="pf-save">保存资料</button>
      </div>
      <p class="muted-note" id="pf-tip">资料保存在本地浏览器，导出备份可迁移。</p>
    </div>
  `;
  content.appendChild(page);

  page.querySelector('#pf-save').addEventListener('click', () => {
    page.querySelectorAll('[data-pf]').forEach(input => {
      state.profile[input.dataset.pf] = input.value.trim();
    });
    page.querySelectorAll('[data-swot]').forEach(area => {
      state.profile.swot[area.dataset.swot] = area.value;
    });
    if (state.profile.name) {
      state.settings.userName = state.profile.name;
      saveSettings();
    }
    saveProfile();
    renderProfileCard();
    renderTopbar();
    page.querySelector('#pf-tip').textContent = '已保存 ✓ ' + new Date().toLocaleTimeString('zh-CN');
  });
}

// ============ 设置 ============
function renderSettings() {
  const s = state.settings;
  const page = document.createElement('div');
  page.className = 'page';
  page.innerHTML = `
    <div class="soft-card">
      <div class="soft-card-title">${icon('user', 16)} 个人资料</div>
      <div class="setting-row">
        <div class="setting-label">昵称<small>显示在侧边栏与问候语</small></div>
        <input class="pf-input" id="st-name" value="${escapeHTML(s.userName || '')}">
      </div>
      <div class="setting-row">
        <div class="setting-label">头像 Emoji<small>也可点击侧边栏头像上传图片</small></div>
        <input class="pf-input" id="st-avatar" value="${isImageSource(s.userAvatar) ? '' : escapeHTML(s.userAvatar || '')}" placeholder="🐰">
      </div>
      <div class="setting-row">
        <div class="setting-label">当前心情</div>
        <select class="pf-input" id="st-mood">
          ${MOOD_LIST.map(m => `<option value="${m.name}"${s.mood === m.name ? ' selected' : ''}>${m.emoji} ${m.name}</option>`).join('')}
        </select>
      </div>
    </div>

    <div class="soft-card">
      <div class="soft-card-title">🏷 系统名称</div>
      <div class="setting-row">
        <div class="setting-label">主标题</div>
        <input class="pf-input" id="st-title" value="${escapeHTML(s.brandTitle || '')}">
      </div>
      <div class="setting-row">
        <div class="setting-label">副标题</div>
        <input class="pf-input" id="st-sub" value="${escapeHTML(s.brandSubtitle || '')}">
      </div>
      <div class="focus-actions" style="margin-top:12px;">
        <button class="gold-btn" id="st-save">保存设置</button>
      </div>
    </div>

    <div class="soft-card">
      <div class="soft-card-title">${icon('clock', 16)} 专注默认时长</div>
      <div class="focus-presets" style="justify-content:flex-start;">
        ${[15, 25, 45, 60].map(m => `<button class="focus-preset${state.focus.preset === m ? ' active' : ''}" data-min="${m}">${m} 分</button>`).join('')}
      </div>
    </div>

    <div class="soft-card">
      <div class="soft-card-title">💾 数据备份</div>
      <div class="setting-row">
        <div class="setting-label">导出全部数据<small>生成 JSON 备份文件</small></div>
        <button class="ghost-btn" id="st-export">导出</button>
      </div>
      <div class="setting-row">
        <div class="setting-label">导入备份<small>会覆盖当前本地数据</small></div>
        <button class="ghost-btn" id="st-import">导入</button>
      </div>
      <div class="setting-row">
        <div class="setting-label">重置菜单结构<small>恢复默认的人生系统菜单</small></div>
        <button class="ghost-btn" id="st-reset-menu">重置菜单</button>
      </div>
      <div class="setting-row">
        <div class="setting-label" style="color:var(--danger)">清空全部数据<small>不可恢复，请先导出备份</small></div>
        <button class="ghost-btn" id="st-reset-all" style="color:var(--danger);border-color:var(--danger)">清空</button>
      </div>
    </div>

    <div class="soft-card">
      <div class="soft-card-title">ℹ️ 关于</div>
      <div class="setting-row"><div class="setting-label">版本号</div><span class="setting-label" style="flex:0;color:var(--text-muted)">v${APP_VERSION}</span></div>
      <div class="setting-row"><div class="setting-label">数据结构版本</div><span class="setting-label" style="flex:0;color:var(--text-muted)">schema v${SCHEMA_VERSION}</span></div>
      <div class="setting-row"><div class="setting-label">存储方式</div><span class="setting-label" style="flex:0;color:var(--text-muted)">浏览器 localStorage</span></div>
    </div>
  `;
  content.appendChild(page);

  page.querySelector('#st-save').addEventListener('click', () => {
    s.userName = page.querySelector('#st-name').value.trim() || 'Xenos';
    const av = page.querySelector('#st-avatar').value.trim();
    if (av) s.userAvatar = av;
    s.mood = page.querySelector('#st-mood').value;
    s.brandTitle = page.querySelector('#st-title').value.trim();
    s.brandSubtitle = page.querySelector('#st-sub').value.trim();
    state.profile.name = s.userName;
    saveSettings();
    saveProfile();
    renderProfileCard();
    renderTopbar();
    alert('设置已保存');
  });

  page.querySelectorAll('.focus-preset').forEach(btn => {
    btn.addEventListener('click', () => {
      setFocusPreset(Number(btn.dataset.min));
      renderContent();
    });
  });

  page.querySelector('#st-export').addEventListener('click', exportData);
  page.querySelector('#st-import').addEventListener('click', () => importFile.click());

  page.querySelector('#st-reset-menu').addEventListener('click', () => {
    if (!confirm('确认恢复默认菜单结构？自定义分组会丢失。')) return;
    localStorage.removeItem('xenos-groups');
    state.groups = loadGroups();
    saveGroups();
    state.activeItem = '工作台首页';
    renderMenu();
    renderContent();
    renderMobileTabs();
  });

  page.querySelector('#st-reset-all').addEventListener('click', () => {
    if (!confirm('确认清空全部数据？此操作不可恢复！')) return;
    if (!confirm('再次确认：所有记录都会被删除。')) return;
    Object.keys(localStorage)
      .filter(k => k.startsWith('xenos-'))
      .forEach(k => localStorage.removeItem(k));
    location.reload();
  });
}
// Export / Import (full backup of all localStorage data)
function exportData() {
  const data = { exportedAt: new Date().toISOString(), version: 1 };
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('xenos-')) {
      try {
        data[key] = JSON.parse(localStorage.getItem(key));
      } catch (e) {
        data[key] = localStorage.getItem(key);
      }
    }
  }
  data['xenos-activeItem'] = state.activeItem;
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `xenos-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

document.getElementById('btn-export').addEventListener('click', exportData);

document.getElementById('btn-import').addEventListener('click', () => importFile.click());

importFile.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      // Write every xenos-* key back to localStorage
      Object.keys(data).forEach(key => {
        if (key.startsWith('xenos-')) {
          try {
            localStorage.setItem(key, JSON.stringify(data[key]));
          } catch (e) {
            localStorage.setItem(key, String(data[key]));
          }
        }
      });
      // Reload all state from localStorage
      state.groups = loadGroups();
      state.plans = loadPlans();
      state.settings = loadSettings();
      state.checkins = loadCheckins();
      state.body = loadBody();
      state.measurements = loadMeasurements();
      state.dietLogs = loadDietLogs();
      state.exerciseLogs = loadExerciseLogs();
      state.workoutVideos = loadWorkoutVideos();
      state.dietMemos = loadDietMemos();
      state.memos = loadMemos();
      state.money = loadMoney();
      state.budget = loadBudget();
      state.transactions = loadTransactions();
      state.points = loadPoints();
      state.expenseCategories = loadExpenseCategories();
      state.incomeCategories = loadIncomeCategories();
      state.planGroups = loadPlanGroups();
      state.budgetSettled = loadBudgetSettled();
      // 新模块数据
      state.profile = loadProfile();
      state.dailyReviews = loadDailyReviews();
      state.voiceReviews = loadVoiceReviews();
      state.rewards = loadRewards();
      state.achievements = loadAchievements();
      state.contentItems = loadContentItems();
      state.focusSessions = loadFocusSessions();
      state.domains = loadDomains();
      state.quote = loadQuote();
      state.assetAccounts = loadAssetAccounts();
      state.investNote = localStorage.getItem('xenos-invest-note') || '';
      if (data['xenos-activeItem'] || data.activeItem) state.activeItem = data['xenos-activeItem'] || data.activeItem;
      renderProfileCard();
      renderTopbar();
      renderMenu();
      renderContent();
      renderMobileTabs();
      renderStreak();
      alert('导入成功，数据已同步');
    } catch (err) {
      alert('导入失败，请检查 JSON 格式');
    }
  };
  reader.readAsText(file);
  importFile.value = '';
});

// Click on main content to close sidebar on mobile
const main = document.getElementById('main');
main.addEventListener('click', (e) => {
  clearActiveActions();
  if (window.innerWidth <= 768 && state.sidebarOpen && !e.target.closest('.menu-toggle')) {
    closeSidebar();
  }
});

// Swipe to open sidebar on mobile
let touchStartX = 0;
main.addEventListener('touchstart', (e) => {
  touchStartX = e.touches[0].clientX;
}, { passive: true });

main.addEventListener('touchend', (e) => {
  const touchEndX = e.changedTouches[0].clientX;
  if (touchEndX - touchStartX > 60 && touchStartX < 40) {
    openSidebar();
  }
}, { passive: true });

// 手势返回：仅在移动端、从内容区左缘右滑时触发
let backSwipeX = 0;
let backSwipeY = 0;
let backSwipeActive = false;
content.addEventListener('touchstart', (e) => {
  const t = e.touches[0];
  backSwipeActive = window.innerWidth <= 768 && t.clientX < 24;
  backSwipeX = t.clientX;
  backSwipeY = t.clientY;
}, { passive: true });

content.addEventListener('touchend', (e) => {
  if (!backSwipeActive) return;
  backSwipeActive = false;
  const t = e.changedTouches[0];
  const dx = t.clientX - backSwipeX;
  const dy = t.clientY - backSwipeY;
  if (dx > 60 && Math.abs(dy) < 80) {
    goBack();
  }
}, { passive: true });

// 长按显示列表项删除按钮（统一行为：任务/计划/运动/项目/语音/奖励）
(function initLongPressDelete() {
  let timer = null;
  let activeRow = null;
  const SELECTOR = '.task-row, .plan-item, .exercise-row, .proj-task, .voice-item, .reward-row, .br-branch-card, .study-plan-item, .eng-task-row';
  const LONG_PRESS_MS = 600;

  function clearActive() {
    if (activeRow) {
      activeRow.classList.remove('show-delete');
      activeRow = null;
    }
    if (timer) { clearTimeout(timer); timer = null; }
  }

  document.addEventListener('pointerdown', (e) => {
    const row = e.target.closest(SELECTOR);
    if (!row) { clearActive(); return; }
    // 点击删除按钮/编辑按钮/action 按钮时不触发长按
    if (e.target.closest('.item-delete, .icon-action, .plan-item-actions, .br-next-btn')) return;
    clearActive();
    activeRow = row;
    timer = setTimeout(() => {
      row.classList.add('show-delete');
      if (navigator.vibrate) navigator.vibrate(20);
      timer = null;
    }, LONG_PRESS_MS);
  }, { passive: true });

  document.addEventListener('pointerup', () => {
    if (timer) { clearTimeout(timer); timer = null; }
  });

  document.addEventListener('pointercancel', clearActive);

  // 点击空白处隐藏已显示的删除按钮
  document.addEventListener('click', (e) => {
    if (!e.target.closest(SELECTOR + '.show-delete, .item-delete, .icon-action')) {
      clearActive();
    }
  });
})();

// Close action bars when tapping outside the menu
document.addEventListener('click', (e) => {
  if (!e.target.closest('.menu-item') && !e.target.closest('.group-header') && !e.target.closest('.icon-action')) {
    clearActiveActions();
  }
});

// ---------- 全局返回按钮 ----------
const backBtn = document.getElementById('back-btn');
if (backBtn) backBtn.addEventListener('click', goBack);

// ---------- 悬浮专注按钮 & 专注模态框 ----------
makeFabDraggable();

document.getElementById('focus-toggle').addEventListener('click', toggleFocus);
document.getElementById('focus-reset').addEventListener('click', resetFocus);
document.getElementById('focus-close').addEventListener('click', closeFocusModal);


focusModal.addEventListener('click', (e) => {
  if (e.target === focusModal) closeFocusModal();
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && focusModal.classList.contains('active')) closeFocusModal();
});

const rewardDetailModal = document.getElementById('reward-detail-modal');
rewardDetailModal.addEventListener('click', (e) => {
  if (e.target === rewardDetailModal) rewardDetailModal.classList.remove('active');
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && rewardDetailModal.classList.contains('active')) rewardDetailModal.classList.remove('active');
});

// 列表项删除统一委托处理：点击 🗑 删除对应条目并刷新当前页
// del-type: plan=计划, exercise=今日运动, domain-task=领域每日打卡任务, eng-task=英语打卡任务记录
document.addEventListener('click', (e) => {
  const del = e.target.closest('.item-delete');
  if (!del) return;
  const id = del.dataset.id;
  const type = del.dataset.delType || 'plan';
  e.preventDefault();
  e.stopPropagation();
  if (type === 'exercise') {
    const idx = parseInt(del.dataset.idx);
    const arr = getTodayExercise();
    if (!isNaN(idx) && arr[idx]) { arr.splice(idx, 1); saveExerciseLogs(); renderContent(); }
    return;
  }
  if (type === 'domain-task') {
    const dkey = del.dataset.domain;
    const dom = state.domains[dkey];
    if (dom) {
      const t = dom.tasks.find(x => x.id === id);
      if (t && t.done) adjustDomainLog(dkey, getTodayKey(), -(t.points || 0));
      dom.tasks = dom.tasks.filter(x => x.id !== id);
      saveDomains();
      renderContent();
    }
    return;
  }
  if (type === 'plan') {
    deletePlanById(id);
    renderContent();
  }
  if (type === 'eng-task') {
    const taskType = del.dataset.type;
    const taskKey = del.dataset.key;
    const day = getEnglishToday();
    const pool = taskType === 'weekly' ? day.weekly : day.tasks;
    if (pool[taskKey] && pool[taskKey].done) {
      const task = taskType === 'weekly'
        ? ENGLISH_WEEKLY_TASKS.find(t => t.key === taskKey)
        : ENGLISH_DAILY_TASKS.find(t => t.key === taskKey);
      if (task) state.englishCheckin.totalPoints = (state.englishCheckin.totalPoints || 0) - task.points;
    }
    if (pool[taskKey]) { pool[taskKey].done = false; pool[taskKey].note = ''; }
    saveEnglishCheckin();
    renderContent();
    return;
  }
  if (type === 'branch-focus') {
    const name = del.dataset.focusName;
    const mf = (state.settings.monthlyFocus || DEFAULT_SETTINGS.monthlyFocus).slice();
    const i = mf.indexOf(name);
    if (i >= 0) {
      mf.splice(i, 1);
      state.settings.monthlyFocus = mf;
      saveSettings();
      renderContent();
    }
    return;
  }
});

// 离开页面前提醒正在进行的专注
window.addEventListener('beforeunload', (e) => {
  if (state.focus.running) {
    e.preventDefault();
    e.returnValue = '';
  }
});

// 初始化资产账户：如果旧版 money.total 有值而资产账户为空，迁移到余额账户
(function syncAssetAccounts() {
  const assetTotal = calcAssetTotal();
  if (assetTotal === 0 && state.money.total > 0) {
    const balance = state.assetAccounts.find(a => a.id === 'balance');
    if (balance) balance.amount = state.money.total;
    saveAssetAccounts();
  }
  state.money.total = calcAssetTotal();
  saveMoney();
})();

// Init
if (localStorage.getItem('xenos-reset-progress-v9066') === null) {
  resetProgressData();
  localStorage.setItem('xenos-reset-progress-v9066', '1');
}
if (localStorage.getItem('xenos-reset-rewards-v9067') === null) {
  resetRewardsDefaults();
  localStorage.setItem('xenos-reset-rewards-v9067', '1');
}
migrateData();
resetPlansForNewDay();
renderProfileCard();
renderTopbar();
renderMenu();
renderContent();
renderMobileTabs();
updateBottomNav();
bindBottomNav();
updateBackBtn();
initDragHandlers();
bindFocusDial();
renderStreak();
evaluateAchievements();
updateFocusUI();

// 每分钟刷新一次问候语与顶栏日期
setInterval(renderTopbar, 60 * 1000);

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js?v=3', { updateViaCache: 'none' })
      .then((reg) => {
        // 立即检查是否有新版本，有则触发更新
        reg.update();
      })
      .catch(() => {});
  });
  // 新版本 service worker 接管后自动刷新一次，确保用户立即看到最新内容
  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (refreshing) return;
    refreshing = true;
    location.reload();
  });
}

// =========================================================
// 奶油/小兔主题：通用图表与进度环辅助（v9012）
// =========================================================
function miniRingHTML(percent, colorClass, num, label) {
  const r = 28, c = 2 * Math.PI * r;
  percent = Math.max(0, Math.min(100, percent || 0));
  return `<div class="mini-ring ${colorClass}">
    <svg viewBox="0 0 64 64">
      <circle class="mr-bg" cx="32" cy="32" r="${r}"></circle>
      <circle class="mr-fg" cx="32" cy="32" r="${r}" style="stroke-dasharray:${c.toFixed(1)};stroke-dashoffset:${(c * (1 - percent / 100)).toFixed(1)}"></circle>
    </svg>
    <div class="mr-num"><span class="mr-num-main">${num}</span><small>${label}</small></div>
  </div>`;
}

function inlineSparkline(values, color, fillOpacity, fillTo) {
  if (!values || values.length < 2) return '<p class="chart-empty">数据不足</p>';
  const w = 260, h = 44, pad = { l: 4, r: 4, t: 6, b: 4 };
  const max = Math.max(...values), min = Math.min(...values);
  const range = (max - min) || 1;
  const x = i => pad.l + (i / (values.length - 1)) * (w - pad.l - pad.r);
  const y = v => pad.t + (1 - (v - min) / range) * (h - pad.t - pad.b);
  const pts = values.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  const area = `${pad.l},${h - pad.b} ${pts} ${w - pad.r},${h - pad.b}`;
  const dots = values.map((v, i) => `<circle cx="${x(i).toFixed(1)}" cy="${y(v).toFixed(1)}" r="2" fill="#fff" stroke="${color}" stroke-width="1.2"></circle>`).join('');
  if (fillTo) {
    const gradId = 'spark-' + Math.random().toString(36).slice(2, 8);
    return `<svg class="spark-chart" viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMid meet">
      <defs><linearGradient id="${gradId}" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="${color}" stop-opacity="0.25"/><stop offset="100%" stop-color="${fillTo}" stop-opacity="0.02"/></linearGradient></defs>
      <polygon points="${area}" fill="url(#${gradId})"></polygon>
      <polyline points="${pts}" fill="none" stroke="${color}" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"></polyline>
      ${dots}
    </svg>`;
  }
  return `<svg class="spark-chart" viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMid meet">
    <polygon points="${area}" fill="${color}" opacity="${fillOpacity == null ? 0.10 : fillOpacity}"></polygon>
    <polyline points="${pts}" fill="none" stroke="${color}" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"></polyline>
    ${dots}
  </svg>`;
}

function inlineLineChart(values, color, height) {
  height = height || 150;
  const w = 600;
  if (!values || values.length < 2) return '<p class="chart-empty">数据不足</p>';
  const max = Math.max(...values), min = Math.min(...values);
  const range = (max - min) || 1;
  const pad = { t: 14, r: 14, b: 22, l: 32 };
  const cw = w - pad.l - pad.r, ch = height - pad.t - pad.b;
  const x = i => pad.l + (i / (values.length - 1)) * cw;
  const y = v => pad.t + ch - ((v - min) / range) * ch;
  const pts = values.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  const area = `${pad.l},${pad.t + ch} ${pts} ${pad.l + cw},${pad.t + ch}`;
  let grid = '';
  for (let i = 0; i <= 3; i++) {
    const gy = pad.t + (i / 3) * ch;
    grid += `<line x1="${pad.l}" y1="${gy.toFixed(1)}" x2="${pad.l + cw}" y2="${gy.toFixed(1)}" stroke="var(--border)" stroke-width="1"></line>`;
  }
  return `<svg class="line-chart" viewBox="0 0 ${w} ${height}" preserveAspectRatio="xMidYMid meet">
    ${grid}
    <polygon points="${area}" fill="${color}" opacity="0.10"></polygon>
    <polyline points="${pts}" fill="none" stroke="${color}" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"></polyline>
    ${values.map((v, i) => `<circle cx="${x(i).toFixed(1)}" cy="${y(v).toFixed(1)}" r="3" fill="#fff" stroke="${color}" stroke-width="1" vector-effect="non-scaling-stroke"></circle>`).join('')}
  </svg>`;
}

function dualLineChart(valuesA, colorA, valuesB, colorB) {
  // 双 Y 轴折线图：A 轴左侧 0-10h，B 轴右侧 0%-100%
  const w = 340, h = 152;
  const pad = { t: 18, r: 34, b: 26, l: 34 };
  const cw = w - pad.l - pad.r, ch = h - pad.t - pad.b;
  const days = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];

  // A 映射到 0-10，B 映射到 0-100
  const yA = v => pad.t + ch - (Math.max(0, Math.min(10, v || 0)) / 10) * ch;
  const yB = v => pad.t + ch - (Math.max(0, Math.min(100, v || 0)) / 100) * ch;
  const x = i => pad.l + (i / (valuesA.length - 1)) * cw;

  const ptsA = valuesA.map((v, i) => `${x(i).toFixed(1)},${yA(v).toFixed(1)}`).join(' ');
  const ptsB = valuesB.map((v, i) => `${x(i).toFixed(1)},${yB(v).toFixed(1)}`).join(' ');

  let grid = '';
  // 5 条水平网格线（对应 10/8/6/4/2h 和 100/80/60/40/20%）
  for (let i = 0; i <= 4; i++) {
    const gy = pad.t + (i / 4) * ch;
    grid += `<line x1="${pad.l}" y1="${gy.toFixed(1)}" x2="${pad.l + cw}" y2="${gy.toFixed(1)}" stroke="#F5EDE5" stroke-width="0.8"></line>`;
  }

  // 左侧 Y 轴标签（睡眠 10h/6h/2h）
  const leftLabels = [
    { y: pad.t, t: '10h' },
    { y: pad.t + ch * 0.5, t: '6h' },
    { y: pad.t + ch, t: '2h' }
  ];
  // 右侧 Y 轴标签（学习 100%/60%/20%）
  const rightLabels = [
    { y: pad.t, t: '100%' },
    { y: pad.t + ch * 0.5, t: '60%' },
    { y: pad.t + ch, t: '20%' }
  ];

  const labelText = (list, anchor, xPos) => list.map(l =>
    `<text x="${xPos}" y="${l.y.toFixed(1)}" fill="#B8A99A" font-size="8" text-anchor="${anchor}" dominant-baseline="middle">${l.t}</text>`
  ).join('');

  // 数据标签
  const valueLabelsA = valuesA.map((v, i) => {
    const px = x(i), py = yA(v);
    return `<text x="${px.toFixed(1)}" y="${(py - 6).toFixed(1)}" fill="#9C8AD0" font-size="7.5" text-anchor="middle" font-weight="600">${v.toFixed(1)}</text>`;
  }).join('');
  const valueLabelsB = valuesB.map((v, i) => {
    const px = x(i), py = yB(v);
    return `<text x="${px.toFixed(1)}" y="${(py - 6).toFixed(1)}" fill="#E89F5C" font-size="7.5" text-anchor="middle" font-weight="600">${Math.round(v)}%</text>`;
  }).join('');

  // 数据点：紫色实心+白边；橙色空心（更细更精致）
  const dotsA = valuesA.map((v, i) => {
    const px = x(i), py = yA(v);
    return `<circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="2.1" fill="${colorA}" stroke="#fff" stroke-width="1"></circle>`;
  }).join('');
  const dotsB = valuesB.map((v, i) => {
    const px = x(i), py = yB(v);
    return `<circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="2.1" fill="#fff" stroke="${colorB}" stroke-width="1.3"></circle>`;
  }).join('');

  // X 轴标签
  const xLabels = days.map((d, i) => {
    const px = x(i);
    return `<text x="${px.toFixed(1)}" y="${(h - 8).toFixed(1)}" fill="#A99A8A" font-size="8" text-anchor="middle">${d}</text>`;
  }).join('');

  return `<svg class="insp-trend-chart" viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMid meet">
    ${grid}
    ${labelText(leftLabels, 'end', pad.l - 5)}
    ${labelText(rightLabels, 'start', pad.l + cw + 5)}
    <polyline points="${ptsA}" fill="none" stroke="${colorA}" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"></polyline>
    <polyline points="${ptsB}" fill="none" stroke="${colorB}" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"></polyline>
    ${dotsA}
    ${dotsB}
    ${valueLabelsA}
    ${valueLabelsB}
    ${xLabels}
  </svg>`;
}

function weeklyLineChart(values, color, unit) {
  const w = 320, h = 140;
  const pad = { t: 18, r: 12, b: 22, l: 26 };
  const cw = w - pad.l - pad.r, ch = h - pad.t - pad.b;
  const days = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
  const nums = values.map(v => Number(v) || 0);
  const maxVal = Math.max(1, ...nums);
  let niceMax = 1;
  const cand = [1, 2, 5, 10, 20, 30, 50, 100, 200, 300, 500, 1000, 2000, 3000, 5000, 10000, 20000, 50000];
  for (const c of cand) { if (maxVal <= c) { niceMax = c; break; } niceMax = c; }
  const y = v => pad.t + ch - (Math.max(0, Math.min(niceMax, v || 0)) / niceMax) * ch;
  const x = i => pad.l + (i / (nums.length - 1)) * cw;
  let grid = '';
  for (let i = 0; i <= 4; i++) {
    const gy = pad.t + (i / 4) * ch;
    grid += '<line x1="' + pad.l + '" y1="' + gy.toFixed(1) + '" x2="' + (pad.l + cw) + '" y2="' + gy.toFixed(1) + '" stroke="#F5EDE5" stroke-width="0.8"></line>';
  }
  const yLabels = [0, niceMax / 2, niceMax].map(v => '<text x="' + (pad.l - 4) + '" y="' + (pad.t + ch - (v / niceMax) * ch).toFixed(1) + '" fill="#B8A99A" font-size="8" text-anchor="end" dominant-baseline="middle">' + Math.round(v) + '</text>').join('');
  const pts = nums.map((v, i) => x(i).toFixed(1) + ',' + y(v).toFixed(1)).join(' ');
  const dots = nums.map((v, i) => '<circle cx="' + x(i).toFixed(1) + '" cy="' + y(v).toFixed(1) + '" r="2.2" fill="' + color + '" stroke="#fff" stroke-width="1"></circle>').join('');
  const valLabels = nums.map((v, i) => '<text x="' + x(i).toFixed(1) + '" y="' + (y(v) - 6).toFixed(1) + '" fill="' + color + '" font-size="7.5" text-anchor="middle" font-weight="600">' + Math.round(v) + '</text>').join('');
  const xLabels = days.map((d, i) => '<text x="' + x(i).toFixed(1) + '" y="' + (h - 7).toFixed(1) + '" fill="#A99A8A" font-size="8" text-anchor="middle">' + d + '</text>').join('');
  return '<svg class="insp-trend-chart" viewBox="0 0 ' + w + ' ' + h + '" preserveAspectRatio="xMidYMid meet">' + grid + yLabels + '<polyline points="' + pts + '" fill="none" stroke="' + color + '" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"></polyline>' + dots + valLabels + xLabels + '</svg>';
}

function branchProgress(keywords) {
  const rel = state.plans.filter(p => keywords.some(k => p.text.includes(k)));
  if (!rel.length) return 0;
  return Math.round(rel.filter(p => p.done).length / rel.length * 100);
}
function branchTrend(pct) {
  return [0, 1, 2, 3, 4, 5, 6].map(i => Math.max(0, Math.min(100, pct + Math.round(Math.sin(i * 1.3 + pct) * 14))));
}

// ============ 阶段选择器 ============
function openPhasePicker() {
  const overlay = document.createElement('div');
  overlay.className = 'phase-picker-overlay';
  const options = state.settings.phaseOptions || DEFAULT_SETTINGS.phaseOptions;
  const current = state.settings.currentPhase || DEFAULT_SETTINGS.currentPhase;

  overlay.innerHTML = `
    <div class="phase-picker-card">
      <div class="phase-picker-title">选择当前阶段</div>
      <div class="phase-options">
        ${options.map(opt => `
          <div class="phase-option ${opt === current ? 'active' : ''}" data-phase="${escapeHTML(opt)}">
            <span class="phase-check">${opt === current ? '✓' : ''}</span>
            <span class="phase-name">${escapeHTML(opt)}</span>
            <button class="phase-del" data-del-phase="${escapeHTML(opt)}" title="删除">×</button>
          </div>
        `).join('')}
      </div>
      <div class="phase-add">
        <input type="text" class="phase-add-input" placeholder="自定义阶段" maxlength="8">
        <button class="phase-add-btn">增加</button>
      </div>
      <button class="phase-cancel">取消</button>
    </div>
  `;

  document.body.appendChild(overlay);

  overlay.querySelectorAll('.phase-option').forEach(el => {
    el.addEventListener('click', (e) => {
      if (e.target.closest('.phase-del')) return;
      state.settings.currentPhase = el.dataset.phase;
      saveSettings();
      renderContent();
      overlay.remove();
    });
  });

  overlay.querySelectorAll('.phase-del').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const phase = btn.dataset.delPhase;
      if (state.settings.phaseOptions.length <= 1) return;
      state.settings.phaseOptions = state.settings.phaseOptions.filter(p => p !== phase);
      if (state.settings.currentPhase === phase) {
        state.settings.currentPhase = state.settings.phaseOptions[0];
      }
      saveSettings();
      renderContent();
      overlay.remove();
    });
  });

  const addInput = overlay.querySelector('.phase-add-input');
  overlay.querySelector('.phase-add-btn').addEventListener('click', () => {
    const v = addInput.value.trim();
    if (!v) return;
    if (state.settings.phaseOptions.includes(v)) return;
    state.settings.phaseOptions.push(v);
    state.settings.currentPhase = v;
    saveSettings();
    renderContent();
    overlay.remove();
  });

  overlay.querySelector('.phase-cancel').addEventListener('click', () => overlay.remove());
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
}

// ============ 本月重点选择器 ============
function openMonthlyFocusPicker() {
  const overlay = document.createElement('div');
  overlay.className = 'phase-picker-overlay';
  const options = state.settings.focusOptions || DEFAULT_SETTINGS.focusOptions;
  const current = state.settings.monthlyFocus || DEFAULT_SETTINGS.monthlyFocus;

  overlay.innerHTML = `
    <div class="phase-picker-card">
      <div class="phase-picker-title">选择本月主线</div>
      <div class="focus-options">
        ${options.map(opt => `
          <div class="focus-option ${current.includes(opt) ? 'active' : ''}" data-focus="${escapeHTML(opt)}">
            <span class="focus-check">✓</span>
            <span class="focus-name">${escapeHTML(opt)}</span>
            <span class="focus-del" data-focus-del="${escapeHTML(opt)}">×</span>
          </div>
        `).join('')}
      </div>
      <div class="phase-add">
        <input type="text" class="focus-add-input" placeholder="自定义重点" maxlength="8">
        <button class="focus-add-btn">增加</button>
      </div>
      <button class="phase-cancel">完成</button>
    </div>
  `;

  document.body.appendChild(overlay);

  function updateSelection() {
    overlay.querySelectorAll('.focus-option').forEach(el => {
      el.classList.toggle('active', current.includes(el.dataset.focus));
    });
  }

  // 标签交互：点击=选择/取消（最多 3 个）；长按 600ms=显示删除按钮 ×，再点 × 从标签池删除
  let lpTimer = null;
  overlay.querySelectorAll('.focus-option').forEach(el => {
    el.addEventListener('pointerdown', (e) => {
      if (e.target.closest('.focus-del')) return;
      lpTimer = setTimeout(() => {
        el.classList.add('show-delete');
        el._lpTime = Date.now();
        if (navigator.vibrate) navigator.vibrate(20);
        lpTimer = null;
      }, 600);
    });
    const clearLp = () => { if (lpTimer) { clearTimeout(lpTimer); lpTimer = null; } };
    el.addEventListener('pointerup', clearLp);
    el.addEventListener('pointercancel', clearLp);
    el.addEventListener('click', () => {
      if (el.classList.contains('show-delete')) {
        // 长按释放后紧接的 click 忽略，保证删除按钮可点击；后续再次点击才收起
        if (el._lpTime && Date.now() - el._lpTime < 700) return;
        el.classList.remove('show-delete');
        return;
      }
      const focus = el.dataset.focus;
      const idx = current.indexOf(focus);
      if (idx >= 0) {
        current.splice(idx, 1);
      } else if (current.length < 3) {
        current.push(focus);
      }
      state.settings.monthlyFocus = current.slice();
      saveSettings();
      updateSelection();
      renderContent();
    });
  });
  // 点击空白区域收起已显示的删除按钮
  overlay.addEventListener('click', (e) => {
    if (!e.target.closest('.focus-option')) {
      overlay.querySelectorAll('.focus-option.show-delete').forEach(o => o.classList.remove('show-delete'));
    }
  });

  overlay.querySelectorAll('.focus-del').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const focus = btn.dataset.focusDel;
      // 确保 focusOptions 已是本地存储数组（避免污染默认预设）
      if (!Array.isArray(state.settings.focusOptions)) {
        state.settings.focusOptions = (DEFAULT_SETTINGS.focusOptions || []).slice();
      }
      // 从备选标签池彻底删除
      const oi = state.settings.focusOptions.indexOf(focus);
      if (oi >= 0) state.settings.focusOptions.splice(oi, 1);
      // 若已选入本月主线，同时移除
      const ci = current.indexOf(focus);
      if (ci >= 0) {
        current.splice(ci, 1);
        state.settings.monthlyFocus = current.slice();
      }
      saveSettings();
      updateSelection();
      renderContent();
      // 从弹窗列表移除该项
      const optEl = btn.closest('.focus-option');
      if (optEl) optEl.remove();
    });
  });

  const addInput = overlay.querySelector('.focus-add-input');
  overlay.querySelector('.focus-add-btn').addEventListener('click', () => {
    const v = addInput.value.trim();
    if (!v) return;
    if (!state.settings.focusOptions) state.settings.focusOptions = options.slice();
    if (!state.settings.focusOptions.includes(v)) state.settings.focusOptions.push(v);
    if (!current.includes(v) && current.length < 3) current.push(v);
    state.settings.monthlyFocus = current.slice();
    saveSettings();
    renderContent();
    overlay.remove();
    openMonthlyFocusPicker();
  });

  overlay.querySelector('.phase-cancel').addEventListener('click', () => overlay.remove());
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
}

// ============ 暂时放缓 - 长远计划选择器 ============
function openSlowBranchPicker() {
  const overlay = document.createElement('div');
  overlay.className = 'phase-picker-overlay';
  const pool = (state.settings.slowPool || DEFAULT_SETTINGS.slowPool).slice();
  const current = state.settings.slowBranches || DEFAULT_SETTINGS.slowBranches;

  overlay.innerHTML = `
    <div class="phase-picker-card">
      <div class="phase-picker-title">长远计划库</div>
      <p class="phase-picker-sub">点击下方计划添加到「暂时放缓」</p>
      <div class="slow-pool-list">
        ${pool.map(p => {
          const active = current.some(s => s.name === p.name);
          return `<div class="slow-pool-item ${active ? 'active' : ''}" data-name="${escapeHTML(p.name)}" data-emoji="${escapeHTML(p.emoji)}" data-desc="${escapeHTML(p.desc)}">
            <span class="spi-emoji">${p.emoji}</span>
            <div class="spi-body">
              <div class="spi-name">${escapeHTML(p.name)}</div>
              <div class="spi-desc">${escapeHTML(p.desc)}</div>
            </div>
            <span class="spi-status">${active ? '已添加' : '添加'}</span>
          </div>`;
        }).join('')}
      </div>
      <button class="phase-cancel">完成</button>
    </div>
  `;

  document.body.appendChild(overlay);

  overlay.querySelectorAll('.slow-pool-item').forEach(item => {
    item.addEventListener('click', () => {
      const name = item.dataset.name;
      const emoji = item.dataset.emoji;
      const idx = current.findIndex(s => s.name === name);
      if (idx >= 0) {
        current.splice(idx, 1);
      } else {
        current.push({ name, emoji });
      }
      state.settings.slowBranches = current.slice();
      saveSettings();
      renderContent();
      overlay.remove();
      openSlowBranchPicker();
    });
  });

  overlay.querySelector('.phase-cancel').addEventListener('click', () => overlay.remove());
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
}

// ============ 我的支线（Screenshot 2） ============
// 支线卡片图标：彩色填充风格，与圆框背景搭配
function branchIconBook(stroke = '#9C8AC9', fill = '#a99add', line = '#ffffff') {
  // 柔和同色系描边 + 清晰书形 + 小笑脸（描边比原减半后再略粗一点点）
  return `<svg class="br-icon-svg" viewBox="0 0 32 32" width="26" height="26" aria-hidden="true">
    <g stroke-linecap="round" stroke-linejoin="round">
      <path d="M7 10c0-1.7 1.4-3 3.1-3h5.9v17H10.1C8.4 24 7 22.8 7 21.1V10z" fill="#F6EFE0" stroke="${stroke}" stroke-width="1.1"/>
      <path d="M25 10c0-1.7-1.4-3-3.1-3H16v17h5.9c1.7 0 3.1-1.2 3.1-2.9V10z" fill="#F1E9FA" stroke="${stroke}" stroke-width="1.1"/>
      <path d="M16 7V24" stroke="${stroke}" stroke-width="1.3"/>
      <circle cx="11.5" cy="14" r="0.8" fill="${stroke}"/>
      <circle cx="20.5" cy="14" r="0.8" fill="${stroke}"/>
      <path d="M11 16.6q1.3 1.3 2.8 0" stroke="${stroke}" stroke-width="0.8" fill="none"/>
    </g>
  </svg>`;
}

function branchIconLeaf(color = '#a0bb7a') {
  return `<svg class="br-icon-svg br-icon-leaf" viewBox="0 0 32 32" width="26" height="26" aria-hidden="true">
    <g stroke-linecap="round" stroke-linejoin="round">
      <path d="M16 18c-2.5-3-6.5-4-10-2.5 1 3.5 4 6.5 8.5 7.5L16 27V18z" fill="${color}" stroke="${color}" stroke-width="1.2" opacity="0.95"/>
      <path d="M16 18c2.5-3 6.5-4 10-2.5-1 3.5-4 6.5-8.5 7.5L16 27V18z" fill="${color}" stroke="${color}" stroke-width="1.2" opacity="0.95"/>
      <path d="M16 27v3" stroke="${color}" stroke-width="1.5" fill="none"/>
      <path d="M16 18v7" stroke="#ffffff" stroke-width="0.8" opacity="0.6" fill="none"/>
      <path d="M13 20l3-2" stroke="#ffffff" stroke-width="0.7" opacity="0.5" fill="none"/>
      <path d="M19 20l-3-2" stroke="#ffffff" stroke-width="0.7" opacity="0.5" fill="none"/>
    </g>
  </svg>`;
}

function branchIconMoney(color = '#f7ba61') {
  return `<svg class="br-icon-svg" viewBox="0 0 32 32" width="26" height="26" aria-hidden="true">
    <g stroke-linecap="round" stroke-linejoin="round">
      <circle cx="16" cy="16" r="11" fill="none" stroke="${color}" stroke-width="1.6"/>
      <circle cx="16" cy="16" r="8.5" fill="none" stroke="${color}" stroke-width="1"/>
      <g stroke="${color}" stroke-width="1.4" fill="none">
        <path d="M16 10v12"/>
        <path d="M18 12.5c-1-.6-2.5-.5-3 .2-.8 1-.2 2 1.5 2.5 1.8.6 2.5 1.8 1.8 3-.6 1-2.2 1.2-3.3.5"/>
      </g>
    </g>
  </svg>`;
}

function branchIconTarget(color = '#E8B4A8') {
  return `<svg class="br-icon-svg br-icon-target" viewBox="0 0 32 32" width="26" height="26" aria-hidden="true">
    <g stroke-linecap="round" stroke-linejoin="round">
      <circle cx="16" cy="16" r="11" fill="none" stroke="${color}" stroke-width="1.6"/>
      <circle cx="16" cy="16" r="6.5" fill="none" stroke="${color}" stroke-width="1.4"/>
      <circle cx="16" cy="16" r="2.2" fill="${color}"/>
    </g>
  </svg>`;
}

// 首页顶部：抱咖啡杯的兔子（右侧装饰）
function homeBunnyCoffeeSVG() {
  return `<svg class="hp-bunny-coffee" viewBox="0 0 110 110" aria-hidden="true">
    <ellipse cx="35" cy="22" rx="8" ry="14" fill="#FFF5F0"/>
    <ellipse cx="38" cy="24" rx="4" ry="8" fill="#FFD6D6"/>
    <ellipse cx="75" cy="22" rx="8" ry="14" fill="#FFF5F0"/>
    <ellipse cx="72" cy="24" rx="4" ry="8" fill="#FFD6D6"/>
    <ellipse cx="55" cy="45" rx="28" ry="24" fill="#FFF5F0"/>
    <circle cx="45" cy="42" r="2.5" fill="#6B5B50"/>
    <circle cx="65" cy="42" r="2.5" fill="#6B5B50"/>
    <circle cx="41" cy="47" r="3" fill="#FFD6D6" opacity="0.5"/>
    <circle cx="69" cy="47" r="3" fill="#FFD6D6" opacity="0.5"/>
    <ellipse cx="55" cy="49" rx="2" ry="1.5" fill="#FFB6B6"/>
    <path d="M53 52 Q55 54 57 52" stroke="#6B5B50" stroke-width="1.2" fill="none" stroke-linecap="round"/>
    <ellipse cx="80" cy="68" rx="14" ry="10" fill="#FFF0E0" stroke="#E8C9A8" stroke-width="1"/>
    <rect x="70" y="58" width="18" height="14" rx="3" fill="#FFF0E0" stroke="#E8C9A8" stroke-width="1"/>
    <path d="M88 62 Q92 62 92 66 Q92 70 88 70" fill="none" stroke="#E8C9A8" stroke-width="1.5" stroke-linecap="round"/>
    <line x1="73" y1="55" x2="83" y2="55" stroke="#E8C9A8" stroke-width="1.2" stroke-linecap="round"/>
    <circle cx="74" cy="53" r="0.8" fill="#F5A962" opacity="0.6"/>
    <circle cx="82" cy="51" r="0.8" fill="#F5A962" opacity="0.6"/>
    <ellipse cx="58" cy="70" rx="12" ry="8" fill="#FFF5F0"/>
  </svg>`;
}

// 今日一句：右侧小花绿植装饰
function quoteFlowersSVG() {
  return `<svg class="hp-quote-flowers" viewBox="0 0 90 90" aria-hidden="true">
    <g transform="translate(10,10)">
      <path d="M55 55 Q60 45 70 50 Q75 40 65 35 Q60 25 50 30 Q40 25 35 35 Q25 40 30 50 Q35 60 45 55 Z" fill="#FCE8D8"/>
      <circle cx="52" cy="43" r="5" fill="#FBD9B0"/>
      <circle cx="52" cy="43" r="2.5" fill="#FFF5E9"/>
      <path d="M52 50 Q52 65 52 75" stroke="#A5C98B" stroke-width="2" fill="none"/>
      <ellipse cx="46" cy="62" rx="5" ry="3" fill="#B8D9A8" transform="rotate(-25 46 62)"/>
      <ellipse cx="58" cy="68" rx="5" ry="3" fill="#B8D9A8" transform="rotate(25 58 68)"/>
      <circle cx="25" cy="35" r="4" fill="#F7D88A" opacity="0.9"/>
      <circle cx="25" cy="35" r="1.5" fill="#FFF"/>
      <path d="M25 40 L25 55" stroke="#A5C98B" stroke-width="1.5" fill="none"/>
      <ellipse cx="20" cy="48" rx="4" ry="2.5" fill="#C5E0B4" transform="rotate(-20 20 48)"/>
      <ellipse cx="30" cy="52" rx="4" ry="2.5" fill="#C5E0B4" transform="rotate(20 30 52)"/>
    </g>
  </svg>`;
}

// 主任务卡片：看书兔子
function bunnyReadingSVG() {
  return `<svg class="hp-bunny-reading" viewBox="0 0 100 90" aria-hidden="true">
    <ellipse cx="30" cy="18" rx="7" ry="12" fill="#FFF5F0"/>
    <ellipse cx="32" cy="20" rx="3.5" ry="7" fill="#FFD6D6"/>
    <ellipse cx="70" cy="18" rx="7" ry="12" fill="#FFF5F0"/>
    <ellipse cx="68" cy="20" rx="3.5" ry="7" fill="#FFD6D6"/>
    <ellipse cx="50" cy="38" rx="24" ry="21" fill="#FFF5F0"/>
    <circle cx="41" cy="35" r="2.2" fill="#6B5B50"/>
    <circle cx="59" cy="35" r="2.2" fill="#6B5B50"/>
    <circle cx="37" cy="40" r="2.8" fill="#FFD6D6" opacity="0.5"/>
    <circle cx="63" cy="40" r="2.8" fill="#FFD6D6" opacity="0.5"/>
    <ellipse cx="50" cy="42" rx="2" ry="1.5" fill="#FFB6B6"/>
    <path d="M48 45 Q50 47 52 45" stroke="#6B5B50" stroke-width="1.2" fill="none" stroke-linecap="round"/>
    <rect x="32" y="48" width="36" height="26" rx="4" fill="#F4B678" opacity="0.95"/>
    <rect x="36" y="52" width="28" height="18" rx="2" fill="#FFF8F2"/>
    <text x="50" y="63" font-size="9" fill="#F4B678" font-weight="700" text-anchor="middle">A</text>
    <ellipse cx="50" cy="62" rx="14" ry="9" fill="#FFF5F0"/>
  </svg>`;
}

// 天气条：小兔咖啡小图标
function weatherBunnyIconSVG() {
  return `<svg class="hp-weather-bunny" viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="9" cy="8" r="1.6" fill="#6B5B50"/>
    <circle cx="15" cy="8" r="1.6" fill="#6B5B50"/>
    <ellipse cx="12" cy="12" rx="7" ry="6" fill="#FFF5F0"/>
    <circle cx="8" cy="13" r="1.5" fill="#FFD6D6" opacity="0.5"/>
    <circle cx="16" cy="13" r="1.5" fill="#FFD6D6" opacity="0.5"/>
    <path d="M11 14 Q12 15 13 14" stroke="#6B5B50" stroke-width="0.8" fill="none" stroke-linecap="round"/>
    <rect x="9" y="15" width="6" height="5" rx="1.5" fill="#FFF0E0" stroke="#E8C9A8" stroke-width="0.6"/>
    <path d="M15 17 Q17 17 17 19 Q17 21 15 21" fill="none" stroke="#E8C9A8" stroke-width="0.8" stroke-linecap="round"/>
  </svg>`;
}

function renderBranchesPage() {
  const page = document.createElement('div');
  page.className = 'page';
  if (greetLine) greetLine.textContent = '我的支线';

  const streak = calcStreak();
  const currentPhase = state.settings.currentPhase || DEFAULT_SETTINGS.currentPhase;
  const monthlyFocus = state.settings.monthlyFocus || DEFAULT_SETTINGS.monthlyFocus;

  function branchTypeOf(name) {
    const n = String(name).toLowerCase();
    if (/英语|学习|阅读|单词|听力|专业|书|备考|考试|外语|知识/.test(n)) return 'learning';
    if (/健康|锻炼|睡眠|生活|护肤|体态|饮食|运动|健身|身体|养生/.test(n)) return 'health';
    if (/记账|钱|理财|收入|副业|自媒体|存钱|储蓄|经济|财务/.test(n)) return 'money';
    return 'learning';
  }
  const BRANCH_TEMPLATE = {
    learning: {
      icon: () => branchIconBook('#9C8AC9', '#a99add', '#ffffff'), cls: 'c-purple',
      sub: '每天进步一点点，未来更自由 ✨', lv: 'Lv.4', lvText: '进阶中', freq: '每周 6 天',
      keywords: ['单词', '音标', '听力', '阅读', '英语', '学习', '书'],
      btn: 'btn-purple', action: '背词汇 20min', trend: [22, 34, 28, 42, 38, 50, 45],
      route: '学习成长'
    },
    health: {
      icon: () => branchIconLeaf('#bccc8d'), cls: 'c-green',
      sub: '健康是所有热爱的底气 ✨', lv: 'Lv.3', lvText: '稳定中', freq: '每周 5 天',
      keywords: ['运动', '健身', '锻炼', '喝水', '睡眠', '饮食', '护肤', '体态'],
      btn: 'btn-green', action: '今晚 23:30 前睡', trend: [18, 30, 25, 38, 34, 46, 40],
      route: '健康'
    },
    money: {
      icon: () => branchIconMoney('#fbc877'), cls: 'c-orange',
      sub: '把热爱变现，创造更多可能 ✨', lv: 'Lv.2', lvText: '起步中', freq: '每周 3 天',
      keywords: ['自媒体', '副业', '项目', '记账', '存钱', '收入', '理财'],
      btn: 'btn-orange', action: '发布 1 篇笔记', trend: [15, 28, 22, 35, 30, 42, 36],
      route: '记账'
    }
  };
  // 各支线本周每日数据点（真实数据）
  function weeklyPointsFor(type) {
    if (type === 'health' || type === 'money') {
      const log = (state.domains[type] || {}).log || {};
      const days = [];
      for (let i = 6; i >= 0; i--) { const k = shiftDate(getTodayKey(), -i); days.push(Number(log[k]) || 0); }
      return days;
    }
    // learning：来自标记为该支线的专注会话
    const days = [];
    for (let i = 6; i >= 0; i--) { const k = shiftDate(getTodayKey(), -i); days.push(getFocusMinutesByDomain(k, 'learning')); }
    return days;
  }

  // 进度环：100% 按一周 7 天均分，每天基础份额 100/7；当天进度再按当天任务完成比例细化
  const DAY_BASE = 100 / 7;
  function calcBranchWeeklyProgress(type) {
    const todayKey = getTodayKey();
    let sum = 0;
    for (let i = 0; i < 7; i++) {
      const k = shiftDate(todayKey, -i);
      let ratio = 0;
      let tasks;
      if (k === todayKey) tasks = (state.domains[type] || { tasks: [] }).tasks || [];
      else { const h = (state.domainHistory[k] || {})[type]; tasks = (h && h.tasks) || []; }
      if (tasks && tasks.length) {
        // 有每日任务的支线（健康/记账/外貌等）：按当天完成比例计算当天份额
        ratio = tasks.filter(t => t.done).length / tasks.length;
      } else if (type === 'learning') {
        // 学习支线无 domain 任务时，以当天是否有专注时长作为完成日
        ratio = getFocusMinutesByDomain(k, 'learning') > 0 ? 1 : 0;
      } else {
        // 兜底：以当天积分日志是否大于 0 作为完成日
        const log = (state.domains[type] || {}).log || {};
        ratio = Number(log[k]) > 0 ? 1 : 0;
      }
      sum += ratio * DAY_BASE;
    }
    return Math.round(sum);
  }

  const branches = monthlyFocus.slice(0, 3).map(name => {
    const type = branchTypeOf(name);
    const t = BRANCH_TEMPLATE[type];
    const week = weeklyPointsFor(type);
    const weekTotal = week.reduce((s, v) => s + v, 0);
    const activeDays = week.filter(v => v > 0).length;
    let level, levelText;
    if (type === 'learning') {
      const learned = Object.keys(state.language.learned || {}).length;
      level = Math.max(1, Math.floor(learned / 200) + 1);
      levelText = level >= 5 ? '精通中' : level >= 3 ? '进阶中' : '起步中';
    } else {
      const pts = getDomainPoints(type);
      level = Math.max(1, Math.floor(pts / 50) + 1);
      levelText = level >= 5 ? '精通中' : level >= 3 ? '稳定中' : '起步中';
    }
    const focusMin = type === 'learning' ? getFocusMinutesByDomain(null, 'learning') : 0;
    const learnedWords = Object.keys(state.language.learned || {}).length;
    const hasData = weekTotal > 0 || (type === 'learning' && learnedWords > 0);
    return {
      name, type, icon: t.icon(), cls: t.cls, sub: t.sub, btn: t.btn, action: t.action, route: t.route,
      week, level, levelText, activeDays, focusMin, hasData,
      progress: calcBranchWeeklyProgress(type)
    };
  });
  const keepList = state.settings.keepBranches || DEFAULT_SETTINGS.keepBranches;
  const slowList = state.settings.slowBranches || DEFAULT_SETTINGS.slowBranches;
  const branchColor = (cls) => cls === 'c-purple' ? '#8978c3' : cls === 'c-green' ? '#a0bb7a' : '#f4b75b';
  const branchRing = (cls) => cls === 'c-purple' ? 'ring-purple' : cls === 'c-green' ? 'ring-green' : 'ring-peach';
  const branchCardBg = (cls) => cls === 'c-purple' ? '#fdfcfa' : '#fcfbf7';
  const branchIconBg = (cls) => cls === 'c-purple' ? '#f5f2f9' : cls === 'c-green' ? '#f5f6e8' : '#fdf1e1';
  const branchBorder = (cls) => cls === 'c-purple' ? '#a99adc' : cls === 'c-green' ? '#a0bb7a' : '#f7ba61';
  const branchLvBg = (cls) => cls === 'c-purple' ? '#f5f2f9' : cls === 'c-green' ? '#f5f6e8' : '#fdf1e1';

  // 本月主线标签按对应支线主题染色
  const focusItems = monthlyFocus.map(name => {
    const type = branchTypeOf(name);
    const cls = BRANCH_TEMPLATE[type].cls;
    return { name, cls, color: branchColor(cls), border: branchBorder(cls), bg: branchIconBg(cls) };
  });
  page.innerHTML = `
    <div class="br-page">
      <div class="br-page-head">
        <div class="br-page-title">我的支线 <span class="br-title-spark">✨</span></div>
        <div class="br-streak-clean"><span class="br-fire">🔥</span><span>持续推进 <b>${streak}</b> 天</span></div>
      </div>

      <div class="br-header-clean">
        <div class="br-stage" id="br-stage-picker">
          当前阶段：<span class="br-current-phase">${escapeHTML(currentPhase)}</span><span class="br-stage-caret">▾</span>
        </div>
      </div>

      <div class="br-focus-row">
        <div class="br-focus-card-clean" id="br-focus-picker">
          <div class="br-focus-main">
            <div class="br-focus-icon-ring">
              ${branchIconTarget('#E8B4A8')}
            </div>
            <div class="br-focus-body">
              <div class="br-focus-label">本月主线</div>
            </div>
          </div>
          <div class="br-focus-tags count-${focusItems.length}">
            ${focusItems.map(f => `<span class="br-focus-tag" style="background:${f.bg};color:${f.color};border-color:${f.border}">${escapeHTML(f.name)}</span>`).join('')}
          </div>
        </div>
        <div class="br-focus-illust"><img src="images/mascot.png" class="br-mascot-img" alt="mascot"></div>
      </div>

      ${branches.map(b => {
        const hasData = b.hasData;
        return `        <div class="br-branch-card ${b.cls}" data-route="${escapeHTML(b.route)}" style="background:${branchCardBg(b.cls)};border-color:${branchBorder(b.cls)}">
          <button class="item-delete" data-del-type="branch-focus" data-focus-name="${escapeHTML(b.name)}" aria-label="删除主线"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>
          <div class="br-branch-top">
            <div class="br-branch-icon ${b.cls}" style="background:${branchIconBg(b.cls)}">${b.icon}</div>
            <div class="br-branch-info">
              <div class="br-branch-title">${b.name}</div>
              <div class="br-branch-sub">${b.sub}</div>
              <div class="br-branch-meta">
                <span class="br-lv-tag" style="background:${branchLvBg(b.cls)};color:${branchColor(b.cls)}">Lv.${b.level} ${b.levelText}</span>
                <span class="br-freq-tag">每周 ${b.activeDays} 天</span>
              </div>
            </div>
            <div class="br-branch-ring">
              ${hasData ? miniRingHTML(b.progress, branchRing(b.cls), b.progress + '%', '本周进度') : '<span class="br-no-data">暂无数据</span>'}
            </div>
          </div>
          <div class="br-branch-divider" style="background:${branchBorder(b.cls)}"></div>
          <div class="br-branch-bottom">
            <div class="br-trend">
              <div class="br-trend-label">本周趋势</div>
              ${b.week.some(v => v > 0) ? inlineSparkline(b.week, branchColor(b.cls), null, branchCardBg(b.cls)) : '<p class="chart-empty">暂无数据</p>'}
            </div>
            <div class="br-branch-vline" style="background:${branchBorder(b.cls)}"></div>
            <div class="br-next-wrap">
              <div class="br-next-label">下一步行动</div>
              <button class="br-next-btn ${b.btn}" data-branch="${escapeHTML(b.name)}" data-branch-type="${b.type}">
                <span class="br-next-action">${b.action}</span>
                <span class="br-next-arrow">›</span>
              </button>
            </div>
          </div>
        </div>`;
      }).join('')}

      <div class="br-section-header">
        <div class="br-sec-title"><span class="br-sec-icon">🌱</span> 保持中的支线</div>
        <span class="br-manage" data-manage="keep">管理全部 ›</span>
      </div>
      <div class="br-keep-grid-clean">
        ${keepList.map(k => {
          const pct = 0;
          const route = k.name === '攒钱' ? '记账' : k.name;
          return `<div class="br-keep-card-clean" data-route="${escapeHTML(route)}">
            <div class="bkc-emoji">${k.emoji}</div>
            <div class="bkc-name">${k.name}</div>
            <div class="bkc-freq">${k.freq}</div>
            <div class="bkc-bar-row"><div class="bkc-bar"><i style="width:${pct}%;background:${k.color}"></i></div><span class="bkc-pct">${pct}%</span></div>
          </div>`;
        }).join('')}
      </div>

      <div class="br-section-header">
        <div class="br-sec-title">暂时放缓</div>
        <span class="br-manage" data-manage="slow">查看全部 (${slowList.length})</span>
      </div>
      <div class="br-slow-list-clean">
        ${slowList.map(s => `
          <div class="br-slow-card" data-route="${escapeHTML(s.name)}">
            <div class="br-slow-left"><span class="bsi-emoji">${s.emoji}</span><span class="bsi-name">${s.name}</span></div>
            <span class="bsi-tag">待回归</span>
          </div>
        `).join('')}
      </div>
    </div>
  `;
  content.appendChild(page);

  page.querySelector('#br-stage-picker').addEventListener('click', openPhasePicker);
  page.querySelector('#br-focus-picker').addEventListener('click', openMonthlyFocusPicker);

  page.querySelectorAll('.br-branch-card').forEach(card => {
    card.addEventListener('click', (e) => {
      if (e.target.closest('button')) return;
      if (card.classList.contains('show-delete')) { card.classList.remove('show-delete'); return; }
      selectItem(card.dataset.route);
    });
  });

  page.querySelectorAll('[data-branch-type]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const route = { learning: '学习成长', health: '健康', money: '记账' }[btn.dataset.branchType];
      if (route) selectItem(route);
    });
  });

  page.querySelectorAll('[data-route]').forEach(card => {
    card.addEventListener('click', (e) => {
      if (e.target.closest('.item-delete')) return;
      if (card.classList && card.classList.contains('show-delete')) return;
      selectItem(card.dataset.route);
    });
  });

  const keepManage = page.querySelector('[data-manage="keep"]');
  if (keepManage) keepManage.addEventListener('click', () => selectItem('每日计划'));

  const slowManage = page.querySelector('[data-manage="slow"]');
  if (slowManage) slowManage.addEventListener('click', openSlowBranchPicker);
}

// ============ 学习成长：英语打卡（v9144） ============
function renderStudyPage() {
  const page = document.createElement('div');
  page.className = 'page';
  if (greetLine) greetLine.textContent = '英语';

  const today = getTodayKey();
  const day = getEnglishToday();
  const mode = day.mode || state.englishCheckin.dailyMode || 'standard';
  const restDaysLeft = getEnglishRestDaysLeft();
  const weeklyState = getEnglishWeeklyState();
  const streak = calcEnglishStreak();
  const stages = getEnglishStageProgress();
  const dailyDone = getEnglishDailyDone();
  const todayPoints = (state.englishCheckin.totalPoints || 0);

  function modeLabel(m) { return m === 'simplified' ? '精简版 20‑30 分钟' : '标准版 45‑60 分钟'; }
  function restNote(m) { return m === 'simplified' ? '仅完成单词复习' : '仅完成单词复习'; }

  function dailyTaskHTML(t) {
    const td = (day.tasks || {})[t.key] || { done: false, note: '' };
    const exempt = day.restDay && t.key !== 'words';
    const disabled = day.restDay && t.key !== 'words';
    return `
      <div class="eng-task-row ${td.done ? 'done' : ''} ${disabled ? 'exempt' : ''}" data-type="daily" data-key="${t.key}">
        <div class="eng-task-main" style="--eng-color:${t.color};--eng-bg:${t.bg}">
          <div class="eng-task-check ${td.done ? 'on' : ''}">${td.done ? '✓' : ''}</div>
          <div class="eng-task-info">
            <div class="eng-task-name">${t.name}</div>
            <div class="eng-task-sub">${exempt ? restNote(mode) : t.sub}</div>
          </div>
          <span class="eng-task-points">+${t.points}</span>
        </div>
        <div class="eng-task-note">
          <input type="text" placeholder="记录笔记（可选）" value="${escapeHTML(td.note || '')}" data-note-for="daily" data-key="${t.key}">
        </div>
        <button class="item-delete" data-del-type="eng-task" data-type="daily" data-key="${t.key}" aria-label="删除记录">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
        </button>
      </div>`;
  }

  function weeklyTaskHTML(t) {
    const ws = weeklyState[t.key] || { done: false, note: '' };
    return `
      <div class="eng-task-row ${ws.done ? 'done' : ''}" data-type="weekly" data-key="${t.key}">
        <div class="eng-task-main" style="--eng-color:${t.color};--eng-bg:${t.bg}">
          <div class="eng-task-check ${ws.done ? 'on' : ''}">${ws.done ? '✓' : ''}</div>
          <div class="eng-task-info">
            <div class="eng-task-name">${t.name}</div>
            <div class="eng-task-sub">本周累计</div>
          </div>
          <span class="eng-task-points">+${t.points}</span>
        </div>
        <div class="eng-task-note">
          <input type="text" placeholder="记录笔记（可选）" value="${escapeHTML(ws.note || '')}" data-note-for="weekly" data-key="${t.key}">
        </div>
        <button class="item-delete" data-del-type="eng-task" data-type="weekly" data-key="${t.key}" aria-label="删除记录">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
        </button>
      </div>`;
  }

  function stagesHTML() {
    return `<div class="eng-stages">${stages.map((s, idx) => `
      <div class="eng-stage ${s.active ? 'active' : ''} ${s.past ? 'past' : ''}">
        <div class="eng-stage-top">
          <span class="eng-stage-num">0${idx + 1}</span>
          <div class="eng-stage-meta">
            <div class="eng-stage-name">${s.name}</div>
            <div class="eng-stage-months">${s.months}</div>
          </div>
          <span class="eng-stage-pct">${s.pct}%</span>
        </div>
        <div class="eng-stage-bar"><i style="width:${s.pct}%;background:${s.color}"></i></div>
      </div>
    `).join('')}</div>`;
  }

  function historyHTML() {
    const days = [];
    for (let i = 0; i < 14; i++) {
      const k = shiftDate(today, -i);
      const d = (state.englishCheckin.history || {})[k];
      let pct = 0;
      if (d) {
        if (d.restDay) pct = d.tasks && d.tasks.words && d.tasks.words.done ? 100 : 0;
        else {
          const total = ENGLISH_DAILY_TASKS.length;
          const done = ENGLISH_DAILY_TASKS.filter(t => d.tasks && d.tasks[t.key] && d.tasks[t.key].done).length;
          pct = Math.round(done / total * 100);
        }
      }
      days.push({ key: k, label: i === 0 ? '今天' : formatDateCN(k).replace(/周.*/, ''), pct });
    }
    return `<div class="eng-history-grid">${days.map(d => `
      <div class="eng-history-day ${d.pct >= 100 ? 'full' : d.pct > 0 ? 'part' : ''}">
        <div class="eng-history-ring"><svg viewBox="0 0 36 36"><path class="eng-h-ring-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"/><path class="eng-h-ring-bar" stroke-dasharray="${d.pct}, 100" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"/></svg></div>
        <div class="eng-history-label">${d.label}</div>
      </div>
    `).join('')}</div>`;
  }

  function getEnglishTodayPoints() {
    let pts = 0;
    ENGLISH_DAILY_TASKS.forEach(t => { if ((day.tasks || {})[t.key] && (day.tasks || {})[t.key].done) pts += t.points; });
    ENGLISH_WEEKLY_TASKS.forEach(t => { if ((day.weekly || {})[t.key] && (day.weekly || {})[t.key].done) pts += t.points; });
    return pts;
  }

  function dailySummary() {
    const tp = getEnglishTodayPoints();
    if (day.restDay) return `休息日 · 仅需完成「背单词」· 今日 ${tp} 积分`;
    return `已完成 ${dailyDone.done}/${dailyDone.total} · 今日 ${tp} 积分`;
  }

  page.innerHTML = `
    <div class="sub-page-head">
      <button class="sub-back-btn" data-go="我的支线" aria-label="返回">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
      </button>
      <h3 class="sub-title">英语 <span class="sub-spark">✨</span></h3>
    </div>

    <div class="study-goal section-card" style="background:var(--card);border:1px solid var(--border);">
      <div class="sg-ring-wrap">${dailyDone.exempt ? miniRingHTML(dailyDone.done ? 100 : 0, 'ring-purple', dailyDone.done ? '✓' : '0/1', '单词复习') : miniRingHTML(Math.round(dailyDone.done / dailyDone.total * 100), 'ring-purple', `${dailyDone.done}/${dailyDone.total}`, '今日完成')}</div>
      <div class="sg-info">
        <h4>英语学习打卡</h4>
        <p class="sg-sub">${dailySummary()}</p>
        <span class="sg-streak">🔥 连续学习 ${streak} 天</span>
      </div>
    </div>

    <div class="section-card">
      <div class="soft-card-title">打卡模式</div>
      <div class="eng-mode-tabs">
        <button class="eng-mode-tab ${mode === 'standard' ? 'active' : ''}" data-mode="standard">标准版<span>45‑60 分钟</span></button>
        <button class="eng-mode-tab ${mode === 'simplified' ? 'active' : ''}" data-mode="simplified">精简版<span>20‑30 分钟</span></button>
      </div>
      <p class="eng-mode-tip">当前选择：${modeLabel(mode)}，学习内容全部在外部软件完成，此处仅作打卡记录。</p>
    </div>

    <div class="section-card">
      <div class="soft-card-title"><span class="sct-check">☑</span> 今日学习任务</div>
      <div class="eng-daily-list">
        ${ENGLISH_DAILY_TASKS.map(dailyTaskHTML).join('')}
      </div>
      <label class="eng-rest-row">
        <input type="checkbox" id="eng-rest-day" ${day.restDay ? 'checked' : ''}>
        <span>英语轻休息日（本周剩余 ${restDaysLeft} 次）</span>
      </label>
    </div>

    <div class="section-card">
      <div class="soft-card-title">📅 每周任务</div>
      <div class="eng-weekly-list">
        ${ENGLISH_WEEKLY_TASKS.map(weeklyTaskHTML).join('')}
      </div>
    </div>

    <div class="section-card">
      <div class="soft-card-title">🗓 长期进度看板</div>
      ${stagesHTML()}
    </div>

    <div class="section-card">
      <div class="soft-card-title">📈 历史打卡 <span class="hp-more hp-link" id="eng-history-btn">查看 ›</span></div>
      ${historyHTML()}
    </div>

    <div class="study-tip">
      <span class="study-tip-bulb">💡</span>
      <p>小贴士：把最难的口语练习放在精力最好的上午，用 25 分钟番茄钟降低启动阻力。</p>
    </div>
  `;
  content.appendChild(page);

  // 返回按钮
  page.querySelectorAll('[data-go]').forEach(b => b.addEventListener('click', () => selectItem(b.dataset.go)));

  // 模式切换
  page.querySelectorAll('.eng-mode-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      setEnglishDailyMode(tab.dataset.mode);
      renderContent();
    });
  });

  // 任务勾选 + 笔记输入
  page.querySelectorAll('.eng-task-row').forEach(row => {
    row.addEventListener('click', (e) => {
      if (e.target.closest('.item-delete, input')) return;
      const type = row.dataset.type;
      const key = row.dataset.key;
      const t = type === 'weekly' ? ENGLISH_WEEKLY_TASKS.find(x => x.key === key) : ENGLISH_DAILY_TASKS.find(x => x.key === key);
      if (!t) return;
      if (day.restDay && type === 'daily' && key !== 'words') return;
      toggleEnglishTask(type, key);
      renderContent();
    });
  });

  page.querySelectorAll('.eng-task-note input').forEach(inp => {
    inp.addEventListener('change', () => {
      setEnglishTaskNote(inp.dataset.noteFor, inp.dataset.key, inp.value.trim());
    });
  });

  // 休息日
  const restCheck = page.querySelector('#eng-rest-day');
  if (restCheck) {
    restCheck.addEventListener('change', () => {
      if (restCheck.checked && restDaysLeft <= 0 && !day.restDay) {
        toast('本周休息日已用完');
        restCheck.checked = false;
        return;
      }
      setEnglishRestDay(restCheck.checked);
      renderContent();
    });
  }

  // 历史记录弹窗
  const historyBtn = page.querySelector('#eng-history-btn');
  if (historyBtn) {
    historyBtn.addEventListener('click', () => {
      openEnglishHistoryModal();
    });
  }
}

function openEnglishHistoryModal() {
  const today = getTodayKey();
  const rows = [];
  for (let i = 0; i < 30; i++) {
    const k = shiftDate(today, -i);
    const d = (state.englishCheckin.history || {})[k];
      let status = '未打卡';
    let pts = 0;
    if (d) {
      if (d.restDay) {
        status = d.tasks && d.tasks.words && d.tasks.words.done ? '休息日完成' : '休息日未完成';
        pts = d.tasks && d.tasks.words && d.tasks.words.done ? ENGLISH_DAILY_TASKS[0].points : 0;
      } else {
        const total = ENGLISH_DAILY_TASKS.length;
        const done = ENGLISH_DAILY_TASKS.filter(t => d.tasks && d.tasks[t.key] && d.tasks[t.key].done).length;
        status = done >= total ? '全部完成' : `完成 ${done}/${total}`;
        ENGLISH_DAILY_TASKS.forEach(t => { if (d.tasks && d.tasks[t.key] && d.tasks[t.key].done) pts += t.points; });
        ENGLISH_WEEKLY_TASKS.forEach(t => { if (d.weekly && d.weekly[t.key] && d.weekly[t.key].done) pts += t.points; });
      }
    }
    rows.push({ date: formatDateCN(k), status, pts });
  }
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay active';
  overlay.innerHTML = `
    <div class="modal-card" style="max-width:420px;max-height:80vh;overflow:auto;">
      <div class="modal-head"><h4>📈 英语打卡历史（近 30 天）</h4><button class="modal-close" aria-label="关闭">✕</button></div>
      <div class="eng-history-list">${rows.map(r => `
        <div class="eng-history-row"><span class="eng-h-date">${r.date}</span><span class="eng-h-status">${r.status} · ${r.pts} 积分</span></div>
      `).join('')}</div>
    </div>`;
  document.body.appendChild(overlay);
  overlay.querySelector('.modal-close').addEventListener('click', () => overlay.remove());
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
}

// ============ 生活秩序 ============
function renderLifeOrderPage() {
  const page = document.createElement('div');
  page.className = 'page';
  if (greetLine) greetLine.textContent = '生活秩序';
  const streak = calcStreak();
  page.innerHTML = `
    <div class="sub-page-head">
      <button class="sub-back-btn" data-go="我的支线">‹</button>
      <h3 class="sub-title">生活秩序 <span class="sub-spark">✨</span></h3>
      <span class="sub-bunny">🐰📋</span>
    </div>
    <div class="study-goal section-card" style="background:linear-gradient(135deg,#E8F0E2 0%,#FFF5E9 100%);">
      ${miniRingHTML(0, 'ring-green', '0%', '本周完成')}
      <div class="sg-info">
        <h4>秩序感养成中</h4>
        <p class="sg-sub">用固定节奏减少内耗，把生活理顺</p>
        <span class="sg-streak">🔥 连续记录 ${streak} 天</span>
      </div>
    </div>
    <div class="section-card">
      <div class="soft-card-title">☀️ 晨间秩序</div>
      <div class="plan-task-row"><span class="task-text">7:30 前起床</span><span class="task-points">+5</span></div>
      <div class="plan-task-row"><span class="task-text">整理床铺 & 桌面</span><span class="task-points">+5</span></div>
      <div class="plan-task-row"><span class="task-text">喝一大杯温水</span><span class="task-points">+3</span></div>
    </div>
    <div class="section-card">
      <div class="soft-card-title">🌙 晚间秩序</div>
      <div class="plan-task-row"><span class="task-text">23:30 前放下手机</span><span class="task-points">+5</span></div>
      <div class="plan-task-row"><span class="task-text">睡前 5 分钟复盘</span><span class="task-points">+5</span></div>
    </div>
    <div class="study-tip">
      <span class="study-tip-bulb">💡</span>
      <p>小贴士：生活秩序不是追求完美，而是让 80% 的日常有迹可循。</p>
    </div>
  `;
  content.appendChild(page);
  page.querySelectorAll('[data-go]').forEach(b => b.addEventListener('click', () => selectItem(b.dataset.go)));
}

// ============ 内在成长 ============
function renderInnerGrowthPage() {
  const page = document.createElement('div');
  page.className = 'page';
  if (greetLine) greetLine.textContent = '内在成长';
  const streak = calcStreak();
  page.innerHTML = `
    <div class="sub-page-head">
      <button class="sub-back-btn" data-go="我的支线">‹</button>
      <h3 class="sub-title">内在成长 <span class="sub-spark">✨</span></h3>
      <span class="sub-bunny">🐰🌱</span>
    </div>
    <div class="study-goal section-card" style="background:linear-gradient(135deg,#EDEAF9 0%,#E8F0E2 100%);">
      ${miniRingHTML(0, 'ring-purple', '0%', '本周完成')}
      <div class="sg-info">
        <h4>向内探索</h4>
        <p class="sg-sub">记录情绪、练习觉察、积累心理能量</p>
        <span class="sg-streak">🔥 连续记录 ${streak} 天</span>
      </div>
    </div>
    <div class="section-card">
      <div class="soft-card-title">🧘 今日觉察</div>
      <div class="plan-task-row"><span class="task-text">5 分钟呼吸冥想</span><span class="task-points">+5</span></div>
      <div class="plan-task-row"><span class="task-text">写下 3 件感恩小事</span><span class="task-points">+5</span></div>
      <div class="plan-task-row"><span class="task-text">记录一次情绪波动</span><span class="task-points">+5</span></div>
    </div>
    <div class="section-card">
      <div class="soft-card-title">📝 本周课题</div>
      <p style="font-size:12px;color:var(--text-muted);margin:0;line-height:1.7;">「我能在哪些小事上对自己更温柔一点？」</p>
    </div>
    <div class="study-tip">
      <span class="study-tip-bulb">💡</span>
      <p>小贴士：内在成长不是改变情绪，而是学会与情绪共处。</p>
    </div>
  `;
  content.appendChild(page);
  page.querySelectorAll('[data-go]').forEach(b => b.addEventListener('click', () => selectItem(b.dataset.go)));
}

// ============ 阅读积累 ============
function renderReadingAccumPage() {
  const page = document.createElement('div');
  page.className = 'page';
  if (greetLine) greetLine.textContent = '阅读积累';
  const streak = calcStreak();
  const readBooks = Array.isArray(state.books) ? state.books.filter(b => b.status === 'read' || b.done).length : 0;
  page.innerHTML = `
    <div class="sub-page-head">
      <button class="sub-back-btn" data-go="我的支线">‹</button>
      <h3 class="sub-title">阅读积累 <span class="sub-spark">✨</span></h3>
      <span class="sub-bunny">🐰📖</span>
    </div>
    <div class="study-goal section-card" style="background:linear-gradient(135deg,#EDEAF9 0%,#FFF5E9 100%);">
      ${miniRingHTML(0, 'ring-purple', '0%', '本周完成')}
      <div class="sg-info">
        <h4>让阅读成为日常</h4>
        <p class="sg-sub">不追求数量，只保留触动的句子</p>
        <span class="sg-streak">🔥 连续记录 ${streak} 天</span>
      </div>
    </div>
    <div class="study-stats">
      <div class="study-stat"><b>${readBooks}</b><span>已读完</span></div>
      <div class="study-stat"><b>0</b><span>本周页数</span></div>
      <div class="study-stat"><b>0</b><span>笔记条数</span></div>
    </div>
    <div class="section-card">
      <div class="soft-card-title">📚 正在读</div>
      <p style="font-size:12px;color:var(--text-muted);margin:0;">还没有正在读的书，去「书籍阅读」添加一本吧～</p>
      <div class="study-note-foot"><button class="btn btn-secondary pill-btn sm" data-go="书籍阅读">去书籍库</button></div>
    </div>
    <div class="study-tip">
      <span class="study-tip-bulb">💡</span>
      <p>小贴士：每天读 10 页，一年就是 3650 页。</p>
    </div>
  `;
  content.appendChild(page);
  page.querySelectorAll('[data-go]').forEach(b => b.addEventListener('click', () => selectItem(b.dataset.go)));
}

// ============ 旅行体验 ============
function renderTravelPage() {
  const page = document.createElement('div');
  page.className = 'page';
  if (greetLine) greetLine.textContent = '旅行体验';
  page.innerHTML = `
    <div class="sub-page-head">
      <button class="sub-back-btn" data-go="我的支线">‹</button>
      <h3 class="sub-title">旅行体验 <span class="sub-spark">✨</span></h3>
      <span class="sub-bunny">🐰✈️</span>
    </div>
    <div class="study-goal section-card" style="background:linear-gradient(135deg,#E8F4FF 0%,#FFF5E9 100%);">
      <div class="sg-info" style="margin-left:0;">
        <h4>待出发清单</h4>
        <p class="sg-sub">把想去的地方写下来，生活就多了一份期待</p>
        <span class="sg-streak">✈️ 下一站：待定</span>
      </div>
    </div>
    <div class="section-card">
      <div class="soft-card-title">🗺️ 想去的地方</div>
      <div class="plan-task-row"><span class="task-text">海边小城 weekend trip</span><span class="task-points">待规划</span></div>
      <div class="plan-task-row"><span class="task-text">山野徒步 2 天 1 夜</span><span class="task-points">待规划</span></div>
      <div class="plan-task-row"><span class="task-text">城市咖啡馆巡礼</span><span class="task-points">待规划</span></div>
    </div>
    <div class="section-card">
      <div class="soft-card-title">📷 旅行灵感</div>
      <p style="font-size:12px;color:var(--text-muted);margin:0;line-height:1.7;">记录一家想住的民宿、一条想走的街道、一种想吃的小吃，旅行从想象开始。</p>
    </div>
  `;
  content.appendChild(page);
  page.querySelectorAll('[data-go]').forEach(b => b.addEventListener('click', () => selectItem(b.dataset.go)));
}

// ============ 社交拓展 ============
function renderSocialPage() {
  const page = document.createElement('div');
  page.className = 'page';
  if (greetLine) greetLine.textContent = '社交拓展';
  page.innerHTML = `
    <div class="sub-page-head">
      <button class="sub-back-btn" data-go="我的支线">‹</button>
      <h3 class="sub-title">社交拓展 <span class="sub-spark">✨</span></h3>
      <span class="sub-bunny">🐰💬</span>
    </div>
    <div class="study-goal section-card" style="background:linear-gradient(135deg,#FFF0F5 0%,#FFF5E9 100%);">
      <div class="sg-info" style="margin-left:0;">
        <h4>关系需要养护</h4>
        <p class="sg-sub">主动一点的社交，会带来更多温暖</p>
        <span class="sg-streak">💬 本周待联系：0 人</span>
      </div>
    </div>
    <div class="section-card">
      <div class="soft-card-title">🤝 本周行动</div>
      <div class="plan-task-row"><span class="task-text">给一位老朋友发消息</span><span class="task-points">+5</span></div>
      <div class="plan-task-row"><span class="task-text">参与一次线下活动</span><span class="task-points">+10</span></div>
      <div class="plan-task-row"><span class="task-text">认识一个新朋友</span><span class="task-points">+10</span></div>
    </div>
    <div class="section-card">
      <div class="soft-card-title">🎯 关系目标</div>
      <p style="font-size:12px;color:var(--text-muted);margin:0;line-height:1.7;">维护 3 段深度关系，拓展 1 个新圈子，减少无意义社交。</p>
    </div>
  `;
  content.appendChild(page);
  page.querySelectorAll('[data-go]').forEach(b => b.addEventListener('click', () => selectItem(b.dataset.go)));
}

// ============ 我的 / 设置（Screenshot 4） ============
function renderSettingsPage() {
  const s = state.settings;
  if (greetLine) greetLine.textContent = '人生计划工作台';
  const lv = getLevelInfo();
  const streak = calcStreak();
  const readBooks = Array.isArray(state.books) ? state.books.filter(b => b.status === 'read' || b.done).length : 0;
  const page = document.createElement('div');
  page.className = 'page';

  page.innerHTML = `
    <div class="me-header">
      <div class="me-header-top">
        <div class="me-avatar" id="me-avatar" title="点击更换头像">${isImageSource(s.userAvatar) ? `<img src="${s.userAvatar}">` : (s.userAvatar || '🐰')}<span class="me-avatar-badge" title="更换头像">📷</span></div>
        <span class="me-header-bunny">🐰💗</span>
      </div>
      <div class="me-name">${escapeHTML(s.userName || '小兔软糖')} <span class="me-edit" id="me-edit">✎ 修改</span></div>
      <div class="me-level-row"><span class="me-level">${lv.level >= 18 ? 'Lv.18' : 'Lv.' + lv.level}</span><span class="me-stage-chip">当前阶段：备考成长季</span></div>
      <p class="me-foot-text">愿你在每一个计划里，遇见更好的自己✨</p>
    </div>

    <div class="me-grid">
      <div class="me-card" data-me="stage"><span class="mc-emoji">🎯</span><span class="mc-title">人生阶段</span><span class="mc-desc">当前：备考成长季</span></div>
      <div class="me-card" data-me="home"><span class="mc-emoji">🏠</span><span class="mc-title">首页布局</span><span class="mc-desc">标准布局</span></div>
      <div class="me-card me-card-wide" data-me="theme"><span class="mc-emoji">🎨</span><span class="mc-title">主题外观</span><span class="mc-desc">花园兔兔</span>
        <div class="theme-previews">
          <span class="theme-prev tp-garden" title="花园兔兔">🐰</span>
          <span class="theme-prev tp-cream" title="奶油暖阳">☀️</span>
          <span class="theme-prev tp-mint" title="薄荷清风">🌿</span>
          <span class="theme-prev tp-night" title="星夜静谧">🌙</span>
        </div>
      </div>
      <div class="me-card" data-me="focus"><span class="mc-emoji">⏰</span><span class="mc-title">提醒与专注</span><span class="mc-desc">专注提醒 已开启</span></div>
      <div class="me-card" data-me="privacy"><span class="mc-emoji">🔒</span><span class="mc-title">数据与隐私</span><span class="mc-desc">数据统计 / 隐私</span></div>
      <div class="me-card" data-me="export"><span class="mc-emoji">💾</span><span class="mc-title">导出备份</span><span class="mc-desc">导出 / 云端</span></div>
    </div>

    <div class="me-milestones">
      <div class="me-milestone"><b>${streak}</b><span>连续记录(天)</span></div>
      <div class="me-milestone"><b>${readBooks}</b><span>阅读(本)</span></div>
      <div class="me-milestone"><b>1</b><span>副业项目</span></div>
    </div>

    <div class="section-card" id="me-focus-card" hidden style="margin-top:14px;">
      <div class="soft-card-title">⏰ 提醒与专注</div>
      <div class="setting-row"><div class="setting-label">专注提醒<small>开始专注时通知</small></div><span class="switch-on">已开启</span></div>
      <div class="setting-row"><div class="setting-label">每日复盘提醒<small>晚间固定提醒</small></div><span class="setting-val">21:00</span></div>
      <div class="setting-row"><div class="setting-label">习惯打卡提醒<small>每日打卡</small></div><span class="switch-on">已开启</span></div>
      <div class="setting-row"><div class="setting-label">专注默认时长</div>
        <div class="focus-presets" style="justify-content:flex-start;">
          ${[15, 25, 45, 60].map(m => `<button class="focus-preset${state.focus.preset === m ? ' active' : ''}" data-min="${m}">${m} 分</button>`).join('')}
        </div>
      </div>
    </div>

    <div class="section-card" id="me-privacy-card" hidden style="margin-top:14px;">
      <div class="soft-card-title">🔒 数据与隐私</div>
      <div class="setting-row"><div class="setting-label">数据统计<small>查看本地数据概览</small></div><button class="ghost-btn" data-go="本周洞察">查看</button></div>
      <div class="setting-row"><div class="setting-label">隐私设置<small>控制数据共享</small></div><button class="ghost-btn" id="me-privacy-set">设置</button></div>
      <div class="setting-row"><div class="setting-label">账号安全<small>备份与恢复</small></div><button class="ghost-btn" id="me-account">管理</button></div>
      <div class="setting-row"><div class="setting-label">导出全部数据<small>生成 JSON 备份文件</small></div><button class="ghost-btn" id="me-export">导出</button></div>
      <div class="setting-row"><div class="setting-label">导入备份<small>会覆盖当前本地数据</small></div><button class="ghost-btn" id="me-import">导入</button></div>
      <div class="setting-row"><div class="setting-label">重置菜单结构<small>恢复默认的人生系统菜单</small></div><button class="ghost-btn" id="me-reset-menu">重置菜单</button></div>
      <div class="setting-row"><div class="setting-label" style="color:var(--danger)">清空全部数据<small>不可恢复，请先导出备份</small></div><button class="ghost-btn" id="me-reset-all" style="color:var(--danger);border-color:var(--danger)">清空</button></div>
    </div>
  `;
  content.appendChild(page);

  page.querySelectorAll('[data-go]').forEach(b => b.addEventListener('click', () => selectItem(b.dataset.go)));

  page.querySelector('#me-edit').addEventListener('click', async () => {
    const name = await openModal('修改昵称：', s.userName || '小兔软糖', '请输入昵称');
    if (name !== null && name.trim()) {
      s.userName = name.trim();
      state.profile.name = s.userName;
      saveSettings(); saveProfile();
      renderProfileCard(); renderTopbar();
      renderContent();
    }
  });

  const meAvatar = page.querySelector('#me-avatar');
  if (meAvatar) {
    meAvatar.addEventListener('click', () => {
      const input = document.getElementById('avatar-input');
      if (input) input.click();
    });
  }

  page.querySelectorAll('.me-card').forEach(card => {
    card.addEventListener('click', () => {
      const kind = card.dataset.me;
      if (kind === 'home') { selectItem('工作台首页'); return; }
      if (kind === 'export') { exportData(); return; }
      if (kind === 'focus') { toggleCard('#me-focus-card'); return; }
      if (kind === 'privacy') { toggleCard('#me-privacy-card'); return; }
    });
  });

  function toggleCard(sel) {
    const c = page.querySelector(sel);
    if (c) c.hidden = !c.hidden;
  }

  page.querySelectorAll('.focus-preset').forEach(btn => {
    btn.addEventListener('click', () => { setFocusPreset(Number(btn.dataset.min)); renderContent(); });
  });
  page.querySelector('#me-export').addEventListener('click', exportData);
  page.querySelector('#me-import').addEventListener('click', () => importFile.click());
  page.querySelector('#me-reset-menu').addEventListener('click', () => {
    if (!confirm('确认恢复默认菜单结构？自定义分组会丢失。')) return;
    localStorage.removeItem('xenos-groups');
    state.groups = loadGroups(); saveGroups();
    state.activeItem = '设置'; renderMenu(); renderContent(); renderMobileTabs();
  });
  page.querySelector('#me-reset-all').addEventListener('click', () => {
    if (!confirm('确认清空全部数据？此操作不可恢复！')) return;
    if (!confirm('再次确认：所有记录都会被删除。')) return;
    Object.keys(localStorage).filter(k => k.startsWith('xenos-')).forEach(k => localStorage.removeItem(k));
    location.reload();
  });
}

// ============ 本周洞察（Screenshot 5） ============
function openInsightSheet(title, body) {
  closeInsightSheet();
  const overlay = document.createElement('div');
  overlay.className = 'insp-sheet-overlay';
  overlay.innerHTML = '<div class="insp-sheet"><div class="insp-sheet-head"><span class="insp-sheet-title">' + title + '</span><button class="insp-sheet-close" aria-label="关闭">' + icon('close', 16) + '</button></div><div class="insp-sheet-body">' + body + '</div></div>';
  document.body.appendChild(overlay);
  overlay.addEventListener('click', e => { if (e.target === overlay) closeInsightSheet(); });
  overlay.querySelector('.insp-sheet-close').addEventListener('click', closeInsightSheet);
}
function closeInsightSheet() {
  const o = document.querySelector('.insp-sheet-overlay');
  if (o) o.remove();
}

function fmtMetric(v, unit) {
  const n = Math.round(Number(v) || 0);
  return unit ? (n + ' ' + unit) : ('' + n);
}
function deltaBadge(cur, last, unit) {
  const diff = (Number(cur) || 0) - (Number(last) || 0);
  const abs = Math.round(Math.abs(diff));
  if (diff > 0) return '<span class="insp-delta up">▲' + abs + '</span>';
  if (diff < 0) return '<span class="insp-delta down">▼' + abs + '</span>';
  return '<span class="insp-delta flat">—</span>';
}
function barPct(v, arr) {
  const mx = Math.max(1, ...arr.map(x => Number(x) || 0));
  return Math.round((Number(v) || 0) / mx * 100);
}

function catCardHTML(s) {
  return '<div class="insp-cat-card clickable-card" data-cat="' + s.id + '" style="--c:' + s.color + ';--cb:' + s.bg + '">'
    + '<div class="insp-cat-head"><span class="insp-cat-ic" style="background:' + s.bg + ';color:' + s.color + '">' + icon(s.icon, 16) + '</span>'
    + '<span class="insp-cat-name">' + s.name + '</span><span class="insp-cat-go">›</span></div>'
    + '<div class="insp-cat-metrics">'
    + '<div class="insp-cm"><div class="insp-cm-val">' + s.items + '<span class="insp-cm-unit">项</span></div><div class="insp-cm-label">完成总项 ' + deltaBadge(s.items, s.itemsLast, '项') + '</div></div>'
    + '<div class="insp-cm"><div class="insp-cm-val">' + Math.round(s.metric) + '<span class="insp-cm-unit">' + s.metricUnit + '</span></div><div class="insp-cm-label">' + s.metricName + ' ' + deltaBadge(s.metric, s.metricLast, s.metricUnit) + '</div></div>'
    + '<div class="insp-cm"><div class="insp-cm-val">' + s.avg + '<span class="insp-cm-unit">' + s.avgUnit + '</span></div><div class="insp-cm-label">' + s.avgName + '</div></div>'
    + '</div></div>';
}

function buildInsightSuggestions(stats) {
  const out = [];
  if (!stats.length) return [{ icon: '⚙️', text: '还没有选择任何模块，点右上角「自定义」勾选要追踪的板块，洞察会更有针对性～' }];
  const focus = stats.find(s => s.id === 'focus');
  if (focus) {
    if (focus.metric < 120) out.push({ icon: '⏳', text: '本周专注总时长约 ' + Math.round(focus.metric) + ' 分钟，略短。试着每天留 25 分钟给最重要的那件事，一周就能凑出 175 分钟心流。' });
    else out.push({ icon: '🔥', text: '本周专注 ' + Math.round(focus.metric) + ' 分钟，状态在线！保持这个节奏，重要的事会一件件被啃下来。' });
  }
  stats.forEach(s => {
    if (s.items === 0) {
      out.push({ icon: '🌱', text: '本周「' + s.name + '」还没有任何记录，去对应页面点个完成、打次卡，洞察数据就活起来了。' });
    } else if (s.metricLast > 0 && s.metric < s.metricLast * 0.7) {
      out.push({ icon: '📉', text: '「' + s.name + '」本周比上周回落了一些（' + Math.round(s.metric) + s.metricUnit + ' vs 上周 ' + Math.round(s.metricLast) + s.metricUnit + '），下周稍微加把劲就能追回来。' });
    } else if (s.metricLast > 0 && s.metric > s.metricLast * 1.15) {
      out.push({ icon: '📈', text: '「' + s.name + '」本周比上周更投入（' + Math.round(s.metric) + s.metricUnit + ' ↑），这个势头值得保持！' });
    }
  });
  let activeDays = 0;
  for (let i = 0; i < 7; i++) { if (stats.some(s => (s.dailyItems[i] > 0) || (s.daily[i] > 0))) activeDays++; }
  if (activeDays <= 3) out.push({ icon: '🗓️', text: '本周只有 ' + activeDays + ' 天有记录，节奏偏散。把打卡拆成每天 1–2 件小事，连续性比强度更重要。' });
  else if (activeDays === 7) out.push({ icon: '✨', text: '七天全勤！这种持续感是长期复利的关键，给自己点个赞 🐰。' });
  if (!out.length) out.push({ icon: '🌟', text: '各项数据都比较平稳，继续保持就好。想再进一步，可以挑一个板块做小幅度增量。' });
  return out.slice(0, 6);
}

function openWeekPicker() {
  const opts = [];
  for (let off = 0; off >= -8; off--) {
    const ws = getWeekStart(off);
    opts.push({ off, label: off === 0 ? '本周' : '往前第 ' + (-off) + ' 周', range: ws.slice(5) + ' ~ ' + shiftDate(ws, 6).slice(5) });
  }
  for (let off = 1; off <= 2; off++) {
    const ws = getWeekStart(off);
    opts.push({ off, label: '第 ' + off + ' 周后（未来）', range: ws.slice(5) + ' ~ ' + shiftDate(ws, 6).slice(5) });
  }
  const body = '<div class="insp-opt-list">' + opts.map(o => '<button class="insp-opt ' + (o.off === insightWeekOffset ? 'active' : '') + '" data-off="' + o.off + '"><span class="insp-opt-label">' + o.label + '</span><span class="insp-opt-range">' + o.range + '</span></button>').join('') + '</div>';
  openInsightSheet('选择查看的周', body);
  const overlay = document.querySelector('.insp-sheet-overlay');
  overlay.querySelectorAll('.insp-opt').forEach(b => b.addEventListener('click', () => {
    insightWeekOffset = parseInt(b.dataset.off, 10);
    closeInsightSheet();
    renderContent();
  }));
}

function openInsightDIY() {
  const sel = getInsightModules();
  const body = '<p class="insp-diy-tip">勾选要展示的板块，未勾选的会自动隐藏。新增板块后会自动出现在这里。</p>'
    + '<div class="insp-diy-list">' + INSIGHT_MODULES.map(m => '<label class="insp-diy-item" style="--c:' + m.color + '"><input type="checkbox" data-id="' + m.id + '" ' + (sel.includes(m.id) ? 'checked' : '') + '><span class="insp-diy-ic" style="background:' + m.bg + ';color:' + m.color + '">' + icon(m.icon, 15) + '</span><span class="insp-diy-name">' + m.name + '</span><span class="insp-diy-metric">' + m.metricName + '</span></label>').join('') + '</div>';
  openInsightSheet('自定义模块', body);
  const overlay = document.querySelector('.insp-sheet-overlay');
  overlay.querySelectorAll('.insp-diy-item input').forEach(cb => cb.addEventListener('change', () => {
    let cur = getInsightModules().filter(id => INSIGHT_MODULES.some(m => m.id === id));
    if (cb.checked) { if (!cur.includes(cb.dataset.id)) cur.push(cb.dataset.id); }
    else { const i = cur.indexOf(cb.dataset.id); if (i >= 0) cur.splice(i, 1); }
    saveInsightModules(cur);
    renderContent();
  }));
}

function openInsightDetail(s) {
  const weekdayLabels = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
  const dailyRows = weekdayLabels.map((d, i) => '<div class="insp-dt-row"><span class="insp-dt-day">' + d + '</span><span class="insp-dt-bar"><i style="width:' + barPct(s.daily[i], s.daily) + '%;background:' + s.color + '"></i></span><span class="insp-dt-val">' + fmtMetric(s.daily[i], s.metricUnit) + '</span><span class="insp-dt-items">' + s.dailyItems[i] + ' 项</span></div>').join('');
  const body = '<div class="insp-dt-head"><span class="insp-dt-ic" style="background:' + s.bg + ';color:' + s.color + '">' + icon(s.icon, 18) + '</span><div><div class="insp-dt-name">' + s.name + ' · 本周详情</div><div class="insp-dt-sub">' + shiftDate(s.weekStart, 0).slice(5) + ' ~ ' + shiftDate(s.weekStart, 6).slice(5) + '</div></div></div>'
    + '<div class="insp-dt-nums"><div><b>' + s.items + '</b><span>完成总项</span></div><div><b>' + Math.round(s.metric) + '</b><span>' + s.metricName + '</span></div><div><b>' + s.avg + '</b><span>' + s.avgName + '</span></div></div>'
    + '<div class="insp-dt-cmp">较上周：完成 ' + deltaBadge(s.items, s.itemsLast, '项') + ' · ' + s.metricName + ' ' + deltaBadge(s.metric, s.metricLast, s.metricUnit) + '</div>'
    + '<div class="insp-dt-chart">' + weeklyLineChart(s.daily, s.color, s.metricUnit) + '</div>'
    + '<div class="insp-dt-list">' + dailyRows + '</div>'
    + '<p class="insp-dt-tip">本页仅作数据展示，打卡与记录请回到对应的工作台页面完成。</p>';
  openInsightSheet('', body);
}

function renderInsightPage() {
  const page = document.createElement('div');
  page.className = 'page';
  if (greetLine) greetLine.textContent = '本周洞察';

  const weekStart = getWeekStart(insightWeekOffset);
  const sunday = shiftDate(weekStart, 6);
  const weekdayLabels = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
  const selected = getInsightModules().filter(id => INSIGHT_MODULES.some(m => m.id === id));
  const modules = INSIGHT_MODULES.filter(m => selected.includes(m.id));
  const stats = modules.map(m => computeInsightStats(m, weekStart));
  const rangeText = weekStart.slice(5) + '（周一）~ ' + sunday.slice(5) + '（周日）';

  page.innerHTML = '<div class="insp-page">'
    + '<div class="insp-top">'
    + '<div class="insp-top-left"><h2 class="insp-main-title">本周洞察 <span class="insp-title-spark">✨</span></h2>'
    + '<button class="insp-week-btn" id="insp-week-btn">' + rangeText + '<span class="insp-date-arrow">▼</span></button></div>'
    + '<div class="insp-top-right"><button class="insp-diy-btn" id="insp-diy-btn">'
    + icon('list', 13) + ' 自定义</button><div class="insp-mascot-slot" title="吉祥物位置（预留）"></div></div>'
    + '</div>'

    + '<div class="insp-cards-grid">' + (stats.length ? stats.map(catCardHTML).join('') : '<div class="insp-empty">还没有选择模块，点右上角「自定义」勾选要查看的板块～</div>') + '</div>'

    + '<div class="insp-section"><div class="insp-section-head"><span class="insp-section-title"><span class="insp-sec-spark">✨</span> 每周数据变化</span><span class="insp-section-more">按天 · 7 日</span></div>'
    + '<div class="insp-line-grid">' + (stats.length ? stats.map(s => '<div class="insp-line-card" style="--c:' + s.color + '"><div class="insp-line-head"><span class="insp-line-dot" style="background:' + s.color + '"></span>' + s.name + ' · ' + s.metricName + '</div><div class="insp-line-wrap">' + weeklyLineChart(s.daily, s.color, s.metricUnit) + '</div></div>').join('') : '<div class="insp-empty">勾选模块后这里展示每日变化折线</div>') + '</div></div>'

    + '<div class="insp-section"><div class="insp-section-head"><span class="insp-section-title"><span class="insp-sec-heart">❤️</span> 习惯完成热力图</span><span class="insp-heat-legend"><i class="ht-low"></i><i class="ht-mid"></i><i class="ht-high"></i>完成度 低 → 高</span></div>'
    + '<div class="insp-heatmap-wrap"><div class="insp-heatmap-grid insp-heat-grid2"><span></span><span></span>'
    + weekdayLabels.map(l => '<span class="ih-day">' + l + '</span>').join('')
    + (stats.length ? stats.map(s => '<span class="ih-icon" style="color:' + s.color + '">' + icon(s.icon, 12) + '</span><span class="ih-name">' + s.name + '</span>' + s.levels.map(lv => '<span class="ih-dot lvl' + lv + '"></span>').join('')).join('') : '<span class="ih-name" style="grid-column:1/-1;color:var(--text-muted);font-size:10px;padding:6px 0">勾选模块后展示对应完成度</span>')
    + '</div></div></div>'

    + '<div class="insp-section insp-suggest-section"><div class="insp-section-head"><span class="insp-section-title"><span class="insp-sec-star">🌟</span> 每周优化建议</span></div>'
    + '<div class="insp-suggest-list">' + buildInsightSuggestions(stats).map(t => '<div class="insp-suggest-card"><span class="insp-suggest-ic">' + t.icon + '</span><p>' + t.text + '</p></div>').join('') + '</div></div>'
    + '</div>';
  content.appendChild(page);

  page.querySelector('#insp-week-btn').addEventListener('click', openWeekPicker);
  page.querySelector('#insp-diy-btn').addEventListener('click', openInsightDIY);
  page.querySelectorAll('.insp-cat-card').forEach(el => {
    el.addEventListener('click', () => {
      const st = stats.find(x => x.id === el.dataset.cat);
      if (st) openInsightDetail(st);
    });
  });
}

// ============ 项目计划（Screenshot 7） ============
function renderProjectPage() {
  const page = document.createElement('div');
  page.className = 'page';
  if (greetLine) greetLine.textContent = '项目计划';

  const PROJECT = {
    name: '英语四级备考',
    deadline: '2025-09-30',
    totalWeeks: 12,
    currentWeek: 4,
    desc: '每天进步一点点，四级一次过！✨',
    kr: ['词汇完成 300 个', '完成 2 次听力练习', '写作模板熟练运用']
  };
  const learned = Object.keys(state.language.learned || {}).length;
  const overall = Math.min(100, Math.round(learned / 2000 * 100)) || 28;

  const undone = state.plans.filter(p => !p.done).sort((a, b) => (b.points || 0) - (a.points || 0));
  const must = undone.slice(0, 3);
  const push = undone.slice(3, 6);
  const later = undone.slice(6, 8);

  const schedule = [
    { time: '09:00-09:50', name: '词汇学习', icon: '📕', tag: '专注' },
    { time: '14:00-14:40', name: '听力真题', icon: '🎧', tag: '专注' },
    { time: '19:30-20:20', name: '长篇阅读', icon: '📖', tag: '专注' }
  ];

  page.innerHTML = `
    <div class="sub-page-head">
      <button class="sub-back-btn" data-go="我的支线">‹</button>
      <h3 class="sub-title">项目计划 <span class="sub-spark">✨</span></h3>
      <span class="sub-more" title="更多" hidden>⋯</span>
    </div>

    <div class="proj-goal section-card">
      ${miniRingHTML(overall, 'ring-peach', overall + '%', '总体')}
      <div class="pg-info">
        <h4>${PROJECT.name}</h4>
        <p class="pg-sub">${PROJECT.desc}</p>
        <div class="pg-meta">
          <span class="pill-stat">总体进度 <b>${overall}%</b></span>
          <span class="pill-stat">截止 ${PROJECT.deadline}</span>
        </div>
        <div class="pg-meta">
          <span class="pill-stat">当前阶段 第 ${PROJECT.currentWeek}/${PROJECT.totalWeeks} 周</span>
          <span class="pill-stat">还有 ${weeksLeft(PROJECT.deadline)} 天</span>
        </div>
      </div>
      <span class="pg-bunny">🐰📚</span>
    </div>

    <div class="hp-section-title"><span class="sct-check">☑</span> 12 周计划进度 <span class="hp-more hp-link" data-go="我的支线">查看计划详情 ›</span></div>
    <div class="proj-timeline">
      ${Array.from({ length: PROJECT.totalWeeks }, (_, i) => {
        const w = i + 1;
        const cls = w < PROJECT.currentWeek ? 'done' : (w === PROJECT.currentWeek ? 'current' : '');
        return `<div class="proj-week ${cls}"><div class="pw-dot">${w < PROJECT.currentWeek ? '✓' : w}</div>W${w}</div>`;
      }).join('')}
    </div>

    <div class="proj-cols">
      <div class="proj-col"><h5>今日必须</h5>${projTaskList(must)}</div>
      <div class="proj-col"><h5>本周推进</h5>${projTaskList(push)}</div>
      <div class="proj-col"><h5>可延后</h5>${projTaskList(later)}</div>
    </div>

    <div class="hp-section-title">今日时间安排 <span class="hp-more">总计 2.5 小时</span></div>
    <div class="proj-schedule">
      ${schedule.map(s => `<div class="proj-slot">
        <span class="ps-icon">${s.icon}</span>
        <span class="ps-time">${s.time}</span>
        <span class="ps-name">${s.name}</span>
        <span class="ps-tag">${s.tag}</span>
      </div>`).join('')}
    </div>

    <div class="section-card proj-kr">
      <span class="kr-bunny">🐰</span>
      <div class="soft-card-title">⭐ 本周关键结果</div>
      ${PROJECT.kr.map(k => `<div class="study-plan-item"><div class="spi-check"></div><div class="spi-body"><div class="spi-name">${k}</div></div></div>`).join('')}
      <p class="kr-foot">继续保持，稳步向前！✨</p>
    </div>

    <button class="btn btn-primary pill-btn proj-focus-btn" id="proj-focus">▶ 开始专注</button>
  `;
  content.appendChild(page);

  page.querySelectorAll('[data-go]').forEach(b => b.addEventListener('click', () => selectItem(b.dataset.go)));
  page.querySelector('#proj-focus').addEventListener('click', openFocusModal);
}

function projTaskList(list) {
  if (!list || !list.length) return '<div class="proj-task"><span class="pt-check"></span><span class="pt-name" style="color:var(--text-muted)">暂无</span></div>';
  return list.map(p => `<div class="proj-task ${p.done ? 'done' : ''}">
    <span class="pt-check"></span>
    <span class="pt-name">${escapeHTML(p.text)}</span>
    <button class="item-delete" data-id="${p.id}" data-del-type="plan" aria-label="删除"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>
  </div>`).join('');
}
function weeksLeft(deadline) {
  const d = new Date(deadline + 'T00:00:00');
  return Math.max(0, Math.round((d - new Date()) / 86400000));
}

// ============ 快速记录模态框 ============
let qrCurrentTab = 'sport';

function openQuickRecordModal(tab) {
  qrCurrentTab = tab || 'sport';
  const modal = document.getElementById('quick-record-modal');
  if (!modal) return;
  modal.querySelectorAll('.qr-tab').forEach(t => t.classList.toggle('active', t.dataset.qr === qrCurrentTab));
  renderQuickRecordBody(qrCurrentTab);
  modal.classList.add('active');
}

function closeQuickRecordModal() {
  const modal = document.getElementById('quick-record-modal');
  if (modal) modal.classList.remove('active');
}

function renderQuickRecordBody(tab) {
  const body = document.getElementById('qr-body');
  if (!body) return;
  if (tab === 'sport') {
    body.innerHTML = `
      <div class="qr-field"><label>运动时长（分钟）</label><input type="number" id="qr-min" value="20" min="0"></div>
      <div class="qr-field"><label>备注</label><input type="text" id="qr-note" placeholder="今天做了什么运动？"></div>`;
  } else if (tab === 'sleep') {
    body.innerHTML = `
      <div class="qr-field"><label>睡觉时间</label><div class="qr-time-card"><input type="time" id="qr-bed" value="22:30"></div></div>
      <div class="qr-field"><label>起床时间</label><div class="qr-time-card"><input type="time" id="qr-wake" value="06:30"></div></div>
      <div class="qr-field"><label>睡眠质量 <span id="qr-q-val" class="qr-q-val">82</span></label>
        <div class="qr-range-wrap">
          <span class="qr-range-end">很差</span>
          <input type="range" class="qr-range" id="qr-quality" min="0" max="100" value="82">
          <span class="qr-range-end">很好</span>
        </div>
      </div>
      <div class="qr-field"><label>睡眠状态</label><div class="qr-chips" id="qr-sleep-chips">
        <span class="qr-chip" data-s="入睡快">入睡快</span>
        <span class="qr-chip active" data-s="一般">一般</span>
        <span class="qr-chip" data-s="易醒">易醒</span>
      </div></div>
      <div class="qr-field"><label>备注</label><input type="text" id="qr-note" placeholder="今天睡得怎么样？"></div>`;
  } else if (tab === 'money') {
    body.innerHTML = `
      <div class="qr-field"><label>类型</label><div class="qr-chips" id="qr-type-chips">
        <span class="qr-chip active" data-type="expense">支出</span>
        <span class="qr-chip" data-type="income">收入</span>
      </div></div>
      <div class="qr-field"><label>金额（元）</label><input type="number" id="qr-amount" value="0" min="0" step="0.01"></div>
      <div class="qr-field"><label>备注</label><input type="text" id="qr-note" placeholder="这笔钱用来做什么？"></div>`;
  } else {
    body.innerHTML = `
      <div class="qr-field"><label>想法 / 灵感</label><textarea id="qr-idea" placeholder="记下来，灵感才不会溜走～"></textarea></div>`;
  }
  bindQuickRecordEvents();
}

function bindQuickRecordEvents() {
  const modal = document.getElementById('quick-record-modal');
  if (!modal) return;
  modal.querySelectorAll('.qr-tab').forEach(t => {
    t.onclick = () => {
      qrCurrentTab = t.dataset.qr;
      modal.querySelectorAll('.qr-tab').forEach(x => x.classList.remove('active'));
      t.classList.add('active');
      renderQuickRecordBody(qrCurrentTab);
    };
  });
  modal.querySelectorAll('.qr-short').forEach(s => {
    s.onclick = () => {
      const tab = s.dataset.qr;
      qrCurrentTab = tab;
      modal.querySelectorAll('.qr-tab').forEach(x => x.classList.toggle('active', x.dataset.qr === tab));
      renderQuickRecordBody(tab);
    };
  });
  const closeBtn = modal.querySelector('#qr-close');
  if (closeBtn) closeBtn.onclick = closeQuickRecordModal;
  modal.onclick = (e) => { if (e.target === modal) closeQuickRecordModal(); };
  modal.querySelectorAll('.qr-chip').forEach(c => {
    c.onclick = () => {
      const group = c.closest('.qr-chips');
      if (group) group.querySelectorAll('.qr-chip').forEach(x => x.classList.remove('active'));
      c.classList.add('active');
    };
  });
  const q = modal.querySelector('#qr-quality');
  if (q) q.oninput = () => { const v = modal.querySelector('#qr-q-val'); if (v) v.textContent = q.value; };
  const save = modal.querySelector('#qr-save');
  if (save) save.onclick = saveQuickRecord;
}

function saveQuickRecord() {
  const modal = document.getElementById('quick-record-modal');
  if (!modal) return;
  const tab = qrCurrentTab;
  const noteEl = modal.querySelector('#qr-note');
  const note = noteEl ? noteEl.value : '';
  if (tab === 'sport') {
    const minutes = parseInt((modal.querySelector('#qr-min') || {}).value) || 0;
    const todayKey = getTodayKey();
    if (!state.exerciseLogs[todayKey]) state.exerciseLogs[todayKey] = [];
    state.exerciseLogs[todayKey].push({ id: uid('ex'), name: note || '快速运动', duration: minutes, calories: estimateExerciseCalories(note || '运动', minutes), done: true });
    saveExerciseLogs();
  } else if (tab === 'sleep') {
    const bed = (modal.querySelector('#qr-bed') || {}).value || '';
    const wake = (modal.querySelector('#qr-wake') || {}).value || '';
    const quality = parseInt((modal.querySelector('#qr-quality') || {}).value) || 70;
    const stateChip = modal.querySelector('#qr-sleep-chips .qr-chip.active');
    const sleepState = stateChip ? stateChip.dataset.s : '一般';
    localStorage.setItem('xenos-sleep-note', JSON.stringify({ date: getTodayKey(), bed, wake, quality, sleepState, note }));
    try {
      normalizeDomainTasks('health');
      const d = ensureDomain('health');
      const t = d.tasks.find(x => x.text.includes('12点前睡觉'));
      if (t && !t.done) {
        t.done = true; t.doneDate = getTodayKey();
        d.log[getTodayKey()] = (d.log[getTodayKey()] || 0) + (t.points || 0);
        saveDomains();
      }
    } catch (e) {}
  } else if (tab === 'money') {
    const amount = parseFloat((modal.querySelector('#qr-amount') || {}).value);
    const typeChip = modal.querySelector('#qr-type-chips .qr-chip.active');
    const type = typeChip ? typeChip.dataset.type : 'expense';
    if (isNaN(amount) || amount <= 0) { alert('请输入有效金额'); return; }
    const category = type === 'income'
      ? ((state.incomeCategories[0] && state.incomeCategories[0].name) || '其他')
      : ((state.expenseCategories[0] && state.expenseCategories[0].name) || '其他');
    state.transactions.push({ id: uid('tx'), date: getTodayKey(), type, amount: Math.round(amount * 100) / 100, category, note });
    saveTransactions();
  } else {
    const idea = (modal.querySelector('#qr-idea') || {}).value || '';
    if (!idea.trim()) { alert('写点什么吧～'); return; }
    if (!Array.isArray(state.memos)) state.memos = [];
    state.memos.push({ id: uid('memo'), date: getTodayKey(), text: idea });
    saveMemos();
  }
  closeQuickRecordModal();
  renderContent();
}
