// xenos service worker
// 提速策略（v9152）：静态资源 cache-first，version.json 网络直连。
// 版本更新仍由 index.html 内联探针（直连 version.json）保证：探测到新版本即强制刷新，
// 因此此处缓存 app.js/styles.css/字体/图片 不会造成“看不到新版”的问题。
const CACHE = 'xenos-cache-v9303';
const STATIC = [
  './',
  'index.html',
  'app.js?v=303',
  'styles.css?v=303',
  'fonts/zcool-sub.ttf?v=303',
  'fonts/strawberry-sub.ttf?v=303',
  'assets/mascot.png',
  'manifest.webmanifest?v=303',
  'icon-192.png?v=303',
  'modules/study.js?v=303',
  'modules/contentlib.js?v=303'
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

  // 导航请求（HTML 文档）：缓存优先（手机弱网/离线秒开），后台静默更新缓存
  if (e.request.mode === 'navigate') {
    e.respondWith(
      caches.match('index.html').then((cached) => {
        const network = fetch(e.request)
          .then((res) => {
            if (res && res.ok) {
              const copy = res.clone();
              caches.open(CACHE).then((c) => c.put('index.html', copy)).catch(() => {});
            }
            return res;
          })
          .catch(() => cached);
        return cached || network;
      })
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
