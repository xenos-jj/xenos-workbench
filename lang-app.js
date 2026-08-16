// xenos 工作台 —— 外语学习模块（v9141 重构）
// 依赖：全局 state / WORD_BANK / icon / escapeHTML / speak / content / openModal / toast / saveLanguage / getTodayKey / formatDate

const LANG_LEVELS = [
  { key: 'middle', name: '初中词汇' },
  { key: 'high', name: '高中词汇' },
  { key: 'cet4', name: '四级词汇' },
  { key: 'cet6', name: '六级词汇' }
];

const REVIEW_INTERVALS = [1, 2, 4, 7, 15, 30];

function getLangWords(level) {
  return (WORD_BANK && WORD_BANK[level]) ? WORD_BANK[level] : [];
}

function getLangLearnedCount() {
  return Object.keys(state.language.learned || {}).length;
}

function addLangMinutes(min) {
  const s = state.language.stats || {};
  s.studyMinutes = (s.studyMinutes || 0) + min;
  state.language.stats = s;
  saveLanguage();
}

function ensureLangStats() {
  if (!state.language.stats) state.language.stats = { totalLearned: 0, studyMinutes: 0, gameScore: 0, listenCount: 0, speakCount: 0 };
}

function getReviewWords(level) {
  const today = getTodayKey();
  const learned = state.language.learned || {};
  const all = getLangWords(level);
  return all.filter(w => {
    const r = learned[w.word];
    if (!r) return false;
    const reviewAt = r.reviewAt || r.date || today;
    return reviewAt <= today;
  });
}

function getNewWords(level, limit) {
  const learned = state.language.learned || {};
  const all = getLangWords(level);
  return all.filter(w => !learned[w.word]).slice(0, limit);
}

function getCurrentCard(level) {
  const reviews = getReviewWords(level);
  if (reviews.length) return { type: 'review', word: reviews[0], index: 0, total: reviews.length };
  const news = getNewWords(level, state.language.dailyGoal || 20);
  if (news.length) return { type: 'new', word: news[0], index: 0, total: news.length };
  return null;
}

function markWordKnown(wordObj) {
  const today = getTodayKey();
  const learned = state.language.learned || {};
  const old = learned[wordObj.word] || { stage: -1 };
  const stage = Math.min(5, (old.stage || -1) + 1);
  const days = REVIEW_INTERVALS[stage] || 1;
  const reviewAt = dateAfter(today, days);
  learned[wordObj.word] = { date: today, reviewAt, stage, level: state.language.level };
  state.language.learned = learned;
  state.language.todayCount = (state.language.todayCount || 0) + 1;
  ensureLangStats();
  state.language.stats.totalLearned = Object.keys(learned).length;
  saveLanguage();
  checkLanguageGoal();
  addLangMinutes(0.2);
}

function markWordUnknown(wordObj) {
  const today = getTodayKey();
  const learned = state.language.learned || {};
  const old = learned[wordObj.word] || {};
  learned[wordObj.word] = { date: old.date || today, reviewAt: dateAfter(today, 1), stage: 0, level: state.language.level };
  state.language.learned = learned;
  saveLanguage();
  addLangMinutes(0.2);
}

