// xenos 懒加载模块：学习成长 3 子页（书籍阅读/视频剪辑/3D建模）（v9261）
// 由 app.js 的 loadLazyPage 按需加载；加载完成自动注册路由。
let bkEditNote = null, bkEditPlan = null, bkEditInsight = null;
let veEditCourse = null, veEditPlan = null, veEditNote = null, veActiveStage = 0;
let mdEditCourse = null, mdEditGoal = null, mdEditNote = null, mdActiveStage = 0;

function bookStatusOf(b) { return (b.total > 0 && b.current >= b.total) ? 'read' : (b.current > 0 ? 'reading' : 'unread'); }

function renderBookReading() {
  const page = document.createElement('div');
  // v9560：对齐摄影审美——护肤页视觉体系 + 模块色皮肤
  page.className = 'page skincare-page slow-skin';
  page.style.cssText = modSkinStyle('#C9A87C');
  const books = state.books;
  const notes = state.bookNotes;
  const plans = state.bookPlans;
  const insights = state.bookInsights;
  const finished = books.filter(b => bookStatusOf(b) === 'read').length;
  const reading = books.filter(b => bookStatusOf(b) === 'reading').length;
  const unread = books.filter(b => bookStatusOf(b) === 'unread').length;

  const bookRowHTML = b => {
    const pct = b.total > 0 ? Math.min(100, Math.round((b.current / b.total) * 100)) : 0;
    const st = bookStatusOf(b);
    return `
      <div class="book-row ${st}" data-id="${b.id}">
        <div class="book-main">
          <div class="book-title">${escapeHTML(b.title)}${st === 'read' ? ` <span class="book-done">${icon('check', 12)} 已读完</span>` : ''}</div>
          <div class="book-author">${escapeHTML(b.author || '佚名')} · ${b.current}/${b.total || '?'} 页</div>
          <div class="budget-bar"><div class="budget-bar-fill" style="width:${pct}%"></div></div>
        </div>
        <div class="book-ops">
          <button class="mini-btn" data-act="minus" title="-10页">-10</button>
          <button class="mini-btn" data-act="plus" title="+10页">+10</button>
          <button class="icon-action delete" data-act="del" aria-label="删除">${icon('delete', 14)}</button>
        </div>
      </div>`;
  };

  const noteOf = id => notes.find(n => n.id === id) || {};
  page.innerHTML = `
    <div class="domain-hero"><div class="domain-head"><div><h3 class="domain-title">书籍阅读</h3></div></div></div>
    <p class="page-subtitle">在读 ${reading} · 待读 ${unread} · 已读完 ${finished}</p>
      </div>
    </div>

    <div class="soft-card">
      <div class="soft-card-title">${icon('plus', 16)} 添加书籍</div>
      <div class="profile-fields">
        <div class="pf-field"><span class="pf-label">书名</span><input class="pf-input" id="bk-title" placeholder="书名"></div>
        <div class="pf-field"><span class="pf-label">作者</span><input class="pf-input" id="bk-author" placeholder="作者（可选）"></div>
        <div class="pf-field"><span class="pf-label">总页数</span><input class="pf-input" id="bk-total" type="number" placeholder="如 300"></div>
      </div>
      <div class="focus-actions" style="margin-top:10px;"><button class="gold-btn" id="bk-add">加入书架</button></div>
    </div>

    <div class="soft-card">
      <div class="soft-card-title">${icon('list', 16)} 书架总览<span class="stitle-meta">${books.length} 本</span></div>
      <div class="book-cats">
        <div class="read-cat"><div class="read-cat-title">${icon('book', 14)} 在读 <span>${reading}</span></div><div class="read-cat-list">${books.filter(b => bookStatusOf(b) === 'reading').map(bookRowHTML).join('') || '<p class="empty-note">暂无</p>'}</div></div>
        <div class="read-cat"><div class="read-cat-title">${icon('time', 14)} 待读 <span>${unread}</span></div><div class="read-cat-list">${books.filter(b => bookStatusOf(b) === 'unread').map(bookRowHTML).join('') || '<p class="empty-note">暂无</p>'}</div></div>
        <div class="read-cat"><div class="read-cat-title">${icon('check', 14)} 已读完 <span>${finished}</span></div><div class="read-cat-list">${books.filter(b => bookStatusOf(b) === 'read').map(bookRowHTML).join('') || '<p class="empty-note">暂无</p>'}</div></div>
      </div>
    </div>

    <div class="soft-card">
      <div class="soft-card-title">${icon('edit', 16)} 深度阅读笔记<span class="stitle-meta">${notes.length} 篇</span></div>
      ${bkEditNote ? `
        <div class="edit-card">
          <input class="pf-input" id="bn-book" value="${escapeHTML(noteOf(bkEditNote).book || '')}" placeholder="关联书名（可选）" style="margin-bottom:8px;">
          <input class="pf-input" id="bn-thesis" value="${escapeHTML(noteOf(bkEditNote).thesis || '')}" placeholder="核心论点">
          <textarea class="pf-input" id="bn-quotes" placeholder="关键摘录" style="margin-top:8px;min-height:54px;">${escapeHTML(noteOf(bkEditNote).quotes || '')}</textarea>
          <textarea class="pf-input" id="bn-reflect" placeholder="自我思考 / 反思" style="margin-top:8px;min-height:54px;">${escapeHTML(noteOf(bkEditNote).reflection || '')}</textarea>
          <textarea class="pf-input" id="bn-action" placeholder="启发 / 行动点" style="margin-top:8px;min-height:54px;">${escapeHTML(noteOf(bkEditNote).action || '')}</textarea>
          <div class="focus-actions" style="margin-top:10px;">
            <button class="gold-btn" id="bn-save">保存</button>
            <button class="ghost-btn" id="bn-cancel">取消</button>
            <button class="icon-action delete" id="bn-del" aria-label="删除">${icon('delete', 14)}</button>
          </div>
        </div>
      ` : `
        <input class="pf-input" id="bn-book" placeholder="关联书名（可选）" style="margin-bottom:8px;">
        <input class="pf-input" id="bn-thesis" placeholder="核心论点">
        <textarea class="pf-input" id="bn-quotes" placeholder="关键摘录" style="margin-top:8px;min-height:54px;"></textarea>
        <textarea class="pf-input" id="bn-reflect" placeholder="自我思考 / 反思" style="margin-top:8px;min-height:54px;"></textarea>
        <textarea class="pf-input" id="bn-action" placeholder="启发 / 行动点" style="margin-top:8px;min-height:54px;"></textarea>
        <div class="focus-actions" style="margin-top:10px;"><button class="gold-btn" id="bn-add">添加笔记</button></div>
      `}
      <div id="bk-notes"></div>
    </div>

    <div class="soft-card">
      <div class="soft-card-title">${icon('flag', 16)} 阅读计划<span class="stitle-meta">${plans.length} 项</span></div>
      ${bkEditPlan ? `
        <div class="edit-card">
          <input class="pf-input" id="bp-goal" value="${escapeHTML((plans.find(p => p.id === bkEditPlan) || {}).goal || '')}" placeholder="每周目标（如：读完第3章）">
          <div class="profile-fields" style="margin-top:8px;">
            <div class="pf-field"><span class="pf-label">目标天数</span><input class="pf-input" id="bp-target" type="number" value="${(plans.find(p => p.id === bkEditPlan) || {}).target || 7}"></div>
            <div class="pf-field"><span class="pf-label">累计时长(分)</span><input class="pf-input" id="bp-min" type="number" value="${(plans.find(p => p.id === bkEditPlan) || {}).minutes || 0}"></div>
          </div>
          <div class="focus-actions" style="margin-top:10px;"><button class="gold-btn" id="bp-save">保存</button><button class="ghost-btn" id="bp-cancel">取消</button></div>
        </div>
      ` : `
        <input class="pf-input" id="bp-goal" placeholder="每周目标（如：读完第3章）">
        <div class="profile-fields" style="margin-top:8px;">
          <div class="pf-field"><span class="pf-label">目标天数</span><input class="pf-input" id="bp-target" type="number" placeholder="7"></div>
          <div class="pf-field"><span class="pf-label">累计时长(分)</span><input class="pf-input" id="bp-min" type="number" placeholder="0"></div>
        </div>
        <div class="focus-actions" style="margin-top:10px;"><button class="gold-btn" id="bp-add">添加计划</button></div>
      `}
      <div id="bk-plans"></div>
    </div>

    <div class="soft-card">
      <div class="soft-card-title">${icon('bulb', 16)} 思想沉淀<span class="stitle-meta">${insights.length} 条</span></div>
      ${bkEditInsight ? `
        <div class="edit-card">
          <input class="pf-input" id="bi-title" value="${escapeHTML((insights.find(i => i.id === bkEditInsight) || {}).title || '')}" placeholder="主题 / 书名">
          <textarea class="pf-input" id="bi-content" placeholder="多书观点汇总、对比与启发" style="margin-top:8px;min-height:66px;">${escapeHTML((insights.find(i => i.id === bkEditInsight) || {}).content || '')}</textarea>
          <div class="focus-actions" style="margin-top:10px;">
            <button class="gold-btn" id="bi-save">保存</button>
            <button class="ghost-btn" id="bi-cancel">取消</button>
            <button class="icon-action delete" id="bi-del" aria-label="删除">${icon('delete', 14)}</button>
          </div>
        </div>
      ` : `
        <input class="pf-input" id="bi-title" placeholder="主题 / 书名">
        <textarea class="pf-input" id="bi-content" placeholder="多书观点汇总、对比与启发" style="margin-top:8px;min-height:66px;"></textarea>
        <div class="focus-actions" style="margin-top:10px;"><button class="gold-btn" id="bi-add">添加沉淀</button></div>
      `}
      <div id="bk-insights"></div>
    </div>
  `;
  content.appendChild(page);

  // 书籍行事件
  page.querySelectorAll('.book-row').forEach(row => {
    const b = books.find(x => x.id === row.dataset.id);
    if (!b) return;
    row.querySelector('[data-act="plus"]').addEventListener('click', () => {
      b.current = Math.min(b.total || b.current + 10, b.current + 10);
      saveBooks(); renderContent();
    });
    row.querySelector('[data-act="minus"]').addEventListener('click', () => {
      b.current = Math.max(0, b.current - 10);
      saveBooks(); renderContent();
    });
    row.querySelector('[data-act="del"]').addEventListener('click', () => {
      state.books = state.books.filter(x => x.id !== b.id);
      saveBooks(); renderContent();
    });
  });

  page.querySelector('#bk-add').addEventListener('click', () => {
    const title = page.querySelector('#bk-title').value.trim();
    if (!title) return;
    state.books.push({ id: uid('bk'), title, author: page.querySelector('#bk-author').value.trim(), total: parseInt(page.querySelector('#bk-total').value) || 0, current: 0 });
    saveBooks(); renderContent();
  });

  // 深度阅读笔记列表
  const notesHost = page.querySelector('#bk-notes');
  notes.forEach(n => {
    const el = document.createElement('div');
    el.className = 'bk-note-card';
    el.innerHTML = `
      <div class="bk-note-head"><span class="bk-note-book">${escapeHTML(n.book || '读书笔记')}</span>
        <span class="bk-note-ops"><button class="icon-action edit" data-act="edit" aria-label="编辑">${icon('edit', 13)}</button><button class="icon-action delete" data-act="del" aria-label="删除">${icon('delete', 14)}</button></span>
      </div>
      ${n.thesis ? `<div class="bk-note-row"><b>核心论点</b>${escapeHTML(n.thesis)}</div>` : ''}
      ${n.quotes ? `<div class="bk-note-row"><b>关键摘录</b>${escapeHTML(n.quotes)}</div>` : ''}
      ${n.reflection ? `<div class="bk-note-row"><b>思考反思</b>${escapeHTML(n.reflection)}</div>` : ''}
      ${n.action ? `<div class="bk-note-row"><b>行动点</b>${escapeHTML(n.action)}</div>` : ''}`;
    el.querySelector('[data-act="edit"]').addEventListener('click', () => { bkEditNote = n.id; renderContent(); });
    el.querySelector('[data-act="del"]').addEventListener('click', () => { state.bookNotes = state.bookNotes.filter(x => x.id !== n.id); saveBookNotes(); renderContent(); });
    notesHost.appendChild(el);
  });
  if (bkEditNote) {
    const n = notes.find(x => x.id === bkEditNote);
    page.querySelector('#bn-save').addEventListener('click', () => {
      n.book = page.querySelector('#bn-book').value.trim();
      n.thesis = page.querySelector('#bn-thesis').value.trim();
      n.quotes = page.querySelector('#bn-quotes').value.trim();
      n.reflection = page.querySelector('#bn-reflect').value.trim();
      n.action = page.querySelector('#bn-action').value.trim();
      saveBookNotes(); bkEditNote = null; renderContent();
    });
    page.querySelector('#bn-cancel').addEventListener('click', () => { bkEditNote = null; renderContent(); });
    page.querySelector('#bn-del').addEventListener('click', () => { state.bookNotes = state.bookNotes.filter(x => x.id !== n.id); saveBookNotes(); bkEditNote = null; renderContent(); });
  } else {
    page.querySelector('#bn-add').addEventListener('click', () => {
      const thesis = page.querySelector('#bn-thesis').value.trim();
      if (!thesis) return;
      state.bookNotes.push({ id: uid('bn'), book: page.querySelector('#bn-book').value.trim(), thesis, quotes: page.querySelector('#bn-quotes').value.trim(), reflection: page.querySelector('#bn-reflect').value.trim(), action: page.querySelector('#bn-action').value.trim() });
      saveBookNotes(); renderContent();
    });
  }

  // 阅读计划列表
  const plansHost = page.querySelector('#bk-plans');
  plans.forEach(p => {
    const done = Array.isArray(p.checkins) ? p.checkins.length : 0;
    const el = document.createElement('div');
    el.className = 'plan-row';
    el.innerHTML = `
      <button class="plan-check" data-act="check" aria-label="打卡">${Array.isArray(p.checkins) && p.checkins.includes(getTodayKey()) ? icon('check', 14) : ''}</button>
      <div class="plan-body">
        <div class="plan-goal">${escapeHTML(p.goal)}</div>
        <div class="plan-sub">打卡 ${done}/${p.target || 7} 天 · 时长 ${p.minutes || 0} 分</div>
      </div>
      <button class="icon-action edit" data-act="edit" aria-label="编辑">${icon('edit', 13)}</button>
      <button class="icon-action delete" data-act="del" aria-label="删除">${icon('delete', 14)}</button>`;
    el.querySelector('[data-act="check"]').addEventListener('click', () => {
      p.checkins = Array.isArray(p.checkins) ? p.checkins : [];
      const t = getTodayKey();
      if (p.checkins.includes(t)) p.checkins = p.checkins.filter(x => x !== t);
      else p.checkins.push(t);
      saveBookPlans(); renderContent();
    });
    el.querySelector('[data-act="edit"]').addEventListener('click', () => { bkEditPlan = p.id; renderContent(); });
    el.querySelector('[data-act="del"]').addEventListener('click', () => { state.bookPlans = state.bookPlans.filter(x => x.id !== p.id); saveBookPlans(); renderContent(); });
    plansHost.appendChild(el);
  });
  if (bkEditPlan) {
    const p = plans.find(x => x.id === bkEditPlan);
    page.querySelector('#bp-save').addEventListener('click', () => {
      p.goal = page.querySelector('#bp-goal').value.trim();
      p.target = parseInt(page.querySelector('#bp-target').value) || 7;
      p.minutes = parseInt(page.querySelector('#bp-min').value) || 0;
      saveBookPlans(); bkEditPlan = null; renderContent();
    });
    page.querySelector('#bp-cancel').addEventListener('click', () => { bkEditPlan = null; renderContent(); });
  } else {
    page.querySelector('#bp-add').addEventListener('click', () => {
      const goal = page.querySelector('#bp-goal').value.trim();
      if (!goal) return;
      state.bookPlans.push({ id: uid('bp'), goal, target: parseInt(page.querySelector('#bp-target').value) || 7, minutes: parseInt(page.querySelector('#bp-min').value) || 0, checkins: [] });
      saveBookPlans(); renderContent();
    });
  }

  // 思想沉淀列表
  const insHost = page.querySelector('#bk-insights');
  insights.forEach(i => {
    const el = document.createElement('div');
    el.className = 'insight-card';
    el.innerHTML = `
      <div class="insight-head"><span class="insight-title">${escapeHTML(i.title || '思考')}</span>
        <span class="insight-ops"><button class="icon-action edit" data-act="edit" aria-label="编辑">${icon('edit', 13)}</button><button class="icon-action delete" data-act="del" aria-label="删除">${icon('delete', 14)}</button></span>
      </div>
      ${i.content ? `<div class="insight-body">${escapeHTML(i.content)}</div>` : ''}`;
    el.querySelector('[data-act="edit"]').addEventListener('click', () => { bkEditInsight = i.id; renderContent(); });
    el.querySelector('[data-act="del"]').addEventListener('click', () => { state.bookInsights = state.bookInsights.filter(x => x.id !== i.id); saveBookInsights(); renderContent(); });
    insHost.appendChild(el);
  });
  if (bkEditInsight) {
    const i = insights.find(x => x.id === bkEditInsight);
    page.querySelector('#bi-save').addEventListener('click', () => {
      i.title = page.querySelector('#bi-title').value.trim();
      i.content = page.querySelector('#bi-content').value.trim();
      saveBookInsights(); bkEditInsight = null; renderContent();
    });
    page.querySelector('#bi-cancel').addEventListener('click', () => { bkEditInsight = null; renderContent(); });
    page.querySelector('#bi-del').addEventListener('click', () => { state.bookInsights = state.bookInsights.filter(x => x.id !== i.id); saveBookInsights(); bkEditInsight = null; renderContent(); });
  } else {
    page.querySelector('#bi-add').addEventListener('click', () => {
      const title = page.querySelector('#bi-title').value.trim();
      if (!title) return;
      state.bookInsights.push({ id: uid('bi'), title, content: page.querySelector('#bi-content').value.trim() });
      saveBookInsights(); renderContent();
    });
  }
}

