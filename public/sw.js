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

// Fetch - NO interceptar peticiones, dejar que pasen directamente
// El Service Worker solo está aquí para notificaciones push, no para cachear
self.addEventListener('fetch', (event) => {
  // No interceptar ninguna petición
  // Esto evita problemas con APIs, autenticación y navegación
  // Dejar que todas las peticiones pasen directamente sin interceptar
  return;
});

// ============================================
// NOTIFICACIONES PUSH
// ============================================

// Escuchar eventos push (cuando llega una notificación)
self.addEventListener('push', (event) => {
  console.log('[Service Worker] Push recibido:', event);
  console.log('[Service Worker] Event data:', event.data);

  let notificationData = {
    title: 'Turix',
    body: 'Tienes una nueva notificación',
    icon: 'https://cgoisveithzvituzyoga.supabase.co/storage/v1/object/public/icons/icon-192x192.png',
    badge: 'https://cgoisveithzvituzyoga.supabase.co/storage/v1/object/public/icons/icon-72x72.png',
    tag: 'turix-notification',
    requireInteraction: false,
    data: {
      url: '/dashboard'
    }
  };

  // Si el evento tiene datos, usarlos
  if (event.data) {
    try {
      // Intentar parsear como JSON
      let data;
      try {
        data = event.data.json();
        console.log('[Service Worker] Datos parseados:', data);
      } catch (jsonError) {
        // Si no es JSON, intentar como texto
        const text = event.data.text();
        console.log('[Service Worker] Datos como texto:', text);
        try {
          data = JSON.parse(text);
        } catch (parseError) {
          console.error('[Service Worker] Error parseando datos:', parseError);
          // Usar datos por defecto
          data = null;
        }
      }

      if (data) {
        notificationData = {
          title: data.title || notificationData.title,
          body: data.body || notificationData.body,
          icon: data.icon || notificationData.icon,
          badge: data.badge || notificationData.badge,
          tag: data.tag || notificationData.tag,
          requireInteraction: data.requireInteraction !== undefined ? data.requireInteraction : notificationData.requireInteraction,
          data: {
            url: data.url || notificationData.data.url,
            ...(data.data || {})
          }
        };
      }
    } catch (e) {
      console.error('[Service Worker] Error procesando datos push:', e);
    }
  }

  console.log('[Service Worker] Mostrando notificación:', notificationData);

  // Mostrar la notificación con manejo de errores
  const notificationPromise = self.registration.showNotification(notificationData.title, {
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
        icon: 'https://cgoisveithzvituzyoga.supabase.co/storage/v1/object/public/icons/icon-72x72.png'
      },
      {
        action: 'close',
        title: 'Cerrar'
      }
    ]
  }).then(() => {
    console.log('[Service Worker] ✅ Notificación mostrada exitosamente');
  }).catch((error) => {
    console.error('[Service Worker] ❌ Error mostrando notificación:', error);
  });

  event.waitUntil(notificationPromise);
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