function dateAfter(dateStr, days) {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function langBackToHome() {
  state.language.sub = 'home';
  saveLanguage();
  renderContent();
}

function langNav(title) {
  return `
    <div class="lang-nav">
      <button class="icon-action" id="lang-back" aria-label="返回">${icon('arrowLeft', 18)}</button>
      <span class="lang-nav-title">${escapeHTML(title)}</span>
      <span></span>
    </div>`;
}

function renderLangHome(page) {
  ensureLangToday();
  ensureLangStats();
  const level = state.language.level || 'middle';
  const goal = state.language.dailyGoal || 20;
  const todayCount = state.language.todayCount || 0;
  const goalPct = Math.min(100, Math.round((todayCount / goal) * 100));
  const learned = getLangLearnedCount();
  const total = getLangWords(level).length;
  const s = state.language.stats;

  page.innerHTML = `
    <div class="growth-hero">
      <div class="growth-hero-icon">${icon('language', 26)}</div>
      <div>
        <h3 class="page-title-main">外语学习</h3>
        <p class="page-subtitle">累计掌握 ${learned} 词 · 今日 ${todayCount}/${goal}</p>
      </div>
    </div>

    <div class="soft-card lang-stats-card">
      <div class="lang-stats-row">
        <div class="lang-stat">
          <div class="lang-stat-num">${learned}</div>
          <div class="lang-stat-label">累计掌握</div>
        </div>
        <div class="lang-stat">
          <div class="lang-stat-num">${Math.floor(s.studyMinutes || 0)}</div>
          <div class="lang-stat-label">学习时长(分)</div>
        </div>
        <div class="lang-stat">
          <div class="lang-stat-num">${s.gameScore || 0}</div>
          <div class="lang-stat-label">玩单词分</div>
        </div>
      </div>
      <div class="lang-goal-line">
        <span>每日目标 ${todayCount}/${goal}</span>
        <div class="budget-bar" style="flex:1;margin:0 10px;"><div class="budget-bar-fill" style="width:${goalPct}%"></div></div>
        <button class="mini-btn" id="lang-goal-edit">修改</button>
      </div>
    </div>

    <div class="soft-card">
      <div class="soft-card-title">词库选择 · 当前 ${total} 词</div>
      <div class="lang-level" id="lang-level">
        ${LANG_LEVELS.map(lv => `<button class="filter-chip${lv.key === level ? ' active' : ''}" data-level="${lv.key}">${lv.name}</button>`).join('')}
      </div>
    </div>

    <div class="lang-grid">
      <button class="lang-module-card" data-sub="recite">
        <div class="lang-module-icon" style="background:#FDF1E6;color:var(--primary)">${icon('bookOpen', 24)}</div>
        <div class="lang-module-name">背单词</div>
        <div class="lang-module-desc">卡片记忆 · 遗忘曲线复习</div>
      </button>
      <button class="lang-module-card" data-sub="game">
        <div class="lang-module-icon" style="background:#F4F5E5;color:#a0bb7a">${icon('zap', 24)}</div>
        <div class="lang-module-name">玩单词</div>
        <div class="lang-module-desc">匹配 · 选词填空</div>
      </button>
      <button class="lang-module-card" data-sub="speak">
        <div class="lang-module-icon" style="background:#F3F1F4;color:#8978c3">${icon('mic', 24)}</div>
        <div class="lang-module-name">练口语</div>
        <div class="lang-module-desc">情景对话 · 跟读录音</div>
      </button>
      <button class="lang-module-card" data-sub="listen">
        <div class="lang-module-icon" style="background:#FDF6E3;color:#f4b75b">${icon('ear', 24)}</div>
        <div class="lang-module-name">练听力</div>
        <div class="lang-module-desc">短句 · 短文 · 选择题</div>
      </button>
    </div>
  `;

  page.querySelectorAll('[data-sub]').forEach(btn => {
    btn.addEventListener('click', () => {
      state.language.sub = btn.dataset.sub;
      saveLanguage();
      renderContent();
    });
  });
  page.querySelectorAll('[data-level]').forEach(btn => {
    btn.addEventListener('click', () => {
      state.language.level = btn.dataset.level;
      saveLanguage();
      renderContent();
    });
  });
  page.querySelector('#lang-goal-edit').addEventListener('click', async () => {
    const v = await openModal('设置每日背词目标（个）：', goal, '请输入每日目标');
    const n = parseInt(v);
    if (v !== null && !isNaN(n) && n > 0) {
      state.language.dailyGoal = n;
      saveLanguage();
      renderContent();
    }
  });
}

// ---------- 背单词 ----------
function renderLangRecite(page) {
  const level = state.language.level || 'middle';
  const cardInfo = getCurrentCard(level);

  if (!cardInfo) {
    page.innerHTML = langNav('背单词') + `
      <div class="soft-card" style="text-align:center;padding:40px 20px;">
        <div style="font-size:48px;margin-bottom:12px;">🎉</div>
        <h3 class="page-title-main">今日任务完成</h3>
        <p class="section-note">当前词库已学完或达到今日目标，明天再来复习吧</p>
        <button class="gold-btn" id="lr-back" style="margin-top:16px;">返回外语学习</button>
      </div>
    `;
    page.querySelector('#lr-back').addEventListener('click', langBackToHome);
    return;
  }

  const w = cardInfo.word;
  const reviews = getReviewWords(level).length;
  const news = getNewWords(level, state.language.dailyGoal || 20).length;

  page.innerHTML = langNav('背单词') + `
    <div class="soft-card">
      <div class="lang-recite-meta">
        <span class="lang-recite-tag${cardInfo.type === 'review' ? ' review' : ''}">${cardInfo.type === 'review' ? '复习' : '新词'}</span>
        <span class="section-note">待复习 ${reviews} · 新词 ${news}</span>
      </div>
      <div class="flashcard" id="flashcard">
        <button class="fc-speak" id="fc-speak" aria-label="朗读">${icon('voice', 20)}</button>
        <div class="fc-word">${escapeHTML(w.word)}</div>
        <div class="fc-phonetic">${escapeHTML(w.phonetic || '')}</div>
        <div class="fc-meaning" id="fc-meaning">${escapeHTML(w.meaning)}</div>
        ${w.example ? `<div class="fc-example"><div class="fc-en">${escapeHTML(w.example)}</div><div class="fc-cn">${escapeHTML(w.exampleCN || '')}</div></div>` : ''}
      </div>
      <div class="fc-actions">
        <button class="btn btn-secondary" id="fc-unknown">不认识</button>
        <button class="gold-btn" id="fc-known">认识 +1</button>
      </div>
      <p class="section-note" style="text-align:center;margin-top:10px;">第 ${cardInfo.index + 1} / ${cardInfo.total} 张</p>
    </div>
  `;

  page.querySelector('#fc-speak').addEventListener('click', (e) => { e.stopPropagation(); speak(w.word, 'en-US'); });
  page.querySelector('#flashcard').addEventListener('click', (e) => {
    if (e.target.closest('#fc-speak')) return;
    speak(w.word, 'en-US');
  });
  page.querySelector('#fc-known').addEventListener('click', () => {
    markWordKnown(w);
    renderContent();
  });
  page.querySelector('#fc-unknown').addEventListener('click', () => {
    markWordUnknown(w);
    renderContent();
  });
  page.querySelector('#lang-back').addEventListener('click', langBackToHome);
}

// ---------- 玩单词 ----------
function renderLangGame(page) {
  const mode = state.language.gameMode || 'menu';
  if (mode === 'match') return renderLangGameMatch(page);
  if (mode === 'fill') return renderLangGameFill(page);

  page.innerHTML = langNav('玩单词') + `
    <div class="soft-card" style="text-align:center;padding:28px 20px;">
      <div style="font-size:42px;margin-bottom:8px;">🎮</div>
      <h3 class="page-title-main">选择游戏</h3>
      <p class="section-note">从当前词库 ${getLangWords(state.language.level).length} 词中随机出题</p>
      <div class="lang-game-btns">
        <button class="lang-game-btn" data-mode="match">
          <div class="lang-game-title">单词匹配</div>
          <div class="lang-game-sub">英文与中文配对</div>
        </button>
        <button class="lang-game-btn" data-mode="fill">
          <div class="lang-game-title">选词填空</div>
          <div class="lang-game-sub">根据释义选择单词</div>
        </button>
      </div>
    </div>
  `;
  page.querySelectorAll('[data-mode]').forEach(btn => {
    btn.addEventListener('click', () => {
      state.language.gameMode = btn.dataset.mode;
      saveLanguage();
      renderContent();
    });
  });
  page.querySelector('#lang-back').addEventListener('click', langBackToHome);
}

function sampleWords(level, n) {
  const all = getLangWords(level);
  const shuffled = all.slice().sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(n, shuffled.length));
}

