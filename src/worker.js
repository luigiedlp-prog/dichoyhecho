import R from '../public/reglas.js';
import { DAY, E, FOTOS, PURGA, limpiarViejos, log, regError, rnd, sha } from './comun.js';
import { avisar, notificar } from './avisos.js';
import admin from './rutas/admin.js';
import { autenticar } from './rutas/sesion.js';
import cuenta from './rutas/cuenta.js';
import directorio from './rutas/directorio.js';
import interacciones from './rutas/interacciones.js';
import potenciaciones from './rutas/potenciaciones.js';
import pedidos from './rutas/pedidos.js';
import postulaciones from './rutas/postulaciones.js';
import publicas from './rutas/publicas.js';

export default {
  async fetch(req, env, ctx) {
    const u = new URL(req.url);
    if (u.pathname === '/sitemap.xml' || u.pathname === '/robots.txt') {
      // Se arman con el dominio real de la petición (igual que {{ORIGEN}} en la portada)
      const xml = u.pathname === '/sitemap.xml';
      const cuerpo = xml
        ? '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n<url><loc>' +
          u.origin +
          '/</loc><changefreq>weekly</changefreq><priority>1.0</priority></url>\n<url><loc>' +
          u.origin +
          '/legal.html</loc><changefreq>yearly</changefreq><priority>0.3</priority></url>\n</urlset>\n'
        : 'User-agent: *\nAllow: /\nDisallow: /api/\n\nSitemap: ' + u.origin + '/sitemap.xml\n';
      return new Response(cuerpo, {
        headers: {
          'content-type': xml ? 'application/xml; charset=utf-8' : 'text/plain; charset=utf-8',
          'cache-control': 'public, max-age=3600',
        },
      });
    }
    if (!u.pathname.startsWith('/api/')) {
      const r = await env.ASSETS.fetch(req);
      // La portada lleva {{ORIGEN}} en las etiquetas de vista previa (og:url, og:image): se completa con el dominio real de la petición
      if (
        (u.pathname === '/' || u.pathname === '/index.html') &&
        r.status === 200 &&
        (r.headers.get('content-type') || '').includes('text/html')
      ) {
        const h = new Headers(r.headers);
        h.delete('content-length');
        h.delete('etag');
        return new Response((await r.text()).split('{{ORIGEN}}').join(u.origin), { status: 200, headers: h });
      }
      return r;
    }
    try {
      return await api(req, env, u, ctx);
    } catch (e) {
      ctx.waitUntil(
        regError(
          env.DB,
          'worker',
          (e && e.message) || e,
          req.method + ' ' + u.pathname + ' ' + ((e && e.stack) || ''),
          0,
        ),
      );
      return E('Error del servidor', 500);
    }
  },
  async scheduled(ev, env, ctx) {
    const n = Date.now(),
      D = env.DB;
    // Cada 5 minutos: avisos demorados (a los 10 min les llega a quienes no tienen alertas) y lotes que quedaron pendientes
    const ps = (
      await D.prepare(
        "SELECT id,rubro,rubro_otro,titulo,dest_hasta,aviso_en,aviso_pend FROM pedidos WHERE aviso_pend=1 AND estado='abierta' AND COALESCE(oculta,0)=0 ORDER BY id LIMIT 5",
      ).all()
    ).results;
    let cupo = 40;
    for (const x of ps) {
      if (cupo <= 0) break;
      cupo -= await notificar(env, x, n);
    }
    await D.prepare("UPDATE pedidos SET aviso_pend=0 WHERE aviso_pend=1 AND estado!='abierta'").run();
    const hh = new Date(n);
    if (!(hh.getUTCHours() === 13 && hh.getUTCMinutes() < 5)) return; // lo diario corre una sola vez, 10:00 en Argentina
    const v = await D.prepare("UPDATE pedidos SET estado='vencida' WHERE estado='abierta' AND vence<?").bind(n).run();
    const f = await D.prepare(PURGA).run();
    const lv = await limpiarViejos(env, n);
    const r = (
      await D.prepare("SELECT cliente_id,titulo FROM pedidos WHERE estado='abierta' AND vence BETWEEN ? AND ? LIMIT 40")
        .bind(n, n + DAY)
        .all()
    ).results;
    await avisar(
      env,
      r.map((c) => [
        c.cliente_id,
        'Tu pedido «' +
          c.titulo +
          '» vence en menos de 24 horas. Cuando vence se borran sus fotos; si lo renovás, podés subirlas de nuevo.',
      ]),
    );
    await D.batch([
      D.prepare('DELETE FROM limites WHERE creado<?').bind(n - 2 * DAY),
      D.prepare('DELETE FROM avisos WHERE creado<?').bind(n - 30 * DAY),
      D.prepare('DELETE FROM sesiones WHERE vence<?').bind(n),
      D.prepare('DELETE FROM logs WHERE creado<?').bind(n - 60 * DAY),
      D.prepare('DELETE FROM errores WHERE creado<?').bind(n - 30 * DAY),
      D.prepare("DELETE FROM invitaciones WHERE pedido_id NOT IN (SELECT id FROM pedidos WHERE estado='abierta')"),
    ]);
    await log(
      D,
      'sistema',
      'Cron diario: ' +
        ((v.meta && v.meta.changes) || 0) +
        ' pedidos vencidos, ' +
        ((f.meta && f.meta.changes) || 0) +
        ' fotos borradas, ' +
        r.length +
        ' avisos de vencimiento, ' +
        lv.avisos +
        ' avisos de fotos de reseñas, ' +
        lv.fotos +
        ' fotos de reseñas borradas, ' +
        lv.pedidos +
        ' pedidos viejos borrados',
    );
  },
};

