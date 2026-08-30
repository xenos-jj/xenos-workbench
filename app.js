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
// 洞察页展示排除名单：这些模块的工作台本体页面（旅行体验/社交拓展）不受影响，
// 只是不在本周洞察统计中展示（卡片/折线图标签/热力图/自定义列表）。想恢复展示时把对应 id 从数组移除即可。
// v9288：洞察页临时隐藏 4 个慢模块（摄影/考证/家居/音乐）——自定义弹窗、卡片、折线图 legend、热力图统一不展示；
// 工作台本体页面（我的支线 / 暂缓模块）不受影响；想恢复展示时把对应 id 从数组移除即可。
const INSIGHT_HIDDEN_MODULES = ['travel', 'social', 'photography', 'cert', 'homeorg', 'music'];
const INSIGHT_MODULES = [
  {
    id: 'focus',
    name: '专注',
    icon: 'clock',
    color: '#8FA3C7',
    bg: '#EDF1F8',
    metricName: '累计时长',
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
    metricName: '累计时长',
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
    id: 'diet',
    name: '饮食',
    icon: 'utensils',
    color: '#E0A06A',
    bg: '#FBF1E4',
    metricName: '记录次数',
    metricUnit: '次',
    avgName: '日均记录',
    avgUnit: '次',
    compute(weekStart) {
      const daily = [], dailyItems = [], levels = [];
      let items = 0, metric = 0;
      for (let i = 0; i < 7; i++) {
        const d = shiftDate(weekStart, i);
        const log = state.dietLogs[d];
        const meals = log ? (log.meals || []) : [];
        const di = meals.length;
        daily.push(di); metric += di;
        dailyItems.push(di); items += di;
        levels.push(di === 0 ? 0 : di <= 2 ? 1 : di <= 4 ? 2 : 3);
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
    name: '学习',
    icon: 'bookOpen',
    color: '#A99BD6',
    bg: '#F3F0FA',
    metricName: '累计时长',
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
    name: '计划',
    icon: 'review',
    color: '#7FB0A0',
    bg: '#EAF4F1',
    metricName: '累计记录',
    metricUnit: '篇',
    avgName: '日均记录',
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
  },
  {
    id: 'travel',
    name: '旅行',
    icon: 'plane',
    color: '#E0A85C',
    bg: '#FBEFDD',
    metricName: '本周获得积分',
    metricUnit: '分',
    avgName: '日均积分',
    avgUnit: '分',
    compute(weekStart) {
      const daily = [], dailyItems = [], levels = [];
      let items = 0, metric = 0;
      const t = state.travel || {};
      const cats = (t.checkin && t.checkin.categories) || [];
      const all = cats.reduce((a, c) => a.concat(c.places || []), []);
      for (let i = 0; i < 7; i++) {
        const d = shiftDate(weekStart, i);
        const dayPts = Number((t.log && t.log[d]) || 0);
        const doneToday = all.filter(p => p.checked && p.date === d).length;
        daily.push(dayPts); metric += dayPts;
        dailyItems.push(doneToday); items += doneToday;
        levels.push(doneToday === 0 ? 0 : doneToday === 1 ? 1 : doneToday === 2 ? 2 : 3);
      }
      return { daily, dailyItems, levels, items, metric };
    }
  },
  {
    id: 'social',
    name: '社交',
    icon: 'message',
    color: '#E8A77C',
    bg: '#FBEDE3',
    metricName: '本周获得积分',
    metricUnit: '分',
    avgName: '日均积分',
    avgUnit: '分',
    compute(weekStart) {
      const daily = [], dailyItems = [], levels = [];
      let items = 0, metric = 0;
      const s = state.social || {};
      const acts = s.actions || [];
      for (let i = 0; i < 7; i++) {
        const d = shiftDate(weekStart, i);
        const dayPts = Number((s.log && s.log[d]) || 0);
        const doneToday = acts.filter(a => a.done && a.date === d).length;
        daily.push(dayPts); metric += dayPts;
        dailyItems.push(doneToday); items += doneToday;
        levels.push(doneToday === 0 ? 0 : doneToday === 1 ? 1 : doneToday === 2 ? 2 : 3);
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
  return loadJSON('xenos-insight-modules', []);
}
function saveInsightModules(ids) {
  saveJSON('xenos-insight-modules', ids);
}

// 全局规则 4 & 5：新增模块只需调用一次 registerInsightModule(def) 即可自动进入
// 「本周洞察」的自定义列表、统计卡片、折线趋势图与习惯热力图，无需单独配置。
function registerInsightModule(def) {
  if (!def || !def.id) return;
  if (!INSIGHT_MODULES.some(m => m.id === def.id)) INSIGHT_MODULES.push(def);
}

// v9253：暂时放缓 4 模块的洞察统计口径（按日期积分 + 当天是否打卡）
function slowModuleCompute(key) {
  return function (weekStart) {
    const daily = [], dailyItems = [], levels = [];
    let items = 0, metric = 0;
    const m = state[key] || {};
    const log = m.log || {};
    const checkin = m.checkin || {};
    for (let i = 0; i < 7; i++) {
      const d = shiftDate(weekStart, i);
      const pts = Number(log[d] || 0);
      const c = checkin[d];
      const di = c && c.done ? 1 : 0;
      daily.push(pts); metric += pts;
      dailyItems.push(di); items += di;
      levels.push(di === 0 ? 0 : 1);
    }
    return { daily, dailyItems, levels, items, metric };
  };
}

registerInsightModule({
  id: 'photography', name: '摄影审美', icon: 'camera', color: '#7FB0D3', bg: '#EDF5FB',
  metricName: '本周积分', metricUnit: '分', avgName: '日均积分', avgUnit: '分',
  compute: slowModuleCompute('photography')
});
registerInsightModule({
  id: 'cert', name: '技能考证', icon: 'scroll', color: '#C9A87C', bg: '#F7F0E6',
  metricName: '本周积分', metricUnit: '分', avgName: '日均积分', avgUnit: '分',
  compute: slowModuleCompute('cert')
});
registerInsightModule({
  id: 'homeorg', name: '家居整理', icon: 'home', color: '#A0BB7A', bg: '#F1F6E9',
  metricName: '本周积分', metricUnit: '分', avgName: '日均积分', avgUnit: '分',
  compute: slowModuleCompute('homeorg')
});
registerInsightModule({
  id: 'music', name: '音乐练习', icon: 'music', color: '#B8AAD8', bg: '#F2EFF9',
  metricName: '本周积分', metricUnit: '分', avgName: '日均积分', avgUnit: '分',
  compute: slowModuleCompute('music')
});

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
  creditCard: '<rect x="3" y="6" width="18" height="12" rx="2"/><path d="M3 10h18"/><path d="M7 14h4"/>',
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
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5"/><path d="M12 8h.01"/>',
  // 奖励池 / 成就 / 记账分类线性图标
  flower: '<path d="M12 7c.8-1.5 2.7-1.5 3.5 0 .8 1.5-.3 3-2 3.5 1.7.5 2.8 2 2 3.5-.8 1.5-2.7 1.5-3.5 0-.8 1.5-2.7 1.5-3.5 0-.8-1.5.3-3 2-3.5-1.7-.5-2.8-2-2-3.5.8-1.5 2.7-1.5 3.5 0z"/><circle cx="12" cy="12" r="1.2" fill="currentColor"/>',
  sparkle: '<path d="M12 2v4M12 18v4M2 12h4M18 12h4M4.9 4.9l2.8 2.8M16.3 16.3l2.8 2.8M4.9 19.1l2.8-2.8M16.3 7.7l2.8-2.8"/>',
  sunrise: '<path d="M3 18h18"/><path d="M12 4v8"/><path d="M7 9L5 7"/><path d="M17 9l2-2"/><path d="M12 4V2"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  clipboard: '<rect x="6" y="4" width="12" height="17" rx="2"/><path d="M9 4V3a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1"/><path d="M9 11h6M9 15h4"/>',
  mountain: '<path d="M3 19h18L14 9l-4 7-3-4-4 7z"/>',
  mountains: '<path d="M3 19h18l-5-9-4 6-2-3-4 6z"/><path d="M14 11l4 8"/>',
  timer: '<circle cx="12" cy="13" r="7"/><path d="M12 9v4l3 2"/><path d="M12 4V2"/><path d="M15 3H9"/>',
  meditate: '<path d="M12 5a3 3 0 1 0 0 6 3 3 0 1 0 0-6z"/><path d="M6 19c0-3.3 2.7-6 6-6s6 2.7 6 6"/><path d="M6 19h12"/>',
  gem: '<path d="M6 8l6-5 6 5-6 10-6-10z"/><path d="M6 8h12"/><path d="M9 8l3 10 3-10"/>',
  crown: '<path d="M4 16l2-8 4 4 4-6 4 6 4-4 2 8H4z"/><path d="M5 19h14"/>',
  muscle: '<path d="M6 11c0-2 1.5-4 3.5-4s3.5 2 3.5 4"/><path d="M18 11c0-2-1.5-4-3.5-4s-3.5 2-3.5 4"/><path d="M9 16c2 1 4 1 6 0"/>',
  food: '<path d="M6 8h12"/><path d="M5 8c0 4 3 8 7 8s7-4 7-8"/><path d="M8 8v2M12 8v3M16 8v2"/>',
  card: '<rect x="3" y="6" width="18" height="12" rx="2"/><path d="M3 10h18"/><circle cx="7" cy="14" r="1" fill="currentColor"/><path d="M11 14h8"/>',
  train: '<rect x="5" y="5" width="14" height="14" rx="2"/><path d="M5 10h14M8 5v14M16 5v14M8 19l-2 3M16 19l2 3"/>',
  shopping: '<path d="M6 7h12l1 13H5z"/><path d="M9 7V5a3 3 0 0 1 6 0v2"/>',
  film: '<rect x="3" y="6" width="18" height="12" rx="2"/><path d="M7 6v12M17 6v12"/>',
  pill: '<rect x="8" y="4" width="8" height="16" rx="4"/><path d="M8 12h8"/>',
  thermometer: '<path d="M14 14.8V5a2 2 0 0 0-4 0v9.8a4 4 0 1 0 4 0z"/><path d="M12 15v-4"/>',
  box: '<path d="M12 3l9 4.5v9L12 21 3 16.5v-9z"/><path d="M12 12l9-4.5M12 12v9M12 12L3 7.5"/>',
  envelope: '<path d="M3 6h18v12H3z"/><path d="M3 6l9 6 9-6"/>',
  laptop: '<rect x="3" y="5" width="18" height="12" rx="2"/><path d="M2 17h20"/>',
  chartLine: '<path d="M3 17h18"/><path d="M3 13l5-5 4 4 6-7"/>',
  timeline: '<path d="M3 12h18"/><path d="M7 12V7M12 12V4M17 12v-4"/><circle cx="7" cy="12" r="1.4" fill="currentColor"/><circle cx="12" cy="12" r="1.4" fill="currentColor"/><circle cx="17" cy="12" r="1.4" fill="currentColor"/>',
  bulb: '<path d="M9 18h6"/><path d="M10 21h4"/><path d="M12 3a6 6 0 0 0-4 10.5c.7.7 1 1.3 1 2.5h6c0-1.2.3-1.8 1-2.5A6 6 0 0 0 12 3z"/>',
  time: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  link: '<path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1"/><path d="M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1"/>',
  palette: '<path d="M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z"/><circle cx="15" cy="8" r="1.5" fill="currentColor"/><circle cx="8.5" cy="10" r="1.5" fill="currentColor"/><circle cx="12" cy="16" r="2" fill="currentColor"/>',
  bell: '<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>',
  lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
  save: '<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><path d="M17 21v-8H7v8"/><path d="M7 3v5"/>',
  running: '<path d="M13 5a2 2 0 1 0-4 0 2 2 0 0 0 4 0z"/><path d="M8 10l2-1 3 2 4-2"/><path d="M10 21l-2-6 3-3 2 5 4-3"/>',
  walk: '<circle cx="12" cy="5" r="2"/><path d="M10 10l2 4-2 7"/><path d="M14 10l-2 4 2 7"/>',
  bike: '<circle cx="6" cy="16" r="3"/><circle cx="18" cy="16" r="3"/><path d="M6 16l6-7 4 4"/><path d="M16 9l-3-3h6"/>',
  moon: '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>',
  moneyBag: '<path d="M12 2a5 5 0 0 0-5 5v2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2h-1V7a5 5 0 0 0-5-5z"/><path d="M9 9h6"/><path d="M12 13v4"/>',
  sprout: '<path d="M12 22v-6"/><path d="M12 16c-3 0-5-2-5-5 0-3 3-5 5-5s5 2 5 5c0 3-2 5-5 5z"/><path d="M12 16c-2 2-5 2-7 0"/><path d="M12 16c2 2 5 2 7 0"/>',
  zap: '<path d="M13 2L4 14h7l-2 8 9-12h-7l2-8z"/>',
  trendDown: '<path d="M3 17h18"/><path d="M17 17l-5-5-3 3-6-6"/>',
  plane: '<path d="M2 12h20"/><path d="M14 2l6 10-6 10V2z"/>',
  message: '<path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7A8.38 8.38 0 0 1 4 11.5a8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>',
  camera: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M7 7V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v2"/><circle cx="12" cy="13.5" r="3"/>',
  scroll: '<path d="M6 3h12a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/><path d="M6 8h12M6 13h12M6 18h12"/>',
  music: '<path d="M9 18V5l12-3v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="15" r="3"/>',
  chevronRight: '<path d="M9 18l6-6-6-6"/>',
  chevronDown: '<path d="M6 9l6 6 6-6"/>'
};

// ==================== 全局图标规范库（v9254） ====================
// 同一功能模块，无论出现在哪个页面/卡片/标签/入口，必须统一使用下表中的
// 唯一 icon + 唯一显示名。新增卡片/标签/模块入口时，必须从此表取 icon，
// 禁止单页面自定义不同图标或别名。图标均为 ICONS 中的线性 SVG，风格已统一。
// 语义约束：运动→运动类图标，学习→书本/学习类，饮食→食物餐具，睡眠→月亮。
const CANONICAL_ICONS = Object.freeze({
  // 领域 / 主模块
  '记账':        { icon: 'coins',       desc: '记录收支、现金流' },
  '学习成长':    { icon: 'book',        desc: '英语、阅读等学习' },
  '健康':        { icon: 'heart',       desc: '身心健康总览' },
  '饮食':        { icon: 'utensils',    desc: '食物与热量' },
  '健身':        { icon: 'dumbbell',    desc: '运动锻炼' },
  '睡眠':        { icon: 'moon',        desc: '睡眠记录' },
  '今日心境':    { icon: 'smile',       desc: '情绪心情' },
  '身体小状况':  { icon: 'thermometer', desc: '身体不适症状' },
  // 暂时放缓 4 模块（洞察名须与子页标题一致）
  '摄影审美':    { icon: 'camera',      desc: '构图与后期' },
  '技能考证':    { icon: 'scroll',      desc: '证书备考' },
  '家居整理':    { icon: 'home',        desc: '生活空间' },
  '音乐练习':    { icon: 'music',       desc: '乐器声乐' },
  // 通用
  '碎碎念':      { icon: 'note',        desc: '随记' },
  '当日计划':    { icon: 'calendar',    desc: '每日计划' },
  '自我介绍':    { icon: 'user',        desc: '个人档案' },
  '设置':        { icon: 'settings',    desc: '设置' }
});

function canonicalIcon(name) {
  return (CANONICAL_ICONS[name] && CANONICAL_ICONS[name].icon) || null;
}

function icon(name, size = 16) {
  const inner = ICONS[name] || ICONS['file'];
  return `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`;
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
      { id: 'i-money', name: '记账', icon: 'coins' }
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
      { id: 'i-diet', name: '饮食', icon: 'utensils' },
      { id: 'i-look', name: '外貌', icon: 'sparkles' }
    ]
  },
  {
    id: 'g-self',
    name: '自我',
    icon: 'user',
    collapsed: false,
    items: [
      { id: 'i-intro', name: '自我介绍', icon: 'user' },
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
    tags: [],
    tools: [],
    tasks: [
      { text: '喝水 1500ml', points: 2 },
      { text: '12点前睡觉', points: 5 }
    ]
  },
  '外貌': {
    key: 'looks', icon: 'sparkles', subtitle: '把自己当作长期作品来打磨',
    tags: ['护肤', '仪态', '穿搭', '妆容'],
    tools: [],
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
  age: 24,
  gender: '',
  birthdaySolar: '',
  birthdayLunar: '',
  job: '带货主播',
  hobby: '看小说、刷短剧',
  skill: '无',
  swot: { s: '', w: '', o: '', t: '' }
};

const DEFAULT_REWARDS = [
  // 小奖励（0–1000 分）柔和浅暖米色 / 淡奶咖色
  { id: 'rw-s1', tier: 'small', emoji: '🍰', img: '', name: '甜品', desc: '甜一下', cost: 600 },
  { id: 'rw-s2', tier: 'small', emoji: '🧋', img: '', name: '一杯奶茶', desc: '日常小犒赏', cost: 500 },
  { id: 'rw-s3', tier: 'small', emoji: '🍿', img: '', name: '零食', desc: '解馋小快乐', cost: 400 },
  { id: 'rw-s4', tier: 'small', emoji: '🍓', img: '', name: '新鲜水果', desc: '健康小补给', cost: 450 },
  // 中奖励（1000–3000 分）清新浅豆绿色
  { id: 'rw-m1', tier: 'medium', emoji: '🎬', img: '', name: '看一场影院电影', desc: '影院大屏观影', cost: 2000 },
  { id: 'rw-m2', tier: 'medium', emoji: '🤖', img: '', name: 'AI 动漫观影', desc: '沉浸式追番', cost: 1200 },
  { id: 'rw-m3', tier: 'medium', emoji: '📺', img: '', name: '综艺畅看', desc: '休闲放松时刻', cost: 1300 },
  { id: 'rw-m4', tier: 'medium', emoji: '📖', img: '', name: '小说会员', desc: '随心看网文', cost: 1600 },
  { id: 'rw-m5', tier: 'medium', emoji: '🎞️', img: '', name: '影视会员', desc: '海量剧集随心刷', cost: 1800 },
  { id: 'rw-m6', tier: 'medium', emoji: '🏬', img: '', name: '商场观影', desc: '商圈影院体验', cost: 2200 },
  { id: 'rw-m7', tier: 'medium', emoji: '🥡', img: '', name: '点外卖', desc: '省心干饭自由', cost: 2500 },
  { id: 'rw-m8', tier: 'medium', emoji: '📚', img: '', name: '买一本想读的书', desc: '知识投资', cost: 1500 },
  // 大奖励（3000–10000 分）温柔浅香芋紫色
  { id: 'rw-l1', tier: 'large', emoji: '🏋️', img: '', name: '单次健身消费', desc: '运动焕新状态', cost: 4000 },
  { id: 'rw-l2', tier: 'large', emoji: '🚗', img: '', name: '短途出门游玩', desc: '短途散心出行', cost: 7000 },
  { id: 'rw-l3', tier: 'large', emoji: '🧵', img: '', name: '手工 DIY 体验', desc: '动手创作乐趣', cost: 5500 },
  { id: 'rw-l4', tier: 'large', emoji: '💍', img: '', name: '配饰选购', desc: '穿搭小点缀', cost: 8000 },
  // 超大奖励（10000–30000 分）暖橘浅橙色
  { id: 'rw-x1', tier: 'xlarge', emoji: '👗', img: '', name: '心仪已久的一件衣服', desc: '穿搭大额犒赏', cost: 15000 },
  { id: 'rw-x2', tier: 'xlarge', emoji: '🛋️', img: '', name: '心仪已久的家具', desc: '居家品质升级', cost: 22000 },
  { id: 'rw-x3', tier: 'xlarge', emoji: '🎁', img: '', name: '心仪已久的一件好物', desc: '大额犒赏', cost: 15000 }
];

const REWARD_TIERS = [
  { key: 'small', name: '小奖励', icon: 'flower', min: 0, max: 1000, bg: '#FDF6ED', border: '#F3E8DA', text: '#A68B6F' },
  { key: 'medium', name: '中奖励', icon: 'star', min: 1000, max: 3000, bg: '#F0F7EB', border: '#DDEED5', text: '#6E9A5E' },
  { key: 'large', name: '大奖励', icon: 'crown', min: 3000, max: 10000, bg: '#F2EFF9', border: '#E6E0F3', text: '#8F7DB8' },
  { key: 'xlarge', name: '超大奖励', icon: 'sparkle', min: 10000, max: 30000, bg: '#FFF4EB', border: '#F9E3CF', text: '#D99861' }
];

function rewardTierByCost(cost) {
  const c = Number(cost) || 0;
  if (c >= 10000) return 'xlarge';
  if (c >= 3000) return 'large';
  if (c >= 1000) return 'medium';
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
  { id: 'ac-9', icon: 'review', name: '复盘习惯', desc: '完成 7 次每日计划', type: 'review', need: 7 },
  { id: 'ac-10', icon: 'muscle', name: '运动起步', desc: '累计运动 300 分钟', type: 'exercise', need: 300 },
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
  focusOptions: ['英语', '健康', '记账', '阅读', '护肤', '穿搭', '妆容', '仪态'],
  moduleTravel: true,
  moduleSocial: true,
  keepBranches: [
    { name: '生活秩序', emoji: '📋', icon: 'list', freq: '每周 2 天', color: '#a0bb7a' },
    { name: '内在成长', emoji: '🌱', icon: 'sprout', freq: '每周 1 天', color: '#f4b75b' },
  ],
  slowBranches: [
    { name: '旅行体验', emoji: '✈️', icon: 'plane' },
    { name: '社交拓展', emoji: '💬', icon: 'message' }
  ],
  slowPool: [
    { name: '旅行体验', emoji: '✈️', icon: 'plane', desc: '探索世界，记录美好风景' },
    { name: '社交拓展', emoji: '💬', icon: 'message', desc: '维护关系，认识新朋友' },
    { name: '摄影审美', emoji: '📷', icon: 'camera', desc: '练习构图与后期，积累作品集' },
    { name: '技能考证', emoji: '📜', icon: 'scroll', desc: '考取职业或兴趣相关证书' },
    { name: '家居整理', emoji: '🏠', icon: 'home', desc: '打造舒适整洁的生活空间' },
    { name: '音乐练习', emoji: '🎵', icon: 'music', desc: '乐器或声乐，享受旋律疗愈' },
  ]
};

// 本月主线标签配色：每个标签独立颜色（移除 睡眠/自媒体/锻炼/生活）
const FOCUS_COLORS = {
  '英语': { bg: '#F5F2F9', border: '#A99ADC', color: '#8978C3' },
  '健康': { bg: '#F5F6E8', border: '#A0BB7A', color: '#7A9C5A' },
  '记账': { bg: '#FDF1E1', border: '#F7BA61', color: '#F4B75B' },
  '阅读': { bg: '#EEF5FB', border: '#9BBBD8', color: '#5A8AB8' },
  '护肤': { bg: '#F8EEF4', border: '#EAD0E2', color: '#B07A9E' },
  '穿搭': { bg: '#F2EFF8', border: '#C4B8E0', color: '#8C7BB6' },
  '妆容': { bg: '#FCEDF1', border: '#E8B4C0', color: '#C4798C' },
  '仪态': { bg: '#EEF4EE', border: '#A8C4A8', color: '#7A9C7A' }
};
// 本月主线标签 -> 支线卡片配置：图标、主题色、跳转、行动按钮文案
const FOCUS_CARD_DEF = {
  '英语': { type: 'learning', route: '学习成长', action: '背词汇 20min', sub: '每天进步一点点，未来更自由' },
  '阅读': { type: 'learning', route: '书籍阅读', action: '阅读 30min', sub: '翻开一本书，安放一段时光' },
  '健康': { type: 'health', route: '健康', action: '今晚 23:30 前睡', sub: '健康是所有热爱的底气' },
  '记账': { type: 'money', route: '记账', action: '记 1 笔收支', sub: '把热爱变现，创造更多可能' },
  '护肤': { type: 'looks', route: '护肤', action: '完成今日护肤', sub: '认真护肤，是对自己的温柔' },
  '妆容': { type: 'looks', route: '外貌', action: '练习一个妆容', sub: '一点点精致，让自己更喜欢自己' },
  '仪态': { type: 'looks', route: '外貌', action: '体态训练 10min', sub: '挺拔一点，自信一点' },
  '穿搭': { type: 'looks', route: '外貌', action: '搭配今日穿搭', sub: '今天的出场，也是生活的仪式感' }
};
const REMOVED_FOCUS_LABELS = ['睡眠', '自媒体', '锻炼', '生活'];
function focusColorOf(name) {
  if (FOCUS_COLORS[name]) return FOCUS_COLORS[name];
  // 自定义标签：按名字哈希生成柔和 pastel 色
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 360;
  return { bg: `hsl(${h}, 55%, 95%)`, border: `hsl(${h}, 45%, 80%)`, color: `hsl(${h}, 50%, 40%)` };
}

// 旅行体验（低精力版）默认数据
// 旅行体验（低精力版・轻量出门期）—— 分阶段结构
const DEFAULT_TRAVEL = {
  enabled: true,
  // 阶段总规则（置顶，可在「旅行灵感」区看到，随时可改）
  rule: '所有出门按当天往返、随时折返、不强制次数；状态不好可跳过本周，没有惩罚。',
  phase: 'adapt', // 当前阶段：adapt=入门适应周 / expand=小幅拓展周
  phases: {
    adapt: {
      id: 'adapt',
      name: '入门适应周',
      meta: '5-15 分钟 / 次，每周完成 3 次即可',
      nextDestination: '小区周边探索',
      places: [
        { id: 'a1', name: '单元楼绕圈漫步', note: '下楼散步', points: 5, status: '待规划' },
        { id: 'a2', name: '小区环线漫步', note: '沿公园走一圈', points: 10, status: '待规划' }
      ],
      actions: [],
      inspirationGuide: '每次出门后补充 1 句：记录 1 个出门时的小发现，例：楼下石榴树结果了、便利店新上了汽水。',
      discoveries: []
    },
    expand: {
      id: 'expand',
      name: '小幅拓展周',
      meta: '逐步拉近距离，当天往返',
      nextDestination: '1 公里街巷探索',
      places: [
        { id: 'e1', name: '沿街无目的慢走', note: '出小区沿陌生小路走到下一个路口折返，15-20 分钟', points: 0, status: '待规划' },
        { id: 'e2', name: '街心公园静坐', note: '步行至附近社区公园，长椅静坐 10 分钟后返程，20-30 分钟', points: 0, status: '待规划' },
        { id: 'e3', name: '小店橱窗浏览', note: '路过感兴趣的小店仅看橱窗，无需进店消费，20 分钟内', points: 0, status: '待规划' }
      ],
      actions: [
        { id: 'ea1', text: '完成沿街慢走', points: 10, done: false, date: '' },
        { id: 'ea2', text: '完成街心公园静坐', points: 12, done: false, date: '' },
        { id: 'ea3', text: '完成小店橱窗浏览', points: 10, done: false, date: '' }
      ],
      inspirationGuide: '每次出门后补充：记录 1 处街边细节，或收藏 1 家意向小店。',
      discoveries: []
    }
  },
  // 地点打卡：分类清单（轻量出门期之外，自由记录想实地到访的地点）
  checkin: {
    categories: [
      { id: 'ck1', name: '青浦近郊（嘉松中路地铁站周边｜距离近优先）', icon: 'mountain', places: [
        { id: 'ck1-1', name: '蟠龙天地', note: '江南水乡新古镇，小桥河道，商铺丰富，散步很舒服', points: 12, checked: false, date: '', photos: [], mood: '' },
        { id: 'ck1-2', name: '徐泾老街', note: '老上海老街烟火气息，小众安静，人不多', points: 8, checked: false, date: '', photos: [], mood: '' },
        { id: 'ck1-3', name: '朱家角古镇', note: '水乡古镇，河边散步，小吃很多，青浦老牌古镇', points: 15, checked: false, date: '', photos: [], mood: '' },
        { id: 'ck1-4', name: '章堰古镇', note: '人很少的原生态小众古镇，古建筑，适合闲逛', points: 12, checked: false, date: '', photos: [], mood: '' },
        { id: 'ck1-5', name: '元祖梦世界', note: '手工 DIY 体验馆，可以做蛋糕手工，室内不怕下雨', points: 10, checked: false, date: '', photos: [], mood: '' },
        { id: 'ck1-6', name: '大千天鹅湖庄园', note: '湖景绿地，可以看天鹅，户外风景舒缓', points: 12, checked: false, date: '', photos: [], mood: '' },
        { id: 'ck1-7', name: '百联奥特莱斯（青浦）', note: '大型购物商场，店铺多，适合慢慢逛', points: 10, checked: false, date: '', photos: [], mood: '' }
      ] },
      { id: 'ck2', name: '上海小众小镇 & 风景地', icon: 'mountains', places: [
        { id: 'ck2-1', name: '召稼楼古镇', note: '江南古镇，小吃密集，逛吃一体', points: 14, checked: false, date: '', photos: [], mood: '' },
        { id: 'ck2-2', name: '枫泾古镇', note: '原生态水乡，人比朱家角少，古建筑多', points: 16, checked: false, date: '', photos: [], mood: '' },
        { id: 'ck2-3', name: '新场古镇', note: '电影取景地，安静老街，咖啡店很多', points: 14, checked: false, date: '', photos: [], mood: '' },
        { id: 'ck2-4', name: '广富林郊野公园', note: '大片绿地郊野，散步放空，风景开阔', points: 13, checked: false, date: '', photos: [], mood: '' },
        { id: 'ck2-5', name: '淀山湖环湖大道', note: '环湖风景，湖边吹风，看日落', points: 13, checked: false, date: '', photos: [], mood: '' },
        { id: 'ck2-6', name: '金泽古镇', note: '桥乡古镇，极度安静小众，游客少', points: 15, checked: false, date: '', photos: [], mood: '' }
      ] },
      { id: 'ck3', name: '特色商场 / 文化街区', icon: 'gem', places: [
        { id: 'ck3-1', name: '愚园路街区', note: '老马路，老洋房，超多小店咖啡店，慢慢溜达', points: 14, checked: false, date: '', photos: [], mood: '' },
        { id: 'ck3-2', name: '安福路', note: '文艺街区，买手店、小店聚集，氛围感强', points: 13, checked: false, date: '', photos: [], mood: '' },
        { id: 'ck3-3', name: '衡山路‑武康路街区', note: '洋房街道，散步拍照，各色小店', points: 14, checked: false, date: '', photos: [], mood: '' },
        { id: 'ck3-4', name: '今潮 8 弄', note: '老石库门改造街区，特色小店，展览，文创', points: 12, checked: false, date: '', photos: [], mood: '' },
        { id: 'ck3-5', name: '上生新所', note: '复古园区，咖啡馆、买手店，园区环境好看', points: 13, checked: false, date: '', photos: [], mood: '' },
        { id: 'ck3-6', name: '苏河湾万象天地', note: '新旧结合商场，户外街区，店铺丰富', points: 12, checked: false, date: '', photos: [], mood: '' }
      ] },
      { id: 'ck4', name: '小众手工 & 趣味店铺', icon: 'scissors', places: [
        { id: 'ck4-1', name: '各类陶艺手作店', note: '陶艺捏泥 DIY，可以做杯子摆件，沉浸式动手', points: 14, checked: false, date: '', photos: [], mood: '' },
        { id: 'ck4-2', name: '香薰蜡烛 DIY 工作室', note: '调香做蜡烛，室内安静手工体验', points: 12, checked: false, date: '', photos: [], mood: '' },
        { id: 'ck4-3', name: '油画流体暴力熊手工店', note: '流体熊彩绘，解压手工', points: 11, checked: false, date: '', photos: [], mood: '' },
        { id: 'ck4-4', name: '古籍文创手作店', note: '印章盖章、文创小物，逛 + 小手工', points: 10, checked: false, date: '', photos: [], mood: '' },
        { id: 'ck4-5', name: '羊毛毡手作体验店', note: '做羊毛毡小玩偶，慢节奏手工', points: 13, checked: false, date: '', photos: [], mood: '' }
      ] },
      { id: 'ck5', name: '值得尝试特色餐馆', icon: 'utensils', places: [
        { id: 'ck5-1', name: '朱家角本地本帮菜馆', note: '水乡本帮菜，河鲜、家常菜', points: 9, checked: false, date: '', photos: [], mood: '' },
        { id: 'ck5-2', name: '蟠龙天地特色小馆集合', note: '多种菜系，环境舒适，逛古镇顺便吃饭', points: 8, checked: false, date: '', photos: [], mood: '' },
        { id: 'ck5-3', name: '召稼楼本地小吃', note: '各类上海传统小吃，糕点', points: 8, checked: false, date: '', photos: [], mood: '' },
        { id: 'ck5-4', name: '愚园路特色咖啡馆简餐', note: '环境舒服，轻食简餐，适合歇脚', points: 9, checked: false, date: '', photos: [], mood: '' },
        { id: 'ck5-5', name: '本帮家常菜小馆', note: '地道上海家常菜，烟火气', points: 8, checked: false, date: '', photos: [], mood: '' }
      ] }
    ]
  },
  log: {}
};

// 社交拓展（低精力版）默认数据
const DEFAULT_SOCIAL = {
  enabled: true,
  contactsThisWeek: 0,
  actions: [
    { id: 's1', text: '给 1 位熟悉老朋友发一条简短消息', points: 5, done: false },
    { id: 's2', text: '刷线下活动介绍图文，仅浏览，不用报名', points: 10, done: false },
    { id: 's3', text: '记录 1 条自己的想法，仅分享给自己', points: 10, done: false },
    { id: 's4', text: '在感兴趣的小众群 / 帖子里发 1 条评论 / 回复', points: 8, done: false },
    { id: 's5', text: '参与 1 次线上同好小分享（不用露脸、不用长聊）', points: 10, done: false }
  ],
  goal: '维护 1-2 段舒服的旧关系，不强迫拓展新圈子，减少消耗自己的无效社交。',
  log: {}
};

// 护肤日常（低精力版）默认数据
const DEFAULT_SKINCARE = {
  enabled: true,
  routine: [
    { id: 'sk-am', name: '早间护肤', items: [
      { id: 'sk-am-1', text: '温水洗脸', done: false },
      { id: 'sk-am-2', text: '爽肤水', done: false },
      { id: 'sk-am-3', text: '保湿乳 / 面霜', done: false },
      { id: 'sk-am-4', text: '防晒', done: false }
    ]},
    { id: 'sk-pm', name: '晚间护肤', items: [
      { id: 'sk-pm-1', text: '卸妆 / 洁面', done: false },
      { id: 'sk-pm-2', text: '爽肤水', done: false },
      { id: 'sk-pm-3', text: '精华', done: false },
      { id: 'sk-pm-4', text: '面霜', done: false }
    ]}
  ],
  notes: ''
};

// 生活秩序默认数据
const DEFAULT_ORDER = {
  enabled: true,
  morning: [
    { id: 'lo-am-1', text: '9:00 起床', points: 5, done: false, date: '' },
    { id: 'lo-am-2', text: '6:30 起床', points: 5, done: false, date: '' },
    { id: 'lo-am-3', text: '整理床铺 & 桌面', points: 5, done: false, date: '' },
    { id: 'lo-am-4', text: '喝一大杯温水', points: 3, done: false, date: '' }
  ],
  evening: [
    { id: 'lo-pm-1', text: '12:00 前放下手机', points: 5, done: false, date: '' },
    { id: 'lo-pm-2', text: '睡前 5 分钟复盘', points: 5, done: false, date: '' }
  ],
  log: {}
};

// 内在成长默认数据
const DEFAULT_GROWTH = {
  enabled: true,
  awareness: [
    { id: 'ig-1', text: '5 分钟呼吸冥想', points: 5, done: false, date: '' },
    { id: 'ig-2', text: '记录 1 次情绪波动', points: 5, done: false, date: '' }
  ],
  theme: '「我能在哪些小事上对自己更温柔一点？」',
  log: {}
};

// ---------- 暂时放缓 4 模块（v9283：移除烹饪美食/志愿公益）----------
// 统一数据骨架：enabled(洞察开关) / goal(目标) / tasks(清单) / records(记录库)
// favorites(收藏) / notes(笔记) / checkin(按日期打卡) / log(按日期积分)

// v9255：6 个暂缓模块默认打卡任务 + 精确积分（全部低分、日常小额高频；一次性大项偏高但不超 30 分）
// 任务可自定义新增、用户可改积分；积分随勾选自动发入 state.points 并流入奖励池 / 本周洞察。
const SLOW_SPEC_TASKS = {
  photography: [
    { id: 'ph-t1', text: '浏览赏析优秀摄影作品', points: 2, done: false, date: '' },
    { id: 'ph-t2', text: '修图构图练习', points: 4, done: false, date: '' },
    { id: 'ph-t3', text: '外出实拍采风', points: 6, done: false, date: '' },
    { id: 'ph-t4', text: '整理归档并写心得', points: 7, done: false, date: '' },
    { id: 'ph-t5', text: '完整主题拍摄并归档（一次性）', points: 15, done: false, date: '' }
  ],
  cert: [
    { id: 'ct-t1', text: '轻量备考（约15分钟）', points: 2, done: false, date: '' },
    { id: 'ct-t2', text: '常规备考（30-60分钟）', points: 5, done: false, date: '' },
    { id: 'ct-t3', text: '整理学习笔记', points: 6, done: false, date: '' },
    { id: 'ct-t4', text: '专项练习', points: 8, done: false, date: '' },
    { id: 'ct-t5', text: '阶段目标达成（一次性）', points: 18, done: false, date: '' }
  ],
  homeorg: [
    { id: 'hm-t1', text: '局部小整理', points: 3, done: false, date: '' },
    { id: 'hm-t2', text: '单空间完整整理', points: 6, done: false, date: '' },
    { id: 'hm-t3', text: '整理并录入物品库存', points: 7, done: false, date: '' },
    { id: 'hm-t4', text: '全屋系统性收纳（一次性）', points: 20, done: false, date: '' }
  ],
  music: [
    { id: 'mu-t1', text: '聆听鉴赏（约15分钟）', points: 2, done: false, date: '' },
    { id: 'mu-t2', text: '练习（20-40分钟）', points: 5, done: false, date: '' },
    { id: 'mu-t3', text: '练习感受笔记', points: 4, done: false, date: '' },
    { id: 'mu-t4', text: '练熟一首曲目（一次性）', points: 14, done: false, date: '' }
  ],
};

// v9255：旧默认任务 id（v9253 初版）。迁移时若用户仍是这些旧默认则整体替换为新 spec；否则保留自定义并补全缺失项。
const SLOW_OLD_DEFAULT_IDS = {
  photography: ['ph-t1', 'ph-t2', 'ph-t3'],
  cert: ['ct-t1', 'ct-t2'],
  homeorg: ['hm-t1', 'hm-t2'],
  music: ['mu-t1', 'mu-t2'],
};

const DEFAULT_PHOTOGRAPHY = {
  enabled: false,
  goal: '',
  tasks: JSON.parse(JSON.stringify(SLOW_SPEC_TASKS.photography)),
  records: [],   // 作品记录库 {id,title,img,tag,date,note}
  favorites: [], // 审美素材收藏 {id,title,category,note,date}
  checkin: {},   // { date: {done,content,minutes} }
  log: {}
};

const DEFAULT_CERT = {
  enabled: false,
  goal: { name: '', deadline: '' },
  tasks: JSON.parse(JSON.stringify(SLOW_SPEC_TASKS.cert)),
  records: [],   // 资料笔记库 {id,title,content,date}
  checkin: {},   // { date: {done,content,minutes} }
  log: {}
};

const DEFAULT_HOMEORG = {
  enabled: false,
  goal: '',
  tasks: JSON.parse(JSON.stringify(SLOW_SPEC_TASKS.homeorg)),
  records: [],   // 物品库存 {id,name,qty,buyDate,expiry}
  notes: [],     // 整理心得 {id,text,date}
  checkin: {},   // { date: {done,area,minutes} }
  log: {}
};


const DEFAULT_MUSIC = {
  enabled: false,
  goal: '',
  tasks: JSON.parse(JSON.stringify(SLOW_SPEC_TASKS.music)),
  records: [],   // 曲目记录库 {id,name,note,date}
  favorites: [], // 鉴赏收藏 {id,name,artist,note,date}
  checkin: {},   // { date: {done,content,minutes} }
  log: {}
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
  calf: 37,
  // v9206：今日身体数据（轻量记录）
  sleep: 7,
  spirit: '',
  steps: 0
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
  ingredients: loadIngredients(),
  ingredientLogs: loadIngredientLogs(),
  ingredientFilter: 'all',
  healthHabits: loadJSON('xenos-health-habits', {}), // { dateKey: [{id,text,points,done}] }
  dietWater: loadJSON('xenos-diet-water', {}), // { dateKey: cups }
  dietPlan: loadJSON('xenos-diet-plan', {}), // { breakfast, lunch, dinner, treat }
  sleepLogs: loadJSON('xenos-sleep-logs', {}), // { dateKey: { duration, quality, note } }
  moodLogs: loadJSON('xenos-mood-logs', {}), // { dateKey: { mood, note } }
  conditionLogs: loadJSON('xenos-condition-logs', {}), // { dateKey: { items: [], note } }
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
  bookNotes: loadBookNotes(),
  bookPlans: loadBookPlans(),
  bookInsights: loadBookInsights(),
  historyNotes: loadHistoryNotes(),
  language: loadLanguage(),
  englishCheckin: loadEnglishCheckin(),
  videoEdit: loadVideoEdit(),
  modeling: loadModeling(),
  travel: loadTravel(),
  social: loadSocial(),
  skincare: loadSkincare(),
  order: loadOrder(),
  growth: loadGrowth(),
  reviewDate: null,
  contentTab: 'hot',
  contentStyle: '',
  viewDate: '',
  domainTagFilter: {},
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
    redeemed,
    version: 1
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
// v10：修复旅行/社交 actions 因历史 bug 误入的重复条目——按 text 去重并保留已完成状态；toggle handler 仅做状态切换，禁止 push 新条目
const SCHEMA_VERSION = 10;

// 全局交互规则：勾选 toggle 仅做「状态切换」——禁止调用 push 误增条目。
// 列表是固定列表，新增只能来自用户点击页面内的「+」按钮；render 函数渲染前对 actions 按 text 去重，兜底防止历史污染数据继续显示重复。
function dedupeActionsByText(list) {
  if (!Array.isArray(list)) return [];
  const seen = new Map();
  list.forEach(a => {
    if (!a || typeof a.text !== 'string' || !a.text) return;
    const prev = seen.get(a.text);
    if (!prev) { seen.set(a.text, a); return; }
    if (a.done && !prev.done) seen.set(a.text, a);
    else if (a.done && prev.done && (a.date || '') > (prev.date || '')) seen.set(a.text, a);
  });
  return Array.from(seen.values());
}

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

function loadRewards() {
  const r = loadJSON('xenos-rewards', null);
  if (!r || !Array.isArray(r.items)) {
    return { items: JSON.parse(JSON.stringify(DEFAULT_REWARDS)), redeemed: [], version: 1 };
  }
  // v9151：奖励兑换积分统一 ×10
  if (!r.version || r.version < 1) {
    r.items.forEach(item => { item.cost = Math.round((item.cost || 0) * 10); });
    (r.redeemed || []).forEach(x => { x.cost = Math.round((x.cost || 0) * 10); });
    r.version = 1;
    saveJSON('xenos-rewards', r);
  }
  return { items: r.items, redeemed: Array.isArray(r.redeemed) ? r.redeemed : [], version: 1 };
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
    // 健康领域：饮食记录已独立为「工具/资产」入口，不再作为每日打卡任务
    if (cfg.key === 'health') {
      d.tasks = d.tasks.filter(t => !/饮食记录|三餐规律记录/.test(t.text));
    }
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

  // v9176：初始化低精力旅行 / 社交模块（幂等：仅当不存在时补默认值）
  if (!state.travel) { state.travel = JSON.parse(JSON.stringify(DEFAULT_TRAVEL)); saveTravel(); }
  if (!state.social) { state.social = JSON.parse(JSON.stringify(DEFAULT_SOCIAL)); saveSocial(); }
  // v9194：初始化生活秩序 / 内在成长模块（幂等）
  if (!state.order) { state.order = JSON.parse(JSON.stringify(DEFAULT_ORDER)); saveOrder(); }
  if (!state.growth) { state.growth = JSON.parse(JSON.stringify(DEFAULT_GROWTH)); saveGrowth(); }
  // v9253：暂时放缓 6 模块（幂等初始化 + 补全缺省字段）
  const slowDefs = {
    photography: [loadPhotography, savePhotography, DEFAULT_PHOTOGRAPHY],
    cert: [loadCert, saveCert, DEFAULT_CERT],
    homeorg: [loadHomeOrg, saveHomeOrg, DEFAULT_HOMEORG],
    music: [loadMusic, saveMusic, DEFAULT_MUSIC],
  };
  Object.keys(slowDefs).forEach(k => {
    const [, saveFn, def] = slowDefs[k];
    if (!state[k] || typeof state[k] !== 'object') state[k] = JSON.parse(JSON.stringify(def));
    Object.keys(def).forEach(f => {
      const dv = def[f];
      if (Array.isArray(dv)) { if (!Array.isArray(state[k][f])) state[k][f] = []; }
      else if (dv && typeof dv === 'object') { if (!state[k][f] || typeof state[k][f] !== 'object' || Array.isArray(state[k][f])) state[k][f] = JSON.parse(JSON.stringify(dv)); }
      else if (typeof state[k][f] === 'undefined') state[k][f] = dv;
    });
    if (typeof state[k].enabled !== 'boolean') state[k].enabled = false;
    // v9255：用指定积分的默认任务替换旧的默认任务
    // 仅当仍是旧默认 id（或为空）时整体替换；用户已自定义则保留并补全 spec 中缺失的新任务
    const spec = SLOW_SPEC_TASKS[k];
    if (spec) {
      const cur = state[k].tasks || (state[k].tasks = []);
      const curIds = cur.map(t => t.id);
      const oldIds = SLOW_OLD_DEFAULT_IDS[k] || [];
      const isOld = oldIds.length > 0 && curIds.length > 0 && curIds.every(id => oldIds.includes(id));
      if (cur.length === 0 || isOld) {
        state[k].tasks = JSON.parse(JSON.stringify(spec));
      } else {
        spec.forEach(t => { if (!cur.find(x => x.id === t.id)) cur.push(JSON.parse(JSON.stringify(t))); });
      }
    }
    saveFn();
  });
  // v9208：生活秩序/内在成长默认任务调整 + 清理旧任务
  if (state.order) {
    const orderRename = {
      '7:30 前起床': '9:00 起床',
      '23:30 前放下手机': '12:00 前放下手机'
    };
    const orderRemove = [/感恩小事/];
    ['morning', 'evening'].forEach(k => {
      if (!Array.isArray(state.order[k])) state.order[k] = [];
      state.order[k] = state.order[k].filter(t => !orderRemove.some(r => r.test(t.text)));
      state.order[k].forEach(t => { if (orderRename[t.text]) t.text = orderRename[t.text]; });
    });
    // 补齐新默认项（如 6:30 起床），保留用户自定义项
    DEFAULT_ORDER.morning.forEach(def => {
      if (!state.order.morning.find(t => t.text === def.text)) {
        state.order.morning.push({ ...JSON.parse(JSON.stringify(def)), id: uid('lo-am') });
      }
    });
    DEFAULT_ORDER.evening.forEach(def => {
      if (!state.order.evening.find(t => t.text === def.text)) {
        state.order.evening.push({ ...JSON.parse(JSON.stringify(def)), id: uid('lo-pm') });
      }
    });
    saveOrder();
  }
  if (state.growth && Array.isArray(state.growth.awareness)) {
    state.growth.awareness = state.growth.awareness.filter(t => !/写下\s*3\s*件感恩小事|感恩小事/.test(t.text));
    DEFAULT_GROWTH.awareness.forEach(def => {
      if (!state.growth.awareness.find(t => t.text === def.text)) {
        state.growth.awareness.push({ ...JSON.parse(JSON.stringify(def)), id: uid('ig') });
      }
    });
    saveGrowth();
  }
  // v9177：旅行模块升级为分阶段结构；旧扁平结构（无 phases）迁移，尽量保留已录入内容
  if (state.travel && !state.travel.phases) {
    const old = state.travel;
    const fresh = JSON.parse(JSON.stringify(DEFAULT_TRAVEL));
    if (Array.isArray(old.places)) {
      fresh.phases.adapt.places = old.places.map(p => ({
        id: p.id || uid('tp'),
        name: p.name || '未命名',
        note: p.note || '',
        points: 0,
        status: p.status || '待规划'
      }));
    }
    if (Array.isArray(old.inspirations)) {
      fresh.phases.adapt.discoveries = old.inspirations
        .filter(i => i.done && i.text)
        .map(i => ({ id: uid('td'), text: i.text }));
    }
    fresh.log = old.log || {};
    state.travel = fresh;
    saveTravel();
  }
  // v9178：旅行体验新增「地点打卡」分类清单（幂等：缺失则补默认，并补齐缺失的默认分类）
  if (state.travel) {
    if (!state.travel.checkin || !Array.isArray(state.travel.checkin.categories)) {
      state.travel.checkin = JSON.parse(JSON.stringify(DEFAULT_TRAVEL.checkin));
      saveTravel();
    } else {
      const defCats = JSON.parse(JSON.stringify(DEFAULT_TRAVEL.checkin.categories));
      let added = false;
      defCats.forEach(dc => {
        if (!state.travel.checkin.categories.find(c => c.id === dc.id)) {
          state.travel.checkin.categories.push(dc);
          added = true;
        }
      });
      if (added) saveTravel();
    }
  }
  // v10：修复旅行/社交模块 actions 因历史误操作写入的复制条目——按 text 去重并保留已完成状态
  if (state.travel && state.travel.phases) {
    let touched = false;
    Object.keys(state.travel.phases).forEach(pk => {
      const ph = state.travel.phases[pk];
      if (!ph || !Array.isArray(ph.actions)) return;
      const before = ph.actions.length;
      ph.actions = dedupeActionsByText(ph.actions);
      if (ph.actions.length !== before) touched = true;
    });
    if (touched) saveTravel();
  }
  if (state.social && Array.isArray(state.social.actions)) {
    const before = state.social.actions.length;
    state.social.actions = dedupeActionsByText(state.social.actions);
    if (state.social.actions.length !== before) saveSocial();
  }

  // v9200：从本月主线标签池中移除 睡眠/自媒体/锻炼/生活，并同步清理已选主线
  if (state.settings) {
    let settingsTouched = false;
    if (Array.isArray(state.settings.focusOptions)) {
      const before = state.settings.focusOptions.length;
      state.settings.focusOptions = state.settings.focusOptions.filter(o => !REMOVED_FOCUS_LABELS.includes(o));
      if (state.settings.focusOptions.length !== before) settingsTouched = true;
    }
    if (Array.isArray(state.settings.monthlyFocus)) {
      const before = state.settings.monthlyFocus.length;
      state.settings.monthlyFocus = state.settings.monthlyFocus.filter(o => !REMOVED_FOCUS_LABELS.includes(o));
      if (state.settings.monthlyFocus.length !== before) settingsTouched = true;
    }
    // v9285：清理 v9283 已删除的 烹饪美食/志愿公益 残留（用户老数据中的 long-term 慢模块已不可点开）
    const REMOVED_SLOW_NAMES = ['烹饪美食', '志愿公益'];
    if (Array.isArray(state.settings.slowBranches)) {
      const before = state.settings.slowBranches.length;
      state.settings.slowBranches = state.settings.slowBranches.filter(s => !REMOVED_SLOW_NAMES.includes(s.name));
      if (state.settings.slowBranches.length !== before) settingsTouched = true;
    }
    if (Array.isArray(state.settings.slowPool)) {
      const before = state.settings.slowPool.length;
      state.settings.slowPool = state.settings.slowPool.filter(s => !REMOVED_SLOW_NAMES.includes(s.name));
      if (state.settings.slowPool.length !== before) settingsTouched = true;
    }
    if (settingsTouched) saveSettings();
  }
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
function loadBookNotes() { return loadJSON('xenos-book-notes', []); }
function saveBookNotes() { saveJSON('xenos-book-notes', state.bookNotes); }
function loadBookPlans() { return loadJSON('xenos-book-plans', []); }
function saveBookPlans() { saveJSON('xenos-book-plans', state.bookPlans); }
function loadBookInsights() { return loadJSON('xenos-book-insights', []); }
function saveBookInsights() { saveJSON('xenos-book-insights', state.bookInsights); }

const normHistRecord = r => ({
  id: r && r.id ? r.id : uid('hr'),
  era: r && r.era ? r.era : '',
  title: r && r.title ? r.title : '',
  date: r && r.date ? r.date : '',
  bg: r && r.bg ? r.bg : '',
  event: r && r.event ? r.event : '',
  people: r && r.people ? r.people : '',
  cause: r && r.cause ? r.cause : '',
  impact: r && r.impact ? r.impact : '',
  thought: r && r.thought ? r.thought : ''
});

function loadHistoryNotes() {
  const raw = loadJSON('xenos-history', null);
  if (Array.isArray(raw)) {
    // 旧版：扁平笔记数组 → 迁移为带专题的对象
    return {
      topics: [{ id: uid('ht'), name: '通史', records: raw.map(n => normHistRecord({
        id: n.id, era: n.era, title: n.title, date: n.date, event: n.note
      })) }],
      reviews: []
    };
  }
  if (raw && typeof raw === 'object') {
    const topics = Array.isArray(raw.topics) ? raw.topics.map(t => ({
      id: t && t.id ? t.id : uid('ht'),
      name: t && t.name ? t.name : '未命名',
      records: Array.isArray(t.records) ? t.records.map(normHistRecord) : []
    })) : [];
    const reviews = Array.isArray(raw.reviews) ? raw.reviews.map(r => ({
      id: r && r.id ? r.id : uid('hv'),
      title: r && r.title ? r.title : '',
      content: r && r.content ? r.content : ''
    })) : [];
    return { topics, reviews };
  }
  return { topics: [], reviews: [] };
}
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
    const totalDays = Math.max(1, Math.round((end - start) / 86400000) + 1);
    let pct = 0, active = false, past = false;
    // v9275：基于实际打卡进度（用户某天若有勾选任务则算打卡日）
    let checkedDays = 0;
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const k = dateStr(d);
      const ed = state.englishCheckin.history && state.englishCheckin.history[k];
      if (ed) {
        const tasks = ed.tasks || {};
        const weekly = ed.weekly || {};
        if (Object.keys(tasks).some(kk => tasks[kk] && tasks[kk].done) || Object.keys(weekly).some(kk => weekly[kk] && weekly[kk].done)) {
          checkedDays++;
        }
      }
    }
    pct = Math.min(100, Math.round((checkedDays / totalDays) * 100));
    // v9297：pct 始终基于实际打卡日，不再因时间已过强制 100%；只标记 past/active 状态
    if (month < s.startMonth) { past = false; active = false; }
    else if (month > s.endMonth) { past = true; }
    else { active = true; }
    return { ...s, pct, active, past, checkedDays, totalDays };
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
  let stages = [
    { id: uid('vs'), name: '零基础入门', courses: [] },
    { id: uid('vs'), name: '基础实操', courses: [] },
    { id: uid('vs'), name: '进阶技巧', courses: [] },
    { id: uid('vs'), name: '商业接单', courses: [] }
  ];
  let plans = [], notes = [], studyCount = 0;
  if (v && typeof v === 'object') {
    if (Array.isArray(v.stages) && v.stages.length) {
      stages = v.stages.map(s => ({ id: s.id || uid('vs'), name: s.name || '阶段', courses: Array.isArray(s.courses) ? s.courses : [] }));
    } else if (Array.isArray(v.projects) && v.projects.length) {
      stages[1].courses = v.projects.map(p => ({
        id: p.id || uid('vc'), title: p.title || '', desc: [p.tool, p.note].filter(Boolean).join(' · '),
        difficulty: '', link: '', done: p.status === 'done'
      }));
    }
    plans = Array.isArray(v.plans) ? v.plans : plans;
    notes = Array.isArray(v.notes) ? v.notes.map(n => (n && typeof n === 'object') ? n : { id: uid('vn'), kind: '素材', content: String(n || ''), link: '' }) : notes;
    studyCount = v.studyCount || 0;
  }
  return { stages, plans, notes, studyCount };
}
function saveVideoEdit() { saveJSON('xenos-video-edit', state.videoEdit); }

function loadModeling() {
  const m = loadJSON('xenos-3d', null);
  let stages = [
    { id: uid('ms'), name: '软件熟悉入门', courses: [] },
    { id: uid('ms'), name: '基础建模', courses: [] },
    { id: uid('ms'), name: '材质渲染', courses: [] },
    { id: uid('ms'), name: '案例实战', courses: [] }
  ];
  let goals = [], notes = [];
  if (m && typeof m === 'object') {
    if (Array.isArray(m.stages) && m.stages.length) {
      stages = m.stages.map(s => ({ id: s.id || uid('ms'), name: s.name || '阶段', courses: Array.isArray(s.courses) ? s.courses : [] }));
    } else if (Array.isArray(m.works) && m.works.length) {
      stages[1].courses = m.works.map(w => ({
        id: w.id || uid('mc'), title: w.title || '', desc: [w.soft, w.note].filter(Boolean).join(' · '),
        difficulty: '', link: '', done: false
      }));
    }
    goals = Array.isArray(m.goals) ? m.goals : goals;
    notes = Array.isArray(m.notes) ? m.notes.map(n => (n && typeof n === 'object') ? n : { id: uid('mn'), kind: '知识点', content: String(n || ''), link: '' }) : notes;
  }
  return { stages, goals, notes };
}
function saveModeling() { saveJSON('xenos-3d', state.modeling); }

function loadTravel() { return loadJSON('xenos-travel', JSON.parse(JSON.stringify(DEFAULT_TRAVEL))); }
function saveTravel() { saveJSON('xenos-travel', state.travel); }
function loadSocial() { return loadJSON('xenos-social', JSON.parse(JSON.stringify(DEFAULT_SOCIAL))); }
function saveSocial() { saveJSON('xenos-social', state.social); }
function loadSkincare() { return loadJSON('xenos-skincare', JSON.parse(JSON.stringify(DEFAULT_SKINCARE))); }
function saveSkincare() { saveJSON('xenos-skincare', state.skincare); }
function loadOrder() { return loadJSON('xenos-order', JSON.parse(JSON.stringify(DEFAULT_ORDER))); }
function saveOrder() { saveJSON('xenos-order', state.order); }
function loadGrowth() { return loadJSON('xenos-growth', JSON.parse(JSON.stringify(DEFAULT_GROWTH))); }
function saveGrowth() { saveJSON('xenos-growth', state.growth); }

// v9253：暂时放缓 6 模块的读写
function loadPhotography() { return loadJSON('xenos-photography', JSON.parse(JSON.stringify(DEFAULT_PHOTOGRAPHY))); }
function savePhotography() { saveJSON('xenos-photography', state.photography); }
function loadCert() { return loadJSON('xenos-cert', JSON.parse(JSON.stringify(DEFAULT_CERT))); }
function saveCert() { saveJSON('xenos-cert', state.cert); }
function loadHomeOrg() { return loadJSON('xenos-homeorg', JSON.parse(JSON.stringify(DEFAULT_HOMEORG))); }
function saveHomeOrg() { saveJSON('xenos-homeorg', state.homeorg); }
function loadMusic() { return loadJSON('xenos-music', JSON.parse(JSON.stringify(DEFAULT_MUSIC))); }
function saveMusic() { saveJSON('xenos-music', state.music); }
function loadGroups() {
  try {
    const raw = localStorage.getItem('xenos-groups');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.version === SCHEMA_VERSION && Array.isArray(parsed.data)) {
      // v9176：人生领域分组移除 旅行体验 / 社交拓展 侧边栏入口
      // v9291：移除 每日计划 / 本周洞察 / 我的支线 / 书籍阅读 / 学习成长（仅删侧边栏导航，页面本体保留）
      const removed = new Set(['历史', '内容素材库', '旅行体验', '社交拓展', '每日计划', '本周洞察', '我的支线', '书籍阅读', '学习成长']);
      parsed.data.forEach(g => {
        if (Array.isArray(g.items)) {
          g.items = g.items.filter(i => !removed.has(i.name));
        }
      });
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

function loadIngredients() {
  try {
    const data = localStorage.getItem('xenos-ingredients');
    return data ? JSON.parse(data) : [];
  } catch (e) {
    return [];
  }
}

function saveIngredients() {
  localStorage.setItem('xenos-ingredients', JSON.stringify(state.ingredients));
}

function loadIngredientLogs() {
  try {
    const data = localStorage.getItem('xenos-ingredient-logs');
    return data ? JSON.parse(data) : [];
  } catch (e) {
    return [];
  }
}

function saveIngredientLogs() {
  localStorage.setItem('xenos-ingredient-logs', JSON.stringify(state.ingredientLogs));
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

function hasActivityOn(dateKey) {
  if (state.checkins[dateKey]) return true;
  const plans = dateKey === getTodayKey() ? state.plans : (state.planHistory[dateKey] || []);
  if (Array.isArray(plans) && plans.some(p => p.done)) return true;
  if (state.domains) {
    for (const key of Object.keys(state.domains)) {
      const log = (state.domains[key] || {}).log || {};
      if (Number(log[dateKey]) > 0) return true;
      const hist = ((state.domainHistory[dateKey] || {})[key] || {}).tasks || [];
      if (hist.some(t => t.done)) return true;
    }
  }
  const focusLog = (state.focus || {}).log || {};
  if (Number(focusLog[dateKey]) > 0) return true;
  return false;
}

function calcActiveStreak() {
  let streak = 0;
  const d = new Date();
  while (hasActivityOn(dateStr(d))) {
    streak++;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}

function renderStreak() {
  // v9270: 顶栏已恢复原始样式，不再展示 streak 文字（用户反馈）
  return;
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

function accountDelta(t, acc) {
  const sign = acc.debt ? -1 : 1;
  const amt = Number(t.amount) || 0;
  return sign * (t.type === 'income' ? amt : -amt);
}
function accountEffectiveAmount(acc) {
  if (!acc) return 0;
  const baseDate = acc.balanceDate || '1970-01-01';
  const base = Number(acc.balance) || Number(acc.amount) || 0;
  const delta = (state.transactions || []).reduce((s, t) => {
    if (t.accountId !== acc.id) return s;
    if ((t.date || '') < baseDate) return s;
    return s + accountDelta(t, acc);
  }, 0);
  return base + delta;
}
function calcAssetTotal() {
  return (state.assetAccounts || []).reduce((s, a) => s + accountEffectiveAmount(a), 0);
}
function syncAssetAmounts() {
  (state.assetAccounts || []).forEach(acc => { acc.amount = accountEffectiveAmount(acc); });
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

function ensurePlanGroup(group) {
  if (!group || state.planGroups.includes(group)) return;
  state.planGroups.push(group);
  savePlanGroups();
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

// 全局规则 2：同一类提醒每周最多提示 1 次，避免重复刷屏。
// key 相同且仍在同一个自然周内时，后续调用会被忽略。
const _weeklyNotified = {};
function notifyOncePerWeek(key, msg) {
  const wk = getWeekStart(0);
  if (_weeklyNotified[key] === wk) return;
  _weeklyNotified[key] = wk;
  toast(msg);
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
// 滚动位置记忆：按页面名保存 content.scrollTop，返回时恢复（手势/箭头返回均生效）
const scrollMemory = {};
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

// 多字段弹窗：fields = [{ key, label, value, type? }]，返回 {key: value} 或 null
function openMultiInput(title, fields) {
  const old = document.getElementById('multi-input-modal');
  if (old) old.remove();
  const overlay = document.createElement('div');
  overlay.className = 'modal xn-modal';
  overlay.id = 'multi-input-modal';
  overlay.innerHTML = `
    <div class="modal-card xn-picker-card">
      <div class="xn-picker-head">
        <h3 class="xn-picker-title">${escapeHTML(title)}</h3>
        <button class="xn-picker-close" id="mi-close" aria-label="关闭">✕</button>
      </div>
      <div class="xn-picker-body">
        ${(fields || []).map(f => `<label class="xn-field-label">${escapeHTML(f.label || f.key)}</label><input type="${f.type || 'number'}" id="mi-${f.key}" class="small-input" value="${f.value != null ? escapeHTML(String(f.value)) : ''}" placeholder="${escapeHTML(f.placeholder || '')}">`).join('')}
      </div>
      <div class="xn-modal-actions">
        <button class="xn-btn xn-btn-ghost" id="mi-cancel">取消</button>
        <button class="xn-btn xn-btn-primary" id="mi-ok">保存</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add('active'));
  const close = () => { overlay.classList.remove('active'); setTimeout(() => overlay.remove(), 150); };
  return new Promise((resolve) => {
    const finish = () => {
      const out = {};
      (fields || []).forEach(f => { out[f.key] = overlay.querySelector('#mi-' + f.key).value.trim(); });
      close();
      resolve(out);
    };
    overlay.querySelector('#mi-close').onclick = () => { close(); resolve(null); };
    overlay.querySelector('#mi-cancel').onclick = () => { close(); resolve(null); };
    overlay.onclick = (e) => { if (e.target === overlay) { close(); resolve(null); } };
    overlay.querySelector('#mi-ok').onclick = finish;
  });
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

// ---- 统一风格弹窗（替代原生 alert / confirm） ----
let confirmResolve = null;
let alertResolve = null;
let pickerResolve = null;
let pickerCurrentValue = null;

function appConfirm(msg, opts = {}) {
  const modal = document.getElementById('app-confirm-modal');
  const titleEl = document.getElementById('app-confirm-title');
  const msgEl = document.getElementById('app-confirm-msg');
  const iconEl = document.getElementById('app-confirm-icon');
  const okBtn = document.getElementById('app-confirm-ok');
  const cancelBtn = document.getElementById('app-confirm-cancel');
  titleEl.textContent = opts.title || '确认';
  msgEl.textContent = msg;
  iconEl.textContent = opts.icon || '🐰';
  okBtn.textContent = opts.okText || '确定';
  cancelBtn.textContent = opts.cancelText || '取消';
  okBtn.className = 'xn-btn ' + (opts.danger ? 'xn-btn-danger' : 'xn-btn-primary');
  modal.classList.add('active');
  return new Promise((resolve) => {
    confirmResolve = resolve;
    const onOk = () => finish(true);
    const onCancel = () => finish(false);
    const onKey = (e) => {
      if (e.key === 'Enter') onOk();
      if (e.key === 'Escape') onCancel();
    };
    function finish(v) {
      modal.classList.remove('active');
      document.removeEventListener('keydown', onKey);
      okBtn.onclick = null;
      cancelBtn.onclick = null;
      modal.onclick = null;
      confirmResolve = null;
      resolve(v);
    }
    okBtn.onclick = onOk;
    cancelBtn.onclick = onCancel;
    modal.onclick = (e) => { if (e.target === modal) onCancel(); };
    document.addEventListener('keydown', onKey);
  });
}

function appAlert(msg, opts = {}) {
  const modal = document.getElementById('app-alert-modal');
  const titleEl = document.getElementById('app-alert-title');
  const msgEl = document.getElementById('app-alert-msg');
  const iconEl = document.getElementById('app-alert-icon');
  const okBtn = document.getElementById('app-alert-ok');
  titleEl.textContent = opts.title || '提示';
  msgEl.textContent = msg;
  iconEl.textContent = opts.icon || '🐰';
  okBtn.textContent = opts.okText || '知道啦';
  modal.classList.add('active');
  return new Promise((resolve) => {
    alertResolve = resolve;
    const onOk = () => finish();
    const onKey = (e) => { if (e.key === 'Enter' || e.key === 'Escape') onOk(); };
    function finish() {
      modal.classList.remove('active');
      document.removeEventListener('keydown', onKey);
      okBtn.onclick = null;
      modal.onclick = null;
      alertResolve = null;
      resolve();
    }
    okBtn.onclick = onOk;
    modal.onclick = (e) => { if (e.target === modal) onOk(); };
    document.addEventListener('keydown', onKey);
  });
}

function pickCategory(opts = {}) {
  const modal = document.getElementById('category-picker-modal');
  const titleEl = document.getElementById('category-picker-title');
  const body = document.getElementById('category-picker-body');
  const okBtn = document.getElementById('category-picker-ok');
  const cancelBtn = document.getElementById('category-picker-cancel');
  const closeBtn = document.getElementById('category-picker-close');
  const items = opts.items || [];
  const initial = opts.value || (items[0] && items[0].value) || '';
  pickerCurrentValue = initial;
  titleEl.textContent = opts.title || '选择分类';
  okBtn.textContent = opts.okText || '确定';
  cancelBtn.textContent = opts.cancelText || '取消';
  body.innerHTML = items.map(it => `
    <label class="xn-picker-item" data-value="${escapeHtml(it.value)}">
      <span class="cat-icon">${it.icon || icon('box', 16)}</span>
      <span class="cat-name">${escapeHtml(it.label || it.value)}</span>
      <input type="radio" name="xn-cat" value="${escapeHtml(it.value)}" ${it.value === initial ? 'checked' : ''}>
    </label>
  `).join('');
  body.querySelectorAll('input[name="xn-cat"]').forEach(radio => {
    radio.addEventListener('change', () => { pickerCurrentValue = radio.value; });
  });
  modal.classList.add('active');
  return new Promise((resolve) => {
    pickerResolve = resolve;
    const onOk = () => finish(pickerCurrentValue);
    const onCancel = () => finish(null);
    const onKey = (e) => {
      if (e.key === 'Enter') onOk();
      if (e.key === 'Escape') onCancel();
    };
    function finish(v) {
      modal.classList.remove('active');
      document.removeEventListener('keydown', onKey);
      okBtn.onclick = null;
      cancelBtn.onclick = null;
      closeBtn.onclick = null;
      modal.onclick = null;
      pickerResolve = null;
      resolve(v);
    }
    okBtn.onclick = onOk;
    cancelBtn.onclick = onCancel;
    closeBtn.onclick = onCancel;
    modal.onclick = (e) => { if (e.target === modal) onCancel(); };
    document.addEventListener('keydown', onKey);
  });
}

function escapeHtml(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

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
const topbarBack = document.getElementById('topbar-back');
if (topbarBack) topbarBack.addEventListener('click', () => goBack());
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
  // 页面内已有统一返回控件时，隐藏顶栏箭头，避免同一屏出现两个返回按钮
  if (topbar) topbar.classList.toggle('has-page-back', !!(content && content.querySelector('.xn-back-btn')));
  // 首页、设置等顶层入口不需要顶栏返回箭头
  const hideTopbarBackPages = ['工作台首页', '设置'];
  if (topbarBack) topbarBack.style.display = hideTopbarBackPages.includes(state.activeItem) ? 'none' : '';
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
        <svg class="group-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>
        <span class="group-icon">${renderItemIcon(group.icon, 14)}</span>
        <span class="group-name">${group.name}</span>
        <span class="group-actions">
          <button class="icon-action" data-action="edit-group" title="重命名分组"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
          <button class="icon-action delete" data-action="delete-group" title="删除分组"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>
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
          <button class="icon-action" data-action="edit-item" title="重命名"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
          <button class="icon-action delete" data-action="delete-item" title="删除"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>
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
    if (await appConfirm(`确定删除分组「${group.name}」吗？`)) {
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
    if (await appConfirm(`确定删除「${item.name}」吗？`)) {
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
  const fromPage = state.activeItem;
  if (!skipHistory && fromPage && fromPage !== name) {
    state.navStack.push(fromPage);
    if (state.navStack.length > 50) state.navStack.shift();
    // 同步浏览器历史（每层内部页面对应一条虚拟历史条目）：
    // 使系统级边缘右滑 / Android 返回键 / iOS 边缘滑动触发的 popstate 能映射为内部返回，
    // 而不是直接退出网页。PWA standalone 下无浏览器手势，由 initSwipeBack() 负责。
    try { history.pushState({ xenos: 1 }, ''); } catch (err) { /* 隐私模式等异常忽略 */ }
  }
  // 离开当前页前，记住滚动位置（仅当确实切换了页面）
  if (fromPage && fromPage !== name) scrollMemory[fromPage] = content.scrollTop;
  state.activeItem = name;
  stopClock();
  renderMenu();
  renderContent();
  renderMobileTabs();
  updateBottomNav();
  renderTopbar();
  // 滚动位置记忆：恢复到目标页面离开时的停留位置；首次进入则停在顶部。
  // 同页重渲染（fromPage===name）不改动滚动位置。
  if (fromPage !== name) {
    const targetTop = scrollMemory[name] || 0;
    content.scrollTop = targetTop;
    // 异步布局（图片/字体加载导致高度变化）后再校准一次，避免被顶部钳制
    requestAnimationFrame(() => { content.scrollTop = targetTop; });
  }
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

// 全局返回：回到导航栈上一个页面（左上角箭头 / JS 手势 / 系统返回统一入口）
let lastBackAt = 0;
function goBack() {
  if (!state.navStack.length) return;
  const now = Date.now();
  // 防双触发：JS 手势与浏览器系统手势（popstate）可能在同一次滑动中先后到达
  if (now - lastBackAt < 350) return;
  lastBackAt = now;
  if (history.state && history.state.xenos) {
    // 浏览器历史中存在我们的虚拟条目：回退浏览器历史，
    // 由 popstate 统一完成内部返回，保证「浏览器历史条目数 ↔ navStack 深度」同步
    history.back();
  } else {
    finishBack();
  }
}
function finishBack() {
  if (!state.navStack.length) return;
  lastBackAt = Date.now(); // 任何返回路径（箭头/JS 手势/popstate）都刷新时间锁，防同一次滑动手势双返回
  const prev = state.navStack.pop();
  selectItem(prev, true);
}
// 系统返回通道：浏览器左边缘右滑 / Android 返回键 / iOS 边缘滑动
// 全部统一为「内部返回一层」，而非退出网页；navStack 为空（首页）时放行让浏览器正常退出
window.addEventListener('popstate', (e) => {
  // v9258.1：修复 navStack 深度≥2 时 history.back() 落到中间虚拟条目（e.state={xenos:1}）
  // 被误判为「前进」而忽略 → 返回键要点多次才响应。只要内部还有可返回页面就执行返回。
  if (!state.navStack.length) return;   // 无内部页面可返回 → 允许浏览器正常退出
  finishBack();
});

// ---------- 左边缘右滑返回手势 ----------
// 仅从屏幕最左边缘向右滑动触发返回；不干扰页面内部横向滚动区域；左滑不做功能。
function initSwipeBack() {
  if (!content) return;
  const EDGE = 24;        // 仅屏幕左边缘 24px 内触发
  const MOVE_START = 8;   // 判定方向的起始位移
  const COMMIT = 64;      // 松手提交返回的位移阈值
  const MAX_PULL = 280;   // 拖拽视觉最大位移
  let startX = 0, startY = 0, startT = 0, page = null, tracking = false, decided = false, axis = null;

  // 目标是否处于可横向滚动的容器内（避免与内部横向滑动冲突）
  function inHorizontalScroller(el) {
    let n = el;
    while (n && n !== document.body) {
      const s = getComputedStyle(n);
      if ((s.overflowX === 'auto' || s.overflowX === 'scroll') && n.scrollWidth > n.clientWidth + 1) return true;
      n = n.parentElement;
    }
    return false;
  }
  // 有弹层/模态打开时不拦截（让弹层自身处理手势）
  function modalOpen() {
    return !!document.querySelector('.modal.active, .modal-overlay.active, .insp-sheet-overlay, .xn-modal, .mascot-overlay');
  }
  function clearDrag() {
    if (page) { page.style.transition = ''; page.style.transform = ''; page.style.opacity = ''; }
    page = null;
  }

  content.addEventListener('touchstart', (e) => {
    if (e.touches.length !== 1) return;
    if (!state.navStack.length) return;        // 没有可返回的页面
    if (modalOpen()) return;                    // 弹层打开时不拦截
    const t = e.touches[0];
    if (t.clientX > EDGE) return;               // 仅最左边缘
    if (inHorizontalScroller(e.target)) return; // 横向滚动区域不冲突
    startX = t.clientX; startY = t.clientY; startT = Date.now();
    tracking = true; decided = false; axis = null;
    page = content.querySelector('.page');
  }, { passive: true });

  content.addEventListener('touchmove', (e) => {
    if (!tracking) return;
    const t = e.touches[0];
    const dx = t.clientX - startX;
    const dy = t.clientY - startY;
    if (!decided) {
      if (Math.abs(dx) < MOVE_START && Math.abs(dy) < MOVE_START) return;
      decided = true;
      axis = Math.abs(dx) > Math.abs(dy) ? 'h' : 'v';
      if (axis === 'v') { tracking = false; return; } // 纵向滚动，交给页面
    }
    if (axis !== 'h') return;
    const move = Math.max(0, dx);               // 仅处理向右滑动（返回），左滑无功能
    e.preventDefault();                          // 阻止纵向滚动
    if (page) {
      page.style.transition = 'none';
      page.style.transform = 'translateX(' + Math.min(move, MAX_PULL) + 'px)';
      page.style.opacity = String(1 - Math.min(move, MAX_PULL) / 700);
    }
  }, { passive: false });

  function endGesture(e) {
    if (!tracking) return;
    tracking = false;
    const t = e.changedTouches ? e.changedTouches[0] : null;
    const dx = t ? t.clientX - startX : 0;
    const dt = Date.now() - startT;
    const flick = dt < 250 && dx > 40;   // 快速右滑（轻扫）也提交返回
    if (axis === 'h' && (dx >= COMMIT || flick)) {
      // 提交返回：先让页面滑出，再导航
      if (page) {
        page.style.transition = 'transform .22s ease, opacity .22s ease';
        page.style.transform = 'translateX(100%)';
        page.style.opacity = '0';
      }
      setTimeout(goBack, 150);
    } else if (page) {
      // 未达阈值：回弹归位
      page.style.transition = 'transform .22s ease, opacity .22s ease';
      page.style.transform = '';
      page.style.opacity = '';
      setTimeout(clearDrag, 240);
    }
    axis = null;
  }
  content.addEventListener('touchend', endGesture);
  content.addEventListener('touchcancel', endGesture);
}

// 页面路由表：菜单项名称 -> 渲染函数
const PAGE_ROUTES = {
  '工作台首页': renderOverview,
  '每日计划': renderDailyReview,
  '本周洞察': renderInsightPage,
  '奖励池': renderRewards,
  '成就殿堂': renderAchievements,
  '系统面板': renderSystemPanel,
  '碎碎念': renderMemos,
  '自我介绍': renderSelfIntro,
  '设置': renderSettingsPage,
  '我的支线': renderBranchesPage,
  '记账': renderMoney,
  '学习成长': renderStudyPage,
  '项目计划': renderProjectPage,
  '生活秩序': renderLifeOrderPage,
  '内在成长': renderInnerGrowthPage,
  '旅行体验': renderTravelPage,
  '地点打卡': renderTravelCheckinPage,
  '社交拓展': renderSocialPage,
  '护肤': renderSkincarePage,
  // v9253：暂时放缓 6 模块（从「我的支线 → 暂时放缓」卡片进入）
  '摄影审美': renderPhotographyPage,
  '技能考证': renderCertPage,
  '家居整理': renderHomeOrgPage,
  '音乐练习': renderMusicPage,
  // 成长提升（书籍阅读/历史/视频剪辑/3D建模 为懒加载模块，见 LAZY_PAGES）
  // 保留的功能页（由领域页的工具入口跳转）
  '每日计划': renderDailyPlan,
  '健康': renderHealthPage,
  '饮食': renderDiet,
  '健身': renderFitness,
  '睡眠管理': renderSleepPage,
  '今日心境': renderMoodPage,
  '身体小状况': renderBodyConditionPage,
  '记账存钱': renderMoney
};

// ==================== v9261 懒加载模块 ====================
// 大页面拆到 modules/*.js 按需加载，加快首屏；加载完成后回调注册路由。
const LAZY_PAGES = {
  '内容素材库': { file: 'modules/contentlib.js' },
  '书籍阅读': { file: 'modules/study.js' },
  '历史': { file: 'modules/study.js' },
  '视频剪辑': { file: 'modules/study.js' },
  '3D建模': { file: 'modules/study.js' }
};
const _lazyLoaded = {};
const _lazyFailed = {};
window.__xenosRegisterRoutes = (map) => { Object.assign(PAGE_ROUTES, map); };
function loadLazyPage(name, cb) {
  const cfg = LAZY_PAGES[name];
  if (!cfg) { if (cb) cb(); return; }
  if (_lazyLoaded[name]) { if (cb) cb(); return; }
  const s = document.createElement('script');
  s.src = cfg.file + '?v=261';
  s.onload = () => { _lazyLoaded[name] = true; if (cb) cb(); };
  s.onerror = () => { _lazyFailed[name] = true; if (cb) cb(); };
  document.head.appendChild(s);
}

// 功能子页 -> 返回目标（这些页面由领域页/系统面板跳转进来）
const SUB_PAGE_PARENT = {
  '每日计划': '工作台首页',
  '饮食': '健康',
  '健身': '健康',
  '睡眠管理': '健康',
  '今日心境': '健康',
  '身体小状况': '健康',
  '记账存钱': '金钱',
  '地点打卡': '旅行体验',
  // v9253：暂时放缓 6 模块，返回「我的支线」
  '摄影审美': '我的支线',
  '技能考证': '我的支线',
  '家居整理': '我的支线',
  '音乐练习': '我的支线',
};

// ---------- 全局统一返回控件（v9248） ----------
// 所有页面顶部返回箭头统一走这套：圆形外框 + 1px 左向箭头，行为统一为「返回上一级」。
// 约定：带 .xn-back-btn 的按钮由下面 initGlobalBackButtons() 统一接管，
// 不再各自绑定 data-go / data-action，彻底消除「点了没反应」的假按钮。
const BACK_ARROW_SVG = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>';

// 无导航历史（直接打开/深链进入）时的兜底上级页面
const PAGE_BACK_FALLBACK = {
  '工作台首页': '',
  '我的支线': '工作台首页',
  '本周洞察': '工作台首页',
  '自我介绍': '工作台首页',
  '设置': '工作台首页',
  '每日计划': '工作台首页',
  '饮食': '健康',
  '健身': '健康',
  '睡眠管理': '健康',
  '今日心境': '健康',
  '身体小状况': '健康',
  '记账存钱': '记账',
  '地点打卡': '旅行体验',
  // v9253：暂时放缓 6 模块兜底返回「我的支线」
  '摄影审美': '我的支线',
  '技能考证': '我的支线',
  '家居整理': '我的支线',
  '音乐练习': '我的支线',
  '健康': '工作台首页',
  '记账': '工作台首页',
  '学习成长': '工作台首页',
  '项目计划': '工作台首页',
  '生活秩序': '工作台首页',
  '内在成长': '工作台首页',
  '护肤': '工作台首页',
  '书籍阅读': '学习成长',
  '历史': '学习成长',
  '视频剪辑': '学习成长',
  '3D建模': '学习成长'
};

// 不需要返回按钮的顶层页面（底部导航四个主标签页 + 首页）
const BACK_ROOT_PAGES = new Set(['工作台首页', '我的支线', '本周洞察', '自我介绍']);

// 生成统一返回按钮；fallback 为无历史时的兜底页面名
function backButtonHTML(fallback) {
  const fb = fallback ? ` data-back-fallback="${escapeHTML(fallback)}"` : '';
  return `<button class="sub-back-btn xn-back-btn" type="button" aria-label="返回"${fb}>${BACK_ARROW_SVG}</button>`;
}

// 生成「返回 + 标题」的页面头部
function backHeadHTML(title, fallback) {
  return `<div class="sub-page-head xn-page-head">${backButtonHTML(fallback)}<h3 class="sub-title">${title}</h3></div>`;
}

// 统一行为：有导航历史 → 回上一级（并恢复其滚动位置）；无历史 → 兜底页面
function handleBackButton(fallback) {
  if (state.navStack.length) { goBack(); return; }
  if (fallback) { selectItem(fallback); return; }
  selectItem('工作台首页');
}

// 事件委托：任何 .xn-back-btn 都生效（含后续动态渲染的页面）
function initGlobalBackButtons() {
  if (!content) return;
  content.addEventListener('click', (e) => {
    const btn = e.target.closest('.xn-back-btn');
    if (!btn) return;
    handleBackButton(btn.dataset.backFallback || '');
  });
}

// 兜底注入：页面渲染后若仍没有统一返回控件，自动补上（禁止任何页面缺失返回键）
const BACK_HEAD_SELECTORS = ['.sub-page-head', '.br-page-head', '.domain-head', '.module-hero'];
function ensureBackControl() {
  if (!content) return;
  const page = state.activeItem;
  if (BACK_ROOT_PAGES.has(page)) return;
  if (content.querySelector('.xn-back-btn')) return;
  const fallback = SUB_PAGE_PARENT[page] || PAGE_BACK_FALLBACK[page] || '工作台首页';
  // 页面已有标题行 → 只补返回按钮（避免出现重复标题）
  let host = null;
  for (let i = 0; i < BACK_HEAD_SELECTORS.length; i++) {
    host = content.querySelector(BACK_HEAD_SELECTORS[i]);
    if (host) break;
  }
  if (host) {
    host.insertAdjacentHTML('afterbegin', backButtonHTML(fallback));
    return;
  }
  // 页面自身已有标题 → 把返回按钮插到该标题前，避免重复标题
  const heading = content.querySelector('h1, h2, h3, h4');
  if (heading && heading.parentElement) {
    heading.insertAdjacentHTML('beforebegin', backButtonHTML(fallback));
    const row = heading.parentElement;
    if (row && getComputedStyle(row).display === 'block') {
      row.style.display = 'flex';
      row.style.alignItems = 'center';
      row.style.gap = '10px';
    }
    return;
  }
  // 没有标题行 → 生成标准的「返回 + 页面标题」头部
  const head = document.createElement('div');
  head.className = 'sub-page-head xn-page-head';
  head.innerHTML = backButtonHTML(fallback) + `<h3 class="sub-title">${escapeHTML(page)}</h3>`;
  content.insertBefore(head, content.firstChild);
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
    ensureBackControl();
    boldZeroPct(content);
    return;
  }

  // v9261：懒加载页面（模块未加载先显示占位，加载完成注册路由后重渲染）
  if (LAZY_PAGES[state.activeItem] && !_lazyLoaded[state.activeItem]) {
    if (_lazyFailed[state.activeItem]) {
      content.innerHTML = '<div class="content-empty"><p class="empty-note">模块加载失败，请检查网络后刷新重试</p></div>';
      ensureBackControl();
      return;
    }
    content.innerHTML = '<div class="content-empty"><p class="empty-note">正在打开…</p></div>';
    ensureBackControl();
    loadLazyPage(state.activeItem, () => { renderContent(); renderTopbar(); });
    return;
  }

  if (DOMAIN_CONFIG[state.activeItem]) {
    renderDomainPage(state.activeItem);
    ensureBackControl();
    boldZeroPct(content);
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
  ensureBackControl();
  boldZeroPct(content);
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
  if (t.includes('3d') || t.includes('建模') || t.includes('blender') || t.includes('c4d')) return '3D';
  return '日常';
}

function getPlanBadgeColor(tag) {
  const map = {
    '运动': { color: '#5A9A7F', bg: '#EAF5F0', border: '#CFE5D4' },
    '英语': { color: '#C47E3E', bg: '#FFF4E6', border: '#F9D7B4' },
    '睡眠': { color: '#6B7FA3', bg: '#EDF1F8', border: '#D1DAE8' },
    '生活': { color: '#B07A9E', bg: '#F8EEF4', border: '#EAD0E2' },
    '健康': { color: '#6E8A69', bg: '#F1F6E9', border: '#CFE5D4' },
    '阅读': { color: '#7A8F85', bg: '#F0F4F2', border: '#D1DDD7' },
    '3D': { color: '#7A8F85', bg: '#F0F4F2', border: '#D1DDD7' },
    '日常': { color: '#A99A8A', bg: '#F8F4EF', border: '#E8DDD1' }
  };
  return map[tag] || map['日常'];
}

function getPlansForDate(dateKey) {
  if (dateKey === getTodayKey()) return state.plans;
  const hist = state.planHistory[dateKey];
  if (hist && hist.length) return hist;
  // 无历史记录时，用当前计划模板作为默认（全部未完成），显示不再空白
  return state.plans.map(p => ({ id: p.id, text: p.text, group: p.group, points: p.points, done: false }));
}

function ensurePlanHistory(dateKey) {
  if (!state.planHistory[dateKey] || !state.planHistory[dateKey].length) {
    state.planHistory[dateKey] = state.plans.map(p => ({ id: p.id, text: p.text, group: p.group, points: p.points, done: false }));
  }
}

function togglePlanForDate(planId, dateKey) {
  ensurePlanHistory(dateKey);
  const item = state.planHistory[dateKey].find(p => p.id === planId);
  if (!item) return false;
  item.done = !item.done;
  savePlanHistory();
  return true;
}

function renderDailyPlan(host, embedded = false) {
  const mount = host || content;
  if (!host) content.innerHTML = '';

  const dateKey = embedded ? getTodayKey() : (state.reviewDate || getTodayKey());
  const isToday = dateKey === getTodayKey();
  if (!isToday) ensurePlanHistory(dateKey);
  const plans = isToday ? state.plans : state.planHistory[dateKey];

  const card = document.createElement('div');
  card.className = 'content-card plan-card';

  const doneCount = plans.filter(p => p.done).length;
  const total = plans.length;
  const percent = total ? Math.round((doneCount / total) * 100) : 0;
  const earnedPoints = plans.filter(p => p.done).reduce((s, p) => s + (p.points || 0), 0);
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
    ${embedded ? '' : backHeadHTML(isToday ? '当日计划' : '历史计划', '工作台首页')}
    <div class="plan-overview">
      ${progressCircle}
      <div class="plan-overview-info">
        <div class="plan-overview-stats">
          <div class="pos-stat"><span class="pos-num">${doneCount}/${total}</span><span class="pos-label">已完成</span></div>
          <div class="pos-stat"><span class="pos-num pos-points">+${earnedPoints}</span><span class="pos-label">${isToday ? '今日积分' : '当日积分'}</span></div>
        </div>
      </div>
    </div>

    ${embedded ? '' : dateBarHTML(dateKey, { id: 'plan-history-trigger' })}

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

  // 历史回顾：非嵌入模式下绑定全局统一日期组件（切换日期即刻加载该日记录）
  if (!embedded) {
    bindDateBar(card, {
      onShift: (d) => { state.reviewDate = shiftDate(dateKey, d); renderContent(); },
      onPick: (k) => { state.reviewDate = k; renderContent(); },
      onToday: () => { state.reviewDate = getTodayKey(); renderContent(); },
      max: getTodayKey()
    });
  }

  function refreshOverview() {
    const d = plans.filter(p => p.done).length;
    const t = plans.length;
    const pct = t ? Math.round((d / t) * 100) : 0;
    const ep = plans.filter(p => p.done).reduce((s, p) => s + (p.points || 0), 0);
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
    const tagStyle = getPlanBadgeColor(tag);
    li.className = 'plan-item' + (plan.done ? ' done' : '');
    li.dataset.id = plan.id;

    if (state.editingPlanId === plan.id) {
      li.innerHTML = `
        <input type="text" class="plan-item-input" value="${plan.text}">
        <input type="number" class="plan-points-input" value="${plan.points}" min="0" title="完成积分">
        <span class="plan-item-actions">
          <button class="icon-action" data-action="save-plan"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></button>
          <button class="icon-action delete" data-action="cancel-plan"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
        </span>
      `;
      const inputEdit = li.querySelector('.plan-item-input');
      inputEdit.focus();
      inputEdit.select();
    } else {
      li.innerHTML = `
        <span class="plan-check"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></span>
        <span class="plan-tag" style="color:${tagStyle.color};background:${tagStyle.bg};border-color:${tagStyle.border}">${tag}</span>
        <span class="plan-text">${plan.text}</span>
        <span class="plan-points">+${plan.points}</span>
        <span class="plan-item-actions">
          <button class="icon-action" data-action="edit-plan" title="编辑（可改积分）"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
          <button class="icon-action delete" data-action="delete-plan" title="删除"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>
        </span>
      `;
    }
  }

  function renderGroups() {
    groupsWrap.innerHTML = '';
    const tagOrder = ['运动', '英语', '睡眠', '健康', '生活', '阅读', '3D', '日常'];
    const byTag = {};
    plans.forEach(plan => {
      const tag = getPlanTag(plan.text);
      byTag[tag] = byTag[tag] || [];
      byTag[tag].push(plan);
    });
    function renderSection(tag, items) {
      const section = document.createElement('div');
      section.className = 'plan-group-section';
      section.innerHTML = `
        <div class="plan-group-title">
          <span class="plan-group-name">${tag}</span>
          <span class="plan-group-count">${items.filter(i => i.done).length}/${items.length}</span>
        </div>
        <ul class="plan-list" data-group="${tag}"></ul>
      `;
      const ul = section.querySelector('.plan-list');
      items.forEach(plan => {
        const li = document.createElement('li');
        renderPlanItemContent(li, plan);
        ul.appendChild(li);
      });
      groupsWrap.appendChild(section);
    }
    tagOrder.forEach(tag => {
      if (byTag[tag]) { renderSection(tag, byTag[tag]); delete byTag[tag]; }
    });
    Object.keys(byTag).forEach(tag => renderSection(tag, byTag[tag]));
  }

  function appendPlanItemDirect(plan) {
    const tag = getPlanTag(plan.text);
    let ul = groupsWrap.querySelector(`.plan-list[data-group="${tag}"]`);
    if (!ul) {
      renderGroups();
      ul = groupsWrap.querySelector(`.plan-list[data-group="${tag}"]`);
    }
    if (!ul) return;
    const li = document.createElement('li');
    renderPlanItemContent(li, plan);
    ul.appendChild(li);
  }

  function addPlan() {
    const text = input.value.trim();
    if (!text) return;
    const tag = getPlanTag(text);
    const plan = { id: uid('p'), text, done: false, group: tag, points: 2 };
    ensurePlanGroup(tag);
    state.plans.push(plan);
    savePlans();
    snapshotTodayPlans();
    if (!isToday) {
      ensurePlanHistory(dateKey);
      state.planHistory[dateKey].push({ ...plan });
      savePlanHistory();
    }
    input.value = '';
    appendPlanItemDirect(plan);
    refreshOverview();
    if (isToday) updateTodayCheckin();
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
        const plan = plans.find(p => p.id === li.dataset.id);
        if (plan) {
          if (isToday) {
            togglePlanDone(plan.id);
          } else {
            togglePlanForDate(plan.id, dateKey);
            renderPlanItemContent(li, plan);
            refreshOverview();
          }
        }
      }
      return;
    }

    const li = btn.closest('.plan-item');
    const planId = li.dataset.id;
    const action = btn.dataset.action;
    const plan = plans.find(p => p.id === planId);

    if (action === 'edit-plan') {
      state.editingPlanId = planId;
      renderPlanItemContent(li, plan);
    }

    if (action === 'delete-plan') {
      deletePlanById(planId);
      if (!isToday) {
        state.planHistory[dateKey] = state.planHistory[dateKey].filter(p => p.id !== planId);
        savePlanHistory();
      }
      li.remove();
      refreshOverview();
      if (isToday) updateTodayCheckin();
    }

    if (action === 'save-plan') {
      const inputEl = li.querySelector('.plan-item-input');
      const pointsEl = li.querySelector('.plan-points-input');
      const text = inputEl.value.trim();
      if (text) {
        const newGroup = getPlanTag(text);
        const np = parseInt(pointsEl.value);
        const points = isNaN(np) ? 0 : np;
        plan.text = text;
        plan.group = newGroup;
        plan.points = points;
        ensurePlanGroup(newGroup);
        const templatePlan = state.plans.find(p => p.id === planId);
        if (templatePlan) {
          templatePlan.text = text;
          templatePlan.group = newGroup;
          templatePlan.points = points;
        }
        savePlans();
        snapshotTodayPlans();
        if (!isToday) savePlanHistory();
      }
      state.editingPlanId = null;
      renderGroups();
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
  if (isToday) updateTodayCheckin();
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
    if (rate < 40) insights.push(`${g}本周记录了 ${rate}%，按自己的节奏来就好；事情多就先挑一两件最轻松的完成，剩下的随缘。`);
    else if (rate < 70) insights.push(`${g}本周完成 ${rate}%，进度稳稳的；把最顺手的那件放在精力最好的时候做就行。`);
    else insights.push(`${g}完成率 ${rate}%，保持得很好，下周可以继续这个节奏。`);
  });
  if (!insights.length) insights.push('本周数据不足，坚持记录几天后会出现个性化建议。');
  return insights;
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
        <div class="plan-overview-stats">
          <div class="pos-stat"><span class="pos-num">${doneCount}/${total}</span><span class="pos-label">已完成</span></div>
          <div class="pos-stat"><span class="pos-num pos-points">+${earnedPoints}</span><span class="pos-label">当日积分</span></div>
        </div>
      </div>
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
  const tagOrder = ['运动', '英语', '睡眠', '健康', '生活', '阅读', '3D', '日常'];
  plans.forEach(p => {
    const g = getPlanTag(p.text);
    if (!groups[g]) groups[g] = [];
    groups[g].push(p);
  });
  const renderTag = (g) => {
    if (!groups[g]) return;
    const section = document.createElement('div');
    section.className = 'plan-group-section';
    section.innerHTML = `
      <div class="plan-group-title"><span class="plan-group-name">${g}</span><span class="plan-group-count">${groups[g].filter(i => i.done).length}/${groups[g].length}</span></div>
      <ul class="plan-list"></ul>
    `;
    const ul = section.querySelector('.plan-list');
    groups[g].forEach(plan => {
      const tag = getPlanTag(plan.text);
      const tagStyle = getPlanBadgeColor(tag);
      const li = document.createElement('li');
      li.className = 'plan-item' + (plan.done ? ' done' : '');
      li.innerHTML = `
        <span class="plan-check"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></span>
        <span class="plan-tag" style="color:${tagStyle.color};background:${tagStyle.bg};border-color:${tagStyle.border}">${tag}</span>
        <span class="plan-text">${escapeHTML(plan.text)}</span>
        <span class="plan-points">+${plan.points}</span>
      `;
      ul.appendChild(li);
    });
    groupsWrap.appendChild(section);
    delete groups[g];
  };
  tagOrder.forEach(renderTag);
  Object.keys(groups).forEach(renderTag);
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

// 每日超出预算扣分：20 元以内 -3，20-50 元 -5，50-100 元 -10，100 元以上 -20
function overrunPoints(overAmount) {
  if (overAmount <= 0) return 0;
  if (overAmount <= 20) return 3;
  if (overAmount <= 50) return 5;
  if (overAmount <= 100) return 10;
  return 20;
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
        <h3 class="page-title-main">记账</h3>
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
        ${todayOver ? `今日已超预算 ¥${formatMoney(todayExpense - state.budget)}，积分 -${overrunPoints(todayExpense - state.budget)}` : (state.budget > 0 ? '今日未超预算，可获得 +1 积分' : '未设置预算，仅记录支出')}
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
            note,
            accountId: state.assetAccounts[0]?.id || 'balance'
          });
          saveTransactions();
          syncAssetAmounts();
          state.money.total = calcAssetTotal();
          saveMoney();
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
        <button class="sub-back-btn asset-back" id="asset-back" type="button" aria-label="返回">${BACK_ARROW_SVG}</button>
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
        <input type="number" class="asset-input" data-idx="${idx}" value="${formatMoney(Math.abs(accountEffectiveAmount(acc)))}" placeholder="0">
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
    const today = getTodayKey();
    overlay.querySelectorAll('.asset-input').forEach(input => {
      const idx = parseInt(input.dataset.idx);
      const val = parseFloat(input.value) || 0;
      const acc = state.assetAccounts[idx];
      acc.balance = acc.debt ? -Math.abs(val) : Math.abs(val);
      acc.balanceDate = today;
    });
    syncAssetAmounts();
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
      <span class="save-amt">¥${formatMoney(Math.abs(accountEffectiveAmount(weekAcc)))}</span>
    </div>
    <div class="save-row">
      <span>悄悄攒</span>
      <span class="save-amt">¥${formatMoney(Math.abs(accountEffectiveAmount(secretAcc)))}</span>
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
      acc.balance = (Number(acc.balance) || Number(acc.amount) || 0) + amount;
      acc.balanceDate = getTodayKey();
      syncAssetAmounts();
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
      <div class="md-title">${formatShortDate(new Date(dateKey))}</div>
      <button class="md-back-overview" id="back-cal" type="button">← 总览</button>
    </div>

    <div class="money-total-card md-card">
      <div class="mt-row" style="margin-top:0">
        <div class="mt-col"><span class="mt-col-label">支出</span><span class="mt-col-val expense">-¥${formatMoney(expense)}</span></div>
        <div class="mt-col"><span class="mt-col-label">收入</span><span class="mt-col-val income">+¥${formatMoney(income)}</span></div>
      </div>
      <div class="budget-hint ${over ? 'over' : ''}" style="margin-top:10px">
        ${over ? `超出预算 ¥${formatMoney(expense - state.budget)} · 积分 -${overrunPoints(expense - state.budget)}` : `未超预算 · 积分 +5`}
      </div>
    </div>

    <div class="section-card">
      <div class="section-header">
        <span class="section-icon">${icon('coins', 16)}</span>
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
            <button class="icon-action delete" data-action="delete-tx"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>
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
        <button class="small-input tx-category-btn" id="tx-category-btn" type="button">选择分类</button>
        <input type="hidden" id="tx-category-value">
      </div>
      <div class="tx-form" style="margin-top:8px">
        <button class="small-input tx-account-btn" id="tx-account-btn" type="button">选择账户</button>
        <input type="hidden" id="tx-account-value">
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
    syncAssetAmounts();
    state.money.total = calcAssetTotal();
    saveMoney();
    refreshMoneyView();
  });

  let curType = 'expense';
  const catBtn = card.querySelector('#tx-category-btn');
  const catValue = card.querySelector('#tx-category-value');
  const accBtn = card.querySelector('#tx-account-btn');
  const accValue = card.querySelector('#tx-account-value');
  function getCategoryList() {
    return curType === 'income' ? state.incomeCategories : state.expenseCategories;
  }
  function currentCategory() {
    return catValue.value || getCategoryList()[0]?.name || '其他';
  }
  function updateCategoryBtn() {
    catBtn.textContent = currentCategory();
    catValue.value = currentCategory();
  }
  function currentAccount() {
    return accValue.value || state.assetAccounts[0]?.id || '';
  }
  function accountName(id) {
    return state.assetAccounts.find(a => a.id === id)?.name || '余额';
  }
  function updateAccountBtn() {
    const id = currentAccount();
    accBtn.textContent = accountName(id);
    accValue.value = id;
  }
  updateCategoryBtn();
  updateAccountBtn();

  card.querySelectorAll('.txt-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      card.querySelectorAll('.txt-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      curType = btn.dataset.type;
      catValue.value = '';
      updateCategoryBtn();
    });
  });

  catBtn.addEventListener('click', async () => {
    const items = getCategoryList().map(c => ({ value: c.name, label: c.name, icon: renderItemIcon(c.icon || 'box', 16) }));
    const picked = await pickCategory({ title: `选择${curType === 'income' ? '收入' : '支出'}分类`, items, value: currentCategory() });
    if (picked) {
      catValue.value = picked;
      catBtn.textContent = picked;
    }
  });

  accBtn.addEventListener('click', async () => {
    const items = state.assetAccounts.map(a => ({ value: a.id, label: a.name, icon: renderItemIcon(a.debt ? 'creditCard' : 'wallet', 16) }));
    const picked = await pickCategory({ title: '选择支出/收入账户', items, value: currentAccount() });
    if (picked) {
      accValue.value = picked;
      accBtn.textContent = accountName(picked);
    }
  });

  card.querySelector('#tx-add-btn').addEventListener('click', async () => {
    const amount = parseFloat(card.querySelector('#tx-amount').value);
    if (isNaN(amount) || amount <= 0) {
      await appAlert('请输入有效金额');
      return;
    }
    const category = currentCategory();
    const note = card.querySelector('#tx-note').value.trim();
    state.transactions.push({
      id: uid('tx'),
      date: dateKey,
      type: curType,
      amount: Math.round(amount * 100) / 100,
      category,
      note,
      accountId: currentAccount()
    });
    saveTransactions();
    syncAssetAmounts();
    state.money.total = calcAssetTotal();
    saveMoney();
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
// ---------- 全局统一日期组件（v9252，全站唯一标准） ----------
// 任何需要「上一日 / 日期 / 下一日」的页面都必须调用 dateBarHTML() 渲染、
// bindDateBar() 绑定，禁止各页面再单独定制日期栏外观。
// 结构：左箭头 + 中间日期 pill（点击唤起日历）+ 右箭头 + 「当日」按钮（可选）。
function dateBarHTML(dateKey, opts) {
  opts = opts || {};
  const pillId = opts.id ? ` id="${opts.id}"` : '';
  const showToday = opts.showToday !== false;
  return `<div class="xn-datebar">
    <button class="xn-date-arrow" type="button" data-nav="-1" aria-label="前一天">${icon('chevronLeft', 15)}</button>
    <button class="xn-date-pill" type="button"${pillId} data-date="${dateKey}">${formatDateCN(dateKey)}</button>
    <button class="xn-date-arrow" type="button" data-nav="1" aria-label="后一天">${icon('chevronRight', 15)}</button>
    ${showToday ? `<button class="xn-date-today" type="button" data-nav="today">当日</button>` : ''}
  </div>`;
}

// handlers: { onShift(delta), onPick(dateKey), onToday(), max }
// onShift/onToday 由页面自行把日期写回 state 并重新渲染，功能逻辑保持原样。
function bindDateBar(scope, handlers) {
  const root = (typeof scope === 'string') ? document.querySelector(scope) : scope;
  if (!root) return;
  const bar = (root.classList && root.classList.contains('xn-datebar')) ? root : root.querySelector('.xn-datebar');
  if (!bar) return;
  const h = handlers || {};
  bar.querySelectorAll('[data-nav]').forEach(btn => {
    btn.addEventListener('click', () => {
      const nav = btn.dataset.nav;
      if (nav === 'today') { if (h.onToday) h.onToday(); return; }
      if (h.onShift) h.onShift(Number(nav));
    });
  });
  const pill = bar.querySelector('.xn-date-pill');
  if (pill && h.onPick) {
    pill.addEventListener('click', () => {
      openDatePicker({
        initial: pill.dataset.date || getTodayKey(),
        max: h.max || '',
        onSelect: (k) => { pill.dataset.date = k; h.onPick(k); }
      });
    });
  }
}

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
        <button class="datepicker-nav" data-dp-nav="-1" aria-label="上个月">${icon('chevronLeft', 16)}</button>
        <div class="datepicker-title" id="dp-title"></div>
        <button class="datepicker-nav" data-dp-nav="1" aria-label="下个月">${icon('chevronRight', 16)}</button>
      </div>
      <div class="datepicker-weekdays">
        <span>一</span><span>二</span><span>三</span><span>四</span><span>五</span><span>六</span><span>日</span>
      </div>
      <div class="datepicker-grid" id="dp-grid"></div>
      <div class="datepicker-actions v9272">
        <button class="dp-act dp-clear" id="dp-clear">清除</button>
        <button class="dp-act dp-cancel" id="dp-cancel">取消</button>
        <button class="dp-act dp-confirm" id="dp-set">设置</button>
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
  gridEl.addEventListener('dblclick', (e) => {
    const btn = e.target.closest('[data-dp-key]');
    if (!btn || btn.classList.contains('disabled')) return;
    selectedKey = btn.dataset.dpKey;
    render();
    if (opts.onSelect) opts.onSelect(selectedKey);
    close();
  });
  overlay.querySelector('#dp-set').addEventListener('click', () => {
    if (opts.onSelect) opts.onSelect(selectedKey);
    close();
  });
  // v9272：清除/取消/设置 三按钮
  const dpClear = overlay.querySelector('#dp-clear');
  if (dpClear) dpClear.addEventListener('click', () => { if (opts.onSelect) opts.onSelect(''); close(); });
  const dpCancel = overlay.querySelector('#dp-cancel');
  if (dpCancel) dpCancel.addEventListener('click', close);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close();
  });

  requestAnimationFrame(() => overlay.classList.add('active'));
  render();
}

// v9273：工作台独立时间选择器（不用浏览器默认；与日期选择器同款圆角底部弹层）
// opts: { initial: 'HH:MM' (24h), onSelect: function('HH:MM'|'') }
function openTimePicker(opts) {
  opts = opts || {};
  let selected = opts.initial || '08:00';
  const m = /^(\d{1,2}):(\d{2})$/.exec(selected);
  let hour = m ? parseInt(m[1], 10) : 8;
  let minute = m ? parseInt(m[2], 10) : 0;
  // 内部始终用 0-23 表示
  function fmt() { return String(hour).padStart(2, '0') + ':' + String(minute).padStart(2, '0'); }
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
  function close() { overlay.classList.remove('active'); setTimeout(() => overlay.remove(), 150); }

  const old = document.getElementById('tp-overlay');
  if (old) old.remove();

  const overlay = document.createElement('div');
  overlay.className = 'datepicker-overlay tp-overlay';
  overlay.id = 'tp-overlay';
  overlay.innerHTML = `
    <div class="datepicker-card tp-card">
      <div class="tp-display">
        <div class="tp-num" data-tp-hour>${String(hour).padStart(2, '0')}</div>
        <div class="tp-colon">:</div>
        <div class="tp-num" data-tp-min>${String(minute).padStart(2, '0')}</div>
      </div>
      <div class="tp-tabs">
        <button class="tp-tab active" data-tp-tab="hour" type="button">点</button>
        <button class="tp-tab" data-tp-tab="min" type="button">分</button>
      </div>
      <div class="tp-clock" id="tp-clock"></div>
      <div class="datepicker-actions v9272">
        <button class="dp-act dp-clear" id="tp-clear">清除</button>
        <button class="dp-act dp-cancel" id="tp-cancel">取消</button>
        <button class="dp-act dp-confirm" id="tp-set">设置</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);

  const numH = overlay.querySelector('[data-tp-hour]');
  const numM = overlay.querySelector('[data-tp-min]');
  const tabs = overlay.querySelectorAll('.tp-tab');
  let activeTab = 'hour';

  function paintClock() {
    const isHour = activeTab === 'hour';
    const total = isHour ? 24 : 60;
    const step = isHour ? 1 : 5; // 跳格显示，避免数字太密
    const radius = 42;
    const cx = 50, cy = 56;
    const displayVal = isHour ? (hour % 12) + (hour < 12 ? 0 : 0) : minute;
    const ratio = total === 24 ? (displayVal / 12) : (displayVal / 60);
    const angle = ratio * 2 * Math.PI - Math.PI / 2;
    const hx = cx + radius * Math.cos(angle);
    const hy = cy + radius * Math.sin(angle);

    // 选区高亮（以当前值为中心 ±step）
    const cells = [];
    for (let v = 0; v < total; v += step) {
      let r = (v / 60) * 2 * Math.PI - Math.PI / 2;
      const x = cx + radius * Math.cos(r);
      const y = cy + radius * Math.sin(r);
      let label = isHour ? String(v).padStart(2, '0') : String(v).padStart(2, '0');
      const active = v === displayVal;
      cells.push(`<div class="tp-cell${active ? ' on' : ''}" data-tp-v="${v}" style="left:${x.toFixed(1)}%;top:${y.toFixed(1)}%">${label}</div>`);
    }
    const hLine = `<line x1="${cx}" y1="${cy}" x2="${hx.toFixed(1)}" y2="${hy.toFixed(1)}" stroke="var(--primary)" stroke-width="2"/>`;
    const dot = `<circle cx="${hx.toFixed(1)}" cy="${hy.toFixed(1)}" r="3" fill="var(--primary)"/>`;
    overlay.querySelector('#tp-clock').innerHTML = `<svg class="tp-svg" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">${hLine}${dot}</svg>${cells.join('')}`;
  }
  function paintNums() {
    numH.textContent = String(hour).padStart(2, '0');
    numM.textContent = String(minute).padStart(2, '0');
    numH.classList.toggle('on', activeTab === 'hour');
    numM.classList.toggle('on', activeTab === 'min');
  }
  function update() { paintNums(); paintClock(); }

  tabs.forEach(t => t.addEventListener('click', () => {
    activeTab = t.dataset.tpTab;
    tabs.forEach(x => x.classList.toggle('active', x === t));
    update();
  }));
  numH.addEventListener('click', () => { activeTab = 'hour'; tabs.forEach(x => x.classList.toggle('active', x.dataset.tpTab === 'hour')); update(); });
  numM.addEventListener('click', () => { activeTab = 'min'; tabs.forEach(x => x.classList.toggle('active', x.dataset.tpTab === 'min')); update(); });
  overlay.querySelector('#tp-clock').addEventListener('click', e => {
    const cell = e.target.closest('.tp-cell');
    if (!cell) return;
    const v = parseInt(cell.dataset.tpV, 10);
    if (activeTab === 'hour') hour = clamp(v, 0, 23);
    else minute = clamp(v, 0, 59);
    update();
  });
  overlay.querySelector('#tp-set').addEventListener('click', () => { if (opts.onSelect) opts.onSelect(fmt()); close(); });
  const tpClear = overlay.querySelector('#tp-clear');
  if (tpClear) tpClear.addEventListener('click', () => { if (opts.onSelect) opts.onSelect(''); close(); });
  const tpCancel = overlay.querySelector('#tp-cancel');
  if (tpCancel) tpCancel.addEventListener('click', close);
  overlay.addEventListener('click', e => { if (e.target === overlay) close(); });

  requestAnimationFrame(() => overlay.classList.add('active'));
  update();
}

// v9274：通用日期触发器（替换浏览器默认 input type=date）
// 用法：bindDateTrigger(el, { initial, format, onSelect, onClear, max, placeholder })
//   - el 任意元素；点击唤起工作台自定义 openDatePicker 弹层
//   - 弹层选择后回填 el.dataset.date 与 el.textContent（按 format 渲染）
//   - 清除时回传 onClear('') 回调（也可不传）
function bindDateTrigger(el, opts) {
  if (!el) return;
  opts = opts || {};
  function render() {
    const v = el.dataset.date || '';
    if (opts.format) { el.textContent = v ? opts.format(v) : (opts.placeholder || '轻点选择日期'); }
    else { el.textContent = v || opts.placeholder || '轻点选择日期'; }
  }
  el.addEventListener('click', () => {
    openDatePicker({
      initial: el.dataset.date || opts.initial || getTodayKey(),
      max: opts.max || '',
      onSelect: (k) => {
        el.dataset.date = k;
        render();
        if (opts.onSelect) opts.onSelect(k);
      }
    });
  });
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
        ${title ? `<div class="body-card-header"><span class="section-title">${title}</span></div>` : ''}
        <div class="body-grid body-grid-2">
          <div class="body-cell"><span class="body-label">每日消耗大卡</span><span class="body-val">${burn.toFixed(0)} <small>kcal</small></span></div>
          <div class="body-cell"><span class="body-label">当日锻炼消耗</span><span class="body-val">${exerciseBurn.toFixed(0)} <small>kcal</small></span></div>
        </div>
      </div>
    `;
  }

  return `
    <div class="body-card" data-body-card>
      ${title ? `<div class="body-card-header"><span class="section-title">${title}</span></div>` : ''}
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
    poly.setAttribute('stroke-width', '1');
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

// ============================================================
//  健康 · 整合页（独立成页）
// ============================================================
function renderHealthPage() {
  content.innerHTML = '';
  const page = document.createElement('div');
  page.className = 'page health-page';

  const viewKey = state.viewDate || getTodayKey();
  const isToday = viewKey === getTodayKey();
  const domain = ensureDomain('health');
  normalizeDomainTasks('health');

  // 每日打卡数据源：领域任务 + 运动计划，但过滤掉「饮食记录」
  const planTasks = isToday ? state.plans.filter(p => p.group === '运动计划') : [];
  const visibleTasks = domain.tasks.filter(t => !/饮食记录|三餐规律记录/.test(t.text));
  const doneCount = visibleTasks.filter(t => t.done).length + planTasks.filter(p => p.done).length;
  const totalCount = visibleTasks.length + planTasks.length;
  const percent = totalCount ? Math.round((doneCount / totalCount) * 100) : 0;

  page.innerHTML = `
    <div class="domain-hero">
      <div class="domain-head">
        <div class="domain-icon">${icon('health', 24)}</div>
        <div>
          <h3 class="domain-title">健康</h3>
          <p class="domain-subtitle">身体是所有事情的地基</p>
        </div>
      </div>
    </div>

    ${dateBarHTML(viewKey, { id: 'health-date-trigger', showToday: !isToday })}

    <div class="stat-boxes">
      <div class="stat-box">
        <div class="stb-val">${getDomainPoints('health')}</div><div class="stb-label">累计积分</div>
      </div>
      <div class="stat-box">
        <div class="stb-val">${getDomainStreak('health')}</div><div class="stb-label">连续天数</div>
      </div>
      <div class="stat-box">
        <div class="stb-val">${percent}%</div><div class="stb-label">${isToday ? '今日进度' : viewKey.slice(5)}</div>
      </div>
    </div>

    <!-- 身体数据：仅记录体脂率 / 体重 / 目标体重，不做达成提醒（v9301：去卡片套卡片 + 取消内层重复标题） -->
    <div id="health-body-mount"></div>

    <!-- 工具入口（v9301：删「资产」字 + 5→4 张 + 重命名为饮食/运动/睡眠/健康） -->
    <div class="soft-card health-module-card">
      <div class="soft-card-title">工具</div>
      <div class="tool-grid">
        <button class="tool-btn" data-route="饮食">
          <span class="tb-icon">${icon('utensils', 18)}</span>
          <span><b>饮食</b><span class="tb-sub">食材库存管理</span></span>
          <span class="tb-arrow">${icon('chevronLeft', 12)}</span>
        </button>
        <button class="tool-btn" data-route="健身">
          <span class="tb-icon">${icon('dumbbell', 18)}</span>
          <span><b>运动</b><span class="tb-sub">运动训练</span></span>
          <span class="tb-arrow">${icon('chevronLeft', 12)}</span>
        </button>
        <button class="tool-btn" data-route="睡眠管理">
          <span class="tb-icon">${icon('moon', 18)}</span>
          <span><b>睡眠</b><span class="tb-sub">记录睡眠时长与质量</span></span>
          <span class="tb-arrow">${icon('chevronLeft', 12)}</span>
        </button>
        <button class="tool-btn" data-route="身体小状况">
          <span class="tb-icon">${icon('thermometer', 18)}</span>
          <span><b>健康</b><span class="tb-sub">轻量记录身体不适</span></span>
          <span class="tb-arrow">${icon('chevronLeft', 12)}</span>
        </button>
      </div>
    </div>

    <!-- 每日打卡：饮食记录已移除 -->
    <div class="soft-card">
      <div class="soft-card-title">${icon('check', 16)} 每日打卡${isToday ? `<span class="stitle-meta">今日 +${domain.log[viewKey] || 0} 分</span>` : ` · ${viewKey}（只读）`}</div>
      <div class="task-list" id="health-tasks"></div>
      ${isToday ? `<div class="review-datebar" style="margin-top:12px;">
        <input type="text" class="pf-input" id="health-new-task" placeholder="添加一个每日任务...">
        <input type="number" class="pf-input" id="health-new-points" value="5" style="max-width:72px;">
        <button class="gold-btn" id="health-add-task">添加任务</button>
      </div>` : '<p class="section-note">历史日期为只读快照，切换回今天可继续打卡。</p>'}
    </div>

  `;
  content.appendChild(page);

  // 日期导航：全局统一日期组件
  bindDateBar(page, {
    onShift: (d) => { state.viewDate = shiftDate(viewKey, d); renderContent(); },
    onPick: (k) => { state.viewDate = k; renderContent(); },
    onToday: () => { state.viewDate = ''; renderContent(); }
  });

  // 身体数据卡片（v9301：title 传空字符串隐藏内层重复标题）
  const bodyMount = page.querySelector('#health-body-mount');
  bodyMount.innerHTML = bodyCardHTML(state.body, '');
  bindBodyCard(bodyMount, () => renderContent());

  // 工具入口跳转
  page.querySelectorAll('[data-route]').forEach(el => {
    el.addEventListener('click', () => selectItem(el.dataset.route));
  });

  // 每日打卡渲染
  const taskList = page.querySelector('#health-tasks');
  function renderTasks() {
    taskList.innerHTML = '';
    const showTasks = visibleTasks;
    const showPlans = planTasks;
    if (!showTasks.length && !showPlans.length) {
      taskList.innerHTML = '<p class="empty-note">' + (isToday ? '还没有任务，先添加一个吧' : '这一天没有打卡记录') + '</p>';
      return;
    }
    showTasks.forEach(task => {
      const row = document.createElement('div');
      row.className = 'task-row' + (task.done ? ' done' : '');
      row.innerHTML = `
        <span class="task-check"><svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg></span>
        <span class="task-text">${escapeHTML(task.text)}</span>
        <span class="task-points">+${task.points}</span>
        ${isToday ? `<button class="item-delete" data-del-type="domain-task" data-id="${task.id}" data-domain="health" aria-label="删除"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>` : ''}
      `;
      if (isToday) {
        row.addEventListener('click', (e) => {
          if (e.target.closest('.item-delete')) return;
          // v9258.1：原位更新（不整页重绘，打卡更跟手）
          toggleDomainTask('health', task.id, {
            inPlace: true,
            onDone: () => { row.classList.toggle('done', task.done); }
          });
        });
      }
      taskList.appendChild(row);
    });
    showPlans.forEach(plan => {
      const row = document.createElement('div');
      row.className = 'task-row plan-task-row' + (plan.done ? ' done' : '');
      row.innerHTML = `
        <span class="task-check"><svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg></span>
        <span class="task-text">${escapeHTML(plan.text)}</span>
        <span class="task-points">+${plan.points}</span>
        <button class="item-delete" data-id="${plan.id}" data-del-type="plan" aria-label="删除"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>
      `;
      row.addEventListener('click', (e) => {
        if (e.target.closest('.item-delete')) return;
        togglePlanDone(plan.id);
      });
      taskList.appendChild(row);
    });
  }
  renderTasks();

  if (isToday) {
    const addTask = () => {
      const input = page.querySelector('#health-new-task');
      const ptsInput = page.querySelector('#health-new-points');
      const text = input.value.trim();
      if (!text) return;
      if (/饮食记录|三餐规律记录/.test(text)) {
        toast('饮食记录请从上方「工具 / 资产」入口跳转');
        return;
      }
      const points = Math.max(0, parseInt(ptsInput.value) || 5);
      domain.tasks.push({ id: uid('health-t'), text, points, done: false, doneDate: '' });
      saveDomains();
      input.value = '';
      renderContent();
    };
    page.querySelector('#health-add-task').addEventListener('click', addTask);
    page.querySelector('#health-new-task').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') addTask();
    });
  }
}

// ---------- 健康子页面：睡眠管理 ----------
function renderSleepPage() {
  content.innerHTML = '';
  const page = document.createElement('div');
  page.className = 'page sub-health-page';
  const viewKey = state.viewDate || getTodayKey();
  const isToday = viewKey === getTodayKey();
  const log = state.sleepLogs[viewKey] || { duration: '', quality: '', note: '' };

  page.innerHTML = `
    <div class="domain-hero">
      <div class="domain-head">
        <div class="domain-icon">${icon('moon', 24)}</div>
        <div>
          <h3 class="domain-title">睡眠管理</h3>
          <p class="domain-subtitle">只记录，不评判，睡得怎样都可以</p>
        </div>
      </div>
    </div>
    ${dateBarHTML(viewKey, { showToday: !isToday })}
    <div class="soft-card">
      <div class="soft-card-title">${icon('moon', 16)} 昨夜睡眠</div>
      <label class="pf-label" style="display:block;margin:10px 0 6px;font-size:11px;color:var(--text-muted);">睡眠时长（小时）</label>
      <input type="number" class="pf-input" id="sleep-duration" value="${log.duration}" placeholder="例如 7.5" step="0.1">
      <label class="pf-label" style="display:block;margin:14px 0 6px;font-size:11px;color:var(--text-muted);">睡眠质量</label>
      <div class="chip-group" id="sleep-quality" style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:10px;">
        ${['很好', '一般', '不好'].map(q => `<button class="chip${log.quality === q ? ' active' : ''}" data-q="${q}">${q}</button>`).join('')}
      </div>
      <label class="pf-label" style="display:block;margin:14px 0 6px;font-size:11px;color:var(--text-muted);">备注（可选）</label>
      <textarea class="pf-input" id="sleep-note" rows="2" placeholder="昨晚做了什么梦、中途是否醒来…">${escapeHTML(log.note || '')}</textarea>
      <button class="gold-btn" id="sleep-save" style="margin-top:12px;width:100%;">保存记录</button>
    </div>
    <div class="soft-card">
      <div class="soft-card-title">${icon('time', 16)} 最近 7 天</div>
      <div id="sleep-recent"></div>
    </div>
  `;
  content.appendChild(page);

  bindDateBar(page, {
    onShift: (d) => { state.viewDate = shiftDate(viewKey, d); renderContent(); },
    onPick: (k) => { state.viewDate = k; renderContent(); },
    onToday: () => { state.viewDate = ''; renderContent(); }
  });
  page.querySelectorAll('#sleep-quality .chip').forEach(btn => {
    btn.addEventListener('click', () => {
      page.querySelectorAll('#sleep-quality .chip').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });
  page.querySelector('#sleep-save').addEventListener('click', () => {
    const duration = parseFloat(page.querySelector('#sleep-duration').value) || 0;
    const quality = page.querySelector('#sleep-quality .chip.active')?.dataset.q || '';
    const note = page.querySelector('#sleep-note').value.trim();
    state.sleepLogs[viewKey] = { duration, quality, note };
    saveSleepLogs();
    toast('睡眠记录已保存');
    renderSleepRecent();
  });

  function renderSleepRecent() {
    const host = page.querySelector('#sleep-recent');
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const k = shiftDate(getTodayKey(), -i);
      const l = state.sleepLogs[k];
      if (l && (l.duration || l.quality)) days.push({ date: k, ...l });
    }
    if (!days.length) { host.innerHTML = '<p class="section-note">还没有睡眠记录。</p>'; return; }
    host.innerHTML = days.map(d => `
      <div class="module-list-item" style="cursor:default;">
        <span class="mli-text">${formatDateCN(d.date)}</span>
        <span class="mli-points">${d.duration ? d.duration + 'h' : ''} ${d.quality || ''}</span>
      </div>
    `).join('');
  }
  renderSleepRecent();
}

// ---------- 健康子页面：今日心境 ----------
function renderMoodPage() {
  content.innerHTML = '';
  const page = document.createElement('div');
  page.className = 'page sub-health-page';
  const viewKey = state.viewDate || getTodayKey();
  const isToday = viewKey === getTodayKey();
  const log = state.moodLogs[viewKey] || { mood: '', note: '' };

  page.innerHTML = `
    <div class="domain-hero">
      <div class="domain-head">
        <div class="domain-icon">${icon('smile', 24)}</div>
        <div>
          <h3 class="domain-title">今日心境</h3>
          <p class="domain-subtitle">随便选一个，不选也没关系</p>
        </div>
      </div>
    </div>
    ${dateBarHTML(viewKey, { showToday: !isToday })}
    <div class="soft-card">
      <div class="soft-card-title">${icon('smile', 16)} 此刻心情</div>
      <div class="chip-group" id="mood-opts" style="display:flex;flex-wrap:wrap;gap:8px;margin:10px 0;">
        ${['平静', '开心', '低落', '焦虑', '疲惫'].map(m => `<button class="chip${log.mood === m ? ' active' : ''}" data-m="${m}">${m}</button>`).join('')}
      </div>
      <textarea class="pf-input" id="mood-note" rows="2" placeholder="想写点什么都可以…">${escapeHTML(log.note || '')}</textarea>
      <button class="gold-btn" id="mood-save" style="margin-top:12px;width:100%;">保存记录</button>
    </div>
    <div class="soft-card">
      <div class="soft-card-title">${icon('time', 16)} 最近 7 天</div>
      <div id="mood-recent"></div>
    </div>
  `;
  content.appendChild(page);

  bindDateBar(page, {
    onShift: (d) => { state.viewDate = shiftDate(viewKey, d); renderContent(); },
    onPick: (k) => { state.viewDate = k; renderContent(); },
    onToday: () => { state.viewDate = ''; renderContent(); }
  });
  page.querySelectorAll('#mood-opts .chip').forEach(btn => {
    btn.addEventListener('click', () => {
      page.querySelectorAll('#mood-opts .chip').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });
  page.querySelector('#mood-save').addEventListener('click', () => {
    const mood = page.querySelector('#mood-opts .chip.active')?.dataset.m || '';
    const note = page.querySelector('#mood-note').value.trim();
    state.moodLogs[viewKey] = { mood, note };
    saveMoodLogs();
    toast('心境记录已保存');
    renderMoodRecent();
  });

  function renderMoodRecent() {
    const host = page.querySelector('#mood-recent');
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const k = shiftDate(getTodayKey(), -i);
      const l = state.moodLogs[k];
      if (l && (l.mood || l.note)) days.push({ date: k, ...l });
    }
    if (!days.length) { host.innerHTML = '<p class="section-note">还没有心境记录。</p>'; return; }
    host.innerHTML = days.map(d => `
      <div class="module-list-item" style="cursor:default;align-items:flex-start;">
        <span class="mli-text">${formatDateCN(d.date)}${d.mood ? ' · ' + d.mood : ''}<br><small style="color:var(--text-muted);font-weight:400;">${escapeHTML(d.note || '')}</small></span>
      </div>
    `).join('');
  }
  renderMoodRecent();
}

// ---------- 健康子页面：身体小状况 ----------
function renderBodyConditionPage() {
  content.innerHTML = '';
  const page = document.createElement('div');
  page.className = 'page sub-health-page';
  const viewKey = state.viewDate || getTodayKey();
  const isToday = viewKey === getTodayKey();
  const log = state.conditionLogs[viewKey] || { items: [], note: '' };
  const options = ['头痛', '喉咙痛', '胃痛', '腰酸背痛', '生理期', '其他'];

  page.innerHTML = `
    <div class="domain-hero">
      <div class="domain-head">
        <div class="domain-icon">${icon('thermometer', 24)}</div>
        <div>
          <h3 class="domain-title">身体小状况</h3>
          <p class="domain-subtitle">轻轻记录，不放大不适，也不过度担心</p>
        </div>
      </div>
    </div>
    ${dateBarHTML(viewKey, { showToday: !isToday })}
    <div class="soft-card">
      <div class="soft-card-title">${icon('thermometer', 16)} 今天有哪些小状况</div>
      <div class="chip-group" id="condition-opts" style="display:flex;flex-wrap:wrap;gap:8px;margin:10px 0;">
        ${options.map(opt => `<button class="chip${(log.items || []).includes(opt) ? ' active' : ''}" data-opt="${opt}">${opt}</button>`).join('')}
      </div>
      <textarea class="pf-input" id="condition-note" rows="2" placeholder="补充说明（可选）…">${escapeHTML(log.note || '')}</textarea>
      <button class="gold-btn" id="condition-save" style="margin-top:12px;width:100%;">保存记录</button>
    </div>
    <div class="soft-card">
      <div class="soft-card-title">${icon('time', 16)} 最近 7 天</div>
      <div id="condition-recent"></div>
    </div>
  `;
  content.appendChild(page);

  bindDateBar(page, {
    onShift: (d) => { state.viewDate = shiftDate(viewKey, d); renderContent(); },
    onPick: (k) => { state.viewDate = k; renderContent(); },
    onToday: () => { state.viewDate = ''; renderContent(); }
  });
  page.querySelectorAll('#condition-opts .chip').forEach(btn => {
    btn.addEventListener('click', () => btn.classList.toggle('active'));
  });
  page.querySelector('#condition-save').addEventListener('click', () => {
    const items = Array.from(page.querySelectorAll('#condition-opts .chip.active')).map(b => b.dataset.opt);
    const note = page.querySelector('#condition-note').value.trim();
    state.conditionLogs[viewKey] = { items, note };
    saveConditionLogs();
    toast('小状况记录已保存');
    renderConditionRecent();
  });

  function renderConditionRecent() {
    const host = page.querySelector('#condition-recent');
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const k = shiftDate(getTodayKey(), -i);
      const l = state.conditionLogs[k];
      if (l && ((l.items && l.items.length) || l.note)) days.push({ date: k, ...l });
    }
    if (!days.length) { host.innerHTML = '<p class="section-note">还没有身体小状况记录。</p>'; return; }
    host.innerHTML = days.map(d => `
      <div class="module-list-item" style="cursor:default;align-items:flex-start;">
        <span class="mli-text">${formatDateCN(d.date)}${d.items && d.items.length ? ' · ' + d.items.join('、') : ''}<br><small style="color:var(--text-muted);font-weight:400;">${escapeHTML(d.note || '')}</small></span>
      </div>
    `).join('');
  }
  renderConditionRecent();
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
        <span class="ex-check"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></span>
        <span class="ex-name">${plan.text}</span>
        <span class="ex-duration">${duration} 分钟</span>
        <span class="ex-kcal">${calories} kcal</span>
        <button class="item-delete" data-del-type="plan" data-id="${plan.id}" aria-label="删除"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>
      `;
      list.appendChild(row);
    });
    // 自定义运动
    todayEx.forEach((ex, idx) => {
      const row = document.createElement('div');
      row.className = 'exercise-row' + (ex.done ? ' done' : '');
      row.dataset.idx = idx;
      row.innerHTML = `
        <span class="ex-check"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></span>
        <span class="ex-name">${ex.name}</span>
        <span class="ex-duration">${ex.duration} 分钟</span>
        <span class="ex-kcal">${ex.calories} kcal</span>
        <button class="item-delete" data-del-type="exercise" data-idx="${idx}" aria-label="删除"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>
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
        <button class="icon-action delete" data-idx="${idx}" data-action="delete-video"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>
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
  videoAddBtn.addEventListener('click', async () => {
    let title = videoTitleInput.value.trim();
    let url = videoUrlInput.value.trim();
    if (!url) return;
    if (!isVideoUrlValid(url)) {
      await appAlert('请输入有效的 http/https 链接');
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

  card.querySelector('#save-measure-btn').addEventListener('click', async () => {
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
      await appAlert('请至少填写体重');
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
    clearBtn.addEventListener('click', async () => {
      if (await appConfirm('确定清空所有测量记录？此操作不可撤销。', { danger: true })) {
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
        <td><button class="measure-del" data-idx="${origIdx}" aria-label="删除"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button></td>
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

// ============================================================
//  饮食 · 整合页（v9206 方案B：独立成页，低压力轻记录）
// ============================================================
const VEG_KEYWORDS = ['蔬菜', '青菜', '西兰花', '番茄', '西红柿', '黄瓜', '沙拉', '菠菜', '生菜', '胡萝卜', '芹菜', '冬瓜', '南瓜', '菌菇', '蘑菇', '水果'];

function getTodayDietProtein(totalCalories) {
  // 轻量估算：蛋白质 ≈ 热量 × 0.075（不强制精确），仅作温和参考
  return Math.round((Number(totalCalories) || 0) * 0.075);
}

function getTodayVegServings() {
  const log = getTodayDiet();
  let count = 0;
  (log.meals || []).forEach(m => {
    (m.items || []).forEach(it => {
      const n = (it.name || '');
      if (VEG_KEYWORDS.some(k => n.includes(k))) count++;
    });
    // 单餐含蔬菜记 1 份
  });
  return count;
}

function renderDiet() {
  content.innerHTML = '';
  const card = document.createElement('div');
  card.className = 'content-card diet-page diet-flat';

  const dateKey = state.viewDate || getTodayKey();
  const isToday = dateKey === getTodayKey();
  const dt = parseDateKey(dateKey);
  const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  const dateString = `${dt.getFullYear()}年${dt.getMonth() + 1}月${dt.getDate()}日 ${weekdays[dt.getDay()]}`;

  const todayLog = getDietLog(dateKey);
  const totalCals = (todayLog.meals || []).reduce((s, m) => s + (m.items || []).reduce((is, it) => is + (Number(it.calories) || 0), 0), 0);
  const protein = getTodayDietProtein(totalCals);
  const veg = getTodayVegServings();
  const water = Number(state.dietWater[dateKey]) || 0;

  card.innerHTML = `
    <div class="domain-hero">
      <div class="domain-head">
        <div class="domain-icon">${icon('utensils', 24)}</div>
        <div>
          <h3 class="domain-title">饮食</h3>
          <p class="domain-subtitle">好好吃饭，是最朴素的照顾自己</p>
        </div>
      </div>
    </div>

    ${dateBarHTML(dateKey, { id: 'diet-date-trigger', showToday: !isToday })}

    <!-- 1. 今日饮食概览：扁平 4 统计 -->
    <section class="diet-flat-section">
      <div class="diet-flat-head">${icon('sun', 14)} 今日饮食<span class="diet-head-meta">${dateString}</span></div>
      <div class="diet-flat-stats">
        <div class="diet-flat-stat"><span class="diet-flat-stat-val">${totalCals}</span><span class="diet-flat-stat-lbl">热量 kcal</span></div>
        <div class="diet-flat-stat"><span class="diet-flat-stat-val">${protein}<small>g</small></span><span class="diet-flat-stat-lbl">蛋白质(约)</span></div>
        <div class="diet-flat-stat"><span class="diet-flat-stat-val">${veg}<small>份</small></span><span class="diet-flat-stat-lbl">蔬菜</span></div>
        <div class="diet-flat-stat diet-flat-stat-water">
          <span class="diet-flat-stat-val">${water}<small>杯</small></span>
          <span class="diet-flat-stat-lbl">饮水</span>
          ${isToday ? `<div class="diet-flat-water-btns"><button class="diet-flat-water-btn" id="water-minus" aria-label="少一杯">−</button><button class="diet-flat-water-btn" id="water-plus" aria-label="多一杯">+</button></div>` : ''}
        </div>
      </div>
    </section>

    <!-- 2. 三餐记录：扁平 4 行列表 -->
    <section class="diet-flat-section">
      <div class="diet-flat-head">${icon('note', 14)} 三餐记录</div>
      <div class="diet-flat-meals" id="meal-cards">
        ${['早餐', '午餐', '晚餐', '加餐'].map(type => {
          const meals = (todayLog.meals || []).filter(m => m.type === type);
          const cals = meals.reduce((s, m) => s + (m.items || []).reduce((is, it) => is + (Number(it.calories) || 0), 0), 0);
          const iconName = type === '早餐' ? 'sunrise' : type === '午餐' ? 'utensils' : type === '晚餐' ? 'food' : 'plus';
          return `<div class="diet-flat-meal" data-type="${type}">
            <div class="diet-flat-meal-ic">${icon(iconName, 22)}</div>
            <div class="diet-flat-meal-body">
              <div class="diet-flat-meal-name">${type}</div>
              <div class="diet-flat-meal-sub">${meals.length ? meals.length + ' 项 · ' + cals + ' kcal' : '轻点记录'}</div>
            </div>
            <button class="diet-flat-meal-add" aria-label="添加${type}">${icon('plus', 12)}</button>
          </div>`;
        }).join('')}
      </div>
    </section>

    <!-- 3. 饮食计划：扁平 3 行输入 -->
    <section class="diet-flat-section">
      <div class="diet-flat-head">${icon('clipboard', 14)} 饮食计划</div>
      <div class="diet-flat-plan">
        ${['breakfast', 'lunch', 'dinner'].map((k, i) => `<div class="diet-flat-plan-row"><span class="diet-flat-plan-lbl">${['早餐', '午餐', '晚餐'][i]}打算</span><input type="text" class="diet-flat-plan-input dp-input" data-plan="${k}" value="${escapeHTML((state.dietPlan && state.dietPlan[k]) || '')}" placeholder="想吃点什么～"></div>`).join('')}
      </div>
      <div class="diet-flat-treat-row">
        <span class="diet-flat-plan-lbl">想吃但不过量</span>
        <div class="diet-flat-treat-list" id="dp-treat-list"></div>
        ${isToday ? `<div class="diet-flat-treat-add-row"><input type="text" class="diet-flat-treat-input" id="dp-treat-input" placeholder="如 一块小蛋糕"><button class="diet-flat-treat-add-btn" id="dp-treat-add">添加</button></div>` : ''}
      </div>
      <p class="diet-flat-tip">允许吃喜欢的食物，重点是整体节奏，不是每一顿都完美。</p>
    </section>

    <!-- 4. 饮食花费：扁平两列 -->
    <section class="diet-flat-section">
      <div class="diet-flat-head">${icon('card', 14)} 饮食花费</div>
      <div class="diet-flat-cost-row">
        <div class="diet-flat-cost-item"><span class="diet-flat-cost-lbl">今日花费</span><span class="diet-flat-cost-val">¥${getDietCostForDate(dateKey).toFixed(2)}</span></div>
        <div class="diet-flat-cost-item"><span class="diet-flat-cost-lbl">本周花费</span><span class="diet-flat-cost-val">¥${getDietCostWeek(getWeekStart()).toFixed(2)}</span></div>
      </div>
      <div class="diet-flat-cost-ring" id="diet-flat-cost-ring"></div>
    </section>

    <!-- 5. 食材库存：扁平（复用现有 renderIngredientsCardInner，外部已无 soft-card） -->
    <section class="diet-flat-section">
      <div class="diet-flat-head">${icon('box', 14)} 食材库存<button class="diet-flat-ing-add-btn" id="ing-add-btn">+ 添加食材</button></div>
      <div class="ing-filter-tabs" id="ing-filter-tabs"></div>
      <div class="ing-list" id="ing-list"></div>
      <button class="ing-import-btn" id="ing-import-btn">${icon('refresh', 13)} 批量导入示例食材</button>
    </section>

    <!-- 6. 每周饮食分析 -->
    <section class="diet-flat-section">
      <div class="diet-flat-head">${icon('chart', 14)} 每周饮食分析</div>
      <div id="diet-weekly-analysis"></div>
    </section>
  `;
  content.appendChild(card);

  // 日期导航
  bindDateBar(card, {
    onShift: (d) => { state.viewDate = shiftDate(dateKey, d); renderContent(); },
    onPick: (k) => { state.viewDate = k; renderContent(); },
    onToday: () => { state.viewDate = ''; renderContent(); }
  });

  // 饮水 +/-
  const waterPlus = card.querySelector('#water-plus');
  const waterMinus = card.querySelector('#water-minus');
  if (waterPlus) {
    waterPlus.addEventListener('click', () => { state.dietWater[dateKey] = (Number(state.dietWater[dateKey]) || 0) + 1; saveDietWater(); renderContent(); });
  }
  if (waterMinus) {
    waterMinus.addEventListener('click', () => { state.dietWater[dateKey] = Math.max(0, (Number(state.dietWater[dateKey]) || 0) - 1); saveDietWater(); renderContent(); });
  }

  // 三餐记录点击
  const mealCards = card.querySelector('#meal-cards');
  async function triggerMealAdd(type) {
    const res = await openMealEntry(type);
    if (res) { addDietMeal(type, res.food, res.cost, res.ingredients); renderContent(); }
  }
  mealCards.addEventListener('click', (e) => {
    const row = e.target.closest('.diet-flat-meal');
    if (!row) return;
    triggerMealAdd(row.dataset.type);
  });

  // 饮食计划输入
  card.querySelectorAll('.dp-input').forEach(inp => {
    inp.addEventListener('change', () => {
      state.dietPlan = state.dietPlan || {};
      state.dietPlan[inp.dataset.plan] = inp.value.trim();
      saveDietPlan();
    });
  });
  // 想吃但不过量
  if (!state.dietMemos) state.dietMemos = loadDietMemos();
  const treatList = card.querySelector('#dp-treat-list');
  function renderTreatList() {
    treatList.innerHTML = '';
    if (!state.dietMemos.length) { treatList.innerHTML = '<p class="memo-empty" style="margin:0;">还没有想吃的，添加一点也无妨～</p>'; return; }
    state.dietMemos.forEach((m, idx) => {
      const row = document.createElement('span');
      row.className = 'diet-flat-treat-item';
      row.dataset.idx = idx;
      row.innerHTML = `<span>${escapeHTML(m.text)}</span><button class="diet-flat-treat-del" data-idx="${idx}" aria-label="删除"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>`;
      treatList.appendChild(row);
    });
  }
  renderTreatList();
  const treatAdd = card.querySelector('#dp-treat-add');
  if (treatAdd) {
    treatAdd.addEventListener('click', () => {
      const inp = card.querySelector('#dp-treat-input');
      const text = inp.value.trim();
      if (!text) return;
      state.dietMemos.push({ id: uid('memo'), text, done: false });
      saveDietMemos();
      inp.value = '';
      renderTreatList();
    });
  }
  treatList.addEventListener('click', (e) => {
    const del = e.target.closest('.diet-flat-treat-del');
    if (!del) return;
    state.dietMemos.splice(parseInt(del.dataset.idx), 1);
    saveDietMemos();
    renderTreatList();
  });

  // 饮食花费环形图（外卖 vs 自做 vs 其他）
  (function renderCostCharts() {
    const costCharts = card.querySelector('#diet-flat-cost-ring');
    if (!costCharts) return;
    const weekStart = getWeekStart();
    let takeout = 0, homemade = 0, other = 0;
    for (let i = 0; i < 7; i++) {
      const k = shiftDate(weekStart, i);
      (getDietLog(k).meals || []).forEach(m => {
        const c = Number(m.cost) || 0;
        if (c <= 0) return;
        const name = (m.items || []).map(it => it.name).join('');
        if (/外卖|美团|饿了么|便当|打包/.test(name)) takeout += c;
        else if (/自己|家常|做|煮|炒/.test(name)) homemade += c;
        else other += c;
      });
    }
    const total = takeout + homemade + other || 1;
    const segs = [
      { v: takeout, color: '#F0A98C', label: '外卖' },
      { v: homemade, color: '#8FBFA9', label: '自做' },
      { v: other, color: '#C9B6E0', label: '其他' }
    ];
    const R = 30, C = 2 * Math.PI * R;
    let offset = 0;
    const circles = segs.map(s => {
      const len = (s.v / total) * C;
      const el = `<circle cx="36" cy="36" r="${R}" fill="none" stroke="${s.color}" stroke-width="8" stroke-dasharray="${len} ${C - len}" stroke-dashoffset="${-offset}" transform="rotate(-90 36 36)"></circle>`;
      offset += len;
      return el;
    }).join('');
    costCharts.innerHTML = `<div class="diet-flat-cost-ring-svg"><svg viewBox="0 0 72 72" width="72" height="72">${circles}<circle cx="36" cy="36" r="20" fill="var(--bg)"/></svg><div class="diet-flat-cost-ring-center"><span>¥${getDietCostWeek(weekStart).toFixed(0)}</span><small>本周</small></div></div>
      <div class="diet-flat-cost-legend">${segs.map(s => `<span class="diet-flat-cost-leg"><i style="background:${s.color}"></i>${s.label} ¥${s.v.toFixed(0)}</span>`).join('')}</div>`;
  })();

  // 食材库存（复用既有渲染/交互，外层已无 soft-card 嵌套）
  renderIngredientsCardInner(card);
  wireIngredientCard(card);

  // 每周饮食分析（温和文案，禁用超标/不合格/需要控制）
  (function renderWeeklyAnalysis() {
    const host = card.querySelector('#diet-weekly-analysis');
    if (!host) return;
    const weekStart = getWeekStart();
    const days = [];
    for (let i = 6; i >= 0; i--) days.push(shiftDate(getTodayKey(), -i));
    const calArr = days.map(d => (getDietLog(d).meals || []).reduce((s, m) => s + (m.items || []).reduce((is, it) => is + (Number(it.calories) || 0), 0), 0));
    const mealCount = days.reduce((s, d) => s + (getDietLog(d).meals || []).length, 0);
    const takeoutCount = days.reduce((s, d) => s + (getDietLog(d).meals || []).filter(m => /外卖|美团|饿了么|便当|打包/.test((m.items || []).map(it => it.name).join(''))).length, 0);
    const homeCount = days.reduce((s, d) => s + (getDietLog(d).meals || []).filter(m => /自己|家常|做|煮|炒/.test((m.items || []).map(it => it.name).join(''))).length, 0);
    const vegDays = days.filter(d => (getDietLog(d).meals || []).some(m => (m.items || []).some(it => VEG_KEYWORDS.some(k => (it.name || '').includes(k))))).length;
    const waterDays = days.filter(d => (Number(state.dietWater[d]) || 0) > 0).length;
    const avg = Math.round(calArr.reduce((a, b) => a + b, 0) / 7);

    let note = '这一周的饮食记录完成得不错，保持轻松的节奏就好。';
    if (mealCount === 0) note = '这周还没怎么记录饮食，没关系，从下一顿开始就好，不急着一次补完。';
    else if (vegDays < 3) note = '蔬菜吃得偏少一些，下一顿可以顺手加点青菜，慢慢来，不用勉强。';
    else if (takeoutCount > homeCount * 2 && takeoutCount > 0) note = '这周外卖稍微多了点，偶尔方便就好，有空时煮一顿家常也更舒服。';
    else if (waterDays < 3) note = '饮水记录比较少，记得随手喝几口水，身体会感谢你的。';
    else note = '这周的饮食节奏挺稳的，继续按自己的步调来就好～';

    host.innerHTML = `
      <div class="diet-flat-dwa-stats">
        <div class="diet-flat-dwa-stat"><span>${mealCount}</span><small>记录次数</small></div>
        <div class="diet-flat-dwa-stat"><span>${takeoutCount}</span><small>外卖次数</small></div>
        <div class="diet-flat-dwa-stat"><span>${homeCount}</span><small>自做次数</small></div>
        <div class="diet-flat-dwa-stat"><span>${vegDays}</span><small>蔬菜天数</small></div>
        <div class="diet-flat-dwa-stat"><span>${waterDays}</span><small>饮水天数</small></div>
        <div class="diet-flat-dwa-stat"><span>${avg}</span><small>日均 kcal</small></div>
      </div>
      <div class="diet-flat-weekly-chart">${weeklyLineChart(calArr, '#E8A598', 'kcal', days.map(d => { const x = parseDateKey(d); return (x.getMonth() + 1) + '/' + x.getDate(); }))}</div>
      <div class="diet-flat-dwa-note">${icon('bulb', 14)}<span>${note}</span></div>
      <div class="diet-flat-wi">${renderWeeklyIngredientStatsFlatHTML(weekStart)}</div>
    `;
  })();
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
        <button class="icon-action delete" data-idx="${state.memos.length - 1 - idx}" data-action="delete-memo"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>
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

  const { tdee, total, gap, base } = getDietTotals();
  const today = new Date();
  const weekdays = ['周日','周一','周二','周三','周四','周五','周六'];
  const dateString = `${today.getFullYear()}年${today.getMonth()+1}月${today.getDate()}日 ${weekdays[today.getDay()]}`;

  card.innerHTML = `
    <div class="diet-overview-header">
      <div>
        <h3 class="page-title-main">饮食</h3>
        <p class="page-subtitle">${dateString}</p>
      </div>
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
          <div class="meal-card-icon">${icon('sunrise', 26)}</div>
          <div class="meal-card-name">早餐</div>
          <button class="meal-card-add">${icon('plus', 12)}</button>
        </div>
        <div class="meal-card" data-type="午餐">
          <div class="meal-card-icon">${icon('utensils', 26)}</div>
          <div class="meal-card-name">午餐</div>
          <button class="meal-card-add">${icon('plus', 12)}</button>
        </div>
        <div class="meal-card" data-type="晚餐">
          <div class="meal-card-icon">${icon('food', 26)}</div>
          <div class="meal-card-name">晚餐</div>
          <button class="meal-card-add">${icon('plus', 12)}</button>
        </div>
      </div>
      <div class="meal-extra-actions">
        <button class="text-btn" id="snack-btn">${icon('plus', 12)} 加餐</button>
        <button class="text-btn" id="photo-record-btn">${icon('image', 14)} 拍照录入</button>
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

  // ---- 饮食花费汇总 ----
  const costCard = document.createElement('div');
  costCard.className = 'content-card section-card diet-cost-card';
  const todayCost = getDietCostForDate(getTodayKey());
  const weekCost = getDietCostWeek(getWeekStart());
  costCard.innerHTML = `
    <div class="section-header">
      <span class="section-icon">${icon('card', 16)}</span>
      <span class="section-title">饮食花费</span>
    </div>
    <div class="diet-cost-grid">
      <div class="diet-cost-item"><div class="diet-cost-label">今日总开销</div><div class="diet-cost-value">¥${todayCost.toFixed(2)}</div></div>
      <div class="diet-cost-item"><div class="diet-cost-label">本周汇总</div><div class="diet-cost-value">¥${weekCost.toFixed(2)}</div></div>
    </div>
    <button class="text-btn diet-insight-link" id="diet-insight-link">查看每周食材统计 ›</button>
  `;
  content.appendChild(costCard);
  costCard.querySelector('#diet-insight-link').addEventListener('click', () => {
    const el = document.getElementById('diet-weekly-stats');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  // ---- 饮食分析 ----
  const anaCard = document.createElement('div');
  anaCard.className = 'content-card section-card diet-analysis-card';
  const todayLog = getTodayDiet();
  const mealTypes = ['早餐', '午餐', '晚餐', '加餐'];
  const mealTypeMeta = {
    '早餐': { bg: 'var(--primary-light)', color: 'var(--gold)', icon: 'sunrise' },
    '午餐': { bg: 'var(--green-light)', color: 'var(--green)', icon: 'utensils' },
    '晚餐': { bg: 'var(--pink-light)', color: 'var(--pink)', icon: 'food' },
    '加餐': { bg: 'var(--purple-light)', color: 'var(--purple)', icon: 'plus' }
  };
  const typeCalories = {};
  todayLog.meals.forEach(m => {
    const c = (m.items || []).reduce((s, it) => s + (Number(it.calories) || 0), 0);
    typeCalories[m.type] = (typeCalories[m.type] || 0) + c;
  });
  const typeItemsHTML = mealTypes.map(type => {
    const c = typeCalories[type] || 0;
    const pct = total > 0 ? Math.round(c / total * 100) : 0;
    const meta = mealTypeMeta[type];
    return `<div class="da-type"><span class="da-type-icon" style="background:${meta.bg};color:${meta.color}">${icon(meta.icon, 14)}</span><span class="da-type-name">${type}</span><span class="da-type-bar"><i style="width:${pct}%;background:${meta.color}"></i></span><span class="da-type-val">${c} <small>kcal</small></span><span class="da-type-pct">${pct}%</span></div>`;
  }).join('');

  const weekDays = [];
  for (let i = 6; i >= 0; i--) weekDays.push(shiftDate(getTodayKey(), -i));
  const weekCalories = weekDays.map(d => {
    const log = state.dietLogs[d];
    if (!log) return 0;
    return (log.meals || []).reduce((s, m) => s + (m.items || []).reduce((is, it) => is + (Number(it.calories) || 0), 0), 0);
  });
  const weekLabels = weekDays.map(d => {
    const date = parseDateKey(d);
    return (date.getMonth() + 1) + '/' + date.getDate();
  });
  const avg7 = Math.round(weekCalories.reduce((a, b) => a + b, 0) / 7);

  const suggestion = (() => {
    if (total > tdee * 1.05) return `今日摄入 ${total} kcal 已超过消耗 ${tdee} kcal，建议晚餐适当控制。`;
    if (total < base * 0.7) return `今日摄入 ${total} kcal 偏低，可适当加餐补充能量。`;
    if ((typeCalories['晚餐'] || 0) > total * 0.45) return '晚餐热量占比较高，建议把部分热量前置到午餐。';
    if ((typeCalories['早餐'] || 0) < total * 0.15 && total > 0) return '早餐摄入偏少，建议早晨多吃一点开启一天代谢。';
    if (avg7 > tdee * 1.1) return `本周日均摄入 ${avg7} kcal 偏高，注意控制总热量。`;
    return '今日饮食结构较为均衡，继续保持～';
  })();

  anaCard.innerHTML = `
    <div class="section-header">
      <span class="section-icon">${icon('chart', 16)}</span>
      <span class="section-title">饮食分析</span>
    </div>
    <div class="da-types">${typeItemsHTML}</div>
    <div class="da-chart-wrap">
      <div class="da-chart-title">近 7 天摄入趋势</div>
      ${weeklyLineChart(weekCalories, '#E8A598', 'kcal', weekLabels)}
    </div>
    <div class="da-insight">${icon('bulb', 14)}<span>${suggestion}</span></div>
  `;
  content.appendChild(anaCard);

  // ---- 食材库存管理 ----
  const ingCard = document.createElement('div');
  ingCard.className = 'content-card section-card ingredient-card';
  ingCard.innerHTML = `
    <div class="section-header">
      <span class="section-icon">${icon('box', 16)}</span>
      <span class="section-title">食材库存管理</span>
      <button class="text-btn" id="ing-add-btn">+ 添加食材</button>
    </div>
    <div class="ing-filter-tabs" id="ing-filter-tabs"></div>
    <div class="ing-list" id="ing-list"></div>
    <button class="ing-import-btn" id="ing-import-btn">${icon('refresh', 13)} 批量导入示例食材</button>
  `;
  content.appendChild(ingCard);
  renderIngredientsCardInner(ingCard);
  wireIngredientCard(ingCard);

  // ---- 每周食材统计 ----
  const statsCard = document.createElement('div');
  statsCard.className = 'content-card diet-weekly-stats';
  statsCard.id = 'diet-weekly-stats';
  statsCard.innerHTML = renderWeeklyIngredientStatsHTML(getWeekStart());
  content.appendChild(statsCard);

  // meal cards add (event delegation + per-button binding for mobile robustness)
  const mealCards = card.querySelector('#meal-cards');
  async function triggerMealAdd(type) {
    const res = await openMealEntry(type);
    if (res) {
      addDietMeal(type, res.food, res.cost, res.ingredients);
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
    const res = await openMealEntry('加餐');
    if (res) {
      addDietMeal('加餐', res.food, res.cost, res.ingredients);
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
        <span class="memo-check"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></span>
        <span class="memo-text">${m.text}</span>
        <button class="icon-action delete" data-idx="${idx}" data-action="delete-memo"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>
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

function addDietMeal(type, text, cost = 0, ingredients = []) {
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
  const dateKey = getTodayKey();
  const usedIngredients = (ingredients || []).map(it => {
    deductIngredient(it.id, it.qty, type, dateKey);
    return { id: it.id, name: it.name, unit: it.unit, qty: Number(it.qty) || 0 };
  });
  todayLog.meals.push({ id: uid('meal'), type, items: [{ name, qty, unit, calories }], cost: Number(cost) || 0, ingredients: usedIngredients });
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

function saveHealthHabits() {
  saveJSON('xenos-health-habits', state.healthHabits);
}

function saveDietWater() {
  saveJSON('xenos-diet-water', state.dietWater);
}

function saveDietPlan() {
  saveJSON('xenos-diet-plan', state.dietPlan);
}

function saveSleepLogs() {
  saveJSON('xenos-sleep-logs', state.sleepLogs);
}

function saveMoodLogs() {
  saveJSON('xenos-mood-logs', state.moodLogs);
}

function saveConditionLogs() {
  saveJSON('xenos-condition-logs', state.conditionLogs);
}

// ============ 饮食 · 食材库存 & 花费 ============
function getDietLog(key) {
  return state.dietLogs[key] || { meals: [], total: 0 };
}

function getDietCostForDate(key) {
  const log = state.dietLogs[key];
  if (!log) return 0;
  return (log.meals || []).reduce((s, m) => s + (Number(m.cost) || 0), 0);
}

function getDietCostWeek(weekStart) {
  let sum = 0;
  for (let i = 0; i < 7; i++) sum += getDietCostForDate(shiftDate(weekStart, i));
  return sum;
}

function ingredientStatus(ing) {
  if (!ing) return 'ok';
  if ((Number(ing.remaining) || 0) <= 0) return 'depleted';
  if (!ing.expiryDate) return 'ok';
  const today = getTodayKey();
  if (ing.expiryDate < today) return 'expired';
  if (ing.expiryDate <= shiftDate(today, 7)) return 'soon';
  return 'ok';
}

function deductIngredient(id, qty, mealType, dateKey) {
  const ing = state.ingredients.find(x => x.id === id);
  if (!ing) return;
  qty = Number(qty) || 0;
  if (qty <= 0) return;
  ing.remaining = Math.max(0, (Number(ing.remaining) || 0) - qty);
  state.ingredientLogs.push({
    id: uid('inglog'),
    date: dateKey || getTodayKey(),
    ingredientId: id,
    ingredientName: ing.name,
    mealType: mealType || '',
    qty: qty,
    unit: ing.unit || ''
  });
  saveIngredients();
  saveIngredientLogs();
}

function addIngredient(data) {
  state.ingredients.push({
    id: uid('ing'),
    name: (data.name || '').trim(),
    unit: data.unit || '份',
    remaining: Number(data.remaining) || 0,
    purchaseDate: data.purchaseDate || getTodayKey(),
    expiryDate: data.expiryDate || null
  });
  saveIngredients();
}

function updateIngredient(id, data) {
  const ing = state.ingredients.find(x => x.id === id);
  if (!ing) return;
  if (data.name !== undefined) ing.name = (data.name || '').trim();
  if (data.unit !== undefined) ing.unit = data.unit || '份';
  if (data.remaining !== undefined) ing.remaining = Number(data.remaining) || 0;
  if (data.purchaseDate !== undefined) ing.purchaseDate = data.purchaseDate;
  if (data.expiryDate !== undefined) ing.expiryDate = data.expiryDate || null;
  saveIngredients();
}

function deleteIngredient(id) {
  state.ingredients = state.ingredients.filter(x => x.id !== id);
  saveIngredients();
}

function getIngredientFiltered() {
  const f = state.ingredientFilter;
  if (f === 'all') return state.ingredients;
  return state.ingredients.filter(ing => ingredientStatus(ing) === f);
}

function getWeekIngredientStats(weekStart) {
  const end = shiftDate(weekStart, 6);
  const inWeek = (k) => k >= weekStart && k <= end;
  const consumedMap = {};
  state.ingredientLogs.forEach(l => {
    if (inWeek(l.date)) {
      const key = l.ingredientName + '|' + (l.unit || '');
      if (!consumedMap[key]) consumedMap[key] = { name: l.ingredientName, unit: l.unit || '', qty: 0 };
      consumedMap[key].qty += Number(l.qty) || 0;
    }
  });
  const consumed = Object.values(consumedMap).sort((a, b) => b.qty - a.qty);
  const purchased = state.ingredients.filter(ing => ing.purchaseDate && inWeek(ing.purchaseDate));
  const expiredWaste = state.ingredients.filter(ing => ing.expiryDate && inWeek(ing.expiryDate) && (Number(ing.remaining) || 0) > 0);
  const soonList = state.ingredients.filter(ing => ingredientStatus(ing) === 'soon');
  const suggestions = [];
  if (soonList.length) suggestions.push('优先消耗临期食材：' + soonList.map(i => i.name).join('、') + '（共 ' + soonList.length + ' 项）');
  if (expiredWaste.length) suggestions.push('本周有 ' + expiredWaste.length + ' 项食材过期未用完，下次采购适量减少');
  if (consumed.length) suggestions.push('本周消耗最多：' + consumed.slice(0, 3).map(c => c.name).join('、') + '，可列入下周补货');
  if (!suggestions.length) suggestions.push('本周食材记录良好，继续保持～');
  return { consumed, purchased, expiredWaste, suggestions };
}

// 三餐录入弹窗：菜品 + 花费 + 勾选库存食材（自动扣减）
function openMealEntry(type) {
  const old = document.getElementById('meal-entry-modal');
  if (old) old.remove();
  const overlay = document.createElement('div');
  overlay.className = 'modal xn-modal';
  overlay.id = 'meal-entry-modal';
  const ingRows = state.ingredients.length
    ? state.ingredients.map(ing => {
        const depleted = (Number(ing.remaining) || 0) <= 0;
        return `<label class="me-ing-row${depleted ? ' disabled' : ''}" data-id="${ing.id}" data-name="${escapeHtml(ing.name)}" data-unit="${escapeHtml(ing.unit || '份')}">
          <input type="checkbox" class="me-ing-check"${depleted ? ' disabled' : ''}>
          <span class="me-ing-name">${escapeHtml(ing.name)}</span>
          <span class="me-ing-unit">${escapeHtml(ing.unit || '份')}</span>
          <input type="number" class="me-ing-qty small-input" placeholder="用量" min="0" step="0.1" disabled>
          <span class="me-ing-left">剩 ${Number(ing.remaining) || 0}</span>
        </label>`;
      }).join('')
    : '<p class="me-ing-empty">暂无库存食材，可先在下方「食材库存」中添加</p>';
  overlay.innerHTML = `
    <div class="modal-card xn-picker-card meal-entry-card">
      <div class="xn-picker-head">
        <h3 class="xn-picker-title" id="meal-entry-title">添加${type}</h3>
        <button class="xn-picker-close" id="meal-entry-close" aria-label="关闭">✕</button>
      </div>
      <div class="xn-picker-body">
        <label class="xn-field-label">菜品（名称 + 份量，如 米饭 100g）</label>
        <input type="text" id="meal-entry-food" class="small-input" placeholder="米饭 100g">
        <label class="xn-field-label">本餐花费（元）</label>
        <input type="number" id="meal-entry-cost" class="small-input" placeholder="0" min="0" step="0.01">
        <label class="xn-field-label">消耗库存食材（勾选并填用量，自动扣减）</label>
        <div class="me-ing-list">${ingRows}</div>
      </div>
      <div class="xn-modal-actions">
        <button class="xn-btn xn-btn-ghost" id="meal-entry-cancel">取消</button>
        <button class="xn-btn xn-btn-primary" id="meal-entry-ok">添加</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add('active'));

  const foodInput = overlay.querySelector('#meal-entry-food');
  const costInput = overlay.querySelector('#meal-entry-cost');
  foodInput.focus();

  overlay.querySelectorAll('.me-ing-check').forEach(cb => {
    cb.addEventListener('change', () => {
      const row = cb.closest('.me-ing-row');
      const qty = row.querySelector('.me-ing-qty');
      qty.disabled = !cb.checked;
      if (cb.checked) qty.focus();
    });
  });

  return new Promise((resolve) => {
    let done = false;
    const close = () => { if (!done) { done = true; overlay.classList.remove('active'); setTimeout(() => overlay.remove(), 150); } };
    const finish = (val) => { done = true; overlay.classList.remove('active'); setTimeout(() => overlay.remove(), 150); resolve(val); };
    overlay.querySelector('#meal-entry-close').onclick = () => finish(null);
    overlay.querySelector('#meal-entry-cancel').onclick = () => finish(null);
    overlay.onclick = (e) => { if (e.target === overlay) finish(null); };
    overlay.querySelector('#meal-entry-ok').onclick = () => {
      const food = foodInput.value.trim();
      if (!food) { foodInput.focus(); return; }
      const cost = parseFloat(costInput.value) || 0;
      const ingredients = [];
      overlay.querySelectorAll('.me-ing-row').forEach(row => {
        const cb = row.querySelector('.me-ing-check');
        if (cb.checked) {
          const qty = parseFloat(row.querySelector('.me-ing-qty').value) || 0;
          ingredients.push({ id: row.dataset.id, name: row.dataset.name, unit: row.dataset.unit, qty });
        }
      });
      finish({ food, cost, ingredients });
    };
    foodInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') overlay.querySelector('#meal-entry-ok').click(); });
  });
}

// 食材录入 / 编辑弹窗
function openIngredientModal(editId) {
  const old = document.getElementById('ing-edit-modal');
  if (old) old.remove();
  const editing = editId ? state.ingredients.find(x => x.id === editId) : null;
  const overlay = document.createElement('div');
  overlay.className = 'modal xn-modal';
  overlay.id = 'ing-edit-modal';
  overlay.innerHTML = `
    <div class="modal-card xn-picker-card">
      <div class="xn-picker-head">
        <h3 class="xn-picker-title">${editing ? '编辑食材' : '添加食材'}</h3>
        <button class="xn-picker-close" id="ing-edit-close" aria-label="关闭">✕</button>
      </div>
      <div class="xn-picker-body">
        <label class="xn-field-label">食材名称</label>
        <input type="text" id="ing-name" class="small-input" placeholder="如 鸡蛋" value="${editing ? escapeHtml(editing.name) : ''}">
        <div class="ing-form-grid">
          <div><label class="xn-field-label">单位</label><input type="text" id="ing-unit" class="small-input" placeholder="份/个/g" value="${editing ? escapeHtml(editing.unit || '份') : '份'}"></div>
          <div><label class="xn-field-label">剩余数量</label><input type="number" id="ing-remaining" class="small-input" placeholder="0" min="0" step="0.1" value="${editing ? (Number(editing.remaining) || 0) : ''}"></div>
        </div>
        <div class="ing-form-grid">
          <div><label class="xn-field-label">购买日期</label><button class="ing-date-btn" id="ing-purchase" data-field="purchase">${editing && editing.purchaseDate ? editing.purchaseDate : '选择日期'}</button></div>
          <div><label class="xn-field-label">过期日期</label><button class="ing-date-btn" id="ing-expiry" data-field="expiry">${editing && editing.expiryDate ? editing.expiryDate : '选择日期（可选）'}</button></div>
        </div>
      </div>
      <div class="xn-modal-actions">
        <button class="xn-btn xn-btn-ghost" id="ing-edit-cancel">取消</button>
        <button class="xn-btn xn-btn-primary" id="ing-edit-ok">${editing ? '保存' : '添加'}</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add('active'));

  const data = { name: '', unit: '份', remaining: 0, purchaseDate: editing ? (editing.purchaseDate || getTodayKey()) : getTodayKey(), expiryDate: editing ? (editing.expiryDate || null) : null };
  if (editing) { data.name = editing.name; data.remaining = Number(editing.remaining) || 0; }

  const nameInput = overlay.querySelector('#ing-name');
  const unitInput = overlay.querySelector('#ing-unit');
  const remInput = overlay.querySelector('#ing-remaining');
  const purchaseBtn = overlay.querySelector('#ing-purchase');
  const expiryBtn = overlay.querySelector('#ing-expiry');
  nameInput.focus();

  purchaseBtn.onclick = () => openDatePicker({ initial: data.purchaseDate || getTodayKey(), max: getTodayKey(), onSelect: (k) => { data.purchaseDate = k; purchaseBtn.textContent = k; } });
  expiryBtn.onclick = () => openDatePicker({ initial: data.expiryDate || getTodayKey(), onSelect: (k) => { data.expiryDate = k; expiryBtn.textContent = k; }, onClear: () => { data.expiryDate = null; expiryBtn.textContent = '选择日期（可选）'; } });

  return new Promise((resolve) => {
    const close = () => { overlay.classList.remove('active'); setTimeout(() => overlay.remove(), 150); };
    const finish = (val) => { close(); resolve(val); };
    overlay.querySelector('#ing-edit-close').onclick = () => finish(null);
    overlay.querySelector('#ing-edit-cancel').onclick = () => finish(null);
    overlay.onclick = (e) => { if (e.target === overlay) finish(null); };
    overlay.querySelector('#ing-edit-ok').onclick = () => {
      const name = nameInput.value.trim();
      if (!name) { nameInput.focus(); return; }
      data.name = name;
      data.unit = unitInput.value.trim() || '份';
      data.remaining = parseFloat(remInput.value) || 0;
      if (editing) updateIngredient(editing.id, data);
      else addIngredient(data);
      finish(true);
    };
  });
}

// 食材详情弹窗
function openIngredientDetail(id) {
  const ing = state.ingredients.find(x => x.id === id);
  if (!ing) return;
  const old = document.getElementById('ing-detail-modal');
  if (old) old.remove();
  const st = ingredientStatus(ing);
  const stText = { ok: '正常', soon: '即将过期', expired: '已过期', depleted: '已耗尽' }[st];
  const usedThisWeek = state.ingredientLogs.filter(l => l.ingredientId === id && l.date >= getWeekStart() && l.date <= shiftDate(getWeekStart(), 6));
  const usedTotal = usedThisWeek.reduce((s, l) => s + (Number(l.qty) || 0), 0);
  const overlay = document.createElement('div');
  overlay.className = 'modal xn-modal';
  overlay.id = 'ing-detail-modal';
  overlay.innerHTML = `
    <div class="modal-card xn-picker-card">
      <div class="xn-picker-head">
        <h3 class="xn-picker-title">${escapeHtml(ing.name)}</h3>
        <button class="xn-picker-close" id="ing-detail-close" aria-label="关闭">✕</button>
      </div>
      <div class="xn-picker-body">
        <div class="ing-detail-status status-${st}">${stText}</div>
        <div class="ing-detail-grid">
          <div><span>剩余数量</span><b>${Number(ing.remaining) || 0} ${escapeHtml(ing.unit || '份')}</b></div>
          <div><span>购买日期</span><b>${ing.purchaseDate || '—'}</b></div>
          <div><span>过期日期</span><b>${ing.expiryDate || '未设置'}</b></div>
          <div><span>本周已用</span><b>${usedTotal} ${escapeHtml(ing.unit || '份')}</b></div>
        </div>
        ${usedThisWeek.length ? '<div class="ing-detail-log"><div class="ing-detail-log-title">本周消耗记录</div>' + usedThisWeek.map(l => `<div class="ing-detail-log-row"><span>${l.date}</span><span>${l.mealType || '餐'} · ${l.qty} ${escapeHtml(l.unit || '')}</span></div>`).join('') + '</div>' : ''}
      </div>
      <div class="xn-modal-actions">
        <button class="xn-btn xn-btn-ghost" id="ing-detail-edit">编辑</button>
        <button class="xn-btn xn-btn-danger" id="ing-detail-del">删除</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add('active'));
  overlay.querySelector('#ing-detail-close').onclick = () => { overlay.classList.remove('active'); setTimeout(() => overlay.remove(), 150); };
  overlay.onclick = (e) => { if (e.target === overlay) { overlay.classList.remove('active'); setTimeout(() => overlay.remove(), 150); } };
  overlay.querySelector('#ing-detail-edit').onclick = async () => { overlay.remove(); const ok = await openIngredientModal(id); if (ok) renderDiet(); };
  overlay.querySelector('#ing-detail-del').onclick = async () => {
    overlay.remove();
    const sure = await appConfirm('确定删除「' + ing.name + '」？此操作不可撤销。', { danger: true, okText: '删除', cancelText: '取消' });
    if (sure) { deleteIngredient(id); renderDiet(); }
  };
}

function renderIngredientsCardInner(card) {
  const list = getIngredientFiltered();
  const counts = { all: state.ingredients.length, soon: state.ingredients.filter(i => ingredientStatus(i) === 'soon').length, expired: state.ingredients.filter(i => ingredientStatus(i) === 'expired').length, depleted: state.ingredients.filter(i => ingredientStatus(i) === 'depleted').length };
  const filterBtns = [['all', '全部'], ['soon', '即将过期'], ['expired', '已过期'], ['depleted', '已耗尽']].map(([k, label]) => `<button class="ing-filter-btn${state.ingredientFilter === k ? ' active' : ''}" data-filter="${k}">${label}<span class="ing-filter-count">${counts[k]}</span></button>`).join('');
  const rows = list.length ? list.map(ing => {
    const st = ingredientStatus(ing);
    const tag = st === 'soon' ? '<span class="ing-tag tag-soon">即将过期</span>' : st === 'expired' ? '<span class="ing-tag tag-expired">已过期</span>' : st === 'depleted' ? '<span class="ing-tag tag-depleted">已耗尽</span>' : '';
    return `<div class="ing-row${st === 'depleted' || st === 'expired' ? ' dim' : ''}" data-id="${ing.id}">
      <div class="ing-info">
        <div class="ing-name-row"><span class="ing-name">${escapeHtml(ing.name)}</span>${tag}</div>
        <div class="ing-meta">剩 ${Number(ing.remaining) || 0} ${escapeHtml(ing.unit || '份')} · 购 ${ing.purchaseDate || '—'}${ing.expiryDate ? ' · 期 ' + ing.expiryDate : ''}</div>
      </div>
      <div class="ing-actions">
        <button class="icon-action" data-act="ing-minus" data-id="${ing.id}" title="减 1">−</button>
        <button class="icon-action" data-act="ing-edit" data-id="${ing.id}" title="编辑">${icon('edit', 13)}</button>
        <button class="icon-action delete" data-act="ing-del" data-id="${ing.id}" title="删除">${icon('delete', 13)}</button>
      </div>
    </div>`;
  }).join('') : '<p class="memo-empty">库存为空，点击下方「添加食材」开始记录吧</p>';
  card.querySelector('#ing-filter-tabs').innerHTML = filterBtns;
  card.querySelector('#ing-list').innerHTML = rows;
}

function wireIngredientCard(card) {
  card.querySelector('#ing-filter-tabs').addEventListener('click', (e) => {
    const btn = e.target.closest('.ing-filter-btn');
    if (!btn) return;
    state.ingredientFilter = btn.dataset.filter;
    renderIngredientsCardInner(card);
    card.querySelectorAll('.ing-filter-btn').forEach(b => b.classList.toggle('active', b.dataset.filter === state.ingredientFilter));
  });
  card.querySelector('#ing-add-btn').addEventListener('click', async () => {
    const ok = await openIngredientModal();
    if (ok) renderDiet();
  });
  card.querySelector('#ing-import-btn').addEventListener('click', async () => {
    const samples = [
      { name: '鸡蛋', unit: '个', remaining: 10, purchaseDate: getTodayKey(), expiryDate: shiftDate(getTodayKey(), 12) },
      { name: '牛奶', unit: '盒', remaining: 4, purchaseDate: getTodayKey(), expiryDate: shiftDate(getTodayKey(), 5) },
      { name: '西红柿', unit: '个', remaining: 6, purchaseDate: getTodayKey(), expiryDate: shiftDate(getTodayKey(), 4) },
      { name: '大米', unit: 'kg', remaining: 2, purchaseDate: getTodayKey(), expiryDate: shiftDate(getTodayKey(), 90) }
    ];
    const sure = await appConfirm('将导入 ' + samples.length + ' 个示例食材用于体验功能，确定吗？', { okText: '导入', cancelText: '取消' });
    if (!sure) return;
    samples.forEach(s => addIngredient(s));
    renderDiet();
  });
  card.querySelector('#ing-list').addEventListener('click', async (e) => {
    const actBtn = e.target.closest('[data-act]');
    if (actBtn) {
      const id = actBtn.dataset.id;
      const act = actBtn.dataset.act;
      if (act === 'ing-edit') { const ok = await openIngredientModal(id); if (ok) renderDiet(); }
      else if (act === 'ing-del') {
        const ing = state.ingredients.find(x => x.id === id);
        const sure = await appConfirm('确定删除「' + (ing ? ing.name : '') + '」？', { danger: true, okText: '删除', cancelText: '取消' });
        if (sure) { deleteIngredient(id); renderDiet(); }
      } else if (act === 'ing-minus') {
        const ing = state.ingredients.find(x => x.id === id);
        if (ing) { updateIngredient(id, { remaining: Math.max(0, (Number(ing.remaining) || 0) - 1) }); renderDiet(); }
      }
      return;
    }
    const row = e.target.closest('.ing-row');
    if (row) openIngredientDetail(row.dataset.id);
  });
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

// 英语（学习）支线：某天已勾选的打卡任务数（每日任务 + 每周任务），用于支线卡片联动
function getEnglishDoneCount(dateKey) {
  const day = (state.englishCheckin.history || {})[dateKey];
  if (!day) return 0;
  let n = 0;
  Object.values(day.tasks || {}).forEach(t => { if (t && t.done) n++; });
  Object.values(day.weekly || {}).forEach(t => { if (t && t.done) n++; });
  return n;
}

// 英语（学习）支线：某天应勾选的打卡任务总数（每日任务 + 每周任务），用于按「勾选完成比例」算进度
function getEnglishTaskTotal(dateKey) {
  const day = (state.englishCheckin.history || {})[dateKey];
  if (!day) return 0;
  return Object.keys(day.tasks || {}).length + Object.keys(day.weekly || {}).length;
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

function getPointRankingItems() {
  return [
    { name: '健康', icon: 'health', value: getDomainPoints('health') },
    { name: '外貌', icon: 'sparkles', value: getDomainPoints('looks') },
    { name: '记账', icon: 'coins', value: getDomainPoints('money') },
    { name: '每日计划', icon: 'review', value: getPlanPoints() },
    { name: '专注', icon: 'focus', value: getFocusPoints() },
    { name: '每日复盘', icon: 'note', value: getReviewCount() * 5 },
    { name: '外语学习', icon: 'language', value: getLanguagePoints() },
    { name: '摄影审美', icon: 'camera', value: getSlowModulePoints('photography') },
    { name: '技能考证', icon: 'scroll', value: getSlowModulePoints('cert') },
    { name: '家居整理', icon: 'home', value: getSlowModulePoints('homeorg') },
    { name: '音乐练习', icon: 'music', value: getSlowModulePoints('music') },
  ];
}

function getSpentPoints() {
  const list = (state.rewards && state.rewards.redeemed) || [];
  return list.reduce((s, r) => s + (Number(r.cost) || 0), 0);
}

function getAvailablePoints() {
  return Math.max(0, getTotalEarnedPoints() - getSpentPoints());
}

function getTravelPoints() {
  const t = state.travel || {};
  let sum = Object.values(t.log || {}).reduce((s, v) => s + (Number(v) || 0), 0);
  if (t.checkin && Array.isArray(t.checkin.categories)) {
    t.checkin.categories.forEach(c => {
      (c.places || []).forEach(p => {
        if (p.checked) sum += Number(p.points) || 0;
      });
    });
  }
  return sum;
}

function getSocialPoints() {
  const s = state.social || {};
  return Object.values(s.log || {}).reduce((sum, v) => sum + (Number(v) || 0), 0);
}

// v9255：暂缓 6 模块累计积分（来自 m.log 的打卡 / 任务勾选发放）
function getSlowModulePoints(key) {
  const m = state[key] || {};
  return Object.values(m.log || {}).reduce((s, v) => s + (Number(v) || 0), 0);
}

function getLifeOrderPoints() {
  return getDomainPointsTotal();
}

function getInnerGrowthPoints() {
  return getPlanPoints() + getFocusPoints() + getReviewCount() * 5;
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
  else text = `本周${name}做得不多也没关系，先留 1-2 个最轻松的核心动作，做得足够小就好启动，不急。`;
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
  setTimeout(() => appAlert(`专注完成，本次 ${minutes} 分钟，已记入今日专注时长`, { title: '专注完成', icon: '🍅' }), 60);
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
    '冥想 10 分钟',
    '写作 500 字',
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
  const dots = values.map((v, i) => `<circle cx="${x(i).toFixed(1)}" cy="${y(v).toFixed(1)}" r="2.5" fill="#B8AAD8" stroke="#fff" stroke-width="1"></circle>`).join('');
  return `<svg class="sleep-trend-chart" viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMid meet">
    <defs><linearGradient id="${gradId}" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#B8AAD8" stop-opacity="0.35"/><stop offset="100%" stop-color="#B8AAD8" stop-opacity="0.02"/></linearGradient></defs>
    ${gridLines}
    <polygon points="${area}" fill="url(#${gradId})"></polygon>
    <polyline points="${pts}" fill="none" stroke="#B8AAD8" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"></polyline>
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

  // v9293：首页轻量积分摘要（hp-quick-stats）数据源
  const todayPts = getTodayPoints();
  const weekPts = Number(state.points) || 0;
  const todayDone = prog.done;
  const weekPct = prog.percent;

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


  // 图标 SVG
  const sportIcon = `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><path d="M4 15l4-4 3 3 4-4 5 5"/><path d="M4 15v4h16v-4"/></svg>`;
  const sleepIcon = `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`;
  const langIcon = `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/><path d="M8 7h8"/></svg>`;
  const habitIcon = `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;

  page.innerHTML = `
    <div class="hp-top-block">
    <div class="hp-header">
      <div class="hp-greet-wrap">
        <h2 class="hp-greet">${greeting}呀！</h2>
        <p class="hp-sub">愿你稳步向理想的自己靠近${icon('sparkle', 12)}</p>
        <div class="hp-weather" id="hp-weather">
          <span id="hp-weather-text">${weather}</span>
        </div>
      </div>
      <div class="hp-mascot">
        <img src="images/6.png" alt="mascot" class="hp-mascot-img" loading="lazy">
      </div>
    </div>

    </div>

    <div class="hp-quick-stats">
      <div class="hp-qs-row">
        <div class="hp-qs-col">
          <span>${icon('star', 11)} 今日积分：<b>${todayPts}</b></span>
        </div>
        <div class="hp-qs-col">
          <span>${icon('chart', 11)} 本周进度：<b>${weekPct}%</b></span>
        </div>
      </div>
    </div>

    <div class="hp-section-title">今日概览</div>
    <div class="hp-rings">
      ${overviewRingHTML(habitPct, 'ring-peach', habitIcon, '每日计划', habitPct + '%', habitVal, '#E8B4A8', '每日计划')}
      ${overviewRingHTML(sleepPct, 'ring-purple', sleepIcon, '睡眠', sleepPct + '%', sleepVal, '#B8AAD8', '睡眠管理')}
      ${overviewRingHTML(sportPct, 'ring-green', sportIcon, '运动', sportPct + '%', sportVal, '#9ACB86', '健身')}
      ${overviewRingHTML(langPct, 'ring-purple', langIcon, '学英语', langPct + '%', langVal, '#8978C3', '学习成长')}
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


    <div class="hp-quick">
      <div class="hp-section-title">${icon('zap', 14)} 快速记录</div>
      <div class="hp-quick-grid">
        <button class="hp-quick-btn hp-qb-sport" data-qr="sport"><span class="hq-icon hq-sport">${icon('dumbbell', 15)}</span><span class="hq-label">记运动</span></button>
        <button class="hp-quick-btn hp-qb-sleep" data-qr="sleep"><span class="hq-icon hq-sleep">${icon('moon', 15)}</span><span class="hq-label">记睡眠</span></button>
        <button class="hp-quick-btn hp-qb-money" data-qr="money"><span class="hq-icon hq-money">${icon('coins', 15)}</span><span class="hq-label">记账</span></button>
        <button class="hp-quick-btn hp-qb-idea" data-qr="idea"><span class="hq-icon hq-idea">${icon('bulb', 15)}</span><span class="hq-label">记想法</span></button>
      </div>
    </div>
  `;
  content.appendChild(page);

  const wEl = page.querySelector('#hp-weather-text');
  if (wEl) fetchWeather('上海').then(t => { if (t) wEl.textContent = t; }).catch(() => {});

  const addBtn = page.querySelector('#hmt-add');
  if (addBtn) addBtn.addEventListener('click', openMainTaskPicker);

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

// ============ v9258 外貌页 4 标签模块（护肤/仪态/穿搭/妆容）============
// 状态、默认值、加载/保存、迁移、积分、本周统计、4 标签内容渲染与绑定。
// 由 renderDomainPage('外貌') 在 stats 卡片之后挂载（替换原通用「工具/资产 + 每日打卡」）。
// 顶部 4 个标签作为分段切换：state.domainTagFilter['looks'] 即当前激活 tab。

// === 1. ICONS 追加 4 个新线性图标（护肤 droplet / 仪态 body / 穿搭 shirt / 妆容 brush）===
(function appendLooksIcons(){
  if (ICONS.droplet && ICONS.body && ICONS.shirt && ICONS.brush) return;
  ICONS.droplet = '<path d="M12 3.5s-6.5 6.8-6.5 11.2a6.5 6.5 0 0 0 13 0C18.5 10.3 12 3.5 12 3.5z"/>';
  ICONS.body   = '<circle cx="12" cy="5" r="2.4"/><path d="M9.5 8.5h5"/><path d="M10 9l-1 4 2 1v7"/><path d="M14 9l1 4-2 1v7"/><path d="M8 13c0-1.2 1.8-2 4-2s4 .8 4 2"/>';
  ICONS.shirt  = '<path d="M4.5 7.5L8 4l1.5 1.2a3.5 3.5 0 0 0 5 0L16 4l3.5 3.5-2.3 1.6.8 11.4H6L6.8 9.1z"/><path d="M9.5 5.2v.8a3.5 3.5 0 0 0 5 0v-.8"/>';
  ICONS.brush  = '<rect x="9" y="2" width="6" height="10" rx="1.5" transform="rotate(45 12 7)"/><path d="M6.5 13.5L3 17l2.5 2.5L9.5 16"/>';
})();

// === 2. 默认数据 ===
const LOOKS_DEFAULTS = {
  skin: {
    tasks: {
      morning: [
        { id: 'skm-c', text: '洁面', points: 1 },
        { id: 'skm-t', text: '水乳', points: 1 },
        { id: 'skm-s', text: '精华', points: 2 },
        { id: 'skm-f', text: '防晒', points: 2 }
      ],
      night: [
        { id: 'skn-m', text: '卸妆', points: 1 },
        { id: 'skn-c', text: '洁面', points: 1 },
        { id: 'skn-t', text: '水乳', points: 1 },
        { id: 'skn-s', text: '精华', points: 2 },
        { id: 'skn-mask', text: '面膜', points: 3 }
      ]
    },
    skinStatus: '',  // 稳定/干燥/出油/敏感/长痘
    reminders: { morning: '08:00', night: '22:00' },
    checkin: {}, log: {}, notes: ''
  },
  posture: {
    tasks: [
      { id: 'po-1', text: '挺胸收腹', points: 2 },
      { id: 'po-2', text: '肩颈拉伸', points: 2 },
      { id: 'po-3', text: '站姿练习', points: 2 },
      { id: 'po-4', text: '坐姿提醒', points: 1 },
      { id: 'po-5', text: '走路姿态', points: 2 }
    ],
    trainingTypes: ['站姿', '坐姿', '走姿', '肩颈放松', '体态调整'],
    tips: [
      '久坐后站起来两分钟，给身体喘口气',
      '拍照前放松肩膀，下巴微收，会更自然',
      '走路时重心稳定，不急不赶',
      '靠墙站 5 分钟，肩胛骨收一收',
      '深呼吸，肩膀远离耳朵'
    ],
    checkin: {}, log: {}, notes: ''
  },
  outfit: {
    styles: ['休闲', '通勤', '运动', '正式', '可爱', '松弛感'],
    seasons: ['春', '夏', '秋', '冬', '不限'],
    scenes:  ['日常', '通勤', '约会', '出游', '居家', '不限'],
    wardrobeCats: ['上衣', '裤子', '裙子', '外套', '鞋子', '配饰'],
    inspirations: [],  // {id,style,season,scene,date,image,note}
    wardrobe: [],      // {id,name,category,count}
    plans: [],         // {id,date,note,done}
    tasks: [],         // v9264：ensureLooksTab 期望 ref.tasks 存在
    checkin: {}, log: {}, notes: ''
  },
  makeup: {
    types: ['日常淡妆', '伪素颜', '通勤妆', '约会妆', '拍照妆', '浓妆'],
    tasks: [
      { id: 'mk-1', text: '底妆', points: 2 },
      { id: 'mk-2', text: '眉毛', points: 1 },
      { id: 'mk-3', text: '眼妆', points: 2 },
      { id: 'mk-4', text: '腮红', points: 1 },
      { id: 'mk-5', text: '口红', points: 1 },
      { id: 'mk-6', text: '定妆', points: 1 }
    ],
    scenes: ['日常', '通勤', '约会', '拍照', '不限'],
    products: [],     // {id,name}
    inspirations: [],  // {id,type,scene,date,image,note}
    checkin: {}, log: {}, notes: ''
  }
};

const LOOKS_TABS = [
  { key: 'skin',    name: '护肤', icon: 'droplet', color: '#B07A9E' },
  { key: 'posture', name: '仪态', icon: 'body',    color: '#7A9C7A' },
  { key: 'outfit',  name: '穿搭', icon: 'shirt',   color: '#8C7BB6' },
  { key: 'makeup',  name: '妆容', icon: 'brush',   color: '#C4798C' }
];
const LOOKS_TAB_KEYS = { 护肤: 'skin', 仪态: 'posture', 穿搭: 'outfit', 妆容: 'makeup' };
const LOOKS_TAB_NAME = { skin: '护肤', posture: '仪态', outfit: '穿搭', makeup: '妆容' };

// === 3. load / save ===
function loadLooks(tab) { return loadJSON('xenos-looks-' + tab, JSON.parse(JSON.stringify(LOOKS_DEFAULTS[tab]))); }
function saveLooks(tab) {
  const map = { skin: 'state.looksSkin', posture: 'state.looksPosture', outfit: 'state.looksOutfit', makeup: 'state.looksMakeup' };
  const ref = eval(map[tab]);
  saveJSON('xenos-looks-' + tab, ref);
}
function ensureLooksTab(tab) {
  const map = { skin: 'state.looksSkin', posture: 'state.looksPosture', outfit: 'state.looksOutfit', makeup: 'state.looksMakeup' };
  const ref = eval(map[tab]);
  const d = LOOKS_DEFAULTS[tab];
  if (!ref.tasks) ref.tasks = d && d.tasks ? JSON.parse(JSON.stringify(d.tasks)) : [];
  if (!ref.checkin) ref.checkin = {};
  if (!ref.log) ref.log = {};
  if (ref.tasks && Array.isArray(ref.tasks) && ref.tasks.length && !ref.tasks[0].id) {
    // 旧版无 id 的 task 数组：补 id
    ref.tasks.forEach((t, i) => { if (!t.id) t.id = tab + '-t-' + i; });
  }
  if (tab === 'skin') {
    if (!ref.tasks.morning) ref.tasks.morning = d.tasks.morning;
    if (!ref.tasks.night) ref.tasks.night = d.tasks.night;
    if (!ref.skinStatus) ref.skinStatus = '';
    if (!ref.reminders) ref.reminders = { morning: '08:00', night: '22:00' };
  } else if (tab === 'posture') {
    if (!ref.trainingTypes) ref.trainingTypes = d.trainingTypes;
    if (!ref.tips) ref.tips = d.tips;
  } else if (tab === 'outfit') {
    if (!ref.styles) ref.styles = d.styles;
    if (!ref.seasons) ref.seasons = d.seasons;
    if (!ref.scenes) ref.scenes = d.scenes;
    if (!ref.wardrobeCats) ref.wardrobeCats = d.wardrobeCats;
    if (!ref.inspirations) ref.inspirations = [];
    if (!ref.wardrobe) ref.wardrobe = [];
    if (!ref.plans) ref.plans = [];
  } else if (tab === 'makeup') {
    if (!ref.types) ref.types = d.types;
    if (!ref.scenes) ref.scenes = d.scenes;
    if (!ref.products) ref.products = [];
    if (!ref.inspirations) ref.inspirations = [];
  }
  if (!('notes' in ref)) ref.notes = '';
}
function migrateLooks() {
  ['skin', 'posture', 'outfit', 'makeup'].forEach(t => {
    if (!state['looks' + (t === 'skin' ? 'Skin' : t === 'posture' ? 'Posture' : t === 'outfit' ? 'Outfit' : 'Makeup')]) {
      state['looks' + (t === 'skin' ? 'Skin' : t === 'posture' ? 'Posture' : t === 'outfit' ? 'Outfit' : 'Makeup')] = loadLooks(t);
    }
    ensureLooksTab(t);
  });
  if (!state.domainTagFilter) state.domainTagFilter = {};
  if (!state.domainTagFilter.looks || !LOOKS_TAB_NAME[state.domainTagFilter.looks]) {
    state.domainTagFilter.looks = '护肤';
  }
}
migrateLooks();

// 初始挂到 state（如 migrate 已处理则保持）
if (!state.looksSkin)    state.looksSkin    = loadLooks('skin');
if (!state.looksPosture) state.looksPosture = loadLooks('posture');
if (!state.looksOutfit)  state.looksOutfit  = loadLooks('outfit');
if (!state.looksMakeup)  state.looksMakeup  = loadLooks('makeup');

// === 4. 工具：积分/连签/今日进度/本周 ===
function getLooksRef(tab) {
  return tab === 'skin' ? state.looksSkin : tab === 'posture' ? state.looksPosture : tab === 'outfit' ? state.looksOutfit : state.looksMakeup;
}
function getLooksTodayPts(tab) {
  const r = getLooksRef(tab);
  return r.log[getTodayKey()] || 0;
}
function getLooksTotalPts(tab) {
  const r = getLooksRef(tab);
  let s = 0; Object.values(r.log).forEach(v => s += (v | 0));
  return s;
}
// 连签：从今天往前数连续有 checkin 的天数（checkin[dateKey].done 为 true 视为打卡）
function getLooksStreak(tab) {
  const r = getLooksRef(tab);
  let n = 0; const d = new Date();
  while (n < 365) {
    const k = dateKey(d);
    const c = r.checkin[k];
    const has = c && (c.done || c.morning || c.night || c.style || c.makeupType || (c.trainings && Object.keys(c.trainings).length) || (c.taskDone && Object.keys(c.taskDone).length));
    if (!has) break;
    n++; d.setDate(d.getDate() - 1);
  }
  return n;
}
function getLooksTodayPct(tab) {
  const r = getLooksRef(tab), k = getTodayKey(), c = r.checkin[k] || {};
  if (tab === 'skin') {
    const total = (r.tasks.morning.length + r.tasks.night.length);
    const done = Object.keys(c.taskDone || {}).length;
    return total ? Math.round(done / total * 100) : 0;
  } else if (tab === 'posture') {
    const total = r.tasks.length;
    const done = Object.keys(c.taskDone || {}).length;
    return total ? Math.round(done / total * 100) : 0;
  } else if (tab === 'outfit') {
    return c.style ? 100 : 0;
  } else if (tab === 'makeup') {
    const total = r.tasks.length;
    const done = Object.keys(c.taskDone || {}).length;
    return total ? Math.round(done / total * 100) : 0;
  }
  return 0;
}
function getLooksWeekDots(tab) {
  const r = getLooksRef(tab);
  const arr = [];
  const d = new Date();
  for (let i = 6; i >= 0; i--) {
    const dd = new Date(d); dd.setDate(d.getDate() - i);
    const k = dateKey(dd);
    const c = r.checkin[k];
    const has = c && (c.done || c.morning || c.night || c.style || c.makeupType || (c.trainings && Object.keys(c.trainings).length) || (c.taskDone && Object.keys(c.taskDone).length));
    arr.push({ key: k, day: dd.getDate(), has: !!has, pts: r.log[k] || 0 });
  }
  return arr;
}
function getLooksWeekStats(tab) {
  const dots = getLooksWeekDots(tab);
  const days = dots.filter(d => d.has).length;
  const totalPts = dots.reduce((s, d) => s + d.pts, 0);
  let extra = '';
  if (tab === 'posture') {
    let mins = 0;
    const d2 = new Date();
    for (let i = 6; i >= 0; i--) {
      const dd = new Date(d2); dd.setDate(d2.getDate() - i);
      const c = state.looksPosture.checkin[dateKey(dd)];
      if (c && c.trainings) Object.values(c.trainings).forEach(m => mins += (m | 0));
    }
    extra = ' · 累计 ' + mins + ' 分钟';
  } else if (tab === 'outfit') {
    const styles = {};
    const d2 = new Date();
    for (let i = 6; i >= 0; i--) {
      const dd = new Date(d2); dd.setDate(d2.getDate() - i);
      const c = state.looksOutfit.checkin[dateKey(dd)];
      if (c && c.style) styles[c.style] = (styles[c.style] || 0) + 1;
    }
    const sorted = Object.entries(styles).sort((a, b) => b[1] - a[1]);
    extra = sorted.length ? ' · 最常 ' + sorted[0][0] : '';
  } else if (tab === 'makeup') {
    const types = {};
    const d2 = new Date();
    for (let i = 6; i >= 0; i--) {
      const dd = new Date(d2); dd.setDate(d2.getDate() - i);
      const c = state.looksMakeup.checkin[dateKey(dd)];
      if (c && c.makeupType) types[c.makeupType] = (types[c.makeupType] || 0) + 1;
    }
    const sorted = Object.entries(types).sort((a, b) => b[1] - a[1]);
    extra = sorted.length ? ' · 最常 ' + sorted[0][0] : '';
  } else if (tab === 'skin') {
    const skin = state.looksSkin.skinStatus || '';
    extra = skin ? (' · 今日皮肤：' + skin) : '';
  }
  return { days, totalPts, dots, extra };
}
function getLooksInspirationCount(tab) {
  const r = getLooksRef(tab);
  if (tab === 'outfit' || tab === 'makeup') return (r.inspirations || []).length;
  return 0;
}
function addLooksPoints(tab, pts) {
  if (!pts) return;
  const r = getLooksRef(tab), k = getTodayKey();
  r.log[k] = (r.log[k] || 0) + pts;
  state.points = (state.points || 0) + pts;
  savePoints();
  saveLooks(tab);
}
// 通用 id
function _looksId(prefix) { return prefix + '-' + Date.now().toString(36) + '-' + Math.floor(Math.random() * 1000).toString(36); }
function dateKey(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }

// === 5. 4 标签内容 ===
// 通用：本周统计小圆点 + 数字
function renderLooksWeekStatsHTML(tab, color) {
  const s = getLooksWeekStats(tab);
  const dots = s.dots.map((d, i) => `<span class="lk-dot ${d.has ? 'on' : ''}" data-lk-dot="${i}" title="${d.key} · +${d.pts}分"></span>`).join('');
  const rate = s.days ? Math.round(s.days / 7 * 100) : 0;
  return `<div class="lk-card lk-week">
    <div class="lk-card-title">${icon('chart', 14)} 本周${LOOKS_TAB_NAME[tab]}统计</div>
    <div class="lk-week-row"><span class="lk-week-num" data-lk-week-num>${s.days}</span><span class="lk-week-label" data-lk-week-rate>天打卡 · 完成率 ${rate}%</span></div>
    <div class="lk-dots">${dots}</div>
    <div class="lk-week-extra" data-lk-week-extra>累计 +${s.totalPts} 分${s.extra}${tab === 'outfit' ? ' · 灵感 ' + getLooksInspirationCount('outfit') : tab === 'makeup' ? ' · 用品 ' + (state.looksMakeup.products || []).length : ''}</div>
  </div>`;
}

// --- 护肤 ---
function renderLooksSkinHTML(today) {
  const r = state.looksSkin, c = r.checkin[today] || {}, td = c.taskDone || {};
  const skinOpts = ['稳定', '干燥', '出油', '敏感', '长痘'].map(s => `<button class="lk-tag ${r.skinStatus === s ? 'on' : ''}" data-skin="${s}">${s}</button>`).join('');
  const mTasks = r.tasks.morning.map(t => `<div class="lk-task ${td[t.id] ? 'done' : ''}" data-skin-task="${t.id}"><span class="lk-check">${td[t.id] ? icon('check', 11) : ''}</span><span class="lk-text">${escapeHTML(t.text)}</span><span class="lk-pts">+${t.points}</span></div>`).join('');
  const nTasks = r.tasks.night.map(t => `<div class="lk-task ${td[t.id] ? 'done' : ''}" data-skin-task="${t.id}"><span class="lk-check">${td[t.id] ? icon('check', 11) : ''}</span><span class="lk-text">${escapeHTML(t.text)}</span><span class="lk-pts">+${t.points}</span></div>`).join('');
  return `
    <div class="lk-card">
      <div class="lk-card-title">${icon('check', 14)} 今日护肤打卡<span class="lk-meta" data-lk-meta>+${getLooksTodayPts('skin')} 分</span></div>
      <div class="lk-skin-periods">
        <div class="lk-period"><div class="lk-period-head"><span>${icon('sunrise', 12)} 早间</span><span class="lk-period-state ${c.morning ? 'on' : ''}">${c.morning ? '已完成' : '待完成'}</span></div>
          <div class="lk-tasks">${mTasks}</div>
          <div class="lk-add-row"><input class="lk-input" data-skin-add="morning" placeholder="加一个早间步骤..."><button class="lk-mini-btn" data-skin-add-btn="morning">${icon('plus', 12)}</button></div>
        </div>
        <div class="lk-period"><div class="lk-period-head"><span>${icon('moon', 12)} 晚间</span><span class="lk-period-state ${c.night ? 'on' : ''}">${c.night ? '已完成' : '待完成'}</span></div>
          <div class="lk-tasks">${nTasks}</div>
          <div class="lk-add-row"><input class="lk-input" data-skin-add="night" placeholder="加一个晚间步骤..."><button class="lk-mini-btn" data-skin-add-btn="night">${icon('plus', 12)}</button></div>
        </div>
      </div>
    </div>
    <div class="lk-card">
      <div class="lk-card-title">${icon('heart', 14)} 今日皮肤状态</div>
      <div class="lk-tags">${skinOpts}</div>
    </div>
    ${renderLooksWeekStatsHTML('skin', '#B07A9E')}
  `;
}

function bindLooksSkin(page, today) {
  page.querySelectorAll('[data-skin-task]').forEach(el => {
    el.addEventListener('click', () => {
      const id = el.dataset.skinTask, t = [...state.looksSkin.tasks.morning, ...state.looksSkin.tasks.night].find(x => x.id === id);
      if (!t) return;
      const c = state.looksSkin.checkin[today] = state.looksSkin.checkin[today] || { taskDone: {} };
      if (!c.taskDone) c.taskDone = {};
      if (c.taskDone[id]) { delete c.taskDone[id]; addLooksPoints('skin', -t.points); }
      else { c.taskDone[id] = true; addLooksPoints('skin', t.points); }
      // 检查 morning/night 全完成
      const mAll = state.looksSkin.tasks.morning.every(x => c.taskDone[x.id]);
      const nAll = state.looksSkin.tasks.night.every(x => c.taskDone[x.id]);
      c.morning = mAll; c.night = nAll;
      c.done = mAll || nAll;
      saveLooks('skin');
      // v9258.1：原位更新（不整卡重绘）
      const skinDone = !!c.taskDone[id];
      el.classList.toggle('done', skinDone);
      const ck = el.querySelector('.lk-check');
      if (ck) ck.innerHTML = skinDone ? icon('check', 11) : '';
      refreshLooksStatsUI(page, 'skin');
    });
  });
  page.querySelectorAll('[data-skin]').forEach(btn => {
    btn.addEventListener('click', () => {
      state.looksSkin.skinStatus = state.looksSkin.skinStatus === btn.dataset.skin ? '' : btn.dataset.skin;
      saveLooks('skin');
      page.querySelectorAll('[data-skin]').forEach(b => b.classList.toggle('on', b.dataset.skin === state.looksSkin.skinStatus));
      refreshLooksStatsUI(page, 'skin');
    });
  });
  // v9274：删除护肤提醒区块（用户反馈）—— 下面的 .lk-time-pick 绑定成为无操作
  page.querySelectorAll('[data-skin-add-btn]').forEach(btn => {
    btn.addEventListener('click', () => {
      const period = btn.dataset.skinAddBtn;
      const input = page.querySelector('[data-skin-add="' + period + '"]');
      const text = (input.value || '').trim();
      if (!text) return;
      const t = { id: _looksId('sk-' + period[0]), text, points: 1 };
      state.looksSkin.tasks[period].push(t);
      saveLooks('skin');
      input.value = '';
      renderLooksContentArea(page, 'skin');
    });
  });
  page.querySelectorAll('[data-skin-add]').forEach(inp => {
    inp.addEventListener('keydown', e => { if (e.key === 'Enter') page.querySelector('[data-skin-add-btn="' + inp.dataset.skinAdd + '"]').click(); });
  });
}

// --- 仪态 ---
function renderLooksPostureHTML(today) {
  const r = state.looksPosture, c = r.checkin[today] || {}, td = c.taskDone || {};
  const types = r.trainingTypes.map(t => `<button class="lk-tag ${c.trainings && c.trainings[t] ? 'on' : ''}" data-pose-type="${t}">${t}</button>`).join('');
  const tasks = r.tasks.map(t => `<div class="lk-task ${td[t.id] ? 'done' : ''}" data-post-task="${t.id}"><span class="lk-check">${td[t.id] ? icon('check', 11) : ''}</span><span class="lk-text">${escapeHTML(t.text)}</span><span class="lk-pts">+${t.points}</span></div>`).join('');
  const mins = c.duration || (c.trainings ? Object.values(c.trainings).reduce((s, v) => s + (v | 0), 0) : 0);
  const tips = r.tips.slice(0, 3).map(t => `<div class="lk-tip">${icon('leaf', 12)} <span>${escapeHTML(t)}</span></div>`).join('');
  return `
    <div class="lk-card">
      <div class="lk-card-title">${icon('check', 14)} 今日仪态打卡<span class="lk-meta" data-lk-meta>+${getLooksTodayPts('posture')} 分</span></div>
      <div class="lk-sub-title">选训练内容（可多选）</div>
      <div class="lk-tags">${types}</div>
      <div class="lk-duration">
        <label>${icon('clock', 12)} 训练时长</label>
        <input type="number" min="0" max="120" class="lk-num" data-pose-min value="${mins}"><span>分钟</span>
      </div>
    </div>
    <div class="lk-card">
      <div class="lk-card-title">${icon('list', 14)} 仪态训练清单</div>
      <div class="lk-tasks">${tasks}</div>
      <div class="lk-add-row"><input class="lk-input" data-post-add placeholder="加一个训练任务..."><input type="number" min="0" max="20" class="lk-num" data-post-add-pts value="2" style="max-width:64px"><button class="lk-mini-btn" data-post-add-btn>${icon('plus', 12)}</button></div>
    </div>
    ${renderLooksWeekStatsHTML('posture', '#7A9C7A')}
  `;
}

function bindLooksPosture(page, today) {
  page.querySelectorAll('[data-pose-type]').forEach(btn => {
    btn.addEventListener('click', () => {
      const c = state.looksPosture.checkin[today] = state.looksPosture.checkin[today] || {};
      c.trainings = c.trainings || {};
      if (c.trainings[btn.dataset.poseType]) delete c.trainings[btn.dataset.poseType];
      else c.trainings[btn.dataset.poseType] = 0;
      c.done = !!(c.trainings && Object.keys(c.trainings).length) || !!Object.keys(c.taskDone || {}).length;
      saveLooks('posture');
      // v9258.1：原位更新
      btn.classList.toggle('on', !!c.trainings[btn.dataset.poseType]);
      refreshLooksStatsUI(page, 'posture');
    });
  });
  page.querySelectorAll('[data-post-task]').forEach(el => {
    el.addEventListener('click', () => {
      const id = el.dataset.postTask, t = state.looksPosture.tasks.find(x => x.id === id);
      if (!t) return;
      const c = state.looksPosture.checkin[today] = state.looksPosture.checkin[today] || { taskDone: {} };
      if (!c.taskDone) c.taskDone = {};
      if (c.taskDone[id]) { delete c.taskDone[id]; addLooksPoints('posture', -t.points); }
      else { c.taskDone[id] = true; addLooksPoints('posture', t.points); }
      c.done = !!(c.taskDone && Object.keys(c.taskDone).length) || !!(c.trainings && Object.keys(c.trainings).length);
      saveLooks('posture');
      // v9258.1：原位更新
      const pDone = !!c.taskDone[id];
      el.classList.toggle('done', pDone);
      const ck = el.querySelector('.lk-check');
      if (ck) ck.innerHTML = pDone ? icon('check', 11) : '';
      refreshLooksStatsUI(page, 'posture');
    });
  });
  const minInp = page.querySelector('[data-pose-min]');
  if (minInp) minInp.addEventListener('change', () => {
    const c = state.looksPosture.checkin[today] = state.looksPosture.checkin[today] || {};
    c.duration = Math.max(0, parseInt(minInp.value, 10) || 0);
    saveLooks('posture');
  });
  const addBtn = page.querySelector('[data-post-add-btn]');
  if (addBtn) addBtn.addEventListener('click', () => {
    const inp = page.querySelector('[data-post-add]');
    const pts = page.querySelector('[data-post-add-pts]');
    const text = (inp.value || '').trim();
    if (!text) return;
    const t = { id: _looksId('po'), text, points: Math.max(0, Math.min(20, parseInt(pts.value, 10) || 1)) };
    state.looksPosture.tasks.push(t);
    saveLooks('posture'); inp.value = '';
    renderLooksContentArea(page, 'posture');
  });
  const addInp = page.querySelector('[data-post-add]');
  if (addInp) addInp.addEventListener('keydown', e => { if (e.key === 'Enter') addBtn.click(); });
}

// --- 穿搭 ---
function renderLooksOutfitHTML(today) {
  const r = state.looksOutfit, c = r.checkin[today] || {};
  const styles = r.styles.map(s => `<button class="lk-tag ${c.style === s ? 'on' : ''}" data-outfit-style="${s}">${s}</button>`).join('');
  const insps = r.inspirations.slice().reverse().map(i => `<div class="lk-insp">
    ${i.image ? `<img class="lk-insp-img" src="${i.image}" alt="">` : `<div class="lk-insp-img lk-insp-empty">${icon('image', 20)}</div>`}
    <div class="lk-insp-meta"><span class="lk-insp-tag">${escapeHTML(i.style || '')}</span><span class="lk-insp-date">${i.date}</span></div>
    ${i.note ? `<p class="lk-insp-note">${escapeHTML(i.note)}</p>` : ''}
    <button class="lk-mini-btn lk-insp-del" data-insp-del="${i.id}" aria-label="删除">${icon('delete', 11)}</button>
  </div>`).join('');
  const wd = r.wardrobe.map(w => `<div class="lk-wd-row"><span class="lk-wd-cat">${escapeHTML(w.category)}</span><span class="lk-wd-name">${escapeHTML(w.name)}</span><span class="lk-wd-cnt">×${w.count || 1}</span><button class="lk-mini-btn" data-wd-del="${w.id}">${icon('delete', 11)}</button></div>`).join('');
  return `
    <div class="lk-card">
      <div class="lk-card-title">${icon('shirt', 14)} 今日穿搭记录<span class="lk-meta" data-lk-meta>${c.style ? '+' + getLooksTodayPts('outfit') + ' 分' : '未记录'}</span></div>
      <div class="lk-sub-title">风格</div>
      <div class="lk-pick-trigger" data-pick-style>${c.style ? c.style : '轻点选择风格'}</div>
      <div class="lk-add-row lk-row-2">
        <input class="lk-input" data-outfit-note placeholder="记一句今天穿了什么 / 心情..." value="${escapeHTML(c.outfitNote || '')}">
      </div>
      <div class="lk-add-row lk-row-2">
        <button class="lk-mini-btn lk-upload" data-outfit-upload>${icon('image', 12)} 上传今日穿搭图</button>
        ${c.outfitImage ? `<img class="lk-thumb" src="${c.outfitImage}" alt=""><button class="lk-mini-btn" data-outfit-img-del>${icon('delete', 11)}</button>` : ''}
      </div>
    </div>
    <div class="lk-card">
      <div class="lk-card-title">${icon('star', 14)} 穿搭灵感库<span class="lk-meta">${r.inspirations.length} 条</span></div>
      <div class="lk-add-row lk-row-3">
        <input class="lk-input" data-insp-style placeholder="风格">
        <div class="lk-pick-trigger" data-insp-season>${r._pendingInspSeason || '季节'}</div>
        <div class="lk-pick-trigger" data-insp-scene>${r._pendingInspScene || '场合'}</div>
      </div>
      <div class="lk-add-row lk-row-2"><input class="lk-input" data-insp-note placeholder="备注（可选）"><button class="lk-mini-btn" data-insp-upload>${icon('image', 12)} 图</button><button class="lk-mini-btn" data-insp-add>${icon('plus', 12)} 收藏</button></div>
      <div class="lk-insp-grid">${insps || '<p class="lk-empty">还没有灵感，收藏一组喜欢的搭配吧</p>'}</div>
    </div>
    <div class="lk-card">
      <div class="lk-card-title">${icon('inbox', 14)} 衣橱物品<span class="lk-meta">${r.wardrobe.length} 件</span></div>
      <div class="lk-add-row lk-row-3">
        <div class="lk-pick-trigger" data-wd-cat>${r._pendingWardrobeCat || '分类'}</div>
        <input class="lk-input" data-wd-name placeholder="名称">
        <input type="number" min="1" class="lk-num" data-wd-cnt value="1" style="max-width:64px">
        <button class="lk-mini-btn" data-wd-add>${icon('plus', 12)} 录入</button>
      </div>
      <div class="lk-wd-list">${wd || '<p class="lk-empty">衣橱还是空的，记下常用单品</p>'}</div>
    </div>
    <div class="lk-card">
    ${renderLooksWeekStatsHTML('outfit', '#8C7BB6')}
  `;
}

function bindLooksOutfit(page, today) {
  // v9271：风格选择改为底部弹层单选（匹配参考图 3 的设计）
  const styleTrigger = page.querySelector('[data-pick-style]');
  if (styleTrigger) styleTrigger.addEventListener('click', async () => {
    const c = state.looksOutfit.checkin[today] = state.looksOutfit.checkin[today] || {};
    const opts = state.looksOutfit.styles.map(s => ({ label: s, value: s }));
    const prev = c.style;
    const v = await openOptionPicker('今日穿搭 · 风格', opts, prev);
    if (v && v !== prev) {
      c.style = v; c.done = true;
      if (!prev) addLooksPoints('outfit', 2);
      saveLooks('outfit');
      styleTrigger.textContent = v;
      refreshLooksStatsUI(page, 'outfit');
    } else if (v === null && prev) {
      // 用户主动关闭但有选中的，保留（不撤销积分）
    }
  });
  const note = page.querySelector('[data-outfit-note]');
  if (note) note.addEventListener('change', () => {
    const c = state.looksOutfit.checkin[today] = state.looksOutfit.checkin[today] || {};
    c.outfitNote = note.value;
    saveLooks('outfit');
  });
  // 图片上传（今日穿搭）
  const outfitUpload = page.querySelector('[data-outfit-upload]');
  if (outfitUpload) outfitUpload.addEventListener('click', () => _looksPickImage(720, 0.7, (url) => {
    const c = state.looksOutfit.checkin[today] = state.looksOutfit.checkin[today] || {};
    c.outfitImage = url;
    saveLooks('outfit');
    renderLooksContentArea(page, 'outfit');
  }));
  const outfitImgDel = page.querySelector('[data-outfit-img-del]');
  if (outfitImgDel) outfitImgDel.addEventListener('click', () => {
    const c = state.looksOutfit.checkin[today] || {};
    delete c.outfitImage;
    saveLooks('outfit');
    renderLooksContentArea(page, 'outfit');
  });
  // 灵感
  const inspAdd = page.querySelector('[data-insp-add]');
  if (inspAdd) inspAdd.addEventListener('click', () => {
    const style = page.querySelector('[data-insp-style]').value.trim();
    const season = state.looksOutfit._pendingInspSeason || state.looksOutfit.seasons[0];
    const scene = state.looksOutfit._pendingInspScene || state.looksOutfit.scenes[0];
    const note = page.querySelector('[data-insp-note]').value.trim();
    if (!style) { toast('填一下风格', 'info'); return; }
    const id = _looksId('insp');
    const item = { id, style, season, scene, note, date: today, image: state.looksOutfit._pendingInspImage || '' };
    state.looksOutfit.inspirations.push(item);
    delete state.looksOutfit._pendingInspImage;
    delete state.looksOutfit._pendingInspSeason;
    delete state.looksOutfit._pendingInspScene;
    saveLooks('outfit');
    renderLooksContentArea(page, 'outfit');
  });
  // v9272：季节/场合/衣橱分类改为触发式底部弹层（匹配参考图 3-7）
  const inspSeasonTrig = page.querySelector('[data-insp-season]');
  if (inspSeasonTrig) inspSeasonTrig.addEventListener('click', async () => {
    const opts = state.looksOutfit.seasons.map(s => ({ label: s, value: s }));
    const prev = state.looksOutfit._pendingInspSeason || state.looksOutfit.seasons[0];
    const v = await openOptionPicker('选择季节', opts, prev);
    if (v != null) { state.looksOutfit._pendingInspSeason = v; inspSeasonTrig.textContent = v; }
  });
  const inspSceneTrig = page.querySelector('[data-insp-scene]');
  if (inspSceneTrig) inspSceneTrig.addEventListener('click', async () => {
    const opts = state.looksOutfit.scenes.map(s => ({ label: s, value: s }));
    const prev = state.looksOutfit._pendingInspScene || state.looksOutfit.scenes[0];
    const v = await openOptionPicker('选择场合', opts, prev);
    if (v != null) { state.looksOutfit._pendingInspScene = v; inspSceneTrig.textContent = v; }
  });
  const wdCatTrig = page.querySelector('[data-wd-cat]');
  if (wdCatTrig) wdCatTrig.addEventListener('click', async () => {
    const opts = state.looksOutfit.wardrobeCats.map(c => ({ label: c, value: c }));
    const prev = state.looksOutfit._pendingWardrobeCat || state.looksOutfit.wardrobeCats[0];
    const v = await openOptionPicker('衣橱分类', opts, prev);
    if (v != null) { state.looksOutfit._pendingWardrobeCat = v; wdCatTrig.textContent = v; }
  });
  const inspUpload = page.querySelector('[data-insp-upload]');
  if (inspUpload) inspUpload.addEventListener('click', () => _looksPickImage(720, 0.65, (url) => {
    state.looksOutfit._pendingInspImage = url;
    toast('图已选，点「收藏」保存', 'info');
  }));
  page.querySelectorAll('[data-insp-del]').forEach(b => b.addEventListener('click', () => {
    state.looksOutfit.inspirations = state.looksOutfit.inspirations.filter(x => x.id !== b.dataset.inspDel);
    saveLooks('outfit');
    renderLooksContentArea(page, 'outfit');
  }));
  // 衣橱
  const wdAdd = page.querySelector('[data-wd-add]');
  if (wdAdd) wdAdd.addEventListener('click', () => {
    const cat = state.looksOutfit._pendingWardrobeCat || state.looksOutfit.wardrobeCats[0];
    const name = page.querySelector('[data-wd-name]').value.trim();
    const cnt = Math.max(1, parseInt(page.querySelector('[data-wd-cnt]').value, 10) || 1);
    if (!name) return;
    state.looksOutfit.wardrobe.push({ id: _looksId('wd'), category: cat, name, count: cnt });
    delete state.looksOutfit._pendingWardrobeCat;
    saveLooks('outfit');
    page.querySelector('[data-wd-name]').value = '';
    renderLooksContentArea(page, 'outfit');
  });
  page.querySelectorAll('[data-wd-del]').forEach(b => b.addEventListener('click', () => {
    state.looksOutfit.wardrobe = state.looksOutfit.wardrobe.filter(x => x.id !== b.dataset.wdDel);
    saveLooks('outfit');
    renderLooksContentArea(page, 'outfit');
  }));
  // 计划
  const planAdd = page.querySelector('[data-plan-add]');
  if (planAdd) planAdd.addEventListener('click', () => {
    const trigger = page.querySelector('[data-plan-date]');
    const date = trigger.dataset.val || today;
    const note = page.querySelector('[data-plan-note]').value.trim();
    if (!note) return;
    state.looksOutfit.plans.push({ id: _looksId('pl'), date, note, done: false });
    saveLooks('outfit');
    page.querySelector('[data-plan-note]').value = '';
    renderLooksContentArea(page, 'outfit');
  });
  // v9276：删除穿搭计划区块（用户反馈）—— 保留状态以防历史数据丢失
}

// --- 妆容 ---
function renderLooksMakeupHTML(today) {
  const r = state.looksMakeup, c = r.checkin[today] || {}, td = c.taskDone || {};
  const types = r.types.map(t => `<button class="lk-tag ${c.makeupType === t ? 'on' : ''}" data-makeup-type="${t}">${t}</button>`).join('');
  const steps = r.tasks.map(t => `<div class="lk-task ${td[t.id] ? 'done' : ''}" data-makeup-task="${t.id}"><span class="lk-check">${td[t.id] ? icon('check', 11) : ''}</span><span class="lk-text">${escapeHTML(t.text)}</span><span class="lk-pts">+${t.points}</span></div>`).join('');
  const products = (r.products || []).map(p => `<div class="lk-prod"><span class="lk-prod-name">${escapeHTML(p.name)}</span><button class="lk-mini-btn" data-prod-del="${p.id}">${icon('delete', 11)}</button></div>`).join('');
  const insps = r.inspirations.slice().reverse().map(i => `<div class="lk-insp">
    ${i.image ? `<img class="lk-insp-img" src="${i.image}" alt="">` : `<div class="lk-insp-img lk-insp-empty">${icon('image', 20)}</div>`}
    <div class="lk-insp-meta"><span class="lk-insp-tag">${escapeHTML(i.type || '')}</span><span class="lk-insp-date">${i.date}</span></div>
    ${i.note ? `<p class="lk-insp-note">${escapeHTML(i.note)}</p>` : ''}
    <button class="lk-mini-btn lk-insp-del" data-minsp-del="${i.id}">${icon('delete', 11)}</button>
  </div>`).join('');
  return `
    <div class="lk-card">
      <div class="lk-card-title">${icon('brush', 14)} 今日妆容打卡<span class="lk-meta" data-lk-meta>+${getLooksTodayPts('makeup')} 分</span></div>
      <div class="lk-sub-title">妆容类型</div>
      <div class="lk-tags">${types}</div>
    </div>
    <div class="lk-card">
      <div class="lk-card-title">${icon('list', 14)} 妆容步骤清单</div>
      <div class="lk-tasks">${steps}</div>
      <div class="lk-add-row"><input class="lk-input" data-makeup-add placeholder="加一个步骤..."><input type="number" min="0" max="20" class="lk-num" data-makeup-add-pts value="1" style="max-width:64px"><button class="lk-mini-btn" data-makeup-add-btn>${icon('plus', 12)}</button></div>
    </div>
    <div class="lk-card">
      <div class="lk-card-title">${icon('gift', 14)} 妆容用品记录<span class="lk-meta">${(r.products || []).length} 件</span></div>
      <div class="lk-add-row lk-row-3">
        <input class="lk-input" data-prod-name placeholder="如：粉底液 / 某品牌口红">
        <button class="lk-mini-btn" data-prod-add>${icon('plus', 12)} 记录</button>
      </div>
      <div class="lk-prod-list">${products || '<p class="lk-empty">还没记过用品，记一下常用化妆品方便补货</p>'}</div>
    </div>
    <div class="lk-card">
      <div class="lk-card-title">${icon('star', 14)} 妆容灵感收藏<span class="lk-meta">${r.inspirations.length} 条</span></div>
      <div class="lk-add-row lk-row-3">
        <input class="lk-input" data-minsp-type placeholder="妆容">
        <select class="lk-input" data-minsp-scene>${r.scenes.map(s => `<option>${s}</option>`).join('')}</select>
        <input class="lk-input" data-minsp-note placeholder="备注">
        <button class="lk-mini-btn" data-minsp-upload>${icon('image', 12)}</button>
        <button class="lk-mini-btn" data-minsp-add>${icon('plus', 12)} 收藏</button>
      </div>
      <div class="lk-insp-grid">${insps || '<p class="lk-empty">收藏喜欢的妆容，慢慢攒成灵感库</p>'}</div>
    </div>
    ${renderLooksWeekStatsHTML('makeup', '#C4798C')}
  `;
}

function bindLooksMakeup(page, today) {
  page.querySelectorAll('[data-makeup-type]').forEach(btn => {
    btn.addEventListener('click', () => {
      const c = state.looksMakeup.checkin[today] = state.looksMakeup.checkin[today] || {};
      const prev = c.makeupType;
      if (c.makeupType === btn.dataset.makeupType) { delete c.makeupType; if (prev) addLooksPoints('makeup', -2); c.done = !!Object.keys(c.taskDone || {}).length; }
      else { c.makeupType = btn.dataset.makeupType; if (!prev) addLooksPoints('makeup', 2); c.done = true; }
      saveLooks('makeup');
      // v9258.1：原位更新
      page.querySelectorAll('[data-makeup-type]').forEach(b => b.classList.toggle('on', b.dataset.makeupType === c.makeupType));
      refreshLooksStatsUI(page, 'makeup');
    });
  });
  // v9276：删除完成时间字段（用户反馈）—— 状态保留兼容历史数据
  page.querySelectorAll('[data-makeup-task]').forEach(el => {
    el.addEventListener('click', () => {
      const id = el.dataset.makeupTask, tt = state.looksMakeup.tasks.find(x => x.id === id);
      if (!tt) return;
      const c = state.looksMakeup.checkin[today] = state.looksMakeup.checkin[today] || { taskDone: {} };
      if (!c.taskDone) c.taskDone = {};
      if (c.taskDone[id]) { delete c.taskDone[id]; addLooksPoints('makeup', -tt.points); }
      else { c.taskDone[id] = true; addLooksPoints('makeup', tt.points); }
      c.done = !!(c.taskDone && Object.keys(c.taskDone).length) || !!c.makeupType;
      saveLooks('makeup');
      // v9258.1：原位更新
      const mkDone = !!c.taskDone[id];
      el.classList.toggle('done', mkDone);
      const ck = el.querySelector('.lk-check');
      if (ck) ck.innerHTML = mkDone ? icon('check', 11) : '';
      refreshLooksStatsUI(page, 'makeup');
    });
  });
  const addBtn = page.querySelector('[data-makeup-add-btn]');
  if (addBtn) addBtn.addEventListener('click', () => {
    const inp = page.querySelector('[data-makeup-add]');
    const pts = page.querySelector('[data-makeup-add-pts]');
    const text = (inp.value || '').trim();
    if (!text) return;
    state.looksMakeup.tasks.push({ id: _looksId('mk'), text, points: Math.max(0, Math.min(20, parseInt(pts.value, 10) || 1)) });
    saveLooks('makeup'); inp.value = '';
    renderLooksContentArea(page, 'makeup');
  });
  const addInp = page.querySelector('[data-makeup-add]');
  if (addInp) addInp.addEventListener('keydown', e => { if (e.key === 'Enter') addBtn.click(); });
  // 用品
  const prodAdd = page.querySelector('[data-prod-add]');
  if (prodAdd) prodAdd.addEventListener('click', () => {
    const name = page.querySelector('[data-prod-name]').value.trim();
    if (!name) return;
    state.looksMakeup.products.push({ id: _looksId('pr'), name });
    saveLooks('makeup');
    page.querySelector('[data-prod-name]').value = '';
    renderLooksContentArea(page, 'makeup');
  });
  page.querySelectorAll('[data-prod-del]').forEach(b => b.addEventListener('click', () => {
    state.looksMakeup.products = state.looksMakeup.products.filter(x => x.id !== b.dataset.prodDel);
    saveLooks('makeup');
    renderLooksContentArea(page, 'makeup');
  }));
  // 妆容灵感
  const miAdd = page.querySelector('[data-minsp-add]');
  if (miAdd) miAdd.addEventListener('click', () => {
    const type = page.querySelector('[data-minsp-type]').value.trim();
    const scene = page.querySelector('[data-minsp-scene]').value;
    const note = page.querySelector('[data-minsp-note]').value.trim();
    if (!type) { toast('填一下妆容', 'info'); return; }
    const id = _looksId('minsp');
    state.looksMakeup.inspirations.push({ id, type, scene, note, date: today, image: state.looksMakeup._pendingInspImage || '' });
    delete state.looksMakeup._pendingInspImage;
    saveLooks('makeup');
    renderLooksContentArea(page, 'makeup');
  });
  const miUp = page.querySelector('[data-minsp-upload]');
  if (miUp) miUp.addEventListener('click', () => _looksPickImage(720, 0.65, (url) => {
    state.looksMakeup._pendingInspImage = url;
    toast('图已选，点「收藏」保存', 'info');
  }));
  page.querySelectorAll('[data-minsp-del]').forEach(b => b.addEventListener('click', () => {
    state.looksMakeup.inspirations = state.looksMakeup.inspirations.filter(x => x.id !== b.dataset.minspDel);
    saveLooks('makeup');
    renderLooksContentArea(page, 'makeup');
  }));
}

// 图片选择
function _looksPickImage(maxW, q, cb) {
  const input = document.createElement('input');
  input.type = 'file'; input.accept = 'image/*'; input.style.display = 'none';
  document.body.appendChild(input);
  input.addEventListener('change', () => {
    const f = input.files && input.files[0];
    if (!f) { input.remove(); return; }
    fileToResizedDataURL(f, maxW || 720, q || 0.65).then(url => cb(url)).catch(() => toast('图片处理失败', 'info'));
    input.remove();
  });
  input.click();
}

// === 6. 汇总：4 标签内容 + 渲染与重渲染 ===
function renderLooksContentArea(page, tab) {
  const today = getTodayKey();
  let html = '';
  if (tab === 'skin') html = renderLooksSkinHTML(today);
  else if (tab === 'posture') html = renderLooksPostureHTML(today);
  else if (tab === 'outfit') html = renderLooksOutfitHTML(today);
  else if (tab === 'makeup') html = renderLooksMakeupHTML(today);
  const mount = page.querySelector('#looks-content');
  if (mount) mount.innerHTML = html;
  if (tab === 'skin') bindLooksSkin(page, today);
  else if (tab === 'posture') bindLooksPosture(page, today);
  else if (tab === 'outfit') bindLooksOutfit(page, today);
  else if (tab === 'makeup') bindLooksMakeup(page, today);
}

// 4 标签：直接复用通用 domain 模板顶部的 hero 标签（data-tagfilter）作为分段切换
// 点击行为由 renderDomainPage 内的 tag click 处理器 special-case 为 switchLooksTabContent
function switchLooksTabContent(page, activeName) {
  state.domainTagFilter = state.domainTagFilter || {};
  state.domainTagFilter.looks = activeName;
  // 同步 hero 标签的 active 态
  page.querySelectorAll('[data-tagfilter]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tagfilter === activeName);
  });
  const tabKey = LOOKS_TAB_KEYS[activeName] || 'skin';
  renderLooksContentArea(page, tabKey);
  updateLooksStatBoxes(page, activeName);
}

// 对外：挂载到 domain 页面（由 renderDomainPage('外貌') 调用）
// 移除通用「工具/资产 + 每日打卡」card，在 stat-boxes 之后插入 #looks-content 容器，
// 并把当前激活 tab 的内容渲染进去。顶部 4 个 hero 标签即作为分段切换控件。
function mountLooksTabIntoPage(page) {
  page.dataset.looksMode = '1';
  const stat = page.querySelector('.stat-boxes');
  if (!stat) return;
  // 移除通用 sections（工具/资产、每日打卡、健康模块、insight 等）
  page.querySelectorAll('.soft-card').forEach(sc => {
    if (sc.querySelector('#domain-tasks') || sc.querySelector('.review-datebar') || sc.querySelector('#domain-tools') || sc.querySelector('.health-module-card') || sc.id === 'domain-extra' || sc.id === 'domain-mount' || sc.id === 'domain-insight-card') sc.remove();
  });
  // 插入 looks 内容容器
  let mount = page.querySelector('#looks-content');
  if (!mount) {
    mount = document.createElement('div');
    mount.id = 'looks-content';
    stat.insertAdjacentElement('afterend', mount);
  }
  // 同步 hero 标签 active
  const activeName = (state.domainTagFilter && state.domainTagFilter.looks) || '护肤';
  page.querySelectorAll('[data-tagfilter]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tagfilter === activeName);
  });
  // 渲染当前 tab
  renderLooksContentArea(page, LOOKS_TAB_KEYS[activeName] || 'skin');
  // 更新顶部 stat 卡片为本 tab 的数据
  updateLooksStatBoxes(page, activeName);
}

function updateLooksStatBoxes(page, activeName) {
  const tab = LOOKS_TAB_KEYS[activeName] || 'skin';
  const sb = page.querySelector('.stat-boxes');
  if (!sb) return;
  const v1 = sb.children[0].querySelector('.stb-val');
  const v2 = sb.children[1].querySelector('.stb-val');
  const v3 = sb.children[2].querySelector('.stb-val');
  if (v1) v1.textContent = getLooksTotalPts(tab);
  if (v2) v2.textContent = getLooksStreak(tab);
  if (v3) v3.textContent = getLooksTodayPct(tab) + '%';
}

// v9258.1：打卡后原位刷新统计（不整卡重绘，避免卡顿）
function refreshLooksStatsUI(page, tab) {
  const s = getLooksWeekStats(tab);
  const q = (sel) => page.querySelector(sel);
  const num = q('[data-lk-week-num]');
  if (num) num.textContent = s.days;
  const rate = q('[data-lk-week-rate]');
  if (rate) rate.textContent = '天打卡 · 完成率 ' + Math.round(s.days / 7 * 100) + '%';
  const extra = q('[data-lk-week-extra]');
  if (extra) {
    let e = '累计 +' + s.totalPts + ' 分' + s.extra;
    if (tab === 'outfit') e += ' · 灵感 ' + getLooksInspirationCount('outfit');
    else if (tab === 'makeup') e += ' · 用品 ' + (state.looksMakeup.products || []).length;
    extra.textContent = e;
  }
  page.querySelectorAll('[data-lk-dot]').forEach((d, i) => {
    d.classList.toggle('on', !!(s.dots[i] && s.dots[i].has));
  });
  const meta = q('[data-lk-meta]');
  if (meta) {
    if (tab === 'outfit') {
      const c = state.looksOutfit.checkin[getTodayKey()] || {};
      meta.textContent = c.style ? '+' + getLooksTodayPts('outfit') + ' 分' : '未记录';
    } else {
      meta.textContent = '+' + getLooksTodayPts(tab) + ' 分';
    }
  }
  if (tab === 'skin') {
    const c = state.looksSkin.checkin[getTodayKey()] || {};
    const states = page.querySelectorAll('.lk-period-state');
    if (states[0]) { states[0].textContent = c.morning ? '已完成' : '待完成'; states[0].classList.toggle('on', !!c.morning); }
    if (states[1]) { states[1].textContent = c.night ? '已完成' : '待完成'; states[1].classList.toggle('on', !!c.night); }
  }
  if (tab === 'posture') {
    const c = state.looksPosture.checkin[getTodayKey()] || {};
    const min = q('[data-pose-min]');
    if (min && !(c.duration)) {
      const sum = c.trainings ? Object.values(c.trainings).reduce((a, v) => a + (v | 0), 0) : 0;
      min.value = sum;
    }
  }
  // 顶部统计卡（积分/连签/今日进度）
  updateLooksStatBoxes(page, LOOKS_TAB_NAME[tab]);
}

// v9258.1：打卡后原位刷新统计（不整卡重绘，避免卡顿）
function refreshLooksStatsUI(page, tab) {
  const s = getLooksWeekStats(tab);
  const q = (sel) => page.querySelector(sel);
  const num = q('[data-lk-week-num]');
  if (num) num.textContent = s.days;
  const rate = q('[data-lk-week-rate]');
  if (rate) rate.textContent = '天打卡 · 完成率 ' + Math.round(s.days / 7 * 100) + '%';
  const extra = q('[data-lk-week-extra]');
  if (extra) {
    let e = '累计 +' + s.totalPts + ' 分' + s.extra;
    if (tab === 'outfit') e += ' · 灵感 ' + getLooksInspirationCount('outfit');
    else if (tab === 'makeup') e += ' · 用品 ' + (state.looksMakeup.products || []).length;
    extra.textContent = e;
  }
  page.querySelectorAll('[data-lk-dot]').forEach((d, i) => {
    d.classList.toggle('on', !!(s.dots[i] && s.dots[i].has));
  });
  const meta = q('[data-lk-meta]');
  if (meta) {
    if (tab === 'outfit') {
      const c = state.looksOutfit.checkin[getTodayKey()] || {};
      meta.textContent = c.style ? '+' + getLooksTodayPts('outfit') + ' 分' : '未记录';
    } else {
      meta.textContent = '+' + getLooksTodayPts(tab) + ' 分';
    }
  }
  if (tab === 'skin') {
    const c = state.looksSkin.checkin[getTodayKey()] || {};
    const states = page.querySelectorAll('.lk-period-state');
    if (states[0]) { states[0].textContent = c.morning ? '已完成' : '待完成'; states[0].classList.toggle('on', !!c.morning); }
    if (states[1]) { states[1].textContent = c.night ? '已完成' : '待完成'; states[1].classList.toggle('on', !!c.night); }
  }
  if (tab === 'posture') {
    const c = state.looksPosture.checkin[getTodayKey()] || {};
    const min = q('[data-pose-min]');
    if (min && !(c.duration)) {
      const sum = c.trainings ? Object.values(c.trainings).reduce((a, v) => a + (v | 0), 0) : 0;
      min.value = sum;
    }
  }
  // 顶部统计卡（积分/连签/今日进度）
  updateLooksStatBoxes(page, LOOKS_TAB_NAME[tab]);
}

// 暴露
window.__looksModuleLoaded = true;

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
      <div class="domain-head">
        <div class="domain-icon">${icon(cfg.icon, 24)}</div>
        <div>
          <h3 class="domain-title">${name}</h3>
          <p class="domain-subtitle">${cfg.subtitle}</p>
        </div>
      </div>
      ${cfg.tags && cfg.tags.length ? `<div class="domain-tags tag-filter">${cfg.tags.map(t => `<button class="tag-chip${activeTag === t ? ' active' : ''}" data-tagfilter="${escapeHTML(t)}">${escapeHTML(t)}</button>`).join('')}</div>` : ''}
    </div>

    ${dateBarHTML(viewKey, { id: 'domain-date-trigger' })}

    <div class="stat-boxes">
      <div class="stat-box">
        <div class="stb-val">${getDomainPoints(key)}</div><div class="stb-label">累计积分</div>
      </div>
      <div class="stat-box">
        <div class="stb-val">${getDomainStreak(key)}</div><div class="stb-label">连续天数</div>
      </div>
      <div class="stat-box">
        <div class="stb-val">${percent}%</div><div class="stb-label">${readOnly ? viewKey.slice(5) : '今日进度'}</div>
      </div>
    </div>

    <div class="soft-card" id="domain-extra" hidden></div>

    ${name === '健康' ? `
    <div class="soft-card health-module-card">
      <div class="soft-card-title">${icon('leaf', 16)} 健康模块</div>
      <div class="tool-grid">
        <button class="tool-btn" data-route="健身">
          <span class="tb-icon">${icon('dumbbell', 18)}</span>
          <span><b>健身训练</b><span class="tb-sub">运动</span></span>
          <span class="tb-arrow">${icon('chevronLeft', 12)}</span>
        </button>
        <button class="tool-btn" data-route="饮食">
          <span class="tb-icon">${icon('utensils', 18)}</span>
          <span><b>饮食记录</b><span class="tb-sub">食材库存管理</span></span>
          <span class="tb-arrow">${icon('chevronLeft', 12)}</span>
        </button>
      </div>
    </div>
    ` : `
    <div class="soft-card">
      <div class="soft-card-title">${icon('briefcase', 16)} 工具 / 资产</div>
      <div class="tool-grid" id="domain-tools"></div>
    </div>
    `}

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

  // v9258：外貌页 — 挂载 4 标签内容（护肤/仪态/穿搭/妆容）
  if (name === '外貌') mountLooksTabIntoPage(page);

  // 任务3：本周领域洞察移到页面最下方（所有 body 数据卡之后）
  const insightCard = page.querySelector('#domain-insight-card');
  if (insightCard && (key === 'health' || key === 'money')) {
    insightCard.innerHTML = renderDomainInsight(key, name);
    insightCard.hidden = false;
  }


  // 日期导航：全局统一日期组件
  bindDateBar(page, {
    onShift: (d) => { state.viewDate = shiftDate(viewKey, d); renderContent(); },
    onPick: (k) => { state.viewDate = k; renderContent(); },
    onToday: () => { state.viewDate = ''; renderContent(); }
  });

  // 标签筛选
  page.querySelectorAll('[data-tagfilter]').forEach(btn => {
    btn.addEventListener('click', () => {
      // v9258：外貌页的 4 个标签作为分段切换（护肤/仪态/穿搭/妆容），不 toggle
      if (key === 'looks') {
        switchLooksTabContent(page, btn.dataset.tagfilter);
        return;
      }
      if (!state.domainTagFilter) state.domainTagFilter = {};
      state.domainTagFilter[key] = state.domainTagFilter[key] === btn.dataset.tagfilter ? '' : btn.dataset.tagfilter;
      renderContent();
    });
  });

  // 选中分类标签时高亮对应「每日打卡」卡片区域（border 变主色、背景加浅主色）
  const tasksCard = page.querySelector('#domain-tasks') && page.querySelector('#domain-tasks').closest('.soft-card');
  if (tasksCard) tasksCard.classList.toggle('tag-highlight', !!activeTag);

  // 工具入口（健康领域替换为健身/饮食大卡片）
  const tools = page.querySelector('#domain-tools');
  if (tools) {
    (cfg.tools || []).forEach(tool => {
      const btn = document.createElement('button');
      btn.className = 'tool-btn';
      btn.innerHTML = `<span class="tb-icon">${icon(tool.icon, 18)}</span><span><b>${escapeHTML(tool.name)}</b><span class="tb-sub">${escapeHTML(tool.sub)}</span></span>`;
      btn.addEventListener('click', () => {
        if (tool.action === 'focus') { openFocusModal(); return; }
        selectItem(tool.target);
      });
      tools.appendChild(btn);
    });
  }
  page.querySelectorAll('.tool-btn[data-route]').forEach(card => {
    card.addEventListener('click', () => selectItem(card.dataset.route));
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
        <span class="task-check"><svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg></span>
        <span class="task-text">${escapeHTML(task.text)}</span>
        <span class="task-points">+${task.points}</span>
        ${readOnly ? '' : `<button class="item-delete" data-del-type="domain-task" data-id="${task.id}" data-domain="${key}" aria-label="删除"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>`}
      `;
      if (!readOnly) {
        row.addEventListener('click', (e) => {
          if (e.target.closest('.item-delete')) return;
          // v9258.1：原位更新（不整页重绘，打卡更跟手）
          toggleDomainTask(key, task.id, {
            inPlace: true,
            onDone: () => {
              row.classList.toggle('done', task.done);
              updateDomainPageStatUI(page, key);
            }
          });
        });
      }
      taskList.appendChild(row);
    });
    showPlans.forEach(plan => {
      const row = document.createElement('div');
      row.className = 'task-row plan-task-row' + (plan.done ? ' done' : '');
      row.innerHTML = `
        <span class="task-check"><svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg></span>
        <span class="task-text">${escapeHTML(plan.text)}</span>
        <span class="task-points">+${plan.points}</span>
        <button class="item-delete" data-id="${plan.id}" data-del-type="plan" aria-label="删除"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>
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

// v9258.1：domain 页每日打卡原位刷新统计卡 + 今日积分 meta
function updateDomainPageStatUI(page, key) {
  const domain = ensureDomain(key);
  const today = getTodayKey();
  const isToday = !state.viewDate || state.viewDate === today;
  const viewKey = state.viewDate || today;
  const historical = state.domainHistory[viewKey] && state.domainHistory[viewKey][key];
  const viewTasks = (!isToday && historical) ? historical.tasks : domain.tasks;
  const doneCount = viewTasks.filter(t => t.done).length;
  const totalCount = viewTasks.length;
  const percent = totalCount ? Math.round(doneCount / totalCount * 100) : 0;
  const sb = page.querySelector('.stat-boxes');
  if (sb) {
    const boxes = sb.children;
    if (boxes[0]) { const v = boxes[0].querySelector('.stb-val'); if (v) v.textContent = getDomainPoints(key); }
    if (boxes[1]) { const v = boxes[1].querySelector('.stb-val'); if (v) v.textContent = getDomainStreak(key); }
    if (boxes[2]) { const v = boxes[2].querySelector('.stb-val'); if (v) v.textContent = percent + '%'; }
  }
  const meta = page.querySelector('.stitle-meta');
  if (meta && isToday) meta.textContent = '今日 +' + (domain.log[today] || 0) + ' 分';
}

// v9258.1：domain 页每日打卡原位刷新统计卡 + 今日积分 meta
function updateDomainPageStatUI(page, key) {
  const domain = ensureDomain(key);
  const today = getTodayKey();
  const isToday = !state.viewDate || state.viewDate === today;
  const viewKey = state.viewDate || today;
  const historical = state.domainHistory[viewKey] && state.domainHistory[viewKey][key];
  const viewTasks = (!isToday && historical) ? historical.tasks : domain.tasks;
  const doneCount = viewTasks.filter(t => t.done).length;
  const totalCount = viewTasks.length;
  const percent = totalCount ? Math.round(doneCount / totalCount * 100) : 0;
  const sb = page.querySelector('.stat-boxes');
  if (sb) {
    const boxes = sb.children;
    if (boxes[0]) { const v = boxes[0].querySelector('.stb-val'); if (v) v.textContent = getDomainPoints(key); }
    if (boxes[1]) { const v = boxes[1].querySelector('.stb-val'); if (v) v.textContent = getDomainStreak(key); }
    if (boxes[2]) { const v = boxes[2].querySelector('.stb-val'); if (v) v.textContent = percent + '%'; }
  }
  const meta = page.querySelector('.stitle-meta');
  if (meta && isToday) meta.textContent = '今日 +' + (domain.log[today] || 0) + ' 分';
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

function toggleDomainTask(key, taskId, opts) {
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
  if (opts && opts.inPlace) { if (opts.onDone) opts.onDone(); return; }
  renderContent();
}

// ============ 每日计划 ============
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
    ${dateBarHTML(dateKey, { id: 'review-date-trigger' })}

    <div class="review-stats">
      <div class="review-stat" data-jump="每日计划"><div class="rs-val">${isToday ? prog.done : '-'}</div><div class="rs-label">完成任务</div></div>
      <div class="review-stat" data-jump="本周洞察"><div class="rs-val">${focusMin}</div><div class="rs-label">专注分钟</div></div>
      <div class="review-stat" data-jump="成就殿堂"><div class="rs-val gold">${dayPoints}</div><div class="rs-label">当日积分</div></div>
      <div class="review-stat" data-jump="本周洞察"><div class="rs-val">${calcStreak()}</div><div class="rs-label">连续天数</div></div>
    </div>

    <div id="review-plan-mount"></div>

    <div class="soft-card">
      <div class="soft-card-title">${icon('note', 16)} 反思与规划</div>
      <textarea class="soft-textarea" id="rv-reflection" placeholder="今天做得好的三件事 / 可以改进的一件事 / 明天最重要的一件事...">${escapeHTML(review.reflection || '')}</textarea>
      <div class="focus-actions" style="margin-top:10px;">
        <button class="gold-btn" id="rv-save">保存</button>
      </div>
    </div>
  `;
  content.appendChild(page);

  // 复盘页内嵌当日/历史计划模块（嵌入模式不再重复渲染日期栏，统一用页面级日期组件）
  if (isToday) {
    renderDailyPlan(page.querySelector('#review-plan-mount'), true);
  } else {
    renderHistoricalPlan(page.querySelector('#review-plan-mount'), dateKey);
  }

  bindDateBar(page, {
    onShift: (d) => { state.reviewDate = shiftDate(dateKey, d); renderContent(); },
    onPick: (k) => { state.reviewDate = k; renderContent(); },
    onToday: () => { state.reviewDate = getTodayKey(); renderContent(); }
  });

  page.querySelectorAll('[data-jump]').forEach(el => {
    el.addEventListener('click', () => selectItem(el.dataset.jump));
  });

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
        <button class="item-delete" data-del="${item.id}" aria-label="删除" style="margin-left:6px;"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>
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

async function redeemReward(id) {
  const item = state.rewards.items.find(r => r.id === id);
  if (!item) return;
  if (getAvailablePoints() < item.cost) {
    await appAlert('积分不足，再攒攒吧');
    return;
  }
  if (!await appConfirm(`确认用 ${item.cost} 积分兑换「${item.name}」？`)) return;
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

function openInfoModal(title, htmlBody, iconHtml = '') {
  const modal = document.createElement('div');
  modal.className = 'modal xn-modal active';
  modal.style.zIndex = '250';
  modal.innerHTML = `
    <div class="modal-card xn-info-card">
      ${iconHtml ? `<div class="xn-modal-icon">${iconHtml}</div>` : ''}
      <h3 class="xn-modal-title">${escapeHTML(title)}</h3>
      <div class="xn-info-body">${htmlBody}</div>
      <div class="xn-modal-actions">
        <button class="xn-btn xn-btn-primary xn-info-close">知道啦</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  const close = () => { modal.remove(); document.removeEventListener('keydown', onKey); };
  const onKey = (e) => { if (e.key === 'Enter' || e.key === 'Escape') close(); };
  modal.querySelector('.xn-info-close').onclick = close;
  modal.onclick = (e) => { if (e.target === modal) close(); };
  document.addEventListener('keydown', onKey);
}

function openPointBreakdownModal() {
  const items = [
    { name: '摄影审美', icon: 'camera', value: getSlowModulePoints('photography') },
    { name: '技能考证', icon: 'scroll', value: getSlowModulePoints('cert') },
    { name: '家居整理', icon: 'home', value: getSlowModulePoints('homeorg') },
    { name: '音乐练习', icon: 'music', value: getSlowModulePoints('music') },
    { name: '生活秩序', icon: 'layers', value: getLifeOrderPoints() },
    { name: '内在成长', icon: 'leaf', value: getInnerGrowthPoints() },
    { name: '旅行体验', icon: 'plane', value: getTravelPoints() },
    { name: '社交拓展', icon: 'message', value: getSocialPoints() },
    { name: '英语学习', icon: 'language', value: getLanguagePoints() },
    { name: '奖励池兑换', icon: 'gift', value: -getSpentPoints(), spent: true }
  ];
  const body = items.map(it => `
    <div class="point-row">
      <div class="point-icon">${icon(it.icon, 15)}</div>
      <div class="point-name">${it.name}</div>
      <div class="point-val${it.spent ? ' spent' : ''}">${it.spent ? '' : '+'}${it.value} 分</div>
    </div>
  `).join('') + `
    <div class="point-row" style="border-top:1px dashed var(--border); margin-top:4px; padding-top:12px;">
      <div class="point-icon">${icon('coins', 15)}</div>
      <div class="point-name">当前可用积分</div>
      <div class="point-val">${getAvailablePoints()} 分</div>
    </div>
  `;
  openInfoModal('积分来源明细', body, '🏆');
}

function openBadgeModal(ac) {
  const progress = Math.min(ac.need, getAchievementProgress(ac));
  const unlocked = !!state.achievements[ac.id];
  const body = `
    <div class="badge-detail">
      <div class="bd-icon">${renderItemIcon(ac.icon, 26)}</div>
      <div class="bd-name">${ac.name}</div>
      <div class="bd-desc">${ac.desc}</div>
      <div class="bd-condition">解锁条件：${progress}/${ac.need}</div>
      <div class="bd-status${unlocked ? '' : ' locked'}">${unlocked ? '✓ 已解锁' : '未解锁'}</div>
    </div>
  `;
  openInfoModal(ac.name, body);
}

function renderAchievements() {
  evaluateAchievements();
  const lv = getLevelInfo();
  const unlocked = DEFAULT_ACHIEVEMENTS.filter(a => state.achievements[a.id]).length;

  const pointRank = getPointRankingItems().sort((a, b) => b.value - a.value);
  const maxPoint = Math.max(1, pointRank[0] ? pointRank[0].value : 1);

  const page = document.createElement('div');
  page.className = 'page';
  page.innerHTML = `
    <div class="level-banner" id="level-banner" role="button" tabindex="0" aria-label="查看积分来源明细">
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
          const pct = Math.round((progress / ac.need) * 100);
          return `
            <div class="achieve-card${on ? ' unlocked' : ''}" data-badge-id="${ac.id}" role="button" tabindex="0" aria-label="${escapeHTML(ac.name)}">
              <div class="ac-icon-wrap">${renderItemIcon(ac.icon, 20)}</div>
              <div class="ac-name">${ac.name}</div>
              <div class="ac-desc">${on ? '已完成 · ' + ac.desc : `${progress}/${ac.need}`}</div>
              ${on ? '' : `<div class="ac-progress"><div class="ac-progress-fill" style="width:${pct}%"></div></div>`}
            </div>
          `;
        }).join('')}
      </div>
    </div>

    <div class="soft-card">
      <div class="soft-card-title">${icon('chart', 16)} 积分来源排行</div>
      <div class="bar-list">
        ${pointRank.map(d => `
          <div class="bar-row">
            <span class="bar-name"><span class="bar-ico">${icon(d.icon, 13)}</span>${d.name}</span>
            <span class="bar-track"><span class="bar-fill" style="width:${Math.round((d.value / maxPoint) * 100)}%"></span></span>
            <span class="bar-val">${d.value} 分</span>
          </div>
        `).join('')}
      </div>
    </div>
  `;
  content.appendChild(page);

  const banner = page.querySelector('#level-banner');
  banner.addEventListener('click', openPointBreakdownModal);
  banner.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openPointBreakdownModal(); } });

  page.querySelectorAll('.achieve-card').forEach(card => {
    const onClick = () => {
      const ac = DEFAULT_ACHIEVEMENTS.find(a => a.id === card.dataset.badgeId);
      if (ac) openBadgeModal(ac);
    };
    card.addEventListener('click', onClick);
    card.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } });
  });
}

// ============ 系统面板 ============
function renderSystemPanel() {
  const lv = getLevelInfo();
  const prog = getTodayProgress();
  const page = document.createElement('div');
  page.className = 'page';

  const cells = [
    { name: '每日计划', icon: 'review', meta: `${getReviewCount()} 次`, target: '每日计划' },
    { name: '本周洞察', icon: 'chart', meta: `Lv.${lv.level}`, target: '本周洞察' },
    { name: '奖励池', icon: 'rewards', meta: `${getAvailablePoints()} 分可用`, target: '奖励池' },
    { name: '成就殿堂', icon: 'trophy', meta: `${DEFAULT_ACHIEVEMENTS.filter(a => state.achievements[a.id]).length} 枚徽章`, target: '成就殿堂' },
    { name: '当日计划', icon: 'calendar', meta: `${prog.done}/${prog.total}`, target: '每日计划' },
    { name: '饮食', icon: 'utensils', meta: `${getDietTotals().total} kcal`, target: '饮食' },
    { name: '健身', icon: 'dumbbell', meta: `${getTodayExerciseMinutes()} 分钟`, target: '健身' },
    { name: '记账', icon: 'coins', meta: `¥${formatMoney(calcAssetTotal())}`, target: '记账' },
    { name: '自我介绍', icon: 'user', meta: state.profile.name || '未填写', target: '自我介绍' },
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

// 成长提升：内联编辑态（不持久化，仅控制当前页表单）
// ============ 自我介绍 ============
function renderSelfIntro() {
  const p = state.profile;
  const fields = [
    { key: 'name', label: '名字' },
    { key: 'age', label: '年龄' },
    { key: 'job', label: '职业' },
    { key: 'hobby', label: '爱好' },
    { key: 'skill', label: '技能' }
  ];

  const page = document.createElement('div');
  page.className = 'page';
  page.innerHTML = `
    <div class="domain-hero">
      <div class="domain-head">
        <div class="domain-icon">${icon('user', 24)}</div>
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
      <div class="soft-card-title">${icon('layers', 16)} 模块开关</div>
      <div class="setting-row">
        <div class="setting-label">旅行体验<small>低精力版 · 当天往返、不用过夜</small></div>
        <div class="xn-toggle ${s.moduleTravel !== false ? 'on' : ''}" data-mod="travel" role="switch" tabindex="0" aria-checked="${s.moduleTravel !== false}"><span class="xn-knob"></span></div>
      </div>
      <div class="setting-row">
        <div class="setting-label">社交拓展<small>低精力版 · 只维系舒服的旧关系</small></div>
        <div class="xn-toggle ${s.moduleSocial !== false ? 'on' : ''}" data-mod="social" role="switch" tabindex="0" aria-checked="${s.moduleSocial !== false}"><span class="xn-knob"></span></div>
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

  page.querySelector('#st-save').addEventListener('click', async () => {
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
    await appAlert('设置已保存', { icon: 'sparkle' });
  });

  page.querySelectorAll('.focus-preset').forEach(btn => {
    btn.addEventListener('click', () => {
      setFocusPreset(Number(btn.dataset.min));
      renderContent();
    });
  });

  page.querySelector('#st-export').addEventListener('click', exportData);
  page.querySelector('#st-import').addEventListener('click', () => importFile.click());

  page.querySelector('#st-reset-menu').addEventListener('click', async () => {
    if (!await appConfirm('确认恢复默认菜单结构？自定义分组会丢失。')) return;
    localStorage.removeItem('xenos-groups');
    state.groups = loadGroups();
    saveGroups();
    state.activeItem = '工作台首页';
    renderMenu();
    renderContent();
    renderMobileTabs();
  });

  page.querySelector('#st-reset-all').addEventListener('click', async () => {
    if (!await appConfirm('确认清空全部数据？此操作不可恢复！', { danger: true })) return;
    if (!await appConfirm('再次确认：所有记录都会被删除。', { danger: true })) return;
    Object.keys(localStorage)
      .filter(k => k.startsWith('xenos-'))
      .forEach(k => localStorage.removeItem(k));
    location.reload();
  });

  page.querySelectorAll('.xn-toggle[data-mod]').forEach(tg => {
    const flip = () => {
      const mod = tg.dataset.mod;
      const key = mod === 'travel' ? 'moduleTravel' : 'moduleSocial';
      s[key] = s[key] === false;
      tg.classList.toggle('on', s[key] !== false);
      tg.setAttribute('aria-checked', s[key] !== false ? 'true' : 'false');
      saveSettings();
      state.groups = loadGroups();
      saveGroups();
      renderMenu();
      renderMobileTabs();
    };
    tg.addEventListener('click', flip);
    tg.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); flip(); } });
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
  reader.onload = async () => {
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
      await appAlert('导入成功，数据已同步', { icon: '✅' });
    } catch (err) {
      await appAlert('导入失败，请检查 JSON 格式', { icon: '⚠️' });
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

// 注：移动端左边缘右滑返回由 initSwipeBack()（见上）统一处理，
// 此处不再保留旧版 sidebar 滑入手势，避免与返回手势冲突（一次右滑双重触发）。
// 侧边栏仍可通过左上角 menu-toggle 按钮打开。

// 长按显示列表项删除按钮（统一行为：任务/计划/运动/项目/语音/奖励）
(function initLongPressDelete() {
  let timer = null;
  let activeRow = null;
  const SELECTOR = '.task-row, .plan-item, .exercise-row, .proj-task, .voice-item, .reward-row, .br-branch-card, .study-plan-item, .eng-task-row, .module-list-item';
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
    if (e.target.closest('.item-delete, .icon-action, .plan-item-actions, .br-next-btn, .module-edit-btn, .module-del-btn, .module-item-actions')) return;
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

// ---------- 左边缘右滑返回手势 ----------
initSwipeBack();

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
  // ---- 生活秩序：晨间 / 晚间 ----
  if (type === 'order-morning' || type === 'order-evening') {
    const arr = type === 'order-morning' ? state.order.morning : state.order.evening;
    const a = arr.find(x => x.id === id);
    if (a && a.done && a.date === getTodayKey()) {
      state.points = Math.max(0, (state.points || 0) - a.points);
      state.order.log[getTodayKey()] = Math.max(0, (state.order.log[getTodayKey()] || 0) - a.points);
      savePoints();
    }
    if (type === 'order-morning') state.order.morning = arr.filter(x => x.id !== id);
    else state.order.evening = arr.filter(x => x.id !== id);
    saveOrder();
    renderContent();
    return;
  }
  // ---- 内在成长：今日觉察 ----
  if (type === 'growth-awareness') {
    const a = state.growth.awareness.find(x => x.id === id);
    if (a && a.done && a.date === getTodayKey()) {
      state.points = Math.max(0, (state.points || 0) - a.points);
      state.growth.log[getTodayKey()] = Math.max(0, (state.growth.log[getTodayKey()] || 0) - a.points);
      savePoints();
    }
    state.growth.awareness = state.growth.awareness.filter(x => x.id !== id);
    saveGrowth();
    renderContent();
    return;
  }
  // ---- 旅行：本周行动 / 想去的地方 ----
  if (type === 'travel-action' || type === 'travel-place') {
    const ph = state.travel.phases[del.dataset.phase];
    if (ph) {
      if (type === 'travel-action') {
        const a = ph.actions.find(x => x.id === id);
        if (a && a.done && a.date === getTodayKey()) {
          state.points = Math.max(0, (state.points || 0) - a.points);
          state.travel.log[getTodayKey()] = Math.max(0, (state.travel.log[getTodayKey()] || 0) - a.points);
          savePoints();
        }
        ph.actions = ph.actions.filter(x => x.id !== id);
      } else {
        const p = ph.places.find(x => x.id === id);
        if (p && p.status === '已出发' && p.points > 0) {
          state.points = Math.max(0, (state.points || 0) - p.points);
          state.travel.log[getTodayKey()] = Math.max(0, (state.travel.log[getTodayKey()] || 0) - p.points);
          savePoints();
        }
        ph.places = ph.places.filter(x => x.id !== id);
      }
      saveTravel();
    }
    renderContent();
    return;
  }
  // ---- 社交：本周行动 ----
  if (type === 'social-action') {
    const a = state.social.actions.find(x => x.id === id);
    if (a) {
      if (a.text.includes('老朋友') && a.done) state.social.contactsThisWeek = Math.max(0, (state.social.contactsThisWeek || 0) - 1);
      if (a.done) {
        state.points = Math.max(0, (state.points || 0) - a.points);
        state.social.log[getTodayKey()] = Math.max(0, (state.social.log[getTodayKey()] || 0) - a.points);
        savePoints();
      }
      state.social.actions = state.social.actions.filter(x => x.id !== id);
      saveSocial();
    }
    renderContent();
    return;
  }
  // ---- 护肤：步骤 ----
  if (type === 'skincare-item') {
    const g = state.skincare.routine.find(x => x.id === del.dataset.group);
    if (g) {
      g.items = g.items.filter(x => x.id !== id);
      saveSkincare();
    }
    renderContent();
    return;
  }
});

// 列表项长按编辑：点击 ✎ 编辑器文字（生活秩序/内在成长/旅行/社交/护肤 任务条目）
document.addEventListener('click', async (e) => {
  const btn = e.target.closest('.module-edit-btn');
  if (!btn) return;
  e.preventDefault();
  e.stopPropagation();
  const id = btn.dataset.editId;
  const type = btn.dataset.editType;
  const today = getTodayKey();
  if (type === 'order-morning' || type === 'order-evening') {
    const arr = type === 'order-morning' ? state.order.morning : state.order.evening;
    const a = arr.find(x => x.id === id); if (!a) return;
    const v = await openModal('编辑文字', a.text, ''); if (v === null) return;
    a.text = v.trim() || a.text; saveOrder();
  } else if (type === 'growth-awareness') {
    const a = state.growth.awareness.find(x => x.id === id); if (!a) return;
    const v = await openModal('编辑文字', a.text, ''); if (v === null) return;
    a.text = v.trim() || a.text; saveGrowth();
  } else if (type === 'travel-action') {
    const ph = state.travel.phases[btn.dataset.phase]; if (!ph) return;
    const a = ph.actions.find(x => x.id === id); if (!a) return;
    const v = await openModal('编辑文字', a.text, ''); if (v === null) return;
    a.text = v.trim() || a.text; saveTravel();
  } else if (type === 'travel-place') {
    const ph = state.travel.phases[btn.dataset.phase]; if (!ph) return;
    const p = ph.places.find(x => x.id === id); if (!p) return;
    const v = await openModal('编辑地点名称', p.name, ''); if (v === null) return;
    p.name = v.trim() || p.name; saveTravel();
  } else if (type === 'social-action') {
    const a = state.social.actions.find(x => x.id === id); if (!a) return;
    const v = await openModal('编辑文字', a.text, ''); if (v === null) return;
    a.text = v.trim() || a.text; saveSocial();
  } else if (type === 'skincare-item') {
    const g = state.skincare.routine.find(x => x.id === btn.dataset.group); if (!g) return;
    const it = g.items.find(x => x.id === id); if (!it) return;
    const v = await openModal('编辑文字', it.text, ''); if (v === null) return;
    it.text = v.trim() || it.text; saveSkincare();
  } else if (type === 'slow-task-pts') {
    const key = btn.dataset.editKey;
    const m = state[key]; if (!m) return;
    const t = (m.tasks || []).find(x => x.id === id); if (!t) return;
    const v = await openModal('编辑任务积分', String(t.points || 3), '请输入积分（数字，上限 30）');
    if (v === null) return;
    const n = parseInt(v, 10);
    if (isNaN(n) || n < 0) { toast('请输入有效的积分数字'); return; }
    t.points = Math.min(30, n);
    if (SLOW_MODULE_DEF[key]) SLOW_MODULE_DEF[key].save();
    renderContent();
  } else {
    return;
  }
  renderContent();
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
  const today = getTodayKey();
  // 一次性迁移：给旧账户补齐 balance / balanceDate（以今天为对账基准）
  if (localStorage.getItem('xenos-asset-reconcile-v9160') === null) {
    state.assetAccounts.forEach(acc => {
      if (typeof acc.balance !== 'number') {
        acc.balance = acc.debt ? -Math.abs(Number(acc.amount) || 0) : Math.abs(Number(acc.amount) || 0);
      }
      if (!acc.balanceDate) acc.balanceDate = today;
    });
    localStorage.setItem('xenos-asset-reconcile-v9160', '1');
    saveAssetAccounts();
  }
  const assetTotal = calcAssetTotal();
  if (assetTotal === 0 && state.money.total > 0) {
    const balance = state.assetAccounts.find(a => a.id === 'balance');
    if (balance) {
      balance.balance = state.money.total;
      balance.balanceDate = today;
    }
    saveAssetAccounts();
  }
  syncAssetAmounts();
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
initGlobalBackButtons();
// v9259.1：非首屏关键初始化延后一帧，让页面先出现
setTimeout(function () {
  initDragHandlers();
  bindFocusDial();
  renderStreak();
  evaluateAchievements();
  updateFocusUI();
}, 0);

// 每分钟刷新一次问候语与顶栏日期
setInterval(renderTopbar, 60 * 1000);

if ('serviceWorker' in navigator && navigator.serviceWorker) {
  // v9286：注册 URL 跟随 BUILT 变化（强制 iOS Safari 重新下载 sw.js）
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js?v=' + (typeof BUILT !== 'undefined' ? BUILT : 'r'), { updateViaCache: 'none' })
      .then((reg) => { reg.update(); })
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
function miniRingHTML(percent, colorClass, num, label, strokeColor) {
  const r = 28, c = 2 * Math.PI * r;
  percent = Math.max(0, Math.min(100, percent || 0));
  const strokeStyle = strokeColor ? `;stroke:${strokeColor}` : '';
  return `<div class="mini-ring ${colorClass}">
    <svg viewBox="0 0 64 64">
      <circle class="mr-bg" cx="32" cy="32" r="${r}"></circle>
      <circle class="mr-fg" cx="32" cy="32" r="${r}" style="stroke-dasharray:${c.toFixed(1)};stroke-dashoffset:${(c * (1 - percent / 100)).toFixed(1)}${strokeStyle}"></circle>
    </svg>
    <div class="mr-num"><span class="mr-num-main">${num}</span><small>${label}</small></div>
  </div>`;
}

function inlineSparkline(values, color, fillOpacity, fillTo, padX) {
  if (!values || values.length < 2) return '<p class="chart-empty">数据不足</p>';
  const w = 260, h = 44, pad = { l: (padX == null ? 4 : padX), r: (padX == null ? 4 : padX), t: 6, b: 4 };
  const max = Math.max(...values), min = Math.min(...values);
  const range = (max - min) || 1;
  const x = i => pad.l + (i / (values.length - 1)) * (w - pad.l - pad.r);
  // 高度起伏压缩到 0.75：以中线为中心、整体峰谷幅度 × 0.75（v9222）
  const chartH = h - pad.t - pad.b;
  const y = v => pad.t + chartH * 0.5 + (0.5 - (v - min) / range) * chartH * 0.75;
  const pts = values.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  const area = `${pad.l},${h - pad.b} ${pts} ${w - pad.r},${h - pad.b}`;
  const dots = values.map((v, i) => `<circle cx="${x(i).toFixed(1)}" cy="${y(v).toFixed(1)}" r="2" fill="#fff" stroke="${color}" stroke-width="1"></circle>`).join('');
  if (fillTo) {
    const gradId = 'spark-' + Math.random().toString(36).slice(2, 8);
    return `<svg class="spark-chart" viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMid meet">
      <defs><linearGradient id="${gradId}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="${color}" stop-opacity="0.22"/>
        <stop offset="55%" stop-color="${color}" stop-opacity="0.08"/>
        <stop offset="100%" stop-color="${fillTo}" stop-opacity="0.00"/>
      </linearGradient></defs>
      <polygon points="${area}" fill="url(#${gradId})"></polygon>
      <polyline points="${pts}" fill="none" stroke="${color}" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"></polyline>
      ${dots}
    </svg>`;
  }
  return `<svg class="spark-chart" viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMid meet">
    <polygon points="${area}" fill="${color}" opacity="${fillOpacity == null ? 0.10 : fillOpacity}"></polygon>
    <polyline points="${pts}" fill="none" stroke="${color}" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"></polyline>
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
    return `<circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="2.1" fill="#fff" stroke="${colorB}" stroke-width="1"></circle>`;
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
    <polyline points="${ptsA}" fill="none" stroke="${colorA}" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"></polyline>
    <polyline points="${ptsB}" fill="none" stroke="${colorB}" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"></polyline>
    ${dotsA}
    ${dotsB}
    ${valueLabelsA}
    ${valueLabelsB}
    ${xLabels}
  </svg>`;
}

function weeklyLineChart(values, color, unit, labels) {
  const w = 320, h = 140;
  const pad = { t: 18, r: 12, b: 22, l: 26 };
  const cw = w - pad.l - pad.r, ch = h - pad.t - pad.b;
  const days = labels || ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
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
  const dots = nums.map((v, i) => '<circle cx="' + x(i).toFixed(1) + '" cy="' + y(v).toFixed(1) + '" r="1.2" fill="' + color + '" stroke="#fff" stroke-width="0.5"></circle>').join('');
  const valLabels = nums.map((v, i) => '<text x="' + x(i).toFixed(1) + '" y="' + (y(v) - 6).toFixed(1) + '" fill="' + color + '" font-size="7.5" text-anchor="middle" font-weight="600">' + Math.round(v) + '</text>').join('');
  const xLabels = days.map((d, i) => '<text x="' + x(i).toFixed(1) + '" y="' + (h - 7).toFixed(1) + '" fill="#A99A8A" font-size="8" text-anchor="middle">' + d + '</text>').join('');
  return '<svg class="insp-trend-chart" viewBox="0 0 ' + w + ' ' + h + '" preserveAspectRatio="xMidYMid meet">' + grid + yLabels + '<polyline points="' + pts + '" fill="none" stroke="' + color + '" stroke-width="0.8" stroke-linecap="round" stroke-linejoin="round"></polyline>' + dots + valLabels + xLabels + '</svg>';
}

function multiSeriesLineChart(series, labels, hiddenIds) {
  const w = 320, h = 140;
  const pad = { t: 18, r: 12, b: 22, l: 30 };
  const cw = w - pad.l - pad.r, ch = h - pad.t - pad.b;
  const days = labels || ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
  const x = i => pad.l + (i / (days.length - 1)) * cw;
  const y = v => pad.t + ch - (v / 100) * ch;
  let grid = '';
  for (let i = 0; i <= 4; i++) {
    const gy = pad.t + (i / 4) * ch;
    grid += '<line x1="' + pad.l + '" y1="' + gy.toFixed(1) + '" x2="' + (pad.l + cw) + '" y2="' + gy.toFixed(1) + '" stroke="#F5EDE5" stroke-width="0.8"></line>';
  }
  const yLabels = [0, 50, 100].map(v => '<text x="' + (pad.l - 5) + '" y="' + (pad.t + ch - (v / 100) * ch).toFixed(1) + '" fill="#B8A99A" font-size="8" text-anchor="end" dominant-baseline="middle">' + v + '%</text>').join('');
  const xLabels = days.map((d, i) => '<text x="' + x(i).toFixed(1) + '" y="' + (h - 7).toFixed(1) + '" fill="#A99A8A" font-size="8" text-anchor="middle">' + d + '</text>').join('');
  let seriesSVG = '';
  series.forEach(s => {
    const hidden = hiddenIds && hiddenIds.has(s.id);
    const vals = s.values.map(v => Number(v) || 0);
    const max = Math.max(1, ...vals);
    const pts = vals.map((v, i) => x(i).toFixed(1) + ',' + y((v / max) * 100).toFixed(1)).join(' ');
    const dots = vals.map((v, i) => '<circle cx="' + x(i).toFixed(1) + '" cy="' + y((v / max) * 100).toFixed(1) + '" r="1.6" fill="#fff" stroke="' + s.color + '" stroke-width="1"></circle>').join('');
    seriesSVG += '<g class="chart-series" data-series-id="' + s.id + '" style="display:' + (hidden ? 'none' : 'block') + '"><polyline points="' + pts + '" fill="none" stroke="' + s.color + '" stroke-width="0.8" stroke-linecap="round" stroke-linejoin="round"></polyline>' + dots + '</g>';
  });
  return '<svg class="insp-trend-chart" viewBox="0 0 ' + w + ' ' + h + '" preserveAspectRatio="xMidYMid meet">' + grid + yLabels + seriesSVG + xLabels + '</svg>';
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
  const options = (state.settings.focusOptions || DEFAULT_SETTINGS.focusOptions)
    .filter(o => !REMOVED_FOCUS_LABELS.includes(o));
  const current = (state.settings.monthlyFocus || DEFAULT_SETTINGS.monthlyFocus)
    .filter(o => !REMOVED_FOCUS_LABELS.includes(o));

  overlay.innerHTML = `
    <div class="phase-picker-card">
      <div class="phase-picker-title">选择本月主线</div>
      <div class="focus-options">
        ${options.map(opt => {
          const active = current.includes(opt);
          const c = FOCUS_COLORS[opt];
          const style = active && c ? `style="background:${c.bg};border-color:${c.border};color:${c.color}"` : '';
          const checkStyle = active && c ? `style="color:${c.color}"` : '';
          return `
          <div class="focus-option ${active ? 'active' : ''}" data-focus="${escapeHTML(opt)}" ${style}>
            <span class="focus-check" ${checkStyle}>✓</span>
            <span class="focus-name">${escapeHTML(opt)}</span>
            <span class="focus-del" data-focus-del="${escapeHTML(opt)}">×</span>
          </div>`;
        }).join('')}
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
      const active = current.includes(el.dataset.focus);
      el.classList.toggle('active', active);
      const c = FOCUS_COLORS[el.dataset.focus];
      if (active && c) {
        el.style.background = c.bg;
        el.style.borderColor = c.border;
        el.style.color = c.color;
        const check = el.querySelector('.focus-check');
        if (check) check.style.color = c.color;
      } else {
        el.style.background = '';
        el.style.borderColor = '';
        el.style.color = '';
        const check = el.querySelector('.focus-check');
        if (check) check.style.color = '';
      }
    });
  }

  // 标签交互：点击=选择/取消（最多 3 个）；长按 600ms=显示删除按钮 ×，再点 × 从标签池删除
  let lpTimer = null, lpStartX = 0, lpStartY = 0;
  overlay.querySelectorAll('.focus-option').forEach(el => {
    const startLp = (e) => {
      if (e.target.closest('.focus-del')) return;
      const t = e.touches ? e.touches[0] : e;
      lpStartX = t.clientX; lpStartY = t.clientY;
      lpTimer = setTimeout(() => {
        el.classList.add('show-delete');
        el._lpTime = Date.now();
        if (navigator.vibrate) navigator.vibrate(20);
        lpTimer = null;
      }, 600);
    };
    const moveLp = (e) => {
      if (!lpTimer) return;
      const t = e.touches ? e.touches[0] : e;
      if (Math.abs(t.clientX - lpStartX) > 10 || Math.abs(t.clientY - lpStartY) > 10) {
        clearTimeout(lpTimer); lpTimer = null;
      }
    };
    const clearLp = () => { if (lpTimer) { clearTimeout(lpTimer); lpTimer = null; } };
    el.addEventListener('pointerdown', startLp);
    el.addEventListener('pointermove', moveLp);
    el.addEventListener('pointerup', clearLp);
    el.addEventListener('pointercancel', clearLp);
    el.addEventListener('contextmenu', (e) => e.preventDefault());
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
  // v9285：运行时过滤 v9283 已删除的 烹饪美食/志愿公益（防御老数据）
  const REMOVED_SLOW_NAMES = ['烹饪美食', '志愿公益'];
  const pool = (state.settings.slowPool || DEFAULT_SETTINGS.slowPool).filter(p => !REMOVED_SLOW_NAMES.includes(p.name));
  const current = (state.settings.slowBranches || DEFAULT_SETTINGS.slowBranches).filter(s => !REMOVED_SLOW_NAMES.includes(s.name));

  overlay.innerHTML = `
    <div class="phase-picker-card">
      <div class="phase-picker-title">长远计划库</div>
      <p class="phase-picker-sub">点击下方计划添加到「暂时放缓」</p>
      <div class="slow-pool-list">
        ${pool.map(p => {
          const active = current.some(s => s.name === p.name);
          return `<div class="slow-pool-item ${active ? 'active' : ''}" data-name="${escapeHTML(p.name)}" data-icon="${escapeHTML(p.icon || '')}" data-desc="${escapeHTML(p.desc)}">
            <span class="spi-emoji">${renderItemIcon(p.icon, 22)}</span>
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

  // v9268：勾选仅切换状态，保留滚动位置，不重建 overlay
  const list = overlay.querySelector('.slow-pool-list');
  overlay.querySelectorAll('.slow-pool-item').forEach(item => {
    item.addEventListener('click', () => {
      const name = item.dataset.name;
      const icon = item.dataset.icon;
      const idx = current.findIndex(s => s.name === name);
      if (idx >= 0) {
        current.splice(idx, 1);
      } else {
        current.push({ name, icon });
      }
      state.settings.slowBranches = current.slice();
      saveSettings();
      // 仅切换当前行的 active / 状态文字，不重建整个 overlay，避免滚动位置跳回顶部
      const nowActive = current.some(s => s.name === name);
      item.classList.toggle('active', nowActive);
      const status = item.querySelector('.spi-status');
      if (status) status.textContent = nowActive ? '已添加' : '添加';
    });
  });

  overlay.querySelector('.phase-cancel').addEventListener('click', () => overlay.remove());
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
}

// ============ 我的支线（Screenshot 2） ============
// 支线卡片图标：彩色填充风格，与圆框背景搭配
function branchIconBook(stroke = '#9C8AC9', fill = '#a99add', line = '#ffffff') {
  // 原生 24x24 viewBox + 描边 1.6，与工作台 icon() 及兄弟支线图标保持一致（去除内层 scale 导致的偏细）
  return `<svg class="br-icon-svg" viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" stroke-linecap="round" stroke-linejoin="round" stroke="${stroke}" stroke-width="1">
    <path d="M3.6 5.6c2-1 4.6-1.2 6.4-.6V18c-1.8-.6-4.4-.4-6.4.6z" fill="${fill}" fill-opacity="0.22"/>
    <path d="M20.4 5.6c-2-1-4.6-1.2-6.4-.6V18c1.8-.6 4.4-.4 6.4.6z" fill="${fill}" fill-opacity="0.36"/>
    <path d="M12 5V18.4" fill="none" stroke-width="1"/>
  </svg>`;
}

function branchIconLeaf(color = '#a0bb7a') {
  return `<svg class="br-icon-svg br-icon-leaf" viewBox="0 0 32 32" width="26" height="26" aria-hidden="true">
    <g stroke-linecap="round" stroke-linejoin="round">
      <path d="M16 18c-2.5-3-6.5-4-10-2.5 1 3.5 4 6.5 8.5 7.5L16 27V18z" fill="${color}" stroke="${color}" stroke-width="1" opacity="0.95"/>
      <path d="M16 18c2.5-3 6.5-4 10-2.5-1 3.5-4 6.5-8.5 7.5L16 27V18z" fill="${color}" stroke="${color}" stroke-width="1" opacity="0.95"/>
      <path d="M16 27v3" stroke="${color}" stroke-width="1" fill="none"/>
      <path d="M16 18v7" stroke="#ffffff" stroke-width="0.8" opacity="0.6" fill="none"/>
      <path d="M13 20l3-2" stroke="#ffffff" stroke-width="0.7" opacity="0.5" fill="none"/>
      <path d="M19 20l-3-2" stroke="#ffffff" stroke-width="0.7" opacity="0.5" fill="none"/>
    </g>
  </svg>`;
}

function branchIconMoney(color = '#f7ba61') {
  // 原生 24x24 viewBox + 描边 1.6，与工作台 icon() 及兄弟支线图标保持一致（去除内层 scale 导致的偏细）
  return `<svg class="br-icon-svg" viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" stroke-linecap="round" stroke-linejoin="round" fill="none" stroke="${color}">
    <circle cx="12" cy="12" r="9" stroke-width="1"/>
    <circle cx="12" cy="12" r="6.3" stroke-width="1"/>
    <path d="M12 7.6v9" stroke-width="1"/>
    <path d="M8.7 10.2 12 13.2l3.3-3" stroke-width="1"/>
    <path d="M9.4 14.1 7.6 17" stroke-width="1"/>
    <path d="M14.6 14.1 16.4 17" stroke-width="1"/>
  </svg>`;
}

// 外貌类支线图标：与标签语义相关，使用标签主色
function branchIconSkincare(color = '#B07A9E') {
  return `<svg class="br-icon-svg" viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" stroke-linecap="round" stroke-linejoin="round">
    <path d="M12 2c-3 3-6 6-6 10 0 3.3 2.7 6 6 6s6-2.7 6-6c0-4-3-7-6-10z" fill="${color}" fill-opacity="0.15" stroke="${color}" stroke-width="1"/>
    <path d="M12 14v4" stroke="${color}" stroke-width="1"/>
  </svg>`;
}
function branchIconMakeup(color = '#C4798C') {
  return `<svg class="br-icon-svg" viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" stroke-linecap="round" stroke-linejoin="round">
    <path d="M8 2h8v4H8z" fill="${color}" fill-opacity="0.2" stroke="${color}" stroke-width="1"/>
    <path d="M9 6h6v16H9z" fill="none" stroke="${color}" stroke-width="1"/>
  </svg>`;
}
function branchIconPosture(color = '#7A9C7A') {
  return `<svg class="br-icon-svg" viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" stroke-linecap="round" stroke-linejoin="round" fill="none" stroke="${color}" stroke-width="1">
    <circle cx="12" cy="5" r="2"/>
    <path d="M12 8v6"/>
    <path d="M8 21v-5l4-3 4 3v5"/>
    <path d="M8 12l-2 3"/>
    <path d="M16 12l2 3"/>
  </svg>`;
}
function branchIconOutfit(color = '#8C7BB6') {
  return `<svg class="br-icon-svg" viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" stroke-linecap="round" stroke-linejoin="round">
    <path d="M7 3h4l2 2 2-2h4l2 4-3 2v12H8V9L5 7z" fill="${color}" fill-opacity="0.12" stroke="${color}" stroke-width="1"/>
  </svg>`;
}
function branchIconLanguage(color = '#8978C3') {
  return `<svg class="br-icon-svg" viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" stroke-linecap="round" stroke-linejoin="round" fill="none" stroke="${color}" stroke-width="1">
    <circle cx="12" cy="12" r="9"/>
    <path d="M3 12h18"/>
    <path d="M12 3a15 15 0 0 1 0 18 15 15 0 0 1 0-18z"/>
  </svg>`;
}

function branchIconTarget(color = '#E8B4A8') {
  return `<svg class="br-icon-svg br-icon-target" viewBox="0 0 32 32" width="26" height="26" aria-hidden="true">
    <g stroke-linecap="round" stroke-linejoin="round">
      <circle cx="16" cy="16" r="11" fill="none" stroke="${color}" stroke-width="1"/>
      <circle cx="16" cy="16" r="6.5" fill="none" stroke="${color}" stroke-width="1"/>
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
    <path d="M53 52 Q55 54 57 52" stroke="#6B5B50" stroke-width="1" fill="none" stroke-linecap="round"/>
    <ellipse cx="80" cy="68" rx="14" ry="10" fill="#FFF0E0" stroke="#E8C9A8" stroke-width="1"/>
    <rect x="70" y="58" width="18" height="14" rx="3" fill="#FFF0E0" stroke="#E8C9A8" stroke-width="1"/>
    <path d="M88 62 Q92 62 92 66 Q92 70 88 70" fill="none" stroke="#E8C9A8" stroke-width="1" stroke-linecap="round"/>
    <line x1="73" y1="55" x2="83" y2="55" stroke="#E8C9A8" stroke-width="1" stroke-linecap="round"/>
    <circle cx="74" cy="53" r="0.8" fill="#F5A962" opacity="0.6"/>
    <circle cx="82" cy="51" r="0.8" fill="#F5A962" opacity="0.6"/>
    <ellipse cx="58" cy="70" rx="12" ry="8" fill="#FFF5F0"/>
  </svg>`;
}

// 今日一句：右侧小花绿植装饰

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
    <path d="M48 45 Q50 47 52 45" stroke="#6B5B50" stroke-width="1" fill="none" stroke-linecap="round"/>
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

  // 根据标签名称判断统计维度（用于周趋势、等级、进度）
  function focusTypeOf(name) {
    const def = FOCUS_CARD_DEF[name];
    if (def) return def.type;
    const n = String(name).toLowerCase();
    if (/英语|学习|阅读|单词|听力|专业|书|备考|考试|外语|知识/.test(n)) return 'learning';
    if (/健康|锻炼|睡眠|生活|护肤|体态|饮食|运动|健身|身体|养生/.test(n)) return 'health';
    if (/记账|钱|理财|收入|副业|自媒体|存钱|储蓄|经济|财务/.test(n)) return 'money';
    return 'learning';
  }
  // 根据标签名称生成对应语义图标
  function branchIconFor(name, color) {
    if (name === '英语') return branchIconLanguage(color);
    if (name === '阅读') return branchIconBook(color, color, '#ffffff');
    if (name === '健康') return icon('health', 25);
    if (name === '记账') return branchIconMoney(color);
    if (name === '护肤') return branchIconSkincare(color);
    if (name === '妆容') return branchIconMakeup(color);
    if (name === '仪态') return branchIconPosture(color);
    if (name === '穿搭') return branchIconOutfit(color);
    const type = focusTypeOf(name);
    if (type === 'health') return icon('health', 25);
    if (type === 'money') return branchIconMoney(color);
    return branchIconBook(color, color, '#ffffff');
  }
  function branchRouteFor(name) {
    const def = FOCUS_CARD_DEF[name];
    if (def) return def.route;
    const type = focusTypeOf(name);
    return { learning: '学习成长', health: '健康', money: '记账' }[type] || '学习成长';
  }
  function branchActionFor(name) {
    const def = FOCUS_CARD_DEF[name];
    if (def) return def.action;
    const type = focusTypeOf(name);
    return { learning: '背词汇 20min', health: '今晚 23:30 前睡', money: '记 1 笔收支' }[type] || '去打卡';
  }
  function branchSubFor(name) {
    const def = FOCUS_CARD_DEF[name];
    if (def) return def.sub;
    return '每天进步一点点，未来更自由';
  }
  // 各支线近9天每日数据点（包含当天）
  function weeklyPointsFor(type) {
    if (type === 'health' || type === 'looks') {
      const log = (state.domains[type] || {}).log || {};
      const days = [];
      for (let i = 8; i >= 0; i--) { const k = shiftDate(getTodayKey(), -i); days.push(Number(log[k]) || 0); }
      return days;
    }
    if (type === 'money') {
      const days = [];
      for (let i = 8; i >= 0; i--) { const k = shiftDate(getTodayKey(), -i); days.push(getDayExpense(k)); }
      return days;
    }
    // learning：某天「学习活跃度」= 专注会话数 + 英语打卡勾选数；勾选任务即产生当天数据点
    const days = [];
    for (let i = 8; i >= 0; i--) {
      const k = shiftDate(getTodayKey(), -i);
      const sessions = state.focusSessions.filter(x => x.date === k && x.domain === 'learning').length;
      days.push(sessions + getEnglishDoneCount(k));
    }
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
      // 任务勾选：当天该支线已勾选的每日任务按比例计入（有勾选即动）
      let tasks;
      if (k === todayKey) tasks = (state.domains[type] || { tasks: [] }).tasks || [];
      else { const h = (state.domainHistory[k] || {})[type]; tasks = (h && h.tasks) || []; }
      if (tasks && tasks.length) {
        ratio = Math.max(ratio, tasks.filter(t => t.done).length / tasks.length);
      }
      // 记录/进度兜底：与「本周趋势」同源，确保「有记录/有进度」当天即计入完成日
      if (type === 'money') {
        if (state.transactions.some(t => t.date === k)) ratio = 1;
      } else if (type === 'learning') {
        // 按「勾选完成比例」计入：当天英语任务勾选比例越接近 100%，当天份额越满
        const engTotal = getEnglishTaskTotal(k);
        if (engTotal > 0) ratio = Math.max(ratio, getEnglishDoneCount(k) / engTotal);
        else if (getFocusMinutesByDomain(k, 'learning') > 0) ratio = 1; // 无英语任务当天，专注会话仍计满
      } else {
        const log = (state.domains[type] || {}).log || {};
        if (Number(log[k]) > 0) ratio = 1;
      }
      sum += ratio * DAY_BASE;
    }
    return Math.round(sum);
  }

  const branches = monthlyFocus.slice(0, 3).map(name => {
    const type = focusTypeOf(name);
    const c = focusColorOf(name);
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
      name, type, icon: branchIconFor(name, c.color), color: c.color, border: c.border, bg: c.bg,
      sub: branchSubFor(name), action: branchActionFor(name), route: branchRouteFor(name),
      week, level, levelText, activeDays, focusMin, hasData,
      progress: calcBranchWeeklyProgress(type)
    };
  });
  const keepList = (state.settings.keepBranches || DEFAULT_SETTINGS.keepBranches).filter(k => k.name !== '攒钱');
  // v9285：运行时过滤 v9283 已删除的 烹饪美食/志愿公益（防御老数据）
  const REMOVED_SLOW_NAMES = ['烹饪美食', '志愿公益'];
  const slowList = (state.settings.slowBranches || DEFAULT_SETTINGS.slowBranches).filter(s => !REMOVED_SLOW_NAMES.includes(s.name));

  // 本月主线标签按独立配色染色（每个标签一种颜色）
  const focusItems = monthlyFocus.map(name => {
    const c = focusColorOf(name);
    return { name, color: c.color, border: c.border, bg: c.bg };
  });
  page.innerHTML = `
    <div class="br-page">
      <div class="br-page-head">
        <div class="br-page-title">我的支线 <span class="br-title-spark">${icon('sparkle', 15)}</span></div>
        <div class="br-streak-clean"><span>持续推进 <b>${calcActiveStreak()}</b> 天</span></div>
      </div>

      <div class="br-header-clean">
        <div class="br-stage" id="br-stage-picker">
          当前阶段：<span class="br-current-phase">${escapeHTML(currentPhase)}</span><span class="br-stage-caret">${icon('chevronRight', 12)}</span>
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
        <div class="br-focus-illust"><img src="images/4.png" class="br-mascot-img" alt="mascot"></div>
      </div>

      ${branches.map(b => {
        const hasData = b.hasData;
        return `        <div class="br-branch-card" data-route="${escapeHTML(b.route)}" style="background:#fcfbf7;border-color:${b.border}">
          <button class="item-delete" data-del-type="branch-focus" data-focus-name="${escapeHTML(b.name)}" aria-label="删除主线"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>
          <div class="br-branch-top">
            <div class="br-branch-icon" style="color:${b.color}">${b.icon}</div>
            <div class="br-branch-info">
              <div class="br-branch-title" style="color:${b.color}">${b.name}</div>
              <div class="br-branch-sub">${b.sub}</div>
              <div class="br-branch-meta">
                <span class="br-lv-tag" style="background:${b.bg};color:${b.color}">Lv.${b.level} ${b.levelText}</span>
                <span class="br-freq-tag">每周 ${b.activeDays} 天</span>
              </div>
            </div>
            <div class="br-branch-ring">
              ${hasData ? miniRingHTML(b.progress, '', b.progress + '%', '本周进度', b.color) : '<span class="br-no-data">暂无数据</span>'}
            </div>
          </div>
          <div class="br-branch-divider" style="border-color:${b.border}"></div>
          <div class="br-branch-bottom">
            <div class="br-trend">
              <div class="br-trend-label">本周趋势</div>
              ${inlineSparkline(b.week, b.color, null, b.bg, 9)}
            </div>
            <div class="br-branch-vline" style="border-color:${b.border}"></div>
            <div class="br-next-wrap">
              <div class="br-next-label">下一步行动</div>
              <button class="br-next-btn" data-route="${escapeHTML(b.route)}" style="background:${b.color};color:#fff">
                <span class="br-next-action">${b.action}</span>
                <span class="br-next-arrow">›</span>
              </button>
            </div>
          </div>
        </div>`;
      }).join('')}

      <div class="br-section-header">
        <div class="br-sec-title"><span class="br-sec-icon">${icon('leaf', 14)}</span> 保持中的支线</div>
      </div>
      <div class="br-slow-list-clean">
        ${keepList.map(k => {
          const defaultItem = DEFAULT_SETTINGS.keepBranches.find(d => d.name === k.name);
          const iconName = (defaultItem && defaultItem.icon) || k.icon || k.emoji;
          const route = k.name === '攒钱' ? '记账' : k.name;
          return `<div class="br-slow-card" data-route="${escapeHTML(route)}">
            <div class="br-slow-left"><span class="bsi-emoji"><span class="bsi-icon-wrap">${renderItemIcon(iconName, 15)}</span></span><span class="bsi-name">${k.name}</span></div>
            <span class="bsi-tag">保持中</span>
          </div>`;
        }).join('')}
      </div>

      <div class="br-section-header">
        <div class="br-sec-title">暂时放缓</div>
        <span class="br-manage" data-manage="slow">查看全部 (${slowList.length})</span>
      </div>
      <div class="br-slow-list-clean">
        ${slowList.map(s => {
          const defaultItem = DEFAULT_SETTINGS.slowPool.find(d => d.name === s.name) || DEFAULT_SETTINGS.slowBranches.find(d => d.name === s.name);
          const iconName = (defaultItem && defaultItem.icon) || s.icon || s.emoji;
          return `<div class="br-slow-card" data-route="${escapeHTML(s.name)}">
            <div class="br-slow-left"><span class="bsi-emoji"><span class="bsi-icon-wrap">${renderItemIcon(iconName, 15)}</span></span><span class="bsi-name">${s.name}</span></div>
            <span class="bsi-tag">待回归</span>
          </div>`;
        }).join('')}
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

  // v9275：in-place 更新顶部学习摘要（避免 renderContent 整页重绘导致位置移动）
  function refreshStudySummary(scope, dayArg) {
    const sub = scope.querySelector('.sg-sub');
    if (sub) {
      const today = dayArg || getEnglishToday();
      const cur = getEnglishDailyDone();
      const total = cur.total || ENGLISH_DAILY_TASKS.length;
      const done = cur.done || 0;
      const tp = state.englishCheckin.totalPoints || 0;
      sub.textContent = (cur.exempt ? '休息日 · 仅需完成「背单词」· 今日 ' : '已完成 ' + done + '/' + total + ' · 今日 ') + tp + ' 积分';
    }
  }

  function dailyTaskHTML(t) {
    const td = (day.tasks || {})[t.key] || { done: false, note: '' };
    const exempt = day.restDay && t.key !== 'words';
    const disabled = day.restDay && t.key !== 'words';
    return `
      <div class="eng-task-row ${td.done ? 'done' : ''} ${disabled ? 'exempt' : ''}" data-type="daily" data-key="${t.key}">
        <div class="eng-task-main" style="--eng-color:${t.color};--eng-bg:${t.bg}">
          <div class="eng-task-check ${td.done ? 'on' : ''}"><input type="checkbox" data-eng-check="1" ${td.done ? 'checked' : ''} ${disabled ? 'disabled' : ''} aria-label="${escapeHTML(t.name)}"></div>
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
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
        </button>
      </div>`;
  }

  function weeklyTaskHTML(t) {
    const ws = weeklyState[t.key] || { done: false, note: '' };
    return `
      <div class="eng-task-row ${ws.done ? 'done' : ''}" data-type="weekly" data-key="${t.key}">
        <div class="eng-task-main" style="--eng-color:${t.color};--eng-bg:${t.bg}">
          <div class="eng-task-check ${ws.done ? 'on' : ''}"><input type="checkbox" data-eng-check="1" ${ws.done ? 'checked' : ''} aria-label="${escapeHTML(t.name)}"></div>
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
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
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
          <span class="eng-stage-pct">${s.checkedDays === 0 ? '待开始' : s.pct + '%'}</span>
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
      ${backButtonHTML('我的支线')}
      <h3 class="sub-title">英语 <span class="sub-spark">${icon('sparkle', 14)}</span></h3>
    </div>

    <div class="study-goal section-card" style="background:var(--card);border:1px solid var(--border);">
      <div class="sg-ring-wrap">${dailyDone.exempt ? miniRingHTML(dailyDone.done ? 100 : 0, 'ring-purple', dailyDone.done ? '✓' : '0/1', '单词复习') : miniRingHTML(Math.round(dailyDone.done / dailyDone.total * 100), 'ring-purple', `${dailyDone.done}/${dailyDone.total}`, '今日完成')}</div>
      <div class="sg-info">
        <h4>英语学习打卡</h4>
        <p class="sg-sub">${dailySummary()}</p>
      </div>
    </div>

    <div class="section-card">
      <div class="soft-card-title">${icon('check', 14)} 今日学习任务</div>
      <div class="eng-daily-list">
        ${ENGLISH_DAILY_TASKS.map(dailyTaskHTML).join('')}
      </div>
      <label class="eng-rest-row">
        <input type="checkbox" id="eng-rest-day" ${day.restDay ? 'checked' : ''}>
        <span>英语轻休息日（本周剩余 ${restDaysLeft} 次）</span>
      </label>
    </div>

    <div class="section-card">
      <div class="soft-card-title">${icon('calendar', 14)} 每周任务</div>
      <div class="eng-weekly-list">
        ${ENGLISH_WEEKLY_TASKS.map(weeklyTaskHTML).join('')}
      </div>
    </div>

    <div class="section-card">
      <div class="soft-card-title">${icon('calendar', 14)} 长期进度看板</div>
      ${stagesHTML()}
    </div>

    <div class="section-card">
      <div class="soft-card-title">${icon('chart', 14)} 历史打卡 <span class="hp-more hp-link" id="eng-history-btn">查看 ›</span></div>
      ${historyHTML()}
    </div>

  `;
  content.appendChild(page);

  // 返回按钮
  page.querySelectorAll('[data-go]').forEach(b => b.addEventListener('click', () => selectItem(b.dataset.go)));

  // 任务勾选 + 笔记输入（v9275：in-place 更新避免位置移动）
  page.querySelectorAll('.eng-task-row').forEach(row => {
    const type = row.dataset.type;
    const key = row.dataset.key;
    row.addEventListener('click', (e) => {
      if (e.target.closest('.item-delete, .eng-task-note, .eng-task-note input, [data-eng-check]')) return;
      if (type === 'daily' && day.restDay && key !== 'words') return;
      toggleEnglishTask(type, key);
      // in-place 更新
      const nowDone = row.classList.contains('done');
      if (nowDone) row.classList.remove('done'); else row.classList.add('done');
      const check = row.querySelector('.eng-task-check');
      if (check) { check.classList.toggle('on', !nowDone); const cb = check.querySelector('input[type=checkbox]'); if (cb) cb.checked = !nowDone; }
      // 顶部 summary 重算
      refreshStudySummary(page, day);
    });
  });
  // 复选框直接点击（与卡片点击等价，避开 input 内事件委托）
  page.querySelectorAll('.eng-task-check input[type=checkbox]').forEach(cb => {
    cb.addEventListener('click', (e) => {
      e.stopPropagation();  // 阻止冒泡到 .eng-task-row
    });
    cb.addEventListener('change', (e) => {
      const row = cb.closest('.eng-task-row');
      if (!row) return;
      const type = row.dataset.type;
      const key = row.dataset.key;
      if (type === 'daily' && day.restDay && key !== 'words') return;
      const before = row.classList.contains('done');
      toggleEnglishTask(type, key);
      const after = !before;
      if (after) row.classList.add('done'); else row.classList.remove('done');
      const check = row.querySelector('.eng-task-check');
      if (check) check.classList.toggle('on', after);
      refreshStudySummary(page, day);
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
        notifyOncePerWeek('english-restday', '本周休息日已用完');
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
  // 关键：内部 toggle 会递归调用本函数，必须先清空防止整页叠加
  content.innerHTML = '';
  const page = document.createElement('div');
  page.className = 'page';
  if (greetLine) greetLine.textContent = '生活秩序';
  const o = state.order || JSON.parse(JSON.stringify(DEFAULT_ORDER));
  const today = getTodayKey();
  const viewKey = state.orderViewDate || today;
  const ws = getWeekStart();
  const streak = calcStreak();
  const allTasks = [...o.morning, ...o.evening];
  const total = allTasks.length;
  const doneWeek = allTasks.filter(a => a.done && a.date >= ws && a.date <= today).length;
  const pct = total ? Math.round(doneWeek / total * 100) : 0;
  const weekPts = Object.keys(o.log || {}).reduce((s, k) => (k >= ws && k <= today ? s + (o.log[k] || 0) : s), 0);
  const isToday = viewKey === today;

  function renderActionItem(a, delType) {
    const done = a.done && a.date === viewKey;
    return `<div class="module-list-item ${done ? 'done' : ''}" data-action-id="${a.id}">
      <button class="mli-check" aria-label="完成">${done ? icon('check', 10) : ''}</button>
      <span class="mli-text">${escapeHTML(a.text)}</span>
      <span class="mli-points">+${a.points}</span>
      <div class="module-item-actions">
        <button class="module-act-btn module-edit-btn" data-edit-type="${delType}" data-edit-id="${a.id}" title="编辑">${icon('edit', 11)}</button>
        <button class="module-act-btn module-del-btn" data-del-type="${delType}" data-del-id="${a.id}" title="删除">${icon('delete', 11)}</button>
      </div>
    </div>`;
  }

  function orderSuggest() {
    if (doneWeek > 0) return '已经把握住一些生活的小节奏，剩下的按自己的步调来就好 🌿';
    return '';
  }

  page.innerHTML = `
    <div class="sub-page-head">
      ${backButtonHTML('我的支线')}
      <h3 class="sub-title">生活秩序 <span class="sub-spark">${icon('sparkle', 14)}</span></h3>
    </div>
    ${dateBarHTML(viewKey, { id: 'order-date-trigger' })}
    <div class="study-goal section-card" style="background:linear-gradient(135deg,#E8F0E2 0%,#FFF5E9 100%);">
      ${miniRingHTML(pct, 'ring-green', pct + '%', '本周完成')}
      <div class="sg-info">
        <h4>秩序感养成中</h4>
        <p class="sg-sub">用固定节奏减少内耗，把生活理顺</p>
      </div>
    </div>

    <div class="section-card module-card">
      <div class="module-card-head">
        <span class="module-card-icon" style="color:#E8A85C">${icon('sunrise', 14)}</span>
        <span class="soft-card-title" style="margin:0;">☀️ 晨间秩序</span>
        <span class="module-card-meta">${o.morning.filter(a => a.done && a.date === viewKey).length}/${o.morning.length}</span>
      </div>
      <div class="module-list" id="order-morning-actions">
        ${o.morning.map(a => renderActionItem(a, 'order-morning')).join('')}
      </div>
    </div>

    <div class="section-card module-card">
      <div class="module-card-head">
        <span class="module-card-icon" style="color:#7B8DAD">${icon('moon', 14)}</span>
        <span class="soft-card-title" style="margin:0;">🌙 晚间秩序</span>
        <span class="module-card-meta">${o.evening.filter(a => a.done && a.date === viewKey).length}/${o.evening.length}</span>
      </div>
      <div class="module-list" id="order-evening-actions">
        ${o.evening.map(a => renderActionItem(a, 'order-evening')).join('')}
      </div>
    </div>


    <div class="module-foot-note">
      <span>${icon('bulb', 14)}</span>
    </div>
  `;
  content.appendChild(page);
  page.querySelectorAll('[data-go]').forEach(b => b.addEventListener('click', () => selectItem(b.dataset.go)));

  // 日期切换：全局统一日期组件
  bindDateBar(page, {
    onShift: (d) => { state.orderViewDate = shiftDate(viewKey, d); renderLifeOrderPage(); },
    onPick: (k) => { state.orderViewDate = k; renderLifeOrderPage(); },
    onToday: () => { state.orderViewDate = today; renderLifeOrderPage(); },
    max: today
  });

  // 完成切换并计积分（仅切换状态，不生成新条目）
  function bindToggle(sel, list) {
    page.querySelectorAll(sel).forEach(row => {
      row.addEventListener('click', () => {
        if (row.classList.contains('show-delete')) return;
        if (!isToday) { toast('只能在当天打卡哦'); return; }
        const id = row.dataset.actionId;
        const action = list.find(a => a.id === id);
        if (!action) return;
        const wasDone = action.done && action.date === today;
        action.done = !wasDone;
        action.date = today;
        const delta = wasDone ? -action.points : action.points;
        state.points = Math.max(0, (state.points || 0) + delta);
        o.log[today] = Math.max(0, (o.log[today] || 0) + delta);
        if (!wasDone) state.checkins[today] = true;
        saveCheckins();
        savePoints();
        saveOrder();
        renderLifeOrderPage();
      });
    });
  }
  bindToggle('#order-morning-actions .module-list-item', o.morning);
  bindToggle('#order-evening-actions .module-list-item', o.evening);
}

// ============ 内在成长 ============
function renderInnerGrowthPage() {
  // 关键：内部 toggle 会递归调用本函数，必须先清空防止整页叠加
  content.innerHTML = '';
  const page = document.createElement('div');
  page.className = 'page';
  if (greetLine) greetLine.textContent = '内在成长';
  const g = state.growth || JSON.parse(JSON.stringify(DEFAULT_GROWTH));
  const today = getTodayKey();
  const viewKey = state.growthViewDate || today;
  const ws = getWeekStart();
  const streak = calcStreak();
  const total = g.awareness.length;
  const doneWeek = g.awareness.filter(a => a.done && a.date >= ws && a.date <= today).length;
  const doneToday = g.awareness.filter(a => a.done && a.date === viewKey).length;
  const pct = total ? Math.round(doneWeek / total * 100) : 0;
  const weekPts = Object.keys(g.log || {}).reduce((s, k) => (k >= ws && k <= today ? s + (g.log[k] || 0) : s), 0);
  const isToday = viewKey === today;

  function renderActionItem(a, delType) {
    const done = a.done && a.date === viewKey;
    return `<div class="module-list-item ${done ? 'done' : ''}" data-action-id="${a.id}">
      <button class="mli-check" aria-label="完成">${done ? icon('check', 10) : ''}</button>
      <span class="mli-text">${escapeHTML(a.text)}</span>
      <span class="mli-points">+${a.points}</span>
      <div class="module-item-actions">
        <button class="module-act-btn module-edit-btn" data-edit-type="${delType}" data-edit-id="${a.id}" title="编辑">${icon('edit', 11)}</button>
        <button class="module-act-btn module-del-btn" data-del-type="${delType}" data-del-id="${a.id}" title="删除">${icon('delete', 11)}</button>
      </div>
    </div>`;
  }

  function growthSuggest() {
    if (doneWeek > 0) return '已经留了一些时间给自己，觉察本身就是很温柔的进步 🌱';
    return '';
  }

  page.innerHTML = `
    <div class="sub-page-head">
      ${backButtonHTML('我的支线')}
      <h3 class="sub-title">内在成长 <span class="sub-spark">${icon('sparkle', 14)}</span></h3>
    </div>
    ${dateBarHTML(viewKey, { id: 'growth-date-trigger' })}
    <div class="study-goal section-card" style="background:linear-gradient(135deg,#EDEAF9 0%,#E8F0E2 100%);">
      ${miniRingHTML(pct, 'ring-purple', pct + '%', '本周完成')}
      <div class="sg-info">
        <h4>向内探索</h4>
        <p class="sg-sub">记录情绪、练习觉察、积累心理能量</p>
      </div>
    </div>

    <div class="section-card module-card">
      <div class="module-card-head">
        <span class="module-card-icon" style="color:#A99BD6">${icon('meditate', 14)}</span>
        <span class="soft-card-title" style="margin:0;">🧘 今日觉察</span>
        <span class="module-card-meta">${doneToday}/${total}</span>
      </div>
      <div class="module-list" id="growth-awareness-actions">
        ${g.awareness.map(a => renderActionItem(a, 'growth-awareness')).join('')}
      </div>
    </div>

    <div class="section-card module-card">
      <div class="module-card-head">
        <span class="module-card-icon" style="color:#8FB98C">${icon('leaf', 14)}</span>
        <span class="soft-card-title" style="margin:0;">📝 本周课题</span>
      </div>
      <p class="module-goal-text">${escapeHTML(g.theme || DEFAULT_GROWTH.theme)}</p>
    </div>


    <div class="module-foot-note">
      <span>${icon('bulb', 14)}</span>
    </div>
  `;
  content.appendChild(page);
  page.querySelectorAll('[data-go]').forEach(b => b.addEventListener('click', () => selectItem(b.dataset.go)));

  // 日期切换：全局统一日期组件
  bindDateBar(page, {
    onShift: (d) => { state.growthViewDate = shiftDate(viewKey, d); renderInnerGrowthPage(); },
    onPick: (k) => { state.growthViewDate = k; renderInnerGrowthPage(); },
    onToday: () => { state.growthViewDate = today; renderInnerGrowthPage(); },
    max: today
  });

  // 完成切换并计积分（仅切换状态，不生成新条目）
  page.querySelectorAll('#growth-awareness-actions .module-list-item').forEach(row => {
    row.addEventListener('click', () => {
      if (row.classList.contains('show-delete')) return;
      if (!isToday) { toast('只能在当天打卡哦'); return; }
      const id = row.dataset.actionId;
      const action = g.awareness.find(a => a.id === id);
      if (!action) return;
      const wasDone = action.done && action.date === today;
      action.done = !wasDone;
      action.date = today;
      const delta = wasDone ? -action.points : action.points;
      state.points = Math.max(0, (state.points || 0) + delta);
      g.log[today] = Math.max(0, (g.log[today] || 0) + delta);
      if (!wasDone) state.checkins[today] = true;
      saveCheckins();
      savePoints();
      saveGrowth();
      renderInnerGrowthPage();
    });
  });
}


// ============ 旅行体验（低精力版） ============
function renderTravelPage() {
  // 关键：内部 toggle / 切阶段 / + 按钮会递归调用本函数，必须先清空防止整页叠加
  content.innerHTML = '';
  const page = document.createElement('div');
  page.className = 'page';
  if (greetLine) greetLine.textContent = '旅行体验';
  const t = state.travel || JSON.parse(JSON.stringify(DEFAULT_TRAVEL));
  const ph = t.phases[t.phase] || t.phases.adapt;
  const today = getTodayKey();
  const ws = getWeekStart();
  let weekPts = 0;
  for (const k in (t.log || {})) { if (k >= ws && k <= today) weekPts += (t.log[k] || 0); }
  const departed = ph.places.filter(p => p.status === '已出发').length;
  const actionsDone = ph.actions.filter(a => a.done && a.date === today).length;
  const ckCats = (t.checkin && Array.isArray(t.checkin.categories)) ? t.checkin.categories : [];
  const checkedCount = ckCats.reduce((n, c) => n + c.places.filter(p => p.checked).length, 0);
  const totalPlaces = ckCats.reduce((n, c) => n + c.places.length, 0);
  const phaseIds = Object.keys(t.phases);

  function travelSuggest() {
    if (weekPts > 0 && departed > 0) return '这周已经迈出轻量出门的第一步啦，顺着节奏慢慢来，旅行从楼下开始就很美好 🌿';
    if (weekPts > 0) return '这周已经积累了一些出门的小念头，顺着自己的节奏就好。';
    if (ph.places.length > 0) return '收藏一个家附近的小角落，就是今天很轻松的一步。';
    return '';
  }

  function renderPlaceItem(p) {
    const done = p.status === '已出发';
    return `<div class="module-list-item" data-place-id="${p.id}">
      <div class="mli-main">
        <span class="mli-name">${escapeHTML(p.name)}</span>
        <span class="mli-note">${escapeHTML(p.note)}</span>
      </div>
      ${p.points > 0 ? `<span class="mli-points">+${p.points}</span>` : ''}
      <span class="module-status ${done ? 'done' : ''}" data-place-id="${p.id}">${p.status}</span>
      <div class="module-item-actions">
        <button class="module-act-btn module-edit-btn" data-edit-type="travel-place" data-edit-id="${p.id}" data-phase="${t.phase}" title="编辑">${icon('edit', 11)}</button>
        <button class="module-act-btn module-del-btn" data-del-type="travel-place" data-del-id="${p.id}" data-phase="${t.phase}" title="删除">${icon('delete', 11)}</button>
      </div>
    </div>`;
  }

  function renderActionItem(a, delType) {
    const done = a.done && a.date === today;
    return `<div class="module-list-item ${done ? 'done' : ''}" data-action-id="${a.id}">
      <button class="mli-check" aria-label="完成">${done ? icon('check', 10) : ''}</button>
      <span class="mli-text">${escapeHTML(a.text)}</span>
      <span class="mli-points">+${a.points}</span>
      <div class="module-item-actions">
        <button class="module-act-btn module-edit-btn" data-edit-type="${delType}" data-edit-id="${a.id}" data-phase="${t.phase}" title="编辑">${icon('edit', 11)}</button>
        <button class="module-act-btn module-del-btn" data-del-type="${delType}" data-del-id="${a.id}" data-phase="${t.phase}" title="删除">${icon('delete', 11)}</button>
      </div>
    </div>`;
  }

  function renderDiscovery(d) {
    return `<div class="module-discovery">
      <span class="module-discovery-dot"></span>
      <span class="module-discovery-text">${escapeHTML(d.text)}</span>
      <button class="module-discovery-del" data-del-disc="${d.id}" title="删除">×</button>
    </div>`;
  }

  page.innerHTML = `
    <div class="sub-page-head">
      ${backButtonHTML('我的支线')}
      <h3 class="sub-title">旅行体验 <span class="sub-spark">${icon('sparkle', 14)}</span></h3>
    </div>

    <div class="module-phase-tabs">
      ${phaseIds.map(id => `<button class="module-phase-tab ${id === t.phase ? 'active' : ''}" data-phase="${id}">${escapeHTML(t.phases[id].name)}</button>`).join('')}
    </div>

    <div class="module-hero module-hero-travel">
      <div class="mh-body">
        <h4>待出发清单 · ${escapeHTML(ph.name)}</h4>
        <p class="mh-sub">${escapeHTML(ph.meta || '')}</p>
        <div class="mh-tag" id="travel-next-tag">
          <span class="mh-tag-dot"></span>
          <span>下一站：${escapeHTML(ph.nextDestination || '待定')}</span>
        </div>
      </div>
    </div>

    <div class="section-card module-card">
      <div class="module-card-head">
        <span class="module-card-icon" style="color:#7FB0D3">${icon('mountain', 14)}</span>
        <span class="soft-card-title" style="margin:0;">想去的地方</span>
        <button class="module-add-btn" id="travel-add-place" title="新增">${icon('plus', 12)}</button>
      </div>
      <div class="module-list" id="travel-places">
        ${ph.places.length ? ph.places.map(renderPlaceItem).join('') : '<div class="module-empty">还没有想去的地方，先收藏一个家附近的小角落吧～</div>'}
      </div>
    </div>

    ${ph.actions.length ? `
    <div class="section-card module-card">
      <div class="module-card-head">
        <span class="module-card-icon" style="color:#D6A67A">${icon('target', 14)}</span>
        <span class="soft-card-title" style="margin:0;">本周行动</span>
        <span class="module-card-meta">${actionsDone}/${ph.actions.length}</span>
      </div>
      <div class="module-list" id="travel-actions">
        ${ph.actions.map(a => renderActionItem(a, 'travel-action')).join('')}
      </div>
    </div>` : ''}

    <div class="section-card module-card">
      <div class="module-card-head">
        <span class="module-card-icon" style="color:#8FB0A0">${icon('camera', 14)}</span>
        <span class="soft-card-title" style="margin:0;">旅行灵感</span>
        <button class="module-add-btn" id="travel-add-discovery" title="记录一个小发现">${icon('plus', 12)}</button>
      </div>
      <p class="module-tip">${escapeHTML(ph.inspirationGuide || '每次出门后，记录 1 个让你舒服的小发现。')}</p>
      <div class="module-discovery-list" id="travel-discoveries">
        ${ph.discoveries.length ? ph.discoveries.map(renderDiscovery).join('') : '<div class="module-empty">出门后回来记一笔吧，哪怕是「今天云很好看」。</div>'}
      </div>
    </div>


    <div class="section-card module-card module-checkin-entry" id="travel-goto-checkin">
      <div class="module-card-head">
        <span class="module-card-icon" style="color:#E0A85C">${icon('flag', 14)}</span>
        <span class="soft-card-title" style="margin:0;">地点打卡</span>
        <span class="module-card-meta">${checkedCount}/${totalPlaces} 已打卡</span>
      </div>
      <p class="module-tip">按分类记录想实地到访的地点，完成打卡拿积分，可上传照片与心情。</p>
      <button class="module-go-btn" id="travel-open-checkin">进入地点打卡 ›</button>
    </div>
  `;
  content.appendChild(page);

  page.querySelectorAll('[data-go]').forEach(b => b.addEventListener('click', () => selectItem(b.dataset.go)));

  // 切换阶段
  page.querySelectorAll('.module-phase-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      t.phase = tab.dataset.phase;
      saveTravel();
      renderTravelPage();
    });
  });

  // 想去的地方：状态切换 待规划 ↔ 已出发（有积分则计入）
  page.querySelectorAll('#travel-places .module-status').forEach(el => {
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      if (el.closest('.module-list-item').classList.contains('show-delete')) return;
      const id = el.dataset.placeId;
      const place = ph.places.find(p => p.id === id);
      if (!place) return;
      const was = place.status === '已出发';
      place.status = was ? '待规划' : '已出发';
      if (place.points > 0) {
        const delta = was ? -place.points : place.points;
        state.points = Math.max(0, (state.points || 0) + delta);
        t.log[today] = Math.max(0, (t.log[today] || 0) + delta);
        savePoints();
      }
      saveTravel();
      renderTravelPage();
    });
  });

  // 本周行动：完成切换并计积分
  page.querySelectorAll('#travel-actions .module-list-item').forEach(row => {
    row.addEventListener('click', () => {
      if (row.classList.contains('show-delete')) return;
      const id = row.dataset.actionId;
      const action = ph.actions.find(a => a.id === id);
      if (!action) return;
      const wasDone = action.done && action.date === today;
      action.done = !wasDone;
      action.date = today;
      const delta = wasDone ? -action.points : action.points;
      state.points = Math.max(0, (state.points || 0) + delta);
      t.log[today] = Math.max(0, (t.log[today] || 0) + delta);
      savePoints();
      saveTravel();
      renderTravelPage();
    });
  });

  // 新增想去的地方
  page.querySelector('#travel-add-place').addEventListener('click', async () => {
    const name = await openModal('新增想去的地方', '', '例如：小区周边漫步');
    if (name === null || !name.trim()) return;
    const note = await openModal('备注（可选）', '', '简单描述一下，降低门槛');
    ph.places.push({ id: uid('tp'), name: name.trim(), note: note === null ? '' : note.trim(), points: 0, status: '待规划' });
    saveTravel();
    renderTravelPage();
  });

  // 新增小发现（旅行灵感）
  page.querySelector('#travel-add-discovery').addEventListener('click', async () => {
    const v = await openModal('记录一个小发现', '', '楼下石榴树结果了 / 便利店新上了汽水…');
    if (v === null || !v.trim()) return;
    ph.discoveries.push({ id: uid('td'), text: v.trim() });
    saveTravel();
    renderTravelPage();
  });

  // 删除小发现
  page.querySelectorAll('[data-del-disc]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.dataset.delDisc;
      ph.discoveries = ph.discoveries.filter(d => d.id !== id);
      saveTravel();
      renderTravelPage();
    });
  });

  // 进入地点打卡清单
  page.querySelector('#travel-open-checkin').addEventListener('click', () => selectItem('地点打卡'));
}

// ============ 地点打卡（旅行体验子页） ============

// 将用户选择的图片文件压缩为 base64 data URL（限制尺寸，避免 localStorage 过大）
function fileToResizedDataURL(file, maxW, quality) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        let w = img.width, h = img.height;
        if (w > maxW) { h = Math.round(h * maxW / w); w = maxW; }
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);
        try { resolve(canvas.toDataURL('image/jpeg', quality)); }
        catch (e) { reject(e); }
      };
      img.onerror = reject;
      img.src = reader.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function renderTravelCheckinPage() {
  // 关键：内部 toggle / + 按钮 / 编辑会递归调用本函数，必须先清空防止整页叠加
  content.innerHTML = '';
  const page = document.createElement('div');
  page.className = 'page';
  if (greetLine) greetLine.textContent = '地点打卡';
  const t = state.travel || JSON.parse(JSON.stringify(DEFAULT_TRAVEL));
  if (!t.checkin || !Array.isArray(t.checkin.categories)) t.checkin = JSON.parse(JSON.stringify(DEFAULT_TRAVEL.checkin));
  const cats = t.checkin.categories;
  const today = getTodayKey();

  function findCat(id) { return cats.find(c => c.id === id); }
  function findPlace(cat, id) { return cat.places.find(p => p.id === id); }

  function renderPhoto(cat, p) {
    if (!p.photos || !p.photos.length) return '';
    return `<div class="ck-photos">${p.photos.map((src, i) => `
      <div class="ck-photo-wrap">
        <img class="ck-photo" src="${src}" alt="打卡照片 ${i + 1}">
        <button class="ck-photo-del" data-del-photo="${i}" data-cat="${cat.id}" data-place="${p.id}" title="删除照片">×</button>
      </div>`).join('')}</div>`;
  }

  function renderPlace(cat, p) {
    const done = p.checked;
    return `<div class="ck-place ${done ? 'done' : ''}" data-cat="${cat.id}" data-place="${p.id}">
      <div class="ck-place-top">
        <button class="ck-check ${done ? 'on' : ''}" data-cat="${cat.id}" data-place="${p.id}" data-act="toggle" aria-label="打卡">${done ? icon('check', 12) : ''}</button>
        <div class="ck-place-main">
          <span class="ck-name">${escapeHTML(p.name)}</span>
          ${p.note ? `<span class="ck-note">${escapeHTML(p.note)}</span>` : ''}
        </div>
        ${p.points > 0 ? `<span class="mli-points">+${p.points}</span>` : ''}
      </div>
      ${done ? `<div class="ck-date">📅 ${escapeHTML(p.date || today)}</div>` : ''}
      ${renderPhoto(cat, p)}
      ${p.mood ? `<p class="ck-mood">${icon('edit', 11)} ${escapeHTML(p.mood)}</p>` : ''}
      <div class="ck-actions">
        <button class="ck-act" data-cat="${cat.id}" data-place="${p.id}" data-act="photo">${icon('camera', 12)} 照片</button>
        <button class="ck-act" data-cat="${cat.id}" data-place="${p.id}" data-act="mood">${icon('edit', 12)} 心得</button>
        <button class="ck-act" data-cat="${cat.id}" data-place="${p.id}" data-act="edit">编辑</button>
        <button class="ck-act danger" data-cat="${cat.id}" data-place="${p.id}" data-act="del">删除</button>
      </div>
    </div>`;
  }

  function renderCat(cat) {
    const checked = cat.places.filter(p => p.checked).length;
    return `<div class="ck-group">
      <div class="ck-group-head">
        <span class="ck-group-icon" style="color:#7FB0D3">${icon(cat.icon || 'mountain', 14)}</span>
        <span class="ck-group-name">${escapeHTML(cat.name)}</span>
        <span class="ck-group-meta">${checked}/${cat.places.length}</span>
        <button class="module-add-btn" data-add-place="${cat.id}" title="新增地点">${icon('plus', 12)}</button>
      </div>
      <div class="ck-list">
        ${cat.places.length ? cat.places.map(p => renderPlace(cat, p)).join('') : '<div class="module-empty">还没有地点，点右上角 + 添加你想实地到访的地方～</div>'}
      </div>
    </div>`;
  }

  page.innerHTML = `
    <div class="sub-page-head">
      ${backButtonHTML('旅行体验')}
      <h3 class="sub-title">地点打卡 <span class="sub-spark">${icon('flag', 14)}</span></h3>
    </div>

    <div class="module-rule-banner" id="checkin-rule" title="打卡说明">
      <span class="mrb-icon">${icon('info', 12)}</span>
      <span class="mrb-text">实地到访完成打卡拿对应积分；可上传打卡照片、记录心得心情。状态不好可直接跳过，无惩罚。</span>
    </div>

    ${cats.map(renderCat).join('')}

    <div class="module-foot-note">
      <span>${icon('info', 12)}</span>
      <p>这是一份轻松的「想去清单」，不强制、不赶场；哪天顺路就打个卡，攒点小积分也好。</p>
    </div>
  `;
  content.appendChild(page);

  page.querySelectorAll('[data-go]').forEach(b => b.addEventListener('click', () => selectItem(b.dataset.go)));

  // 新增地点
  page.querySelectorAll('[data-add-place]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const cat = findCat(btn.dataset.addPlace);
      if (!cat) return;
      const name = await openModal('新增地点', '', '地点名称');
      if (name === null || !name.trim()) return;
      const note = await openModal('备注（可选）', '', '简短备注，如交通 / 看点');
      const pts = await openModal('打卡积分', '5', '积分数字');
      let points = parseInt(pts, 10);
      if (isNaN(points) || points < 0) points = 0;
      cat.places.push({ id: uid('ckp'), name: name.trim(), note: note === null ? '' : note.trim(), points, checked: false, date: '', photos: [], mood: '' });
      saveTravel();
      renderTravelCheckinPage();
    });
  });

  // 照片删除
  page.querySelectorAll('[data-del-photo]').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const cat = findCat(btn.dataset.cat), p = cat && findPlace(cat, btn.dataset.place);
      if (!p) return;
      const idx = parseInt(btn.dataset.delPhoto, 10);
      if (!(await appConfirm('删除这张打卡照片？'))) return;
      p.photos.splice(idx, 1);
      saveTravel();
      renderTravelCheckinPage();
    });
  });

  // 地点操作：打卡 / 照片 / 心得 / 编辑 / 删除
  page.querySelectorAll('.ck-actions .ck-act, .ck-check').forEach(el => {
    el.addEventListener('click', async (e) => {
      e.stopPropagation();
      const cat = findCat(el.dataset.cat);
      if (!cat) return;
      const p = findPlace(cat, el.dataset.place);
      if (!p) return;
      const act = el.dataset.act;
      if (act === 'toggle') {
        const was = p.checked;
        p.checked = !was;
        const d = p.points > 0 ? p.points : 0;
        if (d > 0) {
          const delta = was ? -d : d;
          state.points = Math.max(0, (state.points || 0) + delta);
          t.log[today] = Math.max(0, (t.log[today] || 0) + delta);
          savePoints();
        }
        p.date = p.checked ? today : '';
        saveTravel();
        renderTravelCheckinPage();
      } else if (act === 'photo') {
        const inp = document.createElement('input');
        inp.type = 'file'; inp.accept = 'image/*'; inp.multiple = true;
        inp.onchange = async () => {
          const files = Array.from(inp.files || []);
          for (const f of files) {
            if (p.photos.length >= 6) { await appConfirm('每个地点最多保存 6 张照片，多余的已忽略。'); break; }
            try { const url = await fileToResizedDataURL(f, 720, 0.6); p.photos.push(url); }
            catch (err) { /* 忽略无法读取的图片 */ }
          }
          saveTravel();
          renderTravelCheckinPage();
        };
        inp.click();
      } else if (act === 'mood') {
        const v = await openModal('记录心得 / 心情', p.mood || '', '这次到访的感受、吃到什么、看到什么…');
        if (v === null) return;
        p.mood = v.trim();
        saveTravel();
        renderTravelCheckinPage();
      } else if (act === 'edit') {
        const name = await openModal('编辑地点名称', p.name, '地点名称');
        if (name === null) return;
        const note = await openModal('编辑备注', p.note, '简短备注');
        const pts = await openModal('编辑打卡积分', String(p.points), '积分数字');
        let points = parseInt(pts, 10);
        if (isNaN(points) || points < 0) points = p.points > 0 ? p.points : 0;
        const oldPts = p.points > 0 ? p.points : 0;
        p.name = name.trim() || p.name;
        p.note = note === null ? p.note : note.trim();
        p.points = points;
        if (p.checked) {
          const diff = (points > 0 ? points : 0) - oldPts;
          if (diff !== 0) {
            state.points = Math.max(0, (state.points || 0) + diff);
            t.log[today] = Math.max(0, (t.log[today] || 0) + diff);
            savePoints();
          }
        }
        saveTravel();
        renderTravelCheckinPage();
      } else if (act === 'del') {
        if (!(await appConfirm('删除这个地点？打卡记录也会一并移除。'))) return;
        cat.places = cat.places.filter(x => x.id !== p.id);
        saveTravel();
        renderTravelCheckinPage();
      }
    });
  });
}

// ============ 社交拓展（低精力版） ============
function renderSocialPage() {
  // 关键：内部 toggle / + 按钮会递归调用本函数，必须先清空防止整页叠加
  content.innerHTML = '';
  const page = document.createElement('div');
  page.className = 'page';
  if (greetLine) greetLine.textContent = '社交拓展';
  const s = state.social || JSON.parse(JSON.stringify(DEFAULT_SOCIAL));
  const today = getTodayKey();
  const doneToday = s.actions.filter(a => a.done && a.date === today).length;
  const ws = getWeekStart();
  let weekPts = 0;
  for (const k in (s.log || {})) { if (k >= ws && k <= today) weekPts += (s.log[k] || 0); }
  const doneWeek = s.actions.filter(a => a.done && a.date >= ws && a.date <= today).length;
  function socialSuggest() {
    if (weekPts > 0 && s.contactsThisWeek > 0) return '这周已经和舒服的老朋友有了联系，维系关系不费力就很好 💗';
    if (weekPts > 0) return '这周已经做了一些轻松的维系，不用强迫自己更多。';
    if (s.actions.length > 0) return '给熟悉的老朋友发一句简短问候，就是今天很温柔的一步。';
    return '';
  }

  function renderActionItem(a, delType) {
    const done = a.done && a.date === today;
    return `<div class="module-list-item ${done ? 'done' : ''}" data-action-id="${a.id}">
      <button class="mli-check" aria-label="完成">${done ? icon('check', 10) : ''}</button>
      <span class="mli-text">${escapeHTML(a.text)}</span>
      <span class="mli-points">+${a.points}</span>
      <div class="module-item-actions">
        <button class="module-act-btn module-edit-btn" data-edit-type="${delType}" data-edit-id="${a.id}" title="编辑">${icon('edit', 11)}</button>
        <button class="module-act-btn module-del-btn" data-del-type="${delType}" data-del-id="${a.id}" title="删除">${icon('delete', 11)}</button>
      </div>
    </div>`;
  }

  page.innerHTML = `
    <div class="sub-page-head">
      ${backButtonHTML('我的支线')}
      <h3 class="sub-title">社交拓展 <span class="sub-spark">${icon('sparkle', 14)}</span></h3>
    </div>

    <div class="module-hero module-hero-social">
      <div class="mh-body">
        <h4>关系需要养护</h4>
        <p class="mh-sub">社交不必勉强，小幅度维系就足够</p>
        <div class="mh-tag" id="social-contact-tag">
          <span class="mh-tag-dot"></span>
          <span>本周待联系：${s.contactsThisWeek || 0} 人</span>
        </div>
      </div>
    </div>

    <div class="section-card module-card">
      <div class="module-card-head">
        <span class="module-card-icon" style="color:#E8A77C">${icon('heart', 14)}</span>
        <span class="soft-card-title" style="margin:0;">本周行动</span>
        <span class="module-card-meta">${doneToday}/${s.actions.length}</span>
        <button class="module-add-btn" id="social-add-action" title="新增">${icon('plus', 12)}</button>
      </div>
      <div class="module-list" id="social-actions">
        ${s.actions.length ? s.actions.map(a => renderActionItem(a, 'social-action')).join('') : '<div class="module-empty">本周还没有行动，状态不好时可以直接跳过～</div>'}
      </div>
    </div>

    <div class="section-card module-card">
      <div class="module-card-head">
        <span class="module-card-icon" style="color:#A99BD6">${icon('target', 14)}</span>
        <span class="soft-card-title" style="margin:0;">关系目标</span>
      </div>
      <p class="module-goal-text" id="social-goal-text">${escapeHTML(s.goal || DEFAULT_SOCIAL.goal)}</p>
      <button class="module-edit-goal" id="social-edit-goal">${icon('edit', 11)} 修改目标</button>
    </div>

  `;
  content.appendChild(page);

  page.querySelectorAll('[data-go]').forEach(b => b.addEventListener('click', () => selectItem(b.dataset.go)));

  // 完成行动
  page.querySelectorAll('#social-actions .module-list-item').forEach(row => {
    row.addEventListener('click', () => {
      if (row.classList.contains('show-delete')) return;
      const id = row.dataset.actionId;
      const action = s.actions.find(a => a.id === id);
      if (!action) return;
      const wasDone = action.done && action.date === today;
      action.done = !wasDone;
      action.date = today;
      if (action.text.includes('老朋友') && action.done) {
        s.contactsThisWeek = (s.contactsThisWeek || 0) + 1;
      } else if (action.text.includes('老朋友') && !action.done) {
        s.contactsThisWeek = Math.max(0, (s.contactsThisWeek || 0) - 1);
      }
      if (action.done) {
        state.points = (state.points || 0) + action.points;
        s.log[today] = (s.log[today] || 0) + action.points;
      } else {
        state.points = Math.max(0, (state.points || 0) - action.points);
        s.log[today] = Math.max(0, (s.log[today] || 0) - action.points);
      }
      savePoints();
      saveSocial();
      renderSocialPage();
    });
  });

  // 新增行动
  page.querySelector('#social-add-action').addEventListener('click', async () => {
    const text = await openModal('新增本周行动', '', '例如：给老朋友发一句问候');
    if (text === null || !text.trim()) return;
    const pts = await openModal('奖励积分', '5', '输入数字');
    const points = Number(pts);
    s.actions.push({ id: uid('sa'), text: text.trim(), points: Number.isFinite(points) && points > 0 ? points : 5, done: false });
    saveSocial();
    renderSocialPage();
  });

  // 修改目标
  page.querySelector('#social-edit-goal').addEventListener('click', async () => {
    const text = await openModal('修改关系目标', s.goal || DEFAULT_SOCIAL.goal, '请输入新的关系目标');
    if (text === null) return;
    s.goal = text.trim() || DEFAULT_SOCIAL.goal;
    saveSocial();
    renderSocialPage();
  });
}

// ============ 护肤日常（低精力版） ============
function renderSkincarePage() {
  const sc = state.skincare;
  if (greetLine) greetLine.textContent = '护肤日常';
  const today = getTodayKey();
  if (!sc.log) sc.log = {};
  if (!sc.log[today]) sc.log[today] = { done: 0, total: 0 };
  const page = document.createElement('div');
  page.className = 'page';

  const routineHTML = sc.routine.map(group => {
    const done = group.items.filter(it => it.done).length;
    return `<div class="module-card" data-group="${escapeHTML(group.id)}">
      <div class="module-card-head">
        <span class="module-card-title">${escapeHTML(group.name)}</span>
        <span class="module-card-meta">${done}/${group.items.length}</span>
      </div>
      <div class="module-list">
        ${group.items.map(it => `<div class="module-list-item ${it.done ? 'done' : ''}" data-item="${escapeHTML(it.id)}" data-group="${escapeHTML(group.id)}">
          <span class="mli-check">${it.done ? icon('check', 12) : ''}</span>
          <span class="mli-text">${escapeHTML(it.text)}</span>
          <div class="module-item-actions">
            <button class="module-act-btn module-edit-btn" data-edit-type="skincare-item" data-edit-id="${escapeHTML(it.id)}" data-group="${escapeHTML(group.id)}" title="编辑">${icon('edit', 11)}</button>
            <button class="module-act-btn module-del-btn" data-del-type="skincare-item" data-del-id="${escapeHTML(it.id)}" data-group="${escapeHTML(group.id)}" title="删除">${icon('delete', 11)}</button>
          </div>
        </div>`).join('')}
      </div>
    </div>`;
  }).join('');

  page.innerHTML = `
    <div class="domain-hero">
      <div class="domain-head">
        <div class="domain-icon">${icon('leaf', 24)}</div>
        <div>
          <h3 class="domain-title">护肤日常</h3>
          <p class="domain-subtitle">低精力也能坚持的轻松护肤节奏</p>
        </div>
      </div>
    </div>

    <div class="module-rule-banner">
      <span class="mrb-icon">${icon('info', 12)}</span>
      <span class="mrb-text">早晚各花几分钟就好，状态不好可以只做最基础的清洁 + 保湿，不强迫完整流程。</span>
    </div>

    <div class="module-stats-grid">
      <div class="module-stat"><b>${sc.log[today].done}</b><span>今日完成</span></div>
      <div class="module-stat"><b>${sc.routine.reduce((a, g) => a + g.items.length, 0)}</b><span>护理步骤</span></div>
    </div>

    ${routineHTML}

    <div class="soft-card" style="margin-top:12px;">
      <div class="soft-card-title">${icon('edit', 16)} 护肤小记</div>
      <textarea class="swot-area" id="sk-notes" placeholder="记下今天皮肤状态、想试的新品，或偷懒的那天也没关系～">${escapeHTML(sc.notes || '')}</textarea>
    </div>

    <div class="module-foot-note">
      <span>${icon('info', 12)}</span>
      <p>护肤是给自己的小小照顾，完成了开心，没完成也别自责。</p>
    </div>
  `;
  content.appendChild(page);

  page.querySelectorAll('.module-list-item').forEach(el => {
    el.addEventListener('click', () => {
      if (el.classList.contains('show-delete')) return;
      const g = sc.routine.find(x => x.id === el.dataset.group);
      if (!g) return;
      const it = g.items.find(x => x.id === el.dataset.item);
      if (!it) return;
      it.done = !it.done;
      const todayDone = sc.routine.reduce((a, gr) => a + gr.items.filter(x => x.done).length, 0);
      sc.log[today] = { done: todayDone, total: sc.routine.reduce((a, gr) => a + gr.items.length, 0) };
      saveSkincare();
      renderSkincarePage();
    });
  });

  page.querySelector('#sk-notes').addEventListener('change', (e) => {
    sc.notes = e.target.value;
    saveSkincare();
  });
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
      <p class="me-foot-text">愿你在每一个计划里，遇见更好的自己${icon('sparkle', 12)}</p>
    </div>

    <div class="me-grid">
      <div class="me-card me-card-wide" data-me="theme"><span class="mc-emoji" style="color:var(--primary)">${icon('palette', 20)}</span><span class="mc-title">主题外观</span><span class="mc-desc">花园兔兔</span>
        <div class="theme-previews">
          <span class="theme-prev tp-garden" title="花园兔兔">🐰</span>
          <span class="theme-prev tp-cream" title="奶油暖阳">☀️</span>
          <span class="theme-prev tp-mint" title="薄荷清风">🌿</span>
          <span class="theme-prev tp-night" title="星夜静谧">🌙</span>
        </div>
      </div>
      <div class="me-card" data-me="focus"><span class="mc-emoji" style="color:var(--purple)">${icon('bell', 20)}</span><span class="mc-title">提醒与专注</span><span class="mc-desc">专注提醒 已开启</span></div>
      <div class="me-card" data-me="privacy"><span class="mc-emoji" style="color:var(--green)">${icon('lock', 20)}</span><span class="mc-title">数据与隐私</span><span class="mc-desc">数据统计 / 隐私</span></div>
      <div class="me-card" data-me="export"><span class="mc-emoji" style="color:var(--gold-deep)">${icon('save', 20)}</span><span class="mc-title">导出备份</span><span class="mc-desc">导出 / 云端</span></div>
    </div>

    <div class="me-milestones">
      <div class="me-milestone"><b>${streak}</b><span>连续记录(天)</span></div>
      <div class="me-milestone"><b>${readBooks}</b><span>阅读(本)</span></div>
      <div class="me-milestone"><b>1</b><span>副业项目</span></div>
    </div>

    <div class="section-card" id="me-focus-card" hidden style="margin-top:14px;">
      <div class="soft-card-title">${icon('bell', 16)} 提醒与专注</div>
      <div class="setting-row"><div class="setting-label">专注提醒<small>开始专注时通知</small></div><span class="switch-on">已开启</span></div>
      <div class="setting-row"><div class="setting-label">每日计划提醒<small>晚间固定提醒</small></div><span class="setting-val">21:00</span></div>
      <div class="setting-row"><div class="setting-label">习惯打卡提醒<small>每日打卡</small></div><span class="switch-on">已开启</span></div>
      <div class="setting-row"><div class="setting-label">专注默认时长</div>
        <div class="focus-presets" style="justify-content:flex-start;">
          ${[15, 25, 45, 60].map(m => `<button class="focus-preset${state.focus.preset === m ? ' active' : ''}" data-min="${m}">${m} 分</button>`).join('')}
        </div>
      </div>
    </div>

    <div class="section-card" id="me-privacy-card" hidden style="margin-top:14px;">
      <div class="soft-card-title">${icon('lock', 16)} 数据与隐私</div>
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
  page.querySelector('#me-reset-menu').addEventListener('click', async () => {
    if (!await appConfirm('确认恢复默认菜单结构？自定义分组会丢失。')) return;
    localStorage.removeItem('xenos-groups');
    state.groups = loadGroups(); saveGroups();
    state.activeItem = '设置'; renderMenu(); renderContent(); renderMobileTabs();
  });
  page.querySelector('#me-reset-all').addEventListener('click', async () => {
    if (!await appConfirm('确认清空全部数据？此操作不可恢复！', { danger: true })) return;
    if (!await appConfirm('再次确认：所有记录都会被删除。', { danger: true })) return;
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

// v9271：通用单选/多选底部弹层。options: [{label, value}]，selected: value|values|Set，返回 promise（resolve 选中值或 null 取消）
function openOptionPicker(title, options, selected, opts) {
  return new Promise(resolve => {
    const o = opts || {};
    const isMulti = !!o.multi;
    const sel = isMulti ? new Set(Array.isArray(selected) ? selected : (selected ? [selected] : [])) : (selected == null ? null : selected);
    const body = options.map((it, i) => {
      const checked = isMulti ? sel.has(it.value) : (sel === it.value);
      return '<label class="lk-pick-row' + (checked ? ' on' : '') + '" data-pick-i="' + i + '"><span class="lk-pick-name">' + escapeHTML(it.label) + (it.sub ? '<small>' + escapeHTML(it.sub) + '</small>' : '') + '</span><span class="lk-pick-radio">' + (checked ? icon('check', 16) : '') + '</span></label>';
    }).join('');
    openInsightSheet(title, body);
    const overlay = document.querySelector('.insp-sheet-overlay');
    const sheetBody = overlay.querySelector('.insp-sheet-body');
    sheetBody.innerHTML = '<div class="lk-pick-list">' + body + '</div>' + (isMulti ? '<div class="lk-pick-foot"><button class="lk-pick-confirm">完成</button></div>' : '');
    sheetBody.addEventListener('click', e => {
      const row = e.target.closest('[data-pick-i]');
      if (!row) return;
      const it = options[parseInt(row.dataset.pickI)];
      if (isMulti) {
        if (sel.has(it.value)) sel.delete(it.value); else sel.add(it.value);
        row.classList.toggle('on', sel.has(it.value));
        row.querySelector('.lk-pick-radio').innerHTML = sel.has(it.value) ? icon('check', 16) : '';
      } else {
        closeInsightSheet();
        resolve(it.value);
      }
    });
    const confirmBtn = overlay.querySelector('.lk-pick-confirm');
    if (confirmBtn) confirmBtn.addEventListener('click', () => { closeInsightSheet(); resolve(Array.from(sel)); });
    const prev = closeInsightSheet;
    // 用户点关闭按钮 / 蒙层时返回 null
    overlay.querySelector('.insp-sheet-close').onclick = () => { prev(); resolve(null); };
    overlay.onclick = e => { if (e.target === overlay) { prev(); resolve(null); } };
  });
}

function fmtMetric(v, unit) {
  const n = Math.round(Number(v) || 0);
  return unit ? (n + ' ' + unit) : ('' + n);
}
function deltaBadge(cur, last, unit) {
  const diff = (Number(cur) || 0) - (Number(last) || 0);
  const abs = Math.round(Math.abs(diff));
  const u = unit || '';
  if (diff > 0) return '<span class="insp-delta up">▲' + abs + u + '</span>';
  if (diff < 0) return '<span class="insp-delta down">▼' + abs + u + '</span>';
  return '<span class="insp-delta flat">—</span>';
}
function barPct(v, arr) {
  const mx = Math.max(1, ...arr.map(x => Number(x) || 0));
  return Math.round((Number(v) || 0) / mx * 100);
}

function catCardHTML(s, hidden) {
  return '<div class="insp-cat-card clickable-card' + (hidden ? ' insight-hidden' : '') + '" data-cat="' + s.id + '" style="--c:' + s.color + ';--cb:' + s.bg + '">'
    + '<div class="insp-cat-head"><span class="insp-cat-ic" style="background:' + s.bg + ';color:' + s.color + '">' + icon(s.icon, 16) + '</span>'
    + '<span class="insp-cat-name">' + s.name + '</span><span class="insp-cat-go">›</span></div>'
    + '<div class="insp-cat-metrics">'
    + '<div class="insp-cm"><div class="insp-cm-val">' + s.items + '<span class="insp-cm-unit">项</span></div><div class="insp-cm-label">完成总项 ' + deltaBadge(s.items, s.itemsLast, '项') + '</div></div>'
    + '<div class="insp-cm"><div class="insp-cm-val">' + Math.round(s.metric) + '<span class="insp-cm-unit">' + s.metricUnit + '</span></div><div class="insp-cm-label">' + s.metricName + ' ' + deltaBadge(s.metric, s.metricLast, s.metricUnit) + '</div></div>'
    + '<div class="insp-cm"><div class="insp-cm-val">' + s.avg + '<span class="insp-cm-unit">' + s.avgUnit + '</span></div><div class="insp-cm-label">' + s.avgName + '</div></div>'
    + '</div></div>';
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
  // v9270：弹窗打开时所有勾选框默认空，状态由用户点击切换。
  // 不再自动勾选所有模块，避免弹窗一打开就显示「全选中」的视觉。
  const sel = getInsightModules();
  const body = '<p class="insp-diy-tip">勾选要展示的板块，未勾选的会自动隐藏。新增板块后会自动出现在这里。</p>'
    + '<div class="insp-diy-list">' + INSIGHT_MODULES.filter(m => !INSIGHT_HIDDEN_MODULES.includes(m.id)).map(m => '<label class="insp-diy-item" style="--c:' + m.color + '"><input type="checkbox" data-id="' + m.id + '"><span class="insp-diy-ic" style="background:' + m.bg + ';color:' + m.color + '">' + icon(m.icon, 15) + '</span><span class="insp-diy-name">' + m.name + '</span><span class="insp-diy-metric">' + m.metricName + '</span></label>').join('') + '</div>';
  openInsightSheet('自定义模块', body);
  const overlay = document.querySelector('.insp-sheet-overlay');
  overlay.querySelectorAll('.insp-diy-item input').forEach(cb => {
    cb.checked = sel.includes(cb.dataset.id);
    cb.addEventListener('change', () => {
      let cur = getInsightModules().filter(id => INSIGHT_MODULES.some(m => m.id === id));
      if (cb.checked) { if (!cur.includes(cb.dataset.id)) cur.push(cb.dataset.id); }
      else { const i = cur.indexOf(cb.dataset.id); if (i >= 0) cur.splice(i, 1); }
      saveInsightModules(cur);
      renderContent();
    });
  });
}

function openInsightDetail(s) {
  const weekdayLabels = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
  const dailyRows = weekdayLabels.map((d, i) => '<div class="insp-dt-row"><span class="insp-dt-day">' + d + '</span><span class="insp-dt-bar"><i style="width:' + barPct(s.daily[i], s.daily) + '%;background:' + s.color + '"></i></span><span class="insp-dt-val">' + fmtMetric(s.daily[i], s.metricUnit) + '</span><span class="insp-dt-items">' + s.dailyItems[i] + ' 项</span></div>').join('');
  const body = '<div class="insp-dt-head"><span class="insp-dt-ic" style="background:' + s.bg + ';color:' + s.color + '">' + icon(s.icon, 18) + '</span><div><div class="insp-dt-name">' + s.name + ' · 本周详情</div><div class="insp-dt-sub">' + shiftDate(s.weekStart, 0).slice(5) + ' ~ ' + shiftDate(s.weekStart, 6).slice(5) + '</div></div></div>'
    + '<div class="insp-dt-nums"><div><b>' + s.items + ' 项</b><span>完成总项</span></div><div><b>' + Math.round(s.metric) + ' ' + s.metricUnit + '</b><span>' + s.metricName + '</span></div><div><b>' + s.avg + ' ' + s.avgUnit + '</b><span>' + s.avgName + '</span></div></div>'
    + '<div class="insp-dt-cmp">较上周：完成 ' + deltaBadge(s.items, s.itemsLast, '项') + ' · ' + s.metricName + ' ' + deltaBadge(s.metric, s.metricLast, s.metricUnit) + '</div>'
    + '<div class="insp-dt-chart">' + weeklyLineChart(s.daily, s.color, s.metricUnit) + '</div>'
    + '<div class="insp-dt-list">' + dailyRows + '</div>'
    + '<p class="insp-dt-tip">本页仅作数据展示，打卡与记录请回到对应的工作台页面完成。</p>';
  openInsightSheet('', body);
}

function renderWeeklyIngredientStatsHTML(weekStart) {
  const stats = getWeekIngredientStats(weekStart);
  const consumedHTML = stats.consumed.length
    ? stats.consumed.map(c => `<div class="wi-stat-row"><span class="wi-name">${escapeHtml(c.name)}</span><span class="wi-qty">${Number(c.qty) || 0} ${escapeHtml(c.unit || '')}</span></div>`).join('')
    : '<p class="memo-empty">本周还没有消耗食材记录</p>';
  const purchasedHTML = stats.purchased.length
    ? stats.purchased.map(p => `<div class="wi-stat-row"><span class="wi-name">${escapeHtml(p.name)}</span><span class="wi-sub">购 ${escapeHtml(p.purchaseDate || '—')}</span></div>`).join('')
    : '<p class="memo-empty">本周暂无新增购入</p>';
  const wasteHTML = stats.expiredWaste.length
    ? stats.expiredWaste.map(w => `<div class="wi-stat-row wi-waste"><span class="wi-name">${escapeHtml(w.name)}</span><span class="wi-sub">期 ${escapeHtml(w.expiryDate || '—')} · 剩 ${Number(w.remaining) || 0}${escapeHtml(w.unit || '')}</span></div>`).join('')
    : '<p class="memo-empty">本周无过期浪费 🎉</p>';
  const suggestHTML = stats.suggestions.map(s => `<div class="insp-suggest-card"><span class="insp-suggest-ic">${icon('leaf', 14)}</span><p>${escapeHtml(s)}</p></div>`).join('');
  return '<div class="insp-section wi-section"><div class="insp-section-head"><span class="insp-section-title"><span class="insp-sec-leaf">' + icon('leaf', 14) + '</span> 每周食材统计</span><span class="insp-section-more">饮食 · 库存</span></div>'
    + '<div class="wi-grid">'
    + '<div class="wi-block"><div class="wi-block-head">本周消耗</div><div class="wi-block-body">' + consumedHTML + '</div></div>'
    + '<div class="wi-block"><div class="wi-block-head">本周新增购入</div><div class="wi-block-body">' + purchasedHTML + '</div></div>'
    + '<div class="wi-block"><div class="wi-block-head">本周过期浪费</div><div class="wi-block-body">' + wasteHTML + '</div></div>'
    + '</div>'
    + '<div class="insp-suggest-list">' + suggestHTML + '</div></div>';
}

function renderWeeklyIngredientStatsFlatHTML(weekStart) {
  const stats = getWeekIngredientStats(weekStart);
  const consumedHTML = stats.consumed.length
    ? stats.consumed.map(c => `<div class="diet-flat-wi-row"><span class="wi-name">${escapeHtml(c.name)}</span><span class="wi-qty">${Number(c.qty) || 0} ${escapeHtml(c.unit || '')}</span></div>`).join('')
    : '<p class="memo-empty" style="margin:4px 0 0;">本周还没有消耗食材记录</p>';
  const purchasedHTML = stats.purchased.length
    ? stats.purchased.map(p => `<div class="diet-flat-wi-row"><span class="wi-name">${escapeHtml(p.name)}</span><span class="wi-sub">购 ${escapeHtml(p.purchaseDate || '—')}</span></div>`).join('')
    : '<p class="memo-empty" style="margin:4px 0 0;">本周暂无新增购入</p>';
  const wasteHTML = stats.expiredWaste.length
    ? stats.expiredWaste.map(w => `<div class="diet-flat-wi-row wi-waste"><span class="wi-name">${escapeHtml(w.name)}</span><span class="wi-sub">期 ${escapeHtml(w.expiryDate || '—')} · 剩 ${Number(w.remaining) || 0}${escapeHtml(w.unit || '')}</span></div>`).join('')
    : '<p class="memo-empty" style="margin:4px 0 0;">本周无过期浪费 🎉</p>';
  const suggestHTML = stats.suggestions.map(s => `<div class="diet-flat-wi-suggest-item">${icon('leaf', 14)}<p>${escapeHtml(s)}</p></div>`).join('');
  return '<div class="diet-flat-wi-head">' + icon('leaf', 14) + ' 每周食材统计<span class="diet-head-meta">饮食 · 库存</span></div>'
    + '<div class="diet-flat-wi-grid">'
    + '<div class="diet-flat-wi-block"><div class="diet-flat-wi-block-head">本周消耗</div>' + consumedHTML + '</div>'
    + '<div class="diet-flat-wi-block"><div class="diet-flat-wi-block-head">本周新增购入</div>' + purchasedHTML + '</div>'
    + '<div class="diet-flat-wi-block"><div class="diet-flat-wi-block-head">本周过期浪费</div>' + wasteHTML + '</div>'
    + '</div>'
    + (suggestHTML ? '<div class="diet-flat-wi-suggest">' + suggestHTML + '</div>' : '');
}
let insightChartShown = []; // 折线图图例筛选状态：仅控制曲线显隐，会话内稳定、不持久化，加载时为空（全部标签未选中）
let insightChartSVG = null;      // 折线图 SVG 节点实例：数据指纹未变时跨渲染复用同一节点，画布容器不变、线条实例唯一
let insightChartFingerprint = ''; // 图表数据指纹（各曲线 id+值序列+日期标签），用于判断能否复用 SVG 实例
function renderInsightPage() {
  content.innerHTML = '';
  const page = document.createElement('div');
  page.className = 'page';
  if (greetLine) greetLine.textContent = '本周洞察';

  const weekStart = getWeekStart(insightWeekOffset);
  const sunday = shiftDate(weekStart, 6);
  const weekdayLabels = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
  const enabled = getInsightModules().filter(id => INSIGHT_MODULES.some(m => m.id === id));
  // 数据源排除洞察页隐藏名单（travel/social）：卡片、图例、热力图、建议统一不再展示它们；
  // 工作台本体页面不受影响，且其 DIY 启用状态保留（后续从隐藏名单移除即可恢复展示）
  const allStats = INSIGHT_MODULES.filter(m => !INSIGHT_HIDDEN_MODULES.includes(m.id)).map(m => computeInsightStats(m, weekStart));
  // 卡片/热力图/建议始终展示全部已开启模块（enabled）；图例仅作为折线图曲线筛选器，二者解耦
  const visibleStats = allStats.filter(s => enabled.includes(s.id));
  // hiddenIds 仅由图例筛选状态决定：未选中的标签 → 对应曲线隐藏；默认全部未选中（空图表）
  const hiddenIds = new Set(allStats.filter(s => !insightChartShown.includes(s.id)).map(s => s.id));
  const rangeText = weekStart.slice(5) + ' ~ ' + sunday.slice(5);

  // ---- 折线图 SVG 实例管理：画布容器保持不变、线条实例唯一 ----
  // 数据指纹相同（仅标签勾选变化）→ 复用同一 SVG 节点，只重置各曲线显隐；
  // 数据指纹变化（切周/数据更新）→ 重建 SVG 节点以更新曲线内容。
  const chartSeries = allStats.map(s => ({ id: s.id, name: s.name, color: s.color, values: s.daily }));
  const chartFp = chartSeries.map(s => s.id + ':' + s.values.join(',')).join('|') + '#' + weekdayLabels.join(',');
  if (insightChartSVG && insightChartFingerprint === chartFp) {
    // 复用：仅按当前勾选状态切换各曲线显示/隐藏，不重建任何线条实例
    insightChartSVG.querySelectorAll('.chart-series').forEach(g => {
      g.style.display = insightChartShown.includes(g.dataset.seriesId) ? 'block' : 'none';
    });
  } else {
    // 重建：数据已变化，生成新的 SVG 实例（一次性包含全部曲线，未选中 display:none）
    insightChartFingerprint = chartFp;
    const tmp = document.createElement('div');
    tmp.innerHTML = multiSeriesLineChart(chartSeries, weekdayLabels, hiddenIds);
    insightChartSVG = tmp.firstElementChild;
  }

  function legendItemHTML(s) {
    const active = insightChartShown.includes(s.id);
    // 未选中：仅彩色描边（--mc 模块色）+ 透明底；选中：填充模块淡彩色底（inline background）
    const btnStyle = '--mc:' + s.color + (active ? ';background:' + s.bg : '');
    return '<button class="insp-line-legend-item' + (active ? ' active' : '') + '" data-id="' + s.id + '" title="' + (active ? '隐藏' : '显示') + ' ' + s.name + '" style="' + btnStyle + '"><span class="insp-line-dot"></span><span>' + s.name + ' ' + Math.round(s.metric) + s.metricUnit + '</span></button>';
  }

  function cardsHTML() {
    if (!allStats.length) return '<div class="insp-empty">当前没有显示任何模块卡片，点击右上角「自定义」勾选要追踪的板块～</div>';
    return allStats.map(s => catCardHTML(s, !enabled.includes(s.id))).join('');
  }

  function cardsHTML() {
    if (!allStats.length) return '<div class="insp-empty">当前没有显示任何模块卡片，点击右上角「自定义」勾选要追踪的板块～</div>';
    return allStats.map(s => catCardHTML(s, !enabled.includes(s.id))).join('');
  }

  function cardsHTML() {
    if (!allStats.length) return '<div class="insp-empty">当前没有显示任何模块卡片，点击右上角「自定义」勾选要追踪的板块～</div>';
    return allStats.map(s => catCardHTML(s, !enabled.includes(s.id))).join('');
  }

  function heatmapHTML() {
    const header = '<div class="ih-row ih-header-row"><span></span><span></span>' + weekdayLabels.map(l => '<span class="ih-day">' + l + '</span>').join('') + '</div>';
    const rows = allStats.map(s => {
      const hiddenCls = enabled.includes(s.id) ? '' : ' insight-hidden';
      return '<div class="ih-row' + hiddenCls + '" data-row-id="' + s.id + '"><span class="ih-icon" style="color:' + s.color + '">' + icon(s.icon, 12) + '</span><span class="ih-name">' + s.name + '</span>' + s.levels.map(lv => '<span class="ih-dot lvl' + lv + '"></span>').join('') + '</div>';
    }).join('');
    return header + rows;
  }

  function suggestionsHTML(stats) {
    return '';
  }

  page.innerHTML = '<div class="insp-page">'
    + '<div class="insp-top">'
    + '<div class="insp-top-left">'
    + '<h2 class="insp-main-title">本周洞察 <span class="insp-title-spark">' + icon('sparkle', 16) + '</span></h2>'
    + '<button class="insp-week-btn" id="insp-week-btn">' + rangeText + '<span class="insp-date-arrow">▼</span></button>'
    + '<button class="insp-diy-btn" id="insp-diy-btn">'
    + icon('list', 13) + ' 自定义</button>'
    + '</div>'
    + '<div class="insp-top-right">'
    + '<div class="insp-mascot-img" title="xenos"><img src="images/3.png" alt="mascot"></div>'
    + '</div>'
    + '</div>'

    + '<div class="insp-cards-grid" id="insp-cards-grid">' + cardsHTML() + '</div>'

    + '<div class="insp-section"><div class="insp-section-head"><span class="insp-section-title"><span class="insp-sec-spark">' + icon('sparkle', 14) + '</span> 每周数据变化</span><span class="insp-section-more">相对趋势 · 可同时勾选多个</span></div>'
    + '<div class="insp-line-card combined-line-card"><div class="insp-line-wrap" id="insp-line-wrap"></div><div class="insp-line-legend" id="insp-line-legend">' + allStats.map(legendItemHTML).join('') + '</div></div></div>'

    + '<div class="insp-section"><div class="insp-section-head"><span class="insp-section-title"><span class="insp-sec-heart">' + icon('heart', 14) + '</span> 习惯完成热力图</span><span class="insp-heat-legend"><i class="ht-low"></i><i class="ht-mid"></i><i class="ht-high"></i>完成度 低 → 高</span></div>'
    + '<div class="insp-heatmap-wrap"><div class="insp-heatmap-grid insp-heat-grid2" id="insp-heatmap-grid">' + heatmapHTML() + '</div></div></div>'

    + '</div>';
  content.appendChild(page);
  // 插入（或复用）折线图 SVG 实例：同一节点跨渲染移动，线条实例不重复生成
  const lineWrap = page.querySelector('#insp-line-wrap');
  if (lineWrap && insightChartSVG) lineWrap.appendChild(insightChartSVG);

  page.querySelector('#insp-week-btn').addEventListener('click', openWeekPicker);
  page.querySelector('#insp-diy-btn').addEventListener('click', openInsightDIY);
  page.querySelectorAll('.insp-cat-card').forEach(el => {
    el.addEventListener('click', () => {
      const st = allStats.find(x => x.id === el.dataset.cat);
      if (st) openInsightDetail(st);
    });
  });

  page.querySelectorAll('.insp-line-legend-item').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      const active = insightChartShown.includes(id);
      // 仅切换「折线图曲线筛选」状态：不影响卡片、热力图、优化建议（各自由 DIY 已开启模块控制）
      if (active) insightChartShown = insightChartShown.filter(x => x !== id);
      else insightChartShown.push(id);

      // 1) 切换图表中对应曲线显示/隐藏（画布容器保持不变，仅切换已存在线条实例的显隐）
      const seriesGroup = (insightChartSVG || page).querySelector('.chart-series[data-series-id="' + id + '"]');
      if (seriesGroup) seriesGroup.style.display = active ? 'none' : 'block';

      // 2) 更新图例按钮自身样式（填充/描边切换）
      btn.classList.toggle('active', !active);
      const s = allStats.find(x => x.id === id);
      if (s) {
        btn.title = (!active ? '隐藏' : '显示') + ' ' + s.name;
        btn.style.background = active ? '' : s.bg;
      }
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
      ${backButtonHTML('我的支线')}
      <h3 class="sub-title">项目计划 <span class="sub-spark">${icon('sparkle', 14)}</span></h3>
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
      <p class="kr-foot">继续保持，稳步向前！${icon('sparkle', 12)}</p>
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
    <button class="item-delete" data-id="${p.id}" data-del-type="plan" aria-label="删除"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>
  </div>`).join('');
}
function weeksLeft(deadline) {
  const d = new Date(deadline + 'T00:00:00');
  return Math.max(0, Math.round((d - new Date()) / 86400000));
}

// ============ 快速记录模态框 ============
let qrCurrentTab = 'sport';
let qrMoneySubType = 'expense';

function qrAccountName(id) {
  return (state.assetAccounts || []).find(a => a.id === id)?.name || '余额';
}

function quickRecordBunnySVG() {
  return `<svg class="qr-bunny" viewBox="0 0 80 80" aria-hidden="true">
    <ellipse cx="25" cy="18" rx="7" ry="12" fill="#FFF5F0"/>
    <ellipse cx="27" cy="20" rx="3.5" ry="7" fill="#FFD6D6"/>
    <ellipse cx="55" cy="18" rx="7" ry="12" fill="#FFF5F0"/>
    <ellipse cx="53" cy="20" rx="3.5" ry="7" fill="#FFD6D6"/>
    <ellipse cx="40" cy="40" rx="24" ry="20" fill="#FFF5F0"/>
    <circle cx="32" cy="37" r="2.2" fill="#6B5B50"/>
    <circle cx="48" cy="37" r="2.2" fill="#6B5B50"/>
    <circle cx="28" cy="42" r="2.8" fill="#FFD6D6" opacity="0.5"/>
    <circle cx="52" cy="42" r="2.8" fill="#FFD6D6" opacity="0.5"/>
    <ellipse cx="40" cy="44" rx="2" ry="1.5" fill="#FFB6B6"/>
    <path d="M38 47 Q40 49 42 47" stroke="#6B5B50" stroke-width="1" fill="none" stroke-linecap="round"/>
    <ellipse cx="58" cy="55" rx="10" ry="7" fill="#FFE8D6" opacity="0.9"/>
    <rect x="50" y="48" width="16" height="11" rx="2.5" fill="#FFF0E0" stroke="#E8C9A8" stroke-width="0.8"/>
    <path d="M66 51 Q69 51 69 55 Q69 59 66 59" fill="none" stroke="#E8C9A8" stroke-width="1" stroke-linecap="round"/>
    <circle cx="62" cy="65" r="1" fill="#F5A962" opacity="0.5"/>
  </svg>`;
}

function openQuickRecordModal(tab, subType) {
  qrCurrentTab = tab || 'sport';
  qrMoneySubType = subType || 'expense';
  const modal = document.getElementById('quick-record-modal');
  if (!modal) return;
  // v9289：移除 qr-bunny-deco 兔子装饰，标题区左对齐
  renderQuickRecordBody(qrCurrentTab, qrMoneySubType);
  modal.classList.add('active');
}

function closeQuickRecordModal() {
  const modal = document.getElementById('quick-record-modal');
  if (modal) modal.classList.remove('active');
}

function sportTabHTML() {
  return `<div class="qr-field"><label>运动时长（分钟）</label><input type="number" id="qr-min" value="20" min="0"></div>
    <div class="qr-field"><label>运动类型</label><div class="qr-chips" id="qr-sport-chips">
      <span class="qr-chip active" data-t="跑步"><span class="qr-chip-ico">${icon('running', 14)}</span>跑步</span>
      <span class="qr-chip" data-t="走路"><span class="qr-chip-ico">${icon('walk', 14)}</span>走路</span>
      <span class="qr-chip" data-t="骑行"><span class="qr-chip-ico">${icon('bike', 14)}</span>骑行</span>
      <span class="qr-chip" data-t="健身"><span class="qr-chip-ico">${icon('dumbbell', 14)}</span>健身</span>
      <span class="qr-chip" data-t="瑜伽"><span class="qr-chip-ico">${icon('meditate', 14)}</span>瑜伽</span>
      <span class="qr-chip" data-t="其他"><span class="qr-chip-ico">${icon('sparkle', 14)}</span>其他</span>
    </div></div>
    <div class="qr-field"><label>备注</label><input type="text" id="qr-note" placeholder="今天做了什么运动？"></div>`;
}

function sleepTabHTML() {
  return `<div class="qr-time-row">
      <div class="qr-time-card" id="qr-bed-card">
        <span class="qr-time-label"><span class="qr-time-ico">${icon('moon', 14)}</span>睡觉时间</span>
        <span class="qr-time-val" id="qr-bed-val">22:30</span>
        <input type="time" id="qr-bed" value="22:30" class="qr-time-input">
      </div>
      <div class="qr-time-sep">›</div>
      <div class="qr-time-card" id="qr-wake-card">
        <span class="qr-time-label"><span class="qr-time-ico">${icon('sunrise', 14)}</span>起床时间</span>
        <span class="qr-time-val" id="qr-wake-val">06:30</span>
        <input type="time" id="qr-wake" value="06:30" class="qr-time-input">
      </div>
    </div>
    <div class="qr-field qr-range-field">
      <div class="qr-range-head"><label>睡眠质量</label><span id="qr-q-val" class="qr-q-val">82分</span></div>
      <div class="qr-range-track">
        <div class="qr-range-fill" id="qr-range-fill" style="width:82%"></div>
        <input type="range" class="qr-range" id="qr-quality" min="0" max="100" value="82">
      </div>
      <div class="qr-range-labels"><span>很差</span><span>较差</span><span>一般</span><span>良好</span><span>很好</span></div>
    </div>
    <div class="qr-field"><label>睡眠状态</label><div class="qr-chips qr-chips-lg" id="qr-sleep-chips">
      <span class="qr-chip" data-s="入睡快"><span class="qr-chip-ico">😊</span>入睡快</span>
      <span class="qr-chip active" data-s="一般"><span class="qr-chip-ico">😐</span>一般</span>
      <span class="qr-chip" data-s="易醒"><span class="qr-chip-ico">😫</span>易醒</span>
    </div></div>
    <div class="qr-field qr-note-field">
      <label>睡眠备注 <span class="qr-optional">（可选）</span></label>
      <textarea id="qr-note" placeholder="记录一下昨晚的睡眠感受吧～" maxlength="100"></textarea>
      <span class="qr-count" id="qr-note-count">0/100</span>
    </div>`;
}

function moneyTabHTML(subType) {
  const isIncome = subType === 'income';
  const cats = isIncome ? state.incomeCategories : state.expenseCategories;
  const firstCat = cats && cats[0] ? cats[0].name : '其他';
  const firstAcc = state.assetAccounts && state.assetAccounts[0] ? state.assetAccounts[0].id : 'balance';
  return `<div class="qr-field"><label>类型</label><div class="qr-chips" id="qr-type-chips">
      <span class="qr-chip ${isIncome ? '' : 'active'}" data-type="expense">💸 支出</span>
      <span class="qr-chip ${isIncome ? 'active' : ''}" data-type="income">💵 收入</span>
    </div></div>
    <div class="qr-field"><label>金额（元）</label><input type="number" id="qr-amount" value="" min="0" step="0.01" placeholder="0.00"></div>
    <div class="qr-field"><label>分类</label><div class="qr-select-row" id="qr-category-btn" data-value="${escapeHtml(firstCat)}"><span id="qr-category-text">${escapeHtml(firstCat)}</span><span>›</span></div></div>
    <div class="qr-field"><label>账户</label><div class="qr-select-row" id="qr-account-btn" data-value="${escapeHtml(firstAcc)}"><span id="qr-account-text">${escapeHtml(qrAccountName(firstAcc))}</span><span>›</span></div></div>
    <div class="qr-field"><label>备注</label><input type="text" id="qr-note" placeholder="这笔钱用来做什么？"></div>`;
}

function ideaTabHTML() {
  return `<div class="qr-field qr-note-field">
      <label>想法 / 灵感</label>
      <textarea id="qr-idea" placeholder="记下来，灵感才不会溜走～" maxlength="200"></textarea>
      <span class="qr-count" id="qr-idea-count">0/200</span>
    </div>`;
}

const QR_TITLES = { sport: '运动', sleep: '睡眠', money: '记账', idea: '灵感' };
const QR_SHORT_LABELS = { sport: '运动', sleep: '睡眠', money: '收支', idea: '想法' };
const QR_SHORT_ICONS = { sport: 'dumbbell', sleep: 'moon', money: 'coins', idea: 'bulb' };
const QR_SHORT_SUBS = { money: 'income' };
const QR_SHORT_TIPS = { sport: '打卡运动时长', sleep: '记录睡眠时间', money: '记录一笔收入', idea: '闪现一个想法' };
const QR_SHORT_COLORS = { sport: 'qr-short-green', sleep: 'qr-short-blue', money: 'qr-short-gold', idea: 'qr-short-pink' };

function renderQuickShortcuts(current) {
  const grid = document.getElementById('qr-short-grid');
  if (!grid) return;
  // v9294：恢复 4 张全显示（图2 2×2 排版），加回<b>主名（类别名「运动/睡眠/收支/想法」），保留<small>副名
  const order = ['sport', 'sleep', 'money', 'idea'];
  grid.innerHTML = order.map(t => {
    const sub = QR_SHORT_SUBS[t] || '';
    const subAttr = sub ? ` data-sub="${sub}"` : '';
    return `<button class="qr-short" data-qr="${t}"${subAttr}>
      <span class="qr-short-ico ${QR_SHORT_COLORS[t]}">${icon(QR_SHORT_ICONS[t], 15)}</span>
      <span class="qr-short-text"><b>${QR_SHORT_LABELS[t]}</b><small>${QR_SHORT_TIPS[t]}</small></span>
      <span class="qr-short-arrow">›</span>
    </button>`;
  }).join('');
}

function renderQuickRecordBody(tab, subType) {
  const body = document.getElementById('qr-body');
  if (!body) return;
  if (tab === 'sport') body.innerHTML = sportTabHTML();
  else if (tab === 'sleep') body.innerHTML = sleepTabHTML();
  else if (tab === 'money') body.innerHTML = moneyTabHTML(subType);
  else body.innerHTML = ideaTabHTML();
  const titleEl = document.getElementById('qr-title');
  if (titleEl) titleEl.textContent = (QR_TITLES[tab] || '快速记录') + ' ✨';
  renderQuickShortcuts(tab);
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
      const sub = s.dataset.sub;
      qrCurrentTab = tab;
      renderQuickRecordBody(tab, sub);
    };
  });
  const closeBtn = modal.querySelector('#qr-close');
  if (closeBtn) closeBtn.onclick = closeQuickRecordModal;
  modal.onclick = (e) => { if (e.target === modal) closeQuickRecordModal(); };
  modal.querySelectorAll('.qr-chip').forEach(c => {
    c.onclick = () => {
      const group = c.closest('.qr-chips');
      if (!group) return;
      if (group.id !== 'qr-type-chips') {
        group.querySelectorAll('.qr-chip').forEach(x => x.classList.remove('active'));
        c.classList.add('active');
      } else {
        group.querySelectorAll('.qr-chip').forEach(x => x.classList.remove('active'));
        c.classList.add('active');
        const type = c.dataset.type;
        qrMoneySubType = type;
        const cats = type === 'income' ? state.incomeCategories : state.expenseCategories;
        const firstCat = cats && cats[0] ? cats[0].name : '其他';
        const catBtn = modal.querySelector('#qr-category-btn');
        if (catBtn) {
          catBtn.dataset.value = firstCat;
          catBtn.querySelector('#qr-category-text').textContent = firstCat;
        }
      }
    };
  });
  // v9273：替换浏览器默认 time picker，用工作台自定义 openTimePicker
  const bedCard = modal.querySelector('#qr-bed-card');
  if (bedCard) {
    bedCard.onclick = async () => {
      const cur = (modal.querySelector('#qr-bed-val') || {}).textContent || '22:30';
      const v = await openTimePicker({ initial: cur });
      if (v !== undefined) {
        const valEl = modal.querySelector('#qr-bed-val');
        if (valEl) valEl.textContent = v || cur;
      }
    };
  }
  const wakeCard = modal.querySelector('#qr-wake-card');
  if (wakeCard) {
    wakeCard.onclick = async () => {
      const cur = (modal.querySelector('#qr-wake-val') || {}).textContent || '06:30';
      const v = await openTimePicker({ initial: cur });
      if (v !== undefined) {
        const valEl = modal.querySelector('#qr-wake-val');
        if (valEl) valEl.textContent = v || cur;
      }
    };
  }
  const q = modal.querySelector('#qr-quality');
  if (q) q.oninput = () => {
    const v = modal.querySelector('#qr-q-val');
    if (v) v.textContent = q.value + '分';
    const fill = modal.querySelector('#qr-range-fill');
    if (fill) fill.style.width = q.value + '%';
  };
  const noteArea = modal.querySelector('#qr-note');
  if (noteArea) noteArea.oninput = () => {
    const c = modal.querySelector('#qr-note-count');
    if (c) c.textContent = noteArea.value.length + '/100';
  };
  const ideaArea = modal.querySelector('#qr-idea');
  if (ideaArea) ideaArea.oninput = () => {
    const c = modal.querySelector('#qr-idea-count');
    if (c) c.textContent = ideaArea.value.length + '/200';
  };
  const catBtn = modal.querySelector('#qr-category-btn');
  if (catBtn) catBtn.onclick = async () => {
    const typeChip = modal.querySelector('#qr-type-chips .qr-chip.active');
    const type = typeChip ? typeChip.dataset.type : 'expense';
    const cats = type === 'income' ? state.incomeCategories : state.expenseCategories;
    const items = (cats || []).map(c => ({ value: c.name, label: c.name, icon: renderItemIcon(c.icon || 'box', 16) }));
    if (!items.length) items.push({ value: '其他', label: '其他', icon: icon('box', 16) });
    const picked = await pickCategory({ title: `选择${type === 'income' ? '收入' : '支出'}分类`, items, value: catBtn.dataset.value || items[0].value });
    if (picked) {
      catBtn.dataset.value = picked;
      catBtn.querySelector('#qr-category-text').textContent = picked;
    }
  };
  const accBtn = modal.querySelector('#qr-account-btn');
  if (accBtn) accBtn.onclick = async () => {
    const items = (state.assetAccounts || []).map(a => ({ value: a.id, label: a.name, icon: renderItemIcon(a.debt ? 'creditCard' : 'wallet', 16) }));
    if (!items.length) items.push({ value: 'balance', label: '余额', icon: icon('wallet', 16) });
    const picked = await pickCategory({ title: '选择账户', items, value: accBtn.dataset.value || items[0].value });
    if (picked) {
      accBtn.dataset.value = picked;
      accBtn.querySelector('#qr-account-text').textContent = qrAccountName(picked);
    }
  };
  const save = modal.querySelector('#qr-save');
  if (save) save.onclick = saveQuickRecord;
}

async function saveQuickRecord() {
  const modal = document.getElementById('quick-record-modal');
  if (!modal) return;
  const tab = qrCurrentTab;
  const noteEl = modal.querySelector('#qr-note');
  const note = noteEl ? noteEl.value : '';
  if (tab === 'sport') {
    const minutes = parseInt((modal.querySelector('#qr-min') || {}).value) || 0;
    const typeChip = modal.querySelector('#qr-sport-chips .qr-chip.active');
    const sportType = typeChip ? typeChip.dataset.t : '运动';
    const todayKey = getTodayKey();
    if (!state.exerciseLogs[todayKey]) state.exerciseLogs[todayKey] = [];
    state.exerciseLogs[todayKey].push({ id: uid('ex'), name: note || sportType, duration: minutes, calories: estimateExerciseCalories(sportType, minutes), done: true });
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
    if (isNaN(amount) || amount <= 0) { await appAlert('请输入有效金额'); return; }
    const catBtn = modal.querySelector('#qr-category-btn');
    const category = catBtn ? (catBtn.dataset.value || '其他') : '其他';
    const accBtn = modal.querySelector('#qr-account-btn');
    const accountId = accBtn ? (accBtn.dataset.value || state.assetAccounts[0]?.id || 'balance') : (state.assetAccounts[0]?.id || 'balance');
    state.transactions.push({ id: uid('tx'), date: getTodayKey(), type, amount: Math.round(amount * 100) / 100, category, note, accountId });
    saveTransactions();
    syncAssetAmounts();
    state.money.total = calcAssetTotal();
    saveMoney();
  } else {
    const idea = (modal.querySelector('#qr-idea') || {}).value || '';
    if (!idea.trim()) { await appAlert('写点什么吧～'); return; }
    if (!Array.isArray(state.memos)) state.memos = [];
    state.memos.push({ id: uid('memo'), date: getTodayKey(), text: idea });
    saveMemos();
  }
  closeQuickRecordModal();
  renderContent();
}

// ==================== v9253：暂时放缓 6 模块（摄影/考证/家居/烹饪/音乐/公益） ====================
// 全局统一：压缩头部高度 + 右上角洞察开关 + 角落吉祥物贴纸 + 真实可交互组件
const SLOW_MODULE_DEF = {
  photography: { key: 'photography', title: '摄影审美', icon: 'camera', color: '#7FB0D3', bg: '#EDF5FB', save: savePhotography, points: 5 },
  cert: { key: 'cert', title: '技能考证', icon: 'scroll', color: '#C9A87C', bg: '#F7F0E6', save: saveCert, points: 5 },
  homeorg: { key: 'homeorg', title: '家居整理', icon: 'home', color: '#A0BB7A', bg: '#F1F6E9', save: saveHomeOrg, points: 5 },
  music: { key: 'music', title: '音乐练习', icon: 'music', color: '#B8AAD8', bg: '#F2EFF9', save: saveMusic, points: 5 },
};

// 模块页头（压缩垂直高度）：返回箭头 + 标题 + 洞察开关
function slowPageHead(cfg) {
  const m = state[cfg.key] || {};
  const on = !!m.enabled;
  return `<div class="slow-head">
    ${backButtonHTML('我的支线')}
    <h3 class="slow-title">${cfg.title}</h3>
    <button class="slow-insight-toggle${on ? ' on' : ''}" data-insight-toggle="${cfg.key}" title="是否纳入本周洞察统计">${icon('chart', 13)}<span>${on ? '已统计' : '统计'}</span></button>
  </div>`;
}

// 本周统计：积分 / 打卡次数 / 累计时长 / 每日序列
function slowWeekStats(key) {
  const m = state[key] || {};
  const ws = getWeekStart();
  const today = getTodayKey();
  const log = m.log || {};
  const checkin = m.checkin || {};
  let pts = 0, times = 0, minutes = 0;
  const series = [];
  for (let i = 0; i < 7; i++) {
    const d = shiftDate(ws, i);
    if (d > today) { series.push(0); continue; }
    pts += Number(log[d] || 0);
    const c = checkin[d];
    if (c && c.done) { times += 1; minutes += Number(c.minutes || 0); }
    series.push(Number(log[d] || 0));
  }
  return { pts, times, minutes, series };
}

// 统计小卡片 + 折线圆点趋势
function slowStatsCard(cfg, stats, items) {
}

// 今日打卡卡片（字段可配置）
function slowCheckinCard(cfg, opts) {
  const m = state[cfg.key] || {};
  const today = getTodayKey();
  const c = (m.checkin || {})[today] || {};
  const done = !!c.done;
  return `<div class="section-card module-card slow-checkin">
    <div class="module-card-head">
      <span class="module-card-icon" style="color:${cfg.color}">${icon(cfg.icon, 14)}</span>
      <span class="soft-card-title" style="margin:0;">${opts.title}</span>
      <span class="module-card-meta">${done ? '今日已完成' : '待完成'}</span>
    </div>
    ${opts.fields.map(f => `<div class="slow-field">
      <span class="slow-label">${f.label}</span>
      <input class="pf-input" id="slow-${cfg.key}-${f.key}" type="${f.type || 'text'}" value="${escapeHTML(String(c[f.key] === undefined ? '' : c[f.key]))}" placeholder="${f.placeholder || ''}">
    </div>`).join('')}
    <button class="gold-btn slow-check-btn${done ? ' done' : ''}" data-slow-checkin="${cfg.key}">${done ? '✓ 今日已打卡（点击取消）' : `完成打卡 +${cfg.points}分`}</button>
  </div>`;
}

// 通用任务清单项（勾选 + 改积分 + 删除）
function slowTaskItem(t, delType) {
  const today = getTodayKey();
  const done = !!(t.done && t.date === today);
  const key = (delType || '').replace(/-task$/, '');
  return `<div class="module-list-item ${done ? 'done' : ''}" data-action-id="${t.id}">
    <button class="mli-check" aria-label="完成">${done ? icon('check', 10) : ''}</button>
    <span class="mli-text">${escapeHTML(t.text)}</span>
    <span class="mli-points">+${t.points || 3}</span>
    <div class="module-item-actions">
      <button class="module-act-btn module-edit-btn" data-edit-type="slow-task-pts" data-edit-id="${t.id}" data-edit-key="${key}" title="修改积分">${icon('edit', 11)}</button>
      <button class="module-act-btn module-del-btn" data-del-type="${delType}" data-del-id="${t.id}" title="删除">${icon('delete', 11)}</button>
    </div>
  </div>`;
}

// 通用记录卡片（作品 / 曲目 / 菜谱 / 经历）
function slowRecordItem(r, delType, showImg) {
  return `<div class="slow-record" data-rec-id="${r.id}">
    ${showImg && r.img ? `<img class="slow-record-img" src="${r.img}" alt="${escapeHTML(r.title || r.name || '')}" data-view-img="${r.img}">` : ''}
    <div class="slow-record-main">
      <div class="slow-record-name">${escapeHTML(r.title || r.name || '未命名')}</div>
      <div class="slow-record-meta">
        ${r.tag ? `<span class="slow-tag">${escapeHTML(r.tag)}</span>` : ''}
        ${r.category ? `<span class="slow-tag">${escapeHTML(r.category)}</span>` : ''}
        ${r.date ? `<span>${escapeHTML(r.date)}</span>` : ''}
      </div>
      ${r.note ? `<div class="slow-record-note">${escapeHTML(r.note)}</div>` : ''}
      ${r.content ? `<div class="slow-record-note">${escapeHTML(r.content)}</div>` : ''}
    </div>
    <button class="slow-record-del" data-del-type="${delType}" data-del-id="${r.id}" title="删除">${icon('delete', 12)}</button>
  </div>`;
}

// 空状态
function slowEmpty(text) { return `<p class="empty-note">${text}</p>`; }

// —— 事件绑定：洞察开关 ——
function bindSlowInsightToggle(page) {
  const btn = page.querySelector('[data-insight-toggle]');
  if (!btn) return;
  btn.addEventListener('click', () => {
    const key = btn.dataset.insightToggle;
    const cfg = SLOW_MODULE_DEF[key];
    if (!cfg) return;
    const m = state[key];
    m.enabled = !m.enabled;
    cfg.save();
    btn.classList.toggle('on', m.enabled);
    const span = btn.querySelector('span');
    if (span) span.textContent = m.enabled ? '已统计' : '统计';
    toast(m.enabled ? '已纳入本周洞察统计' : '已移出本周洞察统计');
  });
}

// —— 事件绑定：今日打卡 ——
function bindSlowCheckin(page, cfg, rerender) {
  const btn = page.querySelector(`[data-slow-checkin="${cfg.key}"]`);
  if (!btn) return;
  btn.addEventListener('click', () => {
    const m = state[cfg.key];
    const today = getTodayKey();
    if (!m.checkin) m.checkin = {};
    if (!m.checkin[today]) m.checkin[today] = {};
    const c = m.checkin[today];
    const card = btn.closest('.slow-checkin');
    if (card) {
      card.querySelectorAll('.slow-field input').forEach(inp => {
        const k = inp.id.replace(`slow-${cfg.key}-`, '');
        c[k] = inp.value;
      });
    }
    const wasDone = !!c.done;
    c.done = !wasDone;
    const delta = wasDone ? -cfg.points : cfg.points;
    state.points = Math.max(0, (state.points || 0) + delta);
    if (!m.log) m.log = {};
    m.log[today] = Math.max(0, (m.log[today] || 0) + delta);
    if (c.done) state.checkins[today] = true;
    saveCheckins(); savePoints(); cfg.save();
    rerender();
  });
}

// —— 事件绑定：任务清单勾选 + 删除 ——
function bindSlowTasks(page, cfg, sel, field, delType, rerender) {
  const m = state[cfg.key];
  const list = m[field] || (m[field] = []);
  page.querySelectorAll(sel).forEach(row => {
    row.addEventListener('click', (e) => {
      if (e.target.closest('.module-del-btn') || e.target.closest('.module-edit-btn')) return;
      const id = row.dataset.actionId;
      const t = list.find(x => x.id === id);
      if (!t) return;
      const today = getTodayKey();
      const wasDone = !!(t.done && t.date === today);
      t.done = !wasDone;
      t.date = today;
      const p = t.points || 3;
      const delta = wasDone ? -p : p;
      state.points = Math.max(0, (state.points || 0) + delta);
      if (!m.log) m.log = {};
      m.log[today] = Math.max(0, (m.log[today] || 0) + delta);
      if (t.done) state.checkins[today] = true;
      saveCheckins(); savePoints(); cfg.save();
      rerender();
    });
  });
  page.querySelectorAll(`[data-del-type="${delType}"]`).forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.dataset.delId;
      const i = list.findIndex(x => x.id === id);
      if (i >= 0) { list.splice(i, 1); cfg.save(); rerender(); }
    });
  });
}

// —— 事件绑定：图片点击放大预览 ——
function bindSlowImagePreview(page) {
  page.querySelectorAll('[data-view-img]').forEach(img => {
    img.addEventListener('click', (e) => {
      e.stopPropagation();
      const src = img.dataset.viewImg;
      const ov = document.createElement('div');
      ov.className = 'slow-img-overlay';
      ov.innerHTML = `<img src="${src}" alt="预览">`;
      ov.addEventListener('click', () => ov.remove());
      document.body.appendChild(ov);
    });
  });
}

// ==================== 摄影审美 ====================
function renderPhotographyPage() {
  content.innerHTML = '';
  const cfg = SLOW_MODULE_DEF.photography;
  if (!state.photography) state.photography = JSON.parse(JSON.stringify(DEFAULT_PHOTOGRAPHY));
  const m = state.photography;
  const today = getTodayKey();
  const stats = slowWeekStats('photography');
  const page = document.createElement('div');
  page.className = 'page';
  if (greetLine) greetLine.textContent = '摄影审美';

  const TAGS = ['人像', '风景', '静物'];
  let curTag = TAGS[0];

  function photoSuggest() {
    if (stats.times >= 3) return '这周练习很稳定，可以挑一张最满意的作品写写心得 📷';
    if (stats.times > 0) return '已经开始了就很好，下次试试只练一个构图元素，不用一次到位。';
    return '';
  }

  page.innerHTML = `
    ${slowPageHead(cfg)}
    ${slowCheckinCard(cfg, {
      title: '今日练习打卡',
      fields: [
        { key: 'content', label: '练习内容', placeholder: '例：构图练习 / 修图 / 看优秀作品 / 外出实拍' },
        { key: 'minutes', label: '耗时（分钟）', type: 'number', placeholder: '30' }
      ]
    })}

    <div class="section-card module-card">
      <div class="module-card-head">
        <span class="module-card-icon" style="color:${cfg.color}">${icon('image', 14)}</span>
        <span class="soft-card-title" style="margin:0;">作品记录库</span>
        <span class="module-card-meta">${m.records.length} 张</span>
      </div>
      <div class="slow-field"><span class="slow-label">标题</span><input class="pf-input" id="ph-title" placeholder="例：阳台的午后光影"></div>
      <div class="slow-field"><span class="slow-label">标签</span>
        <div class="slow-chips" id="ph-tags">
          ${TAGS.map((t, i) => `<button class="chip${i === 0 ? ' active' : ''}" data-tag="${t}">${t}</button>`).join('')}
        </div>
      </div>
      <div class="slow-field"><span class="slow-label">拍摄时间</span><div class="pf-input pf-date-trigger" id="ph-date" data-val="${today}">${formatDateCN(today)}</div></div>
      <div class="slow-field"><span class="slow-label">照片</span><input class="pf-input" id="ph-img" type="file" accept="image/*"></div>
      <div class="slow-field"><span class="slow-label">心得笔记</span><input class="pf-input" id="ph-note" placeholder="这张照片我想表达什么"></div>
      <div class="focus-actions" style="margin-top:10px;"><button class="gold-btn" id="ph-add">保存作品</button></div>
      <div class="slow-record-list" id="ph-records">
        ${m.records.length ? m.records.map(r => slowRecordItem(r, 'ph-record', true)).join('') : slowEmpty('还没有作品记录，先存一张吧')}
      </div>
    </div>

    <div class="section-card module-card">
      <div class="module-card-head">
        <span class="module-card-icon" style="color:${cfg.color}">${icon('star', 14)}</span>
        <span class="soft-card-title" style="margin:0;">审美素材收藏</span>
        <span class="module-card-meta">${m.favorites.length} 条</span>
      </div>
      <div class="slow-field"><span class="slow-label">素材标题</span><input class="pf-input" id="ph-fav-title" placeholder="例：某摄影师的光影处理"></div>
      <div class="slow-field"><span class="slow-label">分类</span><input class="pf-input" id="ph-fav-cat" placeholder="例：光影 / 构图 / 色彩"></div>
      <div class="slow-field"><span class="slow-label">摘抄感悟</span><input class="pf-input" id="ph-fav-note" placeholder="这段打动我的地方是…"></div>
      <div class="focus-actions" style="margin-top:10px;"><button class="gold-btn" id="ph-fav-add">收藏素材</button></div>
      <div class="slow-record-list" id="ph-favs">
        ${m.favorites.length ? m.favorites.map(r => slowRecordItem(r, 'ph-fav', false)).join('') : slowEmpty('还没有收藏素材')}
      </div>
    </div>

    <div class="section-card module-card">
      <div class="module-card-head">
        <span class="module-card-icon" style="color:${cfg.color}">${icon('list', 14)}</span>
        <span class="soft-card-title" style="margin:0;">练习计划清单</span>
        <span class="module-card-meta">${m.tasks.filter(t => t.done && t.date === today).length}/${m.tasks.length}</span>
      </div>
      <div class="module-list" id="ph-tasks">
        ${m.tasks.map(t => slowTaskItem(t, 'ph-task')).join('') || slowEmpty('还没有练习计划')}
      </div>
      <div class="slow-add-row">
        <input class="pf-input" id="ph-task-input" placeholder="添加练习小任务，如：练习三分构图">
        <button class="gold-btn" id="ph-task-add">添加</button>
      </div>
    </div>

    ${slowStatsCard(cfg, stats, [
      { value: stats.times, label: '本周练习次数' },
      { value: m.records.length, label: '累计作品' },
      { value: stats.pts, label: '本周积分' }
    ])}

  `;
  content.appendChild(page);

  bindSlowInsightToggle(page);
  bindSlowCheckin(page, cfg, renderPhotographyPage);
  bindSlowTasks(page, cfg, '#ph-tasks .module-list-item', 'tasks', 'ph-task', renderPhotographyPage);
  bindSlowImagePreview(page);

  // 标签选择
  page.querySelectorAll('#ph-tags .chip').forEach(btn => {
    btn.addEventListener('click', () => {
      page.querySelectorAll('#ph-tags .chip').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      curTag = btn.dataset.tag;
    });
  });

  // 删除作品 / 收藏
  page.querySelectorAll('[data-del-type="ph-record"]').forEach(b => {
    b.addEventListener('click', (e) => {
      e.stopPropagation();
      const i = m.records.findIndex(x => x.id === b.dataset.delId);
      if (i >= 0) { m.records.splice(i, 1); savePhotography(); renderPhotographyPage(); }
    });
  });
  page.querySelectorAll('[data-del-type="ph-fav"]').forEach(b => {
    b.addEventListener('click', (e) => {
      e.stopPropagation();
      const i = m.favorites.findIndex(x => x.id === b.dataset.delId);
      if (i >= 0) { m.favorites.splice(i, 1); savePhotography(); renderPhotographyPage(); }
    });
  });

  // v9274：替换浏览器默认日期为工作台触发器
  bindDateTrigger(page.querySelector('#ph-date'), { initial: today, format: formatDateCN });

  // 保存作品（含图片压缩）
  page.querySelector('#ph-add').addEventListener('click', async () => {
    const title = (page.querySelector('#ph-title').value || '').trim();
    if (!title) { toast('先给作品起个名字吧'); return; }
    const fileInput = page.querySelector('#ph-img');
    let img = '';
    if (fileInput && fileInput.files && fileInput.files[0]) {
      try { img = await fileToResizedDataURL(fileInput.files[0], 720, 0.6); } catch (e) { img = ''; }
    }
    m.records.unshift({
      id: uid('ph-r'), title, tag: curTag,
      date: page.querySelector('#ph-date').dataset.val || today,
      img, note: (page.querySelector('#ph-note').value || '').trim()
    });
    savePhotography();
    renderPhotographyPage();
    toast('作品已保存');
  });

  // 收藏素材
  page.querySelector('#ph-fav-add').addEventListener('click', () => {
    const title = (page.querySelector('#ph-fav-title').value || '').trim();
    if (!title) { toast('先写个素材标题吧'); return; }
    m.favorites.unshift({
      id: uid('ph-f'), title,
      category: (page.querySelector('#ph-fav-cat').value || '').trim(),
      note: (page.querySelector('#ph-fav-note').value || '').trim(),
      date: today
    });
    savePhotography();
    renderPhotographyPage();
    toast('已收藏');
  });

  // 添加练习任务
  const addTask = () => {
    const text = (page.querySelector('#ph-task-input').value || '').trim();
    if (!text) return;
    m.tasks.push({ id: uid('ph-t'), text, points: 3, done: false, date: '' });
    savePhotography();
    renderPhotographyPage();
  };
  page.querySelector('#ph-task-add').addEventListener('click', addTask);
  page.querySelector('#ph-task-input').addEventListener('keydown', (e) => { if (e.key === 'Enter') addTask(); });
}


// ==================== 技能考证 ====================
function renderCertPage() {
  content.innerHTML = '';
  const cfg = SLOW_MODULE_DEF.cert;
  if (!state.cert) state.cert = JSON.parse(JSON.stringify(DEFAULT_CERT));
  const m = state.cert;
  const today = getTodayKey();
  const stats = slowWeekStats('cert');
  const page = document.createElement('div');
  page.className = 'page';
  if (greetLine) greetLine.textContent = '技能考证';

  const total = m.tasks.length;
  const doneCount = m.tasks.filter(t => t.done).length;
  const pct = total ? Math.round(doneCount / total * 100) : 0;
  const goal = m.goal || { name: '', deadline: '' };

  function certSuggest() {
    if (stats.times >= 3) return '这周备考节奏不错，可以给自己留半天休息，别把弦绷太紧 📜';
    if (stats.times > 0) return '已经翻开书了就很棒，下次只啃一个小节，不求多。';
    return '先只做一件事：把证书名称和截止日期写下来，其他的慢慢来。';
  }

  page.innerHTML = `
    ${slowPageHead(cfg)}

    <div class="section-card module-card">
      <div class="module-card-head">
        <span class="module-card-icon" style="color:${cfg.color}">${icon('target', 14)}</span>
        <span class="soft-card-title" style="margin:0;">目标设置</span>
      </div>
      <div class="slow-field"><span class="slow-label">证书名称</span><input class="pf-input" id="ct-name" value="${escapeHTML(goal.name || '')}" placeholder="例：教师资格证"></div>
      <div class="slow-field"><span class="slow-label">截止日期</span><div class="pf-input pf-date-trigger" id="ct-deadline" data-val="${escapeHTML(goal.deadline || '')}">${goal.deadline ? formatDateCN(goal.deadline) : '轻点选择'}</div></div>
      <div class="focus-actions" style="margin-top:6px;"><button class="gold-btn" id="ct-goal-save">保存目标</button></div>
    </div>

    ${slowCheckinCard(cfg, {
      title: '每日备考打卡',
      fields: [
        { key: 'content', label: '学习内容', placeholder: '例：第三章考点 / 真题一套' },
        { key: 'minutes', label: '学习时长', type: 'number', placeholder: '60' }
      ]
    })}

    <div class="section-card module-card">
      <div class="module-card-head">
        <span class="module-card-icon" style="color:${cfg.color}">${icon('list', 14)}</span>
        <span class="soft-card-title" style="margin:0;">学习任务清单</span>
        <span class="module-card-meta">${doneCount}/${total}</span>
      </div>
      <div class="module-list" id="ct-tasks">
        ${m.tasks.map(t => slowTaskItem(t, 'ct-task')).join('') || slowEmpty('还没有备考任务')}
      </div>
      <div class="slow-add-row">
        <input class="pf-input" id="ct-task-input" placeholder="添加备考任务，如：刷一套真题">
        <button class="gold-btn" id="ct-task-add">添加</button>
      </div>
    </div>

    <div class="section-card module-card">
      <div class="module-card-head">
        <span class="module-card-icon" style="color:${cfg.color}">${icon('note', 14)}</span>
        <span class="soft-card-title" style="margin:0;">资料笔记库</span>
        <span class="module-card-meta">${m.records.length} 条</span>
      </div>
      <div class="slow-field"><span class="slow-label">笔记标题</span><input class="pf-input" id="ct-note-title" placeholder="例：第三章重点公式"></div>
      <div class="slow-field"><span class="slow-label">资料片段</span><input class="pf-input" id="ct-note-content" placeholder="粘贴保存的备考资料内容"></div>
      <div class="focus-actions" style="margin-top:6px;"><button class="gold-btn" id="ct-note-add">保存笔记</button></div>
      <div class="slow-record-list" id="ct-notes">
        ${m.records.length ? m.records.map(r => slowRecordItem(r, 'ct-record', false)).join('') : slowEmpty('还没有笔记')}
      </div>
    </div>

    <div class="section-card module-card">
      <div class="module-card-head">
        <span class="module-card-icon" style="color:${cfg.color}">${icon('chartLine', 14)}</span>
        <span class="soft-card-title" style="margin:0;">备考进度</span>
        <span class="module-card-meta">${pct}%</span>
      </div>
      <div class="slow-progress-row">
        <div class="slow-progress-bar"><i class="slow-progress-fill" style="width:${pct}%;background:${cfg.color}"></i></div>
      </div>
    </div>

    ${slowStatsCard(cfg, stats, [
      { value: stats.minutes, label: '本周分钟' },
      { value: stats.times, label: '学习次数' },
      { value: stats.pts, label: '本周积分' }
    ])}

    <div class="section-card module-card">
      <div class="module-card-head">
        <span class="module-card-icon" style="color:${cfg.color}">${icon('bulb', 14)}</span>
        <span class="soft-card-title" style="margin:0;">备考小建议</span>
      </div>
    </div>
  `;
  content.appendChild(page);

  bindSlowInsightToggle(page);
  bindSlowCheckin(page, cfg, renderCertPage);
  bindSlowTasks(page, cfg, '#ct-tasks .module-list-item', 'tasks', 'ct-task', renderCertPage);

  // v9274：替换浏览器默认日期为工作台触发器
  bindDateTrigger(page.querySelector('#ct-deadline'), { format: formatDateCN, placeholder: '轻点选择截止日' });

  page.querySelector('#ct-goal-save').addEventListener('click', () => {
    m.goal = {
      name: (page.querySelector('#ct-name').value || '').trim(),
      deadline: page.querySelector('#ct-deadline').dataset.val || ''
    };
    saveCert();
    toast('目标已保存');
    renderCertPage();
  });

  page.querySelector('#ct-note-add').addEventListener('click', () => {
    const title = (page.querySelector('#ct-note-title').value || '').trim();
    if (!title) { toast('先写个笔记标题吧'); return; }
    m.records.unshift({
      id: uid('ct-n'), title,
      content: (page.querySelector('#ct-note-content').value || '').trim(),
      date: today
    });
    saveCert();
    renderCertPage();
    toast('笔记已保存');
  });

  page.querySelectorAll('[data-del-type="ct-record"]').forEach(b => {
    b.addEventListener('click', (e) => {
      e.stopPropagation();
      const i = m.records.findIndex(x => x.id === b.dataset.delId);
      if (i >= 0) { m.records.splice(i, 1); saveCert(); renderCertPage(); }
    });
  });

  const addTask = () => {
    const text = (page.querySelector('#ct-task-input').value || '').trim();
    if (!text) return;
    m.tasks.push({ id: uid('ct-t'), text, points: 3, done: false, date: '' });
    saveCert();
    renderCertPage();
  };
  page.querySelector('#ct-task-add').addEventListener('click', addTask);
  page.querySelector('#ct-task-input').addEventListener('keydown', (e) => { if (e.key === 'Enter') addTask(); });
}

// ==================== 家居整理 ====================
function renderHomeOrgPage() {
  content.innerHTML = '';
  const cfg = SLOW_MODULE_DEF.homeorg;
  if (!state.homeorg) state.homeorg = JSON.parse(JSON.stringify(DEFAULT_HOMEORG));
  const m = state.homeorg;
  const today = getTodayKey();
  const stats = slowWeekStats('homeorg');
  const page = document.createElement('div');
  page.className = 'page';
  if (greetLine) greetLine.textContent = '家居整理';

  function homeSuggest() {
    if (stats.times >= 3) return '家里应该清爽多了，记得奖励自己一杯喜欢的饮料 🏠';
    if (stats.times > 0) return '已经动手了就好，下次只整理一个抽屉，不用一整间。';
    return '从最小的一块开始：桌面的一角，5 分钟就够。';
  }

  page.innerHTML = `
    ${slowPageHead(cfg)}
    ${slowCheckinCard(cfg, {
      title: '今日整理打卡',
      fields: [
        { key: 'area', label: '整理区域', placeholder: '例：衣柜 / 书桌 / 厨房' },
        { key: 'minutes', label: '耗时（分钟）', type: 'number', placeholder: '20' }
      ]
    })}

    <div class="section-card module-card">
      <div class="module-card-head">
        <span class="module-card-icon" style="color:${cfg.color}">${icon('list', 14)}</span>
        <span class="soft-card-title" style="margin:0;">整理任务清单</span>
        <span class="module-card-meta">${m.tasks.filter(t => t.done && t.date === today).length}/${m.tasks.length}</span>
      </div>
      <div class="module-list" id="hm-tasks">
        ${m.tasks.map(t => slowTaskItem(t, 'hm-task')).join('') || slowEmpty('还没有整理任务')}
      </div>
      <div class="slow-add-row">
        <input class="pf-input" id="hm-task-input" placeholder="添加待整理任务，如：清理冰箱">
        <button class="gold-btn" id="hm-task-add">添加</button>
      </div>
    </div>

    <div class="section-card module-card">
      <div class="module-card-head">
        <span class="module-card-icon" style="color:${cfg.color}">${icon('box', 14)}</span>
        <span class="soft-card-title" style="margin:0;">家居物品库存</span>
        <span class="module-card-meta">${m.records.length} 件</span>
      </div>
      <div class="slow-field"><span class="slow-label">物品名称</span><input class="pf-input" id="hm-item-name" placeholder="例：洗衣液"></div>
      <div class="slow-field"><span class="slow-label">数量</span><input class="pf-input" id="hm-item-qty" type="number" placeholder="1"></div>
      <div class="slow-field"><span class="slow-label">购入时间</span><div class="pf-input pf-date-trigger" id="hm-item-buy" data-val="${today}">${formatDateCN(today)}</div></div>
      <div class="slow-field"><span class="slow-label">过期提醒</span><div class="pf-input pf-date-trigger" id="hm-item-exp" data-val="" placeholder="可选">轻点选择</div></div>
      <div class="focus-actions" style="margin-top:6px;"><button class="gold-btn" id="hm-item-add">录入物品</button></div>
      <div class="slow-record-list" id="hm-items">
        ${m.records.length ? m.records.map(r => `
          <div class="slow-record" data-rec-id="${r.id}">
            <div class="slow-record-main">
              <div class="slow-record-name">${escapeHTML(r.name || '未命名')} ×${r.qty || 1}</div>
              <div class="slow-record-meta">
                <span class="slow-tag">购入 ${escapeHTML(r.buyDate || '')}</span>
                ${r.expiry ? `<span class="slow-tag">${r.expiry <= today ? '已过期' : '保质期至 ' + r.expiry}</span>` : ''}
              </div>
            </div>
            <button class="slow-record-del" data-del-type="hm-item" data-del-id="${r.id}" title="删除">${icon('delete', 12)}</button>
          </div>`).join('') : slowEmpty('还没有录入物品')}
      </div>
    </div>

    <div class="section-card module-card">
      <div class="module-card-head">
        <span class="module-card-icon" style="color:${cfg.color}">${icon('note', 14)}</span>
        <span class="soft-card-title" style="margin:0;">整理心得笔记</span>
      </div>
      <div class="slow-field"><span class="slow-label">心得</span><input class="pf-input" id="hm-note-input" placeholder="记下好用的收纳方法或灵感"></div>
      <div class="focus-actions" style="margin-top:6px;"><button class="gold-btn" id="hm-note-add">保存心得</button></div>
      <div class="slow-record-list" id="hm-notes">
        ${(m.notes || []).length ? m.notes.map(r => slowRecordItem(r, 'hm-note', false)).join('') : slowEmpty('还没有心得记录')}
      </div>
    </div>

    ${slowStatsCard(cfg, stats, [
      { value: stats.times, label: '本周整理次数' },
      { value: stats.minutes, label: '本周分钟' },
      { value: stats.pts, label: '本周积分' }
    ])}

  `;
  content.appendChild(page);

  bindSlowInsightToggle(page);
  bindSlowCheckin(page, cfg, renderHomeOrgPage);
  bindSlowTasks(page, cfg, '#hm-tasks .module-list-item', 'tasks', 'hm-task', renderHomeOrgPage);

  // v9274：替换浏览器默认日期为工作台触发器
  bindDateTrigger(page.querySelector('#hm-item-buy'), { initial: today, format: formatDateCN });
  bindDateTrigger(page.querySelector('#hm-item-exp'), { format: formatDateCN, placeholder: '轻点选择' });

  page.querySelector('#hm-item-add').addEventListener('click', () => {
    const name = (page.querySelector('#hm-item-name').value || '').trim();
    if (!name) { toast('先填写物品名称吧'); return; }
    m.records.unshift({
      id: uid('hm-i'), name,
      qty: Number(page.querySelector('#hm-item-qty').value) || 1,
      buyDate: page.querySelector('#hm-item-buy').dataset.val || today,
      expiry: page.querySelector('#hm-item-exp').dataset.val || ''
    });
    saveHomeOrg();
    renderHomeOrgPage();
    toast('已录入');
  });

  page.querySelector('#hm-note-add').addEventListener('click', () => {
    const text = (page.querySelector('#hm-note-input').value || '').trim();
    if (!text) { toast('写点什么吧'); return; }
    if (!m.notes) m.notes = [];
    m.notes.unshift({ id: uid('hm-n'), title: '整理心得', note: text, date: today });
    saveHomeOrg();
    renderHomeOrgPage();
    toast('已保存');
  });

  page.querySelectorAll('[data-del-type="hm-item"]').forEach(b => {
    b.addEventListener('click', (e) => {
      e.stopPropagation();
      const i = m.records.findIndex(x => x.id === b.dataset.delId);
      if (i >= 0) { m.records.splice(i, 1); saveHomeOrg(); renderHomeOrgPage(); }
    });
  });
  page.querySelectorAll('[data-del-type="hm-note"]').forEach(b => {
    b.addEventListener('click', (e) => {
      e.stopPropagation();
      const i = (m.notes || []).findIndex(x => x.id === b.dataset.delId);
      if (i >= 0) { m.notes.splice(i, 1); saveHomeOrg(); renderHomeOrgPage(); }
    });
  });

  const addTask = () => {
    const text = (page.querySelector('#hm-task-input').value || '').trim();
    if (!text) return;
    m.tasks.push({ id: uid('hm-t'), text, points: 3, done: false, date: '' });
    saveHomeOrg();
    renderHomeOrgPage();
  };
  page.querySelector('#hm-task-add').addEventListener('click', addTask);
  page.querySelector('#hm-task-input').addEventListener('keydown', (e) => { if (e.key === 'Enter') addTask(); });
}

function renderMusicPage() {
  content.innerHTML = '';
  const cfg = SLOW_MODULE_DEF.music;
  if (!state.music) state.music = JSON.parse(JSON.stringify(DEFAULT_MUSIC));
  const m = state.music;
  const today = getTodayKey();
  const stats = slowWeekStats('music');
  const page = document.createElement('div');
  page.className = 'page';
  if (greetLine) greetLine.textContent = '音乐练习';

  function musicSuggest() {
    if (stats.times >= 3) return '这周练得很勤，记得让嗓子/手指也休息一下 🎵';
    if (stats.times > 0) return '已经开始了，下次只练一小段，慢一点反而更稳。';
    return '先只听一首喜欢的曲子，跟着哼两句也算练习。';
  }

  page.innerHTML = `
    ${slowPageHead(cfg)}
    ${slowCheckinCard(cfg, {
      title: '练习打卡',
      fields: [
        { key: 'content', label: '练习项目', placeholder: '例：练歌 / 乐器 / 听鉴赏曲目' },
        { key: 'minutes', label: '练习时长', type: 'number', placeholder: '30' }
      ]
    })}

    <div class="section-card module-card">
      <div class="module-card-head">
        <span class="module-card-icon" style="color:${cfg.color}">${icon('list', 14)}</span>
        <span class="soft-card-title" style="margin:0;">练习任务清单</span>
        <span class="module-card-meta">${m.tasks.filter(t => t.done && t.date === today).length}/${m.tasks.length}</span>
      </div>
      <div class="module-list" id="mu-tasks">
        ${m.tasks.map(t => slowTaskItem(t, 'mu-task')).join('') || slowEmpty('还没有练习任务')}
      </div>
      <div class="slow-add-row">
        <input class="pf-input" id="mu-task-input" placeholder="添加练习任务，如：练熟副歌">
        <button class="gold-btn" id="mu-task-add">添加</button>
      </div>
    </div>

    <div class="section-card module-card">
      <div class="module-card-head">
        <span class="module-card-icon" style="color:${cfg.color}">${icon('music', 14)}</span>
        <span class="soft-card-title" style="margin:0;">曲目记录库</span>
        <span class="module-card-meta">${m.records.length} 首</span>
      </div>
      <div class="slow-field"><span class="slow-label">曲目名称</span><input class="pf-input" id="mu-name" placeholder="例：天空之城"></div>
      <div class="slow-field"><span class="slow-label">练习感受</span><input class="pf-input" id="mu-note" placeholder="哪里还不顺、哪里进步了"></div>
      <div class="focus-actions" style="margin-top:6px;"><button class="gold-btn" id="mu-add">保存曲目</button></div>
      <div class="slow-record-list" id="mu-records">
        ${m.records.length ? m.records.map(r => slowRecordItem(r, 'mu-record', false)).join('') : slowEmpty('还没有曲目记录')}
      </div>
    </div>

    <div class="section-card module-card">
      <div class="module-card-head">
        <span class="module-card-icon" style="color:${cfg.color}">${icon('star', 14)}</span>
        <span class="soft-card-title" style="margin:0;">收藏鉴赏库</span>
        <span class="module-card-meta">${m.favorites.length} 条</span>
      </div>
      <div class="slow-field"><span class="slow-label">曲目</span><input class="pf-input" id="mu-fav-name" placeholder="想听 / 想学的曲子"></div>
      <div class="slow-field"><span class="slow-label">作者</span><input class="pf-input" id="mu-fav-artist" placeholder="演奏者 / 歌手（可选）"></div>
      <div class="slow-field"><span class="slow-label">备注</span><input class="pf-input" id="mu-fav-note" placeholder="为什么想收藏"></div>
      <div class="focus-actions" style="margin-top:6px;"><button class="gold-btn" id="mu-fav-add">收藏</button></div>
      <div class="slow-record-list" id="mu-favs">
        ${m.favorites.length ? m.favorites.map(r => `
          <div class="slow-record" data-rec-id="${r.id}">
            <div class="slow-record-main">
              <div class="slow-record-name">${escapeHTML(r.name || '未命名')}</div>
              <div class="slow-record-meta">
                ${r.artist ? `<span class="slow-tag">${escapeHTML(r.artist)}</span>` : ''}
                ${r.date ? `<span>${escapeHTML(r.date)}</span>` : ''}
              </div>
              ${r.note ? `<div class="slow-record-note">${escapeHTML(r.note)}</div>` : ''}
            </div>
            <button class="slow-record-del" data-del-type="mu-fav" data-del-id="${r.id}" title="删除">${icon('delete', 12)}</button>
          </div>`).join('') : slowEmpty('还没有收藏')}
      </div>
    </div>

    ${slowStatsCard(cfg, stats, [
      { value: stats.minutes, label: '本周分钟' },
      { value: stats.times, label: '练习次数' },
      { value: stats.pts, label: '本周积分' }
    ])}

    <div class="section-card module-card">
      <div class="module-card-head">
        <span class="module-card-icon" style="color:${cfg.color}">${icon('bulb', 14)}</span>
        <span class="soft-card-title" style="margin:0;">练习优化小建议</span>
      </div>
    </div>
  `;
  content.appendChild(page);

  bindSlowInsightToggle(page);
  bindSlowCheckin(page, cfg, renderMusicPage);
  bindSlowTasks(page, cfg, '#mu-tasks .module-list-item', 'tasks', 'mu-task', renderMusicPage);

  page.querySelector('#mu-add').addEventListener('click', () => {
    const name = (page.querySelector('#mu-name').value || '').trim();
    if (!name) { toast('先写个曲目名吧'); return; }
    m.records.unshift({
      id: uid('mu-r'), name,
      note: (page.querySelector('#mu-note').value || '').trim(),
      date: today
    });
    saveMusic();
    renderMusicPage();
    toast('已保存');
  });

  page.querySelector('#mu-fav-add').addEventListener('click', () => {
    const name = (page.querySelector('#mu-fav-name').value || '').trim();
    if (!name) { toast('先写个曲目名吧'); return; }
    m.favorites.unshift({
      id: uid('mu-f'), name,
      artist: (page.querySelector('#mu-fav-artist').value || '').trim(),
      note: (page.querySelector('#mu-fav-note').value || '').trim(),
      date: today
    });
    saveMusic();
    renderMusicPage();
    toast('已收藏');
  });

  page.querySelectorAll('[data-del-type="mu-record"]').forEach(b => {
    b.addEventListener('click', (e) => {
      e.stopPropagation();
      const i = m.records.findIndex(x => x.id === b.dataset.delId);
      if (i >= 0) { m.records.splice(i, 1); saveMusic(); renderMusicPage(); }
    });
  });
  page.querySelectorAll('[data-del-type="mu-fav"]').forEach(b => {
    b.addEventListener('click', (e) => {
      e.stopPropagation();
      const i = m.favorites.findIndex(x => x.id === b.dataset.delId);
      if (i >= 0) { m.favorites.splice(i, 1); saveMusic(); renderMusicPage(); }
    });
  });

  const addTask = () => {
    const text = (page.querySelector('#mu-task-input').value || '').trim();
    if (!text) return;
    m.tasks.push({ id: uid('mu-t'), text, points: 3, done: false, date: '' });
    saveMusic();
    renderMusicPage();
  };
  page.querySelector('#mu-task-add').addEventListener('click', addTask);
  page.querySelector('#mu-task-input').addEventListener('keydown', (e) => { if (e.key === 'Enter') addTask(); });
}

// ==================== v9256：全局字体强制规则 ====================
// 规则：① ≥10px 普通文字 → 草莓字体；② ＜10px 小字 → 站酷快乐体；③ 数字 → 站酷快乐体（仅「孤立单独的 0」→ 草莓）。
// 通过把所有渲染出的数字包进 .xn-num / .xn-num0（CSS 加 !important 保证覆盖任意父级字体），
// 对当前与未来任意页面 / 弹窗 / 选择器 / toast 自动生效，无需逐页维护。
(function enforceGlobalFonts() {
  const NUM_RE = /[0-9][0-9.,:/\-–—]*/g;

  function wrapDigitsInTextNode(tn) {
    const text = tn.nodeValue;
    if (!text || !/\d/.test(text)) return;
    const frag = document.createDocumentFragment();
    let last = 0, m, changed = false;
    NUM_RE.lastIndex = 0;
    while ((m = NUM_RE.exec(text)) !== null) {
      const matched = m[0];
      const start = m.index;
      if (start > last) frag.appendChild(document.createTextNode(text.slice(last, start)));
      const isolatedZero = (text.trim() === '0' && matched === '0');
      const span = document.createElement('span');
      span.className = isolatedZero ? 'xn-num0' : 'xn-num';
      span.textContent = matched;
      frag.appendChild(span);
      last = start + matched.length;
      changed = true;
    }
    if (!changed) return;
    if (last < text.length) frag.appendChild(document.createTextNode(text.slice(last)));
    if (tn.parentNode) tn.parentNode.replaceChild(frag, tn);
  }

  function applyNumFontsIn(root) {
    if (!root) return;
    if (root.nodeType === 3) { wrapDigitsInTextNode(root); return; }
    if (root.nodeType !== 1) return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        if (!node.nodeValue || !node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
        if (!/\d/.test(node.nodeValue)) return NodeFilter.FILTER_REJECT;
        const p = node.parentNode;
        if (!p) return NodeFilter.FILTER_REJECT;
        const tag = p.nodeName.toLowerCase();
        if (tag === 'script' || tag === 'style' || tag === 'svg' || tag === 'textarea' || tag === 'input' || tag === 'code' || tag === 'pre' || tag === 'noscript') return NodeFilter.FILTER_REJECT;
        if (p.closest && (p.closest('.xn-num') || p.closest('.xn-num0'))) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    }, false);
    const targets = [];
    let n;
    while ((n = walker.nextNode())) targets.push(n);
    targets.forEach(wrapDigitsInTextNode);
  }

  // 处理已存在的 DOM（初始渲染已完成）
  if (document.body) applyNumFontsIn(document.body);

  // 自动处理后续所有渲染（整页 / 弹窗 / 选择器 / toast 等）
  // v9259.1：数字包裹改为 setTimeout(0) 合并批处理，避免阻塞首屏渲染与打卡交互
  let pending = [];
  let scheduled = false;
  function flushPendingFonts() {
    scheduled = false;
    const nodes = pending;
    pending = [];
    if (!nodes.length) return;
    nodes.forEach(nd => {
      if (nd.nodeType === 3) {
        // 已包裹的 .xn-num/.xn-num0 子文本不再处理（防重复拆分）
        const p = nd.parentNode;
        if (p && p.classList && (p.classList.contains('xn-num') || p.classList.contains('xn-num0'))) return;
        wrapDigitsInTextNode(nd);
      } else if (nd.nodeType === 1) {
        // 我们自己生成的包裹 span 跳过整棵子树
        if (nd.classList && (nd.classList.contains('xn-num') || nd.classList.contains('xn-num0'))) return;
        applyNumFontsIn(nd);
      }
    });
  }
  const obs = new MutationObserver((mutations) => {
    for (const mu of mutations) {
      if (mu.type === 'characterData' && mu.target && mu.target.nodeType === 3) pending.push(mu.target);
      mu.addedNodes.forEach(nd => { if (nd.nodeType === 1 || nd.nodeType === 3) pending.push(nd); });
    }
    if (!scheduled) { scheduled = true; setTimeout(flushPendingFonts, 0); }
  });
  if (document.body) obs.observe(document.body, { childList: true, subtree: true, characterData: true });
})();
