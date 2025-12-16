// 缓存版本（修改后会更新缓存）
const CACHE_NAME = 'yd-fire-assessment-v1';
// 需要缓存的核心文件
const CACHE_FILES = [
  '/',
  '/index.html',
  '/manifest.json',
  '/service-worker.js'
];

// 1. 安装阶段：缓存核心文件
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(CACHE_FILES))
      .then(() => self.skipWaiting()) // 强制激活新的Service Worker
  );
});

// 2. 激活阶段：清理旧缓存
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.filter(name => name !== CACHE_NAME)
          .map(name => caches.delete(name)) // 删除非当前版本的缓存
      );
    }).then(() => self.clients.claim()) // 控制所有打开的页面
  );
});

// 3. fetch阶段：优先使用缓存，同时更新缓存
self.addEventListener('fetch', (event) => {
  // 忽略跨域请求（如第三方API）
  if (event.request.url.startsWith('http') && !event.request.url.includes(self.location.hostname)) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        // 存在缓存则返回缓存，同时后台更新缓存
        const fetchPromise = fetch(event.request)
          .then(networkResponse => {
            caches.open(CACHE_NAME)
              .then(cache => {
                // 更新缓存（只缓存GET请求）
                if (event.request.method === 'GET') {
                  cache.put(event.request, networkResponse.clone());
                }
              });
            return networkResponse;
          })
          .catch(() => cachedResponse); // 网络错误时返回缓存

        // 有缓存先返回缓存，无缓存则等待网络请求
        return cachedResponse || fetchPromise;
      })
  );
});
