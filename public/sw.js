// Service Worker para PWA y Notificaciones Push
// Maneja notificaciones push y permite que Chrome detecte la PWA como instalable

const CACHE_NAME = 'turix-pwa-v1';

// Instalación del Service Worker
self.addEventListener('install', (event) => {
  // Activar inmediatamente sin esperar
  self.skipWaiting();
});

// Activación del Service Worker
self.addEventListener('activate', (event) => {
  // Tomar control de todas las páginas inmediatamente
  event.waitUntil(clients.claim());
});

// Fetch - NO cachear nada, siempre ir a la red
self.addEventListener('fetch', (event) => {
  // No interceptar ninguna petición, dejar que pase directamente
  // Esto asegura que no haya problemas con autenticación o APIs
  event.respondWith(fetch(event.request));
});

// ============================================
// NOTIFICACIONES PUSH
// ============================================

// Escuchar eventos push (cuando llega una notificación)
self.addEventListener('push', (event) => {
  console.log('[Service Worker] Push recibido:', event);

  let notificationData = {
    title: 'Turix',
    body: 'Tienes una nueva notificación',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    tag: 'turix-notification',
    requireInteraction: false,
    data: {
      url: '/dashboard'
    }
  };

  // Si el evento tiene datos, usarlos
  if (event.data) {
    try {
      const data = event.data.json();
      notificationData = {
        title: data.title || notificationData.title,
        body: data.body || notificationData.body,
        icon: data.icon || notificationData.icon,
        badge: data.badge || notificationData.badge,
        tag: data.tag || notificationData.tag,
        requireInteraction: data.requireInteraction || false,
        data: {
          url: data.url || notificationData.data.url,
          ...data.data
        }
      };
    } catch (e) {
      console.error('[Service Worker] Error parseando datos push:', e);
    }
  }

  // Mostrar la notificación
  event.waitUntil(
    self.registration.showNotification(notificationData.title, {
      body: notificationData.body,
      icon: notificationData.icon,
      badge: notificationData.badge,
      tag: notificationData.tag,
      requireInteraction: notificationData.requireInteraction,
      data: notificationData.data,
      vibrate: [200, 100, 200],
      actions: [
        {
          action: 'open',
          title: 'Abrir',
          icon: '/icons/icon-72x72.png'
        },
        {
          action: 'close',
          title: 'Cerrar'
        }
      ]
    })
  );
});

// Manejar clics en notificaciones
self.addEventListener('notificationclick', (event) => {
  console.log('[Service Worker] Notificación clickeada:', event);

  event.notification.close();

  const action = event.action;
  const notificationData = event.notification.data || {};

  // Si el usuario hizo clic en "Abrir" o en la notificación misma
  if (action === 'open' || !action) {
    const urlToOpen = notificationData.url || '/dashboard';

    event.waitUntil(
      clients.matchAll({
        type: 'window',
        includeUncontrolled: true
      }).then((clientList) => {
        // Si ya hay una ventana abierta, enfocarla y navegar
        for (let i = 0; i < clientList.length; i++) {
          const client = clientList[i];
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            return client.focus().then(() => {
              return client.navigate(urlToOpen);
            });
          }
        }
        // Si no hay ventana abierta, abrir una nueva
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
    );
  }
  // Si el usuario hizo clic en "Cerrar", solo cerrar la notificación
  // (ya se cerró arriba)
});

// Manejar cierre de notificaciones
self.addEventListener('notificationclose', (event) => {
  console.log('[Service Worker] Notificación cerrada:', event);
  // Aquí podrías enviar analytics si lo necesitas
});

