/* Panel de Gestión. Se carga como script común, en este orden (ver index.html); comparte las variables con los demás archivos de app/. */
let GZ = 'inicio',
  GQ = '',
  GD = null,
  GL = null,
  GP = 0,
  GDN = 0,
  GCT = '',
  GF = null;
/* v33: barra inferior de 4 pestañas. Cada pestaña agrupa "zonas" (cada zona = un endpoint admin/<zona>). Denuncias queda aparte (botón de la banderita). */
const GTABS = [
  ['inicio', 'Inicio', 'home'],
  ['usuarios', 'Usuarios', 'users'],
  ['ofertas', 'Ofertas', 'list'],
  ['subs', 'Potenciaciones', 'bell'],
];
const GSEG = {
  inicio: [
    ['inicio', 'Resumen'],
    ['ajustes', 'Ajustes y logs'],
  ],
  usuarios: [
    ['trabajadores', 'Trabajadores'],
    ['clientes', 'Clientes'],
    ['locales', 'Locales'],
    ['resenas', 'Reseñas'],
    ['fotos', 'Fotos'],
  ],
  ofertas: [
    ['pedidos', 'Pedidos'],
    ['destacados', 'Destacados'],
  ],
};
const GTZ = {
  inicio: 'inicio',
  ajustes: 'inicio',
  trabajadores: 'usuarios',
  clientes: 'usuarios',
  locales: 'usuarios',
  resenas: 'usuarios',
  fotos: 'usuarios',
  pedidos: 'ofertas',
  destacados: 'ofertas',
  pagos: 'subs',
};
const GLS = { inicio: 'inicio', usuarios: 'trabajadores', ofertas: 'pedidos', subs: 'pagos' };
let GBK = 'inicio',
  GPR = null,
  GMAS = false,
  GSQ = { q: '' };
/* v34: listados paginados. El Worker devuelve de a GPS registros (?n=desde cuántos) y busca en todos con ?q=. */
const GPS = { trabajadores: 100, clientes: 100, locales: 100, resenas: 100, pedidos: 100, pagos: 50, fotos: 48 };
const glist = (d) => (GZ === 'pedidos' ? d.pedidos : GZ === 'pagos' ? d.hist : d);
const gmas = (d) => !!GPS[GZ] && glist(d).length >= GPS[GZ];
const gqs = (c) => {
  if (!GPS[GZ]) return '';
  const p = [];
  if (c != null) p.push('c=' + encodeURIComponent(JSON.stringify(c)));
  if (GSQ.q) p.push('q=' + encodeURIComponent(GSQ.q));
  if (GZ === 'pedidos' && GF.pedidos.f && GF.pedidos.f !== 'sinpost') p.push('e=' + GF.pedidos.f);
  if (GZ === 'fotos') p.push('t=' + GF.fotos.t);
  return p.length ? '?' + p.join('&') : '';
};
/* cursor = último registro que ya se ve (el Worker pagina "después de este", no "saltando N") */
const gcur = (l) => {
  const x = l[l.length - 1];
  return !x
    ? null
    : GZ === 'locales'
      ? [x.rubro, x.nombre, x.id]
      : GZ === 'fotos' && GF.fotos.t === 'perfil'
        ? [x.creado, x.id]
        : x.id;
};
const gdd = (a, b) => {
  const s = new Set(a.map((x) => x.id));
  return a.concat(b.filter((x) => !s.has(x.id)));
};
const EST = { abierta: 'Abierto', elegida: 'En marcha', hecha: 'Hecho', vencida: 'Vencido', cancelada: 'Cancelado' };
const MBf = (b) => ((b || 0) / 1048576).toFixed(1);
/* Confirmación de cada acción de Gestión. Las que ya abren su propio formulario (PIN, local, ajustes) o diálogo tienen su Cancelar. */
const gconf = (d) =>
  ({
    bajar: ['Dar de baja el pedido', 'Se cancela el pedido #' + d.id + ' y se borran sus fotos.', 'Sí, dar de baja'],
    'cerrar-denuncia': [
      'Cerrar denuncia',
      'La denuncia #' + d.id + ' queda cerrada y sale de las abiertas.',
      'Sí, cerrar',
    ],
    'local-ocultar': +d.v
      ? ['Ocultar local', 'Deja de verse en el directorio. Lo podés volver a mostrar cuando quieras.', 'Sí, ocultar']
      : ['Mostrar local', 'Vuelve a verse en el directorio.', 'Sí, mostrar'],
    purgar: [
      'Borrar fotos de pedidos vencidos',
      'Se borran ahora las fotos de todos los pedidos vencidos o cancelados. No se puede deshacer.',
      'Sí, borrar',
    ],
    refanul: [
      'Anular invitados',
      'Le sacás a ' + d.t + ' los invitados y las potenciaciones ganadas sin usar, y ya no puede ganar más por invitar.',
      'Sí, anular',
    ],
    elimdef: [
      'Eliminar cuenta por completo',
      'Se borran para siempre el perfil, las fotos, los pedidos, las postulaciones y los avisos de ' +
        d.t +
        '. El teléfono queda libre. No se puede deshacer.',
      'Sí, eliminar',
    ],
    susp: +d.on
      ? [
          'Suspender',
          'Suspendés a ' + d.t + '. No va a poder usar la app hasta que lo actives de nuevo.',
          'Sí, suspender',
        ]
      : ['Activar', 'Activás a ' + d.t + '. Vuelve a poder usar la app.', 'Sí, activar'],
  })[d.g];
const gb = (a, t, x = '') => `<button class="btn g" data-g="${a}" ${x}>${t}</button>`;
const gusr = (x, det) =>
  `<div class="in"><b>${esc(x.nombre)}</b>${x.dni && x.direccion && x.mail ? ' <span class="bd elegida">Verificado</span>' : ''}${x.pionero ? ' <span class="bd dest">Pionero</span>' : ''}${/^eliminada-/.test(x.telefono) ? ' <span class="bd cancelada">Eliminada por su dueño</span>' : x.elim_pedida ? ' <span class="bd cancelada">Pidió eliminar su cuenta</span>' : x.suspendido ? ' <span class="bd cancelada">Suspendido</span>' : ''}<p class="s">${esc(x.telefono)}${x.barrio ? ' · ' + esc(x.barrio) : ''}</p>${x.dni || x.direccion || x.mail ? `<p class="s">DNI ${esc(x.dni || '—')} · ${esc(x.direccion || 'sin dirección')} · ${esc(x.mail || 'sin mail')}</p>` : ''}<p class="s">${x.pregunta ? 'Pregunta: ' + esc(x.pregunta) : 'Sin pregunta de seguridad'}</p>${x.ref_por_nombre ? `<p class="s">Invitado por ${esc(x.ref_por_nombre)}</p>` : ''}${x.ref_n > 0 || x.promos > 0 ? `<p class="s">Invitó a ${x.ref_n} (cuentan ${x.ref_ok_n}) · potenciaciones sin usar: ${x.promos || 0}</p>` : ''}${x.alertas_hasta > Date.now() ? `<p class="s">Alertas hasta ${fecH(x.alertas_hasta)}</p>` : ''}${det}<div class="ac">${/^eliminada-/.test(x.telefono) ? '' : gb('reset', 'Cambiar PIN', `data-t="${esc(x.telefono)}"`)}${x.ref_n > 0 || x.promos > 0 ? gb('refanul', 'Anular invitados', `data-t="${esc(x.telefono)}"`) : ''}${/^eliminada-/.test(x.telefono) ? '' : gb('susp', x.suspendido ? 'Activar' : 'Suspender', `data-t="${esc(x.telefono)}" data-on="${x.suspendido ? 0 : 1}"`)}${x.elim_pedida && !/^eliminada-/.test(x.telefono) ? gb('elimdef', 'Eliminar por completo', `data-t="${esc(x.telefono)}"`) : ''}</div></div>`;