function renderLangGameMatch(page) {
  const level = state.language.level || 'middle';
  const game = state.language.matchGame;
  if (!game || game.level !== level) {
    const words = sampleWords(level, 6);
    state.language.matchGame = { level, words, matched: [], score: 0, leftSel: null, rightSel: null };
    saveLanguage();
    return renderContent();
  }

  const left = game.words.slice().sort(() => Math.random() - 0.5);
  const right = game.words.slice().sort(() => Math.random() - 0.5);
  const isDone = game.matched.length === game.words.length;

  page.innerHTML = langNav('单词匹配') + `
    <div class="soft-card">
      <div class="lang-game-header">
        <span>得分 ${game.score}</span>
        <button class="mini-btn" id="lg-restart">换一批</button>
      </div>
      ${isDone ? `
        <div class="lang-game-done">
          <div style="font-size:40px;">🏆</div>
          <div>本局完成！得分 ${game.score}</div>
          <button class="gold-btn" id="lg-next">再来一局</button>
        </div>
      ` : `
        <div class="lang-match-grid">
          <div class="lang-match-col">
            ${left.map((w, i) => `<button class="lang-match-cell${game.leftSel === w.word ? ' sel' : ''}${game.matched.includes(w.word) ? ' done' : ''}" data-side="left" data-word="${escapeHTML(w.word)}">${escapeHTML(w.word)}</button>`).join('')}
          </div>
          <div class="lang-match-col">
            ${right.map((w, i) => `<button class="lang-match-cell${game.rightSel === w.word ? ' sel' : ''}${game.matched.includes(w.word) ? ' done' : ''}" data-side="right" data-word="${escapeHTML(w.word)}">${escapeHTML(w.meaning.split(';')[0].trim().replace(/^[a-zA-Z]+\.\s*/, ''))}</button>`).join('')}
          </div>
        </div>
      `}
    </div>
  `;

  page.querySelector('#lang-back').addEventListener('click', () => {
    state.language.gameMode = 'menu';
    saveLanguage();
    renderContent();
  });
  page.querySelector('#lg-restart')?.addEventListener('click', () => {
    state.language.matchGame = null;
    saveLanguage();
    renderContent();
  });
  page.querySelector('#lg-next')?.addEventListener('click', () => {
    state.language.matchGame = null;
    saveLanguage();
    renderContent();
  });
  page.querySelectorAll('.lang-match-cell:not(.done)').forEach(cell => {
    cell.addEventListener('click', () => {
      const side = cell.dataset.side;
      const word = cell.dataset.word;
      const g = state.language.matchGame;
      if (side === 'left') g.leftSel = word;
      else g.rightSel = word;
      if (g.leftSel && g.rightSel) {
        const match = g.words.find(w => w.word === g.leftSel);
        if (match && match.word === g.rightSel) {
          if (!g.matched.includes(match.word)) {
            g.matched.push(match.word);
            g.score += 10;
            ensureLangStats();
            state.language.stats.gameScore = (state.language.stats.gameScore || 0) + 10;
          }
        }
        g.leftSel = null;
        g.rightSel = null;
      }
      saveLanguage();
      renderContent();
    });
  });
}

