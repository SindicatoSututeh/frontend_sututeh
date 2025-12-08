// ===================================================
// SUTUTEH PWA - Service Worker
// PRECACHE FORZADO de todas las rutas públicas
// Versión: 3.0.0
// ===================================================

importScripts('https://storage.googleapis.com/workbox-cdn/releases/6.5.4/workbox-sw.js');

if (workbox) {
  console.log("🟢 Workbox cargado correctamente");

  // ===================================================
  // 1️⃣ PRECACHE AUTOMÁTICO (archivos del build)
  // ===================================================
  workbox.precaching.precacheAndRoute(self.__WB_MANIFEST || []);

  // ===================================================
  // 2️⃣ PRECACHE MANUAL DE RUTAS PÚBLICAS
  // ===================================================
  // Esto garantiza que SIEMPRE estén disponibles offline
  const urlsToCache = [
    '/',
    '/index.html',
    '/quienes-somos',
    '/noticias',
    '/contacto'
  ];

  self.addEventListener('install', (event) => {
    console.log('📥 Instalando SW y precacheando rutas públicas...');
    
    event.waitUntil(
      caches.open('sututeh-pages-v1').then((cache) => {
        console.log('✅ Precacheando:', urlsToCache);
        return cache.addAll(urlsToCache);
      }).then(() => {
        console.log('✅ Todas las rutas públicas cacheadas');
        return self.skipWaiting(); // Activar inmediatamente
      }).catch((error) => {
        console.error('❌ Error al precachear:', error);
      })
    );
  });

  // ===================================================
  // 3️⃣ NAVEGACIÓN - SPA FALLBACK
  // ===================================================
  const navigationHandler = async ({ event, request }) => {
    try {
      // Intentar obtener de la red primero
      const networkResponse = await fetch(request, {
        timeout: 3000
      });
      
      // Si hay respuesta de red, cachearla
      const cache = await caches.open('sututeh-pages-v1');
      cache.put(request, networkResponse.clone());
      
      return networkResponse;
    } catch (error) {
      // Si falla la red, buscar en cache
      console.log('🔴 Sin red, usando cache para:', request.url);
      
      const cachedResponse = await caches.match(request);
      if (cachedResponse) {
        return cachedResponse;
      }
      
      // Si no hay cache, devolver index.html (SPA fallback)
      const indexCache = await caches.match('/index.html');
      if (indexCache) {
        return indexCache;
      }
      
      // Último recurso
      return new Response('Offline - Sin contenido cacheado', {
        status: 503,
        statusText: 'Service Unavailable'
      });
    }
  };

  const navigationRoute = new workbox.routing.NavigationRoute(navigationHandler, {
    allowlist: [
      new RegExp('^/$'),
      new RegExp('^/noticias'),
      new RegExp('^/quienes-somos'),
      new RegExp('^/contacto'),
    ],
    denylist: [
      new RegExp('/login'),
      new RegExp('/registro'),
      new RegExp('/admin'),
      new RegExp('/agremiado'),
    ],
  });
  
  workbox.routing.registerRoute(navigationRoute);

  // ===================================================
  // 4️⃣ JS Y CSS — STALE WHILE REVALIDATE
  // ===================================================
  workbox.routing.registerRoute(
    ({ request }) =>
      request.destination === "script" ||
      request.destination === "style",
    new workbox.strategies.StaleWhileRevalidate({
      cacheName: "assets-js-css",
      plugins: [
        new workbox.expiration.ExpirationPlugin({
          maxEntries: 60,
          maxAgeSeconds: 7 * 24 * 60 * 60,
        }),
      ],
    })
  );

  // ===================================================
  // 5️⃣ IMÁGENES LOCALES — CACHE FIRST
  // ===================================================
  workbox.routing.registerRoute(
    ({ request }) => request.destination === "image",
    new workbox.strategies.CacheFirst({
      cacheName: "images-local",
      plugins: [
        new workbox.expiration.ExpirationPlugin({
          maxEntries: 150,
          maxAgeSeconds: 30 * 24 * 60 * 60,
        }),
        new workbox.cacheableResponse.CacheableResponsePlugin({
          statuses: [0, 200],
        }),
      ],
    })
  );

  // ===================================================
  // 6️⃣ FUENTES WEB
  // ===================================================
  workbox.routing.registerRoute(
    ({ request }) => request.destination === "font",
    new workbox.strategies.CacheFirst({
      cacheName: "fonts",
      plugins: [
        new workbox.expiration.ExpirationPlugin({
          maxEntries: 30,
          maxAgeSeconds: 365 * 24 * 60 * 60,
        }),
      ],
    })
  );

  // ===================================================
  // 7️⃣ APIs PÚBLICAS - NETWORK FIRST CON CACHE
  // ===================================================
  
  // Noticias
  workbox.routing.registerRoute(
    ({ url }) => 
      url.pathname.includes('/api/noticias/publicados') ||
      url.pathname.match(/\/api\/noticias\/\d+$/),
    new workbox.strategies.NetworkFirst({
      cacheName: "api-noticias",
      networkTimeoutSeconds: 3,
      plugins: [
        new workbox.cacheableResponse.CacheableResponsePlugin({
          statuses: [0, 200],
        }),
        new workbox.expiration.ExpirationPlugin({
          maxEntries: 50,
          maxAgeSeconds: 24 * 60 * 60,
        }),
      ],
    })
  );

  // Datos de empresa
  workbox.routing.registerRoute(
    ({ url }) => 
      url.pathname.includes('/api/datos-empresa') ||
      url.pathname.includes('/api/nosotros/vigentes') ||
      url.pathname.includes('/api/puestos'),
    new workbox.strategies.NetworkFirst({
      cacheName: "api-empresa",
      networkTimeoutSeconds: 3,
      plugins: [
        new workbox.cacheableResponse.CacheableResponsePlugin({
          statuses: [0, 200],
        }),
        new workbox.expiration.ExpirationPlugin({
          maxEntries: 20,
          maxAgeSeconds: 7 * 24 * 60 * 60,
        }),
      ],
    })
  );

  // Contacto - SOLO NETWORK
  workbox.routing.registerRoute(
    ({ url }) => url.pathname.includes('/api/contacto'),
    new workbox.strategies.NetworkOnly()
  );

  // ===================================================
  // 8️⃣ ARCHIVOS PÚBLICOS DEL SERVIDOR
  // ===================================================
  workbox.routing.registerRoute(
    ({ url }) => 
      (url.origin.includes('sututeh') || url.origin.includes('render.com')) &&
      (url.pathname.includes('/uploads/public/') || 
       url.pathname.includes('/files/public/')),
    new workbox.strategies.CacheFirst({
      cacheName: "files-publicos",
      plugins: [
        new workbox.cacheableResponse.CacheableResponsePlugin({
          statuses: [0, 200],
        }),
        new workbox.expiration.ExpirationPlugin({
          maxEntries: 100,
          maxAgeSeconds: 30 * 24 * 60 * 60,
        }),
      ],
    })
  );

  // ===================================================
  // 9️⃣ FALLBACK OFFLINE GLOBAL
  // ===================================================
  workbox.routing.setCatchHandler(async ({ event, request }) => {
    if (request.mode === 'navigate') {
      // Intentar obtener la página específica del cache
      const cachedPage = await caches.match(request.url);
      if (cachedPage) {
        return cachedPage;
      }
      
      // Si no está, devolver index.html (React Router lo manejará)
      const cache = await caches.open('sututeh-pages-v1');
      const indexResponse = await cache.match('/index.html');
      if (indexResponse) {
        return indexResponse;
      }
      
      // Último recurso del precache de workbox
      const precache = await caches.open(workbox.core.cacheNames.precache);
      const precachedIndex = await precache.match('/index.html');
      return precachedIndex || Response.error();
    }

    if (request.destination === 'image') {
      return new Response('', {
        status: 200,
        statusText: 'Offline',
      });
    }

    return Response.error();
  });

} else {
  console.log("❌ Workbox NO se pudo cargar.");
}

// ===================================================
// 🔟 ACTIVACIÓN Y LIMPIEZA
// ===================================================
self.addEventListener("activate", (event) => {
  console.log("✅ Service Worker activado");
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          // Mantener solo los caches actuales
          const keepCaches = [
            'sututeh-pages-v1',
            'assets-js-css',
            'images-local',
            'fonts',
            'api-noticias',
            'api-empresa',
            'files-publicos'
          ];
          
          if (!keepCaches.includes(cacheName) && !cacheName.includes('workbox-precache')) {
            console.log('🗑️ Eliminando cache antigua:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('🚀 SW tomando control de todas las páginas');
      return self.clients.claim();
    })
  );
});

// Mensaje para forzar actualización
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});