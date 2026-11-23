import R from '../public/reglas.js';
import { avisar } from './avisos.js';

export const SEG = {
  'x-content-type-options': 'nosniff',
  'x-frame-options': 'DENY',
  'referrer-policy': 'strict-origin-when-cross-origin',
};
export const J = (d, s = 200) =>
  new Response(JSON.stringify(d), { status: s, headers: { 'content-type': 'application/json', ...SEG } });
export const E = (m, s = 400) => J({ error: m }, s);
export const hex = (b) => [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, '0')).join('');
export const rnd = (n) => hex(crypto.getRandomValues(new Uint8Array(n)));
export const enc = (s) => new TextEncoder().encode(s);
export const sha = async (s) => hex(await crypto.subtle.digest('SHA-256', enc(s)));
export const hp = async (p, salt) => {
  const k = await crypto.subtle.importKey('raw', enc(p), 'PBKDF2', false, ['deriveBits']);
  return (
    salt +
    ':' +
    hex(
      await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: enc(salt), iterations: 100000 }, k, 256),
    )
  );
};
export const mk = (p) => hp(p, rnd(8));
export const ok = async (p, h) => (await hp(p, h.split(':')[0])) === h;
export const RUBROS = R.RUBROS;
export const RLOC = [
  'Pinturerías',
  'Ferreterías',
  'Sanitarios',
  'Corralones',
  'Casas de electricidad',
  'Maderas y aberturas',
  'Vidrierías',
  'Otros',
];
export const DAY = 864e5,
  MIN = 6e4,
  PIN = R.PIN;
// Compara dos textos sin cortar en la primera diferencia (no filtra cuántas letras acertó quien prueba claves)
export const iguales = (a, b) => {
  a = String(a || '');
  b = String(b || '');
  let d = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) d |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return d === 0;
};
// Las primeras PIONEROS cuentas que se registran llevan la insignia "Pionero" (columna usuarios.pionero, de por vida)
export const PIONEROS = 50;
export const REF_N = 5,
  REF_MAX = 3,
  MAILRE = R.MAIL,
  REFRE = /^[A-HJKMNP-Z2-9]{6}$/; // REF_N: invitados con perfil completo para ganar una potenciación
// Nombre y apellido: al menos dos palabras (la primera y la última de 2 letras o más). Devuelve el nombre limpio o '' si no alcanza.
export const NOM = R.nombre;
export const DEST = 72 * 60 * MIN,
  ALER = 7 * DAY,
  DEMORA = 10 * MIN; // destacado 72 hs, alertas 7 días, aviso demorado 10 min para quien no tiene alertas
export const FOTOS = 3,
  PAG = 20,
  MAXR = 3; // fotos por pedido, pedidos por página, rubros por trabajador
export const NR = R.NR;
export const PREG = R.preg;
export const PGEN = R.PREGUNTAS; // para teléfonos que no existen: así no se sabe quién está registrado
export const limpiarBloq = (D, tel) =>
  D.prepare('DELETE FROM limites WHERE clave IN (?,?,?) OR clave LIKE ? OR clave LIKE ?')
    .bind('fa:' + tel, 'rf:' + tel, 'rb:' + tel, 'lb:' + tel + ':%', 'lf:' + tel + ':%')
    .run();
export const cod6 = () => String(crypto.getRandomValues(new Uint32Array(1))[0] % 1000000).padStart(6, '0');
export const aj = async (D, k, d) => {
  try {
    const x = await D.prepare('SELECT valor FROM ajustes WHERE clave=?').bind(k).first();
    const n = x ? +x.valor : NaN;
    return Number.isFinite(n) ? n : d;
  } catch (e) {
    return d;
  }
};
// Código de invitación de cada cuenta (6 caracteres sin letras confusas). Se crea la primera vez que se pide.
export const refCod = async (D, u) => {
  if (u.ref_cod) return u.ref_cod;
  const AB = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  for (let i = 0; i < 8; i++) {
    const c = [...crypto.getRandomValues(new Uint8Array(6))].map((x) => AB[x % AB.length]).join('');
    try {
      await D.prepare("UPDATE usuarios SET ref_cod=? WHERE id=? AND ref_cod=''").bind(c, u.id).run();
    } catch (e) {
      continue;
    }
    const r = await D.prepare('SELECT ref_cod FROM usuarios WHERE id=?').bind(u.id).first();
    if (r && r.ref_cod) return r.ref_cod;
  }
  return '';
};
// La primera potenciación es gratis (se apaga desde Gestión > Ajustes) y solo si la cuenta nunca tuvo una activada.
export const primeraDisp = async (D, id) =>
  !!(await aj(D, 'primera_gratis', 1)) &&
  !(await D.prepare("SELECT 1 x FROM activaciones WHERE usuario_id=? AND estado='activa'").bind(id).first());
