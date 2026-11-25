// Prueba el registro con rubro, el cambio de rol y de rubro (cuenta y Gestión) y el conteo de suscripciones push, contra el Worker real y SQLite con el schema real.
// Uso: node tools/probar-roles.mjs
import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
const R = new URL('../', import.meta.url);
const W = (await import(new URL('src/worker.js', R))).default; // el Worker real, con sus imports (public/reglas.js)
const db = new DatabaseSync(':memory:');
db.exec(fs.readFileSync(new URL('schema.sql', R), 'utf8'));
db.exec(fs.readFileSync(new URL('datos-locales-pergamino.sql', R), 'utf8'));
class S {
  constructor(s) {
    this.s = s;
    this.a = [];
  }
  bind(...a) {
    this.a = a;
    return this;
  }
  async run() {
    const r = db.prepare(this.s).run(...this.a);
    return { meta: { changes: Number(r.changes), last_row_id: Number(r.lastInsertRowid) } };
  }
  async first() {
    return db.prepare(this.s).get(...this.a) ?? null;
  }
  async all() {
    return { results: db.prepare(this.s).all(...this.a), meta: {} };
  }
}
const DB = {
  prepare: (s) => new S(s),
  async batch(l) {
    const o = [];
    for (const x of l) o.push(await x.run());
    return o;
  },
};
const env = {
    DB,
    ADMIN_KEY: 'clave',
    ASSETS: {
      fetch: async (q) => {
        const p = new URL(q.url).pathname;
        if (p === '/' || p === '/index.html')
          return new Response(fs.readFileSync(new URL('public/index.html', R), 'utf8'), {
            headers: { 'content-type': 'text/html; charset=utf-8', etag: 'x' },
          });
        return new Response('no', { status: 404 });
      },
    },
  },
  ctx = { waitUntil: (p) => p };
let n = 0;
const call = async (p, b, t, h = {}) => {
  const r = await W.fetch(
    new Request('https://x/api/' + p, {
      method: b ? 'POST' : 'GET',
      headers: { authorization: 'Bearer ' + (t || ''), 'cf-connecting-ip': '1.1.1.' + (++n % 200), ...h },
      body: b ? JSON.stringify(b) : undefined,
    }),
    env,
    ctx,
  );
  const ct = r.headers.get('content-type');
  return { s: r.status, d: ct === 'application/json' ? await r.json() : null, ct };
};
let fallas = 0;
const ok = (c, m) => {
  console.log(c ? 'OK  ' : 'FAIL', m);
  if (!c) fallas++;
};
db.exec("INSERT OR REPLACE INTO ajustes(clave,valor) VALUES('tel_on','0')");


const PIN = '123456';
const reg = (nombre, tel, tipo, extra = {}) =>
  call('registro', {
    tipo,
    nombre,
    barrio: 'Centro',
    telefono: tel,
    pin: PIN,
    acepto: 1,
    pregunta: '¿Cómo se llamaba tu primera mascota?',
    respuesta: 'Rocky Balboa',
    ...extra,
  });
const fila = (tel) => db.prepare('SELECT * FROM usuarios WHERE telefono=?').get(tel);
const adm = (p, b) => call('admin/' + p, b, '', { 'x-admin-key': 'clave' });

// ---- 1) Registro con rubro
let r = await reg('Pablo Pintor', '2477100001', 'trabajador', { rubro: 'Pintura' });
ok(r.s === 200 && !!r.d.token, 'registro de trabajador con rubro');
ok(fila('2477100001').rubros === '["Pintura"]' && fila('2477100001').rubro_otro === '', 'queda con el rubro elegido y sin texto de Otros');
r = await reg('Olga Otros', '2477100002', 'trabajador', { rubro: 'Otros' });
ok(r.s === 400, 'Otros sin decir cuál: se rechaza');
r = await reg('Olga Otros', '2477100002', 'trabajador', { rubro: 'Otros', rubro_otro: '  Reparación   de bicicletas  ' });
ok(r.s === 200 && fila('2477100002').rubros === '["Otros"]' && fila('2477100002').rubro_otro === 'Reparación de bicicletas', 'Otros con texto: se guarda limpio');
r = await reg('Ines Inventada', '2477100003', 'trabajador', { rubro: 'Astronauta' });
ok(r.s === 400, 'rubro que no está en la lista: se rechaza');
r = await reg('Vera Vieja', '2477100004', 'trabajador');
ok(r.s === 200 && fila('2477100004').rubros === '["Otros"]', 'sin rubro (app vieja en caché): queda en Otros como antes');
r = await reg('Carla Cliente', '2477100005', 'cliente', { rubro: 'Pintura', rubro_otro: 'x' });
ok(r.s === 200 && fila('2477100005').rubros === '[]' && fila('2477100005').rubro_otro === '', 'el cliente ignora el rubro');
const TC = r.d.token;

