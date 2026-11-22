/* Acciones de los botones (A) y escuchas globales. Se carga como script común, en este orden (ver index.html); comparte las variables con los demás archivos de app/. */
const A = {
  tema: async () => {
    const r = await dlg({
      t: 'Apariencia',
      p: 'Elegí cómo se ve Dicho y Hecho.',
      f: [{ id: 't', lb: 'Tema', opts: TEMAS, val: temaPref() }],
      ok: 'Guardar',
    });
    if (!r) return;
    localStorage.setItem('tema', r.t);
    temaAplicar();
    if (me) home();
  },
  auth: (d) => {
    if (d.m === 'rec') REG.recup = { tl: '', q: '' };
    auth(d.m);
  },
  home: () => home(),
  rtipo: (d) => {
    REG.guardar();
    tipo = d.t;
    auth('reg');
  },
  ojo: () => {
    const i = $('#pn'),
      b = $('.pe');
    if (!i || !b) return;
    const v = i.type === 'password';
    i.type = v ? 'text' : 'password';
    b.setAttribute('aria-pressed', v);
    b.setAttribute('aria-label', v ? 'Ocultar PIN' : 'Mostrar PIN');
    b.innerHTML = sv(v ? OJO.off : OJO.on);
    i.focus();
  },
  start: () => {
    if (!localStorage.getItem('guia' + me.id)) {
      GS = 0;
      GBACK = '';
      return guia();
    }
    A.go1();
  },
  go1: () => {
    tab = me.tipo === 'cliente' ? 'pub' : 'perfil';
    home();
  },
  gnext: () => {
    const L = GUIA[me.tipo] || GUIA.cliente;
    if (GS < L.length - 1) {
      GS++;
      guia();
      return;
    }
    localStorage.setItem('guia' + me.id, '1');
    GBACK === 'perfil' ? ((tab = 'perfil'), home()) : A.go1();
  },
  gskip: () => {
    localStorage.setItem('guia' + me.id, '1');
    GBACK === 'perfil' ? ((tab = 'perfil'), home()) : A.go1();
  },
  guiaver: () => {
    GS = 0;
    GBACK = 'perfil';
    guia();
  },
  rdesp: () => {
    const p = $('#rpn'),
      t = $('.rtg');
    if (!p || !t) return;
    p.hidden = !p.hidden;
    t.setAttribute('aria-expanded', p.hidden ? 'false' : 'true');
    t.classList.toggle('open', !p.hidden);
  },
  rub: (d) => {
    fr = d.r;
    pg = 1;
    mr = false;
    view.feed();
  },
  mis: () => {
    mr = true;
    fr = '';
    pg = 1;
    view.feed();
  },
  tab: (d) => {
    // la pantalla nueva entra desde el lado hacia el que te movés en el menú
    const ix = [...document.querySelectorAll('#nav button')].findIndex((b) => b.dataset.t === d.t);
    if (ix >= 0 && d.t !== tab) {
      const r = document.documentElement;
      r.dataset.dir = ix > (A.__ix ?? -1) ? 'f' : 'b';
      clearTimeout(A.__dt);
      A.__dt = setTimeout(() => delete r.dataset.dir, 600);
    }
    if (ix >= 0) A.__ix = ix;
    tab = d.t;
    if (tab === 'feed') pg = 1;
    home();
  },
  fclr: () => {
    FQ = '';
    pg = 1;
    view.feed();
  },
  catir: (d) => {
    DR = d.r;
    DQ = '';
    DP = 1;
    A.tab({ t: 'dir' });
  },
  dver: () => {
    DV = DV ? 0 : 1;
    DP = 1;
    view.dir();
  },
  dmin: (d) => {
    DM = DM === +d.m ? 0 : +d.m;
    DP = 1;
    view.dir();
  },
  dclr: () => {
    DQ = '';
    DR = '';
    DB2 = '';
    DV = 0;
    DM = 0;
    DP = 1;
    view.dir();
  },
  dpag: async (d) => {
    DP += +d.d;
    await view.dir();
    window.scrollTo({ top: 0 });
  },
  async inv(d) {
    const ps = (await api('mis-pedidos')).filter((c) => c.estado === 'abierta');
    if (!ps.length) {
      const v = await dlg({
        t: 'Primero publicá un pedido',
        p: 'Para invitar a ' + d.n + ' necesitás un pedido abierto. Contá qué necesitás y después lo invitás.',
        ok: 'Publicar un pedido',
      });
      if (v) {
        tab = 'pub';
        home();
      }
      return;
    }
    const v = await dlg({
      t: 'Invitar a ' + d.n,
      p: 'Le avisamos y, si le interesa, se postula con su propuesta. Su WhatsApp lo ves recién cuando lo elegís.',
      f: [
        {
          id: 'pe',
          lb: '¿A cuál de tus pedidos?',
          opts: ps.map((c) => [String(c.id), c.titulo]),
          val: String(ps[0].id),
        },
      ],
      ok: 'Enviar invitación',
    });
    if (!v) return;
    await api('invitar', { trabajador_id: +d.id, pedido_id: +v.pe });
    toast('Invitación enviada');
  },
  pag: async (d) => {
    pg += +d.d;
    await view.feed();
    window.scrollTo({ top: 0 });
  },
  filtro: () => {
    fr = val('fr');
    view.feed();
  },
  async login() {
    login((await api('login', { telefono: limpiarTel(val('tl')), pin: val('pn') })).token);
    home();
  },
  async reg() {
    REG.guardar();
    if (!okNom(REG.datos.n)) throw new Error('Poné tu nombre y tu apellido, solo con letras');
    if (!REGLAS.telValido(REG.datos.tl)) throw new Error('Revisá el teléfono: poné el código de área y el número');
    {
      const e = REGLAS.errPin(REG.datos.pn);
      if (e) throw new Error(e);
    }
    if (!okMail(REG.datos.ml.trim())) throw new Error('El mail no es válido');
    if (!REG.datos.pq) throw new Error('Elegí una pregunta de seguridad');
    {
      const e = REGLAS.errRespuesta(REG.datos.pr, REG.datos.pq);
      if (e) throw new Error(e);
    }
    const r = await api('registro', {
      tipo,
      nombre: REG.datos.n,
      barrio: REG.datos.bb,
      telefono: REG.datos.tl,
      pin: REG.datos.pn,
      pregunta: REG.datos.pq,
      respuesta: REG.datos.pr,
      mail: REG.datos.ml.trim(),
      acepto: $('#ac').checked,
      origen: localStorage.getItem('o') || '',
      ref: localStorage.getItem('r') || '',
    });
    try {
      localStorage.removeItem('r');
    } catch (e) {}
    REG.reiniciar();
    login(r.token);
    me = null;
    tab = '';
    await api('yo').then((x) => (me = x));
    A.start();
  },
  async recq() {
    const tl = limpiarTel(val('tl'));
    if (!tl) throw new Error('Poné tu teléfono');
    const r = await api('recuperar-pregunta', { telefono: tl });
    REG.recup = { tl, q: r.pregunta };
    auth('rec');
  },
  recreset() {
    REG.recup = { tl: '', q: '' };
    auth('rec');
  },
  async rec() {
    const r = await api('recuperar', { telefono: REG.recup.tl, respuesta: val('ra'), pin: val('pn') });
    REG.recup = { tl: '', q: '' };
    login(r.token);
    me = null;
    tab = '';
    await api('yo').then((x) => (me = x));
    toast('PIN cambiado');
    A.start();
  },
  async pregunta() {
    const r = await dlg({
      t: 'Pregunta de seguridad',
      p: 'Sirve para recuperar tu PIN si lo olvidás. Elegí una pregunta y respondela.',
      f: [
        {
          id: 'q',
          lb: 'Tu pregunta',
          opts: PREGS.map((p) => [p, p]),
          val: PREGS.includes(me.pregunta) ? me.pregunta : PREGS[0],
        },
        { id: 'r', lb: 'Tu respuesta', max: 60, ph: 'Mínimo ' + REGLAS.RESP_MIN + ' letras o números' },
        { id: 'n', lb: 'Tu PIN actual', type: 'password', mode: 'numeric', max: 6, ph: '6 números' },
      ],
      ok: 'Guardar',
      v: (x) => REGLAS.errRespuesta(x.r, x.q),
    });
    if (!r) return;
    await api('pregunta', { pregunta: r.q, respuesta: r.r, pin: r.n });
    toast('Pregunta guardada');
    home();
  },
  async post(d) {
    const v = await dlg({
      t: 'Postularme',
      p: 'Escribile un mensaje corto al cliente: cuándo podés, cuánto cobrás, tu experiencia.',
      f: [{ id: 'm', area: 1, ph: 'Ej: Puedo ir mañana a la tarde. Tengo herramientas propias.' }],
      ok: 'Enviar propuesta',
    });
    if (!v) return;
    await api('pedidos/' + d.id + '/postular', { mensaje: v.m });
    toast('Propuesta enviada');
    view.feed();
  },
  async den(d) {
    const t = d.tipo || 'pedido';
    const v = await dlg({
      t: 'Denunciar',
      p: t === 'usuario' ? 'Contanos qué pasó con esta persona.' : 'Contanos qué pasa con esta publicación.',
      f: [{ id: 'm', area: 1, ph: 'Motivo' }],
      ok: 'Enviar denuncia',
      v: (x) => (x.m.length < 5 ? 'Contanos un poco más.' : ''),
    });
    if (!v) return;
    await api('denunciar', { tipo: t, id: d.id, motivo: v.m });
    toast('Gracias, la vamos a revisar');
  },
  async pw(d) {
    const w = await api('trabajadores/' + d.id),
      r = JSON.parse(w.rubros || '[]');
    const h = `<div class="row2">${av(w.id, w.fv, w.nombre, 'av s64')}<div><b>${esc(w.nombre)}</b>${vb(w.ver)}<p class="s">${esc(r.join(', '))}${w.barrio ? (r.length ? ' · ' : '') + esc(w.barrio) : ''}</p><p>${star(w.prom, w.n)}</p></div></div>${w.bio ? `<p>${esc(w.bio)}</p>` : ''}${w.fotos.length ? `<p class="s"><b>Sus trabajos</b></p><div class="gal">${w.fotos.map((i) => `<div><img src="/api/tfoto/${i}" data-a="zoom" data-u="/api/tfoto/${i}" alt="Foto de un trabajo" loading="lazy"></div>`).join('')}</div>` : ''}<div class="rs">${w.resenas.map((x) => `<div class="in"><span class="y">${STAR.repeat(x.e)}${STAR0.repeat(5 - x.e)}</span> <span class="s">${esc(x.quien)} · ${fec(x.f)}</span><p class="s">${esc(x.t)}</p>${x.c ? `<p>${esc(x.c)}</p>` : ''}${th(x.fo, 'rfoto')}</div>`).join('') || '<p class="s">Todavía no tiene reseñas.</p>'}</div>${d.inv && me.tipo === 'cliente' ? '<button class="btn" id="d_inv">Invitar a un pedido</button> ' : ''}${+d.id !== me.id ? '<button class="btn g" id="d_den">Denunciar</button>' : ''}`;
    const v = await dlg({
      t: 'Perfil del trabajador',
      h,
      solo: 1,
      on: (m, fin) => {
        const b = m.querySelector('#d_den');
        if (b) b.onclick = () => fin('den');
        const i = m.querySelector('#d_inv');
        if (i) i.onclick = () => fin('inv');
      },
    });
    if (v === 'den') await A.den({ id: d.id, tipo: 'usuario' });
    if (v === 'inv') await A.inv({ id: d.id, n: w.nombre });
  },
  zoom: (d) => dlg({ t: 'Foto', h: `<img class="zm" src="${esc(d.u)}" alt="">`, solo: 1 }),
  fl: (d) => {
    fl = d.k;
    view.loc();
  },
  tadd: () => $('#tf').click(),
  async tsubir() {
    const fs = [...$('#tf').files].slice(0, 12);
    if (!fs.length) return;
    toast('Subiendo…');
    for (const f of fs) await api('trabajos-fotos', { foto: await comp(f) });
    toast('Fotos agregadas');
    view.pfotos();
  },
  async tdel(d) {
    const v = await dlg({ t: 'Borrar foto', p: 'Se saca de tu perfil.', ok: 'Sí, borrar' });
    if (!v) return;
    await api('trabajos-fotos/borrar', { id: parseInt(d.id) });
    view.pfotos();
  },
  pfoto: () => $('#pf').click(),
  async pfsubir() {
    const f = $('#pf').files[0];
    if (!f) return;
    await api('perfil-foto', { foto: await compSq(f) });
    toast('Foto actualizada');
    home();
  },
  async pfdel() {
    if (
      !(await dlg({
        t: 'Quitar foto de perfil',
        p: 'Sin foto de perfil no podés usar la app: vas a tener que subir otra.',
        ok: 'Sí, quitarla',
      }))
    )
      return;
    await api('perfil-foto', { borrar: 1 });
    toast('Foto quitada');
    home();
  },
  async publicar() {
    const fotos = await Promise.all([...($('#fo').files || [])].slice(0, 3).map(comp));
    await api('pedidos', {
      titulo: val('ti'),
      rubro: val('ru'),
      descripcion: val('de'),
      barrio: val('bb'),
      presupuesto: val('pr'),
      fotos,
    });
    toast('Pedido publicado');
    tab = 'mis';
    home();
  },
  fm: (d) => {
    fm = d.k;
    view.mis();
  },
  fq: (d) => {
    fq = d.k;
    view.mp();
  },
  async edit(d) {
    const c = LC.find((x) => x.id == d.id);
    if (!c) return;
    const bs = [...new Set([...BARRIOS, ...(c.barrio ? [c.barrio] : [])])];
    const v = await dlg({
      t: 'Editar pedido',
      p: c.post.length
        ? 'Los postulantes reciben un aviso con el cambio. Las fotos no se pueden cambiar.'
        : 'Las fotos no se pueden cambiar.',
      f: [
        { id: 'ti', lb: '¿Qué necesitás?', val: c.titulo, max: 80 },
        { id: 'ru', lb: 'Rubro', opts: RUB.map((r) => [r, r]), val: c.rubro },
        { id: 'de', lb: 'Detalles', area: 1, max: 1000, val: c.descripcion },
        { id: 'bb', lb: 'Barrio', opts: [['', 'Sin barrio'], ...bs.map((x) => [x, x])], val: c.barrio },
        {
          id: 'pr',
          lb: 'Presupuesto',
          val: c.presupuesto === 'A convenir' ? '' : c.presupuesto,
          ph: 'Vacío = a convenir',
          max: 40,
        },
      ],
      ok: 'Guardar cambios',
      v: (x) => (x.ti.length < 3 ? 'Poné un título.' : ''),
    });
    if (!v) return;
    await api('pedidos/' + d.id + '/editar', {
      titulo: v.ti,
      rubro: v.ru,
      descripcion: v.de,
      barrio: v.bb,
      presupuesto: v.pr,
    });
    toast('Cambios guardados');
    view.mis();
  },
  async ret(d) {
    const v = await dlg({
      t: 'Retirar propuesta',
      p: d.el
        ? 'Te eligieron para este pedido. Si te retirás, vuelve a quedar abierto y el cliente recibe un aviso.'
        : 'Vas a sacar tu propuesta. Si el pedido sigue abierto, podés volver a postularte.',
      ok: 'Sí, retirarme',
    });
    if (!v) return;
    await api('postulaciones/' + d.id + '/retirar', {});
    toast('Propuesta retirada');
    view.mp();
  },
  async elim(d) {
    const c = LC.find((x) => x.id == d.id);
    if (!c) return;
    const sinP = c.estado === 'hecha' && !c.punt;
    const v = await dlg({
      t: 'Eliminar pedido',
      p: sinP
        ? 'Todavía no puntuaste este trabajo. Si lo eliminás, ya no vas a poder puntuarlo.'
        : c.estado === 'hecha'
          ? 'Se saca de tu lista. La reseña que dejaste se mantiene en el perfil del trabajador.'
          : 'Se saca de tu lista y no se puede deshacer.',
      ok: 'Sí, eliminar',
    });
    if (!v) return;
    await api('pedidos/' + d.id + '/eliminar', {});
    toast('Pedido eliminado');
    view.mis();
  },
  async oc(d) {
    if (
      !(await dlg({
        t: 'Quitar de mi lista',
        p: 'Se saca de tu lista. No cambia nada para el cliente.',
        ok: 'Sí, quitarla',
      }))
    )
      return;
    await api('postulaciones/' + d.id + '/ocultar', {});
    toast('Quitada de tu lista');
    view.mp();
  },
  async limp() {
    const n = LP.filter((p) => p.estado === 'descartada' || (p.estado === 'activa' && p.cestado !== 'abierta')).length;
    const v = await dlg({
      t: 'Quitar de mi lista',
      p: 'Se sacan ' + n + ' propuestas cerradas o descartadas. Las terminadas y las que siguen en juego no se tocan.',
      ok: 'Sí, quitarlas',
    });
    if (!v) return;
    await api('postulaciones/limpiar', {});
    toast('Lista ordenada');
    view.mp();
  },
  async pel(d) {
    if (
      !(await dlg({
        t: 'Elegir a esta persona',
        p: 'Queda elegida para tu pedido y se le avisa para que te escriba. Si después no se da, podés elegir a otro.',
        ok: 'Sí, elegirla',
      }))
    )
      return;
    await api('postulaciones/' + d.id + '/elegir', {});
    view.mis();
  },
  async pde(d) {
    if (
      !(await dlg({
        t: 'Descartar propuesta',
        p: 'Se saca de tus propuestas y se le avisa a la persona.',
        ok: 'Sí, descartarla',
      }))
    )
      return;
    await api('postulaciones/' + d.id + '/descartar', {});
    view.mis();
  },
  async mapa() {
    const R0 = JSON.parse(me.rubros || '[]');
    MZ = {
      cnt: await api('mapa?rubro=' + encodeURIComponent(fr) + '&mis=' + (mr && !fr && R0.length ? 1 : 0)),
      sel: fb,
      k: 1,
      cx: MV[0] + MV[2] / 2,
      cy: MV[1] + MV[3] / 2,
      mv: 0,
      ent: 1,
      glow: 0,
      shown: 0,
    };
    const v = await dlg({
      t: 'Pedidos por barrio',
      p: 'Cuanto más oscuro el barrio, más pedidos abiertos. Pellizcá para acercar, arrastrá para moverte y tocá un barrio para elegirlo.',
      h: `<div class="mpb"><div class="mpw" id="mpw">${mapaSvg()}</div><div class="mzb"><button type="button" class="mzc" data-a="mzoom" data-z="in" aria-label="Acercar">${sv(X.plus)}</button><button type="button" class="mzc" data-a="mzoom" data-z="out" aria-label="Alejar">${sv(X.minus)}</button><button type="button" class="mzc" data-a="mzoom" data-z="reset" aria-label="Ver todo el mapa">${sv(X.expand)}</button></div></div><p class="s mc" id="mc"></p><p class="s lgd"><span class="sw z"></span> sin pedidos <span class="sw"></span> con pedidos (más oscuro, más)</p>`,
      f: [{ id: 'bar', h: '<input type="hidden" id="d_bar" value="' + esc(fb) + '">' }],
      ok: 'Ver pedidos',
      on: () => {
        mapaDib();
        mapaGestos($('#mpw'));
      },
    });
    if (!v) return;
    fb = v.bar;
    pg = 1;
    view.feed();
  },
  mz: (d) => {
    if (MZ.mv) return;
    MZ.sel = MZ.sel === d.b ? '' : d.b;
    MZ.glow = MZ.sel ? 1 : 0;
    const h = $('#d_bar');
    if (h) h.value = MZ.sel;
    mapaDib();
    mapaFoco(MZ.sel);
  },
  mzoom: (d) => {
    const w = $('#mpw');
    if (!w) return;
    if (d.z === 'reset') {
      mapaAnim(1, MV[0] + MV[2] / 2, MV[1] + MV[3] / 2);
      return;
    }
    mapaZoomA(d.z === 'in' ? MZ.k * 1.7 : MZ.k / 1.7, w.clientWidth / 2, w.clientHeight / 2);
  },
  async ren(d) {
    const v = await dlg({
      t: 'Renovar pedido',
      p: 'Va a durar 7 días más. Las fotos se borran cuando vence, así que si querés mostrar fotos, subilas de nuevo (hasta 3).',
      h: '<label class="lb" for="d_fo">Fotos (opcional, hasta 3)</label>' + fpick('d_fo', 3),
      ok: 'Renovar 7 días',
    });
    if (!v) return;
    toast('Renovando…');
    await api('pedidos/' + d.id + '/renovar', { fotos: await Promise.all(v.files.slice(0, 3).map(comp)) });
    toast('Pedido renovado');
    view.mis();
  },
  async ch(d) {
    const CH = {
      hecha: ['Marcar como hecho', 'El pedido queda terminado y vas a poder puntuar el trabajo.', 'Sí, está hecho'],
      cancelar: ['Cancelar pedido', 'Deja de estar abierto y se borran sus fotos.', 'Sí, cancelar'],
      reabrir: [
        'Elegir a otro',
        'El pedido vuelve a quedar abierto 7 días y se le avisa a la persona que habías elegido.',
        'Sí, reabrir',
      ],
    }[d.x];
    if (CH && !(await dlg({ t: CH[0], p: CH[1], ok: CH[2] }))) return;
    await api('pedidos/' + d.id + '/' + d.x, {});
    view.mis();
  },
  async punt(d) {
    const v = await dlg({
      t: 'Puntuar el trabajo',
      p: '¿Cómo te fue? Tu reseña la va a poder leer cualquier cliente.',
      est: 1,
      h:
        '<label class="lb" for="d_fo">Fotos del trabajo terminado (opcional, hasta 3; se borran a los 3 meses)</label>' +
        fpick('d_fo', 3),
      f: [{ id: 'c', area: 1, ph: 'Comentario (opcional)' }],
      ok: 'Enviar puntaje',
      v: (x) => (x.e ? '' : 'Elegí de 1 a 5 estrellas.'),
    });
    if (!v) return;
    toast('Enviando…');
    await api('pedidos/' + d.id + '/puntuar', {
      estrellas: v.e,
      comentario: v.c,
      fotos: await Promise.all(v.files.slice(0, 3).map(comp)),
    });
    toast('¡Gracias por puntuar!');
    view.mis();
  },
  async edperfil() {
    const w = me.tipo === 'trabajador',
      r = JSON.parse(me.rubros || '[]'),
      bs = [...new Set([...BARRIOS, ...(me.barrio ? [me.barrio] : [])])];
    const f = [
      { id: 'n', lb: 'Nombre y apellido', val: me.nombre, max: 60 },
      {
        id: 'ml',
        lb: 'Mail (opcional)',
        type: 'email',
        max: 100,
        val: me.mail || '',
        ph: 'Solo lo ve quien elegís o te elige',
      },
      { id: 'bb', lb: 'Barrio (opcional)', opts: [['', 'Sin barrio'], ...bs.map((x) => [x, x])], val: me.barrio },
    ];
    if (w)
      f.push(
        {
          h:
            '<label class="lb">Rubros en los que trabajás (hasta 3; si no elegís, queda Otros)</label><div class="chips">' +
            RUB.map(
              (x) =>
                `<label><input type="checkbox" class="rb" value="${x}" ${r.includes(x) ? 'checked' : ''}>${IC[x]} ${x}</label>`,
            ).join('') +
            '</div>',
        },
        {
          id: 'bio',
          lb: 'Sobre vos',
          area: 1,
          max: 300,
          val: me.bio,
          ph: 'Años de experiencia, qué herramientas tenés, en qué zonas trabajás…',
        },
      );
    const v = await dlg({
      t: 'Mis datos',
      f,
      ok: 'Guardar cambios',
      v: (x) =>
        !okNom(x.n)
          ? 'Poné tu nombre y apellido, solo con letras.'
          : !okMail(String(x.ml || '').trim())
            ? 'El mail no es válido.'
            : w && x.rb.length > 3
              ? 'Elegí hasta 3 rubros.'
              : '',
      on: (m) => {
        const l = () => {
          const n = m.querySelectorAll('.rb:checked').length;
          m.querySelectorAll('.rb').forEach((c) => {
            c.disabled = !c.checked && n >= 3;
          });
        };
        m.querySelectorAll('.rb').forEach((c) => (c.onchange = l));
        l();
      },
    });
    if (!v) return;
    await api('perfil', {
      nombre: v.n,
      mail: String(v.ml || '').trim(),
      barrio: v.bb,
      bio: w ? v.bio : me.bio || '',
      rubros: w ? v.rb : [],
    });
    me = await api('yo');
    toast('Guardado');
    tab === 'perfil' ? view.perfil() : home();
  },
  async verif() {
    const v = await dlg({
      t: 'Verificá tu cuenta',
      p: 'Sumá estos tres datos y obtenés el sello azul de verificado, que da más confianza. El DNI y la dirección no los ve nadie más que el equipo de Dicho y Hecho. El mail solo lo ve la persona con la que acordás trabajar.',
      f: [
        { id: 'dni', lb: 'DNI (solo números)', type: 'text', mode: 'numeric', max: 10, val: me.dni || '' },
        { id: 'dir', lb: 'Dirección', max: 100, val: me.direccion || '', ph: 'Calle y número' },
        { id: 'mail', lb: 'Mail', type: 'email', max: 100, val: me.mail || '' },
      ],
      ok: 'Guardar',
      v: (x) => (/^(\d{7,8})?$/.test(x.dni.replace(/\D/g, '')) ? '' : 'El DNI tiene 7 u 8 números.'),
    });
    if (!v) return;
    const r = await api('verificacion', { dni: v.dni, direccion: v.dir, mail: v.mail });
    me = await api('yo');
    toast(r.ver ? '¡Cuenta verificada!' : 'Guardado. Con los tres datos completos tenés el sello.');
    tab === 'perfil' ? view.perfil() : home();
  },
  dest(d) {
    return potenciar('destacado', +d.id);
  },
  alertas() {
    return potenciar('alertas', 0);
  },
  async refer() {
    const u = location.origin + '/?r=' + me.ref_cod,
      n = me.ref_n % me.ref_de;
    await dlg({
      t: 'Invitá y ganá',
      p:
        'Compartí tu link. Cuando ' +
        me.ref_de +
        ' personas se unen con él y empiezan a usar la app (publican un pedido o se postulan), te regalamos una potenciación gratis: destacar un pedido o alertas inmediatas, según tu cuenta. Podés ganar hasta ' +
        me.ref_max +
        '. ' +
        (me.ref_prem >= me.ref_max ? 'Ya llegaste al máximo.' : 'Llevás ' + n + ' de ' + me.ref_de + '.'),
      h: `<p class="s qru">${esc(u)}</p><button class="btn g" id="rf_cp">Copiar link</button>${navigator.share ? '<button class="btn g" id="rf_sh">Compartir</button>' : ''}`,
      solo: 1,
      on: () => {
        $('#rf_cp').onclick = () =>
          navigator.clipboard.writeText(u).then(
            () => toast('Link copiado'),
            () => toast(u),
          );
        const sh = $('#rf_sh');
        if (sh)
          sh.onclick = () =>
            navigator
              .share({ title: 'Dicho y Hecho', text: 'Alguien lo necesita. Alguien lo hace.', url: u })
              .catch(() => {});
      },
    });
  },
  xalertas() {
    try {
      localStorage.setItem('xal', String(Date.now()));
    } catch (e) {}
    const c = document.querySelector('.cta');
    if (c) c.remove();
  },
  async push() {
    if (!('serviceWorker' in navigator) || !('PushManager' in window))
      throw new Error('Tu navegador no permite avisos. En iPhone, instalá la app primero.');
    if ((await Notification.requestPermission()) !== 'granted') throw new Error('Los avisos quedaron bloqueados');
    const k = (await api('push-key')).key;
    if (!k) throw new Error('Los avisos todavía no están configurados');
    const s = await (
      await navigator.serviceWorker.ready
    ).pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: Uint8Array.from(atob(k.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0)),
    });
    const k2 = s.toJSON().keys || {};
    await api('push', { endpoint: s.endpoint, p256dh: k2.p256dh, auth: k2.auth });
    toast('Avisos activados');
  },
  async borrar() {
    const v = await dlg({
      t: 'Eliminar mi cuenta',
      p: 'Se borran tu perfil, tus fotos, tus pedidos, tus postulaciones y tus avisos, y se cierra tu sesión. No se puede deshacer. Las reseñas que escribiste quedan sin tu nombre. Para confirmar, escribí tu PIN.',
      f: [{ id: 'pin', lb: 'Tu PIN', type: 'password', mode: 'numeric', max: 6 }],
      ok: 'Eliminar para siempre',
      v: async (x) => {
        if (!/^\d{4,6}$/.test(x.pin)) return 'Poné tu PIN.';
        try {
          await api('cuenta-borrar', { pin: x.pin });
        } catch (e) {
          return e.message;
        }
        return '';
      },
    });
    if (!v) return;
    toast('Tu cuenta se eliminó');
    A.salir();
  },
  async telok() {
    const c = val('tc');
    if (!/^\d{6}$/.test(c)) return toast('El código tiene 6 números');
    await api('tel-codigo', { codigo: c });
    toast('¡Teléfono confirmado!');
    home();
  },
  async telnuevo() {
    await api('tel-nuevo', {});
    toast('Listo. Te vamos a mandar un código nuevo.');
  },
  async salirc() {
    if (
      !(await dlg({
        t: '¿Cerrar sesión?',
        p: 'Para volver a entrar vas a necesitar tu teléfono y tu PIN.',
        ok: 'Sí, cerrar sesión',
      }))
    )
      return;
    A.salir();
  },
  salir() {
    T = '';
    me = null;
    FQ = '';
    FO = 'nuevos';
    DQ = '';
    DR = '';
    DB2 = '';
    DV = 0;
    DM = 0;
    localStorage.removeItem('t');
    auth('land');
  },
};
document.addEventListener('click', (e) => {
  const a = e.target.closest('[data-a]');
  if (a && a.tagName !== 'SELECT') {
    // los botones muestran un giradito si la acción tarda, y no se pueden tocar dos veces seguidas
    const bt = a.matches('button.btn, a.btn, button.lk3');
    if (bt && a.classList.contains('busy')) return;
    if (bt && navigator.vibrate) navigator.vibrate(8);
    const tm = bt ? setTimeout(() => a.classList.add('busy'), 220) : 0;
    go(() => A[a.dataset.a](a.dataset)).finally(() => {
      clearTimeout(tm);
      a.classList.remove('busy');
    });
  }
});
document.addEventListener('input', (e) => {
  if (e.target.id === 'pn') e.target.value = e.target.value.replace(/\D/g, '').slice(0, 6);
});
document.addEventListener('change', (e) => {
  if (e.target.id === 'tl') e.target.value = limpiarTel(e.target.value);
});
document.addEventListener('input', (e) => {
  const i = e.target.id;
  if (i === 'fqx') {
    FQ = e.target.value;
    clearTimeout(FT);
    FT = setTimeout(() => {
      pg = 1;
      go(() => view.feedQ());
    }, 350);
  } else if (i === 'dqx') {
    DQ = e.target.value;
    clearTimeout(DT);
    DT = setTimeout(() => {
      DP = 1;
      go(() => view.dirQ());
    }, 350);
  }
});
document.addEventListener('change', (e) => {
  const k = e.target.dataset.a;
  if (k === 'ford') {
    FO = e.target.value;
    pg = 1;
    go(() => view.feedQ());
  }
  if (k === 'dord') {
    DO = e.target.value;
    DP = 1;
    go(() => view.dirQ());
  }
  if (k === 'drubs') {
    DR = e.target.value;
    DP = 1;
    go(() => view.dirQ());
  }
  if (k === 'dbar') {
    DB2 = e.target.value;
    DP = 1;
    go(() => view.dirQ());
  }
  if (e.target.dataset.a === 'filtro') go(() => A.filtro());
  if (e.target.dataset.a === 'fbar') {
    fb = e.target.value;
    pg = 1;
    go(() => view.feed());
  }
  if (e.target.id === 'pf') go(() => A.pfsubir());
  if (e.target.id === 'tf') go(() => A.tsubir());
});
document.addEventListener(
  'toggle',
  (e) => {
    const k = e.target.dataset && e.target.dataset.k;
    if (k) e.target.open ? OP.add(+k) : OP.delete(+k);
  },
  true,
);
document.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && e.target.tagName === 'INPUT' && e.target.type !== 'checkbox' && e.target.closest('#rst')) {
    e.preventDefault();
    const b = $('#rst [data-a=reg],#rst [data-a=login],#rst [data-a=rec],#rst [data-a=recq]');
    if (b) b.click();
  }
});
document.addEventListener('visibilitychange', () => {
  if (!document.hidden && me && !['pub', 'perfil', 'pfotos', 'dir'].includes(tab) && !$('#md').classList.contains('on'))
    go(home);
});

// Inicio: el buscador grande lleva al directorio con lo escrito; las tarjetas con role=button se abren con Enter
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Enter') return;
  if (e.target.id === 'hq') {
    DQ = e.target.value;
    DR = '';
    DP = 1;
    A.tab({ t: 'dir' });
  }
});
