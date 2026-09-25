/* LUBRIMAX — Service Worker (hecho a mano, sin dependencias)
 *
 * Objetivos:
 *  - Instalable como PWA + arranque offline del "cascarón" público.
 *  - NUNCA cachear nada autenticado ni mutaciones: /admin, /api, Server
 *    Actions (POST), páginas de cuenta de cliente. Se dejan pasar tal cual
 *    para que el navegador maneje su propia sesión/red.
 *
 * Al cambiar la estrategia de caché, subir CACHE_VERSION.
 */

const CACHE_VERSION = "v3";
const STATIC_CACHE = `lubrimax-static-${CACHE_VERSION}`;
const RUNTIME_CACHE = `lubrimax-runtime-${CACHE_VERSION}`;
const OFFLINE_URL = "/offline";
// Tope de páginas guardadas para uso offline (se borran las más antiguas).
const RUNTIME_MAX_ENTRIES = 40;

// Recursos mínimos para que algo se vea sin red.
const PRECACHE_URLS = [
  OFFLINE_URL,
  "/manifest.webmanifest",
  "/logo-lubrimax.webp",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];

// Prefijos que el SW NO debe tocar jamás (se dejan pasar a la red).
const BYPASS_PREFIXES = [
  "/admin",
  "/api",
  "/login",
  "/registro",
  "/perfil",
  "/checkout",
  "/_next/data",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k !== STATIC_CACHE && k !== RUNTIME_CACHE)
            .map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});

// Tocar una notificación de reserva: enfocar el panel si ya está abierto, o
// abrirlo (ver src/components/admin/BookingNotifier.tsx).
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || "/admin", self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((wins) => {
      const panel = wins.find((w) => new URL(w.url).pathname.startsWith("/admin"));
      if (panel) {
        return panel.focus().then((w) => (w && "navigate" in w ? w.navigate(target) : w));
      }
      return self.clients.openWindow(target);
    })
  );
});

// Borra las entradas más antiguas (orden de inserción) sobre el tope.
async function trimCache(cache, max) {
  const keys = await cache.keys();
  await Promise.all(keys.slice(0, Math.max(0, keys.length - max)).map((k) => cache.delete(k)));
}

function isBypassed(url, request) {
  if (request.method !== "GET") return true;
  if (url.origin !== self.location.origin) return true;
  if (request.headers.has("range")) return true;
  if (BYPASS_PREFIXES.some((p) => url.pathname === p || url.pathname.startsWith(p + "/"))) {
    return true;
  }
  return false;
}

function isStaticAsset(url) {
  return (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    /\.(?:css|js|woff2?|ttf|otf|png|jpe?g|webp|avif|gif|svg|ico)$/i.test(url.pathname)
  );
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (isBypassed(url, request)) return;

  // Navegaciones a páginas públicas: red primero, luego caché, luego offline.
  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(request);
          // Solo respuestas OK y sin redirección: antes se guardaban también
          // páginas de error (500) y se servían offline.
          if (fresh.ok && !fresh.redirected) {
            // Clonar YA, en el mismo tick: si se clona después de un await,
            // el navegador puede haber empezado a leer el cuerpo de `fresh`
            // mientras tanto y el clone revienta con "Response body is
            // already used".
            const copy = fresh.clone();
            caches
              .open(RUNTIME_CACHE)
              .then((cache) => cache.put(request, copy).then(() => trimCache(cache, RUNTIME_MAX_ENTRIES)))
              .catch(() => {});
          }
          return fresh;
        } catch {
          const cached = await caches.match(request);
          if (cached) return cached;
          return (await caches.match(OFFLINE_URL)) || Response.error();
        }
      })()
    );
    return;
  }

  // Estáticos: caché primero, revalidando en segundo plano.
  if (isStaticAsset(url)) {
    event.respondWith(
      (async () => {
        const cached = await caches.match(request);
        const network = fetch(request)
          .then((res) => {
            if (res && res.ok) {
              // Mismo cuidado acá: clonar de inmediato, no dentro de un
              // .then() posterior a otro await.
              const copy = res.clone();
              caches.open(STATIC_CACHE).then((cache) => cache.put(request, copy)).catch(() => {});
            }
            return res;
          })
          .catch(() => null);
        return cached || (await network) || Response.error();
      })()
    );
  }
  // Resto: pass-through (no respondWith).
});
