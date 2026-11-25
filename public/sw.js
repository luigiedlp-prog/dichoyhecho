// Dicho y Hecho: caché de la app para abrirla sin internet + avisos push.
// La API (/api/...) nunca se guarda: lo que se ve sin conexión es la pantalla, no los datos.
const V = 'ct-v101',
  SHELL = [
    './',
    'app.css',
    'ajustes-visuales.css',
    'responsive.css',
    'escritorio.css',
    'app/base.js',
    'app/utiles.js',
    'app/componentes.js',
    'app/portada-registro.js',
    'app/navegacion.js',
    'app/mapa.js',
    'app/listas.js',
    'app/vistas.js',
    'app/escritorio.js',
    'app/acciones.js',
    'app/gestion.js',
    'app/arranque.js',
    'config.js',
    'datos.js',
    'qr.js',
    'reglas.js',
    'tema.js',
    'manifest.json',
    'favicon.png',
    'img/hero-iglesia.webp',
    'img/trabajador.webp',
    'icon-192.png',
    'modusgrid.webp',
    'legal.html',
    'fonts/poppins-400.woff',
    'fonts/poppins-500.woff',
    'fonts/poppins-700.woff',
    'fonts/righteous.woff',
  ];
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches
      .open(V)
      .then((c) => Promise.all(SHELL.map((u) => c.add(new Request(u, { cache: 'reload' })).catch(() => {}))))
      .then(() => self.skipWaiting()),
  );
});
self.addEventListener('activate', (e) =>
  e.waitUntil(
    caches
      .keys()
      .then((k) => Promise.all(k.filter((x) => x !== V).map((x) => caches.delete(x))))
      .then(() => self.clients.claim()),
  ),
);
// Cloudflare manda /legal.html a /legal con una redirección. Esa respuesta, guardada en la caché, trae la marca "redirected" y el navegador no la acepta para abrir una página (ERR_FAILED, por ejemplo en los links de términos y privacidad). Se rearma una copia limpia.
const limpia = (x) =>
  x && x.redirected ? new Response(x.body, { status: x.status, statusText: x.statusText, headers: x.headers }) : x;
// Rápido y al día: se muestra al instante lo guardado y se actualiza en segundo plano.
// Para publicar un cambio, subí el número de V (ct-v40, ct-v41...): el celu baja todo de nuevo y la app se recarga sola al pasarla a segundo plano.
self.addEventListener('fetch', (e) => {
  const r = e.request,
    u = new URL(r.url);
  if (r.method !== 'GET' || u.origin !== location.origin || u.pathname.startsWith('/api/')) return;
  e.respondWith(
    caches.open(V).then(async (c) => {
      const m = await c.match(r, { ignoreSearch: true });
      const red = fetch(r)
        .then((x) => {
          if (x.ok) c.put(r, x.clone());
          return x;
        })
        .catch(() => null);
      if (m) {
        e.waitUntil(red);
        return limpia(m);
      }
      const n = await red;
      if (n) return limpia(n);
      return r.mode === 'navigate' ? limpia(await c.match('./')) : Response.error();
    }),
  );
});
self.addEventListener('push', (e) => {
  let d = {};
  try {
    d = e.data.json();
  } catch (x) {}
  e.waitUntil(
    self.registration.showNotification(d.t || 'Dicho y Hecho', {
      body: d.b || 'Tenés novedades. Tocá para verlas.',
      icon: 'icon-192.png',
      badge: 'favicon.png',
      data: { u: d.u || '' },
    }),
  );
});
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  e.waitUntil(clients.openWindow((e.notification.data && e.notification.data.u) || '/#novedades'));
});
