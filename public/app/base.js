/* Base de la app: tema, ayudas generales, estado, set() y api(). Se carga como script común, en este orden (ver index.html); comparte las variables con los demás archivos de app/. */
const $ = (s) => document.querySelector(s);
// Tema: Automático (como el celular), Claro u Oscuro. Se guarda en localStorage.tema
const TEMAS = [
  ['auto', 'Automático (como tu celular)'],
  ['claro', 'Claro'],
  ['oscuro', 'Oscuro'],
];
const temaPref = () => localStorage.getItem('tema') || 'oscuro';
const temaAplicar = () => {
  const p = temaPref(),
    d = p === 'oscuro' || (p === 'auto' && matchMedia('(prefers-color-scheme:dark)').matches);
  document.documentElement.dataset.tema = d ? 'dark' : 'light';
  const m = document.querySelector('meta[name=theme-color]');
  if (m) m.content = d ? '#080b14' : '#f2f2f7';
};
try {
  matchMedia('(prefers-color-scheme:dark)').addEventListener('change', temaAplicar);
} catch (e) {}
temaAplicar();
// "Otros" con lo que la persona especificó: "Otros: reparación de bicis"
const rbl = (r, o) => (r === 'Otros' && o ? 'Otros: ' + o : r);
const RUB = REGLAS.RUBROS; // las reglas y listas compartidas viven en reglas.js
let T = localStorage.getItem('t') || '',
  me = null,
  tab = '',
  tipo = '', // rol que se está eligiendo en el registro: arranca sin nada elegido
  fr = '',
  fb = '',
  LC = [],
  LP = [],
  fl = '',
  lt = 'local',
  fm = '',
  fq = '',
  OP = new Set(),
  mr = true,
  pg = 1,
  CUPO = null;
const esc = (s) =>
  String(s ?? '').replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
  );
const wa = (t) => 'https://wa.me/' + (t.startsWith('54') ? t : '549' + t);
const star = (p, n) =>
  p
    ? `<span class="y">${STAR} ${p}</span> <span class="s">(${n} ${n === 1 ? 'trabajo' : 'trabajos'})</span>`
    : '<span class="s">Sin trabajos todavía</span>';
const alOculto = () => {
  try {
    return Date.now() - (+localStorage.getItem('xal') || 0) < 6048e5;
  } catch (e) {
    return false;
  }
};
const ios = () =>
  /iPad|iPhone|iPod/.test(navigator.userAgent) && !navigator.standalone
    ? '<div class="card"><b>Instalá Dicho y Hecho</b><p class="s">Para recibir avisos en iPhone: tocá Compartir, después "Agregar a inicio de pantalla" y abrí la app desde el ícono.</p></div>'
    : '';
const th = (f, k = 'foto') =>
  f
    ? `<div class="ph">${String(f)
        .split(',')
        .map(
          (i) =>
            `<img src="/api/${k}/${i}" data-a="zoom" data-u="/api/${k}/${i}" loading="lazy" alt="Foto, tocá para ampliar">`,
        )
        .join('')}</div>`
    : '';
const comp = (file) =>
  new Promise((res) => {
    const i = new Image();
    i.onload = () => {
      const k = Math.min(1, 800 / Math.max(i.width, i.height)),
        c = document.createElement('canvas');
      c.width = i.width * k;
      c.height = i.height * k;
      c.getContext('2d').drawImage(i, 0, 0, c.width, c.height);
      res(c.toDataURL('image/jpeg', 0.7));
    };
    i.src = URL.createObjectURL(file);
  });
const val = (id) => ($('#' + id)?.value || '').trim();
// v85: en PC (1100 px o más) el cliente ve el layout de escritorio: menú lateral, barra superior con buscador y un Inicio tipo panel (app/escritorio.js)
const PCW = matchMedia('(min-width:1100px)');
const nv0 = () => {
  document.body.classList.remove('shell');
  document.querySelector('header .tbs')?.remove();
  $('#nav').className = '';
  $('#nav').innerHTML = '';
  $('#bell').hidden = true;
  $('#fab').hidden = true;
  const nt = $('#ntf');
  if (nt) {
    nt.hidden = true;
    nt.innerHTML = '';
  }
};
/* v55: en pantallas anchas (900 px o más) las pantallas con lista se arman en 2 paneles: filtros a la izquierda y resultados a la derecha.
   En celu y tablet vertical no se toca nada. Se arma al dibujar la pantalla, así que no cambia ninguna otra función. */
const DKM = matchMedia('(min-width:900px)'),
  DKT = ['feed', 'dir', 'mis', 'loc'];
function dkWrap() {
  const v = $('#v');
  v.classList.remove('dk');
  document.body.dataset.t = tab || '';
  if (!DKM.matches || !DKT.includes(tab)) return;
  const ch = [...v.children],
    i = ch.findIndex((e) => e.matches('#fres,#dres,.cas') || (tab === 'loc' && e.matches('article.card')));
  if (i < 1) return;
  const a = document.createElement('aside'),
    m = document.createElement('section');
  a.className = 'dk-side';
  m.className = 'dk-main';
  ch.forEach((e, k) => (k < i ? a : m).appendChild(e));
  v.append(a, m);
  v.classList.add('dk');
}
const set = (h) => {
  $('#v').innerHTML = h;
  dkWrap();
};
DKM.addEventListener('change', () => {
  if (me && DKT.includes(tab)) home();
});
async function api(p, b, k) {
  const r = await fetch('/api/' + p, {
    method: b ? 'POST' : 'GET',
    headers: { 'content-type': 'application/json', authorization: 'Bearer ' + T, 'x-admin-key': k || '' },
    body: b ? JSON.stringify(b) : undefined,
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.error || 'Error');
  return d;
}
