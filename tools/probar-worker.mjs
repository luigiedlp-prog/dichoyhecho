// Prueba el Worker REAL contra SQLite (el motor de D1) con el schema.sql real. Uso: node tools/probar-worker.mjs  (Node 22 o más)
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
const JP =
  'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=';
db.exec("INSERT OR REPLACE INTO ajustes(clave,valor) VALUES('tel_on','0')"); // las pruebas viejas registran cuentas sin pasar por el código de WhatsApp; las de v42 lo prenden
console.log('locales cargados:', db.prepare('SELECT COUNT(*) n FROM locales').get().n);
let r = await call('registro', {
  tipo: 'cliente',
  nombre: 'Ana Pérez',
  telefono: '2477000001',
  pin: '123456',
  acepto: 1,
  pregunta: '¿Cómo se llamaba tu primera mascota?',
  respuesta: 'Rocky Balboa',
});
ok(r.s === 400, 'registro sin barrio: se rechaza');
r = await call('registro', {
  tipo: 'cliente',
  nombre: 'Ana Pérez',
  barrio: 'Centro',
  telefono: '2477000001',
  pin: '123456',
  acepto: 1,
  pregunta: '¿Cómo se llamaba tu primera mascota?',
  respuesta: 'Rocky Balboa',
});
const C = r.d.token;
ok(!!C, 'registro cliente');
r = await call('pedidos', { titulo: 'Pintar pared', rubro: 'Pintura', barrio: 'Centro' }, C);
ok(r.s === 403, 'sin foto de perfil no puede publicar');
r = await call('perfil-foto', { foto: JP }, C);
ok(r.s === 200, 'el cliente también sube foto de perfil');
r = await call('registro', {
  tipo: 'trabajador',
  nombre: 'Beto Gómez',
  barrio: 'Centro',
  telefono: '2477000002',
  pin: '123456',
  acepto: 1,
  pregunta: '¿Cómo se llamaba tu primera mascota?',
  respuesta: 'Rocky Balboa',
});
const T = r.d.token;
r = await call('perfil', { nombre: 'Beto Gómez', barrio: 'Centro', rubros: [], bio: 'x' }, T);
ok(r.s === 400, 'trabajador sin rubros: se rechaza');
r = await call('perfil', { nombre: 'Beto Gómez', barrio: '', rubros: ['Pintura'], bio: 'x' }, T);
ok(r.s === 400, 'sin barrio: se rechaza');
await call('perfil', { nombre: 'Beto Gómez', barrio: 'Centro', rubros: ['Pintura'], bio: 'x' }, T);
r = await call('yo', null, T);
ok(r.d.falta.join() === 'foto', 'yo avisa que falta la foto');
r = await call('pedidos', { titulo: 'Pintar pared', rubro: 'Pintura', barrio: 'Centro', fotos: [JP, JP] }, C);
ok(r.s === 200, 'publicar con 2 fotos');
r = await call('pedidos/1/postular', { mensaje: 'hola' }, T);
ok(r.s === 403, 'trabajador sin foto no puede postularse');
r = await call('pedidos', null, T);
const it = r.d.items[0];
ok(/^\d+\.[0-9a-f]{16}$/.test(it.fotos.split(',')[0]), 'feed devuelve id.clave: ' + it.fotos);
const [f1] = it.fotos.split(',');
r = await call('foto/' + f1);
ok(r.s === 200 && r.ct === 'image/jpeg', 'foto con clave correcta');
r = await call('foto/' + f1.split('.')[0]);
ok(r.s === 404, 'foto solo por número -> 404');
r = await call('foto/' + f1.split('.')[0] + '.0000000000000000');
ok(r.s === 404, 'clave equivocada -> 404');
r = await call('perfil-foto', { foto: JP }, T);
ok(r.s === 200, 'foto de perfil');
r = await call('yo', null, T);
const fv = r.d.fv;
ok(/^[0-9a-f]{16}$/.test(fv), 'fv es la clave: ' + fv);
const wid = r.d.id;
r = await call('pfoto/' + wid + '?v=' + fv);
ok(r.s === 200, 'pfoto con v');
r = await call('pfoto/' + wid);
ok(r.s === 404, 'pfoto sin v 404');
r = await call('pfoto/' + wid + '?v=123');
ok(r.s === 404, 'pfoto v mala 404');
r = await call('trabajos-fotos', { foto: JP }, T);
r = await call('trabajadores/' + wid, null, C);
ok(/\./.test(r.d.fotos[0]), 'trabajos con clave: ' + r.d.fotos[0]);
r = await call('tfoto/' + r.d.fotos[0]);
ok(r.s === 200, 'tfoto ok');
r = await call('trabajos-fotos/borrar', { id: parseInt(r.s === 200 ? 1 : 0) }, T);
r = await call('trabajadores/' + wid, null, C);
ok(r.d.fotos.length === 0, 'borrar foto de trabajo');
// flujo hasta reseña con foto
r = await call('mis-pedidos', null, C);
const cid = r.d[0].id;
r = await call('pedidos/' + cid + '/postular', { mensaje: 'hola' }, T);
ok(r.s === 200, 'postular');
r = await call('mis-pedidos', null, C);
const pid = r.d[0].post[0].id;
ok(r.d[0].post[0].fv === fv, 'postulante trae fv');
await call('postulaciones/' + pid + '/elegir', {}, C);
await call('pedidos/' + cid + '/hecha', {}, C);
r = await call('pedidos/' + cid + '/puntuar', { estrellas: 5, comentario: 'bien', fotos: [JP] }, C);
ok(r.s === 200, 'puntuar con foto');
r = await call('trabajadores/' + wid, null, C);
const fo = r.d.resenas[0].fo;
ok(/^\d+\.[0-9a-f]{16}$/.test(fo), 'reseña con id.clave: ' + fo);
r = await call('rfoto/' + fo);
ok(r.s === 200, 'rfoto ok');
r = await call('locales', null, C);
ok(r.d.length === 0, 'locales cargados ocultos por defecto (activo=0)');
// gestión
r = await call('admin/ajustes', null, '', { 'x-admin-key': 'clave' });
ok(r.s === 200, 'gestión con clave buena');
let st = [];
for (let i = 0; i < 10; i++)
  st.push((await call('admin/ajustes', null, '', { 'x-admin-key': 'mala', 'cf-connecting-ip': '9.9.9.9' })).s);
ok(
  st.every((x) => x === 401),
  '10 intentos malos dan 401',
);
r = await call('admin/ajustes', null, '', { 'x-admin-key': 'mala', 'cf-connecting-ip': '9.9.9.9' });
ok(r.s === 429, 'el 11 se bloquea (429)');
r = await call('admin/ajustes', null, '', { 'x-admin-key': 'clave', 'cf-connecting-ip': '9.9.9.9' });
ok(r.s === 429, 'bloqueado aun con la clave buena (esa IP)');
r = await call('admin/ajustes', null, '', { 'x-admin-key': 'clave', 'cf-connecting-ip': '8.8.8.8' });
ok(r.s === 200, 'otra conexión no se afecta');
r = await call('admin/local-ocultar', { id: 1 }, '', { 'x-admin-key': 'clave', 'cf-connecting-ip': '8.8.8.8' });
r = await call('locales', null, C);
ok(r.d.length === 1, 'mostrar un local desde gestión');
// QR por local: atribución de visitas, registros y pedidos
const AD = { 'x-admin-key': 'clave', 'cf-connecting-ip': '8.8.8.8' };
r = await call('admin/locales', null, '', AD);
const L1 = r.d.find((x) => x.id === 1),
  L2 = r.d.find((x) => x.id === 2);
ok(
  r.d.every((x) => /^[0-9a-f]{6}$/.test(x.codigo)) && new Set(r.d.map((x) => x.codigo)).size === r.d.length,
  'todos los locales tienen código de QR único',
);
r = await call('origen', { c: L1.codigo });
ok(r.s === 200, 'visita por QR');
await call('origen', { c: L1.codigo });
await call('origen', { c: 'zzzzzz' });
await call('origen', { c: L2.codigo });
r = await call('admin/locales', null, '', AD);
ok(r.d.find((x) => x.id === 1).visitas === 2, 'cuenta 2 visitas del local 1');
ok(r.d.find((x) => x.id === 2).visitas === 0, 'un local oculto no suma visitas');
r = await call('registro', {
  tipo: 'cliente',
  nombre: 'Cami Soto',
  barrio: 'Centro',
  telefono: '2477000003',
  pin: '123456',
  acepto: 1,
  pregunta: '¿Cómo se llamaba tu primera mascota?',
  respuesta: 'Rocky Balboa',
  origen: L1.codigo,
});
const C3 = r.d.token;
await call('perfil-foto', { foto: JP }, C3);
await call('registro', {
  tipo: 'cliente',
  nombre: 'Dani Ruiz',
  barrio: 'Centro',
  telefono: '2477000004',
  pin: '123456',
  acepto: 1,
  pregunta: '¿Cómo se llamaba tu primera mascota?',
  respuesta: 'Rocky Balboa',
  origen: 'nada',
});
await call('pedidos', { titulo: 'Cambiar canilla', rubro: 'Plomería', barrio: 'Centro' }, C3);
r = await call('admin/locales', null, '', AD);
const X = r.d.find((x) => x.id === 1);
ok(X.registros === 1 && X.pedidos === 1, 'atribuye 1 registro y 1 pedido al local (código inválido no cuenta)');
r = await call('locales', null, C3);
ok(!JSON.stringify(r.d).includes(L1.codigo), 'la lista pública no muestra el código');
await call('admin/local-borrar', { id: 1 }, '', AD);
r = await call('admin/locales', null, '', AD);
ok(
  !r.d.some((x) => x.id === 1) &&
    db.prepare('SELECT COUNT(*) n FROM origen_dias WHERE local_id=1').get().n === 0 &&
    db.prepare('SELECT COUNT(*) n FROM usuarios WHERE origen=1').get().n === 0,
  'borrar un local limpia sus métricas',
);

// ---- Perfil verificado (opcional)
r = await call('verificacion', { dni: '12.345.678', direccion: 'Mitre 450', mail: 'ana@mail.com' }, C);
ok(r.s === 200 && r.d.ver === 1, 'DNI + dirección + mail = verificado');
r = await call('yo', null, C);
ok(r.d.ver === 1 && r.d.falta.length === 0, 'yo muestra ver=1 y perfil completo');
r = await call('verificacion', { dni: '123', direccion: 'Mitre 450', mail: 'ana@mail.com' }, C);
ok(r.s === 400, 'DNI inválido se rechaza');
r = await call('verificacion', { dni: '12345678', direccion: 'Mitre 450', mail: 'sin-arroba' }, C);
ok(r.s === 400, 'mail inválido se rechaza');
await call('verificacion', { dni: '12345678', direccion: '', mail: 'ana@mail.com' }, T);
r = await call('yo', null, T);
ok(r.d.ver === 0, 'con la dirección vacía no hay sello');
await call('verificacion', { dni: '33444555', direccion: 'Alsina 100', mail: 'beto@mail.com' }, T);
await call('perfil-foto', { foto: JP }, T);
r = await call('yo', null, T);
const wid2 = r.d.id;
r = await call('trabajadores/' + wid2, null, C);
ok(r.d.ver === 1, 'el perfil público del trabajador muestra el sello');
ok(!/33444555|beto@mail|Alsina 100/.test(JSON.stringify(r.d)), 'el perfil público no expone DNI, mail ni dirección');
r = await call('mis-pedidos', null, C);
ok(!/33444555/.test(JSON.stringify(r.d)), 'mis-pedidos no expone el DNI');
// ---- Sin precios ni cobros
r = await call('precios', null, C);
ok(r.s === 404, 'ya no existe la lista de precios');
r = await call('pagos/solicitar', { tipo: 'alertas' }, C);
ok(r.s === 404, 'ya no existe el pedido de pago');
r = await call('admin/pago-activar', { id: 1 }, '', AD);
ok(r.s === 404, 'Gestión ya no activa pagos');
r = await call('admin/ajuste', { clave: 'precio_destacado', valor: 2000 }, '', AD);
ok(r.s === 400, 'Gestión ya no tiene precios para ajustar');
await call('admin/ajuste', { clave: 'primera_gratis', valor: 0 }, '', AD); // acá las potenciaciones salen de las ganadas (promos); la primera gratis se prueba en v35
// ---- Alertas pagas vs avisos demorados 10 min
const mk = async (nom, tel, tipo, rub) => {
  let x = await call('registro', {
    tipo,
    nombre: nom + ' Díaz',
    barrio: 'Centro',
    telefono: tel,
    pin: '123456',
    acepto: 1,
    pregunta: '¿Cómo se llamaba tu primera mascota?',
    respuesta: 'Rocky Balboa',
  });
  const t = x.d.token;
  await call('perfil-foto', { foto: JP }, t);
  if (rub) await call('perfil', { nombre: nom + ' Díaz', barrio: 'Centro', rubros: [rub], bio: '' }, t);
  return t;
};
const WA = await mk('Wilo', '2477000011', 'trabajador', 'Plomería'),
  WB = await mk('Wanda', '2477000012', 'trabajador', 'Plomería'),
  CL = await mk('Clara', '2477000014', 'cliente');
const wa = (await call('yo', null, WA)).d.id,
  wb = (await call('yo', null, WB)).d.id;
r = await call('potenciar', { tipo: 'alertas' }, WA);
ok(r.s === 403, 'sin potenciaciones disponibles no se activa nada (y no se cobra)');
db.prepare('UPDATE usuarios SET promos=3 WHERE id=?').run(wa);
r = await call('potenciar', { tipo: 'alertas' }, CL);
ok(r.s === 403, 'un cliente no puede pedir alertas');
r = await call('potenciar', { tipo: 'alertas' }, WA);
ok(r.s === 200 && r.d.gratis === 1, 'con una potenciación ganada las alertas se activan al instante');
r = await call('yo', null, WA);
ok(r.d.alertas_act === 1 && Math.abs(r.d.alertas_hasta - Date.now() - 7 * 864e5) < 60000, 'alertas activas por 7 días');
ok(r.d.promos === 2 && r.d.alertas_pend === undefined, 'se gastó una potenciación y no hay nada pendiente de pago');
const hasta1 = r.d.alertas_hasta;
await call('potenciar', { tipo: 'alertas' }, WA);
r = await call('yo', null, WA);
ok(Math.abs(r.d.alertas_hasta - hasta1 - 7 * 864e5) < 1000, 'activar de nuevo suma 7 días desde el vencimiento');
r = await call('admin/pagos', null, '', AD);
ok(
  r.d.hist.length >= 2 && r.d.pend === undefined && r.d.hist.every((x) => x.precio === undefined),
  'Gestión ve el historial de potenciaciones, sin precios ni pendientes',
);
r = await call('pedidos', { titulo: 'Cambiar canilla del baño', rubro: 'Plomería', barrio: 'Centro' }, CL);
ok(r.s === 200, 'publicar pedido de Plomería');
await new Promise((z) => setTimeout(z, 50));
const av = (id) =>
  db.prepare('SELECT COUNT(*) n FROM avisos WHERE usuario_id=? AND texto LIKE ?').get(id, '%Cambiar canilla del baño')
    .n;
