/* Escritorio (v85): en PC (1100 px o más) el cliente ve menú lateral, barra superior con buscador y un Inicio tipo panel.
   Se carga como script común, después de vistas.js (ver index.html); comparte las variables con los demás archivos de app/.
   En celu y tablet no se usa nada de esto: PCW.matches es falso y la app queda como antes. Los estilos viven en escritorio.css. */
const DI = {
  ini: SV.home,
  mis: 'M9 4h6a1 1 0 0 1 1 1v1H8V5a1 1 0 0 1 1-1zM8 6H6a1 1 0 0 0-1 1v13a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V7a1 1 0 0 0-1-1h-2M9 12h6M9 16h4',
  loc: 'M12 21s-7-6-7-11a7 7 0 0 1 14 0c0 5-7 11-7 11zM12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z',
  perfil: SV.user,
  cfg: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z',
  ayu: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM9.1 9a3 3 0 0 1 5.8 1c0 2-3 2.5-3 4M12 17.5h.01',
  bolt: 'M13 2L4 14h7l-1 8 9-12h-7z',
  target:
    '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.2"/><path d="M12 12l7-7M16 3.5V8h4.5"/>',
  head: 'M4 14v-2a8 8 0 0 1 16 0v2M4 14h3v5H5a1 1 0 0 1-1-1zM20 14h-3v5h2a1 1 0 0 0 1-1zM17 19c0 1.5-2 2-5 2',
  bag: 'M3 8h18v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1zM9 8V6a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M3 13h18',
  shield: 'M12 3l8 3v6c0 4.5-3.2 8-8 9-4.8-1-8-4.5-8-9V6zM8.5 12l2.5 2.5 4.5-5',
  star: 'M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z',
  truck:
    'M3 6h11v10H3zM14 9.5h4l3 3.5v3h-7zM9 18.5a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM19 18.5a2 2 0 1 1-4 0 2 2 0 0 1 4 0z',
  clk: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  ok: '<circle cx="12" cy="12" r="9"/><path d="M8 12.3l2.6 2.6L16 9.5"/>',
  arr: 'M5 12h14M13 6l6 6-6 6',
  plus: 'M12 5v14M5 12h14',
  pie: '<circle cx="12" cy="12" r="9"/><path d="M12 3v9h9"/>',
};
const dsv = (k) => sv(DI[k].startsWith('<') ? DI[k] : `<path d="${DI[k]}"/>`);
const ARR = dsv('arr');

// Menú lateral: logo, secciones, tarjeta de guía y cuenta
function navPC() {
  const it = (k, t, lb, on) =>
    `<div class="sbi${on ? ' on' : ''}" role="button" tabindex="0" data-a="${k === 'ayu' ? 'guiaver' : 'tab'}" data-t="${t}">${dsv(k)}<span>${lb}</span></div>`;
  const nom = esc(me.nombre || '');
  return `<div class="sb-br"><img src="icon-192.png" width="60" height="60" alt=""><b class="wm" aria-label="Dicho y Hecho">Dicho y<span>Hecho</span></b></div>
  <div class="sb-ls">${it('ini', 'ini', 'Inicio', tab === 'ini')}${it('mis', 'mis', 'Mis pedidos', tab === 'mis')}${it('loc', 'loc', 'Locales', tab === 'loc')}${it('perfil', 'perfil', 'Perfil', tab === 'perfil')}${it('cfg', 'perfil', 'Configuración', false)}${it('ayu', 'ini', 'Ayuda', false)}</div>
  <div class="sb-gd"><i>${dsv('target')}</i><b>Alcanza tus objetivos</b><p>Con Dicho y Hecho es más fácil.</p><span class="sb-bt" role="button" tabindex="0" data-a="guiaver">Ver guía ${ARR}</span></div>
  <div class="sb-us" role="button" tabindex="0" data-a="tab" data-t="perfil">${av(me.id, me.fv, me.nombre, 'sb-av')}<div><b>${nom}</b><span>Cliente • ${esc(me.barrio || 'Pergamino')}</span></div><i class="sb-on" aria-hidden="true"></i></div>
  <div class="credit sb-cr"><a href="https://instagram.com/modus.grid" target="_blank" rel="noopener"><img src="modusgrid.webp" alt="Logo de modus.grid" width="34" height="34"><span>Sistema hecho por <b>@modus.grid</b></span></a></div>`;
}