function renderLangGameFill(page) {
  const level = state.language.level || 'middle';
  const game = state.language.fillGame;
  if (!game || game.level !== level) {
    const target = sampleWords(level, 1)[0];
    const options = sampleWords(level, 4).map(w => w.word);
    if (!options.includes(target.word)) options[0] = target.word;
    state.language.fillGame = { level, target, options: options.slice().sort(() => Math.random() - 0.5), answered: false, correct: false };
    saveLanguage();
    return renderContent();
  }

  page.innerHTML = langNav('选词填空') + `
    <div class="soft-card">
      <div class="lang-fill-q">
        <div class="lang-fill-meaning">${escapeHTML(game.target.meaning)}</div>
        ${game.target.example ? `<div class="lang-fill-example">${escapeHTML(game.target.example.replace(new RegExp(game.target.word, 'gi'), '_____'))}</div>` : ''}
      </div>
      <div class="lang-fill-options">
        ${game.options.map(opt => `<button class="lang-fill-opt${game.answered && opt === game.target.word ? ' right' : ''}${game.answered && opt === game.lastPick && opt !== game.target.word ? ' wrong' : ''}${game.answered ? ' disabled' : ''}" data-opt="${escapeHTML(opt)}">${escapeHTML(opt)}</button>`).join('')}
      </div>
      ${game.answered ? `
        <div class="lang-fill-result">
          ${game.correct ? '<span style="color:#a0bb7a">回答正确 +10 分</span>' : '<span style="color:#E8B4A8">回答错误，正确答案：' + escapeHTML(game.target.word) + '</span>'}
          <button class="gold-btn" id="lg-next-fill" style="margin-top:12px;">下一题</button>
        </div>
      ` : ''}
    </div>
  `;

  page.querySelector('#lang-back').addEventListener('click', () => {
    state.language.gameMode = 'menu';
    saveLanguage();
    renderContent();
  });
  page.querySelector('#lg-next-fill')?.addEventListener('click', () => {
    state.language.fillGame = null;
    saveLanguage();
    renderContent();
  });
  page.querySelectorAll('.lang-fill-opt:not(.disabled)').forEach(btn => {
    btn.addEventListener('click', () => {
      const g = state.language.fillGame;
      g.lastPick = btn.dataset.opt;
      g.answered = true;
      g.correct = btn.dataset.opt === g.target.word;
      if (g.correct) {
        ensureLangStats();
        state.language.stats.gameScore = (state.language.stats.gameScore || 0) + 10;
      }
      saveLanguage();
      renderContent();
    });
  });
}