ok(av(wa) === 1 && av(wb) === 0, 'con alertas: aviso enseguida; sin alertas: todavía no');
const pc = db.prepare("SELECT id FROM pedidos WHERE titulo='Cambiar canilla del baño'").get().id;
await W.scheduled({}, env, ctx);
ok(av(wb) === 0, 'a los 5 minutos el que no pagó sigue sin aviso');
db.prepare('UPDATE pedidos SET aviso_en=? WHERE id=?').run(Date.now() - 1000, pc);
await W.scheduled({}, env, ctx);
ok(av(wb) === 1 && av(wa) === 1, 'pasados los 10 min le llega al que no pagó, sin repetir al que ya tenía');
ok(
  db.prepare('SELECT aviso_pend p FROM pedidos WHERE id=?').get(pc).p === 0,
  'el pedido deja de estar pendiente de avisos',
);
await W.scheduled({}, env, ctx);
ok(av(wb) === 1, 'el cron no manda avisos repetidos');
// ---- Trabajo destacado de 72 hs
const WC = await mk('Walter', '2477000013', 'trabajador', 'Plomería');
const wcid = (await call('yo', null, WC)).d.id;
r = await call('pedidos', { titulo: 'Destapar cañería', rubro: 'Plomería', barrio: 'Centro' }, CL);
await call('pedidos', { titulo: 'Pedido más nuevo', rubro: 'Plomería', barrio: 'Centro' }, CL);
const pd = db.prepare("SELECT id FROM pedidos WHERE titulo='Destapar cañería'").get().id;
r = await call('potenciar', { tipo: 'destacado', pedido_id: pd }, WA);
ok(r.s === 403, 'un trabajador no puede destacar pedidos');
r = await call('potenciar', { tipo: 'destacado', pedido_id: pd }, C);
ok(r.s === 403, 'no se puede destacar el pedido de otro');
const clid = (await call('yo', null, CL)).d.id;
r = await call('potenciar', { tipo: 'destacado', pedido_id: pd }, CL);
ok(r.s === 403, 'sin potenciaciones disponibles el destacado no se activa');
db.prepare('UPDATE usuarios SET promos=5 WHERE id=?').run(clid);
r = await call('potenciar', { tipo: 'destacado', pedido_id: pd }, CL);
ok(r.s === 200 && r.d.gratis === 1, 'destacar con una potenciación ganada: al instante y gratis');
r = await call('mis-pedidos', null, CL);
ok(r.d.find((x) => x.id === pd).dpend === undefined, 'mis-pedidos ya no trae pagos pendientes');
const avd = (id) =>
  db.prepare("SELECT COUNT(*) n FROM avisos WHERE usuario_id=? AND texto LIKE 'Pedido destacado%'").get(id).n;
await new Promise((z) => setTimeout(z, 50));
r = await call('pedidos', null, WC);
ok(r.d.items[0].id === pd && r.d.items[0].dest === 1, 'el destacado sale primero aunque no sea el más nuevo');
ok(r.d.items.filter((x) => x.dest).length === 1, 'solo uno marcado como destacado');
const dh = db.prepare('SELECT dest_hasta h FROM pedidos WHERE id=?').get(pd).h;
ok(Math.abs(dh - Date.now() - 72 * 3600e3) < 60000, 'dura 72 horas');
ok(
  avd(wcid) === 1 && avd(wb) === 1 && avd(wa) === 0,
  'el destacado avisa enseguida a todos los del rubro que no sabían, sin repetirle a quien ya tenía el aviso',
);
r = await call('pedidos', null, WC);
ok(r.d.items[0].cn === 'Clara' && r.d.items[0].ver === 0, 'la tarjeta trae quién publica y si está verificado');
await call('potenciar', { tipo: 'destacado', pedido_id: pd }, CL);
ok(
  Math.abs(db.prepare('SELECT dest_hasta h FROM pedidos WHERE id=?').get(pd).h - dh - 72 * 3600e3) < 1000,
  'destacar de nuevo suma 72 horas',
);
db.prepare('UPDATE pedidos SET dest_hasta=? WHERE id=?').run(Date.now() - 1000, pd);
r = await call('pedidos', null, WC);
ok(
  !(r.d.items.find((x) => x.id === pd) || {}).dest && !r.d.items.some((x) => x.dest),
  'vencidas las 72 hs vuelve al orden normal solo (ya no figura como destacado)',
);
await call('pedidos/' + pd + '/cancelar', {}, CL);
const promosAntes = db.prepare('SELECT promos p FROM usuarios WHERE id=?').get(clid).p;
r = await call('potenciar', { tipo: 'destacado', pedido_id: pd }, CL);
ok(r.s === 400, 'un pedido cancelado no se puede destacar');
ok(db.prepare('SELECT promos p FROM usuarios WHERE id=?').get(clid).p === promosAntes, 'y no se gasta la potenciación');
// ---- v32: números de la zona, búsqueda y orden de pedidos, directorio, invitaciones y tablero de Gestión
console.log('--- v32');
r = await W.fetch(new Request('https://x/api/zona', { headers: { 'cf-connecting-ip': '3.3.3.3' } }), env, ctx);
const zn = await r.json();
ok(r.status === 200 && r.headers.get('cache-control') === 'public,max-age=60', 'zona: pública y con caché de 60 s');
ok(
  Number.isInteger(zn.pedidos) &&
    Number.isInteger(zn.trabajadores) &&
    Number.isInteger(zn.hechos) &&
    Object.keys(zn).length === 3,
  'zona: solo tres cantidades, sin datos de nadie',
);
ok(
  zn.trabajadores ===
    db
      .prepare(
        "SELECT COUNT(*) n FROM usuarios WHERE tipo='trabajador' AND rubros!='[]' AND id IN (SELECT usuario_id FROM perfil_fotos)",
      )
      .get().n,
  'zona: cuenta solo trabajadores con foto y rubros',
);
ok(
  zn.pedidos === db.prepare("SELECT COUNT(*) n FROM pedidos WHERE estado='abierta' AND vence>?").get(Date.now()).n,
  'zona: cuenta solo pedidos abiertos vigentes',
);
// Búsqueda y orden
const CV = await mk('Valeria', '2477000031', 'cliente'),
  TV = await mk('Tomás', '2477000032', 'trabajador', 'Albañilería');
await call(
  'pedidos',
  { titulo: 'Revocar tapial del fondo', rubro: 'Albañilería', barrio: 'Centro', descripcion: 'Tapial de 6 metros' },
  CV,
);
await call(
  'pedidos',
  { titulo: 'Pintar zócalos 100% blancos', rubro: 'Pintura', barrio: 'Centro', descripcion: 'Con látex' },
  CV,
);
r = await call('pedidos?q=tapial', null, TV);
ok(
  r.d.items.length >= 1 && r.d.items.every((x) => /tapial/i.test(x.titulo + ' ' + x.descripcion)),
  'buscar por texto encuentra por título o detalle',
);
r = await call('pedidos?q=' + encodeURIComponent('CON LÁTEX'), null, TV);
ok(r.d.items.length === 1 && r.d.items[0].titulo.startsWith('Pintar zócalos'), 'la búsqueda no distingue mayúsculas');
r = await call('pedidos?q=100%25', null, TV);
ok(r.s === 200 && r.d.items.length === 1, 'el % se busca como texto, no como comodín');
r = await call('pedidos?q=%25', null, TV);
ok(r.d.items.length === 1, 'un % solo no trae todo');
r = await call("pedidos?q='%20OR%201=1--", null, TV);
ok(r.s === 200 && r.d.items.length === 0, 'texto raro no rompe ni inyecta SQL');
r = await call('pedidos?q=zzzzqq', null, TV);
ok(r.d.tot === 0 && r.d.items.length === 0, 'sin coincidencias: total 0');
r = await call('pedidos?o=vence', null, TV);
const ven = r.d.items.map((x) => x.id);
ok(r.s === 200 && ven.length > 2, 'orden por vencimiento responde');
db.prepare("UPDATE pedidos SET vence=vence-1000 WHERE titulo='Pintar zócalos 100% blancos'").run();
r = await call('pedidos?o=vence', null, TV);
ok(r.d.items[0].titulo === 'Pintar zócalos 100% blancos', 'por vencer: sale primero el que vence antes');
r = await call('pedidos?o=pocos', null, TV);
ok(
  r.s === 200 && r.d.items.every((x, i, a) => !i || a[i - 1].n <= x.n || x.dest),
  'menos postulantes: orden ascendente',
);
r = await call('pedidos?o=inventado', null, TV);
ok(r.s === 200, 'un orden inválido cae al orden normal');
// Directorio
r = await call('directorio', null, TV);
ok(r.s === 403, 'el directorio es solo para clientes');
r = await call('directorio', null, CV);
ok(r.s === 200 && r.d.tot >= 4 && r.d.items.length === r.d.tot, 'directorio lista trabajadores con foto y rubros');
const w0 = r.d.items[0];
ok(
  !('telefono' in w0) && !('dni' in w0) && !('mail' in w0) && !('direccion' in w0) && !('pin_hash' in w0),
  'directorio no filtra teléfono ni datos privados',
);
ok(
  r.d.items.every((x) => /^[0-9a-f]{16}$/.test(x.fv)),
  'directorio: todos con foto',
);
r = await call('directorio?rubro=Albañilería', null, CV);
ok(
  r.d.items.length >= 1 && r.d.items.every((x) => JSON.parse(x.rubros).includes('Albañilería')),
  'directorio filtra por rubro',
);
r = await call('directorio?rubro=Albañilería&barrio=Otro', null, CV);
ok(r.d.tot === 0, 'directorio filtra por barrio');
r = await call('directorio?q=tom', null, CV);
ok(r.d.items.length === 1 && r.d.items[0].nombre === 'Tomás Díaz', 'directorio busca por nombre');
r = await call('directorio?q=%25', null, CV);
ok(r.d.tot === 0, 'en el directorio el % tampoco es comodín');
const tvid = (await call('yo', null, TV)).d.id;
await call('verificacion', { dni: '30111222', direccion: 'Calle 1 123', mail: 't@x.com' }, TV);
r = await call('directorio?ver=1', null, CV);
console.log('   verificados en el directorio:', r.d.items.map((x) => x.nombre).join(', '));
ok(
  r.d.items.length >= 1 && r.d.items.every((x) => x.ver === 1) && r.d.items.some((x) => x.id === tvid),
  'directorio: solo verificados',
);
r = await call('directorio', null, CV);
ok(
  r.d.items.some((x) => x.ver === 0),
  'sin el filtro también salen los no verificados',
);
// puntaje: darle 5 estrellas a Tomás con un pedido hecho
await call('pedidos', { titulo: 'Levantar pared', rubro: 'Albañilería', barrio: 'Centro' }, CV);
const pv = db.prepare("SELECT id FROM pedidos WHERE titulo='Levantar pared'").get().id;
await call('pedidos/' + pv + '/postular', { mensaje: 'va' }, TV);
const sv0 = db.prepare('SELECT id FROM postulaciones WHERE pedido_id=?').get(pv).id;
await call('postulaciones/' + sv0 + '/elegir', {}, CV);
await call('pedidos/' + pv + '/hecha', {}, CV);
r = await call('pedidos/' + pv + '/puntuar', { estrellas: 5, comentario: 'Excelente' }, CV);
ok(r.s === 200, 'reseña de 5 estrellas');
r = await call('directorio?min=4.5', null, CV);
console.log('   con 4,5 o más:', r.d.items.map((x) => x.nombre + ' ' + x.prom).join(', '));
ok(
  r.d.items.length >= 1 && r.d.items.every((x) => x.prom >= 4.5) && r.d.items.some((x) => x.id === tvid),
  'directorio: puntaje mínimo 4,5',
);
const n45 = r.d.tot;
r = await call('directorio?min=4', null, CV);
ok(r.d.items.every((x) => x.prom >= 4) && r.d.tot >= n45, 'directorio: puntaje mínimo 4');
r = await call('directorio?min=4.5&ver=1&rubro=Albañilería', null, CV);
ok(r.d.items.length === 1 && r.d.items[0].id === tvid, 'directorio: filtros combinados');
r = await call('directorio', null, CV);
ok(r.d.items[0].id === tvid, 'directorio ordena primero por mejor puntaje');
r = await call('directorio?o=nuevos', null, CV);
ok(r.d.items[0].id > r.d.items[r.d.items.length - 1].id, 'directorio: orden por nuevos');
await call('admin/suspender', { telefono: '2477000032', on: 1 }, '', AD);
r = await call('directorio?q=tom', null, CV);
ok(r.d.tot === 0, 'un trabajador suspendido no aparece en el directorio');
await call('admin/suspender', { telefono: '2477000032', on: 0 }, '', AD);
// Invitaciones
const WI = await mk('Ivana', '2477000033', 'trabajador', 'Pintura');
const wiid = (await call('yo', null, WI)).d.id;
await call('pedidos', { titulo: 'Pintar portón', rubro: 'Pintura', barrio: 'Centro' }, CV);
const pi = db.prepare("SELECT id FROM pedidos WHERE titulo='Pintar portón'").get().id;
r = await call('invitar', { trabajador_id: wiid, pedido_id: pi }, WI);
ok(r.s === 403, 'un trabajador no puede invitar');
r = await call('invitar', { trabajador_id: wiid, pedido_id: pi }, C);
ok(r.s === 403, 'no se puede invitar a un pedido ajeno');
r = await call('invitar', { trabajador_id: 9999, pedido_id: pi }, CV);
ok(r.s === 400, 'trabajador inexistente');
r = await call('invitar', { trabajador_id: wiid, pedido_id: pi }, CV);
ok(r.s === 200, 'el cliente invita');
await new Promise((z) => setTimeout(z, 50));
ok(
  db
    .prepare(
      "SELECT COUNT(*) n FROM avisos WHERE usuario_id=? AND texto LIKE '%te invitó a postularte a «Pintar portón»%'",
    )
    .get(wiid).n === 1,
  'el trabajador recibe el aviso con el nombre del pedido',
);
r = await call('invitar', { trabajador_id: wiid, pedido_id: pi }, CV);
ok(r.s === 400 && /Ya lo invitaste/.test(r.d.error), 'no se invita dos veces al mismo pedido');
r = await call('pedidos?q=portón', null, WI);
ok(r.d.items[0].inv === 1, 'en el feed del invitado el pedido viene marcado');
r = await call('pedidos', null, WI);
ok(r.d.items[0].inv === 1 || r.d.items[0].dest === 1, 'el pedido al que te invitaron sale arriba');
r = await call('mis-pedidos', null, CV);
ok(r.d.find((x) => x.id === pi).ninv === 1, 'mis-pedidos cuenta las invitaciones');
await call('pedidos/' + pi + '/postular', { mensaje: 'sí' }, WI);
r = await call('invitar', { trabajador_id: wiid, pedido_id: pi }, CV);
ok(r.s === 400, 'no se invita a quien ya se postuló');
// invitado fuera de sus rubros no gasta el cupo diario
await call('pedidos', { titulo: 'Arreglar techo', rubro: 'Albañilería', barrio: 'Centro' }, CV);
const pt = db.prepare("SELECT id FROM pedidos WHERE titulo='Arreglar techo'").get().id;
await call('invitar', { trabajador_id: wiid, pedido_id: pt }, CV);
const ot0 = db.prepare('SELECT COUNT(*) n FROM limites WHERE clave=?').get('otros:' + wiid).n;
r = await call('pedidos/' + pt + '/postular', { mensaje: 'puedo' }, WI);
ok(
  r.s === 200 && db.prepare('SELECT COUNT(*) n FROM limites WHERE clave=?').get('otros:' + wiid).n === ot0,
  'postularse a una invitación fuera de tus rubros no gasta el cupo',
);
// tope de 10 invitaciones por día
const CI = await mk('Ines', '2477000034', 'cliente');
let okI = 0,
  e429 = 0;
for (let i = 0; i < 12; i++) {
  const w = await mk('Obrero' + i, '24770005' + String(i).padStart(2, '0'), 'trabajador', 'Pintura');
  await call('pedidos', { titulo: 'Pedido inv ' + i, rubro: 'Pintura', barrio: 'Centro' }, i < 4 ? CI : CI).then(
    () => {},
  );
}
const pids = db.prepare("SELECT id FROM pedidos WHERE titulo LIKE 'Pedido inv %' ORDER BY id").all(),
  obr = db.prepare("SELECT id FROM usuarios WHERE nombre LIKE 'Obrero%' ORDER BY id").all();
