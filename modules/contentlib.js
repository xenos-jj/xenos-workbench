// xenos 懒加载模块：内容素材库（v9261）
// 由 app.js 的 loadLazyPage 按需加载；加载完成自动注册路由。
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
      <button class="icon-action delete" data-del="${it.id}" aria-label="删除"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>
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

window.__xenosRegisterRoutes && window.__xenosRegisterRoutes({ '内容素材库': renderContentLibrary });