// ---------- 练口语 ----------
const SPEAK_TOPICS = {
  middle: [
    { title: '自我介绍', script: ['Hello, my name is Alex.', 'I am 13 years old.', 'I like playing basketball.', 'Nice to meet you.'] },
    { title: '我的学校', script: ['I go to Middle School.', 'My favorite subject is English.', 'I have lunch at school.', 'I like my teachers.'] },
    { title: '我的家庭', script: ['There are three people in my family.', 'My father is a doctor.', 'My mother is a teacher.', 'We often have dinner together.'] }
  ],
  high: [
    { title: '周末计划', script: ['What are you going to do this weekend?', 'I plan to visit the museum.', 'That sounds interesting.', 'Would you like to join me?'] },
    { title: '环保话题', script: ['Environmental protection is important.', 'We should save water and electricity.', 'Using reusable bags helps reduce waste.', 'Everyone can make a difference.'] },
    { title: '高中生活', script: ['High school life is busy but meaningful.', 'I have many assignments every day.', 'I also join the English club.', 'Balancing study and hobbies is important.'] }
  ],
  cet4: [
    { title: '大学选课', script: ['I am thinking about which courses to take.', 'This professor is very popular.', 'The schedule looks tight this semester.', 'I need to balance required and elective courses.'] },
    { title: '兼职工作', script: ['Many students take part-time jobs.', 'It helps us gain work experience.', 'However, we should not neglect our studies.', 'Time management is the key.'] },
    { title: '旅行经历', script: ['I traveled to Chengdu last summer.', 'The food there was amazing.', 'I visited the panda base.', 'It was an unforgettable experience.'] }
  ],
  cet6: [
    { title: '人工智能', script: ['Artificial intelligence is transforming society.', 'It improves efficiency in many industries.', 'However, it also raises ethical concerns.', 'We need regulations to ensure responsible use.'] },
    { title: '职业规划', script: ['Career planning should start early.', 'We need to understand our strengths and weaknesses.', 'Internships help us explore different paths.', 'Lifelong learning is essential in modern society.'] },
    { title: '文化交流', script: ['Cultural exchange promotes mutual understanding.', 'Studying abroad broadens our horizons.', 'We should respect different customs and traditions.', 'Language is a bridge between cultures.'] }
  ]
};