// Barra superior: buscador (lleva al directorio con lo escrito, igual que el buscador del celu)
function shellBar(pc) {
  const h = document.querySelector('header'),
    b = h && h.querySelector('.tbs');
  if (!pc) return b && b.remove();
  if (b) return;
  const l = document.createElement('label');
  l.className = 'tbs';
  l.innerHTML = `${sv(X.srch)}<input id="hq" type="search" placeholder="Buscar trabajadores, locales o servicios…" aria-label="Buscar trabajadores" autocomplete="off" enterkeyhint="search">`;
  h.insertBefore(l, h.firstChild);
}

// Pedidos del cliente: etiqueta, ícono, paso (de 4) y color según el estado real
function dEst(c) {
  const pen = c.estado === 'abierta' && c.post.length > 0,
    pun = c.estado === 'hecha' && !c.punt;
  if (c.estado === 'abierta')
    return pen ? ['Con propuestas', 'clk', 2, 1] : ['Publicado', 'clk', 1, 0];
  if (c.estado === 'elegida') return ['En marcha', 'truck', 3, 0];
  if (c.estado === 'hecha') return pun ? ['Falta puntuar', 'star', 4, 1] : ['Terminado', 'ok', 4, 0];
  return ['Vencido', 'clk', 0, 0];
}
const dOrd = (c) => {
  const [lb, ic, st, co] = dEst(c);
  return `<div class="dsh-oc" role="button" tabindex="0" data-a="tab" data-t="mis"><div class="oc-h"><i class="oc-i${co ? ' co' : ''}${c.estado === 'vencida' ? ' gr' : ''}">${dsv(ic)}</i><div><b class="${co ? 'co' : ''}">${lb}</b><span>Pedido #${c.id} · ${fec(c.creado)}</span></div><i class="oc-c">${CHEV}</i></div><h3>${esc(c.titulo)}</h3><p>${st ? 'Paso ' + st + ' de 4' : 'Venció ' + fecH(c.vence)}</p><div class="oc-b"><i class="${co ? 'co' : ''}" style="width:${st * 25}%"></i></div></div>`;
};
// Actividad reciente: se arma con lo que pasó en tus pedidos (publicaste, se ofrecieron, elegiste, terminaste)
function dAct(l) {
  const ev = [];
  l.forEach((c) => {
    ev.push([c.creado, c.id, 'Publicaste tu pedido']);
    c.post.forEach((p) => p.creado && ev.push([p.creado, c.id, 'Se ofreció ' + esc(p.nombre)]));
    if (c.elegida_en) ev.push([c.elegida_en, c.id, 'Elegiste a alguien para este pedido']);
    if (c.hecha_en) ev.push([c.hecha_en, c.id, 'Lo marcaste como hecho']);
  });
  ev.sort((a, b) => b[0] - a[0]);
  return ev.length
    ? ev
        .slice(0, 3)
        .map(
          (e, i) =>
            `<li class="${i ? '' : 'dn'}"><i></i><div><b>Pedido #${e[1]}</b><span>${e[2]}</span></div><time>${ago(e[0]).replace(/^h/, 'H')}</time></li>`,
        )
        .join('')
    : '<li class="vc"><div><span>Todavía no hay actividad. Publicá tu primer pedido.</span></div></li>';
}