for (let i = 0; i < 12; i++) {
  const x = await call('invitar', { trabajador_id: obr[i].id, pedido_id: pids[0].id }, CI);
  if (x.s === 200) okI++;
  if (x.s === 429) e429++;
}
ok(okI === 10 && e429 === 2, 'máximo 10 invitaciones por día (llegaron ' + okI + ', bloqueó ' + e429 + ')');
await call('pedidos/' + pi + '/cancelar', {}, CV);
// Gestión: tablero
r = await call('admin/inicio', null, '', AD);
const T0 = r.d;
ok(
  r.s === 200 && T0.usuarios.tot === db.prepare('SELECT COUNT(*) n FROM usuarios').get().n,
  'tablero: cuenta usuarios',
);
ok(
  T0.usuarios.trab + T0.usuarios.cli === T0.usuarios.tot && T0.usuarios.h24 === T0.usuarios.tot,
  'tablero: usuarios nuevos en 24 h y por tipo',
);
ok(
  T0.pedidos.tot === db.prepare('SELECT COUNT(*) n FROM pedidos').get().n &&
    T0.pedidos.abiertos > 0 &&
    T0.pedidos.hechos >= 1,
  'tablero: pedidos totales, abiertos y hechos',
);
ok(T0.post.tot === db.prepare('SELECT COUNT(*) n FROM postulaciones').get().n, 'tablero: postulaciones');
ok(T0.ing === undefined && T0.pend === undefined, 'tablero: ya no hay ingresos ni pagos pendientes');
ok(
  typeof T0.denuncias === 'number' &&
    typeof T0.activos.alertas === 'number' &&
    typeof T0.activos.destacados === 'number',
  'tablero: denuncias y activos ahora',
);
// el contador de Gestión ya no tiene pagos pendientes
r = await call('admin/pend', null, '', AD);
ok(r.s === 200 && r.d.n === 0 && typeof r.d.den === 'number', 'contador: sin pagos pendientes, solo denuncias');
// QR
db.prepare('UPDATE locales SET activo=1 WHERE id=(SELECT MIN(id) FROM locales)').run();
await call('admin/locales', null, '', AD);
const lq = db.prepare("SELECT id,codigo FROM locales WHERE activo=1 AND codigo!='' LIMIT 1").get();
await call('origen', { c: lq.codigo }, '', { 'cf-connecting-ip': '5.5.5.5' });
await call('origen', { c: lq.codigo }, '', { 'cf-connecting-ip': '5.5.5.6' });
let rg = await W.fetch(
  new Request('https://x/api/registro', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'cf-connecting-ip': '7.7.7.7' },
    body: JSON.stringify({
      tipo: 'cliente',
      nombre: 'Por QR',
      barrio: 'Centro',
      telefono: '2477000099',
      pin: '123456',
      acepto: 1,
      pregunta: '¿Cómo se llamaba tu primera mascota?',
      respuesta: 'Rocky Balboa',
      origen: lq.codigo,
    }),
  }),
  env,
  ctx,
);
r = await call('admin/inicio', null, '', AD);
const q1 = r.d.qr.items.find((x) => x.id === lq.id);
ok(q1 && q1.visitas === 2 && q1.v7 === 2 && q1.registros === 1, 'tablero: rendimiento del QR (2 visitas, 1 registro)');
ok(
  r.d.qr.activos === r.d.qr.items.length && r.d.qr.visitas >= 2 && r.d.qr.locales >= 50,
  'tablero: totales de QR y locales con movimiento',
);
r = await W.fetch(
  new Request('https://x/api/admin/inicio', { headers: { 'x-admin-key': 'mala', 'cf-connecting-ip': '4.4.4.4' } }),
  env,
  ctx,
);
ok(r.status === 401, 'el tablero pide la clave de Gestión');
ok(
  db.prepare('SELECT COUNT(*) n FROM invitaciones WHERE pedido_id=?').get(pi).n === 1,
  'antes del cron diario la invitación sigue guardada',
);
{
  const real = Date.now,
    t = new Date();
  t.setUTCHours(13, 2, 0, 0);
  const off = t.getTime() - real();
  Date.now = () => real() + off;
  await W.scheduled({}, env, ctx);
  Date.now = real;
}
ok(
  db.prepare('SELECT COUNT(*) n FROM invitaciones WHERE pedido_id=?').get(pi).n === 0,
  'el cron diario borra las invitaciones de pedidos que ya no están abiertos',
);
ok(
  db.prepare('SELECT COUNT(*) n FROM invitaciones WHERE pedido_id=?').get(pt).n === 1,
  'y no toca las de pedidos que siguen abiertos',
);
// ---- Denuncias en su propia pestaña
console.log('--- denuncias');
const dn0 = db.prepare("SELECT COUNT(*) n FROM denuncias WHERE estado='abierta'").get().n;
await call('denunciar', { tipo: 'pedido', id: pt, motivo: 'Pide plata adelantada' }, WI);
await call('denunciar', { tipo: 'pedido', id: pt, motivo: 'Otro aviso igual' }, TV);
await call('denunciar', { tipo: 'usuario', id: tvid, motivo: 'Mala educación' }, CV);
r = await call('admin/denuncias', null, '', AD);
const DD = r.d;
ok(
  r.s === 200 && DD.abiertas === dn0 + 3 && DD.items.filter((x) => x.estado === 'abierta').length === DD.abiertas,
  'denuncias: lista y cuenta las abiertas',
);
const dp = DD.items.find((x) => x.tipo === 'pedido' && x.objetivo_id === pt);
ok(
  dp.veces === 2 && dp.p_titulo === 'Arreglar techo' && dp.p_cliente === 'Valeria Díaz' && dp.autor && dp.autor_tel,
  'denuncia de pedido: título, dueño, quién denunció y cuántas veces',
);
const du = DD.items.find((x) => x.tipo === 'usuario' && x.objetivo_id === tvid);
ok(
  du.u_nombre === 'Tomás Díaz' &&
    du.u_tel === '2477000032' &&
    du.u_tipo === 'trabajador' &&
    du.autor === 'Valeria Díaz',
  'denuncia de persona: a quién y quién',
);
ok(
  DD.items.slice(0, DD.abiertas).every((x) => x.estado === 'abierta'),
  'las abiertas van primero',
);
r = await call('admin/pend', null, '', AD);
ok(r.d.den === DD.abiertas, 'el contador de pagos también trae las denuncias abiertas');
r = await call('admin/inicio', null, '', AD);
ok(r.d.denuncias === DD.abiertas, 'el tablero cuenta las mismas denuncias');
await call('admin/cerrar-denuncia', { id: du.id }, '', AD);
r = await call('admin/denuncias', null, '', AD);
ok(
  r.d.abiertas === DD.abiertas - 1 && r.d.items.find((x) => x.id === du.id).estado === 'cerrada',
  'cerrar una denuncia baja el contador y la deja en cerradas',
);
r = await W.fetch(
  new Request('https://x/api/admin/denuncias', { headers: { 'x-admin-key': 'mala', 'cf-connecting-ip': '4.4.4.5' } }),
  env,
  ctx,
);
ok(r.status === 401, 'denuncias pide la clave de Gestión');
// ---------- v34: Gestión sin topes, moderación, destacados y propuestas ----------
console.log('--- v34 gestión');
const ins = (t, o) =>
  Number(
    db
      .prepare(
        'INSERT INTO ' +
          t +
          '(' +
          Object.keys(o).join(',') +
          ') VALUES(' +
          Object.keys(o)
            .map(() => '?')
            .join(',') +
          ')',
      )
      .run(...Object.values(o)).lastInsertRowid,
  );
const NOW = Date.now(),
  wait = (ms) => new Promise((z) => setTimeout(z, ms));
const mkU = (tipo, nombre, tel) =>
  ins('usuarios', { tipo, nombre, telefono: tel, pin_hash: 'x', rec_hash: 'x', barrio: 'Centro', creado: NOW });
// paginación y búsqueda de usuarios
for (let i = 0; i < 130; i++)
  mkU('cliente', 'Paginado ' + String(i).padStart(3, '0'), '25550' + String(i).padStart(5, '0'));
const nCli = db.prepare("SELECT COUNT(*) n FROM usuarios WHERE tipo='cliente'").get().n;
r = await call('admin/clientes', null, '', AD);
ok(r.d.length === 100, 'clientes: la primera página trae 100 (antes el tope era 300 sin forma de seguir)');
const cu = (l) => '&c=' + encodeURIComponent(JSON.stringify(l[l.length - 1].id)),
  pg1 = r.d;
let r2 = await call('admin/clientes?x=1' + cu(r.d), null, '', AD);
ok(
  r2.d.length === nCli - 100 && !r2.d.some((x) => r.d.some((y) => y.id === x.id)),
  'clientes: la segunda página trae el resto sin repetir',
);
r = await call('admin/clientes?q=Paginado 129', null, '', AD);
ok(
  r.d.length === 1 && r.d[0].nombre === 'Paginado 129',
  'la búsqueda encuentra a alguien que está en la segunda página',
);
r = await call('admin/clientes?q=%25', null, '', AD);
ok(r.d.length === 0, 'un % en la búsqueda se toma como texto, no como comodín');
r = await call('admin/trabajadores', null, '', AD);
ok(r.s === 200 && Array.isArray(r.d), 'trabajadores acepta paginación');
r = await call('admin/locales', null, '', AD);
const totL = db.prepare('SELECT COUNT(*) n FROM locales').get().n,
  l50 = r.d[49];
r2 = await call('admin/locales?c=' + encodeURIComponent(JSON.stringify([l50.rubro, l50.nombre, l50.id])), null, '', AD);
ok(
  r.d.length === Math.min(100, totL) &&
    r2.d.length === Math.max(0, Math.min(100, totL) - 50) &&
    !r2.d.some((x) => r.d.slice(0, 50).some((y) => y.id === x.id)),
  'locales: el cursor [rubro,nombre,id] sigue donde quedó (sin repetir)',
);
r = await call('admin/locales?q=zzzzzz', null, '', AD);
ok(r.d.length === 0, 'locales busca en todos');
// pagos: historial paginado
const uP = mkU('trabajador', 'Pagador', '25559999999');
for (let i = 0; i < 60; i++)
  ins('activaciones', { usuario_id: uP, tipo: 'alertas', precio: 2000, estado: 'rechazada', creado: NOW - i });
r = await call('admin/pagos', null, '', AD);
const hp = r.d.hist.length;
ok(hp === 50, 'potenciaciones: el historial trae 50 (antes 40 y no había más)');
r2 = await call('admin/pagos?x=1' + cu(r.d.hist), null, '', AD);
ok(
  r2.d.hist.length >= 10 && !r2.d.hist.some((x) => r.d.hist.some((y) => y.id === x.id)),
  'potenciaciones: la segunda página no repite',
);
r = await call('admin/pagos?q=Pagador', null, '', AD);
ok(
  r.d.hist.length === 50 && r.d.hist.every((x) => x.nombre === 'Pagador'),
  'pagos: busca por nombre en todo el historial',
);
// el cursor no se descuadra cuando entran registros nuevos mientras se pagina (con OFFSET se repetían)
{
  const a1 = (await call('admin/clientes', null, '', AD)).d;
  for (let i = 0; i < 7; i++) mkU('cliente', 'Llegó durante la paginación ' + i, '25553' + String(i).padStart(6, '0'));
  const a2 = (await call('admin/clientes?x=1' + cu(a1), null, '', AD)).d;
  ok(
    a2.length > 0 && !a2.some((x) => a1.some((y) => y.id === x.id)),
    'cursor: entran 7 clientes nuevos entre páginas y la segunda no repite ninguno',
  );
  ok(
    a2.every((x) => x.id < a1[a1.length - 1].id),
    'cursor: la segunda página trae solo registros más viejos que el último visto',
  );
}
for (const bad of ['abc', '[1]', '{"a":1}', '-5', '"x\' OR 1=1 --"', 'null'])
  ok(
    (await call('admin/clientes?c=' + encodeURIComponent(bad), null, '', AD)).s === 200,
    'un cursor inválido (' + bad + ') se ignora, no rompe ni inyecta',
  );
// fotos de perfil: cursor [fecha,id]
for (let i = 0; i < 60; i++) {
  const uu = mkU('trabajador', 'Foto perfil ' + i, '25552' + String(i).padStart(6, '0'));
  ins('perfil_fotos', { usuario_id: uu, img: 'AA==', actualizado: NOW - i * 1000, k: 'f' + i });
}
{
  const f1 = (await call('admin/fotos?t=perfil', null, '', AD)).d,
    l = f1[f1.length - 1],
    f2 = (await call('admin/fotos?t=perfil&c=' + encodeURIComponent(JSON.stringify([l.creado, l.id])), null, '', AD)).d;
  ok(
    f1.length === 48 && f2.length > 0 && !f2.some((x) => f1.some((y) => y.id === x.id)),
    'fotos de perfil: la segunda página (cursor [fecha,id]) no repite',
  );
  ok(f2[0].creado <= l.creado, 'fotos de perfil: sigue en orden de fecha');
}
// Ofertas con todos los estados
const cM = mkU('cliente', 'Dueña de pedidos', '25558888888');
const mkP = (titulo, estado, vence, extra = {}) =>
  ins('pedidos', { cliente_id: cM, titulo, rubro: 'Pintura', barrio: 'Centro', estado, vence, creado: NOW, ...extra });
const pH = mkP('Hecho 1', 'hecha', NOW + 864e5),
  pV = mkP('Vencido marcado', 'vencida', NOW - 864e5),
  pC = mkP('Cancelado 1', 'cancelada', NOW + 864e5),
  pE = mkP('En marcha 1', 'elegida', NOW + 864e5),
  pA = mkP('Abierto 1', 'abierta', NOW + 864e5),
  pVS = mkP('Vencido sin marcar', 'abierta', NOW - 1000);
r = await call('admin/pedidos?e=hecha', null, '', AD);
ok(
  r.d.pedidos.some((x) => x.id === pH) && r.d.pedidos.every((x) => x.estado === 'hecha'),
  'Ofertas: se ven los hechos',
);
r = await call('admin/pedidos?e=cancelada', null, '', AD);
ok(
  r.d.pedidos.some((x) => x.id === pC) && r.d.pedidos.every((x) => x.estado === 'cancelada'),
  'Ofertas: se ven los cancelados',
);
r = await call('admin/pedidos?e=vencida', null, '', AD);
ok(
  r.d.pedidos.some((x) => x.id === pV) &&
    r.d.pedidos.some((x) => x.id === pVS) &&
    r.d.pedidos.every((x) => x.estado === 'vencida'),
  'Ofertas: vencidos, incluso uno abierto con fecha pasada que el cron todavía no marcó',
);
r = await call('admin/pedidos?e=abierta', null, '', AD);
ok(
  r.d.pedidos.some((x) => x.id === pA) && !r.d.pedidos.some((x) => x.id === pVS),
  'Ofertas: "abiertos" no mezcla los que ya vencieron',
);
r = await call('admin/pedidos?e=elegida', null, '', AD);
ok(
  r.d.pedidos.some((x) => x.id === pE),
  'Ofertas: en marcha',
);
r = await call('admin/pedidos', null, '', AD);
ok(
  [pH, pV, pC, pE, pA, pVS].every((i) => r.d.pedidos.some((x) => x.id === i)),
  'Ofertas: sin filtro trae todos los estados',
);
r = await call('admin/pedidos?e=cualquiera', null, '', AD);
ok(r.s === 200 && r.d.pedidos.length >= 6, 'un estado inválido se ignora (no rompe ni inyecta)');
r = await call('admin/pedidos?q=Dueña', null, '', AD);
ok(r.d.pedidos.length === 6, 'Ofertas: busca por cliente en todos');
for (let i = 0; i < 110; i++) mkP('Relleno ' + i, 'hecha', NOW);
r = await call('admin/pedidos', null, '', AD);
ok(r.d.pedidos.length === 100, 'Ofertas: pagina de a 100 (antes el tope era 200 fijo)');
r2 = await call('admin/pedidos?x=1' + cu(r.d.pedidos), null, '', AD);
ok(
  r2.d.pedidos.length > 0 && !r2.d.pedidos.some((x) => r.d.pedidos.some((y) => y.id === x.id)),
  'Ofertas: segunda página sin repetidos',
);
// propuestas de un pedido
const tA = mkU('trabajador', 'Prop Uno', '25557000001'),
  tB = mkU('trabajador', 'Prop Dos', '25557000002');