// ============ 成长提升：视频剪辑 ============
function diffBadgeHTML(d) {
  const c = ({ '入门': '#6E8A69', '基础': '#6B7FA3', '进阶': '#C47E3E', '高级': '#B07A9E', '实战': '#D88C7A' })[d] || 'var(--text-muted)';
  return d ? `<span class="diff-badge" style="color:${c};border-color:${c};background:${c}1A">${escapeHTML(d)}</span>` : '';
}

function renderVideoEditing() {
  const page = document.createElement('div');
  // v9560：对齐摄影审美——护肤页视觉体系 + 模块色皮肤
  page.className = 'page skincare-page slow-skin';
  page.style.cssText = modSkinStyle('#8C7BB6');
  const data = state.videoEdit;
  const stage = data.stages[veActiveStage] || data.stages[0];
  const totalCourses = data.stages.reduce((s, st) => s + st.courses.length, 0);
  const doneCourses = data.stages.reduce((s, st) => s + st.courses.filter(c => c.done).length, 0);
  const completedStages = data.stages.filter(st => st.courses.length > 0 && st.courses.every(c => c.done)).length;

  const courseFormHTML = (vals, isEdit) => `
    <div class="profile-fields">
      <div class="pf-field"><span class="pf-label">课程标题</span><input class="pf-input" id="vc-title" value="${escapeHTML(vals.title || '')}" placeholder="如：剪映零基础"></div>
      <div class="pf-field"><span class="pf-label">难度</span>
        <select class="pf-input" id="vc-diff">${['入门', '基础', '进阶', '高级', '实战'].map(d => `<option ${d === (vals.difficulty || '') ? 'selected' : ''}>${d}</option>`).join('')}</select>
      </div>
    </div>
    <input class="pf-input" id="vc-desc" value="${escapeHTML(vals.desc || '')}" placeholder="简介" style="margin-top:8px;">
    <input class="pf-input" id="vc-link" value="${escapeHTML(vals.link || '')}" placeholder="外部课程链接（点击「跳转观看」打开）" style="margin-top:8px;">
    <div class="focus-actions" style="margin-top:10px;">
      ${isEdit ? `<button class="gold-btn" id="vc-save">保存</button><button class="ghost-btn" id="vc-cancel">取消</button><button class="icon-action delete" id="vc-del" aria-label="删除">${icon('delete', 14)}</button>` : `<button class="gold-btn" id="vc-add">添加课程</button>`}
    </div>`;

  const editingCourse = (veEditCourse && veEditCourse.stageIdx === veActiveStage) ? stage.courses.find(c => c.id === veEditCourse.id) : null;

  page.innerHTML = `
    <div class="domain-hero"><div class="domain-head"><div><h3 class="domain-title">视频剪辑</h3></div></div></div>
    <p class="page-subtitle">分阶段学习 · 已学 ${doneCourses}/${totalCourses} 节</p>
      </div>
    </div>

    <div class="soft-card">
      <div class="soft-card-title">${icon('layers', 16)} 学习阶段</div>
      <div class="stage-tabs">
        ${data.stages.map((st, i) => `<button class="stage-tab ${i === veActiveStage ? 'active' : ''}" data-stage="${i}">${escapeHTML(st.name)}</button>`).join('')}
      </div>
      <div class="course-form">${editingCourse ? courseFormHTML(editingCourse, true) : courseFormHTML({}, false)}</div>
      <div id="ve-courses"></div>
    </div>

    <div class="soft-card">
      <div class="soft-card-title">${icon('flag', 16)} 我的学习规划<span class="stitle-meta">${data.plans.length} 项</span></div>
      ${veEditPlan ? `
        <div class="edit-card">
          <input class="pf-input" id="vp-goal" value="${escapeHTML((data.plans.find(p => p.id === veEditPlan) || {}).goal || '')}" placeholder="学习目标">
          <div class="profile-fields" style="margin-top:8px;">
            <div class="pf-field"><span class="pf-label">预计完成</span><input class="pf-input" id="vp-due" type="date" value="${(data.plans.find(p => p.id === veEditPlan) || {}).due || ''}"></div>
          </div>
          <div class="focus-actions" style="margin-top:10px;"><button class="gold-btn" id="vp-save">保存</button><button class="ghost-btn" id="vp-cancel">取消</button></div>
        </div>
      ` : `
        <input class="pf-input" id="vp-goal" placeholder="学习目标">
        <div class="profile-fields" style="margin-top:8px;">
          <div class="pf-field"><span class="pf-label">预计完成</span><input class="pf-input" id="vp-due" type="date"></div>
        </div>
        <div class="focus-actions" style="margin-top:10px;"><button class="gold-btn" id="vp-add">添加计划</button></div>
      `}
      <div id="ve-plans"></div>
    </div>

    <div class="soft-card">
      <div class="soft-card-title">${icon('note', 16)} 素材笔记<span class="stitle-meta">${data.notes.length} 条</span></div>
      ${veEditNote ? `
        <div class="edit-card">
          <div class="profile-fields">
            <div class="pf-field"><span class="pf-label">类型</span>
              <select class="pf-input" id="vn-kind">${['知识点', '快捷键', '素材链接'].map(k => `<option ${k === (data.notes.find(n => n.id === veEditNote) || {}).kind ? 'selected' : ''}>${k}</option>`).join('')}</select>
            </div>
          </div>
          <input class="pf-input" id="vn-content" value="${escapeHTML((data.notes.find(n => n.id === veEditNote) || {}).content || '')}" placeholder="内容" style="margin-top:8px;">
          <input class="pf-input" id="vn-link" value="${escapeHTML((data.notes.find(n => n.id === veEditNote) || {}).link || '')}" placeholder="链接（可选）" style="margin-top:8px;">
          <div class="focus-actions" style="margin-top:10px;"><button class="gold-btn" id="vn-save">保存</button><button class="ghost-btn" id="vn-cancel">取消</button></div>
        </div>
      ` : `
        <div class="profile-fields">
          <div class="pf-field"><span class="pf-label">类型</span>
            <select class="pf-input" id="vn-kind"><option>知识点</option><option>快捷键</option><option>素材链接</option></select>
          </div>
        </div>
        <input class="pf-input" id="vn-content" placeholder="内容" style="margin-top:8px;">
        <input class="pf-input" id="vn-link" placeholder="链接（可选）" style="margin-top:8px;">
        <div class="focus-actions" style="margin-top:10px;"><button class="gold-btn" id="vn-add">添加笔记</button></div>
      `}
      <div id="ve-notes"></div>
    </div>

    <div class="soft-card">
      <div class="soft-card-title">${icon('chart', 16)} 学习数据</div>
      <div class="mini-stats">
        <div class="mini-stat"><div class="mini-stat-val">${doneCourses}</div><div class="mini-stat-label">已学课程</div></div>
        <div class="mini-stat"><div class="mini-stat-val">${completedStages}/${data.stages.length}</div><div class="mini-stat-label">已完成阶段</div></div>
        <div class="mini-stat"><div class="mini-stat-val">${data.studyCount}</div><div class="mini-stat-label">累计学习</div></div>
      </div>
      <button class="ghost-btn" id="ve-study" style="margin-top:10px;">${icon('plus', 14)} 记一次学习</button>
    </div>
  `;
  content.appendChild(page);

  // 阶段切换
  page.querySelectorAll('.stage-tab').forEach(btn => {
    btn.addEventListener('click', () => { veActiveStage = parseInt(btn.dataset.stage); veEditCourse = null; renderContent(); });
  });

  // 课程表单
  if (editingCourse) {
    page.querySelector('#vc-save').addEventListener('click', () => {
      editingCourse.title = page.querySelector('#vc-title').value.trim();
      editingCourse.difficulty = page.querySelector('#vc-diff').value;
      editingCourse.desc = page.querySelector('#vc-desc').value.trim();
      editingCourse.link = page.querySelector('#vc-link').value.trim();
      saveVideoEdit(); veEditCourse = null; renderContent();
    });
    page.querySelector('#vc-cancel').addEventListener('click', () => { veEditCourse = null; renderContent(); });
    page.querySelector('#vc-del').addEventListener('click', () => {
      stage.courses = stage.courses.filter(x => x.id !== editingCourse.id);
      saveVideoEdit(); veEditCourse = null; renderContent();
    });
  } else {
    page.querySelector('#vc-add').addEventListener('click', () => {
      const title = page.querySelector('#vc-title').value.trim();
      if (!title) return;
      stage.courses.push({ id: uid('vc'), title, difficulty: page.querySelector('#vc-diff').value, desc: page.querySelector('#vc-desc').value.trim(), link: page.querySelector('#vc-link').value.trim(), done: false });
      saveVideoEdit(); renderContent();
    });
  }

  // 课程列表
  const coursesHost = page.querySelector('#ve-courses');
  stage.courses.forEach(c => {
    const el = document.createElement('div');
    el.className = 'course-card' + (c.done ? ' done' : '');
    el.dataset.id = c.id;
    el.innerHTML = `
      <div class="course-main">
        <div class="course-title">${escapeHTML(c.title)} ${diffBadgeHTML(c.difficulty)}</div>
        ${c.desc ? `<div class="course-desc">${escapeHTML(c.desc)}</div>` : ''}
      </div>
      <div class="course-ops">
        <button class="proj-check" data-act="done" aria-label="完成">${c.done ? icon('check', 14) : ''}</button>
        <button class="jump-btn" data-act="jump" ${c.link ? '' : 'disabled'}>${icon('link', 13)} 跳转观看</button>
        <button class="icon-action edit" data-act="edit" aria-label="编辑">${icon('edit', 13)}</button>
        <button class="icon-action delete" data-act="del" aria-label="删除">${icon('delete', 14)}</button>
      </div>`;
    el.querySelector('[data-act="done"]').addEventListener('click', () => { c.done = !c.done; saveVideoEdit(); renderContent(); });
    el.querySelector('[data-act="jump"]').addEventListener('click', () => openVideo(c.link, c.title));
    el.querySelector('[data-act="edit"]').addEventListener('click', () => { veEditCourse = { stageIdx: veActiveStage, id: c.id }; renderContent(); });
    el.querySelector('[data-act="del"]').addEventListener('click', () => { stage.courses = stage.courses.filter(x => x.id !== c.id); saveVideoEdit(); renderContent(); });
    coursesHost.appendChild(el);
  });

  // 学习规划
  const plansHost = page.querySelector('#ve-plans');
  data.plans.forEach(p => {
    const el = document.createElement('div');
    el.className = 'plan-row' + (p.done ? ' done' : '');
    el.innerHTML = `
      <button class="plan-check" data-act="check" aria-label="完成">${p.done ? icon('check', 14) : ''}</button>
      <div class="plan-body">
        <div class="plan-goal">${escapeHTML(p.goal)}</div>
        <div class="plan-sub">${p.due ? '预计 ' + escapeHTML(p.due) : '未设时限'}</div>
      </div>
      <button class="icon-action edit" data-act="edit" aria-label="编辑">${icon('edit', 13)}</button>
      <button class="icon-action delete" data-act="del" aria-label="删除">${icon('delete', 14)}</button>`;
    el.querySelector('[data-act="check"]').addEventListener('click', () => { p.done = !p.done; saveVideoEdit(); renderContent(); });
    el.querySelector('[data-act="edit"]').addEventListener('click', () => { veEditPlan = p.id; renderContent(); });
    el.querySelector('[data-act="del"]').addEventListener('click', () => { state.videoEdit.plans = state.videoEdit.plans.filter(x => x.id !== p.id); saveVideoEdit(); renderContent(); });
    plansHost.appendChild(el);
  });
  if (veEditPlan) {
    const p = data.plans.find(x => x.id === veEditPlan);
    page.querySelector('#vp-save').addEventListener('click', () => {
      p.goal = page.querySelector('#vp-goal').value.trim();
      p.due = page.querySelector('#vp-due').value;
      saveVideoEdit(); veEditPlan = null; renderContent();
    });
    page.querySelector('#vp-cancel').addEventListener('click', () => { veEditPlan = null; renderContent(); });
  } else {
    page.querySelector('#vp-add').addEventListener('click', () => {
      const goal = page.querySelector('#vp-goal').value.trim();
      if (!goal) return;
      state.videoEdit.plans.push({ id: uid('vp'), goal, due: page.querySelector('#vp-due').value, done: false });
      saveVideoEdit(); renderContent();
    });
  }

  // 素材笔记
  const notesHost = page.querySelector('#ve-notes');
  data.notes.forEach(n => {
    const el = document.createElement('div');
    el.className = 'mat-note';
    el.innerHTML = `
      <div class="mat-note-head"><span class="mat-kind">${escapeHTML(n.kind || '素材')}</span>
        <span class="mat-ops"><button class="icon-action edit" data-act="edit" aria-label="编辑">${icon('edit', 13)}</button><button class="icon-action delete" data-act="del" aria-label="删除">${icon('delete', 14)}</button></span>
      </div>
      <div class="mat-content">${escapeHTML(n.content)}</div>
      ${n.link ? `<button class="jump-btn sm" data-act="open">${icon('link', 12)} 打开链接</button>` : ''}`;
    el.querySelector('[data-act="edit"]').addEventListener('click', () => { veEditNote = n.id; renderContent(); });
    el.querySelector('[data-act="del"]').addEventListener('click', () => { state.videoEdit.notes = state.videoEdit.notes.filter(x => x.id !== n.id); saveVideoEdit(); renderContent(); });
    if (n.link) el.querySelector('[data-act="open"]').addEventListener('click', () => openVideo(n.link, n.content));
    notesHost.appendChild(el);
  });
  if (veEditNote) {
    const n = data.notes.find(x => x.id === veEditNote);
    page.querySelector('#vn-save').addEventListener('click', () => {
      n.kind = page.querySelector('#vn-kind').value;
      n.content = page.querySelector('#vn-content').value.trim();
      n.link = page.querySelector('#vn-link').value.trim();
      saveVideoEdit(); veEditNote = null; renderContent();
    });
    page.querySelector('#vn-cancel').addEventListener('click', () => { veEditNote = null; renderContent(); });
  } else {
    page.querySelector('#vn-add').addEventListener('click', () => {
      const content = page.querySelector('#vn-content').value.trim();
      if (!content) return;
      state.videoEdit.notes.push({ id: uid('vn'), kind: page.querySelector('#vn-kind').value, content, link: page.querySelector('#vn-link').value.trim() });
      saveVideoEdit(); renderContent();
    });
  }

  page.querySelector('#ve-study').addEventListener('click', () => { data.studyCount = (data.studyCount || 0) + 1; saveVideoEdit(); renderContent(); });
}

