/* Íconos, ilustraciones, selectores y piezas de pantalla. Se carga como script común, en este orden (ver index.html); comparte las variables con los demás archivos de app/. */
// QR de un local: se guarda de dónde vino la persona (solo el código del local) y se cuenta una visita por sesión
function origen() {
  const sp = new URLSearchParams(location.search),
    c = sp.get('o'),
    rf = (sp.get('r') || '').toUpperCase();
  if (/^[A-HJKMNP-Z2-9]{6}$/.test(rf)) {
    try {
      localStorage.setItem('r', rf);
    } catch (e) {}
  }
  if (!c && !sp.get('r')) return;
  if (c && /^[a-f0-9]{6}$/.test(c)) {
    try {
      localStorage.setItem('o', c);
      if (!sessionStorage.getItem('ov')) {
        sessionStorage.setItem('ov', '1');
        api('origen', { c }).catch(() => {});
      }
    } catch (e) {}
  }
  history.replaceState(null, '', location.pathname + location.hash);
}
async function init() {
  origen();
  if (location.hash === '#gestion') return gestion();
  if (T) {
    try {
      me = await api('yo');
    } catch {
      T = '';
      localStorage.removeItem('t');
    }
  }
  if (location.hash === '#novedades') tab = 'nov';
  me ? home() : auth('land');
}
const sv = (p) =>
  `<svg class="ri" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
const svf = (p) =>
  `<svg class="ri" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
const PSTAR = '<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>';
const STAR = svf(PSTAR),
  STAR0 = sv(PSTAR);
const X = {
  chk: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  flag: '<path d="M5 21V4M5 4h12l-2.5 4 2.5 4H5"/>',
  pin: '<path d="M12 21s-7-6-7-11a7 7 0 0 1 14 0c0 5-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/>',
  clk: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  key: '<circle cx="8" cy="15" r="4.5"/><path d="M11.2 11.8L20 3M16.5 6.5l3 3"/>',
  srch: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>',
  list: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 8h6M9 12h6M9 16h4"/>',
  send: '<path d="M22 2L11 13M22 2l-7 20-4-9-9-4z"/>',
  pen: '<path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
  uchk: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M16 11l2 2 4-4"/>',
};
const XX = {
  cam: '<path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  expand: '<path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
};
Object.assign(X, XX);
const fpick = (id, max) =>
  `<div class="fp" data-max="${max}"><input id="${id}" type="file" accept="image/*" multiple hidden><button type="button" class="btn g">${sv(X.cam)} <span>Agregar fotos</span></button><span class="s fpn"></span><div class="fpv"></div></div>`;