function renderLangSpeak(page) {
  const level = state.language.level || 'middle';
  const topic = state.language.speakTopic;
  if (!topic) {
    const list = SPEAK_TOPICS[level] || SPEAK_TOPICS.middle;
    page.innerHTML = langNav('练口语') + `
      <div class="soft-card">
        <div class="soft-card-title">情景对话 · ${LANG_LEVELS.find(l => l.key === level).name}</div>
        <div class="lang-speak-list">
          ${list.map((t, i) => `
            <button class="lang-speak-item" data-idx="${i}">
              <div class="lang-speak-title">${escapeHTML(t.title)}</div>
              <div class="lang-speak-sub">${t.script.length} 句 · 点击跟读</div>
            </button>
          `).join('')}
        </div>
      </div>
      <div class="soft-card">
        <div class="soft-card-title">日常话题练习</div>
        <p class="section-note">选择上方情景，点击播放后对照脚本朗读。支持浏览器语音合成播放参考发音。</p>
      </div>
    `;
    page.querySelectorAll('[data-idx]').forEach(btn => {
      btn.addEventListener('click', () => {
        state.language.speakTopic = list[parseInt(btn.dataset.idx)];
        saveLanguage();
        renderContent();
      });
    });
    page.querySelector('#lang-back').addEventListener('click', langBackToHome);
    return;
  }

  page.innerHTML = langNav(topic.title) + `
    <div class="soft-card">
      <div class="lang-speak-progress">1 / ${topic.script.length}</div>
      ${topic.script.map((s, i) => `
        <div class="lang-speak-line">
          <div class="lang-speak-en">${escapeHTML(s)}</div>
          <button class="lang-speak-play" data-idx="${i}" aria-label="播放">${icon('voice', 16)}</button>
        </div>
      `).join('')}
      <div class="lang-speak-btns">
        <button class="btn btn-secondary" id="ls-record">🎤 开始录音</button>
        <button class="gold-btn" id="ls-finish">完成练习 +5 分</button>
      </div>
      <p class="section-note" id="ls-status">点击播放按钮听参考发音，然后跟读</p>
    </div>
  `;

  page.querySelectorAll('.lang-speak-play').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.idx);
      speak(topic.script[idx], 'en-US');
    });
  });
  page.querySelector('#ls-record').addEventListener('click', () => {
    const status = page.querySelector('#ls-status');
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      status.textContent = '当前浏览器不支持语音识别，请直接跟读';
      return;
    }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const rec = new SpeechRecognition();
    rec.lang = 'en-US';
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    rec.onstart = () => { status.textContent = '正在录音，请朗读...'; };
    rec.onend = () => { status.textContent = '录音结束'; };
    rec.onresult = (e) => {
      const text = e.results[0][0].transcript;
      status.textContent = '识别结果：' + text;
    };
    rec.onerror = () => { status.textContent = '录音失败，请重试'; };
    rec.start();
  });
  page.querySelector('#ls-finish').addEventListener('click', () => {
    ensureLangStats();
    state.language.stats.speakCount = (state.language.stats.speakCount || 0) + 1;
    state.language.points = (state.language.points || 0) + 1;
    saveLanguage();
    toast('口语练习完成 +1 积分');
    state.language.speakTopic = null;
    renderContent();
  });
  page.querySelector('#lang-back').addEventListener('click', () => {
    state.language.speakTopic = null;
    saveLanguage();
    renderContent();
  });
}

