// xenos service worker
// 策略：开发迭代阶段不缓存任何资源，所有请求都直接走网络，确保每次都能看到最新部署。
// 这样既能保留 PWA（manifest + sw），又不会因缓存导致版本不更新。
self.addEventListener('install', (e) => {
  e.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k)))).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.origin !== self.location.origin) return;
  // 所有同源 GET 请求直接走网络，不缓存
  e.respondWith(fetch(e.request));
});