ins('postulaciones', { pedido_id: pE, trabajador_id: tA, mensaje: 'Puedo mañana', estado: 'elegida', creado: NOW });
ins('postulaciones', {
  pedido_id: pE,
  trabajador_id: tB,
  mensaje: 'Yo también',
  estado: 'descartada',
  creado: NOW + 1,
});
r = await call('admin/propuestas?pedido=' + pE, null, '', AD);
ok(
  r.s === 200 &&
    r.d.items.length === 2 &&
    r.d.items[0].mensaje === 'Puedo mañana' &&
    r.d.items.some((x) => x.estado === 'descartada'),
  'propuestas: se ven todas, también las descartadas, con mensaje y teléfono',
);
ok(
  r.d.items.every((x) => x.telefono && x.nombre) && r.d.pedido.cliente === 'Dueña de pedidos',
  'propuestas: trae quién la hizo y de qué pedido es',
);
r = await call('admin/pedidos?e=elegida', null, '', AD);
const pe1 = r.d.pedidos.find((x) => x.id === pE);
ok(
  pe1.props === 2 && pe1.post === 0,
  'Ofertas: cuenta 2 propuestas en total (la elegida y la descartada no son "activas")',
);
r = await call('admin/propuestas?pedido=999999', null, '', AD);
ok(r.s === 404, 'propuestas: pedido que no existe → 404');
// destacados activos
db.prepare('UPDATE pedidos SET dest_desde=?,dest_hasta=? WHERE id=?').run(NOW - 1000, NOW + 36e5, pA);
const aD = ins('activaciones', {
  usuario_id: cM,
  tipo: 'destacado',
  pedido_id: pA,
  precio: 2000,
  estado: 'activa',
  creado: NOW,
  activada_en: NOW,
  vence: NOW + 36e5,
});
r = await call('admin/destacados', null, '', AD);
ok(
  r.d.length === 1 && r.d[0].id === pA && r.d[0].cliente === 'Dueña de pedidos',
  'destacados: se ve el destacado activo',
);
r = await call('admin/pedidos?e=dest', null, '', AD);
ok(r.d.pedidos.length === 1 && r.d.pedidos[0].id === pA, 'Ofertas: filtro "destacados"');
r = await call('admin/quitar-destacado', { id: pA }, '', AD);
ok(r.s === 200, 'se puede sacar un destacado');
await wait(30);
r = await call('admin/destacados', null, '', AD);
ok(r.d.length === 0, 'destacados: ya no aparece');
const pa = db.prepare('SELECT dest_desde,dest_hasta FROM pedidos WHERE id=?').get(pA);
ok(pa.dest_hasta === 0 && pa.dest_desde === 0, 'el pedido queda sin destacado');
ok(
  db.prepare('SELECT vence FROM activaciones WHERE id=?').get(aD).vence <= Date.now(),
  'el pago queda en el historial con vencimiento ahora',
);
ok(
  db.prepare("SELECT COUNT(*) n FROM avisos WHERE usuario_id=? AND texto LIKE 'Sacamos el destacado%'").get(cM).n === 1,
  'se le avisa al cliente',
);
ok(
  db.prepare("SELECT COUNT(*) n FROM logs WHERE tipo='admin' AND detalle='Destacado quitado: #" + pA + "'").get().n ===
    1,
  'queda en el registro de actividad',
);
r = await call('admin/quitar-destacado', { id: pA }, '', AD);
ok(r.s === 400, 'sacar un destacado que ya no está → 400');
// moderación de reseñas
const sR = ins('puntuaciones', {
  pedido_id: pH,
  trabajador_id: tA,
  cliente_id: cM,
  estrellas: 1,
  comentario: 'Ofensivo',
  creado: NOW,
});
const sR2 = ins('puntuaciones', {
  pedido_id: pE,
  trabajador_id: tA,
  cliente_id: cM,
  estrellas: 5,
  comentario: 'Bien',
  creado: NOW,
});
const rf = ins('resena_fotos', { puntuacion_id: sR, img: 'AA==', k: 'abc123' });
r = await call('admin/resenas', null, '', AD);
const rs1 = r.d.find((x) => x.id === sR);
ok(
  rs1 &&
    rs1.comentario === 'Ofensivo' &&
    rs1.trabajador === 'Prop Uno' &&
    rs1.cliente === 'Dueña de pedidos' &&
    rs1.fotos === rf + '.abc123',
  'reseñas: se ven con comentario, quién y fotos',
);
r = await call('admin/resenas?q=ofens', null, '', AD);
ok(r.d.length === 1 && r.d[0].id === sR, 'reseñas: búsqueda por comentario');
ok((await call('rfoto/' + rf + '.abc123')).s === 200, 'la foto de la reseña se ve antes de moderar');
r = await call('admin/resena-quitar', { id: sR }, '', AD);
ok(r.s === 200, 'quitar comentario y fotos');
const q1b = db.prepare('SELECT estrellas,comentario FROM puntuaciones WHERE id=?').get(sR);
ok(q1b.estrellas === 1 && q1b.comentario === '', 'queda el puntaje y se borra el comentario');
ok(
  db.prepare('SELECT COUNT(*) n FROM resena_fotos WHERE puntuacion_id=?').get(sR).n === 0 &&
    (await call('rfoto/' + rf + '.abc123')).s === 404,
  'se borran las fotos de la reseña',
);
r = await call('admin/resena-borrar', { id: sR2 }, '', AD);
ok(r.s === 200 && !db.prepare('SELECT 1 x FROM puntuaciones WHERE id=?').get(sR2), 'borrar la reseña entera');
await wait(30);
ok(
  db.prepare("SELECT COUNT(*) n FROM avisos WHERE usuario_id=? AND texto LIKE '%reseña%'").get(cM).n === 2,
  'se le avisa al cliente en los dos casos',
);
r = await call('admin/resena-borrar', { id: sR2 }, '', AD);
ok(r.s === 400, 'borrar una reseña que ya no existe → 400');
// moderación de fotos
const fP = ins('perfil_fotos', { usuario_id: tA, img: 'AA==', actualizado: NOW, k: 'pk1' }),
  fT = ins('trabajos_fotos', { usuario_id: tA, img: 'AA==', creado: NOW, k: 'tk1' }),
  fR = ins('resena_fotos', { puntuacion_id: sR, img: 'AA==', k: 'rk1' }),
  fPe = ins('pedido_fotos', { pedido_id: pE, img: 'AA==', k: 'ek1' });
for (const [t, id, k] of [
  ['perfil', tA, 'pk1'],
  ['trabajos', fT, 'tk1'],
  ['resenas', fR, 'rk1'],
  ['pedidos', fPe, 'ek1'],
]) {
  r = await call('admin/fotos?t=' + t, null, '', AD);
  ok(
    r.s === 200 && r.d.some((x) => x.id === id && x.k === k && x.nombre),
    'fotos de ' + t + ': se listan con su dueño',
  );
}
r = await call('admin/fotos?t=perfil&q=Prop Uno', null, '', AD);
ok(r.d.length === 1, 'fotos: búsqueda por nombre');
r = await call('admin/fotos?t=nada', null, '', AD);
ok(r.s === 400, 'fotos: tipo inválido → 400');
ok(
  (await call('pfoto/' + tA + '?v=pk1')).s === 200 && (await call('tfoto/' + fT + '.tk1')).s === 200,
  'las fotos se ven antes de moderar',
);
for (const [t, id] of [
  ['perfil', tA],
  ['trabajos', fT],
  ['resenas', fR],
  ['pedidos', fPe],
]) {
  r = await call('admin/foto-borrar', { t, id }, '', AD);
  ok(r.s === 200, 'borrar foto de ' + t);
}
ok(
  (await call('pfoto/' + tA + '?v=pk1')).s === 404 &&
    (await call('tfoto/' + fT + '.tk1')).s === 404 &&
    (await call('rfoto/' + fR + '.rk1')).s === 404 &&
    (await call('foto/' + fPe + '.ek1')).s === 404,
  'las 4 fotos dejan de verse',
);
r = await call('admin/foto-borrar', { t: 'perfil', id: tA }, '', AD);
ok(r.s === 400, 'borrar una foto que ya no está → 400');
r = await call('admin/foto-borrar', { t: 'constructor', id: 1 }, '', AD);
ok(r.s === 400, 'tipo de foto raro → 400');
await wait(30);
ok(
  db.prepare("SELECT COUNT(*) n FROM avisos WHERE usuario_id=? AND texto LIKE 'Sacamos una foto tuya%'").get(tA).n ===
    2,
  'se le avisa al dueño de la foto (perfil y trabajos)',
);
// todo pide la clave
for (const p of [
  'destacados',
  'propuestas?pedido=1',
  'resenas',
  'fotos',
  'quitar-destacado',
  'resena-quitar',
  'resena-borrar',
  'foto-borrar',
]) {
  r = await W.fetch(
    new Request('https://x/api/admin/' + p, {
      method: /^(quitar|resena-|foto-)/.test(p) ? 'POST' : 'GET',
      headers: { 'x-admin-key': 'mala', 'cf-connecting-ip': '7.7.' + (++n % 200) + '.1' },
      body: /^(quitar|resena-|foto-)/.test(p) ? '{}' : undefined,
    }),
    env,
    ctx,
  );
  ok(r.status === 401, 'admin/' + p + ' pide la clave de Gestión');
}
// ---------- v34: limpieza automática (fotos de reseñas a los 3 meses con aviso; pedidos eliminados a los 6 meses) ----------
console.log('--- v34 limpieza');
const DIA = 864e5,
  cronDia = async (masMs = 0) => {
    const real = Date.now,
      t = new Date(real() + masMs);
    t.setUTCHours(13, 2, 0, 0);
    const off = t.getTime() - real();
    Date.now = () => real() + off;
    try {
      await W.scheduled({}, env, ctx);
    } finally {
      Date.now = real;
    }
  };
const cL = mkU('cliente', 'Cliente limpieza', '25556000001'),
  tL = mkU('trabajador', 'Trabajador limpieza', '25556000002');
const pedL = (tit, extra = {}) =>
  ins('pedidos', {
    cliente_id: cL,
    titulo: tit,
    rubro: 'Pintura',
    barrio: 'Centro',
    estado: 'hecha',
    vence: NOW,
    creado: NOW,
    ...extra,
  });
const resL = (tit, dias) => {
  const pid = pedL(tit);
  const sid = ins('puntuaciones', {
    pedido_id: pid,
    trabajador_id: tL,
    cliente_id: cL,
    estrellas: 4,
    comentario: 'Comentario de ' + tit,
    creado: NOW - dias * DIA,
  });
  ins('resena_fotos', { puntuacion_id: sid, img: 'AA==', k: 'l' + sid });
  ins('resena_fotos', { puntuacion_id: sid, img: 'AA==', k: 'm' + sid });
  return sid;
};
const rVieja = resL('Vieja', 95),
  rCasi = resL('Casi', 85),
  rJoven = resL('Joven', 50);
const fN = (id) => db.prepare('SELECT COUNT(*) n FROM resena_fotos WHERE puntuacion_id=?').get(id).n,
  avN = () =>
    db.prepare("SELECT COUNT(*) n FROM avisos WHERE usuario_id=? AND texto LIKE 'Las fotos de tu reseña de%'").get(cL)
      .n;
await cronDia();
ok(fN(rVieja) === 2 && fN(rCasi) === 2, 'primer cron: las fotos viejas todavía NO se borran (primero se avisa)');
ok(avN() === 2, 'primer cron: se avisa por la reseña de 95 días y por la de 85 (2 avisos)');
const avT = db.prepare("SELECT texto FROM avisos WHERE usuario_id=? AND texto LIKE '%«Casi»%'").get(cL);
ok(
  avT && avT.texto.includes('se borran en 7 días') && avT.texto.includes('El puntaje y el comentario se quedan'),
  'el aviso dice cuándo y qué se conserva: ' + (avT && avT.texto),
);
ok(
  fN(rJoven) === 2 && !db.prepare("SELECT 1 x FROM avisos WHERE usuario_id=? AND texto LIKE '%«Joven»%'").get(cL),
  'la reseña de 50 días no se toca ni se avisa',
);
await cronDia(DIA);
ok(avN() === 2 && fN(rVieja) === 2, 'al día siguiente no se repite el aviso y siguen las fotos (faltan 6 días)');
await cronDia(7 * DIA);
ok(fN(rVieja) === 0 && fN(rCasi) === 0, '7 días después del aviso se borran las fotos de reseñas');
ok(fN(rJoven) === 2, 'la reseña joven conserva sus fotos');
const pvL = db.prepare('SELECT estrellas,comentario FROM puntuaciones WHERE id=?').get(rVieja);
ok(pvL && pvL.estrellas === 4 && pvL.comentario === 'Comentario de Vieja', 'se conservan el puntaje y el comentario');
ok(avN() === 2, 'no se mandan avisos repetidos');
// reseña con foto que ya pasó los 90 días y nunca fue avisada: primero se avisa, no se borra de golpe
const rTarde = resL('Tarde', 120);
await cronDia(8 * DIA);
ok(
  fN(rTarde) === 2 &&
    db.prepare("SELECT COUNT(*) n FROM avisos WHERE usuario_id=? AND texto LIKE '%«Tarde»%'").get(cL).n === 1,
  'una reseña vieja sin aviso previo se avisa primero (no se borra sin avisar)',
);
await cronDia(15 * DIA);
ok(fN(rTarde) === 0, 'y una semana después se borran sus fotos');
// pedidos eliminados por el cliente: 6 meses
const oc = (tit, dias, extra = {}) =>
  pedL(tit, { oculta: 1, hecha_en: NOW - dias * DIA, vence: NOW - dias * DIA, ...extra });
const pOld = oc('Oculto viejo', 200),
  pNew = oc('Oculto reciente', 100),
  pVis = pedL('Visible viejo', { hecha_en: NOW - 200 * DIA, vence: NOW - 200 * DIA }),
  pRes = oc('Oculto con reseña', 200),
  pDen = oc('Oculto denunciado', 200),
  pVen = oc('Oculto vencido', 200, { estado: 'vencida', hecha_en: null });
ins('puntuaciones', {
  pedido_id: pRes,
  trabajador_id: tL,
  cliente_id: cL,
  estrellas: 5,
  comentario: 'ok',
  creado: NOW - 200 * DIA,
});
ins('denuncias', { autor_id: tL, tipo: 'pedido', objetivo_id: pDen, motivo: 'x', creado: NOW });
ins('postulaciones', {
  pedido_id: pOld,
  trabajador_id: tL,
  mensaje: 'hola',
  estado: 'descartada',
  creado: NOW - 200 * DIA,
});
ins('postulaciones', { pedido_id: pNew, trabajador_id: tL, mensaje: 'hola', estado: 'descartada', creado: NOW });
await cronDia(20 * DIA);
const ex = (id) => !!db.prepare('SELECT 1 x FROM pedidos WHERE id=?').get(id);
ok(!ex(pOld) && !ex(pVen), 'se borran los pedidos eliminados hace más de 6 meses (hechos y vencidos)');
ok(!db.prepare('SELECT 1 x FROM postulaciones WHERE pedido_id=?').get(pOld), 'y se borran sus propuestas');
ok(
  ex(pNew) && db.prepare('SELECT 1 x FROM postulaciones WHERE pedido_id=?').get(pNew),
  'el eliminado hace poco se conserva',
);
ok(ex(pVis), 'un pedido viejo que NO fue eliminado se conserva');
ok(ex(pRes), 'un pedido eliminado pero con reseña se conserva (la reseña cuenta para el puntaje)');
ok(ex(pDen), 'un pedido eliminado pero denunciado se conserva');
const lgc = db
  .prepare("SELECT detalle FROM logs WHERE tipo='sistema' AND detalle LIKE 'Cron diario%' ORDER BY id DESC LIMIT 1")
  .get();
ok(
  lgc && /fotos de reseñas borradas/.test(lgc.detalle) && /pedidos viejos borrados/.test(lgc.detalle),
  'el registro de actividad cuenta qué limpió: ' + (lgc && lgc.detalle),
);