// ---------- 练听力 ----------
const LISTEN_PASSAGES = {
  middle: [
    { title: '早晨的公园', text: 'Every morning, many people go to the park. Some run, some dance, and some play tai chi. The air is fresh and birds sing in the trees. Children laugh and play games. It is a happy place.', questions: [{ q: 'What do people NOT do in the park?', options: ['Run', 'Dance', 'Swim', 'Play tai chi'], a: 2 }] },
    { title: '我的宠物', text: 'I have a small dog. Its name is Lucky. It has white fur and big eyes. Every day I take it for a walk. Lucky likes to play with a ball. It is my good friend.', questions: [{ q: 'What color is Lucky?', options: ['Black', 'White', 'Brown', 'Yellow'], a: 1 }] }
  ],
  high: [
    { title: '志愿者活动', text: 'Last weekend, our class went to a nursing home as volunteers. We sang songs and told stories to the elderly. We also helped clean their rooms. Although we felt tired, we were very happy.', questions: [{ q: 'Where did the class go?', options: ['A park', 'A school', 'A nursing home', 'A hospital'], a: 2 }] },
    { title: '阅读习惯', text: 'Reading is a good habit. It can open our minds and improve our writing. We should read different kinds of books, such as novels, history, and science. A good book is like a good friend.', questions: [{ q: 'What is the passage mainly about?', options: ['Sports', 'Reading habit', 'Traveling', 'Music'], a: 1 }] }
  ],
  cet4: [
    { title: '在线学习', text: 'Online learning has become popular in recent years. It allows students to study at their own pace. However, it requires strong self-discipline. Without a teacher present, some students may delay their work.', questions: [{ q: 'What does online learning require?', options: ['More money', 'Strong self-discipline', 'A large classroom', 'A fast computer only'], a: 1 }] },
    { title: '城市交通', text: 'Many cities are encouraging people to use public transportation to reduce traffic jams and air pollution. Riding bicycles and taking buses are good choices. Some cities also offer shared bikes for short trips.', questions: [{ q: 'Why do cities encourage public transportation?', options: ['To save money', 'To reduce pollution', 'To build more roads', 'To increase cars'], a: 1 }] }
  ],
  cet6: [
    { title: '远程工作', text: 'Remote work has changed the traditional office culture. Employees can work from home or anywhere with internet access. Studies show that remote work can increase productivity but may also blur the boundary between work and life.', questions: [{ q: 'What is a possible disadvantage of remote work?', options: ['Higher cost', 'Less freedom', 'Blurred work-life boundary', 'Lower productivity'], a: 2 }] },
    { title: '气候变化', text: 'Climate change is one of the greatest challenges facing humanity. Rising temperatures lead to melting glaciers, extreme weather, and loss of biodiversity. Governments and individuals must take action to reduce carbon emissions.', questions: [{ q: 'What is NOT mentioned as a result of climate change?', options: ['Melting glaciers', 'Extreme weather', 'Loss of biodiversity', 'Economic growth'], a: 3 }] }
  ]
};

function renderLangListen(page) {
  const mode = state.language.listenMode || 'menu';
  if (mode === 'sentence') return renderLangListenSentence(page);
  if (mode === 'passage') return renderLangListenPassage(page);

  page.innerHTML = langNav('练听力') + `
    <div class="soft-card" style="text-align:center;padding:28px 20px;">
      <div style="font-size:42px;margin-bottom:8px;">🎧</div>
      <h3 class="page-title-main">选择题型</h3>
      <p class="section-note">当前词库：${LANG_LEVELS.find(l => l.key === state.language.level).name}</p>
      <div class="lang-game-btns">
        <button class="lang-game-btn" data-mode="sentence">
          <div class="lang-game-title">短句听力</div>
          <div class="lang-game-sub">听单词/例句做选择</div>
        </button>
        <button class="lang-game-btn" data-mode="passage">
          <div class="lang-game-title">短文听力</div>
          <div class="lang-game-sub">听短文后回答问题</div>
        </button>
      </div>
    </div>
  `;
  page.querySelectorAll('[data-mode]').forEach(btn => {
    btn.addEventListener('click', () => {
      state.language.listenMode = btn.dataset.mode;
      saveLanguage();
      renderContent();
    });
  });
  page.querySelector('#lang-back').addEventListener('click', langBackToHome);
}

