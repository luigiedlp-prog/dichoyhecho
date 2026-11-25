/* Portada, registro en una sola pantalla (REG), ingresar/recuperar y guía de bienvenida. Se carga como script común, en este orden (ver index.html); comparte las variables con los demás archivos de app/. */
// ---- Portada con números reales de la zona, registro en una pantalla y guía de bienvenida
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
// Cartel con los lugares Pionero que quedan (en la portada y en el registro). Si ya no quedan, no se muestra nada.
function pionLugares() {
  api('zona')
    .then((z) => {
      const n = +z.pioneros || 0;
      if (n <= 0) return;
      document.querySelectorAll('.pzc').forEach((el) => {
        el.innerHTML = `${PIOI}<span><b>${n === 1 ? 'Queda 1 lugar Pionero' : 'Quedan ' + n + ' lugares Pionero'}</b><span class="s">Sumate ahora y llevá la insignia de por vida.</span></span>`;
        el.classList.add('on');
      });
    })
    .catch(() => {});
}
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
// Estado del registro (en 3 pasos) y de "Olvidé mi PIN", en un solo lugar.
// rb = rubro del trabajador, rro = lo que escribió si eligió "Otros".
const VACIO = { n: '', bb: '', tl: '', pn: '', pq: '', pr: '', ml: '', ac: false, rb: '', rro: '' };
const REG = {
  datos: { ...VACIO },
  paso: 1,
  recup: { tl: '', q: '' },
  // Lee lo que hay escrito en pantalla (el teléfono se limpia solo). Cada paso solo tiene sus campos: los de los otros pasos se conservan.
  guardar() {
    ['n', 'bb', 'tl', 'pn', 'pq', 'pr', 'ml', 'rro'].forEach((k) => {
      if ($('#' + k)) this.datos[k] = val(k);
    });
    if ($('#tl')) this.datos.tl = limpiarTel(this.datos.tl);
    if ($('#ac')) this.datos.ac = $('#ac').checked;
    const r = document.querySelector('input[name="rrb"]:checked');
    if (r) this.datos.rb = r.value;
  },
  reiniciar() {
    this.datos = { ...VACIO };
    this.paso = 1;
    tipo = '';
  },
};
const okNom = (n) => !!REGLAS.nombre(n); // nombre y apellido
const okMail = REGLAS.mailOk;
// Paso 1: dos tarjetas grandes, cada una con su color e ícono y una frase corta que dice para qué sirve
const TIPOS = [
  ['cliente', 'Necesito contratar a alguien', 'Publicás un pedido y recibís propuestas', X.srch],
  ['trabajador', 'Soy trabajador y quiero conseguir pedidos', 'Te postulás a trabajos cerca tuyo', X.pen],
];
const rolCard = (t) =>
  `<button type="button" class="rol ${t[0]}${tipo === t[0] ? ' on' : ''}" data-a="rtipo" data-t="${t[0]}" aria-pressed="${tipo === t[0]}"><span class="ric">${sv(t[3])}</span><span class="rtx"><b>${t[1]}</b><span>${t[2]}</span></span><span class="rck" aria-hidden="true">${sv(X.chk)}</span></button>`;
// Barra "Paso X de 3"
const regBarra = (p) =>
  `<div class="rpg" role="progressbar" aria-valuemin="1" aria-valuemax="3" aria-valuenow="${p}" aria-label="Paso ${p} de 3"><span class="s"><b>Paso ${p} de 3</b></span><div class="pg"><i style="width:${Math.round((p / 3) * 100)}%"></i></div></div>`;
// Rubro del trabajador: chips tocables (uno solo) y, al final, "Otros" con un campo para escribir cuál
const rubChips = (v) =>
  `<div class="chips rrubs" role="radiogroup" aria-label="¿A qué te dedicás?">${RUB.map((x) => `<label><input type="radio" name="rrb" value="${esc(x)}"${v === x ? ' checked' : ''}>${IC[x] || ''} ${esc(x)}</label>`).join('')}</div><div id="rro_w"${v === 'Otros' ? '' : ' hidden'}><label class="lb" for="rro">¿Qué hacés?</label><input id="rro" maxlength="40" autocomplete="off" placeholder="Ej: Reparación de bicicletas" value="${esc(REG.datos.rro)}"></div>`;
