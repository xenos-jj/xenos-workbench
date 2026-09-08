// xenos service worker
// 提速策略（v9152）：静态资源 cache-first，version.json 网络直连。
// 版本更新仍由 index.html 内联探针（直连 version.json）保证：探测到新版本即强制刷新，
// 因此此处缓存 app.js/styles.css/字体/图片 不会造成“看不到新版”的问题。
// v9392：瘦身——删除 5 张零引用图片（images/1,2,5.png / images/mascot.png / assets/mascot.png），
// assets/mascot.png 已从预缓存清单移除（无任何 UI 引用）。
const CACHE = 'xenos-cache-v9453';
const STATIC = [
  './',
  'index.html',
  'app.js?v=453',
  'styles.css?v=453',
  'fonts/zcool-sub.ttf?v=453',
  'fonts/strawberry-sub.ttf?v=453',
  'manifest.webmanifest?v=453',
  'icon-192.png?v=453',
  'modules/study.js?v=453',
  'modules/contentlib.js?v=453'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(STATIC.map((u) => new Request(u, { cache: 'no-cache' })))).catch(() => {}).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.origin !== self.location.origin) return;

  // version.json：始终网络直连（不带缓存），保证版本探针实时
  if (url.pathname.endsWith('version.json')) {
    e.respondWith(fetch(e.request, { cache: 'no-store' }));
    return;
  }

  // 导航请求（HTML）：v9434 网络优先（继承 v9433 修复）——每次刷新拿线上最新 index，
  // 断网/失败才回退缓存（避免旧 SW cache-first 无限续命旧页面）
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request)
        .then((res) => {
          if (res && res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put('index.html', copy)).catch(() => {});
          }
          return res;
        })
        .catch(() => caches.match('index.html').then((c) => c || caches.match('./')))
    );
    return;
  }

  // 其余静态资源：缓存优先，未命中再走网络并写入缓存
  e.respondWith(
    caches.match(e.request).then((cached) => {
      if (cached) return cached;
      return fetch(e.request, { cache: 'force-cache' }).then((res) => {
        if (res && res.ok && (res.type === 'basic' || res.type === 'default')) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copy)).catch(() => {});
        }
        return res;
      }).catch(() => cached);
    })
  );
});