// Errores inesperados (del Worker y de la app en el celular) para verlos en Gestión > Ajustes y logs
export const regError = async (D, donde, msg, det, uid) => {
  try {
    await D.prepare('INSERT INTO errores(creado,donde,mensaje,detalle,usuario_id) VALUES(?,?,?,?,?)')
      .bind(
        Date.now(),
        String(donde || '').slice(0, 20),
        String(msg || '').slice(0, 300),
        String(det || '').slice(0, 600),
        uid || 0,
      )
      .run();
  } catch (e) {}
}; // nunca debe romper nada
export const log = (D, t, x) =>
  D.prepare('INSERT INTO logs(creado,tipo,detalle) VALUES(?,?,?)')
    .bind(Date.now(), t, String(x).slice(0, 200))
    .run()
    .catch(() => {});
// Las fotos de una pedido se borran cuando vence o se cancela (hay que subirlas de nuevo al renovar)
export const PURGA =
  "DELETE FROM pedido_fotos WHERE pedido_id IN (SELECT id FROM pedidos WHERE estado IN ('vencida','cancelada'))";
// v34: limpieza automática (la corre el cron diario)
// 1) Fotos de reseñas: se avisan 7 días antes y se borran a los 90 días. Queda el puntaje y el comentario.
// 2) Pedidos que el cliente eliminó: se borran de verdad a los 180 días, con sus propuestas. Se conservan los que tienen reseña (cuentan para el puntaje) o denuncia.
export const FOTO_RESENA_DIAS = 90,
  AVISO_DIAS = 7,
  PEDIDO_OCULTO_DIAS = 180;
export const PED_VIEJOS =
  "oculta=1 AND estado IN ('vencida','hecha') AND COALESCE(hecha_en,vence)<? AND id NOT IN (SELECT pedido_id FROM puntuaciones) AND id NOT IN (SELECT objetivo_id FROM denuncias WHERE tipo='pedido')";
export async function limpiarViejos(env, n) {
  const D = env.DB,
    out = { avisos: 0, fotos: 0, pedidos: 0 };
  try {
    const fmt = (t) =>
      new Date(t).toLocaleDateString('es-AR', {
        day: 'numeric',
        month: 'long',
        timeZone: 'America/Argentina/Buenos_Aires',
      });
    // El aviso lleva el título y la fecha de la reseña: así cada reseña tiene su propio texto y no se avisa dos veces
    const txt = (x) =>
      (
        'Las fotos de tu reseña de «' +
        String(x.titulo || 'tu pedido').slice(0, 50) +
        '» del ' +
        fmt(x.creado) +
        ' se borran en ' +
        AVISO_DIAS +
        ' días para liberar espacio. El puntaje y el comentario se quedan.'
      ).slice(0, 200);
    const cand = (
      await D.prepare(
        "SELECT s.id,s.cliente_id,s.creado,COALESCE(c.titulo,'') titulo FROM puntuaciones s LEFT JOIN pedidos c ON c.id=s.pedido_id WHERE s.id IN (SELECT DISTINCT puntuacion_id FROM resena_fotos) AND s.creado<? ORDER BY s.id LIMIT 1000",
      )
        .bind(n - (FOTO_RESENA_DIAS - AVISO_DIAS) * DAY)
        .all()
    ).results;
    const yaAvisados = new Map(
      (
        await D.prepare(
          "SELECT usuario_id,texto,MIN(creado) creado FROM avisos WHERE texto LIKE 'Las fotos de tu reseña de%' GROUP BY usuario_id,texto",
        ).all()
      ).results.map((x) => [x.usuario_id + '|' + x.texto, x.creado]),
    );
    const avisar_ = [],
      borrar = [];
    for (const x of cand) {
      const t = yaAvisados.get(x.cliente_id + '|' + txt(x));
      if (t === undefined) {
        if (avisar_.length < 80) avisar_.push([x.cliente_id, txt(x)]);
      } else if (t <= n - (AVISO_DIAS - 0.5) * DAY) borrar.push(x.id); // ya pasaron los 7 días del aviso
    }
    if (avisar_.length) {
      await avisar(env, avisar_);
      out.avisos = avisar_.length;
    }
    for (let i = 0; i < borrar.length; i += 50) {
      const c = borrar.slice(i, i + 50),
        r = await D.prepare('DELETE FROM resena_fotos WHERE puntuacion_id IN (' + c.map(() => '?').join(',') + ')')
          .bind(...c)
          .run();
      out.fotos += (r.meta && r.meta.changes) || 0;
    }
    const lim = n - PEDIDO_OCULTO_DIAS * DAY;
    const rs = await D.batch([
      ...['postulaciones', 'invitaciones', 'avisados', 'pedido_fotos'].map((t) =>
        D.prepare('DELETE FROM ' + t + ' WHERE pedido_id IN (SELECT id FROM pedidos WHERE ' + PED_VIEJOS + ')').bind(
          lim,
        ),
      ),
      D.prepare('DELETE FROM pedidos WHERE ' + PED_VIEJOS).bind(lim),
    ]);
    out.pedidos = (rs[rs.length - 1].meta && rs[rs.length - 1].meta.changes) || 0;
  } catch (e) {
    await log(
      D,
      'sistema',
      'Falló la limpieza de fotos de reseñas y pedidos viejos: ' + String((e && e.message) || e).slice(0, 150),
    );
  }
  return out;
}
export const sesion = async (D, id, now) => {
  const t = rnd(24);
  await D.prepare('INSERT INTO sesiones VALUES(?,?,?)')
    .bind(await sha(t), id, now + 30 * DAY)
    .run();
  return t;
};