const gnorm = (s) =>
  String(s ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
const gmatch = (x, ks) => {
  const q = gnorm(GQ.trim());
  return !q || gnorm(ks.map((k) => x[k]).join(' ')).includes(q);
};
const gcnt = (n, t, u) => {
  const m = GMAS ? '+' : '';
  return n === t ? t + m + ' ' + u : n + ' de ' + t + m + ' ' + u;
};
const gsearch = (ph) =>
  `<div class="sin gsin">${sv(X.srch)}<input id="gq" type="search" placeholder="${ph}" value="${esc(GQ)}" aria-label="Buscar" autocomplete="off"></div>`;
const gchips = (arr, cur) =>
  `<div class="chp">${arr.map(([k, t, n]) => `<button class="${cur === k ? 'on' : ''}" data-g="gf" data-v="${k}">${t}${n != null ? ` <span class="cn">${n}</span>` : ''}</button>`).join('')}</div>`;
const gsel = (id, opts, val, lb) =>
  `<select data-gs="${id}" aria-label="${lb}">${opts.map((o) => `<option value="${esc(o[0])}"${o[0] === val ? ' selected' : ''}>${esc(o[1])}</option>`).join('')}</select>`;
const GFD = () => ({
  trabajadores: { f: '', r: '', o: 'nuevos' },
  clientes: { f: '', o: 'nuevos' },
  pedidos: { f: '', r: '' },
  destacados: { f: '' },
  resenas: { f: '' },
  fotos: { t: 'perfil' },
  denuncias: { f: 'abierta' },
  pagos: { f: '' },
  locales: { f: '', r: '' },
  ajustes: { f: '' },
});
GF = GFD();
const LF = (x) => [
  { id: 'nombre', lb: 'Nombre', max: 80, val: x.nombre },
  { id: 'rubro', lb: 'Rubro', opts: RLOC.map((r) => [r, r]), val: x.rubro },
  { id: 'direccion', lb: 'Dirección', max: 100, ph: 'Ej: Av. Rivadavia 1234', val: x.direccion },
  { id: 'barrio', lb: 'Barrio', max: 40, val: x.barrio },
  { id: 'telefono', lb: 'Teléfono con código de área', type: 'tel', mode: 'numeric', max: 15, val: x.telefono },
  {
    id: 'whatsapp',
    lb: '¿Atiende por WhatsApp?',
    opts: [
      ['', 'No'],
      ['1', 'Sí'],
    ],
    val: x.whatsapp ? '1' : '',
  },
  { id: 'horario', lb: 'Horario', max: 100, ph: 'Lun a vie 8 a 18', val: x.horario },
  { id: 'descripcion', lb: 'Descripción', area: 1, max: 300, val: x.descripcion },
];
const DL = 'DLMMJVS';
const bars = (arr, dias) => {
  const mx = Math.max(1, ...arr);
  return `<div class="bars">${arr.map((n, j) => `<div class="bc"><em>${n || ''}</em><i class="${n ? '' : 'z'}" style="height:${n ? Math.max(12, Math.round((n / mx) * 100)) : 4}%"></i><span>${DL[new Date(dias[j] + 'T12:00:00Z').getUTCDay()]}</span></div>`).join('')}</div>`;
};
function gTel(a) {
  const on = a.tel_on === 1,
    l = a.telpend || [],
    mi = (x) => Math.max(0, Math.round((x.vence - Date.now()) / 60000));
  const it = (x) =>
    `<div class="card"><b>${esc(x.nombre)}</b> <span class="s">${x.tipo === 'trabajador' ? 'Trabajador' : 'Cliente'} · ${esc(x.telefono)}</span><p class="s">Código: <b>${x.codigo}</b> · ${x.vence > Date.now() ? 'vence en ' + mi(x) + ' min' : 'vencido (te lo va a pedir de nuevo)'}${x.intentos ? ' · ' + x.intentos + ' intentos' : ''}</p><a class="btn full" target="_blank" rel="noopener" href="${wa(x.telefono)}?text=${encodeURIComponent('Hola ' + x.nombre.split(' ')[0] + '! Tu código de Dicho y Hecho es ' + x.codigo + '. Vale 1 hora.')}">Mandar por WhatsApp</a></div>`;
  return (
    `<div class="card"><b>Confirmar teléfonos por WhatsApp</b><p class="s">${on ? 'Las cuentas nuevas esperan hasta que les mandes su código.' : 'Apagado: las cuentas nuevas entran directo.'}</p><div class="set"><span>${on ? 'Prendido' : 'Apagado'}</span><button class="btn g" data-g="telon" data-v="${on ? 1 : 0}">${on ? 'Apagar' : 'Prender'}</button></div><div class="set"><span>Avisos en este celu${a.avisos_n ? ' (activos en ' + a.avisos_n + (a.avisos_n > 1 ? ' celus' : ' celu') + ')' : ''}</span><button class="btn g" data-g="telaviso">Activar</button></div>${a.push_ok === 0 ? '<p class="s">Faltan las claves VAPID en Cloudflare: sin ellas no se pueden mandar avisos.</p>' : '<p class="s">Te avisa cuando alguien se registra o pide un código nuevo. En iPhone, instalá primero la app (Compartir → Agregar a inicio).</p>'}</div>` +
    (on
      ? l.length
        ? `<p class="s"><b>Para confirmar (${l.length})</b></p>` + l.map(it).join('')
        : '<p class="s">No hay nadie esperando un código.</p>'
      : '')
  );
}
function gInicio(a) {
  const u = a.usuarios,
    p = a.pedidos,
    po = a.post,
    q = a.qr,
    se = a.serie;
  const kp = (t, big, l1, l2) =>
    `<div class="kp"><span class="kl">${t}</span><b class="kn">${big}</b><span class="s">${l1}</span><span class="s">${l2}</span></div>`;
  const ser = [
    ['Usuarios nuevos', se.usuarios],
    ['Pedidos nuevos', se.pedidos],
    ['Propuestas nuevas', se.post],
  ]
    .map(
      ([t, arr]) =>
        `<div class="sr"><div class="row"><b>${t}</b><span class="s">${arr.reduce((x, y) => x + y, 0)} en 7 días</span></div>${bars(arr, se.dias)}</div>`,
    )
    .join('');
  const qr = q.items.length
    ? `<p class="s">${q.activos} de ${q.locales} ${plu(q.locales, 'local', 'locales')} con movimiento · ${q.visitas} ${plu(q.visitas, 'visita', 'visitas')} · ${q.registros} ${plu(q.registros, 'registro', 'registros')} · ${q.pedidos} ${plu(q.pedidos, 'pedido', 'pedidos')}</p>` +
      q.items
        .map((x) => {
          const cv = x.visitas ? Math.round((x.registros / x.visitas) * 100) : 0;
          return `<div class="in qrr"><div class="row"><b>${esc(x.nombre)}${x.activo ? '' : ' <span class="bd cancelada">Oculto</span>'}</b><span class="s">${esc(x.rubro)}</span></div><div class="qm"><span><b>${x.visitas}</b> ${plu(x.visitas, 'visita', 'visitas')}${x.v7 ? ` <i class="s">(${x.v7} esta semana)</i>` : ''}</span><span><b>${x.registros}</b> ${plu(x.registros, 'registro', 'registros')}</span><span><b>${x.pedidos}</b> ${plu(x.pedidos, 'pedido', 'pedidos')}</span></div><div class="pg"><i style="width:${Math.min(100, cv)}%"></i></div><p class="s">${x.visitas ? cv + '% de las visitas se registró' : 'Todavía sin visitas'}</p></div>`;
        })
        .join('')
    : '<p class="s">Todavía nadie entró por un QR. Imprimí el de cada local desde Locales.</p>';
  return (
    `<div class="kg">${kp('Usuarios nuevos', u.h24, 'Últimas 24 hs · en 7 días: ' + u.d7, u.t7 + ' trabajadores · ' + u.c7 + ' clientes')}${kp('Pedidos nuevos', p.h24, 'Últimas 24 hs · en 7 días: ' + p.d7, p.abiertos + ' abiertos ahora')}${kp('Propuestas nuevas', po.h24, 'Últimas 24 hs · en 7 días: ' + po.d7, po.tot + ' en total')}${kp('Trabajos hechos', p.hechos, p.marcha + ' en marcha', u.tot + ' usuarios (' + u.trab + ' trab., ' + u.cli + ' cli.)')}</div>
  <div class="card"><b>Potenciaciones activas</b><p class="s">${a.activos.destacados} ${plu(a.activos.destacados, 'pedido destacado', 'pedidos destacados')} · ${a.activos.alertas} ${plu(a.activos.alertas, 'cuenta con alertas', 'cuentas con alertas')}</p></div>
  <div class="card"><b>Últimos 7 días</b>${ser}</div>
  <div class="card"><b>Rendimiento de los QR</b>${qr}</div>
  ${a.denuncias ? `<div class="card"><b>${a.denuncias} ${plu(a.denuncias, 'denuncia abierta', 'denuncias abiertas')}</b><p class="s">Alguien avisó que algo no está bien. Revisalas y decidí.</p><button class="btn g" data-g="zona" data-z="denuncias">Revisar</button></div>` : ''}
  <p class="s ctr">Actualizado ${fecH(a.gen)}</p>`
  );
}
function gnav() {
  const t = GTZ[GZ];
  $('#nav').className = 'gn';
  $('#nav').innerHTML = GTABS.map(
    ([k, l, ic]) =>
      `<button class="${k === t ? 'on' : ''}" data-g="gtab" data-t="${k}" aria-label="${l}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${SV[ic]}"/></svg><span>${l}</span>${k === 'subs' && GP ? `<i class="dot" aria-label="${GP} pendientes">${GP}</i>` : ''}</button>`,
  ).join('');
}
function gh() {
  const sg = GSEG[GTZ[GZ]],
    chips = sg
      ? `<div class="chp gz">${sg.map(([k, t]) => `<button class="${k === GZ ? 'on' : ''}" data-g="zona" data-z="${k}">${t}</button>`).join('')}</div>`
      : '';
  const den = GZ === 'denuncias',
    rf = `<button class="btn g gref" data-g="gref" aria-label="Actualizar">${sv('<path d="M21 12a9 9 0 1 1-3-6.7L21 8M21 3v5h-5"/>')}</button>`;
  const top = `<div class="gtop">${den ? `<button class="btn g gref gback" data-g="gtab" data-t="${GBK}" aria-label="Volver">${sv('<path d="M15 18l-6-6 6-6"/>')}</button>` : ''}<h1 class="h1">${den ? 'Denuncias' : 'Gestión'}</h1><span class="gbt">${den ? '' : `<button class="btn g gref" data-g="zona" data-z="denuncias" aria-label="Denuncias${GDN ? ': ' + GDN + ' abiertas' : ''}">${sv('<path d="M4 22V4M4 4h13l-2 4 2 4H4"/>')}${GDN ? `<i class="pdn gdb">${GDN}</i>` : ''}</button>`}${rf}</span></div>`;
  if (GZ === 'inicio') return top + chips + gTel(GD) + gInicio(GD);
  GL = null;
  let pre = '',
    tools = '',
    post = '';
  const f = GF[GZ] || {},
    now = Date.now();
  if (GZ === 'trabajadores') {
    const T = GD,
      ver = (x) => x.dni && x.direccion && x.mail,
      ale = (x) => x.alertas_hasta > now;
    GL = () => {
      let r = T.filter(
        (x) =>
          gmatch(x, ['nombre', 'telefono', 'barrio', 'mail']) &&
          (!f.r || JSON.parse(x.rubros || '[]').includes(f.r)) &&
          (!f.f || (f.f === 'ver' && ver(x)) || (f.f === 'ale' && ale(x)) || (f.f === 'sus' && x.suspendido)),
      );
      if (f.o === 'puntaje') r = [...r].sort((a, b) => (b.prom || 0) - (a.prom || 0) || b.n - a.n);
      else if (f.o === 'post') r = [...r].sort((a, b) => b.post - a.post);
      GCT = gcnt(r.length, T.length, 'trabajadores');
      return (
        r
          .map((x) =>
            gusr(
              x,
              `<p class="s">${esc(JSON.parse(x.rubros || '[]').map((k) => rbl(k, x.rubro_otro)).join(', ') || 'Sin rubros')}</p><p class="s">${x.prom ? STAR + ' ' + x.prom + ' (' + x.n + ')' : 'Sin puntaje'} · ${x.post} propuestas · alta ${fec(x.creado)}</p>`,
            ),
          )
          .join('') || '<p class="s">Sin resultados.</p>'
      );
    };
    tools =
      gsearch('Buscar por nombre o teléfono') +
      gchips(
        [
          ['', 'Todos', T.length],
          ['ver', 'Verificados', T.filter(ver).length],
          ['ale', 'Con alertas', T.filter(ale).length],
          ['sus', 'Suspendidos', T.filter((x) => x.suspendido).length],
        ],
        f.f,
      ) +
      `<div class="fsel">${gsel('r', [['', 'Todos los rubros'], ...RUB.map((x) => [x, x])], f.r, 'Rubro')}${gsel(
        'o',
        [
          ['nuevos', 'Más nuevos'],
          ['puntaje', 'Mejor puntaje'],
          ['post', 'Más propuestas'],
        ],
        f.o,
        'Ordenar',
      )}</div>`;
  } else if (GZ === 'clientes') {
    const T = GD,
      ver = (x) => x.dni && x.direccion && x.mail;
    GL = () => {
      let r = T.filter(
        (x) =>
          gmatch(x, ['nombre', 'telefono', 'barrio', 'mail']) &&
          (!f.f || (f.f === 'ver' && ver(x)) || (f.f === 'act' && x.activas > 0) || (f.f === 'sus' && x.suspendido)),
      );
      if (f.o === 'pedidos') r = [...r].sort((a, b) => b.total - a.total);
      GCT = gcnt(r.length, T.length, 'clientes');
      return (
        r
          .map((x) => gusr(x, `<p class="s">${x.total} pedidos · ${x.activas} activos · alta ${fec(x.creado)}</p>`))
          .join('') || '<p class="s">Sin resultados.</p>'
      );
    };
    tools =
      gsearch('Buscar por nombre o teléfono') +
      gchips(
        [
          ['', 'Todos', T.length],
          ['ver', 'Verificados', T.filter(ver).length],
          ['act', 'Con pedidos activos', T.filter((x) => x.activas > 0).length],
          ['sus', 'Suspendidos', T.filter((x) => x.suspendido).length],
        ],
        f.f,
      ) +
      `<div class="fsel">${gsel(
        'o',
        [
          ['nuevos', 'Más nuevos'],
          ['pedidos', 'Más pedidos'],
        ],
        f.o,
        'Ordenar',
      )}</div>`;
  } else if (GZ === 'pedidos') {
    const P = GD.pedidos;
    GL = () => {
      const r = P.filter(
        (c) =>
          gmatch(c, ['titulo', 'cliente', 'telefono', 'barrio', 'rubro']) &&
          (!f.r || c.rubro === f.r) &&
          (f.f !== 'sinpost' || (c.estado === 'abierta' && c.post === 0)),
      );
      GCT = gcnt(r.length, P.length, 'pedidos');
      return (
        r
          .map((c) => {
            const vivo = ['abierta', 'elegida'].includes(c.estado);
            return `<div class="card"><b>#${c.id} ${esc(c.titulo)}</b><p class="s">${esc(rbl(c.rubro, c.rubro_otro))}${c.barrio ? ' · ' + esc(c.barrio) : ''} · <span class="bd ${c.estado === 'abierta' || c.estado === 'elegida' || c.estado === 'hecha' ? 'elegida' : 'cancelada'}">${EST[c.estado] || esc(c.estado)}</span>${c.dest_hasta > now ? ' <span class="bd abierta">Destacado</span>' : ''}${c.oculta ? ' <span class="bd cancelada">Borrado por el cliente</span>' : ''}</p><p class="s">${esc(c.cliente)} · ${esc(c.telefono)}</p><p class="s">${c.props} ${plu(c.props, 'propuesta', 'propuestas')}${c.props !== c.post ? ' (' + c.post + ' activas)' : ''} · ${c.fotos} fotos · ${vivo ? 'vence' : 'venció'} ${fecH(c.vence)}</p><div class="ac">${gb('props', 'Ver propuestas', `data-id="${c.id}"`)}${c.dest_hasta > now ? gb('quitar-destacado', 'Sacar destacado', `data-id="${c.id}"`) : ''}${vivo ? gb('bajar', 'Dar de baja', `data-id="${c.id}"`) : ''}</div></div>`;
          })
          .join('') || '<p class="s">Sin resultados.</p>'
      );
    };
    tools =
      gsearch('Buscar por título o cliente') +
      gchips(
        [
          ['', 'Todos'],
          ['abierta', 'Abiertos'],
          ['elegida', 'En marcha'],
          ['hecha', 'Hechos'],
          ['vencida', 'Vencidos'],
          ['cancelada', 'Cancelados'],
          ['dest', 'Destacados'],
          ['sinpost', 'Sin propuestas'],
        ],
        f.f,
      ) +
      `<div class="fsel">${gsel('r', [['', 'Todos los rubros'], ...RUB.map((x) => [x, x])], f.r, 'Rubro')}</div>`;
  } else if (GZ === 'destacados') {
    const P = GD;
    pre = `<p class="s">Pedidos que están destacados ahora. Si sacás uno, deja de salir primero y se le avisa al cliente.</p>`;
    GL = () => {
      const r = P.filter((c) => gmatch(c, ['titulo', 'cliente', 'telefono', 'barrio', 'rubro']));
      GCT = gcnt(r.length, P.length, 'destacados activos');
      return (
        r
          .map(
            (c) =>
              `<div class="card"><b>#${c.id} ${esc(c.titulo)}</b><p class="s">${esc(rbl(c.rubro, c.rubro_otro))}${c.barrio ? ' · ' + esc(c.barrio) : ''} · ${EST[c.estado] || esc(c.estado)}</p><p class="s">${esc(c.cliente)} · ${esc(c.telefono)}</p><p class="s">Destacado desde ${fecH(c.dest_desde)} hasta ${fecH(c.dest_hasta)} · ${c.post} ${plu(c.post, 'postulante', 'postulantes')}</p><div class="ac"><a class="btn wa" href="${wa(c.telefono)}" target="_blank" rel="noopener">WhatsApp</a>${gb('props', 'Ver propuestas', `data-id="${c.id}"`)}${gb('quitar-destacado', 'Sacar destacado', `data-id="${c.id}"`)}</div></div>`,
          )
          .join('') || '<div class="card"><p class="s">No hay pedidos destacados ahora.</p></div>'
      );
    };
    tools = gsearch('Buscar por título o cliente');
  } else if (GZ === 'resenas') {
    const R = GD;
    pre = `<p class="s">Reseñas de los clientes. Podés quitar solo el comentario y las fotos (queda el puntaje) o borrar la reseña entera.</p>`;
    GL = () => {
      const r = R.filter(
        (x) =>
          gmatch(x, ['comentario', 'trabajador', 'cliente', 'titulo']) &&
          (!f.f ||
            (f.f === 'com' && x.comentario) ||
            (f.f === 'fot' && x.fotos) ||
            (f.f === 'baj' && x.estrellas <= 2)),
      );
      GCT = gcnt(r.length, R.length, 'reseñas');
      return (
        r
          .map((x) => {
            const fo = x.fotos ? x.fotos.split(',') : [];
            return `<div class="card"><b>${'★'.repeat(x.estrellas)}${'☆'.repeat(5 - x.estrellas)}</b> <span class="s">${x.estrellas}/5 · ${fecH(x.creado)} · #${x.id}</span><p class="s">Para <b>${esc(x.trabajador || 'alguien que ya no está')}</b>${x.t_tel ? ' · ' + esc(x.t_tel) : ''}</p><p class="s">De ${esc(x.cliente || 'alguien que ya no está')}${x.c_tel ? ' · ' + esc(x.c_tel) : ''} · «${esc(x.titulo || 'pedido borrado')}»</p>${x.comentario ? `<p class="mot">«${esc(x.comentario)}»</p>` : '<p class="s">Sin comentario.</p>'}${fo.length ? `<div class="gal">${fo.map((i) => `<div><img src="/api/rfoto/${i}" data-a="zoom" data-u="/api/rfoto/${i}" alt="Foto de la reseña" loading="lazy"></div>`).join('')}</div>` : ''}<div class="ac">${x.comentario || fo.length ? gb('resena-quitar', 'Quitar comentario y fotos', `data-id="${x.id}"`) : ''}${gb('resena-borrar', 'Borrar reseña', `data-id="${x.id}"`)}</div></div>`;
          })
          .join('') || '<p class="s">Sin resultados.</p>'
      );
    };
    tools =
      gsearch('Buscar por comentario o nombre') +
      gchips(
        [
          ['', 'Todas'],
          ['com', 'Con comentario'],
          ['fot', 'Con fotos'],
          ['baj', '1 o 2 estrellas'],
        ],
        f.f,
      );
  } else if (GZ === 'fotos') {
    const F = GD,
      t = f.t,
      U = (x) =>
        t === 'perfil'
          ? `/api/pfoto/${x.id}?v=${x.k}`
          : `/api/${{ trabajos: 'tfoto', resenas: 'rfoto', pedidos: 'foto' }[t]}/${x.id}.${x.k}`;
    pre = `<p class="s">Fotos subidas por los usuarios. Tocá una para verla grande y la × para borrarla. Si borrás una foto de perfil, esa persona tiene que subir otra para seguir.</p>`;
    GL = () => {
      const r = F.filter((x) => gmatch(x, ['nombre', 'telefono']));
      GCT = gcnt(r.length, F.length, 'fotos');
      return r.length
        ? `<div class="gal">${r.map((x) => `<div><img src="${U(x)}" data-a="zoom" data-u="${U(x)}" alt="Foto de ${esc(x.nombre)}" loading="lazy"><button data-g="foto-borrar" data-id="${x.id}" data-t="${t}" aria-label="Borrar esta foto">×</button><p class="s gc">${esc(x.nombre)}</p></div>`).join('')}</div>`
        : '<p class="s">Sin resultados.</p>';
    };
    tools =
      gsearch('Buscar por nombre o teléfono') +
      gchips(
        [
          ['perfil', 'Perfil'],
          ['trabajos', 'Trabajos'],
          ['resenas', 'Reseñas'],
          ['pedidos', 'Pedidos'],
        ],
        t,
      );
  } else if (GZ === 'denuncias') {
    const D = GD.items;
    pre = `<p class="s">Acá llegan las denuncias de los usuarios (el botón de la banderita en un pedido o en un perfil). Podés cerrarlas, dar de baja el pedido o suspender a la persona.</p>`;
    GL = () => {
      const r = D.filter(
        (x) =>
          gmatch(x, ['autor', 'motivo', 'p_titulo', 'p_cliente', 'u_nombre', 'u_tel', 'p_tel']) &&
          (!f.f ||
            (f.f === 'abierta' && x.estado === 'abierta') ||
            (f.f === 'cerrada' && x.estado === 'cerrada') ||
            (f.f === 'pedido' && x.tipo === 'pedido') ||
            (f.f === 'usuario' && x.tipo === 'usuario') ||
            (f.f === 'rep' && x.veces > 1)),
      );
      GCT = gcnt(r.length, D.length, 'denuncias');
      return (
        r
          .map((x) => {
            const ab = x.estado === 'abierta',
              ped = x.tipo === 'pedido',
              tel = ped ? x.p_tel : x.u_tel,
              sus = ped ? x.p_susp : x.u_susp,
              existe = ped ? x.p_titulo != null : x.u_nombre != null,
              vivo = ped && ['abierta', 'elegida'].includes(x.p_estado);
            const que = !existe
              ? `<p class="s">${ped ? 'El pedido ya no existe.' : 'La cuenta ya no existe.'}</p>`
              : ped
                ? `<p><b>«${esc(x.p_titulo)}»</b> <span class="s">· ${esc(x.p_rubro)} · ${x.p_estado === 'elegida' ? 'en marcha' : esc(x.p_estado)}</span></p><p class="s">Publicado por ${esc(x.p_cliente)} · ${esc(x.p_tel)}${x.p_susp ? ' · <span class="bd cancelada">Suspendido</span>' : ''}</p>`
                : `<p><b>${esc(x.u_nombre)}</b> <span class="s">· ${esc(x.u_tel)} · ${x.u_tipo === 'trabajador' ? 'trabajador' : 'cliente'}</span>${x.u_susp ? ' <span class="bd cancelada">Suspendido</span>' : ''}</p>`;
            return `<div class="card${ab ? ' den-ab' : ''}"><div class="dh"><span class="bd ${ped ? '' : 'elegida'}">${ped ? 'Pedido' : 'Persona'}</span> <span class="bd ${ab ? 'cancelada' : ''}">${ab ? 'Abierta' : 'Cerrada'}</span>${x.veces > 1 ? ` <span class="bd rep">${x.veces} denuncias iguales</span>` : ''}</div>${que}<p class="mot">«${esc(x.motivo || 'Sin motivo')}»</p><p class="s">Denunció ${esc(x.autor || 'alguien que ya no está')}${x.autor_tel ? ' · ' + esc(x.autor_tel) : ''} · ${fecH(x.creado)} · #${x.id}</p><div class="ac">${ab ? gb('cerrar-denuncia', 'Cerrar denuncia', `data-id="${x.id}"`) : ''}${vivo ? gb('bajar', 'Dar de baja el pedido', `data-id="${x.objetivo_id}"`) : ''}${existe && tel ? gb('susp', sus ? 'Activar a ' + (ped ? 'su dueño' : 'la persona') : 'Suspender ' + (ped ? 'al dueño' : 'a la persona'), `data-t="${esc(tel)}" data-on="${sus ? 0 : 1}"`) : ''}</div></div>`;
          })
          .join('') || '<div class="card"><p class="s">No hay denuncias con ese filtro.</p></div>'
      );
    };
    tools =
      gsearch('Buscar por motivo o nombre') +
      gchips(
        [
          ['', 'Todas', D.length],
          ['abierta', 'Abiertas', D.filter((x) => x.estado === 'abierta').length],
          ['cerrada', 'Cerradas', D.filter((x) => x.estado === 'cerrada').length],
          ['pedido', 'De pedidos', D.filter((x) => x.tipo === 'pedido').length],
          ['usuario', 'De personas', D.filter((x) => x.tipo === 'usuario').length],
          ['rep', 'Reiteradas', D.filter((x) => x.veces > 1).length],
        ],
        f.f,
      );
  } else if (GZ === 'pagos') {
    const AL = GD.hist;
    const fp = (x) =>
      `<div class="card"><b>${x.tipo === 'alertas' ? 'Alertas 7 días' : 'Destacado 72 hs'}</b> <span class="bd ${x.estado === 'activa' ? 'abierta' : 'cancelada'}">${x.estado === 'activa' ? 'Activa' : 'Sin activar'}</span><p class="s">${esc(x.nombre)} · ${esc(x.telefono)}${x.titulo ? ' · «' + esc(x.titulo) + '»' : ''}</p><p class="s">Pedida ${fecH(x.creado)}${x.estado === 'activa' ? ' · vence ' + fecH(x.vence) : ''} · #${x.id}</p></div>`;
    post = GPR
      ? `<div class="card"><b>Potenciaciones gratuitas</b><div class="set"><span>Primera potenciación gratis para cada cuenta</span><button class="btn g" data-g="primera" data-v="${GPR.primera_gratis}">${GPR.primera_gratis ? 'Prendida' : 'Apagada'}</button></div></div>`
      : '';
    pre = `<p class="s">Historial de potenciaciones. Todas son gratuitas; no se cobra nada.</p>`;
    GL = () => {
      const r = AL.filter(
        (x) =>
          gmatch(x, ['nombre', 'telefono', 'titulo', 'id']) &&
          (!f.f ||
            (f.f === 'activa' && x.estado === 'activa') ||
            (f.f === 'alertas' && x.tipo === 'alertas') ||
            (f.f === 'destacado' && x.tipo === 'destacado')),
      );
      GCT = gcnt(r.length, AL.length, 'potenciaciones');
      return r.map(fp).join('') || '<div class="card"><p class="s">No hay potenciaciones con ese filtro.</p></div>';
    };
    tools =
      gsearch('Buscar por nombre o teléfono') +
      gchips(
        [
          ['', 'Todas', AL.length],
          ['activa', 'Activas', AL.filter((x) => x.estado === 'activa').length],
          ['alertas', 'Alertas', AL.filter((x) => x.tipo === 'alertas').length],
          ['destacado', 'Destacados', AL.filter((x) => x.tipo === 'destacado').length],
        ],
        f.f,
      );
  } else if (GZ === 'locales') {
    const L = GD;
    pre = `<button class="btn full" data-g="local-nuevo">${sv(X.plus)} Agregar local</button>`;
    GL = () => {
      const r = L.filter(
        (x) =>
          gmatch(x, ['nombre', 'direccion', 'barrio', 'telefono', 'rubro']) &&
          (!f.r || x.rubro === f.r) &&
          (!f.f ||
            (f.f === 'vis' && x.activo) ||
            (f.f === 'ocu' && !x.activo) ||
            (f.f === 'qr' && (x.visitas || x.registros))),
      );
      GCT = gcnt(r.length, L.length, 'locales');
      return (
        r
          .map(
            (x) =>
              `<div class="card"><b>${esc(x.nombre)}</b>${x.activo ? '' : ' <span class="bd cancelada">Oculto</span>'}<p class="s">${esc(x.rubro)}${x.barrio ? ' · ' + esc(x.barrio) : ''}</p>${x.direccion ? `<p class="s">${sv(X.pin)} ${esc(x.direccion)}</p>` : ''}${x.horario ? `<p class="s">${sv(X.clk)} ${esc(x.horario)}</p>` : ''}<p class="s">${x.telefono ? esc(x.telefono) + (x.whatsapp ? ' · WhatsApp' : '') : 'Sin teléfono'}</p><p class="s">QR: ${x.visitas} visitas · ${x.registros} registros · ${x.pedidos} pedidos</p><div class="ac">${gb('local-qr', 'QR', `data-id="${x.id}"`)}${gb('local-editar', 'Editar', `data-id="${x.id}"`)}${gb('local-ocultar', x.activo ? 'Ocultar' : 'Mostrar', `data-id="${x.id}" data-v="${x.activo ? 1 : 0}"`)}${gb('local-borrar', 'Borrar', `data-id="${x.id}"`)}</div></div>`,
          )
          .join('') || '<p class="s">Sin resultados.</p>'
      );
    };
    tools =
      gsearch('Buscar por nombre o dirección') +
      gchips(
        [
          ['', 'Todos', L.length],
          ['vis', 'Visibles', L.filter((x) => x.activo).length],
          ['ocu', 'Ocultos', L.filter((x) => !x.activo).length],
          ['qr', 'Con movimiento de QR', L.filter((x) => x.visitas || x.registros).length],
        ],
        f.f,
      ) +
      `<div class="fsel">${gsel('r', [['', 'Todos los rubros'], ...RLOC.map((x) => [x, x])], f.r, 'Rubro')}</div>`;
  } else {
    const a = GD,
      fo = a.fotos,
      tot = ['pedidos', 'perfil', 'resenas', 'trabajos'].reduce((s, k) => s + fo[k].b, 0),
      lim = a.ajustes.limite_mb * 1048576,
      use = a.db || tot,
      pc = Math.min(100, Math.round((use / lim) * 100)),
      lg = a.logs,
      tp = [...new Set(lg.map((l) => l.tipo))];
    pre = `<div class="card"><b>Base de datos (D1)</b><p class="s">${MBf(use)} MB de ${a.ajustes.limite_mb} MB${a.db ? '' : ' (solo fotos: la D1 no informó su tamaño)'}</p><div class="pg${pc >= 80 ? ' alto' : ''}"><i style="width:${pc}%"></i></div><p class="s">Fotos: ${MBf(tot)} MB · pedidos ${fo.pedidos.n} · perfil ${fo.perfil.n} · reseñas ${fo.resenas.n} · trabajos ${fo.trabajos.n}</p>${gb('purgar', 'Borrar fotos de pedidos vencidos ahora')}</div>
    <div class="card"><b>Errores de la app</b>${
      (a.errores || []).length
        ? `<p class="s">Los últimos ${a.errores.length}, del más nuevo al más viejo.</p>${a.errores
            .slice(0, 10)
            .map(
              (x) =>
                `<p class="s"><b>${fecH(x.creado)}</b> · ${esc(x.donde)} · ${esc(x.mensaje)}<br>${esc(x.detalle)}</p>`,
            )
            .join('')}${gb('errborrar', 'Borrar errores')}`
        : '<p class="s">Sin errores registrados. Si algo falla en un celular, aparece acá.</p>'
    }</div>
    <div class="card"><b>Usuarios y pedidos</b><p class="s">${a.usuarios.trabajadores} trabajadores · ${a.usuarios.clientes} clientes</p><p class="s">Abiertos ${a.pedidos.abierta || 0} · En marcha ${a.pedidos.elegida || 0} · Terminados ${a.pedidos.hecha || 0} · Vencidos ${a.pedidos.vencida || 0} · Cancelados ${a.pedidos.cancelada || 0}</p></div>
    <div class="card"><b>Ajustes</b><div class="set"><span>Postulaciones por día por cuenta</span><button class="btn g" data-g="ajuste" data-c="limite_post" data-v="${a.ajustes.limite_post || 6}">${a.ajustes.limite_post || 6}</button></div><div class="set"><span>Propuestas por día fuera de los rubros del trabajador</span><button class="btn g" data-g="ajuste" data-c="limite_otros" data-v="${a.ajustes.limite_otros}">${a.ajustes.limite_otros}</button></div><div class="set"><span>Tope de la D1 para la barra (MB)</span><button class="btn g" data-g="ajuste" data-c="limite_mb" data-v="${a.ajustes.limite_mb}">${a.ajustes.limite_mb}</button></div><p class="s">Fijos en el código: 3 fotos por pedido (se borran al vencer), fotos de reseñas (se avisa y se borran a los 3 meses, queda el puntaje), pedidos eliminados por el cliente (se borran a los 6 meses, salvo los que tienen reseña o denuncia), 3 rubros por trabajador, 20 pedidos por página y 10 invitaciones por día por cliente.</p></div>
    <h2 class="sec s1">Registro de actividad</h2>`;
    GL = () => {
      const r = lg.filter((l) => gmatch(l, ['tipo', 'detalle']) && (!f.f || l.tipo === f.f));
      GCT = gcnt(r.length, lg.length, 'registros');
      return (
        r
          .map(
            (l) =>
              `<div class="lg"><span class="s">${fecH(l.creado)}</span> <span class="bd">${esc(l.tipo)}</span><p>${esc(l.detalle)}</p></div>`,
          )
          .join('') || '<p class="s">Sin resultados.</p>'
      );
    };
    tools =
      gsearch('Buscar en el registro') +
      gchips([['', 'Todos', lg.length], ...tp.map((t) => [t, esc(t), lg.filter((l) => l.tipo === t).length])], f.f);
  }
  const body = GL ? GL() : '';
  return (
    top +
    chips +
    pre +
    tools +
    (GL ? `<p class="s gcnt" id="gcnt">${GCT}</p><div id="gl">${body}</div>` : '') +
    (GL && GMAS
      ? `<p class="s ctr">Hay más. Para buscar en todos, escribí y apretá Enter.</p><button class="btn g full" data-g="mas">Ver más</button>`
      : '') +
    post
  );
}
async function gestion() {
  nv0();
  const k =
    sessionStorage.getItem('k') ||
    (
      (await dlg({
        t: 'Gestión',
        p: 'Ingresá la clave de gestión.',
        f: [{ id: 'k', type: 'password', max: 100, ph: 'Clave' }],
        ok: 'Entrar',
      })) || {}
    ).k;
  if (!k) {
    set('<p class="s">Recargá la página para ingresar la clave.</p>');
    return;
  }
  try {
    const [d, pd, pr] = await Promise.all([
      api('admin/' + GZ + gqs(), null, k),
      GZ === 'inicio' ? null : api('admin/pend', null, k),
      GZ === 'pagos' ? api('admin/precios', null, k) : null,
    ]);
    GD = d;
    GMAS = gmas(d);
    GPR = pr ? pr.ajustes : null;
    GP = 0;
    GDN = GZ === 'inicio' ? d.denuncias : GZ === 'denuncias' ? d.abiertas : pd.den;
    sessionStorage.setItem('k', k);
    document.title = (GP + GDN ? '(' + (GP + GDN) + ') ' : '') + 'Gestión · Dicho y Hecho';
    set(gh());
    gnav();
  } catch (e) {
    sessionStorage.removeItem('k');
    set('<p>' + esc(e.message) + '</p>');
  }
}
document.addEventListener('keydown', (e) => {
  if (e.target.id === 'gq' && e.key === 'Enter' && GPS[GZ]) {
    GQ = e.target.value;
    GSQ.q = GQ.trim();
    go(gestion);
  }
});
document.addEventListener('input', (e) => {
  if (e.target.id === 'gq') {
    GQ = e.target.value;
    if (!GQ.trim() && GSQ.q && GPS[GZ]) {
      GSQ.q = '';
      go(gestion);
      return;
    }
    const l = $('#gl');
    if (l && GL) {
      l.innerHTML = GL();
      const c = $('#gcnt');
      if (c) c.textContent = GCT;
    }
  }
});
document.addEventListener('change', (e) => {
  const k = e.target.dataset && e.target.dataset.gs;
  if (!k || !GF[GZ]) return;
  GF[GZ][k] = e.target.value;
  set(gh());
});
document.addEventListener('click', (e) => {
  const g = e.target.closest('[data-g]');
  if (!g) return;
  const k = sessionStorage.getItem('k'),
    d = g.dataset;
  go(async () => {
    if (d.g === 'gtab') {
      GZ = GLS[d.t] || 'inicio';
      GQ = '';
      GSQ.q = '';
      return gestion();
    }
    if (d.g === 'zona') {
      if (d.z === 'denuncias') GBK = GTZ[GZ] || GBK;
      GZ = d.z;
      GQ = '';
      GSQ.q = '';
      if (GTZ[GZ]) GLS[GTZ[GZ]] = GZ;
      return gestion();
    }
    if (d.g === 'gf') {
      if (GZ === 'fotos') {
        GF.fotos.t = d.v;
        GQ = '';
        GSQ.q = '';
        return gestion();
      }
      GF[GZ].f = d.v;
      if (GZ === 'pedidos') return gestion();
      set(gh());
      return;
    }
    if (d.g === 'mas') {
      const x = await api('admin/' + GZ + gqs(gcur(glist(GD))), null, k),
        c = glist(x),
        y = scrollY;
      GMAS = c.length >= GPS[GZ];
      if (GZ === 'pedidos') GD.pedidos = gdd(GD.pedidos, c);
      else if (GZ === 'pagos') GD.hist = gdd(GD.hist, c);
      else GD = gdd(GD, c);
      set(gh());
      scrollTo(0, y);
      return;
    }
    if (d.g === 'gref') return gestion();
    {
      const CF = gconf(d);
      if (CF && !(await dlg({ t: CF[0], p: CF[1], ok: CF[2] }))) return;
    }
    if (d.g === 'reset') {
      const r = await dlg({
        t: 'PIN nuevo',
        p: 'Para ' + d.t,
        f: [{ id: 'p', type: 'password', mode: 'numeric', max: 6, ph: '6 números' }],
        ok: 'Cambiar PIN',
        v: (x) => (/^\d{6}$/.test(x.p) ? '' : 'El PIN tiene 6 números.'),
      });
      if (!r) return;
      await api('admin/reset-pin', { telefono: d.t, pin: r.p }, k);
    } else if (d.g === 'local-nuevo') {
      const r = await dlg({
        t: 'Nuevo local verificado',
        f: LF({}),
        ok: 'Guardar',
        v: (x) => (x.nombre.length < 2 ? 'Poné el nombre.' : ''),
      });
      if (!r) return;
      const { e: _e, files: _f, rb: _r, ...x } = r;
      await api('admin/local', { ...x, whatsapp: !!x.whatsapp }, k);
    } else if (d.g === 'local-qr') {
      const c = GD.find((y) => y.id == d.id);
      if (!c || !c.codigo) return;
      const u = location.origin + '/?o=' + c.codigo;
      await dlg({
        t: c.nombre,
        p: 'Imprimí este QR y pegalo en la vidriera o el mostrador.',
        h: `<div class="qrb">${QRSVG(u, 220)}</div><p class="s qru">${esc(u)}</p><button class="btn g" id="qr_cp">Copiar enlace</button><button class="btn g" id="qr_im">Imprimir</button>`,
        solo: 1,
        on: () => {
          $('#qr_cp').onclick = () =>
            navigator.clipboard.writeText(u).then(
              () => toast('Enlace copiado'),
              () => toast(u),
            );
          $('#qr_im').onclick = () => {
            const w = open('', '_blank');
            if (!w) return toast('Permití las ventanas emergentes');
            w.document.write(
              '<title>' +
                esc(c.nombre) +
                '</title><body style="font-family:sans-serif;text-align:center;padding:40px"><h1>' +
                esc(c.nombre) +
                '</h1><p>Escaneá para entrar a Dicho y Hecho</p>' +
                QRSVG(u, 360) +
                '<p>' +
                esc(u) +
                '</p><script>onload=()=>print()<\/script>',
            );
            w.document.close();
          };
        },
        v: () => '',
      });
      return;
    } else if (d.g === 'local-editar') {
      const c = GD.find((y) => y.id == d.id);
      if (!c) return;
      const r = await dlg({
        t: 'Editar local',
        f: LF(c),
        ok: 'Guardar cambios',
        v: (x) => (x.nombre.length < 2 ? 'Poné el nombre.' : ''),
      });
      if (!r) return;
      const { e: _e, files: _f, rb: _r, ...x } = r;
      await api('admin/local-editar', { ...x, id: +d.id, whatsapp: !!x.whatsapp }, k);
    } else if (d.g === 'local-borrar') {
      const r = await dlg({
        t: 'Borrar local',
        p: 'Se borra para siempre. Si solo querés sacarlo un tiempo, usá Ocultar.',
        ok: 'Sí, borrar',
      });
      if (!r) return;
      await api('admin/local-borrar', { id: +d.id }, k);
    } else if (d.g === 'ajuste') {
      const AJ = {
        limite_post: [
          'Postulaciones por día',
          'Cuántos pedidos por día puede tomar cada trabajador en total (1 a 100).',
        ],
        limite_otros: [
          'Propuestas por día',
          'Cuántos pedidos por día puede tomar un trabajador fuera de sus rubros (0 a 50).',
        ],
        limite_mb: ['Tope de la D1', 'Tamaño máximo en MB que querés ver en la barra de la base (50 o más).'],
      }[d.c];
      const r = await dlg({
        t: AJ[0],
        p: AJ[1],
        f: [{ id: 'v', type: 'text', mode: 'numeric', max: 8, val: d.v }],
        ok: 'Guardar',
        v: (x) => (/^\d{1,8}$/.test(x.v) ? '' : 'Poné un número.'),
      });
      if (!r) return;
      await api('admin/ajuste', { clave: d.c, valor: +r.v }, k);
    } else if (d.g === 'telaviso') {
      if (!('serviceWorker' in navigator) || !('PushManager' in window))
        throw new Error('Este navegador no permite avisos. En iPhone, instalá la app primero.');
      if ((await Notification.requestPermission()) !== 'granted')
        throw new Error('Los avisos quedaron bloqueados en este celu');
      const kk = (await api('push-key')).key;
      if (!kk) throw new Error('Los avisos no están configurados en el servidor (faltan las claves VAPID)');
      const sb = await (
        await navigator.serviceWorker.ready
      ).pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: Uint8Array.from(atob(kk.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0)),
      });
      const kx = sb.toJSON().keys || {};
      await api('admin/push', { endpoint: sb.endpoint, p256dh: kx.p256dh, auth: kx.auth }, k);
      toast('Avisos activados en este celu');
    } else if (d.g === 'telon') {
      await api('admin/ajuste', { clave: 'tel_on', valor: +d.v ? 0 : 1 }, k);
    } else if (d.g === 'refanul') await api('admin/ref-anular', { telefono: d.t }, k);
    else if (d.g === 'errborrar') await api('admin/errores-borrar', {}, k);
    else if (d.g === 'primera') {
      await api('admin/ajuste', { clave: 'primera_gratis', valor: +d.v ? 0 : 1 }, k);
    } else if (d.g === 'purgar') {
      const r = await api('admin/purgar-fotos', {}, k);
      toast(r.borradas + ' fotos borradas');
      return gestion();
    } else if (d.g === 'props') {
      const r = await api('admin/propuestas?pedido=' + d.id, null, k),
        c = r.pedido,
        EP = { activa: 'Activa', elegida: 'Elegida', descartada: 'Descartada' };
      await dlg({
        t: 'Propuestas del pedido #' + c.id,
        p: '«' + c.titulo + '» · ' + c.cliente + ' · ' + (EST[c.estado] || c.estado),
        h:
          (r.items.length
            ? r.items
                .map(
                  (x) =>
                    `<div class="in"><b>${esc(x.nombre)}</b> <span class="bd ${x.estado === 'elegida' ? 'elegida' : ''}">${esc(EP[x.estado] || x.estado)}</span>${x.oculta ? ' <span class="bd cancelada">Oculta</span>' : ''}${x.suspendido ? ' <span class="bd cancelada">Suspendido</span>' : ''}<p class="s">${esc(x.telefono)} · ${x.prom ? STAR + ' ' + x.prom + ' (' + x.n + ')' : 'Sin puntaje'} · ${fecH(x.creado)}</p><p>${esc(x.mensaje || 'Sin mensaje')}</p><div class="ac"><a class="btn wa" href="${wa(x.telefono)}" target="_blank" rel="noopener">WhatsApp</a></div></div>`,
                )
                .join('')
            : '<p class="s">Nadie se postuló todavía.</p>') +
          (r.resena
            ? `<p class="s"><b>Reseña:</b> ${r.resena.estrellas}/5${r.resena.comentario ? ' · «' + esc(r.resena.comentario) + '»' : ''}</p>`
            : ''),
        solo: 1,
        v: () => '',
      });
      return;
    } else if (['quitar-destacado', 'resena-quitar', 'resena-borrar', 'foto-borrar'].includes(d.g)) {
      const MS = {
        'quitar-destacado': [
          'Sacar destacado',
          'El pedido deja de salir primero y se le avisa al cliente.',
          'Sí, sacar',
        ],
        'resena-quitar': [
          'Quitar comentario y fotos',
          'Queda el puntaje y se borran el comentario y las fotos. Se le avisa al cliente.',
          'Sí, quitar',
        ],
        'resena-borrar': [
          'Borrar reseña',
          'Se borra la reseña entera y deja de contar en el puntaje. Ese cliente podría volver a puntuar el pedido.',
          'Sí, borrar',
        ],
        'foto-borrar': ['Borrar foto', 'Se borra para siempre y se le avisa a la persona.', 'Sí, borrar'],
      }[d.g];
      const r = await dlg({ t: MS[0], p: MS[1], ok: MS[2] });
      if (!r) return;
      await api('admin/' + d.g, { id: +d.id, t: d.t }, k);
    } else if (d.g === 'susp') await api('admin/suspender', { telefono: d.t, on: +d.on }, k);
    else if (d.g === 'elimdef') await api('admin/eliminar-cuenta', { telefono: d.t }, k);
    else await api('admin/' + d.g, { id: +d.id }, k);
    toast('Listo');
    gestion();
  });
});