view.ini = async function () {
  const [l, lc] = await Promise.all([api('mis-pedidos'), api('locales').catch(() => [])]);
  LC = l;
  const need = (c) => (c.estado === 'abierta' && c.post.length > 0) || (c.estado === 'hecha' && !c.punt),
    RK = { elegida: 0, abierta: 1, hecha: 2, vencida: 3 },
    top = [...l]
      .sort((a, b) => need(b) - need(a) || RK[a.estado] - RK[b.estado] || b.creado - a.creado)
      .slice(0, 3),
    nom = esc((me.nombre || '').split(' ')[0]),
    sup = (window.CFG || {}).soporte,
    tile = (k, lb, t) =>
      `<button class="dsh-tl" data-a="tab" data-t="${t}">${dsv(k)}<span>${lb}</span></button>`,
    qa = (k, lb, at) => `<${at.startsWith('href') ? 'a' : 'button'} class="dsh-qa" ${at}>${dsv(k)}<span>${lb}</span></${at.startsWith('href') ? 'a' : 'button'}>`;
  set(`<div class="dsh"><div class="dsh-c">
<section class="dsh-hero"><img src="img/hero-iglesia.webp" alt="" width="1010" height="650" decoding="async"><i class="hs-t"></i><i class="hs-c"></i><div class="hs-x"><b class="wm" aria-label="Dicho y Hecho">Dicho y <span>Hecho</span></b><p>Alguien lo necesita.<br>Alguien lo hace.</p><button class="hs-b" data-a="tab" data-t="pub">${dsv('plus')}Publicar mi pedido</button></div></section>
<div class="dsh-sh"><h2 class="dsh-t">Tus pedidos</h2><button class="dsh-vl" data-a="tab" data-t="mis">Ver todos ${ARR}</button></div>
${top.length ? '<div class="dsh-or">' + top.map(dOrd).join('') + '</div>' : `<div class="dsh-em"><b>Todavía no publicaste pedidos</b><p>Contá qué necesitás y te escriben los trabajadores. Es gratis.</p><button class="hs-b" data-a="tab" data-t="pub">${dsv('plus')}Publicar mi pedido</button></div>`}
<div class="dsh-rw"><div><div class="dsh-sh"><h2 class="dsh-t ct">Explorá por categoría</h2></div><div class="dsh-ct">${tile('bag', 'Trabajadores<br>Profesionales', 'dir')}${tile('loc', 'Locales<br>verificados', 'loc')}${tile('shield', 'Servicios<br>confiables', 'dir')}${tile('star', 'Destacados', 'dir')}</div></div>
<button class="dsh-bn" data-a="tab" data-t="dir"><img src="img/trabajador.webp" alt="" width="520" height="380" loading="lazy"><span class="bn-x"><b>Más trabajo.<em>Más soluciones.</em></b><span class="hs-b">Explorar ahora ${ARR}</span></span></button></div>
</div><aside class="dsh-r">
<section class="dsh-pc"><div class="pf"><span class="pf-a">${me.fv ? av(me.id, me.fv, me.nombre, 'pf-im') : sv('<path d="' + SV.user + '"/>')}</span><div><b>Hola, ${nom} 👋</b><span>Cliente • ${esc(me.barrio || 'Pergamino')}</span></div></div><div class="st"><div>${dsv('mis')}<b>${l.length}</b><span>Pedidos</span></div><div>${dsv('star')}<b>${l.filter((c) => c.punt).length}</b><span>Calificaciones</span></div><div>${dsv('loc')}<b>${Array.isArray(lc) ? lc.length : 0}</b><span>Locales</span></div></div><button class="pf-b" data-a="tab" data-t="perfil">Ver mi perfil ${ARR}</button></section>
<section class="dsh-pc"><h2 class="dsh-h">${dsv('bolt')}Mis accesos rápidos</h2><div class="qs">${qa('loc', 'Locales<br>cercanos', 'data-a="tab" data-t="loc"')}${qa('perfil', 'Mis datos', 'data-a="tab" data-t="perfil"')}${qa('ayu', 'Preguntas<br>frecuentes', 'data-a="guiaver"')}${qa('head', 'Soporte', sup ? `href="https://wa.me/${esc(sup)}" target="_blank" rel="noopener"` : 'href="legal.html#cuidarte" target="_blank" rel="noopener"')}</div></section>
<section class="dsh-pc"><div class="ah"><h2 class="dsh-h">${dsv('pie')}Actividad reciente</h2><button class="dsh-vl" data-a="tab" data-t="mis">Ver todas ${ARR}</button></div><ul class="ac-l">${dAct(l)}</ul></section>
</aside></div>`);
  dshFit();
  document.fonts?.ready.then(dshFit);
  addEventListener('load', dshFit, { once: true });
};
// Sin scroll: el Inicio se achica (zoom) hasta entrar en el alto de la ventana. Mínimo 55 %, para que se siga leyendo.
function dshFit() {
  const e = document.querySelector('.dsh');
  if (!e || !PCW.matches) return;
  let z = 1;
  e.style.zoom = 1;
  for (let i = 0; i < 5; i++) {
    const r = e.getBoundingClientRect(),
      av = innerHeight - (r.top + scrollY) - 18,
      n = Math.min(1, Math.max(0.55, z * (av / r.height)));
    if (Math.abs(n - z) < 0.01) break;
    z = n;
    e.style.zoom = z;
  }
  if (z < 1) e.style.zoom = Math.floor(z * 100) / 100; // redondeo hacia abajo: nunca se pasa
}
let dshT = 0;
addEventListener('resize', () => {
  clearTimeout(dshT);
  dshT = setTimeout(dshFit, 120);
});
PCW.addEventListener('change', () => {
  if (me) home();
});