function renderLangListenSentence(page) {
  const level = state.language.level || 'middle';
  const q = state.language.listenSentence;
  if (!q || q.level !== level) {
    const target = sampleWords(level, 1)[0];
    const distractors = sampleWords(level, 3).filter(w => w.word !== target.word).slice(0, 3);
    const options = [target, ...distractors].sort(() => Math.random() - 0.5);
    state.language.listenSentence = { level, target, options, answered: false, correct: false };
    saveLanguage();
    return renderContent();
  }

  page.innerHTML = langNav('短句听力') + `
    <div class="soft-card">
      <button class="gold-btn" id="ll-play">${icon('voice', 16)} 播放音频</button>
      <div class="lang-fill-options" style="margin-top:16px;">
        ${q.options.map((opt, i) => `<button class="lang-fill-opt${q.answered && opt.word === q.target.word ? ' right' : ''}${q.answered && i === q.lastPick && opt.word !== q.target.word ? ' wrong' : ''}${q.answered ? ' disabled' : ''}" data-idx="${i}">${escapeHTML(opt.word)}</button>`).join('')}
      </div>
      ${q.answered ? `
        <div class="lang-fill-result">
          ${q.correct ? '<span style="color:#a0bb7a">回答正确 +5 分</span>' : '<span style="color:#E8B4A8">回答错误</span>'}
          <div style="margin-top:8px;color:var(--text-muted);font-size:12px;">${escapeHTML(q.target.meaning)}</div>
          <button class="gold-btn" id="ll-next" style="margin-top:12px;">下一题</button>
        </div>
      ` : ''}
    </div>
  `;

  page.querySelector('#ll-play').addEventListener('click', () => {
    const text = q.target.example || q.target.word;
    speak(text, 'en-US');
  });
  page.querySelector('#lang-back').addEventListener('click', () => {
    state.language.listenMode = 'menu';
    saveLanguage();
    renderContent();
  });
  page.querySelector('#ll-next')?.addEventListener('click', () => {
    state.language.listenSentence = null;
    saveLanguage();
    renderContent();
  });
  page.querySelectorAll('.lang-fill-opt:not(.disabled)').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.idx);
      q.lastPick = idx;
      q.answered = true;
      q.correct = q.options[idx].word === q.target.word;
      if (q.correct) {
        ensureLangStats();
        state.language.stats.listenCount = (state.language.stats.listenCount || 0) + 1;
        state.language.points = (state.language.points || 0) + 1;
      }
      state.language.listenTotal = (state.language.listenTotal || 0) + 1;
      saveLanguage();
      renderContent();
    });
  });
}

function renderLangListenPassage(page) {
  const level = state.language.level || 'middle';
  const data = LISTEN_PASSAGES[level] || LISTEN_PASSAGES.middle;
  const idx = state.language.listenPassageIdx || 0;
  const p = data[idx % data.length];
  const q = p.questions[0];
  const answered = state.language.listenPassageAnswered;
  const chosen = state.language.listenPassageChosen;

  page.innerHTML = langNav('短文听力') + `
    <div class="soft-card">
      <div class="lang-passage-title">${escapeHTML(p.title)}</div>
      <button class="gold-btn" id="lp-play">${icon('voice', 16)} 播放短文</button>
      <button class="btn btn-secondary" id="lp-text" style="margin-left:8px;">显示原文</button>
      <div class="lang-passage-text" id="lp-textbox" style="display:none;">${escapeHTML(p.text)}</div>
      <div class="lang-passage-q">${escapeHTML(q.q)}</div>
      <div class="lang-fill-options">
        ${q.options.map((opt, i) => `<button class="lang-fill-opt${answered && i === q.a ? ' right' : ''}${answered && i === chosen && i !== q.a ? ' wrong' : ''}${answered ? ' disabled' : ''}" data-idx="${i}">${escapeHTML(opt)}</button>`).join('')}
      </div>
      ${answered ? `
        <div class="lang-fill-result">
          <button class="gold-btn" id="lp-next">下一篇</button>
        </div>
      ` : ''}
    </div>
  `;

  page.querySelector('#lp-play').addEventListener('click', () => speak(p.text, 'en-US'));
  page.querySelector('#lp-text').addEventListener('click', () => {
    page.querySelector('#lp-textbox').style.display = 'block';
  });
  page.querySelector('#lp-next')?.addEventListener('click', () => {
    state.language.listenPassageIdx = (idx + 1) % data.length;
    state.language.listenPassageAnswered = false;
    state.language.listenPassageChosen = null;
    saveLanguage();
    renderContent();
  });
  page.querySelectorAll('.lang-fill-opt:not(.disabled)').forEach(btn => {
    btn.addEventListener('click', () => {
      const i = parseInt(btn.dataset.idx);
      state.language.listenPassageAnswered = true;
      state.language.listenPassageChosen = i;
      state.language.listenTotal = (state.language.listenTotal || 0) + 1;
      if (i === q.a) {
        ensureLangStats();
        state.language.stats.listenCount = (state.language.stats.listenCount || 0) + 1;
        state.language.points = (state.language.points || 0) + 1;
      }
      saveLanguage();
      renderContent();
    });
  });
  page.querySelector('#lang-back').addEventListener('click', () => {
    state.language.listenMode = 'menu';
    saveLanguage();
    renderContent();
  });
}