// ---- v35: nombre y apellido, mail opcional, referidos y promociones gratis
console.log('--- v35');
r = await call('registro', {
  tipo: 'cliente',
  nombre: 'Solo',
  barrio: 'Centro',
  telefono: '2477100001',
  pin: '123456',
  acepto: 1,
  pregunta: '¿Cómo se llamaba tu primera mascota?',
  respuesta: 'Rocky Balboa',
});
ok(r.s === 400, 'registro sin apellido se rechaza');
r = await call('registro', {
  tipo: 'cliente',
  nombre: 'Ana P',
  barrio: 'Centro',
  telefono: '2477100001',
  pin: '123456',
  acepto: 1,
  pregunta: '¿Cómo se llamaba tu primera mascota?',
  respuesta: 'Rocky Balboa',
});
ok(r.s === 400, 'una inicial no alcanza como apellido');
r = await call('registro', {
  tipo: 'cliente',
  nombre: 'Lucía Fernández',
  barrio: 'Centro',
  telefono: '2477100001',
  pin: '123456',
  acepto: 1,
  pregunta: '¿Cómo se llamaba tu primera mascota?',
  respuesta: 'Rocky Balboa',
  mail: 'sin-arroba',
});
ok(r.s === 400, 'registro con mail inválido se rechaza');
r = await call('registro', {
  tipo: 'cliente',
  nombre: '  Lucía   Fernández ',
  barrio: 'Centro',
  telefono: '2477100001',
  pin: '123456',
  acepto: 1,
  pregunta: '¿Cómo se llamaba tu primera mascota?',
  respuesta: 'Rocky Balboa',
  mail: ' Lucia@Mail.com ',
});
const TL = r.d.token;
ok(!!TL, 'registro con mail opcional');
r = await call('yo', null, TL);
ok(r.d.nombre === 'Lucía Fernández' && r.d.mail === 'lucia@mail.com', 'nombre prolijo y mail en minúsculas');
r = await call('registro', {
  tipo: 'cliente',
  nombre: 'Sin Mail',
  barrio: 'Centro',
  telefono: '2477100002',
  pin: '123456',
  acepto: 1,
  pregunta: '¿Cómo se llamaba tu primera mascota?',
  respuesta: 'Rocky Balboa',
});
const TM = r.d.token;
ok(r.s === 200, 'el mail es opcional');
db.prepare("UPDATE usuarios SET nombre='Soloun' WHERE telefono='2477100002'").run();
r = await call('yo', null, TM);
ok(r.d.falta.includes('nombre'), 'cuenta vieja sin apellido: el perfil figura incompleto');
await call('perfil-foto', { foto: JP }, TM);
r = await call('pedidos', { titulo: 'Pintar reja', rubro: 'Pintura', barrio: 'Centro' }, TM);
ok(r.s === 403 && /nombre y apellido/.test(r.d.error), 'sin apellido no se puede publicar');
r = await call('perfil', { nombre: 'Soloun', barrio: 'Centro', bio: '' }, TM);
ok(r.s === 400, 'perfil: sin apellido se rechaza');
r = await call('perfil', { nombre: 'Mario Gómez', barrio: 'Centro', bio: '', mail: 'xx' }, TM);
ok(r.s === 400, 'perfil: mail inválido se rechaza');
r = await call('perfil', { nombre: 'Mario Gómez', barrio: 'Centro', bio: '', mail: 'mario@mail.com' }, TM);
ok(r.s === 200, 'perfil: nombre y apellido + mail');
r = await call('yo', null, TM);
ok(!r.d.falta.includes('nombre') && r.d.mail === 'mario@mail.com', 'perfil completo y mail guardado');
await call('perfil', { nombre: 'Mario Gómez', barrio: 'Centro', bio: '' }, TM);
r = await call('yo', null, TM);
ok(r.d.mail === 'mario@mail.com', 'si el perfil no manda el mail, se conserva');
// referidos
const RU = (await call('yo', null, TL)).d;
ok(
  /^[A-HJKMNP-Z2-9]{6}$/.test(RU.ref_cod) && RU.ref_n === 0 && RU.ref_de === 5,
  'cada cuenta tiene su código de invitación',
);
r = await call('yo', null, TL);
ok(r.d.ref_cod === RU.ref_cod, 'el código no cambia');
const NI = ['Inés Uno', 'Hugo Dos', 'Lola Tres', 'Mati Cuatro', 'Nora Cinco'],
  IV = [];
for (let i = 0; i < 5; i++) {
  r = await call('registro', {
    tipo: 'cliente',
    nombre: NI[i],
    barrio: 'Centro',
    telefono: '24771100' + (10 + i),
    pin: '123456',
    acepto: 1,
    pregunta: '¿Cómo se llamaba tu primera mascota?',
    respuesta: 'Rocky Balboa',
    ref: RU.ref_cod,
  });
  IV.push(r.d.token);
}
r = await call('yo', null, TL);
ok(r.d.ref_n === 0, 'los invitados sin perfil completo todavía no cuentan');
for (let i = 0; i < 5; i++) await call('perfil-foto', { foto: JP }, IV[i]);
r = await call('yo', null, TL);
ok(r.d.ref_n === 0, 'con solo la foto tampoco cuentan: tienen que publicar o postularse');
const hecho = (i, t) => call('pedidos', { titulo: t, rubro: 'Pintura', barrio: 'Centro' }, IV[i]);
for (let i = 0; i < 4; i++) await hecho(i, 'Pedido de invitado ' + i);
r = await call('yo', null, TL);
ok(r.d.ref_n === 4 && r.d.promos === 0, 'cuentan al publicar un pedido (4 de 5)');
await hecho(4, 'Pedido de invitado 4');
r = await call('yo', null, TL);
ok(r.d.ref_n === 5 && r.d.promos === 1 && r.d.ref_prem === 1, 'con 5 invitados activos se gana una promoción');
await hecho(4, 'Otro pedido del invitado');
r = await call('yo', null, TL);
ok(r.d.ref_n === 5 && r.d.promos === 1, 'publicar otro pedido no cuenta dos veces');
r = await call('avisos', null, TL);
ok(
  r.d.some((a) => /te regalamos una potenciación gratis/.test(a.texto)) && r.d.some((a) => /Llevás 4 de 5/.test(a.texto)),
  'avisos de progreso y de premio',
);
r = await call('registro', {
  tipo: 'cliente',
  nombre: 'Sin Codigo',
  barrio: 'Centro',
  telefono: '2477100020',
  pin: '123456',
  acepto: 1,
  pregunta: '¿Cómo se llamaba tu primera mascota?',
  respuesta: 'Rocky Balboa',
  ref: 'ZZZZZZ',
});
ok(
  r.s === 200 && db.prepare("SELECT ref_por FROM usuarios WHERE telefono='2477100020'").get().ref_por === 0,
  'un código que no existe no frena el registro ni suma a nadie',
);
// v36: misma conexión, tope, suspendidos y anulación
const IPX = { 'cf-connecting-ip': '6.6.6.6' };
r = await call(
  'registro',
  {
    tipo: 'cliente',
    nombre: 'Pablo Ref',
    barrio: 'Centro',
    telefono: '2477100040',
    pin: '123456',
    acepto: 1,
    pregunta: '¿Cómo se llamaba tu primera mascota?',
    respuesta: 'Rocky Balboa',
  },
  '',
  IPX,
);
const cx = (await call('yo', null, r.d.token)).d;
await call(
  'registro',
  {
    tipo: 'cliente',
    nombre: 'Mismo Wifi',
    barrio: 'Centro',
    telefono: '2477100041',
    pin: '123456',
    acepto: 1,
    pregunta: '¿Cómo se llamaba tu primera mascota?',
    respuesta: 'Rocky Balboa',
    ref: cx.ref_cod,
  },
  '',
  IPX,
);
ok(
  db.prepare("SELECT ref_por FROM usuarios WHERE telefono='2477100041'").get().ref_por === 0,
  'desde la misma conexión no cuenta como invitado',
);
await call('registro', {
  tipo: 'cliente',
  nombre: 'Otro Wifi',
  barrio: 'Centro',
  telefono: '2477100042',
  pin: '123456',
  acepto: 1,
  pregunta: '¿Cómo se llamaba tu primera mascota?',
  respuesta: 'Rocky Balboa',
  ref: cx.ref_cod,
});
ok(
  db.prepare("SELECT ref_por FROM usuarios WHERE telefono='2477100042'").get().ref_por === cx.id,
  'desde otra conexión sí',
);
let kk = 0,
  lastTel = '';
const inv = async (cod) => {
  kk++;
  lastTel = '24773' + String(10000 + kk);
  const q0 = await call('registro', {
    tipo: 'cliente',
    nombre: 'Inv Prueba',
    barrio: 'Centro',
    telefono: lastTel,
    pin: '123456',
    acepto: 1,
    pregunta: '¿Cómo se llamaba tu primera mascota?',
    respuesta: 'Rocky Balboa',
    ref: cod,
  });
  const t = q0.d.token;
  await call('perfil-foto', { foto: JP }, t);
  await call('pedidos', { titulo: 'Pedido inv ' + kk, rubro: 'Pintura', barrio: 'Centro' }, t);
  return t;
};
r = await call('registro', {
  tipo: 'cliente',
  nombre: 'Tope Dueño',
  barrio: 'Centro',
  telefono: '2477100050',
  pin: '123456',
  acepto: 1,
  pregunta: '¿Cómo se llamaba tu primera mascota?',
  respuesta: 'Rocky Balboa',
});
const TD = r.d.token,
  cd = (await call('yo', null, TD)).d;
for (let i = 0; i < 15; i++) await inv(cd.ref_cod);
r = await call('yo', null, TD);
ok(r.d.promos === 3 && r.d.ref_prem === 3 && r.d.ref_max === 3, '15 invitados activos = 3 promociones');
for (let i = 0; i < 5; i++) await inv(cd.ref_cod);
r = await call('yo', null, TD);
ok(r.d.promos === 3 && r.d.ref_n === 20, 'después del tope de 3 no se gana más');
r = await call('admin/clientes?q=Tope', null, '', AD);
const fila = r.d.find((x) => x.telefono === '2477100050');
ok(fila && fila.ref_n === 20 && fila.promos === 3, 'Gestión muestra cuántos invitó y las promociones sin usar');
r = await call('admin/clientes?q=Inv%20Prueba', null, '', AD);
ok(
  r.d.some((x) => x.ref_por_nombre === 'Tope Dueño'),
  'Gestión muestra quién invitó a cada uno',
);
await call('admin/ref-anular', { telefono: '2477100050' }, '', AD);
r = await call('yo', null, TD);
ok(r.d.promos === 0 && r.d.ref_n === 0 && r.d.ref_prem === 3, 'anular saca invitados y promociones y bloquea nuevas');
await inv(cd.ref_cod);
r = await call('yo', null, TD);
ok(r.d.promos === 0, 'y después de anular no gana más');
r = await call('registro', {
  tipo: 'cliente',
  nombre: 'Dueña Susp',
  barrio: 'Centro',
  telefono: '2477100060',
  pin: '123456',
  acepto: 1,
  pregunta: '¿Cómo se llamaba tu primera mascota?',
  respuesta: 'Rocky Balboa',
});
const cs = (await call('yo', null, r.d.token)).d,
  TS = r.d.token;
for (let i = 0; i < 4; i++) await inv(cs.ref_cod);
await call('admin/suspender', { telefono: lastTel, on: 1 }, '', AD);
await inv(cs.ref_cod);
r = await call('yo', null, TS);
ok(r.d.ref_n === 4 && r.d.promos === 0, 'un invitado suspendido no cuenta');
await inv(cs.ref_cod);
r = await call('yo', null, TS);
ok(r.d.ref_n === 5 && r.d.promos === 1, 'con otro invitado real se completan los 5');
// mail: se ve recién cuando eligen
await call('perfil-foto', { foto: JP }, TL);
for (const t of ['Pintar zaguán', 'Arreglar reja', 'Pintar portón'])
  await call('pedidos', { titulo: t, rubro: 'Pintura', barrio: 'Centro' }, TL);
const idp = async (t) => (await call('mis-pedidos', null, TL)).d.find((x) => x.titulo === t).id;
const WP = await mk('Pablo', '2477100030', 'trabajador', 'Pintura');
await call(
  'perfil',
  { nombre: 'Pablo Díaz', barrio: 'Centro', rubros: ['Pintura'], bio: '', mail: 'pablo@mail.com' },
  WP,
);
const pZ = await idp('Pintar zaguán');
r = await call('pedidos/' + pZ + '/postular', { mensaje: 'puedo mañana' }, WP);
ok(r.s === 200, 'el trabajador se postula');
r = await call('mis-pedidos', null, TL);
ok(!/pablo@mail/.test(JSON.stringify(r.d)), 'antes de elegir, el cliente no ve el mail del trabajador');
r = await call('mis-postulaciones', null, WP);
ok(!/lucia@mail/.test(JSON.stringify(r.d)), 'antes de elegir, el trabajador no ve el mail del cliente');
const spZ = db.prepare('SELECT id FROM postulaciones WHERE pedido_id=?').get(pZ).id;
await call('postulaciones/' + spZ + '/elegir', {}, TL);
r = await call('mis-pedidos', null, TL);
ok(/pablo@mail\.com/.test(JSON.stringify(r.d)), 'al elegirlo, el cliente ve su mail');
r = await call('mis-postulaciones', null, WP);
ok(
  /lucia@mail\.com/.test(JSON.stringify(r.d)) && !/Fernández.*33444555/.test(JSON.stringify(r.d)),
  'al elegirlo, el trabajador ve el mail del cliente',
);
r = await call('trabajadores/' + (await call('yo', null, WP)).d.id, null, TL);
ok(!/pablo@mail/.test(JSON.stringify(r.d)), 'el perfil público nunca muestra el mail');
// primera promoción gratis
await call('admin/ajuste', { clave: 'primera_gratis', valor: 1 }, '', AD);
r = await call('yo', null, WP);
ok(r.d.primera === 1 && r.d.gratis === 1, 'la primera promoción figura como gratis');
r = await call('potenciar', { tipo: 'alertas' }, WP);
ok(r.s === 200 && r.d.gratis === 1, 'alertas: la primera es gratis y se activa al instante');
r = await call('yo', null, WP);
ok(
  r.d.alertas_act === 1 && r.d.primera === 0 && r.d.gratis === 0,
  'quedan activas y ya no queda nada gratis',
);
r = await call('potenciar', { tipo: 'alertas' }, WP);
ok(r.s === 403, 'sin más potenciaciones disponibles no se activa otra (y no se cobra)');
r = await call('admin/pagos', null, '', AD);
ok(r.d.hist.some((x) => x.tipo === 'alertas' && x.estado === 'activa'), 'la gratis queda en el historial de Gestión');
// el cliente tiene la primera + una ganada por invitar
r = await call('yo', null, TL);
ok(r.d.promos === 1 && r.d.primera === 1 && r.d.gratis === 2, 'el cliente tiene la primera y una promoción ganada');
const pR = await idp('Arreglar reja'),
  pP = await idp('Pintar portón');
r = await call('potenciar', { tipo: 'destacado', pedido_id: pR }, TL);
ok(r.s === 200 && r.d.gratis === 1, 'destacado gratis (usa la primera)');
r = await call('yo', null, TL);
ok(r.d.promos === 1 && r.d.primera === 0 && r.d.gratis === 1, 'la promoción ganada sigue disponible');
r = await call('potenciar', { tipo: 'destacado', pedido_id: pP }, TL);
ok(r.s === 200 && r.d.gratis === 1, 'segundo destacado gratis (usa la ganada)');
r = await call('yo', null, TL);
ok(r.d.promos === 0 && r.d.gratis === 0, 'se gastó la promoción ganada');
r = await call('pedidos', null, TL);
const dd = db
  .prepare('SELECT COUNT(*) n FROM pedidos WHERE cliente_id=? AND dest_hasta>?')
  .get((await call('yo', null, TL)).d.id, Date.now()).n;
ok(dd === 2, 'los dos pedidos quedaron destacados');
r = await call('potenciar', { tipo: 'destacado', pedido_id: pZ }, TL);
ok(r.s === 400, 'un pedido que ya no está abierto no se destaca');
// Gestión puede apagar la primera gratis
await call('admin/ajuste', { clave: 'primera_gratis', valor: 0 }, '', AD);
const WQ = await mk('Quique', '2477100031', 'trabajador', 'Pintura');
r = await call('yo', null, WQ);
ok(r.d.primera === 0 && r.d.gratis === 0, 'con la primera gratis apagada no hay gratis');
r = await call('potenciar', { tipo: 'alertas' }, WQ);
ok(r.s === 403, 'y no se activa nada si no tiene potenciaciones ganadas');
r = await call('admin/ajustes', null, '', AD);
ok(r.d.ajustes.primera_gratis === 0, 'Gestión muestra el ajuste primera_gratis');
r = await call('admin/ajuste', { clave: 'primera_gratis', valor: 5 }, '', AD);
ok(r.s === 400, 'primera_gratis solo acepta 0 o 1');
await call('admin/ajuste', { clave: 'primera_gratis', valor: 1 }, '', AD);

