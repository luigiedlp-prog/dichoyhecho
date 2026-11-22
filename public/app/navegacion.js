/* Potenciaciones gratuitas, pestañas, nav() y home(). Se carga como script común, en este orden (ver index.html); comparte las variables con los demás archivos de app/. */
// Potenciar (destacar un pedido o alertas inmediatas): no se paga. Se usa la primera de la cuenta o las ganadas por invitar.
async function potenciar(tipo, pid) {
  const d = tipo === 'destacado',
    dura = d ? '72 horas' : '7 días',
    desc = d
      ? 'Tu pedido sale primero en la lista con la etiqueta Destacado y avisamos enseguida a todos los trabajadores del rubro. No garantiza que te respondan.'
      : 'Durante 7 días te avisamos apenas se publica un pedido de tus rubros, sin esperar los 10 minutos. No garantiza que consigas trabajo. Tenés que tener activados los avisos del celular (Perfil > Activar avisos).';
  if (!((me.gratis || 0) > 0)) {
    await dlg({
      t: d ? 'Destacar pedido' : 'Alertas inmediatas',
      p: desc,
      h: `<p class="s">Por ahora no tenés potenciaciones disponibles. Podés ganar una invitando a otras personas (Perfil > Invitá y ganá).</p>`,
      solo: 1,
    });
    return;
  }
  const v = await dlg({
    t: d ? 'Destacar pedido' : 'Alertas inmediatas',
    p: desc,
    h: `<div class="prc"><b>Gratis</b> <span class="bd dest">${me.primera ? 'Tu primera potenciación' : 'Ganada por invitar'}</span></div><p class="s">Dura ${dura}. Es gratis: se activa al instante.</p>`,
    ok: 'Activar gratis',
  });
  if (!v) return;
  await api('potenciar', { tipo, pedido_id: pid });
  me = await api('yo');
  toast('¡Potenciación activada!');
  tab === 'mis' ? view.mis() : tab === 'perfil' ? view.perfil() : home();
}
const tabs = () =>
  me.tipo === 'cliente'
    ? PCW.matches
      ? [
          ['ini', 'Inicio', 'home'],
          ['mis', 'Mis pedidos', 'list'],
          ['dir', 'Directorio', 'users'],
          ['loc', 'Locales', 'shop'],
          ['perfil', 'Perfil', 'user'],
        ]
      : [
          ['mis', 'Mis pedidos', 'list'],
          ['dir', 'Directorio', 'users'],
          ['loc', 'Locales', 'shop'],
          ['perfil', 'Perfil', 'user'],
        ]
    : PCW.matches
      ? [
          ['ini', 'Inicio', 'home'],
          ['feed', 'Pedidos', 'home'],
          ['mp', 'Propuestas', 'list'],
          ['loc', 'Locales', 'shop'],
          ['perfil', 'Perfil', 'user'],
        ]
      : [
          ['feed', 'Pedidos', 'home'],
          ['mp', 'Propuestas', 'list'],
          ['loc', 'Locales', 'shop'],
          ['perfil', 'Perfil', 'user'],
        ];
const SV = {
  home: 'M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z',
  list: 'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01',
  plus: 'M12 8v8M8 12h8M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18',
  bell: 'M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0',
  shop: 'M3 9l1.5-5h15L21 9M3 9v11h18V9M3 9h18M9.5 20v-6h5v6',
  users:
    'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M23 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8',
  user: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8',
};
const BRAND = '<img class="bimg" src="favicon.png" width="64" height="64" alt="">';
// Portada de Inicio: foto de la plaza de Pergamino, marca y eslogan
const heroMarca = () =>
  `<section class="hero"><img class="hero-ph" src="img/hero-iglesia.webp" alt="" width="1010" height="650" decoding="async"><svg class="swoosh" viewBox="0 0 390 100" preserveAspectRatio="none" aria-hidden="true"><path d="M0 0H268C226 52 128 88 0 92z"/></svg><div class="brand-lg">${BRAND}<div><b class="wm" aria-label="Dicho y Hecho">Dicho y <span>Hecho</span></b><p>Alguien lo necesita.<br>Alguien lo hace.</p></div></div></section>`;
const bannerPub = () =>
  `<button class="banner" data-a="tab" data-t="pub"><span class="bn-ic">${sv('<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>')}</span><span class="bn-tx"><b>Publicá tu pedido</b><span>Contá qué necesitás y te escriben los trabajadores. Es gratis.</span></span><img class="bn-ph" src="img/trabajador.webp" alt="" width="520" height="380" loading="lazy"><span class="chv w">${CHEV}</span></button>`;
const MAS = sv('<rect x="3.5" y="3.5" width="7" height="7" rx="2"/><rect x="13.5" y="3.5" width="7" height="7" rx="2"/><rect x="3.5" y="13.5" width="7" height="7" rx="2"/><rect x="13.5" y="13.5" width="7" height="7" rx="2"/>');
const catTiles = () =>
  `<div class="cats" role="list">${RUB.slice(0, 4).map((r) => `<button class="cat" role="listitem" data-a="catir" data-r="${esc(r)}">${IC[r] || IC.Otros}<span>${esc(r)}</span></button>`).join('')}<button class="cat" role="listitem" data-a="catir" data-r="">${MAS}<span>Más</span></button></div>`;
