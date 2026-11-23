// Prueba de Emprendimientos y fotos de locales (v88). Uso: node tools/probar-emprendimientos.mjs
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

const AD = { 'x-admin-key': 'clave', 'cf-connecting-ip': '8.8.8.8' };
let r = await call('admin/local', { nombre: 'Tortas Lu', rubro: 'Panadería y pastelería', tipo: 'emprendimiento', telefono: '2477123456', whatsapp: true }, '', AD);
ok(r.s === 200, 'crear emprendimiento con rubro de emprendimientos');
r = await call('admin/local', { nombre: 'Mal', rubro: 'Ferreterías', tipo: 'emprendimiento' }, '', AD);
ok(r.s === 400, 'emprendimiento con rubro de local se rechaza');
r = await call('admin/local', { nombre: 'Ferretería Sur', rubro: 'Ferreterías' }, '', AD);
ok(r.s === 200, 'sin tipo queda como local');
r = await call('admin/locales?q=Tortas', null, '', AD);
const e = r.d.find((x) => x.nombre === 'Tortas Lu');
ok(e && e.tipo === 'emprendimiento', 'Gestión ve el tipo');
r = await call('admin/local-foto', { id: e.id, rol: 'perfil', foto: JP }, '', AD);
ok(r.s === 200, 'subir foto de perfil');
r = await call('admin/local-foto', { id: e.id, rol: 'perfil', foto: JP }, '', AD);
r = await call('admin/local-fotos?id=' + e.id, null, '', AD);
ok(r.d.filter((x) => x.rol === 'perfil').length === 1, 'la foto de perfil se reemplaza (queda 1)');
let st = [];
for (let i = 0; i < 6; i++) st.push((await call('admin/local-foto', { id: e.id, rol: 'muestra', foto: JP }, '', AD)).s);
ok(st.slice(0, 5).every((x) => x === 200) && st[5] === 400, '5 fotos de muestra sí, la sexta se rechaza');
r = await call('admin/local-foto', { id: e.id, rol: 'muestra', foto: 'data:image/png;base64,AAAA' }, '', AD);
ok(r.s === 400, 'solo JPEG');
r = await call('admin/local-foto', { id: 99999, rol: 'perfil', foto: JP }, '', AD);
ok(r.s === 404, 'local inexistente');
const { sha } = await import(new URL('src/comun.js', R));
db.prepare("INSERT INTO usuarios(tipo,nombre,telefono,pin_hash,rec_hash,creado) VALUES('cliente','Cli Prueba','2477000111','x','x',1)").run();
db.prepare('INSERT INTO sesiones(token,usuario_id,vence) VALUES(?,?,?)').run(await sha('tok'), 1, Date.now() + 864e5);
r = await call('locales', null, 'tok');
const pub = Array.isArray(r.d) && r.d.find((x) => x.nombre === 'Tortas Lu');
ok(r.s === 200, 'GET locales status ' + r.s);
ok(pub && pub.tipo === 'emprendimiento' && /^\d+\.[0-9a-f]{16}$/.test(pub.fp) && pub.fm.split(',').length === 5, 'público: tipo, 1 foto de perfil y 5 de muestra');
r = await call('lfoto/' + pub.fp);
ok(r.s === 200, 'lfoto se sirve con su clave');
r = await call('lfoto/' + pub.fp.split('.')[0] + '.00000000');
ok(r.s === 404, 'lfoto con clave mala da 404');
r = await call('admin/local-foto-borrar', { id: +pub.fm.split(',')[0].split('.')[0] }, '', AD);
r = await call('admin/local-fotos?id=' + e.id, null, '', AD);
ok(r.d.filter((x) => x.rol === 'muestra').length === 4, 'borrar una foto de muestra');
r = await call('admin/local-borrar', { id: e.id }, '', AD);
ok(db.prepare('SELECT COUNT(*) n FROM local_fotos WHERE local_id=?').get(e.id).n === 0, 'borrar el local borra sus fotos');
// Insignia Donador: la marca Gestión a mano
r = await call('admin/donador', { telefono: '2477000111', on: 1 }, '', AD);
ok(r.s === 200 && db.prepare('SELECT donador d FROM usuarios WHERE id=1').get().d === 1, 'Gestión marca Donador');
r = await call('yo', null, 'tok');
ok(r.d && r.d.donador === 1, 'la cuenta ve su propio Donador en /yo');
r = await call('admin/clientes', null, '', AD);
ok(Array.isArray(r.d) && r.d.find((x) => x.telefono === '2477000111')?.donador === 1, 'Gestión lista el Donador');
r = await call('admin/donador', { telefono: '2477000111', on: 0 }, '', AD);
ok(db.prepare('SELECT donador d FROM usuarios WHERE id=1').get().d === 0, 'Gestión quita Donador');
r = await call('admin/donador', { telefono: '0000', on: 1 }, '', AD);
ok(r.s === 404, 'Donador a una cuenta que no existe da 404');
console.log(fallas ? fallas + ' fallas' : 'Todo bien');
process.exit(fallas ? 1 : 0);