// ============ 成长提升：3D建模 ============
function render3DModeling() {
  const page = document.createElement('div');
  // v9560：对齐摄影审美——护肤页视觉体系 + 模块色皮肤
  page.className = 'page skincare-page slow-skin';
  page.style.cssText = modSkinStyle('#7FB0D3');
  const data = state.modeling;
  const stage = data.stages[mdActiveStage] || data.stages[0];
  const totalCourses = data.stages.reduce((s, st) => s + st.courses.length, 0);
  const doneCourses = data.stages.reduce((s, st) => s + st.courses.filter(c => c.done).length, 0);

  const courseFormHTML = (vals, isEdit) => `
    <div class="profile-fields">
      <div class="pf-field"><span class="pf-label">课程 / 教程名</span><input class="pf-input" id="mc-title" value="${escapeHTML(vals.title || '')}" placeholder="如：Blender 界面入门"></div>
      <div class="pf-field"><span class="pf-label">难度</span>
        <select class="pf-input" id="mc-diff">${['入门', '基础', '进阶', '高级', '实战'].map(d => `<option ${d === (vals.difficulty || '') ? 'selected' : ''}>${d}</option>`).join('')}</select>
      </div>
    </div>
    <input class="pf-input" id="mc-desc" value="${escapeHTML(vals.desc || '')}" placeholder="简介" style="margin-top:8px;">
    <input class="pf-input" id="mc-link" value="${escapeHTML(vals.link || '')}" placeholder="外部教程链接（点击「跳转教程」打开）" style="margin-top:8px;">
    <div class="focus-actions" style="margin-top:10px;">
      ${isEdit ? `<button class="gold-btn" id="mc-save">保存</button><button class="ghost-btn" id="mc-cancel">取消</button><button class="icon-action delete" id="mc-del" aria-label="删除">${icon('delete', 14)}</button>` : `<button class="gold-btn" id="mc-add">添加教程</button>`}
    </div>`;

  const editingCourse = (mdEditCourse && mdEditCourse.stageIdx === mdActiveStage) ? stage.courses.find(c => c.id === mdEditCourse.id) : null;

  page.innerHTML = `
    <div class="domain-hero"><div class="domain-head"><div><h3 class="domain-title">3D建模</h3></div></div></div>
    <p class="page-subtitle">分阶段学习 · 已学 ${doneCourses}/${totalCourses} 节</p>
      </div>
    </div>

    <div class="soft-card">
      <div class="soft-card-title">${icon('layers', 16)} 阶段分类</div>
      <div class="stage-tabs">
        ${data.stages.map((st, i) => `<button class="stage-tab ${i === mdActiveStage ? 'active' : ''}" data-stage="${i}">${escapeHTML(st.name)}</button>`).join('')}
      </div>
      <div class="course-form">${editingCourse ? courseFormHTML(editingCourse, true) : courseFormHTML({}, false)}</div>
      <div id="md-courses"></div>
    </div>

    <div class="soft-card">
      <div class="soft-card-title">${icon('flag', 16)} 个人学习目标规划<span class="stitle-meta">${data.goals.length} 项</span></div>
      ${mdEditGoal ? `
        <div class="edit-card">
          <input class="pf-input" id="mg-task" value="${escapeHTML((data.goals.find(g => g.id === mdEditGoal) || {}).task || '')}" placeholder="任务（如：完成一个角色模型）" style="margin-bottom:8px;">
          <input class="pf-input" id="mg-goal" value="${escapeHTML((data.goals.find(g => g.id === mdEditGoal) || {}).goal || '')}" placeholder="目标">
          <div class="profile-fields" style="margin-top:8px;">
            <div class="pf-field"><span class="pf-label">周期</span><input class="pf-input" id="mg-period" value="${(data.goals.find(g => g.id === mdEditGoal) || {}).period || ''}" placeholder="如：2 周"></div>
          </div>
          <div class="focus-actions" style="margin-top:10px;"><button class="gold-btn" id="mg-save">保存</button><button class="ghost-btn" id="mg-cancel">取消</button></div>
        </div>
      ` : `
        <input class="pf-input" id="mg-task" placeholder="任务（如：完成一个角色模型）" style="margin-bottom:8px;">
        <input class="pf-input" id="mg-goal" placeholder="目标">
        <div class="profile-fields" style="margin-top:8px;">
          <div class="pf-field"><span class="pf-label">周期</span><input class="pf-input" id="mg-period" placeholder="如：2 周"></div>
        </div>
        <div class="focus-actions" style="margin-top:10px;"><button class="gold-btn" id="mg-add">添加目标</button></div>
      `}
      <div id="md-goals"></div>
    </div>

    <div class="soft-card">
      <div class="soft-card-title">${icon('note', 16)} 知识库笔记<span class="stitle-meta">${data.notes.length} 条</span></div>
      ${mdEditNote ? `
        <div class="edit-card">
          <div class="profile-fields">
            <div class="pf-field"><span class="pf-label">类型</span>
              <select class="pf-input" id="mn-kind">${['知识点', '技巧', '参考资料'].map(k => `<option ${k === (data.notes.find(n => n.id === mdEditNote) || {}).kind ? 'selected' : ''}>${k}</option>`).join('')}</select>
            </div>
          </div>
          <input class="pf-input" id="mn-content" value="${escapeHTML((data.notes.find(n => n.id === mdEditNote) || {}).content || '')}" placeholder="内容" style="margin-top:8px;">
          <input class="pf-input" id="mn-link" value="${escapeHTML((data.notes.find(n => n.id === mdEditNote) || {}).link || '')}" placeholder="链接（可选）" style="margin-top:8px;">
          <div class="focus-actions" style="margin-top:10px;"><button class="gold-btn" id="mn-save">保存</button><button class="ghost-btn" id="mn-cancel">取消</button></div>
        </div>
      ` : `
        <div class="profile-fields">
          <div class="pf-field"><span class="pf-label">类型</span>
            <select class="pf-input" id="mn-kind"><option>知识点</option><option>技巧</option><option>参考资料</option></select>
          </div>
        </div>
        <input class="pf-input" id="mn-content" placeholder="内容" style="margin-top:8px;">
        <input class="pf-input" id="mn-link" placeholder="链接（可选）" style="margin-top:8px;">
        <div class="focus-actions" style="margin-top:10px;"><button class="gold-btn" id="mn-add">添加笔记</button></div>
      `}
      <div id="md-notes"></div>
    </div>

    <div class="soft-card">
      <div class="soft-card-title">${icon('chart', 16)} 学习统计</div>
      <div class="mini-stats">
        <div class="mini-stat"><div class="mini-stat-val">${doneCourses}/${totalCourses}</div><div class="mini-stat-label">已完成课程</div></div>
        <div class="mini-stat"><div class="mini-stat-val" style="font-size:13px;">${escapeHTML(stage.name)}</div><div class="mini-stat-label">当前阶段</div></div>
      </div>
    </div>
  `;
  content.appendChild(page);

  page.querySelectorAll('.stage-tab').forEach(btn => {
    btn.addEventListener('click', () => { mdActiveStage = parseInt(btn.dataset.stage); mdEditCourse = null; renderContent(); });
  });

  if (editingCourse) {
    page.querySelector('#mc-save').addEventListener('click', () => {
      editingCourse.title = page.querySelector('#mc-title').value.trim();
      editingCourse.difficulty = page.querySelector('#mc-diff').value;
      editingCourse.desc = page.querySelector('#mc-desc').value.trim();
      editingCourse.link = page.querySelector('#mc-link').value.trim();
      saveModeling(); mdEditCourse = null; renderContent();
    });
    page.querySelector('#mc-cancel').addEventListener('click', () => { mdEditCourse = null; renderContent(); });
    page.querySelector('#mc-del').addEventListener('click', () => {
      stage.courses = stage.courses.filter(x => x.id !== editingCourse.id);
      saveModeling(); mdEditCourse = null; renderContent();
    });
  } else {
    page.querySelector('#mc-add').addEventListener('click', () => {
      const title = page.querySelector('#mc-title').value.trim();
      if (!title) return;
      stage.courses.push({ id: uid('mc'), title, difficulty: page.querySelector('#mc-diff').value, desc: page.querySelector('#mc-desc').value.trim(), link: page.querySelector('#mc-link').value.trim(), done: false });
      saveModeling(); renderContent();
    });
  }

  const coursesHost = page.querySelector('#md-courses');
  stage.courses.forEach(c => {
    const el = document.createElement('div');
    el.className = 'course-card' + (c.done ? ' done' : '');
    el.dataset.id = c.id;
    el.innerHTML = `
      <div class="course-main">
        <div class="course-title">${escapeHTML(c.title)} ${diffBadgeHTML(c.difficulty)}</div>
        ${c.desc ? `<div class="course-desc">${escapeHTML(c.desc)}</div>` : ''}
      </div>
      <div class="course-ops">
        <button class="proj-check" data-act="done" aria-label="完成">${c.done ? icon('check', 14) : ''}</button>
        <button class="jump-btn" data-act="jump" ${c.link ? '' : 'disabled'}>${icon('link', 13)} 跳转教程</button>
        <button class="icon-action edit" data-act="edit" aria-label="编辑">${icon('edit', 13)}</button>
        <button class="icon-action delete" data-act="del" aria-label="删除">${icon('delete', 14)}</button>
      </div>`;
    el.querySelector('[data-act="done"]').addEventListener('click', () => { c.done = !c.done; saveModeling(); renderContent(); });
    el.querySelector('[data-act="jump"]').addEventListener('click', () => openVideo(c.link, c.title));
    el.querySelector('[data-act="edit"]').addEventListener('click', () => { mdEditCourse = { stageIdx: mdActiveStage, id: c.id }; renderContent(); });
    el.querySelector('[data-act="del"]').addEventListener('click', () => { stage.courses = stage.courses.filter(x => x.id !== c.id); saveModeling(); renderContent(); });
    coursesHost.appendChild(el);
  });

  const goalsHost = page.querySelector('#md-goals');
  data.goals.forEach(g => {
    const el = document.createElement('div');
    el.className = 'plan-row' + (g.done ? ' done' : '');
    el.innerHTML = `
      <button class="plan-check" data-act="check" aria-label="完成">${g.done ? icon('check', 14) : ''}</button>
      <div class="plan-body">
        <div class="plan-goal">${escapeHTML(g.task || g.goal || '目标')}</div>
        <div class="plan-sub">${escapeHTML(g.goal || '')}${g.period ? ' · ' + escapeHTML(g.period) : ''}</div>
      </div>
      <button class="icon-action edit" data-act="edit" aria-label="编辑">${icon('edit', 13)}</button>
      <button class="icon-action delete" data-act="del" aria-label="删除">${icon('delete', 14)}</button>`;
    el.querySelector('[data-act="check"]').addEventListener('click', () => { g.done = !g.done; saveModeling(); renderContent(); });
    el.querySelector('[data-act="edit"]').addEventListener('click', () => { mdEditGoal = g.id; renderContent(); });
    el.querySelector('[data-act="del"]').addEventListener('click', () => { state.modeling.goals = state.modeling.goals.filter(x => x.id !== g.id); saveModeling(); renderContent(); });
    goalsHost.appendChild(el);
  });
  if (mdEditGoal) {
    const g = data.goals.find(x => x.id === mdEditGoal);
    page.querySelector('#mg-save').addEventListener('click', () => {
      g.task = page.querySelector('#mg-task').value.trim();
      g.goal = page.querySelector('#mg-goal').value.trim();
      g.period = page.querySelector('#mg-period').value.trim();
      saveModeling(); mdEditGoal = null; renderContent();
    });
    page.querySelector('#mg-cancel').addEventListener('click', () => { mdEditGoal = null; renderContent(); });
  } else {
    page.querySelector('#mg-add').addEventListener('click', () => {
      const task = page.querySelector('#mg-task').value.trim();
      if (!task) return;
      state.modeling.goals.push({ id: uid('mg'), task, goal: page.querySelector('#mg-goal').value.trim(), period: page.querySelector('#mg-period').value.trim(), done: false });
      saveModeling(); renderContent();
    });
  }

  const notesHost = page.querySelector('#md-notes');
  data.notes.forEach(n => {
    const el = document.createElement('div');
    el.className = 'mat-note';
    el.innerHTML = `
      <div class="mat-note-head"><span class="mat-kind">${escapeHTML(n.kind || '知识')}</span>
        <span class="mat-ops"><button class="icon-action edit" data-act="edit" aria-label="编辑">${icon('edit', 13)}</button><button class="icon-action delete" data-act="del" aria-label="删除">${icon('delete', 14)}</button></span>
      </div>
      <div class="mat-content">${escapeHTML(n.content)}</div>
      ${n.link ? `<button class="jump-btn sm" data-act="open">${icon('link', 12)} 打开链接</button>` : ''}`;
    el.querySelector('[data-act="edit"]').addEventListener('click', () => { mdEditNote = n.id; renderContent(); });
    el.querySelector('[data-act="del"]').addEventListener('click', () => { state.modeling.notes = state.modeling.notes.filter(x => x.id !== n.id); saveModeling(); renderContent(); });
    if (n.link) el.querySelector('[data-act="open"]').addEventListener('click', () => openVideo(n.link, n.content));
    notesHost.appendChild(el);
  });
  if (mdEditNote) {
    const n = data.notes.find(x => x.id === mdEditNote);
    page.querySelector('#mn-save').addEventListener('click', () => {
      n.kind = page.querySelector('#mn-kind').value;
      n.content = page.querySelector('#mn-content').value.trim();
      n.link = page.querySelector('#mn-link').value.trim();
      saveModeling(); mdEditNote = null; renderContent();
    });
    page.querySelector('#mn-cancel').addEventListener('click', () => { mdEditNote = null; renderContent(); });
  } else {
    page.querySelector('#mn-add').addEventListener('click', () => {
      const content = page.querySelector('#mn-content').value.trim();
      if (!content) return;
      state.modeling.notes.push({ id: uid('mn'), kind: page.querySelector('#mn-kind').value, content, link: page.querySelector('#mn-link').value.trim() });
      saveModeling(); renderContent();
    });
  }
}


window.__xenosRegisterRoutes && window.__xenosRegisterRoutes({ '书籍阅读': renderBookReading, '视频剪辑': renderVideoEditing, '3D建模': render3DModeling });