// ---- v37: eliminar cuenta, registro de errores y límites
console.log('--- v37');
r = await call('admin/ajuste', { clave: 'promo_hasta', valor: Date.now() + 864e5 }, '', AD);
ok(r.s === 400, 'ya no hay promo de lanzamiento con fecha');
// registro de errores
const nErr = () => db.prepare('SELECT COUNT(*) n FROM errores').get().n;
r = await call('error', { msg: 'x is not a function', src: 'app.js:10', pag: '/#perfil' });
ok(r.s === 200 && nErr() === 1, 'la app puede reportar un error sin sesión');
r = await call('error', { msg: 'y'.repeat(900), src: 's' }, TL);
const er = db.prepare('SELECT * FROM errores ORDER BY id DESC LIMIT 1').get();
ok(
  er.mensaje.length === 300 && er.usuario_id > 0 && er.donde === 'app',
  'el error se corta a 300 letras y se asocia a la cuenta si hay sesión',
);
const IPE = { 'cf-connecting-ip': '2.2.2.2' };
let antes = nErr();
for (let i = 0; i < 30; i++) await call('error', { msg: 'spam ' + i }, '', IPE);
ok(nErr() - antes === 20, 'un mismo origen no llena la tabla (20 por hora)');
const fdb = {
  prepare: (s) => {
    if (/FROM sesiones s JOIN usuarios/.test(s)) throw new Error('boom de prueba');
    return env.DB.prepare(s);
  },
  batch: (x) => env.DB.batch(x),
};
r = await W.fetch(
  new Request('https://x/api/yo', { headers: { authorization: 'Bearer x', 'cf-connecting-ip': '2.2.2.3' } }),
  { ...env, DB: fdb },
  ctx,
);
await new Promise((z) => setTimeout(z, 20));
ok(
  r.status === 500 &&
    db.prepare("SELECT COUNT(*) n FROM errores WHERE donde='worker' AND mensaje LIKE '%boom de prueba%'").get().n === 1,
  'un error inesperado del Worker devuelve 500 y queda registrado',
);
r = await call('admin/ajustes', null, '', AD);
ok(
  Array.isArray(r.d.errores) && r.d.errores.length >= 2 && r.d.errores[0].id > r.d.errores[1].id,
  'Gestión ve los errores, del más nuevo al más viejo',
);
await call('admin/errores-borrar', {}, '', AD);
ok(nErr() === 0, 'Gestión puede borrar los errores');
// límites de uso
r = await call('registro', {
  tipo: 'cliente',
  nombre: 'Limite Uno',
  barrio: 'Centro',
  telefono: '2477100070',
  pin: '123456',
  acepto: 1,
  pregunta: '¿Cómo se llamaba tu primera mascota?',
  respuesta: 'Rocky Balboa',
});
const TLM = r.d.token;
r = await call('denunciar', { tipo: 'usuario', id: 1, motivo: 'primera' }, TLM);
ok(r.s === 200, 'denuncias: la primera pasa');
r = await call('denunciar', { tipo: 'usuario', id: 1, motivo: 'segunda' }, TLM);
ok(
  r.s === 429 && /Estamos revisando tu denuncia anterior/.test(r.d.error) && /hora/.test(r.d.error),
  'denuncias: una cada 24 horas, y avisa que se está revisando la anterior y cuándo se puede otra',
);
r = await call('perfil-foto', { foto: JP }, TLM);
ok(r.s === 200, 'foto de perfil: la primera es libre');
r = await call('perfil-foto', { foto: JP }, TLM);
ok(r.s === 200, 'foto de perfil: se puede cambiar una vez por día');
r = await call('perfil-foto', { foto: JP }, TLM);
ok(
  r.s === 429 && /Ya cambiaste tu foto de perfil hoy/.test(r.d.error) && /hora/.test(r.d.error),
  'foto de perfil: el segundo cambio del día se frena y avisa cuándo se puede',
);
r = await call('perfil-foto', { borrar: 1 }, TLM);
ok(r.s === 200, 'borrar la foto no está limitado');
const WT = await mk('Trabaja', '2477100071', 'trabajador', 'Pintura');
let sx = [];
for (let i = 0; i < 7; i++) sx.push(await call('trabajos-fotos', { foto: JP }, WT));
ok(
  sx.slice(0, 5).every((x) => x.s === 200) &&
    sx[5].s === 429 &&
    sx[6].s === 429 &&
    /5 fotos de trabajos por día/.test(sx[5].d.error),
  'fotos de trabajos: 5 por día y después 429 con aviso',
);
// postulaciones por día: ajustable desde Gestión (por defecto 6), por cuenta
r = await call('admin/ajustes', null, '', AD);
ok(r.d.ajustes.limite_post === 6, 'por defecto son 6 postulaciones por día');
r = await call('admin/ajuste', { clave: 'limite_post', valor: 0 }, '', AD);
ok(r.s === 400, 'el tope de postulaciones no puede ser 0');
r = await call('admin/ajuste', { clave: 'limite_post', valor: 101 }, '', AD);
ok(r.s === 400, 'ni más de 100');
await call('admin/ajuste', { clave: 'limite_post', valor: 2 }, '', AD);
const abiertos = db
  .prepare("SELECT id FROM pedidos WHERE rubro='Pintura' AND estado='abierta' AND oculta=0 LIMIT 4")
  .all()
  .map((x) => x.id);
const WZ = await mk('Postula', '2477100072', 'trabajador', 'Pintura');
sx = [];
for (const id of abiertos) sx.push(await call('pedidos/' + id + '/postular', { mensaje: 'va' }, WZ));
ok(
  sx[0].s === 200 &&
    sx[1].s === 200 &&
    sx[2].s === 429 &&
    /límite de 2 postulaciones por día/.test(sx[2].d.error) &&
    /hora/.test(sx[2].d.error),
  'postulaciones: con tope 2, la tercera se frena y avisa cuándo',
);
r = await call('pedidos/' + abiertos[0] + '/postular', { mensaje: 'otra vez' }, WZ);
ok(r.s === 429, 'y sigue frenada aunque repita el mismo pedido');
const WY = await mk('Otra Cuenta', '2477100073', 'trabajador', 'Pintura');
r = await call('pedidos/' + abiertos[2] + '/postular', { mensaje: 'va' }, WY);
ok(r.s === 200, 'el tope es por cuenta: otra cuenta puede postularse');
await call('admin/ajuste', { clave: 'limite_post', valor: 6 }, '', AD);
r = await call('pedidos/' + abiertos[2] + '/postular', { mensaje: 'va' }, WZ);
ok(r.s === 200, 'si Gestión sube el tope, puede seguir');
// eliminar cuenta
r = await call('registro', {
  tipo: 'cliente',
  nombre: 'Borrar Cliente',
  barrio: 'Centro',
  telefono: '2477100080',
  pin: '654321',
  acepto: 1,
  pregunta: '¿Cómo se llamaba tu primera mascota?',
  respuesta: 'Rocky Balboa',
  ref: cd.ref_cod,
});
const TB = r.d.token,
  uidB = (await call('yo', null, TB)).d.id;
await call('perfil', { nombre: 'Borrar Cliente', barrio: 'Centro', bio: '', mail: 'borrar@mail.com' }, TB);
await call('perfil-foto', { foto: JP }, TB);
await call('verificacion', { dni: '30111222', direccion: 'Calle 123', mail: 'borrar@mail.com' }, TB);
await call('pedidos', { titulo: 'Con reseña', rubro: 'Pintura', barrio: 'Centro', descripcion: 'datos privados' }, TB);
await call('pedidos', { titulo: 'Sin reseña', rubro: 'Pintura', barrio: 'Centro' }, TB);
const pCR = db.prepare("SELECT id FROM pedidos WHERE titulo='Con reseña'").get().id;
db.prepare(
  'INSERT INTO puntuaciones(pedido_id,trabajador_id,cliente_id,estrellas,comentario,creado) VALUES(?,?,?,?,?,?)',
).run(pCR, (await call('yo', null, WP)).d.id, uidB, 5, 'Muy bien', Date.now());
r = await call('cuenta-borrar', { pin: '000000' }, TB);
ok(r.s === 401, 'eliminar cuenta: con un PIN incorrecto no se borra');
r = await call('cuenta-borrar', {}, TB);
ok(r.s === 401, 'eliminar cuenta: sin PIN no se borra');
r = await call('cuenta-borrar', { pin: '654321' }, TB);
ok(r.s === 200, 'eliminar cuenta: con el PIN correcto se borra');
const ub = db.prepare('SELECT * FROM usuarios WHERE id=?').get(uidB);
ok(
  ub.nombre === 'Cuenta eliminada' &&
    ub.telefono === 'eliminada-' + uidB &&
    !ub.dni &&
    !ub.direccion &&
    !ub.mail &&
    !ub.barrio &&
    ub.suspendido === 1,
  'la cuenta queda anonimizada y sin datos personales',
);
ok(
  !db.prepare('SELECT 1 x FROM perfil_fotos WHERE usuario_id=?').get(uidB) &&
    !db.prepare('SELECT 1 x FROM sesiones WHERE usuario_id=?').get(uidB),
  'se borran la foto y las sesiones',
);
ok(!db.prepare("SELECT 1 x FROM pedidos WHERE titulo='Sin reseña'").get(), 'se borran los pedidos sin reseña');
const pk = db.prepare('SELECT titulo,descripcion,oculta,estado FROM pedidos WHERE id=?').get(pCR);
ok(
  pk && pk.titulo === 'Pedido eliminado' && pk.descripcion === '' && pk.oculta === 1 && pk.estado === 'cancelada',
  'el pedido con reseña se conserva vaciado y oculto',
);
ok(
  db.prepare('SELECT COUNT(*) n FROM puntuaciones WHERE pedido_id=?').get(pCR).n === 1,
  'la reseña que escribió se conserva',
);
ok(
  db.prepare('SELECT ref_por FROM usuarios WHERE id=?').get(uidB).ref_por === 0,
  'ya no figura como invitado de nadie',
);
r = await call('yo', null, TB);
ok(r.s === 401, 'la sesión vieja deja de funcionar');
r = await call('login', { telefono: '2477100080', pin: '654321' });
ok(r.s === 401, 'no se puede entrar con el teléfono viejo');
r = await call('registro', {
  tipo: 'cliente',
  nombre: 'Volvió Otra',
  barrio: 'Centro',
  telefono: '2477100080',
  pin: '123456',
  acepto: 1,
  pregunta: '¿Cómo se llamaba tu primera mascota?',
  respuesta: 'Rocky Balboa',
});
ok(r.s === 200, 'el teléfono queda libre para crear otra cuenta');
// eliminar un trabajador
const pOpen = await idp('Pintar portón');
const WD = await mk('Se Va', '2477100081', 'trabajador', 'Pintura'),
  uidW = (await call('yo', null, WD)).d.id;
await call('pedidos/' + pOpen + '/postular', { mensaje: 'hola' }, WD);
await call('trabajos-fotos', { foto: JP }, WD);
db.prepare('UPDATE usuarios SET promos=1 WHERE id=?').run(uidW);
await call('potenciar', { tipo: 'alertas' }, WD);
db.prepare(
  'INSERT INTO puntuaciones(pedido_id,trabajador_id,cliente_id,estrellas,comentario,creado) VALUES(?,?,?,?,?,?)',
).run(pCR + 1000, uidW, 1, 4, 'ok', Date.now());
r = await call('cuenta-borrar', { pin: '123456' }, WD);
ok(r.s === 200, 'un trabajador también puede eliminar su cuenta');
ok(
  !db.prepare('SELECT 1 x FROM postulaciones WHERE trabajador_id=?').get(uidW) &&
    !db.prepare('SELECT 1 x FROM trabajos_fotos WHERE usuario_id=?').get(uidW) &&
    !db.prepare('SELECT 1 x FROM puntuaciones WHERE trabajador_id=?').get(uidW),
  'se borran sus postulaciones, fotos de trabajos y reseñas recibidas',
);
ok(
  db.prepare('SELECT COUNT(*) n FROM activaciones WHERE usuario_id=?').get(uidW).n >= 1,
  'los cobros se conservan para la contabilidad',
);
r = await call('directorio', null, C);
ok(!JSON.stringify(r.d).includes('Cuenta eliminada'), 'una cuenta eliminada no aparece en el directorio');
r = await call('admin/suspender', { telefono: 'eliminada-' + uidW, on: 0 }, '', AD);
ok(r.s === 400, 'Gestión no puede reactivar una cuenta eliminada');
r = await call('admin/reset-pin', { telefono: 'eliminada-' + uidW, pin: '123456' }, '', AD);
ok(r.s === 400, 'ni cambiarle el PIN');

// v39: vista previa para compartir (og:url y og:image con el dominio real) y encabezados de la API
{
  const w = async (u) => {
    const r = await W.fetch(new Request(u), env, ctx);
    return { s: r.status, t: await r.text(), h: r.headers };
  };
  let q = await w('https://mi-dominio.example/');
  ok(
    q.s === 200 && q.t.includes('property="og:url" content="https://mi-dominio.example/"'),
    'portada: og:url con el origen de la petición',
  );
  ok(
    q.t.includes('content="https://mi-dominio.example/og-dichoyhecho.png"') && !q.t.includes('{{ORIGEN}}'),
    'portada: og:image absoluta y sin marcadores',
  );
  ok(
    q.t.includes('property="og:title"') && q.t.includes('property="og:description"') && q.t.includes('twitter:card'),
    'portada: etiquetas og:title, og:description y twitter:card',
  );
  ok(!q.h.get('etag'), 'portada reescrita: sin etag viejo');
  q = await w('https://otro.workers.dev/?r=ABC');
  ok(q.t.includes('content="https://otro.workers.dev/og-dichoyhecho.png"'), 'otro dominio: se completa solo');
  q = await w('https://x/otra-cosa');
  ok(q.s === 404, 'otras rutas pasan directo a los archivos');
  const a = await W.fetch(new Request('https://x/api/yo'), env, ctx);
  ok(
    a.headers.get('x-content-type-options') === 'nosniff' && a.headers.get('x-frame-options') === 'DENY',
    'respuestas de la API con nosniff y X-Frame-Options',
  );
  ok(
    fs.existsSync(new URL('.gitignore', R)) && fs.readFileSync(new URL('.gitignore', R), 'utf8').includes('.dev.vars'),
    '.gitignore existe e ignora .dev.vars',
  );
  ok(fs.readFileSync(new URL('public/robots.txt', R), 'utf8').includes('Disallow: /api/'), 'robots.txt bloquea /api/');
  const hd = fs.readFileSync(new URL('public/_headers', R), 'utf8');
  const swt = fs.readFileSync(new URL('public/sw.js', R), 'utf8');
  ok(/\/fonts\/\*\s+Cache-Control: public, max-age=31536000, immutable/.test(hd), 'fuentes con caché de un año');
  ok(
    swt.replace(/\s+/g, '').includes('c.match(r,{ignoreSearch:true})') &&
      swt.replace(/\s+/g, '').includes("cache:'reload'") &&
      swt.replace(/\s+/g, '').includes("startsWith('/api/')"),
    'sw: muestra lo guardado, baja fresco al instalar y no toca /api/',
  );
  ok(
    /Content-Security-Policy/.test(hd) &&
      /frame-ancestors 'none'/.test(hd) &&
      /\/sw\.js\s+Cache-Control: no-cache/.test(hd),
    '_headers con CSP y sw.js sin caché',
  );
}