const fpr = (fp) => {
  const i = fp.querySelector('input'),
    max = +fp.dataset.max;
  let fs = [...i.files];
  if (fs.length > max) {
    fs = fs.slice(0, max);
    const dt = new DataTransfer();
    fs.forEach((f) => dt.items.add(f));
    i.files = dt.files;
  }
  const v = fp.querySelector('.fpv');
  v.innerHTML = fs
    .map(
      (f, k) =>
        `<div class="fpi"><img alt="Foto ${k + 1}"><button type="button" data-i="${k}" aria-label="Quitar esta foto">${sv(X.x)}</button></div>`,
    )
    .join('');
  fs.forEach((f, k) => {
    const r = new FileReader();
    r.onload = () => {
      const im = v.querySelectorAll('img')[k];
      if (im) im.src = r.result;
    };
    r.readAsDataURL(f);
  });
  fp.querySelector('.fpn').textContent = fs.length ? fs.length + ' de ' + max : '';
  fp.querySelector('button span').textContent = fs.length ? 'Cambiar fotos' : 'Agregar fotos';
};
document.addEventListener('click', (e) => {
  const b = e.target.closest('.fp>button');
  if (b) {
    b.parentNode.querySelector('input').click();
    return;
  }
  const x = e.target.closest('.fpv button');
  if (x) {
    const fp = x.closest('.fp'),
      i = fp.querySelector('input'),
      k = +x.dataset.i,
      dt = new DataTransfer();
    [...i.files].forEach((f, j) => {
      if (j !== k) dt.items.add(f);
    });
    i.files = dt.files;
    fpr(fp);
  }
});
document.addEventListener('change', (e) => {
  if (e.target.matches && e.target.matches('.fp input')) fpr(e.target.closest('.fp'));
  // Rubro "Otros": aparece el campo para decir cuál es
  if (e.target.id === 'ru' || e.target.id === 'd_ru') {
    const w = $(e.target.id === 'ru' ? '#ro_w' : '#d_ro_w');
    if (w) {
      w.hidden = e.target.value !== 'Otros';
      if (!w.hidden) w.querySelector('input').focus();
    }
  }
});
const IC = {
  Albañilería: sv(
    '<rect x="3" y="4" width="18" height="16" rx="1.5"/><path d="M3 9.3h18M3 14.7h18M9 4v5.3M15 9.3v5.4M9 14.7V20"/>',
  ),
  Pintura: sv(
    '<rect x="3" y="3" width="15" height="6" rx="1.5"/><path d="M18 6h2.5a.5.5 0 0 1 .5.5V11a1 1 0 0 1-1 1h-8v3"/><rect x="10" y="15" width="4" height="6" rx="1"/>',
  ),
  Plomería: sv(
    '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>',
  ),
  Electricidad: sv('<path d="M13 2 3 14h9l-1 8 10-12h-9z"/>'),
  Jardinería: sv(
    '<path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10z"/><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/>',
  ),
  Herrería: sv('<path d="M3 7h14a4 4 0 0 1-4 4h-1v3h3v3H6v-3h3v-3H7a4 4 0 0 1-4-4z"/>'),
  Carpintería: sv('<path d="M4 3v18h18v-5H9V3z"/><path d="M9 8H6M9 12H6M13 16v3M17 16v3"/>'),
  Limpieza: sv('<path d="M12 2.7l5.7 5.7a8 8 0 1 1-11.4 0z"/>'),
  'Fletes y mudanzas': sv(
    '<rect x="1" y="4" width="14" height="12" rx="1"/><path d="M15 8h4l3 3.5V16h-7z"/><circle cx="5.5" cy="18.5" r="2"/><circle cx="18" cy="18.5" r="2"/>',
  ),
  Gasista: sv(
    '<path d=\"M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.07-2.14-.22-4.05 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.15.43-2.29 1-3a2.5 2.5 0 0 0 2.5 2.5z\"/>',
  ),
  'Aire acondicionado y refrigeración': sv(
    '<path d=\"M2 12h20M12 2v20M20 16l-4-4 4-4M4 8l4 4-4 4M16 4l-4 4-4-4M8 20l4-4 4 4\"/>',
  ),
  Cerrajería: sv('<circle cx=\"7.5\" cy=\"15.5\" r=\"4.5\"/><path d=\"M10.7 12.3L21 2M17 6l3 3M14 9l2 2\"/>'),
  'Service de electrodomésticos': sv(
    '<rect x=\"4\" y=\"2\" width=\"16\" height=\"20\" rx=\"2\"/><circle cx=\"12\" cy=\"14\" r=\"5\"/><path d=\"M8 6h.01M12 6h4\"/>',
  ),
  'Techos y zinguería': sv(
    '<path d=\"M2.5 12L12 3.5 21.5 12\"/><path d=\"M5 10.5V20h14v-9.5\"/><path d=\"M9.5 20v-5h5v5\"/>',
  ),
  Informática: sv(
    '<rect x="4" y="4" width="16" height="11" rx="1.5"/><path d="M2 19h20M9 15v4M15 15v4"/>',
  ),
  'Reparación de celulares': sv('<rect x="6" y="2" width="12" height="20" rx="2.5"/><path d="M11 18h2"/>'),
  'Lavadero y estética vehicular': sv(
    '<path d="M19 17h2a1 1 0 0 0 1-1v-3a2 2 0 0 0-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3A3 3 0 0 0 12 7H5a1.5 1.5 0 0 0-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4a1 1 0 0 0 1 1h2"/><circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/>',
  ),
  'Clases y cuidados': sv(
    '<path d=\"M12 20.5s-8-4.7-8-10.6A4.4 4.4 0 0 1 12 7.2a4.4 4.4 0 0 1 8 2.7c0 5.9-8 10.6-8 10.6z\"/>',
  ),
  'Publicidad y diseño': sv(
    '<path d="m3 11 18-5v12L3 14v-3z"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/>',
  ),
  Otros: sv('<path d="M12 3l2 6 6 2-6 2-2 6-2-6-6-2 6-2z"/>'),
};
let MZ = { cnt: {}, sel: '', k: 1, cx: 0, cy: 0, mv: 0, ent: 0, glow: 0, shown: 0 };
const barSel = (id, v, req) =>
  `<select id="${id}"><option value="">${req ? 'Elegí tu barrio' : 'Barrio (opcional)'}</option>${[...new Set([...BARRIOS, ...(v ? [v] : [])])].map((b) => `<option ${b === v ? 'selected' : ''}>${esc(b)}</option>`).join('')}</select>`;