// ---- 2) yo cuenta las suscripciones push; guardar una la hace subir
r = await call('yo', null, TC);
ok(r.s === 200 && r.d.push_n === 0, 'yo: push_n arranca en 0');
r = await call('push', { endpoint: 'https://push.example/abc', p256dh: 'k', auth: 'a' }, TC);
r = await call('yo', null, TC);
ok(r.d.push_n === 1, 'yo: push_n sube a 1 al guardar la suscripción');
ok(db.prepare("SELECT COUNT(*) n FROM sqlite_master WHERE type='table' AND name='push_subs'").get().n === 1, 'las suscripciones van a push_subs de D1 (sin tabla ni servicio nuevo)');

// ---- 3) Endpoint rubro (trabajadores que quedaron en Otros)
r = await reg('Tomas Taller', '2477100006', 'trabajador');
const TT = r.d.token;
r = await call('rubro', { rubro: 'Plomería' }, TT);
ok(r.s === 200 && fila('2477100006').rubros === '["Plomería"]', 'rubro: reemplaza Otros por el rubro elegido');
r = await call('rubro', { rubro: 'Otros' }, TT);
ok(r.s === 400, 'rubro: Otros sin texto se rechaza');
r = await call('rubro', { rubro: 'Inventado' }, TT);
ok(r.s === 400, 'rubro: uno que no existe se rechaza');
r = await call('rubro', { rubro: 'Otros', rubro_otro: 'Tapicería' }, TT);
ok(r.s === 200 && fila('2477100006').rubros === '["Plomería","Otros"]' && fila('2477100006').rubro_otro === 'Tapicería', 'rubro: conserva los otros y guarda el texto de Otros');
r = await call('rubro', { rubro: 'Pintura' }, TC);
ok(r.s === 403, 'rubro: un cliente no puede');
ok(fila('2477100006').barrio === 'Centro', 'rubro: no toca el resto del perfil');

// ---- 4) Cambiar de rol desde el perfil
r = await reg('Cami Cambio', '2477100007', 'cliente');
const T7 = r.d.token;
r = await call('cambiar-rol', { tipo: 'trabajador', rubro: 'Pintura', pin: '000000' }, T7);
ok(r.s === 401, 'cambiar-rol: PIN incorrecto');
r = await call('cambiar-rol', { tipo: 'trabajador', pin: PIN }, T7);
ok(r.s === 400, 'cambiar-rol: a trabajador sin rubro se rechaza');
r = await call('cambiar-rol', { tipo: 'cliente', pin: PIN }, T7);
ok(r.s === 400, 'cambiar-rol: al mismo rol se rechaza');
r = await call('cambiar-rol', { tipo: 'trabajador', rubro: 'Jardinería', pin: PIN }, T7);
ok(r.s === 200 && fila('2477100007').tipo === 'trabajador' && fila('2477100007').rubros === '["Jardinería"]', 'cambiar-rol: cliente pasa a trabajador con su rubro');
r = await call('cambiar-rol', { tipo: 'cliente', pin: PIN }, T7);
ok(r.s === 200 && fila('2477100007').tipo === 'cliente' && fila('2477100007').rubros === '[]' && fila('2477100007').rubro_otro === '', 'cambiar-rol: vuelve a cliente y se vacían los rubros');
ok(
  db.prepare("SELECT COUNT(*) n FROM limites WHERE clave=?").get('rolc:' + fila('2477100007').id).n === 2,
  'cambiar-rol: los intentos con error no gastan el cupo diario (solo los 2 cambios hechos)',
);

// cupo diario: 3 cambios hechos, el cuarto se frena
r = await reg('Dani Diario', '2477100010', 'cliente');
const T10 = r.d.token;
for (const [t, rub] of [['trabajador', 'Pintura'], ['cliente'], ['trabajador', 'Limpieza']]) {
  r = await call('cambiar-rol', { tipo: t, rubro: rub, pin: PIN }, T10);
  ok(r.s === 200, 'cambiar-rol: cambio ' + t + ' entra');
}
r = await call('cambiar-rol', { tipo: 'cliente', pin: PIN }, T10);
ok(r.s === 429 && fila('2477100010').tipo === 'trabajador', 'cambiar-rol: el cuarto cambio del día se frena');