// Cada archivo de rutas/ recibe el contexto C y devuelve una Response si la ruta es suya (o nada si no lo es).
async function api(req, env, u, ctx) {
  const D = env.DB,
    p = u.pathname.slice(5).split('/'),
    m = req.method,
    now = Date.now();
  const b = m === 'POST' ? await req.json().catch(() => ({})) : {};
  const q = (s, ...a) => D.prepare(s).bind(...a);
  // Agrega fotos a una pedido hasta el máximo de FOTOS (3)
  const addF = async (id, fs) => {
    let n = (await q('SELECT COUNT(*) n FROM pedido_fotos WHERE pedido_id=?', id).first()).n;
    for (const f of Array.isArray(fs) ? fs : []) {
      if (n >= FOTOS) break;
      if (typeof f === 'string' && f.startsWith('data:image/jpeg;base64,') && f.length < 250000) {
        await q('INSERT INTO pedido_fotos(pedido_id,img,k) VALUES(?,?,?)', id, f.slice(23), rnd(8)).run();
        n++;
      }
    }
  };
  const tel = R.limpiarTel(b.telefono); // el teléfono se acepta como lo escriba la persona (con 0, 15, +54 9...)
  // La IP se guarda solo como huella. Con el secret IP_SALT (opcional) la huella no se puede recalcular probando todas las IP posibles
  const ipk = async () => (await sha((env.IP_SALT || '') + (req.headers.get('cf-connecting-ip') || 'x'))).slice(0, 16);

  const C = { req, env, u, ctx, D, p, m, now, b, q, addF, tel, ipk };
  for (const ruta of [admin, publicas]) {
    const r = await ruta(C);
    if (r) return r;
  }
  // Desde acá hace falta una sesión (autenticar deja me, cli, tra, etc. en C)
  const sinSesion = await autenticar(C);
  if (sinSesion) return sinSesion;
  for (const ruta of [cuenta, potenciaciones, interacciones, directorio, pedidos, postulaciones]) {
    const r = await ruta(C);
    if (r) return r;
  }
  return E('No existe', 404);
}
