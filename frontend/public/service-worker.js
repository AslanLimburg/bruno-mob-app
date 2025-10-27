/* eslint-disable no-restricted-globals */

// Bruno Token PWA Service Worker
// Version 2.0.0 - With Auto-Update

const CACHE_NAME = 'bruno-token-v2';
const urlsToCache = [
  '/',
  '/static/css/main.css',
  '/static/js/main.js',
  '/static/js/bundle.js',
  '/manifest.json',
  '/favicon.ico',
  '/logo192.png',
  '/logo512.png'
];

// Install event - кэшируем ресурсы
self.addEventListener('install', (event) => {
  console.log('🚀 PWA Service Worker installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('📦 Opened cache');
        return cache.addAll(urlsToCache);
      })
      .catch((error) => {
        console.error('❌ Cache installation failed:', error);
      })
  );
  // НЕ вызываем skipWaiting() автоматически - ждем команды от пользователя
});

// Activate event - очищаем старые кэши
self.addEventListener('activate', (event) => {
  console.log('✅ PWA Service Worker activated');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('🗑️ Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  return self.clients.claim();
});

// Message handler - для обновления по команде пользователя
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('⏩ Skipping waiting - activating new version');
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CHECK_UPDATE') {
    console.log('🔍 Checking for updates...');
    self.registration.update();
  }
});

// Fetch event - стратегия кэширования
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Игнорируем API запросы - они всегда должны идти на сервер
  if (url.pathname.startsWith('/api/')) {
    return;
  }

  // Игнорируем Chrome extensions
  if (url.protocol === 'chrome-extension:') {
    return;
  }

  // Network First для HTML файлов
  if (request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone);
          });
          return response;
        })
        .catch(() => {
          return caches.match(request);
        })
    );
    return;
  }

  // Cache First для статических ресурсов
  event.respondWith(
    caches.match(request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          // Обновляем кэш в фоне
          fetch(request).then((response) => {
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, response);
            });
          }).catch(() => {});
          return cachedResponse;
        }

        return fetch(request)
          .then((response) => {
            // Кэшируем только успешные ответы
            if (!response || response.status !== 200 || response.type === 'error') {
              return response;
            }

            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });

            return response;
          });
      })
  );
});

// Push notifications
self.addEventListener('push', (event) => {
  console.log('📬 Push notification received');
  
  const options = {
    body: event.data ? event.data.text() : 'New notification',
    icon: '/logo192.png',
    badge: '/logo192.png',
    vibrate: [200, 100, 200],
    tag: 'bruno-token-notification',
    requireInteraction: false,
    actions: [
      { action: 'open', title: 'Open App' },
      { action: 'close', title: 'Close' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification('Bruno Token', options)
  );
});

// Notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'open' || !event.action) {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

// Background sync
self.addEventListener('sync', (event) => {
  console.log('🔄 Background sync:', event.tag);
  
  if (event.tag === 'sync-messages') {
    event.waitUntil(syncMessages());
  }
});

async function syncMessages() {
  try {
    console.log('📨 Syncing messages...');
    // Здесь можно добавить логику синхронизации
    return Promise.resolve();
  } catch (error) {
    console.error('❌ Sync failed:', error);
    return Promise.reject(error);
  }
}

// Periodic background sync
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'update-content') {
    event.waitUntil(updateContent());
  }
});

async function updateContent() {
  console.log('🔄 Updating content...');
  return Promise.resolve();
}

console.log('🎉 Bruno Token PWA Service Worker loaded successfully!');

