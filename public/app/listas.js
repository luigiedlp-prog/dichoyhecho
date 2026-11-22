/* Buscar, ordenar y directorio de trabajadores. Se carga como script común, en este orden (ver index.html); comparte las variables con los demás archivos de app/. */
// ---- Buscar y ordenar pedidos; directorio de trabajadores
let FQ = '',
  FO = 'nuevos',
  FTK = 0,
  FT = 0,
  DQ = '',
  DR = '',
  DB2 = '',
  DV = 0,
  DM = 0,
  DO = 'puntaje',
  DP = 1,
  DTK = 0,
  DT = 0;
const FORD = [
    ['nuevos', 'Más nuevos'],
    ['vence', 'Por vencer'],
    ['pocos', 'Menos postulantes'],
  ],
  DORD = [
    ['puntaje', 'Mejor puntaje'],
    ['trabajos', 'Más trabajos'],
    ['nuevos', 'Más nuevos'],
  ];
const sbar = (id, ph, v, ops, cur, act, lb) =>
  `<div class="sbar"><div class="sin">${sv(X.srch)}<input id="${id}" type="search" placeholder="${esc(ph)}" value="${esc(v)}" aria-label="${esc(ph)}" autocomplete="off" enterkeyhint="search"></div><select data-a="${act}" aria-label="${lb}">${ops.map((o) => `<option value="${o[0]}"${o[0] === cur ? ' selected' : ''}>${o[1]}</option>`).join('')}</select></div>`;
const feedUrl = (M) =>
  'pedidos?rubro=' +
  encodeURIComponent(fr) +
  '&barrio=' +
  encodeURIComponent(fb) +
  '&mis=' +
  (M ? 1 : 0) +
  '&pag=' +
  pg +
  '&q=' +
  encodeURIComponent(FQ.trim()) +
  '&o=' +
  FO;
const dirUrl = () =>
  'directorio?rubro=' +
  encodeURIComponent(DR) +
  '&barrio=' +
  encodeURIComponent(DB2) +
  '&ver=' +
  DV +
  '&min=' +
  DM +
  '&q=' +
  encodeURIComponent(DQ.trim()) +
  '&o=' +
  DO +
  '&pag=' +
  DP;
const cupoChip = (d, R0) =>
  R0.length && d.cupo != null
    ? `<span class="chi${d.cupo ? '' : ' cero'}" title="Propuestas que te quedan hoy fuera de tus rubros">${sv(X.info)} Fuera de tus rubros hoy: <b>${d.cupo} de ${d.lim}</b></span>`
    : '';
const zonaTxt = (d) =>
  fb ? fb + ' · ' + d.tot + (d.tot === 1 ? ' pedido' : ' pedidos') : 'Elegí un barrio o mirá el mapa.';
const feedList = (d, M) => {
  const l = d.items.map(chg).join('') + pager(d);
  if (l) return l;
  const q = FQ.trim();
  if (q)
    return empty(
      ILU.busq,
      'No encontramos «' + esc(q.slice(0, 40)) + '»',
      'Probá con otra palabra o sacá los filtros.',
      '<button class="btn g" data-a="fclr">Quitar la búsqueda</button>',
    );
  return empty(
    ILU.busq,
    fr || fb || M
      ? 'Nada' + (M ? ' de tus rubros' : fr ? ' de ' + fr : '') + (fb ? ' en ' + fb : '') + ' por ahora'
      : 'Todavía no hay pedidos',
    'Activá los avisos y te escribimos apenas salga uno.',
    '<button class="btn y" data-a="tab" data-t="perfil">Activar avisos</button>',
  );
};
const dirCnt = (d) => (d.tot === 1 ? '1 trabajador' : d.tot + ' trabajadores');
const avv = (x) => `<span class="avw">${av(x.id, x.fv, x.nombre, 'av s56')}${x.ver ? `<span class="avv">${vb(1)}</span>` : ''}</span>`;
const CHEV = sv('<path d="M9 6l6 6-6 6"/>');
const wk = (x) => {
  const r = JSON.parse(x.rubros || '[]');
  return `<article class="card rich wk"><div class="top">${avv(x)}<div class="gw"><h3>${esc(x.nombre)}${pb(x.pio, 1)}</h3><p class="wr">${esc(r[0] || 'Sin rubro cargado')}${r.length > 1 ? ` <span class="s">+${r.length - 1}</span>` : ''}</p><p>${star(x.prom, x.n)}</p><p class="s wb">${x.barrio ? sv(X.pin) + ' ' + esc(x.barrio) : 'Sin barrio cargado'}</p></div><button class="chv" data-a="pw" data-id="${x.id}" data-inv="1" aria-label="Ver perfil de ${esc(x.nombre)}">${CHEV}</button></div><div class="rbs">${r.map((k) => `<span class="rbp">${IC[k] || ''} ${esc(k)}</span>`).join('')}</div>${x.bio ? `<p class="ds">${esc(x.bio)}</p>` : ''}<div class="ac"><button class="btn g" data-a="pw" data-id="${x.id}" data-inv="1">Ver perfil</button><button class="btn" data-a="inv" data-id="${x.id}" data-n="${esc(x.nombre)}">Invitar a un pedido</button></div></article>`;
};
const dirList = (d) => {
  const l =
    d.items.map(wk).join('') +
    (d.pags > 1
      ? `<div class="pager"><button class="btn g" data-a="dpag" data-d="-1"${d.pag <= 1 ? ' disabled' : ''}>‹ Anterior</button><span class="s">Página ${d.pag} de ${d.pags}</span><button class="btn g" data-a="dpag" data-d="1"${d.pag >= d.pags ? ' disabled' : ''}>Siguiente ›</button></div>`
      : '');
  if (l) return l;
  return DQ.trim() || DR || DB2 || DV || DM
    ? empty(
        ILU.gente,
        'Nadie con esos filtros',
        'Probá con menos filtros: todavía somos pocos y vamos creciendo.',
        '<button class="btn g" data-a="dclr">Quitar los filtros</button>',
      )
    : empty(
        ILU.gente,
        'Todavía no hay trabajadores',
        'Estamos sumando los primeros. Mientras tanto, publicá tu pedido y te escriben ellos.',
        '<button class="btn" data-a="tab" data-t="pub">Publicar un pedido</button>',
      );
};
const pager = (d) =>
  d.pags > 1
    ? `<div class="pager"><button class="btn g" data-a="pag" data-d="-1"${d.pag <= 1 ? ' disabled' : ''}>‹ Anterior</button><span class="s">Página ${d.pag} de ${d.pags}</span><button class="btn g" data-a="pag" data-d="1"${d.pag >= d.pags ? ' disabled' : ''}>Siguiente ›</button></div>`
    : '';
