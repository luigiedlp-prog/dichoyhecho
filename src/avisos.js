import { ALER, DEST, MIN, enc } from './comun.js';

export const b64u = (b) =>
  btoa(String.fromCharCode(...new Uint8Array(b)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
export async function jwt(env, aud) {
  const k = await crypto.subtle.importKey(
    'jwk',
    JSON.parse(env.VAPID_PRIVATE),
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign'],
  );
  const h = b64u(enc(JSON.stringify({ typ: 'JWT', alg: 'ES256' }))),
    c = b64u(
      enc(
        JSON.stringify({
          aud,
          exp: Math.floor(Date.now() / 1e3) + 43200,
          sub: 'mailto:' + (env.VAPID_MAIL || 'hola@modusgrid.com'),
        }),
      ),
    );
  return h + '.' + c + '.' + b64u(await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, k, enc(h + '.' + c)));
}
// Cada aviso se guarda en la tabla avisos (el detalle se lee en la pestaña Novedades).
// Push con texto cifrado (RFC 8291). Si la suscripción es vieja y no tiene claves, va sin texto.
// Activa una potenciación (destacado o alertas). Devuelve un texto de error o null. La usa potenciaciones.js (todas son gratis).
export async function activar(env, ctx, a, now) {
  const D = env.DB,
    q = (t, ...x) => D.prepare(t).bind(...x);
  if (a.tipo === 'alertas') {
    const w = await q('SELECT alertas_hasta FROM usuarios WHERE id=?', a.usuario_id).first();
    if (!w) return 'No existe el usuario';
    const h = Math.max(now, w.alertas_hasta || 0) + ALER;
    await q('UPDATE usuarios SET alertas_hasta=? WHERE id=?', h, a.usuario_id).run();
    await q("UPDATE activaciones SET estado='activa',activada_en=?,vence=? WHERE id=?", now, h, a.id).run();
    ctx.waitUntil(
      avisar(env, [
        [
          a.usuario_id,
          'Tus alertas inmediatas están activas hasta el ' +
            new Date(h - 3 * 60 * MIN).toISOString().slice(8, 10) +
            '/' +
            new Date(h - 3 * 60 * MIN).toISOString().slice(5, 7) +
            '.',
        ],
      ]),
    );
  } else {
    const c = await q('SELECT * FROM pedidos WHERE id=?', a.pedido_id).first();
    if (!c || c.estado !== 'abierta' || c.vence < now) return 'Ese pedido ya no está abierto: rechazá la solicitud.';
    const h = Math.max(now, c.dest_hasta || 0) + DEST;
    await q('UPDATE pedidos SET dest_desde=?,dest_hasta=?,aviso_pend=1 WHERE id=?', now, h, c.id).run();
    await q("UPDATE activaciones SET estado='activa',activada_en=?,vence=? WHERE id=?", now, h, a.id).run();
    ctx.waitUntil(notificar(env, { ...c, dest_hasta: h, aviso_pend: 1 }, now));
    ctx.waitUntil(
      avisar(env, [[a.usuario_id, 'Tu pedido «' + c.titulo.slice(0, 60) + '» ya está destacado por 72 horas.']]),
    );
  }
  return null;
}
export async function avisar(env, items) {
  items = items.slice(0, 90);
  if (!items.length) return;
  const t = Date.now();
  try {
    await env.DB.batch(
      items.map(([i, x]) =>
        env.DB.prepare('INSERT INTO avisos(usuario_id,texto,creado) VALUES(?,?,?)').bind(i, String(x).slice(0, 200), t),
      ),
    );
  } catch (e) {}
  await push(
    env,
    items.map((x) => x[0]),
    new Map(items.map((x) => [x[0], x[1]])),
  );
}
// Avisa a los trabajadores del rubro, de a 40, sin repetir (tabla avisados).
// Con alertas pagas o pedido destacado: enseguida. Sin alertas: recién a los 45 minutos.
export async function notificar(env, ped, now) {
  const D = env.DB,
    dest = ped.dest_hasta > now,
    libre = dest || (ped.aviso_en > 0 && ped.aviso_en <= now);
  const ids = (
    await D.prepare(
      "SELECT u.id FROM usuarios u WHERE u.tipo='trabajador' AND u.suspendido=0 AND u.rubros LIKE ? AND (?=1 OR u.alertas_hasta>?) AND u.id NOT IN (SELECT usuario_id FROM avisados WHERE pedido_id=?) LIMIT 40",
    )
      .bind('%"' + ped.rubro + '"%', libre ? 1 : 0, now, ped.id)
      .all()
  ).results.map((x) => x.id);
  if (ids.length) {
    await D.batch(
      ids.map((i) => D.prepare('INSERT OR IGNORE INTO avisados(pedido_id,usuario_id) VALUES(?,?)').bind(ped.id, i)),
    );
    const t =
      (dest ? 'Pedido destacado' : 'Nuevo pedido') + ' de ' + ped.rubro + ': ' + String(ped.titulo).slice(0, 80);
    await avisar(
      env,
      ids.map((i) => [i, t]),
    );
  }
  if (libre && ids.length < 40 && ped.aviso_pend)
    await D.prepare('UPDATE pedidos SET aviso_pend=0 WHERE id=?').bind(ped.id).run();
  return ids.length;
}
export async function push(env, ids, msg) {
  ids = [...new Set(ids)].slice(0, 90);
  if (!env.VAPID_PRIVATE || !env.VAPID_PUBLIC || !ids.length) return;
  const subs = (
    await env.DB.prepare(
      'SELECT endpoint,usuario_id,p256dh,auth FROM push_subs WHERE usuario_id IN (' +
        ids.map(() => '?').join(',') +
        ') LIMIT 40',
    )
      .bind(...ids)
      .all()
  ).results;
  for (const s of subs) {
    try {
      const h = {
        authorization: 'vapid t=' + (await jwt(env, new URL(s.endpoint).origin)) + ', k=' + env.VAPID_PUBLIC,
        ttl: '86400',
      };
      const tx = msg instanceof Map ? msg.get(s.usuario_id) : msg;
      let body;
      if (tx && s.p256dh && s.auth) {
        body = await cifrar(
          s,
          JSON.stringify({
            t: 'Dicho y Hecho',
            b: String(tx).slice(0, 120),
            u: s.usuario_id === 0 ? '/#gestion' : undefined,
          }),
        );
        h['content-encoding'] = 'aes128gcm';
        h['content-type'] = 'application/octet-stream';
      }
      const r = await fetch(s.endpoint, { method: 'POST', headers: h, body });
      if (r.status === 404 || r.status === 410)
        await env.DB.prepare('DELETE FROM push_subs WHERE endpoint=?').bind(s.endpoint).run();
    } catch (e) {}
  }
}

export const ub64 = (s) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0));
export const cat = (...a) => {
  const o = new Uint8Array(a.reduce((n, x) => n + x.length, 0));
  let i = 0;
  for (const x of a) {
    o.set(x, i);
    i += x.length;
  }
  return o;
};
export const hkdf = async (salt, ikm, info, len) =>
  new Uint8Array(
    await crypto.subtle.deriveBits(
      { name: 'HKDF', hash: 'SHA-256', salt, info },
      await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits']),
      len * 8,
    ),
  );
export async function cifrar(sub, texto) {
  const ua = ub64(sub.p256dh),
    au = ub64(sub.auth),
    P = { name: 'ECDH', namedCurve: 'P-256' };
  const k = await crypto.subtle.generateKey(P, true, ['deriveBits']);
  const pub = new Uint8Array(await crypto.subtle.exportKey('raw', k.publicKey));
  const ecdh = new Uint8Array(
    await crypto.subtle.deriveBits(
      { name: 'ECDH', public: await crypto.subtle.importKey('raw', ua, P, false, []) },
      k.privateKey,
      256,
    ),
  );
  const ikm = await hkdf(au, ecdh, cat(enc('WebPush: info\0'), ua, pub), 32);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey(
    'raw',
    await hkdf(salt, ikm, enc('Content-Encoding: aes128gcm\0'), 16),
    'AES-GCM',
    false,
    ['encrypt'],
  );
  const ct = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: await hkdf(salt, ikm, enc('Content-Encoding: nonce\0'), 12) },
      key,
      cat(enc(texto), new Uint8Array([2])),
    ),
  );
  return cat(salt, new Uint8Array([0, 0, 16, 0, 65]), pub, ct);
}
