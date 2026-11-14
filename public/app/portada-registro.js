/* Portada, registro en pasos (REG), ingresar/recuperar y guía de bienvenida. Se carga como script común, en este orden (ver index.html); comparte las variables con los demás archivos de app/. */
// ---- Portada con números reales de la zona, registro en pasos y guía de bienvenida
const CHV =
  '<svg class="cv" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>';
const reduce = () => matchMedia('(prefers-reduced-motion:reduce)').matches;
const countUp = (el) =>
  el.querySelectorAll('[data-n]').forEach((b) => {
    const n = +b.dataset.n;
    if (reduce() || n < 2) {
      b.textContent = n;
      return;
    }
    const t0 = performance.now(),
      D = 800;
    const f = (t) => {
      const k = Math.min(1, (t - t0) / D);
      b.textContent = Math.round(n * (1 - Math.pow(1 - k, 3)));
      if (k < 1) requestAnimationFrame(f);
    };
    b.textContent = 0;
    requestAnimationFrame(f);
  });
const plu = (n, u, v) => (n === 1 ? u : v);
// Solo se muestran los números que son más que cero: nada inventado
function zonaNums() {
  api('zona')
    .then((z) => {
      const el = $('#zn');
      if (!el) return;
      const t = [
        [z.pedidos, plu(z.pedidos, 'pedido abierto', 'pedidos abiertos')],
        [z.trabajadores, plu(z.trabajadores, 'trabajador', 'trabajadores')],
        [z.hechos, plu(z.hechos, 'trabajo hecho', 'trabajos hechos')],
      ].filter((x) => x[0] > 0);
      if (!t.length) return;
      el.innerHTML =
        '<p class="zl">Hoy en Pergamino</p><div class="zr">' +
        t.map(([n, l]) => `<div class="zs"><b data-n="${n}">${n}</b><span>${l}</span></div>`).join('') +
        '</div>';
      el.classList.add('on');
      countUp(el);
    })
    .catch(() => {});
}
// Estado del registro y de "Olvidé mi PIN", en un solo lugar.
const VACIO = { n: '', bb: '', tl: '', pn: '', pq: '', pr: '', ml: '', ac: false };
const REG = {
  paso: 1,
  total: 4,
  dir: 'f',
  datos: { ...VACIO },
  recup: { tl: '', q: '' },
  // Lee lo que hay escrito en pantalla (el teléfono se limpia solo).
  guardar() {
    ['n', 'bb', 'tl', 'pn', 'pq', 'pr', 'ml'].forEach((k) => {
      if ($('#' + k)) this.datos[k] = val(k);
    });
    if ($('#tl')) this.datos.tl = limpiarTel(this.datos.tl);
    if ($('#ac')) this.datos.ac = $('#ac').checked;
  },
  ir(paso, dir) {
    this.paso = paso;
    this.dir = dir;
    auth('reg');
  },
  atras() {
    this.guardar();
    this.ir(Math.max(1, this.paso - 1), 'b');
  },
  // Valida el paso actual y avanza.
  siguiente() {
    this.guardar();
    const d = this.datos;
    if (this.paso === 2) {
      if (!okNom(d.n)) throw new Error('Poné tu nombre y tu apellido');
      if (!d.bb) throw new Error('Elegí tu barrio');
    } else {
      if (!REGLAS.telValido(d.tl)) throw new Error('Revisá el teléfono: poné el código de área y el número');
      const e = REGLAS.errPin(d.pn);
      if (e) throw new Error(e);
    }
    this.ir(Math.min(this.total, this.paso + 1), 'f');
  },
  reiniciar() {
    this.paso = 1;
    this.dir = 'f';
    this.datos = { ...VACIO };
  },
};
const okNom = (n) => !!REGLAS.nombre(n); // nombre y apellido
const okMail = REGLAS.mailOk;
const TIPOS = [
  ['cliente', 'Busco quien me ayude', 'Publicá un pedido y recibí propuestas de trabajadores de tu zona.', X.srch],
  ['trabajador', 'Quiero ofrecer mis servicios', 'Encontrá pedidos cerca tuyo y mandá tu propuesta.', X.pen],
];
const limpiarTel = REGLAS.limpiarTel; // el teléfono se acepta como lo escriba la persona
// PIN con ojito para verlo y ocultarlo (el Worker sigue pidiendo 6 números).
const OJO = {
  on: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  off: '<path d="M3 3l18 18"/><path d="M10.6 5.1A10.5 10.5 0 0 1 12 5c6.4 0 10 7 10 7a17.6 17.6 0 0 1-3.2 4.2M6.6 6.7A17.4 17.4 0 0 0 2 12s3.6 7 10 7a10 10 0 0 0 4.4-1M9.9 9.9a3 3 0 0 0 4.2 4.2"/>',
};
const pinF = (ph, v) =>
  `<div class="pw"><input id="pn" type="password" inputmode="numeric" placeholder="${ph}" value="${esc(v || '')}"><button type="button" class="pe" data-a="ojo" aria-label="Mostrar PIN" aria-pressed="false">${sv(OJO.on)}</button></div>`;