// Límite por clave: true si ya se llegó al máximo dentro de la ventana; si no, anota el intento.
// Cuánto falta para que se libere el próximo uso de un límite, en texto: "5 horas", "menos de 1 hora"
export const faltan = async (D, k, ms, now) => {
  const r = await D.prepare('SELECT MIN(creado) c FROM limites WHERE clave=? AND creado>?')
      .bind(k, now - ms)
      .first(),
    w = r && r.c ? r.c + ms - now : ms,
    h = Math.ceil(w / (60 * MIN));
  return w <= 60 * MIN ? 'menos de 1 hora' : h + (h === 1 ? ' hora' : ' horas');
};
export const lim = async (D, k, max, ms, now) => {
  const n = (
    await D.prepare('SELECT COUNT(*) n FROM limites WHERE clave=? AND creado>?')
      .bind(k, now - ms)
      .first()
  ).n;
  if (n >= max) return true;
  await D.prepare('INSERT INTO limites(clave,creado) VALUES(?,?)').bind(k, now).run();
  return false;
};

// Borrado definitivo de una cuenta (lo dispara un administrador desde Gestión, después de revisar el pedido de eliminación).
// Se borran el perfil, las fotos, los pedidos, las postulaciones y los avisos, y la fila queda anonimizada
// (sin datos personales y con el teléfono liberado). Se conservan las reseñas que escribió, sin su nombre.
export async function borrarCuentaDefinitivo(D, id) {
  const mios = 'SELECT id FROM pedidos WHERE cliente_id=?',
    conRes = 'SELECT pedido_id FROM puntuaciones';
  await D.batch([
    ...['pedido_fotos', 'postulaciones', 'invitaciones', 'avisados'].map((t) =>
      D.prepare('DELETE FROM ' + t + ' WHERE pedido_id IN (' + mios + ')').bind(id),
    ),
    D.prepare(
      "UPDATE pedidos SET titulo='Pedido eliminado',descripcion='',presupuesto='',oculta=1,estado=CASE WHEN estado IN ('abierta','elegida') THEN 'cancelada' ELSE estado END WHERE cliente_id=? AND id IN (" +
        conRes +
        ')',
    ).bind(id),
    D.prepare('DELETE FROM pedidos WHERE cliente_id=? AND id NOT IN (' + conRes + ')').bind(id),
    D.prepare(
      'DELETE FROM resena_fotos WHERE puntuacion_id IN (SELECT id FROM puntuaciones WHERE trabajador_id=?)',
    ).bind(id),
    D.prepare('DELETE FROM puntuaciones WHERE trabajador_id=?').bind(id),
    D.prepare('DELETE FROM postulaciones WHERE trabajador_id=?').bind(id),
    D.prepare('DELETE FROM invitaciones WHERE trabajador_id=? OR cliente_id=?').bind(id, id),
    D.prepare('DELETE FROM avisados WHERE usuario_id=?').bind(id),
    ...['perfil_fotos', 'trabajos_fotos', 'push_subs', 'avisos', 'sesiones'].map((t) =>
      D.prepare('DELETE FROM ' + t + ' WHERE usuario_id=?').bind(id),
    ),
    D.prepare('UPDATE usuarios SET ref_por=0 WHERE ref_por=?').bind(id),
    D.prepare(
      "UPDATE usuarios SET nombre='Cuenta eliminada',telefono=?,pin_hash=?,rec_hash=?,barrio='',rubros='[]',bio='',dni='',direccion='',mail='',suspendido=1,elim_pedida=0,alertas_hasta=0,ref_cod='',ref_por=0,promos=0,reg_ip='',pregunta='',resp_hash='',pionero=0 WHERE id=?",
    ).bind('eliminada-' + id, await mk(rnd(12)), await mk(rnd(12)), id),
  ]);
}
