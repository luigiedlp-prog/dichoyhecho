/* Saludo y las pantallas de la app (view). Se carga como script común, en este orden (ver index.html); comparte las variables con los demás archivos de app/. */
// Saludo según la hora del celular + una frase corta (se elige una vez por franja y se mantiene mientras la app está abierta)
const SAL_TODOS = ['Qué bueno tenerte de nuevo por acá.', 'Un gusto verte otra vez.', 'Nos alegra que estés acá.'],
  SAL_FR = {
    dia: ['Que tengas un excelente día.', 'Un buen comienzo de jornada.'],
    tarde: ['Que la tarde te rinda.', 'Seguimos con buen ritmo.'],
    noche: ['Todavía estás a tiempo de resolver algo.', 'Un último vistazo antes de descansar.'],
  },
  SAL_ROL = {
    trabajador: ['Mirá qué hay hoy en Pergamino.', 'Que hoy salgan buenos trabajos.', 'Te deseamos una buena jornada.'],
    cliente: [
      '¿Qué necesitás resolver hoy?',
      'Estamos para ayudarte a encontrar a la persona indicada.',
      'Publicá lo que necesitás, nosotros lo difundimos.',
    ],
  };
const MAILI = sv('<rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="M3.5 7l8.5 6 8.5-6"/>');
let SAL = null;
const saludo = (h1) => {
  const h = new Date().getHours(),
    fr = h >= 6 && h < 12 ? 'dia' : h >= 12 && h < 20 ? 'tarde' : 'noche';
  if (!SAL || SAL.fr !== fr || SAL.t !== me.tipo) {
    const l = [...SAL_TODOS, ...SAL_FR[fr], ...(SAL_ROL[me.tipo] || [])];
    SAL = { fr, t: me.tipo, f: l[Math.floor(Math.random() * l.length)] };
  }
  const g =
    (fr === 'dia' ? '¡Buen día, ' : fr === 'tarde' ? '¡Buenas tardes, ' : '¡Buenas noches, ') +
    esc(me.nombre.split(' ')[0]) +
    '!';
  return h1
    ? `<div class="salh"><h1 class="h1">${g}</h1><p class="s sal2">${SAL.f}</p></div>`
    : `<p class="sal1">${g}</p><p class="s sal2">${SAL.f}</p>`;
};
const view = {
  async feed() {
    const R0 = JSON.parse(me.rubros || '[]'),
      M = mr && !fr && R0.length > 0,
      tok = ++FTK;
    const d = await api(feedUrl(M));
    if (tok !== FTK) return;
    pg = d.pag;
    CUPO = d.cupo;
    const star0 = sv('<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>');
    set(
      ios() +
        heroMarca() +
        (R0.length
          ? ''
          : '<div class="card"><b>Elegí tus rubros</b><p class="s">Así te mostramos primero los pedidos de lo tuyo y te avisamos cuando salga uno.</p><button class="btn" data-a="edperfil">Elegir mis rubros</button></div>') +
        `<div class="gr">${saludo(1)}<p class="s">Pedidos abiertos en Pergamino · <b id="ftot">${d.tot}</b></p><p class="cupo" id="fcupo">${cupoChip(d, R0)}</p></div>${sbar('fqx', 'Buscar pedidos', FQ, FORD, FO, 'ford', 'Ordenar pedidos')}<div class="card zona"><div class="zh"><span class="ic sb">${sv(X.pin)}</span><div><b>Cerca tuyo</b><p class="s" id="fzt">${zonaTxt(d)}</p></div></div><div class="bsel"><select data-a="fbar" aria-label="Filtrar por barrio"><option value="">Todos los barrios</option>${BARRIOS.filter(
          (b) => b !== 'Otro',
        )
          .map((b) => `<option ${b === fb ? 'selected' : ''}>${esc(b)}</option>`)
          .join(
            '',
          )}</select><button class="btn" data-a="mapa">${sv('<path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/>')} Mapa</button></div></div><div class="chp">${R0.length ? `<button class="${M ? 'on' : ''}" data-a="mis">${star0} Mis rubros</button>` : ''}<button class="${fr || M ? '' : 'on'}" data-a="rub" data-r="">Todos</button><button class="rtg${fr ? ' on' : ''}" data-a="rdesp" aria-expanded="false" aria-controls="rpn"${fr ? ` style="${rcs(fr)}"` : ''}>${fr ? IC[fr] + ' ' + esc(fr) : 'Rubros'}${sv('<path d="M6 9l6 6 6-6"/>')}</button></div><div class="chp rpn" id="rpn" hidden>${RUB.map((r) => `<button class="rc${r === fr ? ' on' : ''}" style="--c:${RC[r] || '#14B8A6'};--ct:${r === 'Electricidad' ? '#1c1c1e' : '#fff'}" data-a="rub" data-r="${r}">${IC[r]} ${r}</button>`).join('')}</div>${R0.length && !me.alertas_act && !alOculto() ? `<div class="cta mini"><div><b>Enterate primero</b><span class="s">Alertas inmediatas de pedidos nuevos.</span></div><button class="btn y" data-a="alertas">${me.alertas_pend ? 'Pagar' : 'Activar'}</button><button class="xcta" data-a="xalertas" aria-label="Cerrar">${sv('<path d="M6 6l12 12M18 6L6 18"/>')}</button></div>` : ''}<div id="fres">${feedList(d, M)}</div>`,
    );
  },
  // Cuando se escribe en el buscador o se cambia el orden solo se rehace la lista (no se pierde el teclado)
  async feedQ() {
    const R0 = JSON.parse(me.rubros || '[]'),
      M = mr && !fr && R0.length > 0,
      tok = ++FTK;
    const d = await api(feedUrl(M));
    if (tok !== FTK) return;
    pg = d.pag;
    CUPO = d.cupo;
    const f = $('#fres');
    if (!f) return;
    f.innerHTML = feedList(d, M);
    const t = $('#ftot');
    if (t) t.textContent = d.tot;
    const z = $('#fzt');
    if (z) z.textContent = zonaTxt(d);
    const c = $('#fcupo');
    if (c) c.innerHTML = cupoChip(d, R0);
  },
  async dir() {
    const tok = ++DTK,
      d = await api(dirUrl());
    if (tok !== DTK) return;
    DP = d.pag;
    set(
      `<h1 class="h1">Trabajadores</h1><p class="s">Mirá perfiles y reseñas. Si alguien te gusta, invitalo a postularse a tu pedido.</p>${sbar('dqx', 'Buscar por nombre', DQ, DORD, DO, 'dord', 'Ordenar trabajadores')}<div class="fsel"><select data-a="drubs" aria-label="Filtrar por rubro"><option value="">Todos los rubros</option>${RUB.map((r) => `<option ${r === DR ? 'selected' : ''}>${esc(r)}</option>`).join('')}</select><select data-a="dbar" aria-label="Filtrar por barrio"><option value="">Todos los barrios</option>${BARRIOS.filter(
        (b) => b !== 'Otro',
      )
        .map((b) => `<option ${b === DB2 ? 'selected' : ''}>${esc(b)}</option>`)
        .join(
          '',
        )}</select></div><div class="chp"><button class="${DV ? 'on' : ''}" data-a="dver">${sv('<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M9 12l2 2 4-4"/>')} Verificados</button><button class="${DM === 4 ? 'on' : ''}" data-a="dmin" data-m="4">${STAR} 4 o más</button><button class="${DM === 4.5 ? 'on' : ''}" data-a="dmin" data-m="4.5">${STAR} 4,5 o más</button></div><p class="s gcnt" id="dcnt">${dirCnt(d)}</p><div id="dres">${dirList(d)}</div>`,
    );
  },
  async dirQ() {
    const tok = ++DTK,
      d = await api(dirUrl());
    if (tok !== DTK) return;
    DP = d.pag;
    const f = $('#dres');
    if (!f) return;
    f.innerHTML = dirList(d);
    const c = $('#dcnt');
    if (c) c.textContent = dirCnt(d);
  },
  async mp() {
    const l = (LP = await api('mis-postulaciones'));
    const g = (p) =>
      p.estado === 'descartada'
        ? 'd'
        : p.estado === 'elegida'
          ? p.cestado === 'hecha'
            ? 't'
            : 'm'
          : p.cestado === 'abierta'
            ? 'e'
            : 'c';
    const G = [
      ['m', 'En marcha'],
      ['e', 'Enviadas'],
      ['t', 'Terminadas'],
      ['c', 'Cerradas'],
      ['d', 'Descartadas'],
    ];
    const ct = (k) => l.filter((p) => g(p) === k).length;
    if (fq && !ct(fq)) fq = '';
    const cerr = ct('c') + ct('d');
    const bd = (p) =>
      p.estado === 'elegida'
        ? p.cestado === 'hecha'
          ? ['hecha', 'Terminado']
          : ['elegida', '¡Te eligieron!']
        : p.estado === 'activa' && p.cestado !== 'abierta'
          ? p.cestado === 'vencida' || p.cestado === 'cancelada'
            ? [p.cestado, ST[p.cestado]]
            : ['descartada', 'Eligieron a otro']
          : [p.estado, ST[p.estado]];
    const HN = { m: ct('m') ? 'Escribile al cliente' : '' };
    const f = (p) => {
      const b = bd(p);
      return `<article class="card">${cab({ rubro: p.rubro, titulo: p.titulo, bd: g(p) === 'c' ? `<span class="bd ${b[0]}">${b[1]}</span>` : '' }, p.cliente + ' · ' + p.rubro + (p.barrio ? ' · ' + p.barrio : ''))}<p class="s fh">${p.estado === 'elegida' && p.hecha_en ? 'Terminado ' + fecH(p.hecha_en) : p.estado === 'elegida' && p.elegida_en ? 'Te eligieron ' + fecH(p.elegida_en) : 'Te postulaste ' + fecH(p.creado)}</p>${p.mensaje ? `<p class="ds">${esc(p.mensaje)}</p>` : ''}${p.tel ? `<a class="btn wa full" href="${wa(p.tel)}" target="_blank" rel="noopener">WhatsApp a ${esc(p.cliente)}</a>${p.mail ? `<a class="btn ml full" href="mailto:${esc(p.mail)}">${MAILI} ${esc(p.mail)}</a>` : ''}` : ''}${p.estado === 'activa' || (p.estado === 'elegida' && p.cestado === 'elegida') ? `<div class="sc"><button class="btn rt full" data-a="ret" data-id="${p.id}" data-el="${p.estado === 'elegida' ? 1 : ''}">Retirar propuesta</button></div>` : `<div class="sc"><button class="btn g full" data-a="oc" data-id="${p.id}">Quitar de mi lista</button></div>`}</article>`;
    };
    const gr = fq ? G.filter((x) => x[0] === fq) : G;
    set(
      '<h1 class="h1">Mis propuestas</h1>' +
        (l.length
          ? `<div class="chp"><button class="${fq ? '' : 'on'}" data-a="fq" data-k="">Todas ${l.length}</button>${G.filter(
              (x) => ct(x[0]),
            )
              .map(
                ([k, t]) =>
                  `<button class="${fq === k ? 'on' : ''}" data-a="fq" data-k="${k}">${t} ${ct(k)}${HN[k] ? '<i class="pd" aria-hidden="true"></i>' : ''}</button>`,
              )
              .join('')}</div>` +
            gr
              .map(([k, t]) => {
                const x = l.filter((p) => g(p) === k);
                return x.length
                  ? (fq
                      ? HN[k]
                        ? `<p class="hn1">${HN[k]}</p>`
                        : ''
                      : `<h2 class="sec">${t}${HN[k] ? `<span class="hn">${HN[k]}</span>` : ''}</h2>`) +
                      x.map(f).join('')
                  : '';
              })
              .join('') +
            (cerr && !fq
              ? `<div class="sc"><button class="lk3 rd" data-a="limp">Quitar cerradas y descartadas (${cerr})</button></div>`
              : '')
          : empty(
              ILU.envio,
              'Todavía no te postulaste',
              'Mirá los pedidos abiertos y mandá tu propuesta.',
              '<button class="btn" data-a="tab" data-t="feed">Ver pedidos</button>',
            )),
    );
  },
  async pub() {
    set(
      `<a class="bk" data-a="tab" data-t="mis">‹ Mis pedidos</a><h1 class="h1">Publicá tu pedido</h1><div class="card"><label class="lb" for="ti">¿Qué necesitás?</label><input id="ti" maxlength="80" placeholder="Ej: Revocar un tapial de 6 metros"><label class="lb" for="ru">Rubro</label><select id="ru">${RUB.map((r) => `<option>${r}</option>`).join('')}</select><label class="lb" for="de">Detalles</label><textarea id="de" placeholder="Medidas, materiales, cuándo lo necesitás…"></textarea><label class="lb" for="bb">Barrio</label>${barSel('bb', me.barrio)}<label class="lb" for="pr">Presupuesto</label><input id="pr" placeholder="Ej: $80.000 (vacío = a convenir)"><label class="lb" for="fo">Fotos (hasta 3)</label>${fpick('fo', 3)}<button class="btn full" data-a="publicar">Publicar pedido</button><p class="s ctr">Dura 7 días y lo podés renovar. Las fotos se borran cuando vence.</p></div>`,
    );
  },
  async mis() {
    const [l0, ini] = await Promise.all([api('mis-pedidos'), PCW.matches ? '' : inicioCli()]);
    const l = (LC = l0);
    const G = [
      ['abierta', 'Publicados'],
      ['elegida', 'En marcha'],
      ['hecha', 'Terminados'],
      ['vencida', 'Vencidos'],
    ];
    const ct = (k) => l.filter((c) => c.estado === k).length;
    const need = (c) => (c.estado === 'abierta' && c.post.length > 0) || (c.estado === 'hecha' && !c.punt);
    const needIn = (k) => l.some((c) => c.estado === k && need(c));
    const nT = l.filter(need).length;
    const ok = (k) => (k === 'todo' ? nT > 0 : ct(k) > 0);
    const cur = ok(fm) ? fm : '';
    const EST = { abierta: 'Publicado', elegida: 'En marcha', hecha: 'Terminado', vencida: 'Vencido' },
      ER = { abierta: 1, elegida: 2, hecha: 3, vencida: 4 };
    const HN = { vencida: 'Renová o eliminá' };
    const pl = (p, c) =>
      `<div class="in"><div class="row2">${av(p.tid, p.fv, p.nombre, 'av s40')}<div><button class="lk2" data-a="pw" data-id="${p.tid}">${esc(p.nombre)}</button>${vb(p.ver)}${pb(p.pio, 1)} ${star(p.prom, p.n)}</div></div><p class="s">${esc(JSON.parse(p.rubros || '[]').join(', '))}${p.barrio ? ' · ' + esc(p.barrio) : ''}${p.creado ? ' · Se postuló ' + fecH(p.creado) : ''}</p><p>${esc(p.mensaje)}</p>${p.estado === 'elegida' ? `<a class="btn wa full" href="${wa(p.tel)}" target="_blank" rel="noopener">WhatsApp a ${esc(p.nombre)}</a>${p.mail ? `<a class="btn ml full" href="mailto:${esc(p.mail)}">${MAILI} ${esc(p.mail)}</a>` : ''}` : c.estado === 'abierta' ? `<div class="ac"><button class="btn" data-a="pel" data-id="${p.id}">Elegir</button><button class="btn g" data-a="pde" data-id="${p.id}">Descartar</button></div>` : ''}</div>`;
    const f = (c) => {
      const ch = c.post.find((p) => p.estado === 'elegida'),
        rs = c.post.filter((p) => p !== ch),
        n = rs.length;
      const pri =
        c.estado === 'elegida'
          ? `<button class="btn full" data-a="ch" data-x="hecha" data-id="${c.id}">Marcar como hecho</button>`
          : c.estado === 'vencida'
            ? `<button class="btn full" data-a="ren" data-id="${c.id}">Renovar 7 días</button>`
            : c.estado === 'hecha' && !c.punt
              ? `<button class="btn y full" data-a="punt" data-id="${c.id}">Puntuar el trabajo</button>`
              : '';
      const sec =
        c.estado === 'vencida' || c.estado === 'hecha'
          ? `<button class="lk3 rd" data-a="elim" data-id="${c.id}">Eliminar</button>`
          : c.estado === 'abierta'
            ? `<button class="lk3" data-a="edit" data-id="${c.id}">Editar</button><button class="lk3" data-a="dest" data-id="${c.id}">${c.dest_hasta > Date.now() ? 'Extender destacado' : 'Destacar'}</button><button class="lk3 rd" data-a="ch" data-x="cancelar" data-id="${c.id}">Cancelar pedido</button>`
            : c.estado === 'elegida'
              ? `<button class="lk3" data-a="ch" data-x="reabrir" data-id="${c.id}">Elegir a otro</button>`
              : '';
      const dOn = c.estado === 'abierta' && c.dest_hasta > Date.now(),
        dst =
          c.estado === 'abierta'
            ? dOn
              ? `<p class="s fh">Destacado hasta ${fecH(c.dest_hasta)}</p>`
              : ''
            : '';
      const cta = c.estado === 'abierta' && c.post.length > 0;
      const dl = Math.ceil((c.vence - Date.now()) / 864e5),
        vz = dl <= 0 ? 'Vence hoy' : dl === 1 ? 'Vence mañana' : 'Vence en ' + dl + ' días';
      const inf =
        c.estado === 'abierta'
          ? (c.post.length
              ? c.post.length + (c.post.length === 1 ? ' persona se ofreció' : ' personas se ofrecieron')
              : 'Todavía nadie se ofreció') +
            ' · ' +
            vz
          : c.estado === 'elegida'
            ? ch
              ? 'Con ' + esc(ch.nombre)
              : 'Ya elegiste a alguien'
            : c.estado === 'hecha'
              ? c.punt
                ? 'Ya lo puntuaste'
                : 'Falta puntuar'
              : 'Venció ' + fecH(c.vence);
      const vl = cta
        ? c.post.length === 1
          ? 'Ver a quien se ofreció y elegir'
          : 'Ver quiénes se ofrecieron y elegir'
        : 'Ver detalle';
      const quick =
        c.estado === 'elegida' && ch && ch.tel
          ? `<div class="qk"><a class="btn wa full" href="${wa(ch.tel)}" target="_blank" rel="noopener">WhatsApp a ${esc(ch.nombre)}</a><button class="btn g full" data-a="ch" data-x="hecha" data-id="${c.id}">Marcar como hecho</button></div>`
          : (c.estado === 'hecha' && !c.punt) || c.estado === 'vencida'
            ? pri
            : '';
      const lst =
        c.estado === 'abierta' && n
          ? `<p class="s fh"><b>${n === 1 ? 'Un postulante' : n + ' postulantes'}</b></p>${rs.map((p) => pl(p, c)).join('')}`
          : n
            ? `<details data-k="${c.id}" ${OP.has(c.id) ? 'open' : ''}><summary>${ch ? 'Otros postulantes (' + n + ')' : n + ' postulante' + (n > 1 ? 's' : '') + ' · tocá para ver'}</summary>${rs.map((p) => pl(p, c)).join('')}</details>`
            : c.estado === 'abierta'
              ? '<p class="s">Todavía nadie se postuló. Te avisamos cuando pase.</p>'
              : '';
      const fch =
        c.estado === 'abierta'
          ? 'Publicado ' + fecH(c.creado) + ' · Vence ' + fecH(c.vence)
          : c.estado === 'vencida'
            ? 'Venció ' + fecH(c.vence)
            : c.estado === 'hecha' && c.hecha_en
              ? 'Terminado ' + fecH(c.hecha_en)
              : c.estado === 'elegida' && c.elegida_en
                ? 'Elegiste ' + fecH(c.elegida_en)
                : 'Publicado ' + fecH(c.creado);
      return `<article class="card rich cm${dOn ? ' dst' : ''}" style="--rc:${RC[c.rubro] || '#14B8A6'}"><details class="cd" data-k="${-c.id}" ${OP.has(-c.id) ? 'open' : ''}><summary class="cs">${cab(dOn ? { ...c, bd: '<span class="bd dest">Destacado</span>' } : c, c.rubro + (c.barrio ? ' · ' + c.barrio : '') + ' · ' + c.presupuesto)}<span class="stl"><span class="est">${EST[c.estado] || ''}</span><span>${inf}</span></span><span class="vdet${cta ? ' cta' : ''}" aria-hidden="true"><span class="vdm">${vl}</span><span class="vdl">Ocultar detalle</span><i></i></span></summary><div class="cdb"><p class="s fh">${fch}</p>${c.descripcion ? `<p class="ds">${esc(c.descripcion)}</p>` : ''}${th(c.fotos)}${ch ? pl(ch, c) : ''}${dst}${lst}${c.estado === 'abierta' ? `<p class="s fh">${c.ninv ? 'Invitaste a ' + c.ninv + (c.ninv === 1 ? ' trabajador' : ' trabajadores') + ' · ' : ''}<button class="lk3" data-a="tab" data-t="dir">Buscar trabajadores para invitar</button></p>` : ''}${quick ? '' : pri}${sec ? `<div class="sc">${sec}</div>` : ''}</div></details>${quick}</article>`;
    };
    const vis = l
      .filter((c) => !cur || (cur === 'todo' ? need(c) : c.estado === cur))
      .sort((a, b) => ER[a.estado] - ER[b.estado] || need(b) - need(a) || b.creado - a.creado);
    const cw = (c) => '<div class="cw ce-' + c.estado + '">' + f(c) + '</div>';
    const SEC = [
      ['Para hacer ahora', (c) => need(c), 1],
      ['En curso', (c) => !need(c) && (c.estado === 'abierta' || c.estado === 'elegida')],
      ['Anteriores', (c) => !need(c) && (c.estado === 'hecha' || c.estado === 'vencida')],
    ];
    const lista = cur
      ? '<div class="cas">' + vis.map(cw).join('') + '</div>'
      : SEC.map(([t, fn, at]) => {
          const x = vis.filter(fn);
          return x.length
            ? `<h2 class="lsh${at ? ' at' : ''}">${t}<span>${x.length}</span></h2><div class="cas">${x.map(cw).join('')}</div>`
            : '';
        }).join('');
    set(
      ini +
      '<div class="gr gcl">' +
        saludo() +
        '</div><h1 class="h1">Mis pedidos</h1>' +
        (l.length
          ? `${nT ? '' : '<p class="s mps">Todo al día: no tenés nada pendiente</p>'}<div class="chp"><button class="${cur ? '' : 'on'}" data-a="fm" data-k="">Todos ${l.length}</button>${nT ? `<button class="${cur === 'todo' ? 'on' : ''}" data-a="fm" data-k="todo">Para hacer ${nT}</button>` : ''}${G.filter(
              (g) => ct(g[0]),
            )
              .map(
                ([k, t]) => `<button class="${cur === k ? 'on' : ''}" data-a="fm" data-k="${k}">${t} ${ct(k)}</button>`,
              )
              .join('')}</div>` +
            (HN[cur] ? `<p class="hn1">${HN[cur]}</p>` : '') +
            lista
          : empty(
              ILU.lista,
              'Todavía no publicaste nada',
              'Contá qué necesitás y los trabajadores de tu zona se postulan.',
              '<button class="btn" data-a="tab" data-t="pub">Publicar un pedido</button>',
            )),
    );
  },
  async loc() {
    const l = await api('locales'),
      cs = [...new Set(l.map((x) => x.rubro))];
    if (fl && !cs.includes(fl)) fl = '';
    const sh = sv('<path d="M3 9l1.5-5h15L21 9M3 9v11h18V9M3 9h18M9.5 20v-6h5v6"/>');
    const f = (x) =>
      `<article class="card"><div class="top"><span class="ic" style="background:#14b8a6;color:#0b1f1d">${sh}</span><div class="gw"><h3>${esc(x.nombre)}</h3><p class="s">${esc(x.rubro)}${x.barrio ? ' · ' + esc(x.barrio) : ''}</p></div><span class="bd elegida">${sv(X.chk)} Verificado</span></div>${x.direccion ? `<p class="s">${sv(X.pin)} ${esc(x.direccion)}</p>` : ''}${x.horario ? `<p class="s">${sv(X.clk)} ${esc(x.horario)}</p>` : ''}${x.descripcion ? `<p class="ds">${esc(x.descripcion)}</p>` : ''}<div class="ac">${x.whatsapp && x.telefono ? `<a class="btn wa" href="${wa(x.telefono)}" target="_blank" rel="noopener">WhatsApp</a>` : x.telefono ? `<a class="btn y" href="tel:+${x.telefono.startsWith('54') ? x.telefono : '54' + x.telefono}">Llamar</a>` : ''}${x.direccion ? `<a class="btn mp" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(x.direccion + ', Pergamino')}" target="_blank" rel="noopener">¿Cómo llegar?</a>` : ''}</div></article>`;
    const sup = (window.CFG || {}).soporte;
    set(
      '<h1 class="h1">Locales verificados</h1><p class="s">Pinturerías, ferreterías, sanitarios y más. Los revisamos nosotros.</p>' +
        (cs.length
          ? `<div class="chp"><button class="${fl ? '' : 'on'}" data-a="fl" data-k="">Todos</button>${cs.map((r) => `<button class="${fl === r ? 'on' : ''}" data-a="fl" data-k="${esc(r)}">${esc(r)}</button>`).join('')}</div>`
          : '') +
        (l
          .filter((x) => !fl || x.rubro === fl)
          .map(f)
          .join('') ||
          empty(
            ILU.local,
            'Todavía no hay locales',
            'Estamos sumando los primeros. Pronto vas a encontrar acá dónde comprar tus materiales.',
          )) +
        (sup
          ? `<p class="s ctr">¿Tenés un local? <a href="https://wa.me/${sup}?text=${encodeURIComponent('Hola, quiero que verifiquen mi local en Dicho y Hecho.')}" target="_blank" rel="noopener">Pedí que lo verifiquen</a></p>`
          : ''),
    );
  },
  async nov() {
    const l = await api('avisos');
    set(
      '<h1 class="h1">Novedades</h1>' +
        (l
          .map(
            (a) =>
              `<div class="card${a.leido ? '' : ' nw'}"><p>${esc(a.texto)}</p><p class="s">${ago(a.creado)}</p></div>`,
          )
          .join('') ||
          empty(
            ILU.campana,
            'Sin novedades',
            'Acá vas a ver cuándo se postulan a tus pedidos, cuándo te eligen o te puntúan.',
          )),
    );
    if (me.av) {
      await api('avisos', {});
      me.av = 0;
      nav();
    }
  },
  async telv() {
    set(
      `<h1 class="h1">Confirmá tu teléfono</h1><p class="s">Te mandamos un código de 6 números por WhatsApp al <b>${esc(me.telefono)}</b>. Vale 1 hora. Lo enviamos a mano, así que puede tardar un ratito.</p><div class="card"><label class="lb" for="tc">Código</label><input id="tc" inputmode="numeric" maxlength="6" autocomplete="one-time-code" placeholder="6 números"><button class="btn full" data-a="telok">Confirmar</button></div><button class="btn g full" data-a="telnuevo">Pedir un código nuevo</button><button class="btn g full" data-a="salir">Salir</button>`,
    );
  },
  async completar() {
    set(
      `<h1 class="h1">Completá tu perfil</h1><p class="s">Para usar Dicho y Hecho hace falta tu nombre y apellido. La foto, el barrio y los rubros son opcionales: los podés sumar cuando quieras desde Perfil.</p><div class="card"><div class="in"><b>Nombre y apellido</b><p class="s">Poné tu nombre y tu apellido.</p></div><button class="btn full" data-a="edperfil">Completar mis datos</button><div class="in"><b>${sv(X.chk)} Teléfono</b><p class="s">Ya lo tenemos: lo usaste para crear tu cuenta.</p></div></div><p class="lk"><a data-a="salirc">Cerrar sesión</a></p>`,
    );
  },
  async perfil() {
    const r = JSON.parse(me.rubros || '[]'),
      w = me.tipo === 'trabajador',
      gal = w ? (await api('trabajadores/' + me.id)).fotos : [];
    const ok = [
        [r.length > 0, 'rubros'],
        [!!me.fv, 'foto de perfil'],
        [!!me.bio, 'descripción'],
        [gal.length > 0, 'fotos de tus trabajos'],
      ],
      pc = Math.round((ok.filter((x) => x[0]).length / 4) * 100),
      falta = ok
        .filter((x) => !x[0])
        .map((x) => x[1])
        .join(', ');
    const CH =
      '<svg class="cv" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>';
    const lr = (el, at, ic, t, sub, cls) =>
      `<${el} class="lr${cls ? ' ' + cls : ''}" ${at}>${ic ? `<span class="li">${sv(ic)}</span>` : ''}<span class="lt">${t}</span>${sub ? `<span class="ls">${sub}</span>` : ''}${cls === 'rd' ? '' : CH}</${el}>`;
    const I = {
      ver: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M9 12l2 2 4-4"/>',
      ale: '<path d="M13 2 3 14h9l-1 8 10-12h-9z"/>',
      dat: '<path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
      fot: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M21 16l-5-5-9 9"/>',
      res: '<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>',
      av: '<path d="' + SV.bell + '"/>',
      wa: '<path d="M21 11.5a8.4 8.4 0 0 1-12.4 7.4L3 20.5l1.7-5.4A8.4 8.4 0 1 1 21 11.5z"/>',
      tem: '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>',
      leg: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8zM14 3v5h5M9 13h6M9 17h6"/>',
      ref: '<path d="M20 12v9H4v-9M2 7h20v5H2zM12 22V7M12 7H7.5a2.5 2.5 0 1 1 0-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 1 0 0-5C13 2 12 7 12 7z"/>',
      gui: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.3a2.6 2.6 0 0 1 5 .9c0 1.7-2.5 2.2-2.5 3.8M12 17h.01"/>',
    };
    const rs = r.length
      ? r.length + (r.length > 1 ? ' rubros' : ' rubro')
      : '<span class="warn">Elegí tus rubros</span>';
    set(
      ios() +
        `<div class="card"><div class="row2">${av(me.id, me.fv, me.nombre, 'av s64')}<div><h3>${esc(me.nombre)}${vb(me.ver)}${pb(me.pionero)}</h3><p class="s">${w ? 'Trabajador' : 'Cliente'}${me.barrio ? ' · ' + esc(me.barrio) : ''}</p>${me.pionero ? '<p class="s">Gracias por sumarte desde el principio.</p>' : ''}${w ? '<p>' + star(me.prom, me.n) + '</p>' : ''}</div></div>${w && pc < 100 ? `<div class="pgl"><span class="s"><b>Perfil al ${pc}%</b> · Falta: ${falta}</span></div><div class="pg"><i style="width:${pc}%"></i></div>` : ''}<input id="pf" type="file" accept="image/*" hidden><div class="brow"><button class="btn g" data-a="pfoto">${me.fv ? 'Cambiar foto' : 'Subir foto de perfil'}</button></div></div>
    <div class="lst">${lr('button', 'data-a="edperfil"', I.dat, 'Mis datos' + (w ? ' y rubros' : ''), w ? rs : esc(me.barrio || ''))}${lr('button', 'data-a="pregunta"', I.ver, 'Pregunta de seguridad', me.pregunta ? 'Para recuperar tu PIN' : 'Falta cargarla')}${lr('button', 'data-a="verif"', I.ver, 'Verificá tu cuenta', me.ver ? 'Verificada' : 'Sumá DNI, dirección y mail')}${lr('button', 'data-a="refer"', I.ref, 'Invitá y ganá una potenciación', me.promos > 0 ? 'Tenés ' + me.promos + (me.promos > 1 ? ' ganadas' : ' ganada') : me.ref_prem >= me.ref_max ? 'Llegaste al máximo' : (me.ref_n % me.ref_de) + ' de ' + me.ref_de + ' invitados')}${w ? lr('button', 'data-a="alertas"', I.ale, 'Alertas inmediatas', me.alertas_act ? 'Hasta el ' + fec(me.alertas_hasta) : me.gratis > 0 ? 'Gratis' : '') : ''}${w ? lr('button', 'data-a="tab" data-t="pfotos"', I.fot, 'Fotos de mis trabajos', gal.length + '/12') + lr('button', 'data-a="pw" data-id="' + me.id + '"', I.res, 'Mis reseñas', me.prom ? '<span class="y">' + STAR + ' ' + me.prom + '</span> (' + me.n + ')' : 'Todavía sin reseñas') : ''}</div>
    <div class="lst">${lr('button', 'data-a="tema"', I.tem, 'Apariencia', (TEMAS.find((x) => x[0] === temaPref()) || TEMAS[0])[1].split(' (')[0])}${lr('button', 'data-a="guiaver"', I.gui, 'Cómo funciona', '')}${lr('button', 'data-a="push"', I.av, 'Activar avisos', '')}${(window.CFG || {}).soporte ? lr('a', 'href="https://wa.me/' + CFG.soporte + '" target="_blank" rel="noopener"', I.wa, 'Ayuda por WhatsApp', '') : ''}${lr('a', 'href="legal.html#terminos" target="_blank" rel="noopener"', I.leg, 'Términos y privacidad', '')}</div>
    <div class="lst">${lr('button', 'data-a="salirc"', '', 'Cerrar sesión', '', 'rd')}${lr('button', 'data-a="borrar"', '', 'Eliminar mi cuenta', '', 'rd')}</div>`,
    );
  },
  async pfotos() {
    const gal = (await api('trabajadores/' + me.id)).fotos;
    set(
      `<a class="bk" data-a="tab" data-t="perfil">‹ Perfil</a><h1 class="h1">Fotos de mis trabajos</h1><p class="s">Mostrales a los clientes lo que sabés hacer. Llevás <b>${gal.length}</b> de 12.</p><div class="card">${gal.length ? `<div class="gal">${gal.map((i) => `<div><img src="/api/tfoto/${i}" data-a="zoom" data-u="/api/tfoto/${i}" alt="Foto de un trabajo" loading="lazy"><button data-a="tdel" data-id="${i}" aria-label="Borrar esta foto">×</button></div>`).join('')}</div>` : '<p class="s">Todavía no subiste fotos.</p>'}<input id="tf" type="file" accept="image/*" multiple hidden><button class="btn full" data-a="tadd"${gal.length >= 12 ? ' disabled' : ''}>${sv(X.plus)} Agregar fotos</button></div>`,
    );
  },
};
