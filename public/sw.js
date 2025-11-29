// Service Worker mínimo para PWA
// No cachea nada, solo permite que Chrome detecte la PWA como instalable

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