async function inicioCli() {
  return (
    heroMarca() +
    `<div class="bs"><span class="bs-i">${sv(X.srch)}</span><input id="hq" type="search" placeholder="¿Qué estás buscando?" aria-label="Buscar trabajadores" autocomplete="off" enterkeyhint="search"></div>` +
    catTiles() +
    bannerPub()
  );
}
function nav() {
  const t = tabs(),
    cli = me.tipo === 'cliente',
    btn = (x) =>
      `<button class="${x[0] === tab || (x[0] === 'perfil' && tab === 'pfotos') ? 'on' : ''}" data-a="tab" data-t="${x[0]}" aria-label="${x[1]}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${SV[x[2]]}"/></svg><span>${x[1]}</span></button>`,
    pub = `<button class="pubb${tab === 'pub' ? ' on' : ''}" data-a="tab" data-t="pub" aria-label="Publicar un pedido"><i><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg></i><span>Publicar</span></button>`;
  const pc = PCW.matches; // PC (cliente y trabajador): menú lateral del escritorio (app/escritorio.js)
  document.body.classList.toggle('shell', pc);
  shellBar(pc);
  $('#nav').innerHTML = pc ? navPC() : (cli ? [...t.slice(0, 2).map(btn), pub, ...t.slice(2).map(btn)] : t.map(btn)).join('');
  const b = $('#bell');
  b.hidden = false;
  b.className = tab === 'nov' ? 'on' : '';
  b.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${SV.bell}"/></svg>${me.av ? `<i class="dot">${me.av > 9 ? '9+' : me.av}</i>` : ''}`;
  $('#fab').hidden = !(pc && cli && !['ini', 'pub'].includes(tab)); // celu: Publicar vive en el centro del menú. PC: botón flotante, salvo en Inicio (ahí está en la portada)
}
async function home() {
  try {
    me = await api('yo');
  } catch (e) {
    if (/sesión|suspendida/.test(e.message)) {
      A.salir();
      return;
    }
    throw e;
  }
  if (me.tel_pend) {
    tab = 'telv';
    nv0();
    return go(() => view.telv());
  }
  if (me.falta && me.falta.length) {
    tab = 'completar';
    nv0();
    return go(() => view.completar());
  }
  if (
    !tabs().some((x) => x[0] === tab) &&
    tab !== 'nov' &&
    !(tab === 'pub' && me.tipo === 'cliente') &&
    !(tab === 'pfotos' && me.tipo === 'trabajador')
  )
    tab = tabs()[0][0];
  nav();
  if (['feed', 'mp', 'mis', 'nov', 'loc', 'dir', 'ini'].includes(tab)) set(skel());
  go(() => view[tab]());
  if (me.pionero && !me.pionero_visto && !window.__pioVisto) pionAviso();
}
const mtr = (n) =>
  `<span class="mtr${n >= 8 ? ' hot' : ''}" role="img" aria-label="${n} de 10 postulantes">${Array.from({ length: 10 }, (_, i) => `<i class="${i < n ? 'f' : ''}"></i>`).join('')}</span>`;
const mc2 = (b, t, q) =>
  `<div class="mc2"><span class="mt1">${sv(X.pin)} ${esc(b || 'Sin barrio')}</span><span class="mt1">${sv(X.clk)} ${t}</span>${q || ''}</div>`;
const chg = (c) =>
  `<article class="card rich${c.dest ? ' dst' : ''}${c.inv ? ' invd' : ''}" style="--rc:${RC[c.rubro] || '#14B8A6'}">${cab({ ...c, bd: (c.dest ? '<span class="bd dest">Destacado</span>' : '') + (c.inv ? '<span class="bd inv">Te invitaron</span>' : '') }, c.rubro)}${mc2(c.barrio, ago(c.creado), c.cn ? `<span class="mt1 mt-who">${av(c.cid, c.cfv, c.cn, 'av s18')}${esc(c.cn)}${vb(c.ver)}${pb(c.pio, 1)}</span>` : '')}${c.descripcion ? `<p class="ds">${esc(c.descripcion)}</p>` : ''}${th(c.fotos)}<div class="fl"><span class="pr">${esc(c.presupuesto)}</span><span class="pst">${mtr(c.n)}<span class="s">${c.n}/10</span></span>${c.suyo && !fr && !mr ? '<span class="bd elegida">Tu rubro</span>' : ''}</div><div class="ac">${c.ya ? '<span class="okk">' + sv(X.chk) + ' Ya te postulaste</span>' : !c.suyo && !c.inv && CUPO === 0 ? '<span class="s nc">Hoy ya no te quedan propuestas fuera de tus rubros.</span>' : `<button class="btn" data-a="post" data-id="${c.id}">Postularme</button>`}<button class="ico" data-a="den" data-id="${c.id}" aria-label="Denunciar este pedido">${sv(X.flag)}</button></div></article>`;

// el botón flotante "Publicar pedido" se esconde al bajar y vuelve al subir, para no tapar los botones de abajo
let fabY = 0;
addEventListener(
  'scroll',
  () => {
    const f = document.getElementById('fab'),
      y = scrollY;
    document.documentElement.classList.toggle('hs', y > 70);
    if (!f) return;
    if (y > fabY + 8 && y > 120) f.classList.add('off');
    else if (y < fabY - 8 || y < 120) f.classList.remove('off');
    fabY = y;
  },
  { passive: true },
);