// Preguntas de seguridad para elegir (la respuesta la escribe cada uno). Son las mismas que el Worker usa para teléfonos que no existen.
const PREGS = REGLAS.PREGUNTAS;
const pregSel = (v) =>
  `<select id="pq"><option value="">Elegí una pregunta</option>${PREGS.map((p) => `<option ${p === v ? 'selected' : ''}>${esc(p)}</option>`).join('')}</select>`;
function auth(m) {
  nv0();
  if (!m || m === 'land') {
    const IT = [
      [X.cam, 'Perfiles con foto', 'Todos muestran la cara.'],
      [PSTAR, 'Reseñas reales', 'Solo puntúa quien contrató.'],
      [
        '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M9 12l2 2 4-4"/>',
        'Sello de verificado',
        'Con DNI, dirección y mail.',
      ],
    ];
    set(`<section class="lnd"><img src="icon-192.png" width="72" height="72" alt=""><h1>Alguien lo necesita.<br><span>Alguien lo hace.</span></h1><p>Conectamos clientes con trabajadores independientes, profesionales y gente que ofrece servicios, según la zona. Gratis y sin vueltas.</p><div class="zn" id="zn"></div><button class="btn big" data-a="auth" data-m="reg">Crear cuenta gratis</button><button class="btn g big" data-a="auth" data-m="in">Ya tengo cuenta</button></section>
  <div class="trust">${IT.map((x) => `<div><span class="ic sb">${sv(x[0])}</span><b>${x[1]}</b><span class="s">${x[2]}</span></div>`).join('')}</div>
  <h2 class="sec">Cómo funciona</h2><div class="steps">${[
    [X.pen, 'Publicás', 'Contás qué necesitás y en qué barrio.'],
    [X.send, 'Se postulan', 'Los trabajadores te escriben con su propuesta.'],
    [X.uchk, 'Elegís', 'Mirás perfiles y reseñas, y arreglás por WhatsApp.'],
  ]
    .map(
      (x, i) =>
        `<div class="stp"><span class="ic sb">${sv(x[0])}</span><div><h3><i class="nm">${i + 1}</i>${x[1]}</h3><p class="s">${x[2]}</p></div></div>`,
    )
    .join('')}</div>
  <h2 class="sec">Cerca tuyo</h2><div class="steps"><div class="stp"><span class="ic sb">${sv(X.pin)}</span><div><h3>Por barrio</h3><p class="s">Filtrá por tu barrio o mirá el mapa de Pergamino y encontrá lo que tenés más cerca.</p></div></div></div><h2 class="sec">Se hace de todo</h2><div class="rg">${RUB.map((r) => `<span>${IC[r]} ${r}</span>`).join('')}</div><p class="s ctr">Dicho y Hecho solo conecta personas: el trato y el pago son entre ustedes.</p><p class="s ctr"><a href="legal.html#terminos" target="_blank" rel="noopener">Términos</a> · <a href="legal.html#privacidad" target="_blank" rel="noopener">Privacidad</a> · <a href="legal.html#cuidarte" target="_blank" rel="noopener">Cómo cuidarte</a></p>`);
    zonaNums();
    return;
  }
  if (m === 'reg') {
    const ant = REG.dir === 'f' ? REG.paso - 1 : REG.paso + 1,
      CH = `<label class="chk"><input id="ac" type="checkbox"${REG.datos.ac ? ' checked' : ''}><span>Acepto los <a href="legal.html#terminos" target="_blank" rel="noopener">términos</a> y la <a href="legal.html#privacidad" target="_blank" rel="noopener">privacidad</a>. Dicho y Hecho solo conecta personas: el trato y el pago son entre ustedes. No adelantes plata y andá con cuidado a domicilios que no conocés.</span></label>`;
    const st =
      REG.paso === 1
        ? `<h2 class="q">¿Qué querés hacer?</h2><div class="opts">${TIPOS.map((t) => `<button class="opt${REG.paso > 1 && tipo === t[0] ? ' on' : ''}" data-a="rtipo" data-t="${t[0]}"><span class="ic sb">${sv(t[3])}</span><span class="ot"><b>${t[1]}</b><span class="s">${t[2]}</span></span>${CHV}</button>`).join('')}</div><p class="s ctr">Más adelante podés crear otra cuenta con otro teléfono.</p>`
        : REG.paso === 2
          ? `<h2 class="q">Contanos de vos</h2><label class="lb" for="n">Tu nombre y apellido</label><input id="n" placeholder="Ej: Ana Pérez" autocomplete="name" value="${esc(REG.datos.n)}"><p class="s">Se ve en tu perfil.</p><label class="lb" for="bb">Tu barrio</label>${barSel('bb', REG.datos.bb, 1)}<p class="s">Así te mostramos lo que tenés cerca.</p><button class="btn full" data-a="rnext">Siguiente</button>`
          : REG.paso === 3
            ? `<h2 class="q">Tu acceso</h2><p class="sum"><span class="bd elegida">${tipo === 'cliente' ? 'Cliente' : 'Trabajador'}</span> ${esc(REG.datos.n)}${REG.datos.bb ? ' · ' + esc(REG.datos.bb) : ''}</p><label class="lb" for="tl">Tu teléfono</label><input id="tl" type="tel" inputmode="numeric" autocomplete="tel-national" placeholder="Ej: 2477 412345" value="${esc(REG.datos.tl)}"><p class="ay">Con código de área. Lo acomodamos solo.</p><label class="lb" for="pn">Tu PIN</label>${pinF('6 números', REG.datos.pn)}<p class="ay">Lo vas a usar para entrar.</p><button class="btn full" data-a="rnext">Siguiente</button>`
            : `<h2 class="q">Por si olvidás tu PIN</h2><p class="ay">Elegí una pregunta y respondela. Así lo recuperás.</p><label class="lb" for="pq">Pregunta</label>${pregSel(REG.datos.pq)}<label class="lb" for="pr">Tu respuesta</label><input id="pr" maxlength="60" autocomplete="off" placeholder="Tu respuesta" value="${esc(REG.datos.pr)}"><p class="ay">Mínimo ${REGLAS.RESP_MIN} letras o números. Mayúsculas y tildes no importan.</p><label class="lb" for="ml">Mail (opcional)</label><input id="ml" type="email" inputmode="email" autocomplete="email" maxlength="100" placeholder="tu@mail.com" value="${esc(REG.datos.ml)}"><p class="s">Solo se comparte con quien acordás un trabajo.</p>${localStorage.getItem('r') ? '<p class="s">Te sumás con el link de alguien que te invitó.</p>' : ''}${CH}<button class="btn full" data-a="reg">Crear cuenta</button>`;
    set(
      `${REG.paso > 1 ? '<a class="bk" data-a="rback">‹ Atrás</a>' : '<a class="bk" data-a="auth" data-m="land">‹ Volver</a>'}<h1 class="h1">Creá tu cuenta</h1><div class="rp"><span class="s">Paso ${REG.paso} de ${REG.total}</span><div class="pg"><i style="width:${(Math.max(0, ant) / REG.total) * 100}%"></i></div></div><div class="card sl-${REG.dir}" id="rst">${st}</div><p class="lk"><a data-a="auth" data-m="in">Ya tengo cuenta</a></p>`,
    );
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        const i = $('.rp i');
        if (i) i.style.width = (REG.paso / REG.total) * 100 + '%';
      }),
    );
    return;
  }
  const rec = m === 'rec';
  set(`<a class="bk" data-a="auth" data-m="land">‹ Volver</a><h1 class="h1">${rec ? 'Recuperá tu cuenta' : 'Ingresá'}</h1><div class="card" id="rst">
  ${
    rec && REG.recup.q
      ? `<p class="s">Cuenta <b>${esc(REG.recup.tl)}</b> · <a data-a="recreset">cambiar</a></p><p class="s">Tu pregunta de seguridad:</p><p><b>${esc(REG.recup.q)}</b></p><input id="ra" maxlength="60" autocomplete="off" placeholder="Tu respuesta">${pinF('PIN nuevo (6 números)')}<button class="btn full" data-a="rec">Cambiar PIN</button>`
      : `<input id="tl" type="tel" inputmode="numeric" autocomplete="tel-national" placeholder="Tu teléfono (ej: 2477 412345)" value="${rec ? esc(REG.recup.tl) : ''}">${rec ? '' : pinF('Tu PIN (6 números)')}<button class="btn full" data-a="${rec ? 'recq' : 'login'}">${rec ? 'Continuar' : 'Ingresar'}</button>`
  }</div>
  <p class="lk"><a data-a="auth" data-m="reg">Crear una cuenta</a> · <a data-a="auth" data-m="rec">Olvidé mi PIN</a></p>`);
}
// Guía corta después de registrarse (se ve una vez por cuenta; después, en Perfil > Cómo funciona)
const GUIA = {
  cliente: [
    [
      'lista',
      'Publicá lo que necesitás',
      'Contá qué hace falta, en qué barrio y cuánto pensás pagar. Tu pedido dura 7 días y lo podés renovar.',
    ],
    [
      'gente',
      'Elegí entre las propuestas',
      'Los trabajadores se postulan con un mensaje. También podés buscarlos vos en la pestaña Trabajadores e invitarlos.',
    ],
    [
      'ok',
      'Arreglá por WhatsApp y puntuá',
      'Cuando elegís a alguien, ves su WhatsApp. Al terminar el trabajo, dejale su puntaje.',
    ],
  ],
  trabajador: [
    [
      'foto',
      'Armá un buen perfil',
      'Tu foto, tus rubros y las fotos de tus trabajos son lo primero que ven los clientes.',
    ],
    [
      'envio',
      'Postulate a los pedidos',
      'Mirás los pedidos de tu rubro y mandás una propuesta corta. Cada pedido recibe hasta 10 postulantes.',
    ],
    [
      'campana',
      'Cerrá y sumá reseñas',
      'Si te eligen, te llega el WhatsApp del cliente. Cada trabajo hecho suma puntaje a tu perfil.',
    ],
  ],
};
let GS = 0,
  GBACK = '';
function guia() {
  nv0();
  const L = GUIA[me.tipo] || GUIA.cliente,
    x = L[GS],
    last = GS === L.length - 1;
  set(
    `<div class="gd"><div class="gill sl-f" key="${GS}">${ILU[x[0]]}</div><h1 class="h1 ctr gh sl-f">${x[1]}</h1><p class="s ctr gtx sl-f">${x[2]}</p><div class="dts" aria-label="Paso ${GS + 1} de ${L.length}">${L.map((_, i) => `<i class="${i === GS ? 'on' : ''}"></i>`).join('')}</div><button class="btn full" data-a="gnext">${last ? (GBACK === 'perfil' ? 'Listo' : me.tipo === 'cliente' ? 'Publicar mi primer pedido' : 'Completar mi perfil') : 'Siguiente'}</button><p class="lk">${last ? '' : '<a data-a="gskip">Saltar</a>'}</p></div>`,
  );
}
