const CACHE_NAME = 'hesaplayicilar-v1.0.0';
const urlsToCache = [
  './',
  './index.html',
  './manifest.json',
  // Firebase CDN dosyaları
  'https://cdnjs.cloudflare.com/ajax/libs/firebase/9.23.0/firebase-app-compat.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/firebase/9.23.0/firebase-auth-compat.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/firebase/9.23.0/firebase-firestore-compat.min.js'
];

// Service Worker kurulumu
self.addEventListener('install', function(event) {
  console.log('[SW] Install event');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function(cache) {
        console.log('[SW] Cache açıldı');
        return cache.addAll(urlsToCache);
      })
      .then(function() {
        console.log('[SW] Tüm dosyalar cache\'e eklendi');
        return self.skipWaiting();
      })
      .catch(function(error) {
        console.error('[SW] Cache ekleme hatası:', error);
      })
  );
});

// Service Worker aktivasyonu
self.addEventListener('activate', function(event) {
  console.log('[SW] Activate event');
  
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.map(function(cacheName) {
          // Eski cache'leri temizle
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Eski cache siliniyor:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(function() {
      console.log('[SW] Service Worker aktif');
      return self.clients.claim();
    })
  );
});

// Fetch olayları (offline destek)
self.addEventListener('fetch', function(event) {
  // Sadece GET isteklerini yakala
  if (event.request.method !== 'GET') {
    return;
  }
  
  // Firebase Auth ve Firestore isteklerini cache'leme
  if (event.request.url.includes('firebase') || 
      event.request.url.includes('googleapis') ||
      event.request.url.includes('google') ||
      event.request.url.includes('admob') ||
      event.request.url.includes('googlesyndication')) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(function(response) {
        // Cache'de varsa döndür
        if (response) {
          console.log('[SW] Cache\'den döndürülüyor:', event.request.url);
          return response;
        }

        // Cache'de yoksa network'ten al
        return fetch(event.request).then(function(response) {
          // Geçerli response kontrolü
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }

          // Response'u klonla (sadece bir kez kullanılabilir)
          var responseToCache = response.clone();

          caches.open(CACHE_NAME)
            .then(function(cache) {
              // Yeni dosyaları cache'e ekle
              cache.put(event.request, responseToCache);
              console.log('[SW] Yeni dosya cache\'e eklendi:', event.request.url);
            });

          return response;
        }).catch(function(error) {
          console.log('[SW] Network hatası, offline mode:', error);
          
          // Offline iken ana sayfa döndür
          if (event.request.destination === 'document') {
            return caches.match('./index.html');
          }
          
          // Diğer dosyalar için offline sayfası
          return new Response('Offline - İnternet bağlantınızı kontrol edin', {
            status: 503,
            statusText: 'Service Unavailable',
            headers: new Headers({
              'Content-Type': 'text/plain'
            })
          });
        });
      })
  );
});

// Background Sync (gelecekte kullanım için)
self.addEventListener('sync', function(event) {
  if (event.tag === 'background-sync') {
    console.log('[SW] Background sync başlatıldı');
    event.waitUntil(doBackgroundSync());
  }
});

function doBackgroundSync() {
  // Background sync işlemleri
  return Promise.resolve();
}

// Push bildirimleri (gelecekte kullanım için)
self.addEventListener('push', function(event) {
  console.log('[SW] Push bildirimi alındı');
  
  const options = {
    body: event.data ? event.data.text() : 'Yeni hesaplama sonucu hazır!',
    icon: './icon-192.png',
    badge: './icon-96.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: 'Görüntüle',
        icon: './icon-192.png'
      },
      {
        action: 'close',
        title: 'Kapat',
        icon: './icon-192.png'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification('Hesaplayıcılar', options)
  );
});

// Bildirim tıklama olayları
self.addEventListener('notificationclick', function(event) {
  console.log('[SW] Bildirime tıklandı:', event.action);
  
  event.notification.close();

  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

// Uygulama güncellemeleri
self.addEventListener('message', function(event) {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('[SW] Force update başlatıldı');
    self.skipWaiting();
  }
});

console.log('[SW] Service Worker yüklendi - v1.0.0');