// Al elegir "Otros" aparece el campo para decir cuál
document.addEventListener('change', (e) => {
  if (!e.target.matches || !e.target.matches('input[name="rrb"]')) return;
  REG.datos.rb = e.target.value;
  const w = $('#rro_w');
  if (w) {
    w.hidden = e.target.value !== 'Otros';
    if (!w.hidden) w.querySelector('input').focus();
  }
});
// Lo que falta en el paso 2 (tus datos), o '' si está bien. Lo usan "Continuar" y el botón final.
const regErr2 = () => {
  const D = REG.datos;
  if (!okNom(D.n)) return 'Poné tu nombre y tu apellido, solo con letras';
  if (!REGLAS.telValido(D.tl)) return 'Revisá el teléfono: poné el código de área y el número';
  if (!okMail(D.ml.trim())) return 'El mail no es válido';
  if (tipo === 'trabajador') {
    if (!D.rb) return 'Elegí a qué te dedicás';
    if (D.rb === 'Otros' && !D.rro.trim()) return 'Escribí a qué te dedicás';
  }
  return '';
};
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
      [X.cam, 'Perfiles para comparar', 'Foto, rubros y trabajos de cada uno.'],
      [PSTAR, 'Reseñas reales', 'Solo puntúa quien contrató.'],
      [
        '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M9 12l2 2 4-4"/>',
        'Sello de verificado',
        'Con DNI, dirección y mail.',
      ],
    ];
    set(`<section class="lnd"><img src="icon-192.png" width="72" height="72" alt=""><h1>Alguien lo necesita.<br><span>Alguien lo hace.</span></h1><p>Conectamos clientes con trabajadores independientes, profesionales y gente que ofrece servicios, según la zona. Gratis y sin vueltas.</p><div class="zn" id="zn"></div><div class="pzc"></div><button class="btn big" data-a="auth" data-m="reg">Crear cuenta gratis</button><button class="btn g big" data-a="auth" data-m="in">Ya tengo cuenta</button></section>
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
    pionLugares();
    return;
  }
  if (m === 'reg') {
    const p = tipo ? REG.paso : 1,
      w = tipo === 'trabajador',
      D = REG.datos;
    const CH = `<label class="chk"><input id="ac" type="checkbox"${D.ac ? ' checked' : ''}><span>Acepto los <a href="legal.html#terminos" target="_blank" rel="noopener">términos</a> y la <a href="legal.html#privacidad" target="_blank" rel="noopener">privacidad</a>. Dicho y Hecho solo conecta personas: el trato y el pago son entre ustedes. No adelantes plata y andá con cuidado a domicilios que no conocés.</span></label>`;
    // Recordatorio del rol elegido, arriba de los pasos 2 y 3
    const rec2 = `<p class="rrec">Te registrás como: <b>${w ? 'Trabajador' : 'Cliente'}</b> · <button type="button" class="lk3" data-a="rcambiar">Cambiar</button></p>`;
    let st;
    if (p === 1)
      st = `<h2 class="q">¿Qué querés hacer?</h2><div class="opts roles">${TIPOS.map(rolCard).join('')}</div><button class="btn full" id="rnx" data-a="rnext"${tipo ? '' : ' disabled'}>Continuar</button>`;
    else if (p === 2)
      st = `${rec2}<h2 class="q">Tus datos</h2><label class="lb" for="n">Tu nombre y apellido</label><input id="n" placeholder="Ej: Ana Pérez" autocomplete="name" value="${esc(D.n)}"><label class="lb" for="bb">Tu barrio (opcional)</label>${barSel('bb', D.bb)}<label class="lb" for="tl">Tu teléfono</label><input id="tl" type="tel" inputmode="numeric" autocomplete="tel-national" placeholder="Ej: 2477 412345" value="${esc(D.tl)}"><p class="ay">Con código de área. Lo acomodamos solo.</p><label class="lb" for="ml">Mail (opcional)</label><input id="ml" type="email" inputmode="email" autocomplete="email" maxlength="100" placeholder="tu@mail.com" value="${esc(D.ml)}"><p class="s">Solo se comparte con quien acordás un trabajo.</p>${w ? `<h3 class="q2">¿A qué te dedicás?</h3>${rubChips(D.rb)}<p class="ay">Elegí tu rubro principal. Después podés sumar hasta 2 más desde tu perfil.</p>` : ''}<button class="btn full" data-a="rnext">Continuar</button>`;
    else
      st = `${rec2}<h2 class="q">Tu seguridad</h2><label class="lb" for="pn">Tu PIN</label>${pinF('6 números', D.pn)}<p class="ay">Lo vas a usar para entrar.</p><label class="lb" for="pq">Por si olvidás tu PIN</label>${pregSel(D.pq)}<label class="lb" for="pr">Tu respuesta</label><input id="pr" maxlength="60" autocomplete="off" placeholder="Tu respuesta" value="${esc(D.pr)}"><p class="ay">Mínimo ${REGLAS.RESP_MIN} letras o números. Mayúsculas y tildes no importan.</p>${localStorage.getItem('r') ? '<p class="s">Te sumás con el link de alguien que te invitó.</p>' : ''}${CH}<button class="btn full" data-a="reg">${w ? 'Crear cuenta de trabajador' : 'Crear cuenta para pedir trabajos'}</button>`;
    set(
      `<a class="bk" data-a="rback">‹ ${p === 1 ? 'Volver' : 'Atrás'}</a><h1 class="h1">Creá tu cuenta</h1>${p === 1 ? '<div class="pzc"></div>' : ''}${regBarra(p)}<div class="card" id="rst">${st}</div><p class="lk"><a data-a="auth" data-m="in">Ya tengo cuenta</a></p>`,
    );
    if (p === 1) pionLugares();
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
// Pantalla final del registro: pedir las notificaciones. El permiso solo se puede pedir con un toque de la persona
// (si se pide solo al cargar, los navegadores lo bloquean), por eso va en un botón.
const pushPosible = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
const iosSinApp = () => /iPad|iPhone|iPod/.test(navigator.userAgent) && !navigator.standalone;
function notifPaso() {
  const puede = pushPosible() && Notification.permission === 'default';
  if (!puede && !iosSinApp()) return A.start(); // ya las activó o las bloqueó, o el navegador no las permite
  nv0();
  const w = me.tipo === 'trabajador';
  set(
    `<div class="gd ntp"><div class="gill sl-f">${ILU.campana}</div><h1 class="h1 ctr gh sl-f">Enterate apenas pase</h1><p class="s ctr gtx sl-f">${w ? 'Te avisamos cuando alguien publica un pedido de tu rubro y cuando un cliente te elige.' : 'Te avisamos cuando un trabajador te manda una propuesta para tu pedido.'}</p>${puede ? '<button class="btn full" data-a="notifok">Activá las notificaciones para enterarte de pedidos y propuestas</button><p class="lk"><a data-a="notifno">Ahora no</a></p>' : `${ios()}<button class="btn full" data-a="notifno">Seguir</button>`}</div>`,
  );
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
