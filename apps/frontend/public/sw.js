const CACHE_NAME = 'smart-pos-v1';
const STATIC_CACHE = 'smart-pos-static-v1';
const API_CACHE = 'smart-pos-api-v1';
const IMAGE_CACHE = 'smart-pos-images-v1';
const BUNDLE_CACHE = 'smart-pos-bundle-v1';

const API_URL = self.location.origin + '/api';

const PRECACHE_URLS = [
  '/',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];

const STATIC_EXTENSIONS = /\.(png|jpg|jpeg|gif|svg|ico|webp|woff|woff2|ttf|eot)$/i;
const BUNDLE_EXTENSIONS = /\.(js|css|mjs)$/i;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll(PRECACHE_URLS);
    }).then(() => {
      return self.skipWaiting();
    })
  );
});

self.addEventListener('activate', (event) => {
  const validCaches = [STATIC_CACHE, API_CACHE, IMAGE_CACHE, BUNDLE_CACHE];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => !validCaches.includes(name))
          .map((name) => caches.delete(name))
      );
    }).then(() => {
      return self.clients.claim();
    })
  );
});

async function networkFirstWithFallback(request, cacheName) {
  try {
    const response = await fetch(request.clone());
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
      return response;
    }
    throw new Error('Network response was not ok');
  } catch (error) {
    const cached = await caches.match(request);
    if (cached) {
      return cached;
    }
    return new Response(
      JSON.stringify({
        error: 'You are offline and this data is not cached.',
        offline: true,
      }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) {
    return cached;
  }
  try {
    const response = await fetch(request.clone());
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
      return response;
    }
    return response;
  } catch (error) {
    return new Response('Offline', { status: 503 });
  }
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  const fetchPromise = fetch(request.clone()).then((response) => {
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  }).catch(() => {
    return cached;
  });

  return cached || fetchPromise;
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== 'GET') {
    if (request.url.startsWith(API_URL)) {
      event.respondWith(
        (async () => {
          try {
            return await fetch(request.clone());
          } catch (error) {
            const serialized = {
              url: request.url,
              method: request.method,
              headers: Object.fromEntries(request.headers.entries()),
              body: request.body ? await request.clone().text() : null,
              timestamp: Date.now(),
            };

            const dbRequest = indexedDB.open('smart-pos-offline-sync', 1);
            const db = await new Promise((resolve, reject) => {
              dbRequest.onsuccess = () => resolve(dbRequest.result);
              dbRequest.onerror = () => reject(dbRequest.error);
              dbRequest.onupgradeneeded = (e) => {
                const database = e.target.result;
                if (!database.objectStoreNames.contains('offline-mutations')) {
                  database.createObjectStore('offline-mutations', {
                    keyPath: 'id',
                    autoIncrement: true,
                  });
                }
              };
            });

            const tx = db.transaction('offline-mutations', 'readwrite');
            tx.objectStore('offline-mutations').add(serialized);
            await new Promise((resolve, reject) => {
              tx.oncomplete = () => resolve();
              tx.onerror = () => reject(tx.error);
            });

            return new Response(
              JSON.stringify({ queued: true, message: 'Queued for sync' }),
              {
                status: 202,
                headers: { 'Content-Type': 'application/json' },
              }
            );
          }
        })()
      );
      return;
    }
    return;
  }

  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirstWithFallback(request, API_CACHE));
    return;
  }

  if (STATIC_EXTENSIONS.test(url.pathname)) {
    event.respondWith(cacheFirst(request, IMAGE_CACHE));
    return;
  }

  if (BUNDLE_EXTENSIONS.test(url.pathname)) {
    event.respondWith(staleWhileRevalidate(request, BUNDLE_CACHE));
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) {
        return cached;
      }
      return fetch(request).then((response) => {
        if (response.ok) {
          const cache = caches.open(STATIC_CACHE);
          cache.then((c) => c.put(request, response.clone()));
        }
        return response;
      }).catch(() => {
        return caches.match('/');
      });
    })
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data && event.data.type === 'SYNC_MUTATIONS') {
    syncOfflineMutations().then((result) => {
      event.source.postMessage({
        type: 'SYNC_RESULT',
        result,
      });
    });
  }

  if (event.data && event.data.type === 'GET_PENDING_COUNT') {
    getPendingMutationsCount().then((count) => {
      event.source.postMessage({
        type: 'PENDING_COUNT',
        count,
      });
    });
  }
});

self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-offline-mutations') {
    event.waitUntil(syncOfflineMutations());
  }
});

self.addEventListener('push', (event) => {
  if (!event.data) return;

  try {
    const data = event.data.json();
    const options = {
      body: data.body || '',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      tag: data.tag || 'default',
      data: data.data || {},
      actions: data.actions || [],
      requireInteraction: data.requireInteraction || false,
      vibrate: [200, 100, 200],
      dir: 'rtl',
      lang: 'ar',
    };

    event.waitUntil(
      self.registration.showNotification(data.title || 'Smart POS', options)
    );
  } catch (e) {
    const options = {
      body: event.data.text(),
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      dir: 'rtl',
      lang: 'ar',
    };
    event.waitUntil(
      self.registration.showNotification('Smart POS', options)
    );
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clients) => {
      const matchingClient = clients.find(
        (client) => client.url.includes(urlToOpen) && 'focus' in client
      );
      if (matchingClient) {
        return matchingClient.focus();
      }
      return self.clients.openWindow(urlToOpen);
    })
  );
});

async function syncOfflineMutations() {
  const dbRequest = indexedDB.open('smart-pos-offline-sync', 1);
  const db = await new Promise((resolve, reject) => {
    dbRequest.onsuccess = () => resolve(dbRequest.result);
    dbRequest.onerror = () => reject(dbRequest.error);
  });

  const tx = db.transaction('offline-mutations', 'readonly');
  const store = tx.objectStore('offline-mutations');
  const mutations = await new Promise((resolve, reject) => {
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

  const results = { synced: 0, failed: 0 };

  for (const mutation of mutations) {
    try {
      const headers = new Headers();
      if (mutation.headers) {
        Object.entries(mutation.headers).forEach(([key, value]) => {
          if (key.toLowerCase() !== 'content-length') {
            headers.set(key, value);
          }
        });
      }

      const fetchOptions = {
        method: mutation.method,
        headers,
      };

      if (mutation.body && mutation.method !== 'GET' && mutation.method !== 'HEAD') {
        fetchOptions.body = mutation.body;
      }

      const response = await fetch(mutation.url, fetchOptions);

      if (response.ok || response.status === 409) {
        const deleteTx = db.transaction('offline-mutations', 'readwrite');
        deleteTx.objectStore('offline-mutations').delete(mutation.id);
        await new Promise((resolve, reject) => {
          deleteTx.oncomplete = () => resolve();
          deleteTx.onerror = () => reject(deleteTx.error);
        });
        results.synced++;
      } else {
        results.failed++;
      }
    } catch (error) {
      results.failed++;
    }
  }

  return results;
}

async function getPendingMutationsCount() {
  try {
    const dbRequest = indexedDB.open('smart-pos-offline-sync', 1);
    const db = await new Promise((resolve, reject) => {
      dbRequest.onsuccess = () => resolve(dbRequest.result);
      dbRequest.onerror = () => reject(dbRequest.error);
    });
    const tx = db.transaction('offline-mutations', 'readonly');
    const store = tx.objectStore('offline-mutations');
    const count = await new Promise((resolve, reject) => {
      const req = store.count();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    return count;
  } catch {
    return 0;
  }
}