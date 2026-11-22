// Prueba la insignia Pionero contra el Worker real y SQLite con el schema real. Uso: node tools/probar-pionero.mjs
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
const reg = (nombre, tel, tipo = 'trabajador') =>
  call('registro', {
    tipo,
    nombre,
    barrio: 'Centro',
    telefono: tel,
    pin: '123456',
    acepto: 1,
    pregunta: '¿Cómo se llamaba tu primera mascota?',
    respuesta: 'Rocky Balboa',
  });
const pio = (id) => db.prepare('SELECT pionero p FROM usuarios WHERE id=?').get(id).p;
const total = () => db.prepare('SELECT COUNT(*) n FROM usuarios WHERE pionero=1').get().n;

// 1) las primeras cuentas salen marcadas y `yo` lo informa
let r = await reg('Beto Gómez', '2477000002');
const T = r.d.token;
ok(!!T && pio(1) === 1, 'la primera cuenta es Pionero');
r = await call('yo', null, T);
ok(r.d.pionero === 1, 'yo devuelve pionero=1');
r = await reg('Ana Pérez', '2477000001', 'cliente');
const C = r.d.token;
ok(pio(2) === 1, 'un cliente también es Pionero');

// 1b) el cartelito sale una sola vez: `yo` informa pionero_visto y el aviso lo marca
r = await call('yo', null, T);
ok(r.d.pionero_visto === 0, 'al principio no vio el cartelito');
r = await call('pionero-visto', {}, T);
ok(r.s === 200, 'marca el cartelito como visto');
r = await call('yo', null, T);
ok(r.d.pionero_visto === 1, 'yo devuelve pionero_visto=1');

// 2) lo ven los demás: perfil público, listado del directorio y autor del pedido en el feed
r = await call('trabajadores/1', null, C);
ok(r.s === 200 && r.d.pio === 1, 'perfil público del trabajador trae pio=1: ' + r.s);
r = await call('directorio', null, C);
ok(r.s === 200 && r.d.items.length > 0 && r.d.items.every((x) => x.pio === 1), 'listado del directorio trae pio=1');
r = await call('pedidos', { titulo: 'Pintar pared', rubro: 'Pintura', barrio: 'Centro' }, C);
const pid = r.d && (r.d.id || (r.d.pedido && r.d.pedido.id));
r = await call('pedidos', null, T);
const it = (r.d.items || r.d).find && (r.d.items || r.d).find((x) => x.cid === 2);
ok(it && it.pio === 1, 'el feed trae pio=1 del autor del pedido');

// 3) el límite: con 49 marcadas, la cuenta 50 es Pionero y la 51 no
const falta = 49 - total();
for (let i = 0; i < falta; i++)
  db.prepare("INSERT INTO usuarios(tipo,nombre,telefono,pin_hash,rec_hash,pionero,creado) VALUES('cliente','Relleno Uno',?,'x','x',1,1)").run('99' + i);
ok(total() === 49, 'quedan 49 Pioneros: ' + total());
r = await reg('Cuenta Cincuenta', '2477000050');
ok(pio(r && db.prepare("SELECT id FROM usuarios WHERE telefono='2477000050'").get().id) === 1 && total() === 50, 'la cuenta 50 es Pionero');
r = await reg('Cuenta Cincuenta Y Uno', '2477000051');
ok(pio(db.prepare("SELECT id FROM usuarios WHERE telefono='2477000051'").get().id) === 0 && total() === 50, 'la cuenta 51 NO es Pionero');

// 3b) si una cuenta Pionero se elimina, libera su lugar y pasa a la siguiente
const t50 = (await reg('Cuenta Cincuenta Dos', '2477000052')).d.token; // la 52: sin insignia (hay 50)
const id52 = db.prepare("SELECT id FROM usuarios WHERE telefono='2477000052'").get().id;
ok(pio(id52) === 0, 'la cuenta 52 todavía no es Pionero');
const id50 = db.prepare("SELECT id FROM usuarios WHERE telefono='2477000050'").get().id;
const tk50 = (await call('login', { telefono: '2477000050', pin: '123456' })).d.token;
r = await call('cuenta-borrar', { pin: '123456' }, tk50);
ok(r.s === 200 && pio(id50) === 0 && total() === 49, 'al eliminar una cuenta Pionero se libera el lugar: ' + total());
r = await reg('Cuenta Cincuenta Tres', '2477000053');
ok(pio(db.prepare("SELECT id FROM usuarios WHERE telefono='2477000053'").get().id) === 1 && total() === 50, 'la siguiente en registrarse toma el lugar');

// 4) la migración sobre una base vieja (sin la columna): 37 cuentas reales + 2 eliminadas + 1 suspendida
const vieja = new DatabaseSync(':memory:');
vieja.exec(
  fs
    .readFileSync(new URL('schema.sql', R), 'utf8')
    .replace(',pionero INTEGER NOT NULL DEFAULT 0,pionero_visto INTEGER NOT NULL DEFAULT 0', ''),
);
const ins = vieja.prepare("INSERT INTO usuarios(tipo,nombre,telefono,pin_hash,rec_hash,suspendido,creado) VALUES('cliente','X Y',?,'x','x',?,1)");
for (let i = 0; i < 37; i++) ins.run('24770' + i, 0);
ins.run('eliminada-38', 1);
ins.run('eliminada-39', 1);
ins.run('2477099', 1);
vieja.exec(fs.readFileSync(new URL('migracion-pionero.sql', R), 'utf8'));
const mig = vieja.prepare('SELECT COUNT(*) n FROM usuarios WHERE pionero=1').get().n;
ok(mig === 37, 'migración: marca las 37 cuentas reales (y no las eliminadas ni la suspendida): ' + mig);

console.log(fallas ? '\n' + fallas + ' FALLAS' : '\nTodo bien');
process.exit(fallas ? 1 : 0);