// con pedidos o propuestas en curso no se cambia
r = await reg('Pedro Pedidos', '2477100008', 'cliente');
const T8 = r.d.token,
  id8 = fila('2477100008').id;
db.prepare("INSERT INTO pedidos(cliente_id,titulo,rubro,vence,creado,estado) VALUES(?,?,?,?,?,'abierta')").run(id8, 'Pintar', 'Pintura', Date.now() + 864e5, Date.now());
r = await call('cambiar-rol', { tipo: 'trabajador', rubro: 'Pintura', pin: PIN }, T8);
ok(r.s === 400 && fila('2477100008').tipo === 'cliente', 'cambiar-rol: cliente con pedido abierto no puede pasar a trabajador');
db.prepare("UPDATE pedidos SET estado='cancelada' WHERE cliente_id=?").run(id8);
r = await call('cambiar-rol', { tipo: 'trabajador', rubro: 'Pintura', pin: PIN }, T8);
ok(r.s === 200, 'cambiar-rol: con el pedido cancelado sí puede');

r = await reg('Tita Trabajo', '2477100009', 'trabajador', { rubro: 'Limpieza' });
const T9 = r.d.token,
  id9 = fila('2477100009').id;
db.prepare("INSERT INTO pedidos(cliente_id,titulo,rubro,vence,creado,estado) VALUES(?,?,?,?,?,'abierta')").run(id8, 'Limpiar', 'Limpieza', Date.now() + 864e5, Date.now());
const ped = db.prepare('SELECT MAX(id) i FROM pedidos').get().i;
db.prepare("INSERT INTO postulaciones(pedido_id,trabajador_id,creado,estado) VALUES(?,?,?,'activa')").run(ped, id9, Date.now());
r = await call('cambiar-rol', { tipo: 'cliente', pin: PIN }, T9);
ok(r.s === 400 && fila('2477100009').tipo === 'trabajador', 'cambiar-rol: trabajador con propuesta activa no puede pasar a cliente');
db.prepare("UPDATE postulaciones SET estado='descartada' WHERE trabajador_id=?").run(id9);
r = await call('cambiar-rol', { tipo: 'cliente', pin: PIN }, T9);
ok(r.s === 200, 'cambiar-rol: con la propuesta descartada sí puede');

// ---- 5) Gestión (admin)
r = await call('admin/rol', { telefono: '2477100001', tipo: 'cliente' });
ok(r.s === 401, 'admin/rol sin clave: 401');
r = await adm('rol', { telefono: '2477109999', tipo: 'cliente' });
ok(r.s === 404, 'admin/rol: cuenta que no existe');
r = await adm('rol', { telefono: '2477100001', tipo: 'cliente' });
ok(r.s === 200 && fila('2477100001').tipo === 'cliente' && fila('2477100001').rubros === '[]', 'admin/rol: trabajador pasa a cliente');
r = await adm('rol', { telefono: '2477100001', tipo: 'trabajador' });
ok(r.s === 400, 'admin/rol: a trabajador sin rubro se rechaza');
r = await adm('rol', { telefono: '2477100001', tipo: 'trabajador', rubro: 'Electricidad' });
ok(r.s === 200 && fila('2477100001').tipo === 'trabajador' && fila('2477100001').rubros === '["Electricidad"]', 'admin/rol: cliente pasa a trabajador con rubro');
r = await adm('rubro', { telefono: '2477100001', rubro: 'Herrería' });
ok(r.s === 200 && fila('2477100001').rubros === '["Herrería"]', 'admin/rubro: cambia el rubro');
r = await adm('rubro', { telefono: '2477100001', rubro: 'Otros' });
ok(r.s === 400, 'admin/rubro: Otros sin texto se rechaza');
r = await adm('rubro', { telefono: '2477100005', rubro: 'Herrería' });
ok(r.s === 404, 'admin/rubro: un cliente no tiene rubro');
r = await adm('trabajadores');
const lista = await call('admin/trabajadores', null, '', { 'x-admin-key': 'clave' });
ok(lista.s === 200 && lista.d.every((x) => x.tipo === 'trabajador') && lista.d.length > 0, 'admin: la lista de trabajadores trae tipo');
const lc = await call('admin/clientes', null, '', { 'x-admin-key': 'clave' });
ok(lc.s === 200 && lc.d.every((x) => x.tipo === 'cliente'), 'admin: la lista de clientes trae tipo');
console.log(fallas ? '\n' + fallas + ' FALLAS' : '\nTodo bien');
process.exit(fallas ? 1 : 0);