const ST = {
  abierta: 'Abierto',
  elegida: 'En marcha',
  hecha: 'Terminado',
  vencida: 'Vencido',
  cancelada: 'Cancelado',
  activa: 'Enviada',
  descartada: 'Descartada',
};
const ago = (t) => {
  const m = Math.max(1, Math.round((Date.now() - t) / 6e4));
  return m < 60 ? `hace ${m} min` : m < 1440 ? `hace ${Math.round(m / 60)} h` : `hace ${Math.round(m / 1440)} d`;
};
const skel = () => '<div class="sk"></div>'.repeat(3);
// Ilustraciones de marca (SVG propios, sin emojis) para estados vacíos y guía. Colores por clases: ver .il en app.css
const il = (b) => '<svg class="il" viewBox="0 0 160 120" aria-hidden="true">' + b + '</svg>';
const ILB = '<circle class="c" cx="80" cy="58" r="46"/>';
const ILU = {
  busq: il(
    ILB +
      '<path class="b" d="M122 18l3 8 8 3-8 3-3 8-3-8-8-3 8-3z"/><circle class="w" cx="72" cy="54" r="26"/><circle class="k" cx="72" cy="54" r="26" style="stroke-width:6"/><path class="k" d="M92 74l20 20" style="stroke-width:9"/><path class="k" d="M60 50a13 13 0 0 1 10-9" style="stroke:var(--ye);stroke-width:4"/><circle class="b" cx="28" cy="40" r="4"/><circle class="a" cx="132" cy="84" r="3.5"/>',
  ),
  lista: il(
    ILB +
      '<rect class="w" x="46" y="24" width="68" height="84" rx="10"/><rect class="k" x="46" y="24" width="68" height="84" rx="10"/><rect class="a" x="62" y="15" width="36" height="17" rx="7"/><circle class="b" cx="62" cy="52" r="6"/><path class="g" d="M76 52h24M76 70h24M76 88h16"/><circle class="c" cx="62" cy="70" r="6"/><circle class="c" cx="62" cy="88" r="6"/><path class="b" d="M130 28l2.5 6 6 2.5-6 2.5-2.5 6-2.5-6-6-2.5 6-2.5z"/>',
  ),
  envio: il(
    ILB +
      '<path class="a" d="M32 62L128 28 82 72z"/><path class="a2" d="M82 72L128 28 98 96z"/><path class="b" d="M82 72l6 22 10 2z"/><path class="k" d="M18 92c14 0 16-10 30-10" style="stroke:var(--ye);stroke-dasharray:2 8;stroke-width:4"/><circle class="b" cx="132" cy="84" r="4"/>',
  ),
  campana: il(
    ILB +
      '<rect class="a" x="75" y="14" width="10" height="12" rx="5"/><path class="a" d="M80 24c-19 0-29 14-29 32v14l-10 13h78l-10-13V56c0-18-10-32-29-32z"/><circle class="b" cx="80" cy="99" r="9"/><path class="k" d="M30 52a32 32 0 0 1 9-18M130 52a32 32 0 0 0-9-18" style="stroke:var(--ye);stroke-width:4"/>',
  ),
  local: il(
    ILB +
      '<rect class="w" x="40" y="54" width="80" height="50" rx="6"/><rect class="k" x="40" y="54" width="80" height="50" rx="6"/><path class="a" d="M36 30h88l8 24H28z"/><path class="b" d="M58 30h22l-.0 24H54zM102 30h22l8 24h-26z" style="opacity:.95"/><rect class="a" x="70" y="70" width="20" height="34" rx="3"/><rect class="c" x="48" y="66" width="16" height="16" rx="3"/><rect class="c" x="96" y="66" width="16" height="16" rx="3"/>',
  ),
  gente: il(
    ILB +
      '<path class="b" d="M82 104c0-17 11-28 26-28s26 11 26 28z"/><circle class="a2" cx="108" cy="58" r="12"/><path class="a" d="M26 104c0-17 11-28 26-28s26 11 26 28z"/><circle class="a2" cx="52" cy="54" r="13"/><path class="b" d="M37 52a15 15 0 0 1 30 0z"/><rect class="b" x="33" y="50" width="38" height="5" rx="2.5"/><path class="w" d="M52 40v10" style="stroke:#fff;stroke-width:0"/>',
  ),
  foto: il(
    ILB +
      '<rect class="w" x="34" y="26" width="92" height="68" rx="10"/><rect class="k" x="34" y="26" width="92" height="68" rx="10"/><circle class="b" cx="62" cy="48" r="8"/><path class="a" d="M40 90l24-24 16 16 12-10 28 22v-2H40z"/><path class="a2" d="M64 66l16 16-12 8H40z" style="opacity:.55"/>',
  ),
  ok: il(
    ILB +
      '<circle class="a" cx="80" cy="58" r="30"/><path class="k" d="M66 58l10 10 20-22" style="stroke:#fff;stroke-width:7"/><path class="b" d="M124 26l3 8 8 3-8 3-3 8-3-8-8-3 8-3z"/><path class="b" d="M30 84l2 5 5 2-5 2-2 5-2-5-5-2 5-2z"/>',
  ),
};
const empty = (e, t, p, b) => `<div class="em"><div>${e}</div><h3>${t}</h3><p class="s">${p}</p>${b || ''}</div>`;
const RC = Object.fromEntries(
  [
    'Albañilería','Pintura','Plomería','Electricidad','Jardinería','Herrería','Carpintería','Limpieza','Fletes y mudanzas','Gasista','Aire acondicionado y refrigeración','Cerrajería','Service de electrodomésticos','Techos y zinguería','Informática','Reparación de celulares','Lavadero y estética vehicular','Clases y cuidados','Otros',
  ].map((r) => [r, '#14B8A6']),
); // rediseño: un solo acento (verde petróleo) para todos los rubros
const rcs = () => 'background:rgba(20,184,166,.16);color:#14B8A6';
const cab = (c, ex) =>
  `<div class="top"><span class="ic" style="${rcs(c.rubro)}">${IC[c.rubro] || IC.Otros}</span><div class="gw"><h3>${esc(c.titulo)}</h3><p class="s">${esc(ex)}</p>${c.bd || ''}</div></div>`;