// v41: PIN de 6 números
{
  let r = await call('registro', {
    tipo: 'cliente',
    nombre: 'Pin Corto',
    barrio: 'Centro',
    telefono: '2477000990',
    pin: '1234',
    acepto: 1,
    pregunta: '¿Cómo se llamaba tu primera mascota?',
    respuesta: 'Rocky Balboa',
  });
  ok(r.s === 400, 'registro con PIN de 4 números: se rechaza');
  r = await call('registro', {
    tipo: 'cliente',
    nombre: 'Pin Corto',
    barrio: 'Centro',
    telefono: '2477000990',
    pin: '12345',
    acepto: 1,
    pregunta: '¿Cómo se llamaba tu primera mascota?',
    respuesta: 'Rocky Balboa',
  });
  ok(r.s === 400, 'registro con PIN de 5 números: se rechaza');
  r = await call('registro', {
    tipo: 'cliente',
    nombre: 'Pin Largo',
    barrio: 'Centro',
    telefono: '2477000990',
    pin: '1234567',
    acepto: 1,
    pregunta: '¿Cómo se llamaba tu primera mascota?',
    respuesta: 'Rocky Balboa',
  });
  ok(r.s === 400, 'registro con PIN de 7 números: se rechaza');
  r = await call('registro', {
    tipo: 'cliente',
    nombre: 'Pin Bien',
    barrio: 'Centro',
    telefono: '2477000990',
    pin: '482913',
    acepto: 1,
    pregunta: '¿Cómo se llamaba tu primera mascota?',
    respuesta: 'Rocky Balboa',
  });
  ok(r.s === 200, 'registro con PIN de 6 números: se acepta');
  const T0 = '2477000990';
  const x0 = await call('admin/reset-pin', { telefono: T0, pin: '1234' }, '', AD);
  ok(x0.s === 400, 'Gestión tampoco puede poner un PIN de 4 números');
  // v42: bloqueo por conexión (el atacante se bloquea él, el dueño entra normal)
  const lg = (ip, pin) => call('login', { telefono: T0, pin }, '', { 'cf-connecting-ip': ip }),
    mal = async (ip) => {
      let x;
      for (let i = 0; i < 5; i++) x = await lg(ip, '000000');
      return x;
    };
  const salto = (ms) => db.prepare('UPDATE limites SET creado=creado-? WHERE clave LIKE ?').run(ms, 'l_:' + T0 + ':%');
  let x = await mal('7.7.7.7');
  ok(x.s === 401, '5 errores desde una conexión: el 5.º todavía dice PIN incorrecto');
  x = await lg('7.7.7.7', '482913');
  ok(
    x.s === 429 && /unos minutos/.test(x.d.error),
    'esa conexión queda bloqueada aunque ponga el PIN bueno: ' + x.d.error,
  );
  x = await lg('8.8.4.4', '482913');
  ok(x.s === 200, 'el dueño entra normal desde otra conexión');
  salto(16 * 60000);
  x = await mal('7.7.7.7');
  x = await lg('7.7.7.7', '482913');
  ok(x.s === 429 && /una hora/.test(x.d.error), '2.º bloqueo de esa conexión: una hora');
  salto(61 * 60000);
  x = await mal('7.7.7.7');
  x = await lg('7.7.7.7', '482913');
  ok(x.s === 429 && /un día/.test(x.d.error), '3.er bloqueo de esa conexión: un día');
  for (let k = 0; k < 8; k++) await mal('10.0.0.' + k);
  x = await lg('9.9.9.9', '482913');
  ok(
    x.s === 429 && /muchos intentos fallidos/.test(x.d.error),
    'si fallan muchas conexiones distintas, se frena la cuenta: ' + x.d.error,
  );
  x = await call('recuperar', { telefono: T0, respuesta: 'rocky balboa', pin: '111222' });
  ok(x.s === 200 && !!x.d.token, 'aun frenada, el dueño recupera la cuenta con su respuesta');
  x = await lg('9.9.9.9', '111222');
  ok(x.s === 200, 'y entra con el PIN nuevo desde una conexión sin historial');
  x = await lg('9.9.9.9', '000000');
  ok(x.s === 401, 'un PIN malo sigue dando 401 (sin bloqueo de cuenta)');
}
// v42: confirmación manual del teléfono con código por WhatsApp
{
  let r = await call('admin/ajuste', { clave: 'tel_on', valor: 1 }, '', AD);
  ok(r.s === 200, 'Gestión prende la confirmación del teléfono');
  const reg = (tel) =>
    call('registro', {
      tipo: 'cliente',
      nombre: 'Nuevo Cliente',
      barrio: 'Centro',
      telefono: tel,
      pin: '482913',
      acepto: 1,
      pregunta: '¿Cómo se llamaba tu primera mascota?',
      respuesta: 'Rocky Balboa',
    });
  let g = await reg('2477000991');
  const TG = g.d.token;
  ok(g.d.confirmar === 1 && !!TG, 'registro con la confirmación prendida: pide confirmar');
  r = await call('yo', null, TG);
  ok(r.d.tel_pend === 1, 'yo avisa que falta confirmar el teléfono');
  r = await call('pedidos', null, TG);
  ok(r.s === 403 && /confirmar/.test(r.d.error), 'sin confirmar no puede usar la app');
  r = await call('admin/inicio', null, '', AD);
  const pe = r.d.telpend.find((x) => x.telefono === '2477000991');
  ok(!!pe && /^\d{6}$/.test(pe.codigo) && r.d.tel_on === 1, 'Gestión ve a la persona y su código de 6 números');
  ok(pe.vence - Date.now() > 59 * 60000 && pe.vence - Date.now() <= 60 * 60000, 'el código vence en 1 hora');
  const mal6 = pe.codigo === '999999' ? '999998' : '999999';
  r = await call('tel-codigo', { codigo: mal6 }, TG);
  ok(r.s === 400, 'código equivocado: se rechaza');
  r = await call('tel-codigo', { codigo: pe.codigo }, TG);
  ok(r.s === 200, 'código correcto: se confirma');
  r = await call('yo', null, TG);
  ok(r.d.tel_pend === 0, 'ya no figura pendiente');
  r = await call('pedidos', null, TG);
  ok(!/confirmar/.test(r.d.error || ''), 'confirmada: usa la app normal');
  r = await call('admin/inicio', null, '', AD);
  ok(!r.d.telpend.some((x) => x.telefono === '2477000991'), 'sale de la lista de Gestión');
  // vencimiento y nuevo código
  g = await reg('2477000992');
  const T2 = g.d.token;
  let c2 = db
    .prepare('SELECT codigo FROM tel_codigos WHERE usuario_id=(SELECT id FROM usuarios WHERE telefono=?)')
    .get('2477000992').codigo;
  db.prepare('UPDATE tel_codigos SET vence=? WHERE codigo=?').run(Date.now() - 1000, c2);
  r = await call('tel-codigo', { codigo: c2 }, T2);
  ok(r.s === 410, 'código vencido (más de 1 hora): se rechaza');
  r = await call('tel-nuevo', {}, T2);
  ok(r.s === 200, 'pide un código nuevo');
  c2 = db
    .prepare('SELECT codigo,vence FROM tel_codigos WHERE usuario_id=(SELECT id FROM usuarios WHERE telefono=?)')
    .get('2477000992');
  ok(c2.vence > Date.now() + 59 * 60000, 'el código nuevo vuelve a durar 1 hora');
  for (let i = 0; i < 5; i++) await call('tel-codigo', { codigo: c2.codigo === '111111' ? '222222' : '111111' }, T2);
  r = await call('tel-codigo', { codigo: c2.codigo }, T2);
  ok(r.s === 429, 'tras 5 errores no deja probar más, ni con el código bueno');
  r = await call('tel-nuevo', {}, T2);
  r = await call(
    'tel-codigo',
    {
      codigo: db
        .prepare('SELECT codigo FROM tel_codigos WHERE usuario_id=(SELECT id FROM usuarios WHERE telefono=?)')
        .get('2477000992').codigo,
    },
    T2,
  );
  ok(r.s === 200, 'con un código nuevo se puede confirmar');
  // teléfono ajeno sin confirmar: se libera
  g = await reg('2477000994');
  r = await reg('2477000994');
  ok(r.s === 200, 'un teléfono sin confirmar se libera para su verdadero dueño');
  r = await reg('2477000990');
  ok(r.s === 409, 'un teléfono ya confirmado sigue siendo único (409)');
  // apagar
  r = await call('admin/ajuste', { clave: 'tel_on', valor: 0 }, '', AD);
  ok(r.s === 200, 'Gestión apaga la confirmación');
  g = await reg('2477000995');
  ok(g.d.confirmar === 0, 'apagada: el registro no pide código');
  r = await call('yo', null, g.d.token);
  ok(r.d.tel_pend === 0, 'apagada: entra directo');
  r = await call('pedidos', null, r && g.d.token);
  ok(!/confirmar/.test(r.d.error || ''), 'apagada: usa la app sin confirmar');
  const pend = await call('yo', null, (await call('login', { telefono: '2477000994', pin: '482913' })).d.token);
  ok(pend.d.tel_pend === 0, 'apagada: las cuentas que estaban esperando también pasan');
}
// v43: aviso al celu de Gestión cuando alguien se registra o pide un código nuevo
{
  const b64 = (u) => Buffer.from(u).toString('base64url');
  const kp = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign']);
  env.VAPID_PRIVATE = JSON.stringify(await crypto.subtle.exportKey('jwk', kp.privateKey));
  env.VAPID_PUBLIC = b64(await crypto.subtle.exportKey('raw', kp.publicKey));
  const ek = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']),
    sub = {
      endpoint: 'https://push.example/gestion-1',
      p256dh: b64(await crypto.subtle.exportKey('raw', ek.publicKey)),
      auth: b64(crypto.getRandomValues(new Uint8Array(16))),
    };
  const cap = [],
    f0 = globalThis.fetch;
  globalThis.fetch = async (u, o) =>
    String(u).startsWith('https://push.example')
      ? (cap.push({ u: String(u), o }), new Response('', { status: 201 }))
      : f0(u, o);
  const esp = () => new Promise((r) => setTimeout(r, 400));
  let r = await call('admin/push', sub);
  ok(r.s === 401, 'sin la clave de Gestión no se puede suscribir un celu');
  r = await call('admin/push', { ...sub, endpoint: 'http://malo' }, '', AD);
  ok(r.s === 400, 'suscripción inválida: se rechaza');
  r = await call('admin/push', sub, '', AD);
  ok(r.s === 200, 'Gestión activa los avisos en su celu');
  ok(
    db.prepare('SELECT COUNT(*) n FROM push_subs WHERE usuario_id=0').get().n === 1,
    'la suscripción queda guardada como de Gestión (usuario 0)',
  );
  r = await call('admin/inicio', null, '', AD);
  ok(
    r.d.avisos_n === 1 && r.d.push_ok === 1,
    'Gestión sabe que tiene 1 celu con avisos y que el servidor está configurado',
  );
  await call('admin/ajuste', { clave: 'tel_on', valor: 1 }, '', AD);
  const reg = (tel) =>
    call('registro', {
      tipo: 'trabajador',
      nombre: 'Aviso Prueba',
      barrio: 'Centro',
      telefono: tel,
      pin: '482913',
      acepto: 1,
      pregunta: '¿Cómo se llamaba tu primera mascota?',
      respuesta: 'Rocky Balboa',
    });
  let g = await reg('2477000996');
  await esp();
  ok(
    cap.length === 1 && cap[0].u === sub.endpoint && /^vapid t=/.test(cap[0].o.headers.authorization),
    'al registrarse alguien, se manda un aviso al celu de Gestión',
  );
  ok(
    cap[0].o.headers['content-encoding'] === 'aes128gcm' && cap[0].o.body && cap[0].o.body.length > 40,
    'el aviso va cifrado con el celu de Gestión',
  );
  r = await call('tel-nuevo', {}, g.d.token);
  await esp();
  ok(cap.length === 2, 'si pide un código nuevo, también avisa');
  await call('admin/ajuste', { clave: 'tel_on', valor: 0 }, '', AD);
  g = await reg('2477000997');
  await esp();
  ok(cap.length === 2, 'con la confirmación apagada no avisa (no hay nada que mandar)');
  globalThis.fetch = f0;
}

// v44: pregunta de seguridad propia y confirmación por WhatsApp apagada por defecto
{
  db.exec("DELETE FROM ajustes WHERE clave='tel_on'");
  let r = await call('admin/inicio', null, '', AD);
  ok(r.d.tel_on === 0, 'la confirmación por WhatsApp viene APAGADA por defecto');
  const reg = (tel, x = {}) =>
    call('registro', {
      tipo: 'cliente',
      nombre: 'Prueba Pregunta',
      barrio: 'Centro',
      telefono: tel,
      pin: '482913',
      acepto: 1,
      pregunta: '¿Cómo se llamaba tu escuela primaria?',
      respuesta: 'Escuela Nueve',
      ...x,
    });
  let g = await reg('2477000960');
  ok(
    g.s === 200 && g.d.confirmar === 0 && !g.d.recuperacion,
    'registro sin confirmar: entra directo y ya no devuelve código de recuperación',
  );
  r = await reg('2477000961', { pregunta: '' });
  ok(r.s === 400, 'sin pregunta: se rechaza');
  r = await reg('2477000961', { pregunta: '¿Cómo?' });
  ok(r.s === 400, 'pregunta de menos de 10 caracteres: se rechaza');
  r = await reg('2477000961', { pregunta: 'x'.repeat(81) });
  ok(r.s === 400, 'pregunta de más de 80 caracteres: se rechaza');
  r = await reg('2477000961', { respuesta: 'perro' });
  ok(r.s === 400, 'respuesta de menos de 6 letras: se rechaza');
  r = await reg('2477000961', { pregunta: '¿Cómo se llamaba tu primera mascota?', respuesta: 'primera mascota' });
  ok(r.s === 400 && /escrita en la pregunta/.test(r.d.error), 'la respuesta no puede estar en la pregunta');
  r = await reg('2477000961', { pregunta: '¿Dónde queda la escuela nueve de mi barrio?' });
  ok(r.s === 400 && /de la lista/.test(r.d.error), 'una pregunta que no está en la lista se rechaza');
  r = await reg('2477000961', { respuesta: 'abc1234' });
  ok(r.s === 400 && /8 letras/.test(r.d.error), 'una respuesta de 7 letras se rechaza (mínimo 8)');
  r = await reg('2477000961', { respuesta: 'aaaaaaaaaa' });
  ok(r.s === 400 && /fácil de adivinar/.test(r.d.error), 'una respuesta de una sola letra repetida se rechaza');
  r = await call('yo', null, g.d.token);
  ok(
    r.d.pregunta === '¿Cómo se llamaba tu escuela primaria?' &&
      !('resp_hash' in r.d) &&
      !('rec_hash' in r.d) &&
      !('pin_hash' in r.d),
    'yo muestra su pregunta y nunca los hashes',
  );
  const hs = db.prepare('SELECT resp_hash h FROM usuarios WHERE telefono=?').get('2477000960').h;
  ok(hs && !/escuela/i.test(hs), 'la respuesta se guarda con hash, no legible');
  // recuperar
  r = await call('recuperar-pregunta', { telefono: '2477000960' });
  ok(r.d.pregunta === '¿Cómo se llamaba tu escuela primaria?', 'Olvidé mi PIN: la app muestra su pregunta');
  const f1 = (await call('recuperar-pregunta', { telefono: '2477999999' })).d.pregunta,
    f2 = (await call('recuperar-pregunta', { telefono: '2477999999' })).d.pregunta;
  ok(
    f1 && f1 === f2,
    'un teléfono que no existe recibe una pregunta genérica siempre igual (no se sabe quién está registrado)',
  );
  r = await call('recuperar', { telefono: '2477000960', respuesta: 'Escuela Nueve', pin: '1234' });
  ok(r.s === 400, 'el PIN nuevo debe tener 6 números');
  r = await call('recuperar', { telefono: '2477000960', respuesta: 'otra cosa', pin: '777888' });
  ok(r.s === 401, 'respuesta equivocada: se rechaza');
  r = await call('recuperar', { telefono: '2477111111', respuesta: 'otra cosa', pin: '777888' });
  ok(
    r.s === 401 && r.d.error === 'La respuesta no es correcta',
    'un teléfono que no existe falla igual que una respuesta mala',
  );
  // bloqueos por conexión que se limpian al recuperar
  const lg = (ip, pin) => call('login', { telefono: '2477000960', pin }, '', { 'cf-connecting-ip': ip });
  for (let i = 0; i < 5; i++) await lg('6.6.6.6', '000000');
  r = await lg('6.6.6.6', '482913');
  ok(r.s === 429, 'esa conexión quedó bloqueada por errores de PIN');
  r = await call('recuperar', { telefono: '2477000960', respuesta: '  ESCUELA nuéve!! ', pin: '777888' });
  ok(r.s === 200 && !!r.d.token, 'recupera con la respuesta, sin importar mayúsculas, tildes ni signos');
  r = await call('yo', null, g.d.token);
  ok(r.s === 401, 'las sesiones anteriores quedan cerradas');
  r = await lg('6.6.6.6', '777888');
  ok(r.s === 200, 'al recuperar se borran los bloqueos por conexión: entra con el PIN nuevo');
  r = await lg('6.6.6.6', '482913');
  ok(r.s === 401, 'el PIN viejo ya no sirve');
  // bloqueo creciente de la recuperación, por teléfono
  const mal = async () => {
    let x;
    for (let i = 0; i < 5; i++)
      x = await call('recuperar', { telefono: '2477000960', respuesta: 'nada que ver', pin: '777888' });
    return x;
  };
  const salto = (ms) =>
    db.prepare("UPDATE limites SET creado=creado-? WHERE clave IN ('rf:2477000960','rb:2477000960')").run(ms);
  let x = await mal();
  ok(x.s === 401, '5 respuestas malas: la 5.ª todavía dice incorrecta');
  x = await call('recuperar', { telefono: '2477000960', respuesta: 'Escuela Nueve', pin: '777888' });
  ok(x.s === 429, 'bloqueada: ni con la respuesta buena (1 hora)');
  salto(61 * 60000);
  x = await mal();
  salto(0);
  x = await call('recuperar', { telefono: '2477000960', respuesta: 'Escuela Nueve', pin: '777888' });
  ok(x.s === 429 && /unas horas/.test(x.d.error), '2.º bloqueo: 6 horas (' + x.d.error + ')');
  salto(7 * 3600000);
  x = await mal();
  x = await call('recuperar', { telefono: '2477000960', respuesta: 'Escuela Nueve', pin: '777888' });
  ok(x.s === 429 && /un día/.test(x.d.error), '3.er bloqueo: 24 horas');
  // cuenta sin pregunta
  db.prepare("UPDATE usuarios SET pregunta='',resp_hash='' WHERE telefono='2477000960'").run();
  r = await call('recuperar-pregunta', { telefono: '2477000960' });
  ok(
    /^¿.+\?$/.test(r.d.pregunta) && r.d.pregunta !== '¿Cómo se llama mi gato?',
    'una cuenta sin pregunta muestra una genérica',
  );
  db.prepare("DELETE FROM limites WHERE clave LIKE 'r%:2477000960'").run();
  r = await call('recuperar', { telefono: '2477000960', respuesta: 'lo que sea', pin: '777888' });
  ok(r.s === 401, 'una cuenta sin pregunta no se puede recuperar así: hay que pedirle el cambio a Gestión');
  // cargar o cambiar la pregunta estando logueada
  const L = (await lg('5.5.5.5', '777888')).d.token;
  r = await call('pregunta', { pin: '000000', pregunta: '¿Cuál fue tu primer trabajo?', respuesta: 'Michifus1' }, L);
  ok(r.s === 401, 'cambiar la pregunta pide el PIN actual');
  r = await call('pregunta', { pin: '777888', pregunta: '¿Cuál fue tu primer trabajo?', respuesta: 'Michifus1' }, L);
  ok(r.s === 200, 'con el PIN bueno carga su pregunta');
  r = await call('admin/clientes', null, '', AD);
  const cu = r.d.find((c) => c.telefono === '2477000960');
  ok(
    cu && cu.pregunta === '¿Cuál fue tu primer trabajo?' && !('resp_hash' in cu),
    'Gestión ve la pregunta, nunca la respuesta',
  );
  r = await call('recuperar', { telefono: '2477000960', respuesta: 'michifus1', pin: '135790' });
  ok(r.s === 200, 'y se recupera con la respuesta nueva');
  // Gestión cambia el PIN: también limpia los bloqueos por conexión
  for (let i = 0; i < 5; i++) await lg('4.4.4.4', '000000');
  r = await lg('4.4.4.4', '135790');
  ok(r.s === 429, 'otra conexión bloqueada');
  r = await call('admin/reset-pin', { telefono: '2477000960', pin: '246810' }, '', AD);
  ok(r.s === 200, 'Gestión cambia el PIN');
  r = await lg('4.4.4.4', '246810');
  ok(r.s === 200, 'y esa conexión puede entrar enseguida con el PIN nuevo');
  r = await call('admin/clientes', null, '', AD);
  ok(
    JSON.stringify(r.d).indexOf('resp_hash') < 0 && JSON.stringify(r.d).indexOf('pin_hash') < 0,
    'las listas de Gestión no traen ningún hash',
  );
}
console.log('--- v75: teléfono, login y recuperación');
{
  const reg2 = (tel, x = {}) =>
    call('registro', {
      tipo: 'cliente',
      nombre: 'Prueba Telefono',
      barrio: 'Centro',
      telefono: tel,
      pin: '482913',
      acepto: 1,
      pregunta: '¿Cómo se llamaba tu escuela primaria?',
      respuesta: 'Escuela Nueve',
      ...x,
    });
  let r = await reg2('0 2477 15 555-970');
  ok(r.s === 200, 'el Worker acepta un teléfono escrito con 0 y 15');
  ok(
    db.prepare('SELECT telefono t FROM usuarios WHERE telefono=?').get('2477555970')?.t === '2477555970',
    'y lo guarda limpio (solo código de área + número)',
  );
  r = await call('login', { telefono: '+54 9 2477 555970', pin: '482913' });
  ok(r.s === 200, 'se entra con el teléfono escrito en otro formato');
  r = await reg2('2477555970');
  ok(r.s === 409, 'el mismo teléfono en otro formato cuenta como ya registrado');
  // login: no delata cuentas inexistentes ni suspendidas sin el PIN
  const susp = await reg2('2477555971');
  await call('admin/suspender', { telefono: '2477555971', on: 1 }, '', AD);
  const a = await call('login', { telefono: '2477555971', pin: '000000' });
  const b2 = await call('login', { telefono: '2477555999', pin: '000000' });
  ok(
    a.s === 401 && b2.s === 401 && a.d.error === b2.d.error,
    'suspendida con PIN malo y cuenta inexistente dan el mismo error',
  );
  const c = await call('login', { telefono: '2477555971', pin: '482913' });
  ok(c.s === 403 && /suspendida/.test(c.d.error), 'la suspensión solo se avisa a quien acierta el PIN');
  // un teléfono inexistente también se bloquea por conexión (igual que uno real)
  let bl = 0;
  for (let i = 0; i < 8; i++) {
    const x = await call('login', { telefono: '2477555998', pin: '111111' }, '', { 'cf-connecting-ip': '9.9.9.9' });
    if (x.s === 429) bl++;
  }
  let bl2 = 0;
  for (let i = 0; i < 8; i++) {
    const x = await call('login', { telefono: '2477555970', pin: '111111' }, '', { 'cf-connecting-ip': '9.9.9.8' });
    if (x.s === 429) bl2++;
  }
  ok(bl > 0 && bl === bl2, 'un teléfono inexistente se bloquea igual que uno real (' + bl + ' y ' + bl2 + ' bloqueos)');
  // recuperar: deja un aviso al dueño
  const rr = await call('recuperar', { telefono: '2477555970', respuesta: 'Escuela Nueve', pin: '246810' });
  ok(rr.s === 200, 'recuperar con la respuesta buena');
  await new Promise((r) => setTimeout(r, 50));
  const av = db
    .prepare(
      "SELECT COUNT(*) n FROM avisos WHERE usuario_id=(SELECT id FROM usuarios WHERE telefono='2477555970') AND texto LIKE '%Se cambió tu PIN%'",
    )
    .get();
  ok(av.n === 1, 'recuperar le deja un aviso al dueño (' + av.n + ')');
}

console.log('--- v75: permisos entre cuentas');
{
  const nuevo = async (nom, tel, tipo, rub) => {
    const x = await call('registro', {
      tipo,
      nombre: nom + ' Díaz',
      barrio: 'Centro',
      telefono: tel,
      pin: '123456',
      acepto: 1,
      pregunta: '¿Cómo se llamaba tu primera mascota?',
      respuesta: 'Rocky Balboa',
    });
    const t = x.d.token;
    await call('perfil-foto', { foto: JP }, t);
    if (rub) await call('perfil', { nombre: nom + ' Díaz', barrio: 'Centro', rubros: [rub], bio: '' }, t);
    return t;
  };
  const A = await nuevo('Ana', '2477600001', 'cliente'),
    B = await nuevo('Beto', '2477600002', 'cliente'),
    W1 = await nuevo('Walter', '2477600003', 'trabajador', 'Pintura'),
    W2 = await nuevo('Wanda', '2477600004', 'trabajador', 'Pintura');
  await call('pedidos', { titulo: 'Pintar el frente de la casa', rubro: 'Pintura', barrio: 'Centro' }, A);
  const mp = await call('mis-pedidos', null, A);
  const pid = mp.d[0].id;
  let r = await call('pedidos/' + pid + '/postular', { mensaje: 'Yo lo hago' }, W1);
  ok(r.s === 200, 'el trabajador se postula');
  const post = (await call('mis-pedidos', null, A)).d[0].post[0].id;

  // sin sesión no se entra a nada privado
  for (const ruta of ['yo', 'mis-pedidos', 'mis-postulaciones', 'avisos'])
    ok((await call(ruta, null, '')).s === 401, 'sin sesión: ' + ruta + ' pide iniciar sesión');
  ok(
    (await call('pedidos', { titulo: 'Hola hola', rubro: 'Pintura', barrio: 'Centro' }, '')).s === 401,
    'sin sesión no se publica un pedido',
  );
  ok((await call('yo', null, 'token-inventado')).s === 401, 'un token inventado no sirve');

  // el cliente B no puede tocar el pedido de A
  for (const acc of ['cancelar', 'editar', 'hecha', 'eliminar', 'renovar', 'reabrir', 'puntuar']) {
    r = await call('pedidos/' + pid + '/' + acc, { titulo: 'Cambiado por otro', rubro: 'Pintura', estrellas: 5 }, B);
    ok(r.s === 403, 'otro cliente no puede "' + acc + '" un pedido ajeno (' + r.s + ')');
  }
  // ni elegir ni descartar propuestas de un pedido ajeno
  for (const acc of ['elegir', 'descartar']) {
    r = await call('postulaciones/' + post + '/' + acc, {}, B);
    ok(r.s === 404, 'otro cliente no puede "' + acc + '" una propuesta ajena (' + r.s + ')');
  }
  for (const acc of ['elegir', 'descartar']) {
    r = await call('postulaciones/' + post + '/' + acc, {}, W2);
    ok(r.s === 404, 'un trabajador no puede "' + acc + '" propuestas (' + r.s + ')');
  }
  // un trabajador no toca la postulación de otro trabajador
  for (const acc of ['retirar', 'ocultar']) {
    r = await call('postulaciones/' + post + '/' + acc, {}, W2);
    ok(r.s === 404, 'otro trabajador no puede "' + acc + '" mi postulación (' + r.s + ')');
  }
  // el pedido de A sigue intacto
  const pa = db.prepare('SELECT estado,titulo FROM pedidos WHERE id=?').get(pid);
  ok(
    pa.estado === 'abierta' && pa.titulo === 'Pintar el frente de la casa',
    'tras todos esos intentos el pedido sigue abierto y sin cambios',
  );
  ok(
    db.prepare('SELECT estado FROM postulaciones WHERE id=?').get(post).estado === 'activa',
    'y la propuesta sigue activa',
  );

  // teléfonos: nadie los ve hasta que el cliente elige
  const verTel = async (tk) =>
    JSON.stringify([
      (await call('pedidos', null, tk)).d,
      (await call('trabajadores', null, tk)).d,
      (await call('directorio', null, tk)).d,
    ]);
  ok(
    !(await verTel(W2)).includes('2477600001'),
    'un trabajador cualquiera no ve el teléfono del cliente en las listas',
  );
  ok(!(await verTel(B)).includes('2477600003'), 'un cliente cualquiera no ve el teléfono del trabajador en las listas');
  ok(
    !JSON.stringify((await call('mis-pedidos', null, A)).d).includes('2477600003'),
    'el cliente no ve el teléfono del postulante antes de elegirlo',
  );
  ok(
    !JSON.stringify((await call('mis-postulaciones', null, W1)).d).includes('2477600001'),
    'el postulante no ve el teléfono del cliente antes de ser elegido',
  );
  await call('postulaciones/' + post + '/elegir', {}, A);
  ok(
    JSON.stringify((await call('mis-pedidos', null, A)).d).includes('2477600003'),
    'al elegirlo, el cliente sí ve el teléfono del trabajador',
  );
  ok(
    JSON.stringify((await call('mis-postulaciones', null, W1)).d).includes('2477600001'),
    'y el trabajador elegido ve el del cliente',
  );
  ok(
    !JSON.stringify((await call('mis-postulaciones', null, W2)).d).includes('2477600001') &&
      !(await verTel(W2)).includes('2477600003'),
    'pero otro trabajador sigue sin verlos',
  );

  // la respuesta de yo no trae datos de otros ni hashes
  const yo = (await call('yo', null, B)).d;
  ok(
    !('pin_hash' in yo) && !('resp_hash' in yo) && !('rec_hash' in yo) && !JSON.stringify(yo).includes('2477600001'),
    'yo no trae hashes ni datos de otras cuentas',
  );

  // fotos: sin la clave al azar no se pueden recorrer
  const fid = db.prepare('SELECT usuario_id u,k FROM perfil_fotos LIMIT 1').get();
  ok(
    (await call('pfoto/' + fid.u + '?v=mala', null, '')).s === 404,
    'una foto de perfil con la clave equivocada da 404',
  );
  ok((await call('pfoto/' + fid.u, null, '')).s === 404, 'y sin clave también');

  // Gestión
  ok((await call('admin/inicio', null, '')).s === 401, 'Gestión sin clave da 401');
  ok(
    (await call('admin/inicio', null, '', { 'x-admin-key': 'otra' })).s === 401,
    'Gestión con clave equivocada da 401',
  );
  ok((await call('admin/clientes', null, A)).s === 401, 'un token de usuario no abre Gestión');

  // cuenta suspendida: la sesión que ya tenía deja de servir
  await call('admin/suspender', { telefono: '2477600004', on: 1 }, '', AD);
  ok((await call('yo', null, W2)).s === 401, 'una cuenta suspendida pierde su sesión al instante');
  // borrar la cuenta pide el PIN
  r = await call('cuenta-borrar', { pin: '000000' }, B);
  ok(
    r.s >= 400 && db.prepare("SELECT COUNT(*) n FROM usuarios WHERE telefono='2477600002'").get().n === 1,
    'borrar la cuenta con un PIN malo no la borra',
  );
}

console.log('--- v75: archivos de la app');
{
  const ix = fs.readFileSync(new URL('public/index.html', R), 'utf8');
  const sw = fs.readFileSync(new URL('public/sw.js', R), 'utf8');
  const srcs = [...ix.matchAll(/<script src="([^"]+)"><\/script>/g)].map((m) => m[1]);
  ok(
    srcs.length > 10 && srcs.every((f) => fs.existsSync(new URL('public/' + f, R))),
    'todos los scripts de index.html existen (' + srcs.length + ')',
  );
  const falta = srcs.filter((f) => !sw.includes("'" + f + "'"));
  ok(
    falta.length === 0,
    'todos los scripts de index.html están en la caché del service worker' +
      (falta.length ? ': faltan ' + falta.join(', ') : ''),
  );
  ok(!ix.includes('<script>'), 'index.html no tiene scripts escritos adentro (la CSP no los deja)');
  ok(
    srcs.indexOf('reglas.js') > -1 && srcs.indexOf('reglas.js') < srcs.indexOf('app/base.js'),
    'reglas.js se carga antes que la app',
  );
}

if (fallas) {
  console.log('\n' + fallas + ' fallas');
  process.exitCode = 1;
} else console.log('\nTodo bien');
