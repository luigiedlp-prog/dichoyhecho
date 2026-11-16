// Servidor de prueba dentro de la página: imita /api/* del Worker con datos en memoria (se guardan en localStorage).
(() => {
  try {
    localStorage.getItem('x');
  } catch (e) {
    const m = {};
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: (k) => m[k] ?? null,
        setItem: (k, v) => {
          m[k] = String(v);
        },
        removeItem: (k) => {
          delete m[k];
        },
      },
    });
  }
  const fec = (t) => {
    const d = new Date(t - 3 * 36e5);
    return String(d.getUTCDate()).padStart(2, '0') + '/' + String(d.getUTCMonth() + 1).padStart(2, '0');
  };
  const DAY = 864e5,
    MIN = 6e4,
    PIN = REGLAS.PIN;
  const RUBROS = [
    'Albañilería',
    'Pintura',
    'Plomería',
    'Electricidad',
    'Jardinería',
    'Herrería',
    'Carpintería',
    'Limpieza',
    'Fletes y mudanzas',
    'Gasista',
    'Aire acondicionado y refrigeración',
    'Cerrajería',
    'Service de electrodomésticos',
    'Techos y zinguería',
    'Informática',
    'Lavadero y estética vehicular',
    'Clases y cuidados',
    'Publicidad y diseño',
    'Otros',
  ];
  const RLOC = [
    'Pinturerías',
    'Ferreterías',
    'Sanitarios',
    'Corralones',
    'Casas de electricidad',
    'Maderas y aberturas',
    'Vidrierías',
    'Otros',
  ];
  const TT = {
    Albañilería: ['Revocar un tapial de 6 metros', 'Arreglar el techo del baño', 'Levantar pared de ladrillo'],
    Pintura: ['Pintar living y comedor', 'Pintar rejas del frente', 'Pintura de fachada'],
    Plomería: ['Arreglar pérdida en la cocina', 'Cambiar canilla del baño', 'Destapar cañería'],
    Electricidad: ['Cambiar tablero eléctrico', 'Instalar luces led', 'Arreglar enchufes sin luz'],
    Jardinería: ['Cortar el pasto y podar', 'Armar parque chico', 'Poda de un árbol'],
    Herrería: ['Hacer un portón corredizo', 'Reparar reja', 'Soldar escalera metálica'],
    Carpintería: ['Hacer un placard', 'Arreglar puerta de madera', 'Mueble para la cocina'],
    Limpieza: ['Limpieza profunda de casa', 'Limpiar vidrios del local', 'Limpieza post obra'],
    'Fletes y mudanzas': ['Flete para mudanza chica', 'Llevar un sillón', 'Mudanza de departamento'],
    Gasista: ['Instalar una cocina a gas', 'Revisar pérdida de gas', 'Cambiar el calefón'],
    'Aire acondicionado y refrigeración': ['Instalar un split', 'Cargar gas del aire', 'Service de heladera comercial'],
    Cerrajería: ['Abrir una puerta trabada', 'Cambiar cerradura de entrada', 'Copiar llaves'],
    'Service de electrodomésticos': [
      'Arreglar lavarropas que no centrifuga',
      'Heladera que no enfría',
      'Reparar microondas',
    ],
    'Techos y zinguería': ['Arreglar goteras en el techo', 'Colocar membrana', 'Cambiar canaletas'],
    Informática: ['Formatear una notebook', 'Configurar el wifi y la impresora', 'Armar una PC'],
    'Lavadero y estética vehicular': [
      'Lavado completo de camioneta',
      'Pulido y encerado del auto',
      'Limpieza de tapizados',
    ],
    'Clases y cuidados': [
      'Clases de matemática para secundaria',
      'Niñera para el fin de semana',
      'Pasear y cuidar un perro',
    ],
    'Publicidad y diseño': ['Diseñar el logo de mi negocio', 'Flyers para redes sociales', 'Fotos de productos para la tienda'],
    Otros: ['Armar muebles', 'Cambiar cerradura', 'Colgar cuadros y estantes'],
  };
  let S;
  const save = () => {
    try {
      localStorage.setItem('prueba_db31', JSON.stringify(S));
    } catch (e) {}
  };
  const NOM = REGLAS.nombre,
    MAILRE = REGLAS.MAIL,
    REF_N = 5,
    REF_MAX = 3,
    REFRE = /^[A-HJKMNP-Z2-9]{6}$/;
  const NRm = REGLAS.NR,
    PREGm = REGLAS.preg;
  const rk = () => Math.random().toString(16).slice(2, 10).padEnd(8, '0'),
    nid = (k) => (S.seq[k] = (S.seq[k] || 0) + 1);
  const IP = {
    roll: 'M3 3h15v6H3zM18 6h2.5a.5.5 0 0 1 .5.5V11a1 1 0 0 1-1 1h-8v3M10 15h4v6h-4z',
    wall: 'M3 4h18v16H3zM3 9.3h18M3 14.7h18M9 4v5.3M15 9.3v5.4M9 14.7V20',
    leaf: 'M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10zM2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12',
    user: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8',
  };
  const jpg = (a, b, e) => {
    const c = document.createElement('canvas');
    c.width = 240;
    c.height = 180;
    const x = c.getContext('2d'),
      g = x.createLinearGradient(0, 0, 240, 180);
    g.addColorStop(0, a);
    g.addColorStop(1, b);
    x.fillStyle = g;
    x.fillRect(0, 0, 240, 180);
    x.save();
    x.translate(72, 42);
    x.scale(4, 4);
    x.strokeStyle = '#fff';
    x.lineWidth = 1.6;
    x.lineCap = 'round';
    x.lineJoin = 'round';
    x.stroke(new Path2D(IP[e]));
    x.restore();
    return c.toDataURL('image/jpeg', 0.7);
  };
  const nowT = () => Date.now() + (S.off || 0);
  function seed() {
    S = {
      vis: {},
      seq: {},
      off: 0,
      users: [],
      pedidos: [],
      post: [],
      punt: [],
      avisos: [],
      fotos: [],
      pf: {},
      tf: [],
      rf: [],
      den: [],
      loc: [],
      aj: {
        limite_otros: 3,
        limite_mb: 500,
        tel_on: 0,
        primera_gratis: 1,
        limite_post: 6,
      },
      act: [],
      inv: [],
      logs: [],
      lim: [],
      ses: {},
      adm: [],
    };
    const n = Date.now(),
      H = 36e5,
      B = BARRIOS.filter((b) => b !== 'Otro');
    const U = (tipo, nombre0, tel, barrio, rub, bio) => {
      const nombre = /\s/.test(nombre0)
        ? nombre0
        : nombre0 + ' ' + ['Gómez', 'Pérez', 'Ruiz', 'Soto', 'Díaz', 'López'][S.users.length % 6];
      const u = {
        id: nid('u'),
        tipo,
        nombre,
        telefono: tel,
        ref_cod: '',
        ref_por: 0,
        ref_ok: 0,
        promos: 0,
        ref_prem: 0,
        pin: '123456',
        rec: 'ABCD1234',
        barrio,
        rubros: JSON.stringify(rub || []),
        bio: bio || '',
        suspendido: 0,
        intentos: 0,
        bloq: 0,
        dni: '',
        direccion: '',
        mail: '',
        alertas_hasta: 0,
        creado: n - nid('c') * DAY,
      };
      S.users.push(u);
      return u.id;
    };
    const ana = U('cliente', 'Ana (demo)', '2477000001', 'Centro'),
      beto = U(
        'trabajador',
        'Beto (demo)',
        '2477000002',
        'Centro',
        ['Pintura', 'Albañilería'],
        'Pintor y albañil, 10 años de experiencia. Trabajo prolijo y con presupuesto sin vueltas.',
      );
    const cl = ['Marta', 'Raúl', 'Sofía', 'Lucho'].map((x, i) =>
      U('cliente', x, '24770001' + (1 + i) + '0', B[i * 5], []),
    );
    const W = [
      ['Carla', 'Plomería'],
      ['Darío', 'Electricidad'],
      ['Elena', 'Jardinería', 'Limpieza'],
      ['Fede', 'Herrería', 'Carpintería'],
      ['Gise', 'Limpieza'],
      ['Hugo', 'Fletes y mudanzas'],
      ['Ivo', 'Albañilería', 'Otros'],
    ].map((x, i) => U('trabajador', x[0], '24770002' + (1 + i) + '0', B[i * 4 + 2], x.slice(1)));
    const [carla, , , , gise, , ivo] = W;
    const PO = (t, r, ba, cli, est, o = {}) => {
      const c = {
        id: nid('p'),
        cliente_id: cli,
        titulo: t,
        rubro: r,
        descripcion: o.d || 'Medidas y detalles a coordinar. Tengo los materiales.',
        barrio: ba,
        presupuesto: o.pr || 'A convenir',
        estado: est,
        vence: o.v || n + 6 * DAY,
        creado: o.c || n - nid('h') * H,
        elegida_en: o.el || null,
        hecha_en: o.he || null,
        oculta: 0,
      };
      S.pedidos.push(c);
      (o.f || []).forEach((f) => S.fotos.push({ id: nid('f'), pid: c.id, img: f, k: rk() }));
      return c.id;
    };
    const PS = (pid, tid, est, msg) => {
      const x = {
        id: nid('s'),
        pedido_id: pid,
        trabajador_id: tid,
        mensaje: msg || 'Hola, puedo hacerlo esta semana. Te paso presupuesto por WhatsApp.',
        estado: est,
        creado: n - nid('h2') * H,
        oculta: 0,
      };
      S.post.push(x);
      return x.id;
    };
    const AV = (u, t, l) =>
      S.avisos.push({ id: nid('a'), usuario_id: u, texto: t, creado: n - nid('h3') * H, leido: l ? 1 : 0 });
    const f1 = jpg('#4f8cff', '#0259E0', 'roll'),
      f2 = jpg('#fed114', '#ffb300', 'wall'),
      f3 = jpg('#7ee0a0', '#2fa866', 'leaf');
    const a1 = PO('Pintar living y comedor', 'Pintura', 'Centro', ana, 'abierta', {
      d: 'Unos 40 m2, techo y paredes. Pintura la pongo yo.',
      pr: '$150.000',
      f: [f1, f2],
    });
    [[beto], [ivo], [gise]].forEach((x) => PS(a1, x[0], 'activa'));
    const a2 = PO('Revocar un tapial de 6 metros', 'Albañilería', 'Centro', ana, 'elegida', {
      el: n - 5 * H,
      c: n - 48 * H,
    });
    PS(a2, ivo, 'elegida', 'Lo hago el sábado, tengo todo.');
    PS(a2, beto, 'descartada');
    const a3 = PO('Arreglar pérdida en la cocina', 'Plomería', 'Centro', ana, 'hecha', {
      el: n - 3 * DAY,
      he: n - DAY,
      c: n - 5 * DAY,
    });
    PS(a3, carla, 'elegida');
    PO('Cortar el pasto y podar', 'Jardinería', 'Centro', ana, 'vencida', { v: n - DAY, c: n - 8 * DAY });
    const b1 = PO('Pintura de fachada', 'Pintura', 'Lourdes', cl[0], 'elegida', {
      el: n - 4 * H,
      c: n - 30 * H,
      f: [f1],
    });
    PS(b1, beto, 'elegida', 'Con andamio propio, 2 días.');
    const b2 = PO('Levantar pared de ladrillo', 'Albañilería', 'San José', cl[1], 'hecha', {
      el: n - 9 * DAY,
      he: n - 6 * DAY,
      c: n - 11 * DAY,
    });
    PS(b2, beto, 'elegida');
    const b3 = PO('Pintar rejas del frente', 'Pintura', 'Centro', cl[2], 'hecha', {
      el: n - 20 * DAY,
      he: n - 18 * DAY,
      c: n - 22 * DAY,
    });
    PS(b3, beto, 'elegida');
    const PU = (pid, tid, cli, e, c, f) => {
      const p = {
        id: nid('r'),
        pedido_id: pid,
        trabajador_id: tid,
        cliente_id: cli,
        estrellas: e,
        comentario: c,
        creado: n - nid('h4') * DAY,
      };
      S.punt.push(p);
      if (f) S.rf.push({ id: nid('rf'), puntuacion_id: p.id, img: f, k: rk() });
    };
    PU(b2, beto, cl[1], 5, 'Muy prolijo y puntual. Lo recomiendo.', f2);
    PU(b3, beto, cl[2], 4, 'Buen trabajo, terminó en el día.');
    S.tf.push(
      { id: nid('t'), usuario_id: beto, img: f1, k: rk() },
      { id: nid('t'), usuario_id: beto, img: f2, k: rk() },
    );
    S.pf[beto] = { img: jpg('#c7d7ff', '#7aa7ff', 'user'), k: rk() };
    const UP = (id, o) =>
        Object.assign(
          S.users.find((x) => x.id === id),
          o,
        ),
      VER = { dni: '30111222', direccion: 'Calle 25 de Mayo 450', mail: 'demo@correo.com' },
      PH = (id, a, b) => {
        S.pf[id] = { img: jpg(a, b, 'user'), k: rk() };
      };
    const DN = (w, k, r, e, c, d, f) => {
      const pid = PO(TT[r][(w + d) % 3], r, B[(w * 3 + d) % B.length], cl[k % 4], 'hecha', {
        el: n - (d + 3) * DAY,
        he: n - (d + 1) * DAY,
        c: n - (d + 5) * DAY,
      });
      PS(pid, w, 'elegida');
      PU(pid, w, cl[k % 4], e, c, f);
    };
    /* más trabajadores, cada uno con un caso distinto para probar directorio, filtros, sello, alertas y Gestión */
    const nico = U(
      'trabajador',
      'Nico',
      '2477000310',
      B[3],
      ['Plomería'],
      'Plomero matriculado. Urgencias y trabajos programados, siempre con presupuesto por escrito.',
    );
    UP(nico, VER);
    PH(nico, '#9fd3ff', '#2f80ff');
    S.tf.push({ id: nid('t'), usuario_id: nico, img: f1, k: rk() });
    [
      [5, 'Llegó en media hora y dejó todo limpio.', 1, f1],
      [5, 'Cambió toda la instalación del baño sin problemas.', 4],
      [5, 'Muy claro con el presupuesto.', 7],
      [4, 'Buen trabajo, tardó un poco más de lo previsto.', 10],
      [5, 'Lo recomiendo.', 13],
    ].forEach((x, i) => DN(nico, i, 'Plomería', x[0], x[1], x[2], x[3]));
    const lau = U(
      'trabajador',
      'Lau',
      '2477000320',
      B[6],
      ['Electricidad'],
      'Electricista. Tableros, luces y reparaciones del hogar.',
    );
    UP(lau, VER);
    PH(lau, '#ffd6a5', '#ff9f45');
    [
      [5, 'Dejó el tablero prolijo y rotulado.', 2],
      [4, 'Bien, puntual.', 6],
      [4, 'Resolvió el problema de las luces.', 12],
    ].forEach((x, i) => DN(lau, i + 1, 'Electricidad', x[0], x[1], x[2]));
    const marcos = U(
      'trabajador',
      'Marcos',
      '2477000330',
      B[9],
      ['Pintura', 'Albañilería'],
      'Pintura y arreglos de albañilería.',
    );
    PH(marcos, '#d4c1ff', '#8b5cf6');
    [
      [3, 'Quedó bien pero dejó manchas en el piso.', 3],
      [4, 'Buen trabajo en la pintura.', 8],
      [3, 'Tardó más de lo acordado.', 11],
      [5, 'Excelente terminación en la medianera.', 15],
    ].forEach((x, i) => DN(marcos, i, i % 2 ? 'Albañilería' : 'Pintura', x[0], x[1], x[2]));
    const pame = U(
      'trabajador',
      'Pame',
      '2477000340',
      B[12 % B.length],
      ['Limpieza', 'Jardinería'],
      'Limpieza de casas y oficinas, y mantenimiento de jardines. Recién empiezo en la plataforma.',
    );
    UP(pame, VER);
    PH(pame, '#b8f0d0', '#34c27a');
    const tomi = U(
      'trabajador',
      'Tomi',
      '2477000350',
      B[5],
      ['Carpintería', 'Herrería'],
      'Muebles a medida, placards y rejas.',
    );
    PH(tomi, '#ffe8a3', '#f5b400');
    UP(tomi, { alertas_hasta: n + 5 * DAY });
    S.tf.push({ id: nid('t'), usuario_id: tomi, img: f3, k: rk() });
    [
      [5, 'El placard quedó perfecto.', 5, f3],
      [5, 'Muy buena mano para la madera.', 14],
    ].forEach((x, i) => DN(tomi, i + 2, 'Carpintería', x[0], x[1], x[2], x[3]));
    const rocio = U(
      'trabajador',
      'Rocío',
      '2477000360',
      B[8],
      ['Fletes y mudanzas', 'Otros'],
      'Fletes chicos y changas de todo tipo.',
    );
    PH(rocio, '#ffc2c2', '#ef5350');
    DN(rocio, 3, 'Fletes y mudanzas', 2, 'Llegó tarde y se rompió una silla.', 9);
    const walter = U('trabajador', 'Walter', '2477000370', B[2], ['Electricidad'], 'Instalaciones eléctricas.');
    PH(walter, '#cfd8dc', '#78909c');
    UP(walter, { suspendido: 1 });
    const yami = U(
      'trabajador',
      'Yami',
      '2477000380',
      B[10 % B.length],
      ['Plomería'],
      'Plomería en general.',
    ); /* sin foto de perfil: perfil incompleto, no aparece en el directorio */
    for (let i = 0; i < 54; i++) {
      const r = RUBROS[i % RUBROS.length];
      PO(TT[r][i % 3], r, B[(i * 7) % B.length], cl[i % 4], 'abierta', {
        c: n - (i * 5 + 2) * H,
        f: i % 5 === 0 ? [[f1, f2, f3][i % 3]] : [],
        pr: i % 3 ? 'A convenir' : '$' + (20 + i * 3) + '.000',
      });
    }
    AV(ana, 'Beto (demo) se postuló a «Pintar living y comedor».');
    AV(ana, 'Ivo se postuló a «Pintar living y comedor».');
    AV(ana, 'Gise se postuló a «Pintar living y comedor».', 1);
    AV(beto, '¡Te eligieron para «Pintura de fachada»! Entrá a Propuestas y escribile al cliente por WhatsApp.');
    AV(beto, 'Nuevo pedido de Pintura: Pintar rejas del frente', 1);
    S.den.push({
      id: nid('d'),
      autor_id: cl[0],
      tipo: 'pedido',
      objetivo_id: 20,
      motivo: 'Parece un aviso repetido.',
      estado: 'abierta',
      creado: n - 2 * H,
    });
    [
      [
        'Pinturería El Rodillo',
        'Pinturerías',
        'Mitre 450',
        'Centro',
        '2477400001',
        1,
        'Lun a Sáb 8-19',
        'Pinturas, rodillos y látex.',
        1,
      ],
      ['Pinturería Color', 'Pinturerías', 'Alsina 1200', 'Lourdes', '2477400002', 0, 'Lun a Vie 8-18', '', 1],
      [
        'Ferretería Don Pepe',
        'Ferreterías',
        'Rivadavia 800',
        'Centro',
        '2477400003',
        1,
        'Lun a Sáb 8-20',
        'Herramientas y tornillería.',
        1,
      ],
      ['Ferretería Norte', 'Ferreterías', 'Belgrano 90', 'San José', '2477400004', 1, '8-12 y 16-20', '', 1],
      [
        'Sanitarios Pergamino',
        'Sanitarios',
        'Moreno 330',
        'Centro',
        '2477400005',
        0,
        'Lun a Vie 8-17',
        'Grifería y cañerías.',
        1,
      ],
      [
        'Corralón La Obra',
        'Corralones',
        'Ruta 8 km 2',
        'Otro',
        '2477400006',
        1,
        'Lun a Sáb 7-18',
        'Arena, cemento, ladrillos.',
        1,
      ],
      ['Eléctrica Luz', 'Casas de electricidad', 'Sarmiento 700', 'Centro', '2477400007', 1, 'Lun a Sáb 8-19', '', 1],
      ['Maderera del Sur', 'Maderas y aberturas', 'Italia 1500', 'Otro', '2477400008', 0, 'Lun a Vie 8-17', '', 1],
      ['Vidriería Cristal', 'Vidrierías', 'España 410', 'Centro', '2477400009', 1, 'Lun a Sáb 8-18', '', 0],
      ['Ferretería Oculta', 'Ferreterías', 'Pellegrini 55', 'Centro', '2477400010', 0, '', '', 0],
      ['Corralón Oculto', 'Corralones', 'Colón 99', 'Otro', '2477400011', 0, '', '', 0],
    ].forEach((l) =>
      S.loc.push({
        id: nid('l'),
        nombre: l[0],
        rubro: l[1],
        direccion: l[2],
        barrio: l[3],
        telefono: l[4],
        whatsapp: l[5],
        horario: l[6],
        descripcion: l[7],
        activo: l[8],
      }),
    );
    const fu = jpg('#c7d7ff', '#7aa7ff', 'user');
    [ana, ...cl].forEach((i) => {
      S.pf[i] = { img: fu, k: rk() };
    });
    Object.assign(
      S.users.find((u) => u.id === beto),
      { dni: '33444555', direccion: 'Alsina 100', mail: 'beto@mail.com' },
    );
    Object.assign(
      S.users.find((u) => u.id === cl[0]),
      { dni: '20111222', direccion: 'Mitre 12', mail: 'marta@mail.com' },
    );
    const dsx = S.pedidos.find((c) => c.rubro === 'Plomería' && c.estado === 'abierta' && c.cliente_id !== ana);
    if (dsx) {
      dsx.dest_desde = n - H;
      dsx.dest_hasta = n + 70 * H;
    }
    S.logs.push({ creado: n, tipo: 'sistema', detalle: 'Datos de prueba cargados' });
    save();
  }
  try {
    S = JSON.parse(localStorage.getItem('prueba_db31'));
  } catch (e) {}
  if (!S || !S.users) seed();
  const E = (m, s = 400) => [s, { error: m }],
    O = [200, { ok: 1 }];
  const lg = (t, d) => S.logs.push({ creado: nowT(), tipo: t, detalle: String(d).slice(0, 200) });
  const avs = (l) =>
    l.forEach(([u, t]) => S.avisos.push({ id: nid('a'), usuario_id: u, texto: t, creado: nowT(), leido: 0 }));
  // Avisos: con alertas pagas o destacado, enseguida; si no, a los 45 minutos (se avanza el reloj desde el panel de la prueba)
  const notif = (c, now) => {
    const dest = (c.dest_hasta || 0) > now,
      libre = dest || (c.aviso_en > 0 && c.aviso_en <= now);
    c.avisados = c.avisados || [];
    S.users
      .filter(
        (u) =>
          u.tipo === 'trabajador' &&
          !u.suspendido &&
          JSON.parse(u.rubros || '[]').includes(c.rubro) &&
          (libre || (u.alertas_hasta || 0) > now) &&
          !c.avisados.includes(u.id),
      )
      .forEach((u) => {
        c.avisados.push(u.id);
        avs([[u.id, (dest ? 'Pedido destacado' : 'Nuevo pedido') + ' de ' + c.rubro + ': ' + c.titulo.slice(0, 80)]]);
      });
    if (libre) c.aviso_pend = 0;
  };
  const tick = (now) =>
    S.pedidos.forEach((c) => {
      if (c.aviso_pend && c.estado === 'abierta') notif(c, now);
    });
  const rs = (t) => S.punt.filter((x) => x.trabajador_id === t),
    pr = (t) => {
      const l = rs(t);
      return l.length ? Math.round((l.reduce((s, x) => s + x.estrellas, 0) / l.length) * 10) / 10 : null;
    };
  const fs = (pid) =>
    S.fotos
      .filter((f) => f.pid === pid)
      .map((f) => f.id + '.' + f.k)
      .join(',') || null;
  const okjpg = (f, max) => typeof f === 'string' && f.startsWith('data:image/jpeg;base64,') && f.length < max;
  const addF = (pid, l) => {
    let n = S.fotos.filter((f) => f.pid === pid).length;
    for (const f of Array.isArray(l) ? l : []) {
      if (n >= 3) break;
      if (okjpg(f, 250000)) {
        S.fotos.push({ id: nid('f'), pid, img: f, k: rk() });
        n++;
      }
    }
  };
  function route(m, p, q, b, h) {
    const now = nowT();
    tick(now);
    const tel = REGLAS.limpiarTel(b.telefono),
      U = (id) => S.users.find((u) => u.id === id),
      P = (id) => S.pedidos.find((c) => c.id === +id);
    const vencer = () => {
      S.pedidos.forEach((c) => {
        if (c.estado === 'abierta' && c.vence < now) c.estado = 'vencida';
      });
      S.fotos = S.fotos.filter((f) => {
        const c = P(f.pid);
        return c && !['vencida', 'cancelada'].includes(c.estado);
      });
    };
    if (p[0] === 'zona')
      return [
        200,
        {
          pedidos: S.pedidos.filter((c) => c.estado === 'abierta' && c.vence > now).length,
          trabajadores: S.users.filter(
            (u) => u.tipo === 'trabajador' && S.pf[u.id] && JSON.parse(u.rubros || '[]').length,
          ).length,
          hechos: S.pedidos.filter((c) => c.estado === 'hecha').length,
        },
      ];
    const ACT = (a) => {
      if (a.tipo === 'alertas') {
        const w = U(a.usuario_id);
        if (!w) return 'No existe el usuario';
        const h = Math.max(now, w.alertas_hasta || 0) + 7 * DAY;
        w.alertas_hasta = h;
        a.estado = 'activa';
        a.activada_en = now;
        a.vence = h;
        avs([[w.id, 'Tus alertas inmediatas están activas hasta el ' + fec(h) + '.']]);
      } else {
        const c = P(a.pedido_id);
        if (!c || c.estado !== 'abierta' || c.vence < now)
          return 'Ese pedido ya no está abierto: rechazá la solicitud.';
        const h = Math.max(now, c.dest_hasta || 0) + 72 * 60 * MIN;
        c.dest_desde = now;
        c.dest_hasta = h;
        c.aviso_pend = 1;
        a.estado = 'activa';
        a.activada_en = now;
        a.vence = h;
        notif(c, now);
        avs([[a.usuario_id, 'Tu pedido «' + c.titulo.slice(0, 60) + '» ya está destacado por 72 horas.']]);
      }
      return null;
    };
    if (p[0] === 'admin') {
      S.adm = S.adm.filter((t) => t > now - 60 * MIN);
      if (S.adm.length >= 10) return E('Demasiados intentos. Probá en un rato.', 429);
      if (h['x-admin-key'] !== 'clave') {
        S.adm.push(now);
        return E('Clave incorrecta', 401);
      }
      const z = p[1];
      if (m === 'GET') {
        const qq = String(q.get('q') || '')
            .trim()
            .toLowerCase(),
          cc = (() => {
            try {
              return JSON.parse(q.get('c'));
            } catch (e) {
              return null;
            }
          })(),
          aft = (l) => {
            if (cc == null) return l;
            const id = Array.isArray(cc) ? cc[cc.length - 1] : cc,
              i = l.findIndex((x) => String(x.id) === String(id));
            return i < 0 ? l : l.slice(i + 1);
          },
          mt = (...v) => !qq || v.join(' ').toLowerCase().includes(qq),
          est = (c) => (c.estado === 'abierta' && c.vence < now ? 'vencida' : c.estado);
        if (z === 'pend') {
          return [200, { n: 0, den: S.den.filter((d) => d.estado === 'abierta').length }];
        }
        if (z === 'denuncias') {
          const it = [...S.den]
            .sort(
              (a, b) =>
                (b.estado === 'abierta') - (a.estado === 'abierta') ||
                b.id.toString().localeCompare(a.id.toString(), 'es', { numeric: true }),
            )
            .map((d) => {
              const a = U(d.autor_id),
                p = d.tipo === 'pedido' ? P(d.objetivo_id) : null,
                pc = p ? U(p.cliente_id) : null,
                u = d.tipo === 'usuario' ? U(d.objetivo_id) : null;
              return {
                id: d.id,
                tipo: d.tipo,
                objetivo_id: d.objetivo_id,
                motivo: d.motivo,
                estado: d.estado,
                creado: d.creado,
                autor: a && a.nombre,
                autor_tel: a && a.telefono,
                veces: S.den.filter((x) => x.tipo === d.tipo && x.objetivo_id === d.objetivo_id).length,
                p_titulo: p ? p.titulo : null,
                p_estado: p ? p.estado : null,
                p_rubro: p ? p.rubro : null,
                p_cliente: pc ? pc.nombre : null,
                p_tel: pc ? pc.telefono : null,
                p_susp: pc ? pc.suspendido : null,
                u_nombre: u ? u.nombre : null,
                u_tel: u ? u.telefono : null,
                u_tipo: u ? u.tipo : null,
                u_susp: u ? u.suspendido : null,
              };
            });
          return [200, { items: it, abiertas: S.den.filter((d) => d.estado === 'abierta').length }];
        }
        if (z === 'inicio') {
          const H = now - DAY,
            D7 = now - 7 * DAY,
            c = (l, t) => l.filter((x) => x.creado > t).length,
            us = S.users,
            pe = S.pedidos,
            dias = [];
          for (let i = 6; i >= 0; i--) dias.push(new Date(now - 3 * 3600e3 - i * DAY).toISOString().slice(0, 10));
          const por = (l) =>
            dias.map((d) => l.filter((x) => new Date(x.creado - 3 * 3600e3).toISOString().slice(0, 10) === d).length);
          const ls = S.loc
            .map((l) => ({
              id: l.id,
              nombre: l.nombre,
              rubro: l.rubro,
              activo: l.activo,
              visitas: S.vis[l.id] || 0,
              v7: S.vis[l.id] || 0,
              registros: us.filter((u) => u.origen === l.id).length,
              pedidos: pe.filter((c) => {
                const u = U(c.cliente_id);
                return u && u.origen === l.id;
              }).length,
            }))
            .filter((x) => x.visitas || x.registros || x.pedidos)
            .sort((a, b) => b.registros - a.registros || b.visitas - a.visitas);
          return [
            200,
            {
              tel_on: S.aj.tel_on,
              avisos_n: 0,
              push_ok: 1,
              telpend: Object.entries(S.tc || {})
                .map(([id, c]) => {
                  const u = S.users.find((x) => x.id === +id || String(x.id) === id);
                  return u && u.tel_ok === 0
                    ? {
                        id: u.id,
                        nombre: u.nombre,
                        telefono: u.telefono,
                        tipo: u.tipo,
                        codigo: c.codigo,
                        vence: c.vence,
                        intentos: c.intentos,
                        creado: c.creado,
                      }
                    : null;
                })
                .filter(Boolean),
              gen: now,
              usuarios: {
                tot: us.length,
                trab: us.filter((u) => u.tipo === 'trabajador').length,
                cli: us.filter((u) => u.tipo === 'cliente').length,
                h24: c(us, H),
                d7: c(us, D7),
                t7: c(
                  us.filter((u) => u.tipo === 'trabajador'),
                  D7,
                ),
                c7: c(
                  us.filter((u) => u.tipo === 'cliente'),
                  D7,
                ),
              },
              pedidos: {
                tot: pe.length,
                h24: c(pe, H),
                d7: c(pe, D7),
                abiertos: pe.filter((x) => x.estado === 'abierta' && x.vence > now).length,
                marcha: pe.filter((x) => x.estado === 'elegida').length,
                hechos: pe.filter((x) => x.estado === 'hecha').length,
              },
              post: { tot: S.post.length, h24: c(S.post, H), d7: c(S.post, D7) },
              activos: {
                alertas: us.filter((u) => u.alertas_hasta > now).length,
                destacados: pe.filter((x) => x.estado === 'abierta' && x.dest_hasta > now).length,
              },
              denuncias: S.den.filter((d) => d.estado === 'abierta').length,
              serie: { dias, usuarios: por(us), pedidos: por(pe), post: por(S.post) },
              qr: {
                items: ls.slice(0, 12),
                locales: S.loc.length,
                activos: ls.length,
                visitas: ls.reduce((t, x) => t + x.visitas, 0),
                registros: ls.reduce((t, x) => t + x.registros, 0),
                pedidos: ls.reduce((t, x) => t + x.pedidos, 0),
              },
            },
          ];
        }
        if (z === 'trabajadores')
          return [
            200,
            S.users
              .filter((u) => u.tipo === 'trabajador')
              .reverse()
              .map((u) => ({
                id: u.id,
                nombre: u.nombre,
                telefono: u.telefono,
                pregunta: u.pregunta || '',
                barrio: u.barrio,
                rubros: u.rubros,
                dni: u.dni,
                direccion: u.direccion,
                mail: u.mail,
                alertas_hasta: u.alertas_hasta,
                suspendido: u.suspendido,
                creado: u.creado,
                promos: u.promos || 0,
                ref_por_nombre: (U(u.ref_por) || {}).nombre || null,
                ref_n: S.users.filter((x) => x.ref_por === u.id).length,
                ref_ok_n: S.users.filter((x) => x.ref_por === u.id && x.ref_ok && !x.suspendido).length,
                prom: pr(u.id),
                n: rs(u.id).length,
                post: S.post.filter((x) => x.trabajador_id === u.id).length,
              })),
          ];
        if (z === 'clientes')
          return [
            200,
            aft(S.users.filter((u) => u.tipo === 'cliente' && mt(u.nombre, u.telefono, u.barrio, u.mail)).reverse())
              .slice(0, 100)
              .map((u) => ({
                id: u.id,
                nombre: u.nombre,
                telefono: u.telefono,
                pregunta: u.pregunta || '',
                barrio: u.barrio,
                dni: u.dni,
                direccion: u.direccion,
                mail: u.mail,
                suspendido: u.suspendido,
                creado: u.creado,
                promos: u.promos || 0,
                ref_por_nombre: (U(u.ref_por) || {}).nombre || null,
                ref_n: S.users.filter((x) => x.ref_por === u.id).length,
                ref_ok_n: S.users.filter((x) => x.ref_por === u.id && x.ref_ok && !x.suspendido).length,
                total: S.pedidos.filter((c) => c.cliente_id === u.id).length,
                activas: S.pedidos.filter((c) => c.cliente_id === u.id && ['abierta', 'elegida'].includes(c.estado))
                  .length,
              })),
          ];
        if (z === 'pedidos') {
          const e = q.get('e') || '',
            ok =
              {
                abierta: (c) => c.estado === 'abierta' && c.vence >= now,
                elegida: (c) => c.estado === 'elegida',
                hecha: (c) => c.estado === 'hecha',
                cancelada: (c) => c.estado === 'cancelada',
                vencida: (c) => est(c) === 'vencida',
                dest: (c) => (c.dest_hasta || 0) > now,
              }[e] || (() => true);
          return [
            200,
            {
              pedidos: aft(
                S.pedidos
                  .filter((c) => ok(c) && mt(c.titulo, U(c.cliente_id).nombre, U(c.cliente_id).telefono, c.barrio))
                  .reverse(),
              )
                .slice(0, 100)
                .map((c) => ({
                  id: c.id,
                  titulo: c.titulo,
                  rubro: c.rubro,
                  barrio: c.barrio,
                  estado: est(c),
                  creado: c.creado,
                  vence: c.vence,
                  dest_hasta: c.dest_hasta || 0,
                  oculta: c.oculta || 0,
                  cliente: U(c.cliente_id).nombre,
                  telefono: U(c.cliente_id).telefono,
                  post: S.post.filter((x) => x.pedido_id === c.id && x.estado === 'activa').length,
                  props: S.post.filter((x) => x.pedido_id === c.id).length,
                  fotos: S.fotos.filter((f) => f.pid === c.id).length,
                })),
            },
          ];
        }
        if (z === 'destacados')
          return [
            200,
            S.pedidos
              .filter((c) => (c.dest_hasta || 0) > now)
              .sort((a, b) => a.dest_hasta - b.dest_hasta)
              .map((c) => ({
                id: c.id,
                titulo: c.titulo,
                rubro: c.rubro,
                barrio: c.barrio,
                estado: est(c),
                vence: c.vence,
                dest_desde: c.dest_desde,
                dest_hasta: c.dest_hasta,
                cliente: U(c.cliente_id).nombre,
                telefono: U(c.cliente_id).telefono,
                post: S.post.filter((x) => x.pedido_id === c.id && x.estado === 'activa').length,
              })),
          ];
        if (z === 'propuestas') {
          const c = P(q.get('pedido'));
          if (!c) return E('No existe ese pedido', 404);
          const r = S.punt.find((x) => x.pedido_id === c.id);
          return [
            200,
            {
              pedido: {
                id: c.id,
                titulo: c.titulo,
                estado: est(c),
                vence: c.vence,
                cliente: U(c.cliente_id).nombre,
                telefono: U(c.cliente_id).telefono,
              },
              items: S.post
                .filter((x) => x.pedido_id === c.id)
                .map((x) => {
                  const u = U(x.trabajador_id);
                  return {
                    id: x.id,
                    mensaje: x.mensaje,
                    estado: x.estado,
                    creado: x.creado,
                    oculta: x.oculta || 0,
                    tid: u.id,
                    nombre: u.nombre,
                    telefono: u.telefono,
                    suspendido: u.suspendido,
                    prom: pr(u.id),
                    n: rs(u.id).length,
                  };
                }),
              resena: r ? { id: r.id, estrellas: r.estrellas, comentario: r.comentario } : null,
            },
          ];
        }
        if (z === 'resenas')
          return [
            200,
            aft(
              [...S.punt]
                .reverse()
                .map((x) => {
                  const t = U(x.trabajador_id),
                    cu = U(x.cliente_id),
                    c = P(x.pedido_id);
                  return {
                    id: x.id,
                    pedido_id: x.pedido_id,
                    estrellas: x.estrellas,
                    comentario: x.comentario,
                    creado: x.creado,
                    trabajador: t && t.nombre,
                    t_tel: t && t.telefono,
                    cliente: cu && cu.nombre,
                    c_tel: cu && cu.telefono,
                    titulo: c && c.titulo,
                    fotos:
                      S.rf
                        .filter((f) => f.puntuacion_id === x.id)
                        .map((f) => f.id + '.' + f.k)
                        .join(',') || null,
                  };
                })
                .filter((x) => mt(x.comentario, x.trabajador, x.cliente, x.titulo)),
            ).slice(0, 100),
          ];
        if (z === 'fotos') {
          const t = q.get('t') || 'perfil',
            ow = (id) => U(id) || { nombre: '?', telefono: '' };
          let l;
          if (t === 'perfil')
            l = Object.entries(S.pf).map(([id, x]) => ({
              id: +id,
              k: x.k,
              creado: 0,
              nombre: ow(+id).nombre,
              telefono: ow(+id).telefono,
            }));
          else if (t === 'trabajos')
            l = [...S.tf].reverse().map((x) => ({
              id: x.id,
              k: x.k,
              creado: 0,
              nombre: ow(x.usuario_id).nombre,
              telefono: ow(x.usuario_id).telefono,
            }));
          else if (t === 'resenas')
            l = [...S.rf].reverse().map((x) => {
              const s = S.punt.find((p) => p.id === x.puntuacion_id) || {};
              return {
                id: x.id,
                k: x.k,
                creado: s.creado,
                nombre: ow(s.cliente_id).nombre,
                telefono: ow(s.cliente_id).telefono,
              };
            });
          else if (t === 'pedidos')
            l = [...S.fotos].reverse().map((x) => {
              const c = P(x.pid) || {};
              return {
                id: x.id,
                k: x.k,
                creado: c.creado,
                nombre: ow(c.cliente_id).nombre,
                telefono: ow(c.cliente_id).telefono,
              };
            });
          else return E('Tipo de foto desconocido');
          return [200, aft(l.filter((x) => mt(x.nombre, x.telefono))).slice(0, 48)];
        }
        if (z === 'locales') {
          S.loc.forEach((l) => {
            if (!l.codigo) l.codigo = rk().slice(0, 6);
          });
          return [
            200,
            [...S.loc]
              .sort((a, b) => a.rubro.localeCompare(b.rubro) || a.nombre.localeCompare(b.nombre))
              .map((l) => ({
                ...l,
                visitas: S.vis[l.id] || 0,
                registros: S.users.filter((u) => u.origen === l.id).length,
                pedidos: S.pedidos.filter((c) => {
                  const u = S.users.find((x) => x.id === c.cliente_id);
                  return u && u.origen === l.id;
                }).length,
              })),
          ];
        }
        if (z === 'pagos') {
          const f = (a) => {
            const u = U(a.usuario_id);
            return {
              id: a.id,
              tipo: a.tipo,
              estado: a.estado,
              creado: a.creado,
              activada_en: a.activada_en,
              vence: a.vence,
              pedido_id: a.pedido_id,
              nombre: u.nombre,
              telefono: u.telefono,
              titulo: a.pedido_id ? (P(a.pedido_id) || {}).titulo || '' : '',
            };
          };
          return [200, { hist: S.act.slice().reverse().slice(0, 40).map(f) }];
        }
        if (z === 'precios') return [200, { ajustes: { primera_gratis: S.aj.primera_gratis } }];
        if (z === 'ajustes') {
          const ft = (l) => ({ n: l.length, b: l.reduce((s, x) => s + x.img.length, 0) });
          return [
            200,
            {
              ajustes: S.aj,
              db: null,
              fotos: { pedidos: ft(S.fotos), perfil: ft(Object.values(S.pf)), resenas: ft(S.rf), trabajos: ft(S.tf) },
              usuarios: {
                trabajadores: S.users.filter((u) => u.tipo === 'trabajador').length,
                clientes: S.users.filter((u) => u.tipo === 'cliente').length,
              },
              pedidos: S.pedidos.reduce((o, c) => ((o[c.estado] = (o[c.estado] || 0) + 1), o), {}),
              logs: [...S.logs].reverse().slice(0, 100),
              errores: [...(S.err || [])].reverse().slice(0, 30),
            },
          ];
        }
        return E('No existe', 404);
      }
      const us = S.users.find((u) => u.telefono === tel);
      if (z === 'reset-pin') {
        if (!PIN.test(b.pin || '')) return E('El PIN tiene 6 números');
        if (us) {
          us.pin = b.pin;
          us.intentos = 0;
          us.bloq = 0;
          Object.keys(S.ses).forEach((k) => {
            if (S.ses[k] === us.id) delete S.ses[k];
          });
        }
        lg('admin', 'PIN cambiado: ' + tel);
        return O;
      }
      if (z === 'errores-borrar') {
        S.err = [];
        lg('admin', 'Errores de la app borrados');
        return O;
      }
      if (z === 'ref-anular') {
        if (us) {
          S.users
            .filter((x) => x.ref_por === us.id)
            .forEach((x) => {
              x.ref_por = 0;
              x.ref_ok = 0;
            });
          us.promos = 0;
          us.ref_prem = REF_MAX;
        }
        lg('admin', 'Invitados y promociones por invitar anulados: ' + tel);
        return O;
      }
      if (z === 'suspender') {
        if (us) us.suspendido = b.on ? 1 : 0;
        lg('admin', (b.on ? 'Suspendido: ' : 'Reactivado: ') + tel);
        return O;
      }
      if (z === 'bajar') {
        const c = P(b.id);
        if (c) {
          c.estado = 'cancelada';
          S.fotos = S.fotos.filter((f) => f.pid !== c.id);
        }
        lg('admin', 'Pedido dado de baja: #' + +b.id);
        return O;
      }
      if (z === 'cerrar-denuncia') {
        const d = S.den.find((x) => x.id === +b.id);
        if (d) d.estado = 'cerrada';
        lg('admin', 'Denuncia cerrada: #' + +b.id);
        return O;
      }
      if (z === 'local' || z === 'local-editar') {
        const nm = String(b.nombre || '').trim();
        if (nm.length < 2 || !RLOC.includes(b.rubro)) return E('Poné el nombre y elegí el rubro');
        const v = {
          nombre: nm.slice(0, 80),
          rubro: b.rubro,
          direccion: String(b.direccion || '').slice(0, 100),
          barrio: String(b.barrio || '').slice(0, 40),
          telefono: String(b.telefono || '')
            .replace(/\D/g, '')
            .slice(0, 15),
          whatsapp: b.whatsapp ? 1 : 0,
          horario: String(b.horario || '').slice(0, 100),
          descripcion: String(b.descripcion || '').slice(0, 300),
        };
        if (z === 'local') S.loc.push({ id: nid('l'), ...v, activo: 0 });
        else Object.assign(S.loc.find((l) => l.id === +b.id) || {}, v);
        lg('admin', (z === 'local' ? 'Local nuevo: ' : 'Local editado: ') + nm.slice(0, 60));
        return O;
      }
      if (z === 'local-borrar') {
        S.loc = S.loc.filter((l) => l.id !== +b.id);
        lg('admin', 'Local borrado: #' + +b.id);
        return O;
      }
      if (z === 'local-ocultar') {
        const l = S.loc.find((l) => l.id === +b.id);
        if (l) l.activo = 1 - l.activo;
        lg('admin', 'Local mostrado u oculto: #' + +b.id);
        return O;
      }
      if (z === 'quitar-destacado') {
        const c = P(b.id);
        if (!c || !((c.dest_hasta || 0) > now)) return E('Ese pedido ya no está destacado');
        c.dest_desde = 0;
        c.dest_hasta = 0;
        S.act.forEach((a) => {
          if (a.pedido_id === c.id && a.tipo === 'destacado' && a.estado === 'activa' && a.vence > now) a.vence = now;
        });
        avs([
          [
            c.cliente_id,
            'Sacamos el destacado de tu pedido «' +
              c.titulo.slice(0, 60) +
              '». Si tenés dudas, escribinos por WhatsApp.',
          ],
        ]);
        lg('admin', 'Destacado quitado: #' + c.id);
        return O;
      }
      if (z === 'resena-quitar' || z === 'resena-borrar') {
        const r = S.punt.find((x) => x.id === +b.id);
        if (!r) return E('Esa reseña ya no existe');
        S.rf = S.rf.filter((x) => x.puntuacion_id !== r.id);
        if (z === 'resena-borrar') S.punt = S.punt.filter((x) => x.id !== r.id);
        else r.comentario = '';
        avs([
          [
            r.cliente_id,
            z === 'resena-borrar'
              ? 'Sacamos tu reseña porque no cumplía las normas de Dicho y Hecho.'
              : 'Sacamos el comentario y las fotos de tu reseña porque no cumplían las normas de Dicho y Hecho.',
          ],
        ]);
        lg('admin', (z === 'resena-borrar' ? 'Reseña borrada: #' : 'Reseña moderada: #') + r.id);
        return O;
      }
      if (z === 'foto-borrar') {
        const id = +b.id,
          t = b.t;
        let o = null;
        if (t === 'perfil') {
          if (S.pf[id]) {
            o = id;
            delete S.pf[id];
          }
        } else if (t === 'trabajos') {
          const x = S.tf.find((y) => y.id === id);
          if (x) {
            o = x.usuario_id;
            S.tf = S.tf.filter((y) => y.id !== id);
          }
        } else if (t === 'resenas') {
          const x = S.rf.find((y) => y.id === id),
            s = x && S.punt.find((p) => p.id === x.puntuacion_id);
          if (x) {
            o = s ? s.cliente_id : 0;
            S.rf = S.rf.filter((y) => y.id !== id);
          }
        } else if (t === 'pedidos') {
          const x = S.fotos.find((y) => y.id === id),
            c = x && P(x.pid);
          if (x) {
            o = c ? c.cliente_id : 0;
            S.fotos = S.fotos.filter((y) => y.id !== id);
          }
        } else return E('Tipo de foto desconocido');
        if (o === null) return E('Esa foto ya no existe');
        avs([
          [
            o,
            'Sacamos una foto tuya porque no cumplía las normas de Dicho y Hecho.' +
              (t === 'perfil' ? ' Subí otra para seguir usando la app.' : ''),
          ],
        ]);
        lg('admin', 'Foto borrada (' + t + '): #' + id);
        return O;
      }
      if (z === 'push') return O;
      if (z === 'ajuste') {
        const r = {
            limite_otros: [0, 50],
            limite_post: [1, 100],
            limite_mb: [50, 1e6],
            tel_on: [0, 1],
            primera_gratis: [0, 1],
          }[b.clave],
          v = Math.round(+b.valor);
        if (!r || !(v >= r[0] && v <= r[1])) return E('Valor fuera de rango');
        S.aj[b.clave] = v;
        lg('admin', 'Ajuste ' + b.clave + ' = ' + v);
        return O;
      }
      if (z === 'purgar-fotos') {
        const a = S.fotos.length;
        vencer();
        lg('admin', 'Fotos de pedidos vencidos borradas: ' + (a - S.fotos.length));
        return [200, { borradas: a - S.fotos.length }];
      }
      return E('No existe', 404);
    }
    const ses = () => {
      const t = Math.random().toString(16).slice(2) + Math.random().toString(16).slice(2);
      S.ses[t] = S.users[S.users.length - 1].id;
      return t;
    };
    if (p[0] === 'origen') {
      const l = S.loc.find((x) => x.codigo === String(b.c || '') && x.activo);
      if (l) S.vis[l.id] = (S.vis[l.id] || 0) + 1;
      return [200, { ok: 1 }];
    }
    if (p[0] === 'registro') {
      if (!['cliente', 'trabajador'].includes(b.tipo)) return E('Elegí si sos cliente o trabajador');
      if (!b.acepto) return E('Tenés que aceptar el aviso legal');
      if (!NOM(b.nombre)) return E('Poné tu nombre y apellido');
      const ml = String(b.mail || '')
        .trim()
        .toLowerCase()
        .slice(0, 100);
      if (ml && !MAILRE.test(ml)) return E('El mail no es válido');
      if (!String(b.barrio || '').trim()) return E('Elegí tu barrio');
      if (!REGLAS.telValido(tel)) return E('Teléfono inválido');
      if (!PIN.test(b.pin || '')) return E('El PIN tiene 6 números');
      {
        const vi = S.users.findIndex((u) => u.telefono === tel && u.tel_ok === 0);
        if (vi >= 0) S.users.splice(vi, 1);
      }
      if (S.users.some((u) => u.telefono === tel)) return E('Ese teléfono ya está registrado', 409);
      const pg = PREGm(b.pregunta),
        rs = NRm(b.respuesta);
      if (!REGLAS.PREGUNTAS.includes(pg)) return E('Elegí una pregunta de seguridad de la lista');
      {
        const er = REGLAS.errRespuesta(b.respuesta, pg);
        if (er) return E(er);
      }
      const rec = rk().toUpperCase();
      const rf = REFRE.test(String(b.ref || '')) ? S.users.find((u) => u.ref_cod === String(b.ref)) : null;
      S.users.push({
        id: nid('u'),
        tipo: b.tipo,
        nombre: NOM(b.nombre),
        telefono: tel,
        pin: b.pin,
        rec,
        barrio: String(b.barrio || '').slice(0, 40),
        rubros: '[]',
        bio: '',
        suspendido: 0,
        intentos: 0,
        bloq: 0,
        dni: '',
        direccion: '',
        mail: ml,
        ref_cod: '',
        ref_por: rf ? rf.id : 0,
        ref_ok: 0,
        promos: 0,
        ref_prem: 0,
        alertas_hasta: 0,
        tel_ok: S.aj.tel_on ? 0 : 1,
        pregunta: pg,
        resp: rs,
        origen: (S.loc.find((l) => l.codigo && l.codigo === String(b.origen || '')) || {}).id || 0,
        creado: now,
      });
      {
        const nu = S.users[S.users.length - 1];
        if (nu.tel_ok === 0)
          (S.tc = S.tc || {})[nu.id] = {
            codigo: String(Math.floor(Math.random() * 1e6)).padStart(6, '0'),
            vence: now + 36e5,
            intentos: 0,
            creado: now,
          };
      }
      lg('registro', b.tipo + ' nuevo: ' + NOM(b.nombre).slice(0, 40));
      return [200, { token: ses(), confirmar: S.aj.tel_on ? 1 : 0 }];
    }
    if (p[0] === 'login') {
      const x = S.users.find((u) => u.telefono === tel);
      if (!x) return E('Teléfono o PIN incorrectos', 401);
      if (x.suspendido) return E('Cuenta suspendida', 403);
      if (x.bloq > now) return E('Demasiados intentos. Probá en unos minutos.', 429);
      if (String(b.pin || '') !== x.pin) {
        x.intentos++;
        if (x.intentos >= 5) {
          x.intentos = 0;
          x.nb = (x.nb || 0) + 1;
          x.bloq = now + (x.nb <= 1 ? 15 * MIN : x.nb === 2 ? 60 * MIN : 864e5);
        }
        return E('Teléfono o PIN incorrectos', 401);
      }
      x.intentos = 0;
      const t = Math.random().toString(16).slice(2) + Math.random().toString(16).slice(2);
      S.ses[t] = x.id;
      return [200, { token: t }];
    }
    if (p[0] === 'recuperar-pregunta') {
      const x = S.users.find((u) => u.telefono === tel);
      return [200, { pregunta: x && x.pregunta ? x.pregunta : '¿Cómo se llamaba tu primera mascota?' }];
    }
    if (p[0] === 'recuperar') {
      const x = S.users.find((u) => u.telefono === tel);
      if (!PIN.test(b.pin || '')) return E('El PIN nuevo tiene 6 números');
      if (!x || !x.resp || NRm(b.respuesta) !== x.resp) return E('La respuesta no es correcta', 401);
      x.pin = b.pin;
      x.intentos = 0;
      x.bloq = 0;
      const t = Math.random().toString(16).slice(2) + Math.random().toString(16).slice(2);
      S.ses[t] = x.id;
      return [200, { token: t }];
    }
    if (p[0] === 'push-key') return [200, { key: '' }];
    if (p[0] === 'error' && m === 'POST') {
      (S.err = S.err || []).push({
        id: nid('er'),
        creado: now,
        donde: 'app',
        mensaje: String(b.msg || '').slice(0, 300),
        detalle: String(b.src || '').slice(0, 200),
      });
      return O;
    }
    const me = U(S.ses[(h.authorization || '').slice(7)]);
    if (!me || me.suspendido) return E('Iniciá sesión', 401);
    const telPend = me.tel_ok === 0 && S.aj.tel_on === 1;
    if (telPend && !['yo', 'tel-codigo', 'tel-nuevo'].includes(p[0])) return E('Falta confirmar tu teléfono', 403);
    if (p[0] === 'tel-codigo') {
      if (!telPend) return O;
      const c = (S.tc || {})[me.id];
      if (!c || c.vence < now) return E('El código venció. Pedí uno nuevo.', 410);
      if (c.intentos >= 5) return E('Probaste muchas veces. Pedí un código nuevo.', 429);
      if (String(b.codigo || '').replace(/\D/g, '') !== c.codigo) {
        c.intentos++;
        return E('El código no es correcto', 400);
      }
      me.tel_ok = 1;
      delete S.tc[me.id];
      return O;
    }
    if (p[0] === 'tel-nuevo') {
      if (!telPend) return O;
      S.tc[me.id] = {
        codigo: String(Math.floor(Math.random() * 1e6)).padStart(6, '0'),
        vence: now + 36e5,
        intentos: 0,
        creado: now,
      };
      return O;
    }
    if (p[0] === 'pregunta') {
      if (String(b.pin || '') !== me.pin) return E('Tu PIN no es correcto', 401);
      const pg = PREGm(b.pregunta),
        rs = NRm(b.respuesta);
      if (!REGLAS.PREGUNTAS.includes(pg)) return E('Elegí una pregunta de seguridad de la lista');
      {
        const er = REGLAS.errRespuesta(b.respuesta, pg);
        if (er) return E(er);
      }
      me.pregunta = pg;
      me.resp = rs;
      return O;
    }
    const cli = me.tipo === 'cliente',
      tra = !cli;
    const fl = (u = me) => {
      const f = [];
      if (!NOM(u.nombre)) f.push('nombre');
      if (!S.pf[u.id]) f.push('foto');
      if (!String(me.barrio || '').trim()) f.push('barrio');
      if (tra && !JSON.parse(me.rubros || '[]').length) f.push('rubros');
      return f;
    };
    const pedirPerfil = () => {
      const f = fl();
      return f.length
        ? E(
            'Completá tu perfil para seguir (' +
              f.map((x) => (x === 'foto' ? 'foto de perfil' : x === 'nombre' ? 'nombre y apellido' : x)).join(', ') +
              ').',
            403,
          )
        : null;
    };
    const refRev = () => {
      const u = me;
      if (!u.ref_por || u.ref_ok || fl(u).length) return;
      if (!S.pedidos.some((c) => c.cliente_id === u.id) && !S.post.some((x) => x.trabajador_id === u.id)) return;
      u.ref_ok = 1;
      const inv = U(u.ref_por);
      if (!inv || (inv.ref_prem || 0) >= REF_MAX) return;
      const n = S.users.filter((x) => x.ref_por === inv.id && x.ref_ok && !x.suspendido).length;
      if (Math.floor(n / REF_N) > (inv.ref_prem || 0)) {
        inv.promos = (inv.promos || 0) + 1;
        inv.ref_prem = (inv.ref_prem || 0) + 1;
        lg('referido', 'Promoción regalada por ' + n + ' invitados (usuario #' + inv.id + ')');
        avs([
          [
            inv.id,
            'Ya se sumaron ' +
              n +
              ' personas con tu link: te regalamos una potenciación gratis. Usala desde Perfil o desde tus pedidos.' +
              (inv.ref_prem >= REF_MAX ? ' Llegaste al máximo de potenciaciones por invitar.' : ''),
          ],
        ]);
      } else
        avs([
          [
            inv.id,
            'Alguien se unió con tu link y empezó a usar Dicho y Hecho. Llevás ' +
              (n % REF_N) +
              ' de ' +
              REF_N +
              ' para tu potenciación gratis.',
          ],
        ]);
    };
    const primera = (u) => !!S.aj.primera_gratis && !S.act.some((a) => a.usuario_id === u.id && a.estado === 'activa');
    if (p[0] === 'yo') {
      const { pin, rec, resp, ref_por, ref_ok, ...x } = me;
      if (!me.ref_cod) {
        const AB = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
        me.ref_cod = Array.from({ length: 6 }, () => AB[Math.floor(Math.random() * AB.length)]).join('');
      }
      const pri = primera(me);
      return [
        200,
        {
          ...x,
          ref_cod: me.ref_cod,
          ref_n: S.users.filter((u) => u.ref_por === me.id && u.ref_ok && !u.suspendido).length,
          ref_de: REF_N,
          ref_max: REF_MAX,
          ref_prem: me.ref_prem || 0,
          primera: pri ? 1 : 0,
          gratis: (me.promos || 0) + (pri ? 1 : 0),
          prom: pr(me.id),
          n: rs(me.id).length,
          fv: S.pf[me.id] ? S.pf[me.id].k : null,
          av: S.avisos.filter((a) => a.usuario_id === me.id && !a.leido).length,
          falta: fl(),
          ver: me.dni && me.direccion && me.mail ? 1 : 0,
          alertas_act: (me.alertas_hasta || 0) > now ? 1 : 0,
          tel_pend: telPend ? 1 : 0,
        },
      ];
    }
    if (p[0] === 'perfil-foto') {
      if (b.borrar) {
        delete S.pf[me.id];
        return O;
      }
      if (!okjpg(b.foto, 150000)) return E('La foto no es válida o es muy pesada');
      S.pf[me.id] = { img: b.foto, k: rk() };
      refRev();
      return O;
    }
    if (p[0] === 'trabajos-fotos') {
      if (!tra) return E('Solo los trabajadores suben fotos de trabajos', 403);
      if (p[1] === 'borrar') {
        S.tf = S.tf.filter((x) => !(x.id === +b.id && x.usuario_id === me.id));
        return O;
      }
      if (!okjpg(b.foto, 250000)) return E('La foto no es válida o es muy pesada');
      if (S.tf.filter((x) => x.usuario_id === me.id).length >= 12)
        return E('Llegaste al máximo de 12 fotos. Borrá alguna para subir otra.');
      S.tf.push({ id: nid('t'), usuario_id: me.id, img: b.foto, k: rk() });
      return O;
    }
    if (p[0] === 'locales')
      return [
        200,
        S.loc
          .filter((l) => l.activo)
          .sort((a, b) => a.rubro.localeCompare(b.rubro) || a.nombre.localeCompare(b.nombre))
          .map(({ activo, ...l }) => l),
      ];
    if (p[0] === 'trabajadores' && p[1]) {
      const w = U(+p[1]);
      if (!w || w.tipo !== 'trabajador' || w.suspendido) return E('No existe', 404);
      return [
        200,
        {
          id: w.id,
          nombre: w.nombre,
          barrio: w.barrio,
          rubros: w.rubros,
          bio: w.bio,
          ver: w.dni && w.direccion && w.mail ? 1 : 0,
          fv: S.pf[w.id] ? S.pf[w.id].k : null,
          prom: pr(w.id),
          n: rs(w.id).length,
          fotos: S.tf
            .filter((x) => x.usuario_id === w.id)
            .reverse()
            .slice(0, 12)
            .map((x) => x.id + '.' + x.k),
          resenas: [...rs(w.id)]
            .reverse()
            .slice(0, 30)
            .map((x) => ({
              e: x.estrellas,
              c: x.comentario,
              f: x.creado,
              fo:
                S.rf
                  .filter((r) => r.puntuacion_id === x.id)
                  .map((r) => r.id + '.' + r.k)
                  .join(',') || null,
              quien: U(x.cliente_id).nombre.split(' ')[0],
              t: P(x.pedido_id).titulo,
            })),
        },
      ];
    }
    if (p[0] === 'avisos') {
      if (m === 'POST') {
        S.avisos.forEach((a) => {
          if (a.usuario_id === me.id) a.leido = 1;
        });
        return O;
      }
      return [
        200,
        S.avisos
          .filter((a) => a.usuario_id === me.id)
          .reverse()
          .slice(0, 30)
          .map(({ usuario_id, ...a }) => a),
      ];
    }
    if (p[0] === 'perfil') {
      const r0 = [...new Set((Array.isArray(b.rubros) ? b.rubros : []).filter((x) => RUBROS.includes(x)))];
      if (r0.length > 3) return E('Elegí hasta 3 rubros');
      if (!String(b.barrio || '').trim()) return E('Elegí tu barrio');
      if (tra && !r0.length) return E('Elegí al menos un rubro');
      const nm = NOM(b.nombre || me.nombre);
      if (!nm) return E('Poné tu nombre y apellido');
      const ml =
        b.mail === undefined
          ? me.mail
          : String(b.mail || '')
              .trim()
              .toLowerCase()
              .slice(0, 100);
      if (ml && !MAILRE.test(ml)) return E('El mail no es válido');
      Object.assign(me, {
        nombre: nm,
        barrio: String(b.barrio || '').slice(0, 40),
        rubros: JSON.stringify(r0),
        bio: String(b.bio || '').slice(0, 300),
        mail: ml || '',
      });
      refRev();
      return O;
    }
    if (p[0] === 'cuenta-borrar') {
      if (String(b.pin || '') !== me.pin) return E('El PIN no es correcto', 401);
      const id = me.id,
        res = new Set(S.punt.map((x) => x.pedido_id));
      S.pedidos
        .filter((c) => c.cliente_id === id)
        .forEach((c) => {
          S.fotos = S.fotos.filter((f) => f.pid !== c.id);
          S.post = S.post.filter((x) => x.pedido_id !== c.id);
          S.inv = S.inv.filter((x) => x.p !== c.id);
        });
      S.pedidos
        .filter((c) => c.cliente_id === id && res.has(c.id))
        .forEach((c) =>
          Object.assign(c, {
            titulo: 'Pedido eliminado',
            descripcion: '',
            presupuesto: '',
            oculta: 1,
            estado: 'cancelada',
          }),
        );
      S.pedidos = S.pedidos.filter((c) => c.cliente_id !== id || res.has(c.id));
      S.post = S.post.filter((x) => x.trabajador_id !== id);
      S.punt = S.punt.filter((x) => x.trabajador_id !== id);
      S.inv = S.inv.filter((x) => x.w !== id);
      delete S.pf[id];
      S.tf = S.tf.filter((x) => x.usuario_id !== id);
      S.avisos = S.avisos.filter((a) => a.usuario_id !== id);
      S.users.forEach((u) => {
        if (u.ref_por === id) u.ref_por = 0;
      });
      Object.keys(S.ses).forEach((t) => {
        if (S.ses[t] === id) delete S.ses[t];
      });
      Object.assign(me, {
        nombre: 'Cuenta eliminada',
        telefono: 'eliminada-' + id,
        pin: 'x' + Math.random(),
        rec: 'x' + Math.random(),
        barrio: '',
        rubros: '[]',
        bio: '',
        dni: '',
        direccion: '',
        mail: '',
        suspendido: 1,
        alertas_hasta: 0,
        ref_cod: '',
        ref_por: 0,
        promos: 0,
      });
      lg('cuenta', 'Cuenta eliminada por su dueño (#' + id + ', ' + me.tipo + ')');
      return O;
    }
    if (p[0] === 'verificacion') {
      const dni = String(b.dni || '').replace(/\D/g, ''),
        dir = String(b.direccion || '')
          .trim()
          .slice(0, 100),
        mail = String(b.mail || '')
          .trim()
          .toLowerCase()
          .slice(0, 100);
      if (dni && !/^\d{7,8}$/.test(dni)) return E('El DNI tiene 7 u 8 números');
      if (dir && dir.length < 5) return E('Poné la dirección completa (calle y número)');
      if (mail && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(mail)) return E('El mail no es válido');
      Object.assign(me, { dni, direccion: dir, mail });
      return [200, { ok: 1, ver: dni && dir && mail ? 1 : 0 }];
    }
    if (p[0] === 'potenciar' && m === 'POST') {
      const tp = b.tipo;
      if (!['destacado', 'alertas'].includes(tp)) return E('Pedido inválido');
      const g = pedirPerfil();
      if (g) return g;
      let pid = 0,
        tit = '';
      if (tp === 'alertas') {
        if (!tra) return E('Las alertas son para trabajadores', 403);
      } else {
        if (!cli) return E('Solo quien publica puede destacar un pedido', 403);
        const c = P(b.pedido_id);
        if (!c || c.cliente_id !== me.id) return E('No es tu pedido', 403);
        if (c.estado !== 'abierta' || c.vence < now) return E('Solo se pueden destacar pedidos abiertos');
        pid = c.id;
        tit = c.titulo;
      }
      const pri = primera(me),
        cr = !pri && (me.promos || 0) > 0;
      if (!pri && !cr)
        return E('No tenés potenciaciones disponibles. Podés ganar una invitando a otras personas.', 403);
      if (cr) me.promos--;
      const a = {
        id: nid('ac'),
        usuario_id: me.id,
        tipo: tp,
        pedido_id: pid,
        precio: 0,
        estado: 'pendiente',
        creado: now,
        activada_en: 0,
        vence: 0,
      };
      S.act.push(a);
      const er = ACT(a);
      if (er) {
        S.act.pop();
        if (cr) me.promos++;
        return E(er);
      }
      lg(
        'potenciacion',
        'Potenciación gratis (' +
          (pri ? 'primera' : 'por invitados') +
          ') #' +
          a.id +
          ' de ' +
          tp +
          ' de ' +
          me.nombre.slice(0, 30),
      );
      return [200, { id: a.id, gratis: 1, titulo: tit }];
    }
    if (p[0] === 'directorio') {
      if (!cli) return E('El directorio es para quienes buscan trabajadores', 403);
      const r = q.get('rubro') || '',
        ba = q.get('barrio') || '',
        vr = q.get('ver') === '1',
        mn = [4, 4.5].includes(+q.get('min')) ? +q.get('min') : 0,
        nm = (q.get('q') || '').trim().toLowerCase(),
        o = q.get('o');
      let l = S.users
        .filter(
          (u) =>
            u.tipo === 'trabajador' &&
            !u.suspendido &&
            S.pf[u.id] &&
            JSON.parse(u.rubros || '[]').length &&
            (!r || JSON.parse(u.rubros).includes(r)) &&
            (!ba || u.barrio === ba) &&
            (!vr || (u.dni && u.direccion && u.mail)) &&
            (!nm || u.nombre.toLowerCase().includes(nm)) &&
            (!mn || (pr(u.id) || 0) >= mn),
        )
        .map((u) => ({
          id: u.id,
          nombre: u.nombre,
          barrio: u.barrio,
          rubros: u.rubros,
          bio: (u.bio || '').slice(0, 140),
          ver: u.dni && u.direccion && u.mail ? 1 : 0,
          fv: S.pf[u.id].k,
          prom: pr(u.id),
          n: rs(u.id).length,
        }));
      l.sort(
        o === 'trabajos'
          ? (a, b) => b.n - a.n || (b.prom || 0) - (a.prom || 0)
          : o === 'nuevos'
            ? (a, b) => b.id - a.id
            : (a, b) => (b.prom || 0) - (a.prom || 0) || b.n - a.n,
      );
      const tot = l.length,
        pags = Math.max(1, Math.ceil(tot / 20)),
        pag = Math.min(Math.max(1, Math.floor(+q.get('pag')) || 1), pags);
      return [200, { items: l.slice((pag - 1) * 20, pag * 20), tot, pag, pags }];
    }
    if (p[0] === 'invitar' && m === 'POST') {
      if (!cli) return E('Solo quien publica puede invitar', 403);
      const g = pedirPerfil();
      if (g) return g;
      const c = P(b.pedido_id);
      if (!c || c.cliente_id !== me.id) return E('No es tu pedido', 403);
      if (c.estado !== 'abierta' || c.vence < now) return E('Solo podés invitar a un pedido abierto');
      const w = U(+b.trabajador_id);
      if (!w || w.tipo !== 'trabajador' || w.suspendido) return E('Ese trabajador no está disponible');
      if (S.post.some((x) => x.pedido_id === c.id && x.trabajador_id === w.id)) return E('Ya se postuló a este pedido');
      if (S.inv.some((x) => x.p === c.id && x.w === w.id)) return E('Ya lo invitaste a este pedido');
      if (S.lim.filter((x) => x.k === 'inv:' + me.id && x.t > now - DAY).length >= 10)
        return E('Hoy ya mandaste 10 invitaciones. Seguí mañana.', 429);
      S.lim.push({ k: 'inv:' + me.id, t: now });
      S.inv.push({ p: c.id, w: w.id });
      S.avisos.push({
        id: nid('av'),
        usuario_id: w.id,
        texto:
          me.nombre.split(' ')[0] + ' te invitó a postularte a «' + c.titulo.slice(0, 60) + '». Lo ves en Pedidos.',
        creado: now,
        leido: 0,
      });
      lg('invitacion', 'Pedido #' + c.id);
      return O;
    }
    if (p[0] === 'push') return /^https:\/\//.test(b.endpoint || '') ? O : E('Suscripción inválida');
    if (p[0] === 'denunciar') {
      S.den.push({
        id: nid('d'),
        autor_id: me.id,
        tipo: b.tipo === 'usuario' ? 'usuario' : 'pedido',
        objetivo_id: +b.id || 0,
        motivo: String(b.motivo || '').slice(0, 300),
        estado: 'abierta',
        creado: now,
      });
      lg('denuncia', (b.tipo === 'usuario' ? 'usuario' : 'pedido') + ' #' + (+b.id || 0));
      return O;
    }
    const mi = q.get('mis') === '1' && !q.get('rubro'),
      mr = JSON.parse(me.rubros || '[]');
    if (p[0] === 'mapa') {
      vencer();
      const r = {};
      S.pedidos
        .filter(
          (c) =>
            c.estado === 'abierta' &&
            c.barrio &&
            (!q.get('rubro') || c.rubro === q.get('rubro')) &&
            (!mi || mr.includes(c.rubro)),
        )
        .forEach((c) => (r[c.barrio] = (r[c.barrio] || 0) + 1));
      return [200, r];
    }
    if (p[0] === 'pedidos' && !p[1] && m === 'GET') {
      vencer();
      const r = q.get('rubro') || '',
        ba = (q.get('barrio') || '').toLowerCase();
      const qq = (q.get('q') || '').trim().toLowerCase(),
        o = q.get('o'),
        np = (c) => S.post.filter((x) => x.pedido_id === c.id && x.estado === 'activa').length,
        iv = (c) => (S.inv.some((x) => x.p === c.id && x.w === me.id) ? 1 : 0);
      const l = S.pedidos
        .filter(
          (c) =>
            c.estado === 'abierta' &&
            (!r || c.rubro === r) &&
            (!ba || c.barrio.toLowerCase().includes(ba)) &&
            (!mi || mr.includes(c.rubro)) &&
            (!qq || (c.titulo + ' ' + c.descripcion).toLowerCase().includes(qq)),
        )
        .map((c) => ({ c, s: mr.includes(c.rubro) ? 1 : 0, d: (c.dest_hasta || 0) > now ? 1 : 0, i: iv(c) }))
        .sort(
          (a, b) =>
            b.d - a.d ||
            (b.d ? b.c.dest_desde - a.c.dest_desde : 0) ||
            (o === 'vence'
              ? a.c.vence - b.c.vence
              : o === 'pocos'
                ? np(a.c) - np(b.c) || b.c.creado - a.c.creado
                : b.i - a.i || b.s - a.s || b.c.creado - a.c.creado),
        );
      const tot = l.length,
        pags = Math.max(1, Math.ceil(tot / 20)),
        pag = Math.min(Math.max(1, Math.floor(+q.get('pag')) || 1), pags);
      const items = l.slice((pag - 1) * 20, pag * 20).map(({ c, s }) => ({
        id: c.id,
        titulo: c.titulo,
        rubro: c.rubro,
        descripcion: c.descripcion,
        barrio: c.barrio,
        presupuesto: c.presupuesto,
        creado: c.creado,
        fotos: fs(c.id),
        n: S.post.filter((x) => x.pedido_id === c.id && x.estado === 'activa').length,
        ya: S.post.filter((x) => x.pedido_id === c.id && x.trabajador_id === me.id).length,
        suyo: s,
        inv: iv(c),
        dest: (c.dest_hasta || 0) > now ? 1 : 0,
        cid: c.cliente_id,
        cn: U(c.cliente_id).nombre.split(' ')[0],
        cfv: S.pf[c.cliente_id] ? S.pf[c.cliente_id].k : null,
        ver: U(c.cliente_id).dni && U(c.cliente_id).direccion && U(c.cliente_id).mail ? 1 : 0,
      }));
      const lo = S.aj.limite_otros,
        cupo = tra ? Math.max(0, lo - S.lim.filter((x) => x.k === 'otros:' + me.id && x.t > now - DAY).length) : null;
      return [200, { items, tot, pag, pags, cupo, lim: tra ? lo : 0 }];
    }
    if (p[0] === 'pedidos' && !p[1]) {
      if (!cli) return E('Solo los clientes publican', 403);
      const t = String(b.titulo || '').trim();
      if (t.length < 3 || !RUBROS.includes(b.rubro)) return E('Poné un título y elegí un rubro');
      {
        const g = pedirPerfil();
        if (g) return g;
      }
      if (S.pedidos.filter((c) => c.cliente_id === me.id && c.creado > now - DAY).length >= 5)
        return E('Llegaste al límite de 5 publicaciones por día');
      const id = nid('p');
      S.pedidos.push({
        id,
        cliente_id: me.id,
        titulo: t.slice(0, 80),
        rubro: b.rubro,
        descripcion: String(b.descripcion || '').slice(0, 1000),
        barrio: String(b.barrio || '').slice(0, 40),
        presupuesto:
          String(b.presupuesto || '')
            .trim()
            .slice(0, 40) || 'A convenir',
        estado: 'abierta',
        vence: now + 7 * DAY,
        creado: now,
        elegida_en: null,
        hecha_en: null,
        oculta: 0,
        dest_desde: 0,
        dest_hasta: 0,
        aviso_en: now + 45 * MIN,
        aviso_pend: 1,
      });
      addF(id, b.fotos);
      notif(P(id), now);
      refRev();
      return O;
    }
    if (p[0] === 'mis-pedidos') {
      vencer();
      const ps = S.post.filter((x) => x.estado !== 'descartada');
      return [
        200,
        S.pedidos
          .filter((c) => c.cliente_id === me.id && c.estado !== 'cancelada' && !c.oculta)
          .reverse()
          .slice(0, 50)
          .map((c) => ({
            ...c,
            ninv: S.inv.filter((x) => x.p === c.id).length,
            fotos: fs(c.id),
            punt: S.punt.some((x) => x.pedido_id === c.id) ? 1 : null,
            post: ps
              .filter((x) => x.pedido_id === c.id)
              .map((x) => {
                const u = U(x.trabajador_id);
                return {
                  id: x.id,
                  pedido_id: x.pedido_id,
                  mensaje: x.mensaje,
                  estado: x.estado,
                  creado: x.creado,
                  tid: u.id,
                  fv: S.pf[u.id] ? S.pf[u.id].k : null,
                  nombre: u.nombre,
                  barrio: u.barrio,
                  rubros: u.rubros,
                  ver: u.dni && u.direccion && u.mail ? 1 : 0,
                  tel: x.estado === 'elegida' ? u.telefono : null,
                  mail: x.estado === 'elegida' ? u.mail : null,
                  prom: pr(u.id),
                  n: S.post.filter(
                    (y) => y.trabajador_id === u.id && y.estado === 'elegida' && P(y.pedido_id).estado === 'hecha',
                  ).length,
                };
              }),
          })),
      ];
    }
    if (p[0] === 'mis-postulaciones') {
      vencer();
      return [
        200,
        S.post
          .filter((x) => x.trabajador_id === me.id && !x.oculta)
          .reverse()
          .slice(0, 50)
          .map((x) => {
            const c = P(x.pedido_id),
              cu = U(c.cliente_id);
            return {
              id: x.id,
              estado: x.estado,
              mensaje: x.mensaje,
              creado: x.creado,
              elegida_en: c.elegida_en,
              hecha_en: c.hecha_en,
              titulo: c.titulo,
              rubro: c.rubro,
              barrio: c.barrio,
              cestado: c.estado,
              tel: x.estado === 'elegida' ? cu.telefono : null,
              mail: x.estado === 'elegida' ? cu.mail : null,
              cliente: cu.nombre,
            };
          }),
      ];
    }
    if (p[0] === 'pedidos' && p[1]) {
      const c = P(p[1]);
      if (!c) return E('No existe', 404);
      if (p[2] === 'postular') {
        if (!tra) return E('Solo los trabajadores se postulan', 403);
        {
          const g = pedirPerfil();
          if (g) return g;
        }
        if (c.estado !== 'abierta' || c.vence < now) return E('Este pedido ya no está abierto');
        if (S.post.filter((x) => x.pedido_id === c.id && x.estado === 'activa').length >= 10)
          return E('Este pedido ya tiene 10 postulantes');
        const otro = !mr.includes(c.rubro),
          lo = S.aj.limite_otros;
        if (otro && S.lim.filter((x) => x.k === 'otros:' + me.id && x.t > now - DAY).length >= lo)
          return E(
            'Llegaste al límite de ' +
              lo +
              ' propuestas por día fuera de tus rubros. Probá mañana o cambiá tus rubros en el perfil.',
          );
        if (S.post.some((x) => x.pedido_id === c.id && x.trabajador_id === me.id))
          return E('Ya te postulaste a este pedido');
        S.post.push({
          id: nid('s'),
          pedido_id: c.id,
          trabajador_id: me.id,
          mensaje: String(b.mensaje || '').slice(0, 300),
          estado: 'activa',
          creado: now,
          oculta: 0,
        });
        if (otro) S.lim.push({ k: 'otros:' + me.id, t: now });
        avs([[c.cliente_id, me.nombre + ' se postuló a «' + c.titulo + '».']]);
        refRev();
        return O;
      }
      if (c.cliente_id !== me.id) return E('No es tu pedido', 403);
      if (p[2] === 'editar') {
        if (c.estado !== 'abierta') return E('Solo se puede editar un pedido abierto');
        const t = String(b.titulo || '').trim();
        if (t.length < 3 || !RUBROS.includes(b.rubro)) return E('Poné un título y elegí un rubro');
        Object.assign(c, {
          titulo: t.slice(0, 80),
          rubro: b.rubro,
          descripcion: String(b.descripcion || '').slice(0, 1000),
          barrio: String(b.barrio || '').slice(0, 40),
          presupuesto:
            String(b.presupuesto || '')
              .trim()
              .slice(0, 40) || 'A convenir',
        });
        avs(
          S.post
            .filter((x) => x.pedido_id === c.id && x.estado === 'activa')
            .map((x) => [
              x.trabajador_id,
              'El cliente modificó «' + t.slice(0, 80) + '». Revisá los cambios antes de que te elija.',
            ]),
        );
        return O;
      }
      if (p[2] === 'cancelar') {
        c.estado = 'cancelada';
        S.fotos = S.fotos.filter((f) => f.pid !== c.id);
        return O;
      }
      if (p[2] === 'eliminar') {
        if (!['vencida', 'hecha'].includes(c.estado))
          return E('Solo se pueden eliminar pedidos vencidos o terminados. Si está abierto, cancelalo.');
        c.oculta = 1;
        S.fotos = S.fotos.filter((f) => f.pid !== c.id);
        return O;
      }
      if (p[2] === 'renovar') {
        if (!['abierta', 'vencida'].includes(c.estado)) return E('No se puede renovar');
        c.estado = 'abierta';
        c.vence = now + 7 * DAY;
        addF(c.id, b.fotos);
        return O;
      }
      if (p[2] === 'hecha') {
        if (c.estado !== 'elegida') return E('Primero elegí a alguien');
        c.estado = 'hecha';
        c.hecha_en = now;
        const w = S.post.find((x) => x.pedido_id === c.id && x.estado === 'elegida');
        if (w)
          avs([[w.trabajador_id, '«' + c.titulo + '» quedó marcado como hecho. Ahora el cliente puede puntuarte.']]);
        return O;
      }
      if (p[2] === 'reabrir') {
        if (c.estado !== 'elegida') return E('No hay nada para reabrir');
        const w = S.post.find((x) => x.pedido_id === c.id && x.estado === 'elegida');
        if (w) {
          avs([[w.trabajador_id, 'El cliente reabrió «' + c.titulo + '» y ya no estás elegido para ese pedido.']]);
          w.estado = 'descartada';
        }
        c.estado = 'abierta';
        c.vence = now + 7 * DAY;
        c.elegida_en = null;
        c.hecha_en = null;
        return O;
      }
      if (p[2] === 'puntuar') {
        const e = Math.round(+b.estrellas);
        if (c.estado !== 'hecha' || !(e >= 1 && e <= 5)) return E('Puntaje de 1 a 5 en un pedido hecho');
        const w = S.post.find((x) => x.pedido_id === c.id && x.estado === 'elegida');
        if (!w) return E('No hay trabajador elegido');
        if (S.punt.some((x) => x.pedido_id === c.id)) return E('Ya puntuaste este pedido');
        const r = {
          id: nid('r'),
          pedido_id: c.id,
          trabajador_id: w.trabajador_id,
          cliente_id: me.id,
          estrellas: e,
          comentario: String(b.comentario || '').slice(0, 300),
          creado: now,
        };
        S.punt.push(r);
        (Array.isArray(b.fotos) ? b.fotos : []).slice(0, 3).forEach((f) => {
          if (okjpg(f, 250000)) S.rf.push({ id: nid('rf'), puntuacion_id: r.id, img: f, k: rk() });
        });
        avs([
          [
            w.trabajador_id,
            'Te puntuaron con ' +
              e +
              (e === 1 ? ' estrella' : ' estrellas') +
              ' por «' +
              c.titulo +
              '»' +
              (b.comentario ? ': ' + String(b.comentario).slice(0, 100) : '.'),
          ],
        ]);
        return O;
      }
    }
    if (p[0] === 'postulaciones') {
      if (p[1] === 'limpiar') {
        if (!tra) return E('Solo los trabajadores tienen propuestas', 403);
        vencer();
        S.post.forEach((x) => {
          if (
            x.trabajador_id === me.id &&
            (x.estado === 'descartada' || (x.estado === 'activa' && P(x.pedido_id).estado !== 'abierta'))
          )
            x.oculta = 1;
        });
        return O;
      }
      const x = S.post.find((y) => y.id === +p[1]);
      if (!x) return E('No encontrada', 404);
      const c = P(x.pedido_id);
      if (p[2] === 'retirar') {
        if (x.trabajador_id !== me.id) return E('No encontrada', 404);
        if (c.estado === 'hecha') return E('El pedido ya está terminado');
        S.post = S.post.filter((y) => y !== x);
        if (x.estado === 'elegida') {
          c.estado = 'abierta';
          c.vence = now + 7 * DAY;
          c.elegida_en = null;
          avs([[c.cliente_id, me.nombre + ' se retiró de «' + c.titulo + '» y el pedido volvió a estar abierto.']]);
        }
        return O;
      }
      if (p[2] === 'ocultar') {
        if (x.trabajador_id !== me.id) return E('No encontrada', 404);
        if (
          !(
            x.estado === 'descartada' ||
            (x.estado === 'activa' && c.estado !== 'abierta') ||
            (x.estado === 'elegida' && c.estado === 'hecha')
          )
        )
          return E('Esta propuesta sigue en juego. Si ya no querés, retirala.');
        x.oculta = 1;
        return O;
      }
      if (c.cliente_id !== me.id) return E('No encontrada', 404);
      if (p[2] === 'descartar') {
        if (x.estado !== 'descartada') {
          x.estado = 'descartada';
          avs([[x.trabajador_id, 'El cliente descartó tu propuesta a «' + c.titulo + '».']]);
        }
        return O;
      }
      if (p[2] === 'elegir') {
        if (c.estado !== 'abierta') return E('El pedido no está abierto');
        x.estado = 'elegida';
        c.estado = 'elegida';
        c.elegida_en = now;
        avs([
          [
            x.trabajador_id,
            '¡Te eligieron para «' + c.titulo + '»! Entrá a Propuestas y escribile al cliente por WhatsApp.',
          ],
        ]);
        return O;
      }
    }
    return E('No existe', 404);
  }
  const rf = window.fetch.bind(window);
  window.fetch = async (u, o = {}) => {
    if (typeof u !== 'string' || !u.startsWith('/api/')) return rf(u, o);
    const url = new URL(u, 'http://x');
    await new Promise((r) => setTimeout(r, 50));
    let b = {};
    try {
      b = o.body ? JSON.parse(o.body) : {};
    } catch (e) {}
    const h = {};
    Object.entries(o.headers || {}).forEach(([k, v]) => (h[k.toLowerCase()] = v));
    let r;
    try {
      r = route(o.method || 'GET', url.pathname.slice(5).split('/'), url.searchParams, b, h);
    } catch (e) {
      r = E('Error de la prueba: ' + e.message, 500);
    }
    save();
    return new Response(JSON.stringify(r[1]), { status: r[0], headers: { 'content-type': 'application/json' } });
  };
  // Fotos: la app pide /api/foto/ID.CLAVE; acá se reemplazan por la imagen guardada en memoria.
  const IMG = (el) => {
    const s = el.getAttribute && el.getAttribute('src');
    if (!s || !s.startsWith('/api/')) return;
    const m = s.match(/^\/api\/(foto|pfoto|rfoto|tfoto)\/([^?]+)(?:\?v=(.*))?$/);
    if (!m) return;
    let f;
    const [i, k] = m[1] === 'pfoto' ? [m[2], m[3]] : m[2].split('.');
    if (m[1] === 'foto') f = S.fotos.find((x) => x.id === +i && x.k === k);
    else if (m[1] === 'rfoto') f = S.rf.find((x) => x.id === +i && x.k === k);
    else if (m[1] === 'tfoto') f = S.tf.find((x) => x.id === +i && x.k === k);
    else f = S.pf[i] && S.pf[i].k === k ? S.pf[i] : null;
    if (f) el.setAttribute('src', f.img);
  };
  new MutationObserver((l) =>
    l.forEach((r) => {
      r.addedNodes.forEach((n) => {
        if (n.nodeType === 1) {
          if (n.tagName === 'IMG') IMG(n);
          n.querySelectorAll && n.querySelectorAll('img').forEach(IMG);
        }
      });
      if (r.type === 'attributes') IMG(r.target);
    }),
  ).observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['src'] });
  // Panel de prueba
  const css = 'position:fixed;z-index:9999;';
  window.addEventListener('DOMContentLoaded', () => {
    const B = document.createElement('button');
    B.innerHTML =
      '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#0259E0" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M9 3h6M10 3v6L4.5 19a1.5 1.5 0 0 0 1.3 2h12.4a1.5 1.5 0 0 0 1.3-2L14 9V3"/><path d="M7.5 15h9"/></svg>';
    B.setAttribute('aria-label', 'Panel de prueba');
    B.style.cssText =
      css +
      'right:128px;top:calc(env(safe-area-inset-top,0px) + 16px);width:38px;height:38px;border-radius:19px;border:1px solid rgba(128,128,128,.4);background:rgba(255,255,255,.9);font-size:20px;opacity:.85';
    const P = document.createElement('div');
    P.hidden = true;
    P.style.cssText =
      css +
      'left:10px;right:10px;top:calc(env(safe-area-inset-top,0px) + 62px);max-width:380px;padding:14px;border-radius:16px;background:#fff;color:#111;box-shadow:0 8px 30px rgba(0,0,0,.35);font:14px -apple-system,system-ui,sans-serif';
    const bt = (t, f) => {
      const b = document.createElement('button');
      b.textContent = t;
      b.style.cssText =
        'display:block;width:100%;margin:6px 0;padding:11px;border-radius:12px;border:0;background:#0259E0;color:#fff;font:600 14px inherit';
      b.onclick = () => {
        P.hidden = true;
        f();
      };
      P.appendChild(b);
    };
    const h = document.createElement('div');
    h.innerHTML =
      '<b>Versión de prueba</b><p style="margin:6px 0 4px;color:#555">Los datos son de ejemplo y viven solo en este navegador. PIN de las cuentas demo: <b>123456</b>. Clave de gestión: <b>clave</b>.</p>';
    P.appendChild(h);
    const as = (tel) => {
      const u = S.users.find((x) => x.telefono === tel),
        t = 'demo' + u.id;
      S.ses[t] = u.id;
      save();
      localStorage.setItem('t', t);
      location.hash = '';
      location.reload();
    };
    bt('Entrar como cliente (Ana)', () => as('2477000001'));
    bt('Entrar como trabajador (Beto)', () => as('2477000002'));
    bt('Ir a Gestión (/#gestion)', () => {
      location.hash = '#gestion';
      location.reload();
    });
    bt('Hacer vencer los pedidos abiertos de Ana', () => {
      S.pedidos.forEach((c) => {
        if (c.cliente_id === 1 && c.estado === 'abierta') c.vence = nowT() - 1000;
      });
      save();
      location.hash = '';
      location.reload();
    });
    bt('Cerrar sesión', () => {
      localStorage.removeItem('t');
      location.hash = '';
      location.reload();
    });
    bt('Reiniciar datos de prueba (borra lo que hiciste)', () => {
      localStorage.removeItem('prueba_db31');
      localStorage.removeItem('t');
      location.hash = '';
      location.reload();
    });
    B.onclick = () => {
      P.hidden = !P.hidden;
    };
    document.body.append(B, P);
  });

  // Legal en una ventana propia (en la prueba no hay otras páginas)
  document.addEventListener(
    'click',
    (e) => {
      const a = e.target.closest && e.target.closest('a[href^="legal.html"]');
      if (!a) return;
      e.preventDefault();
      const o = document.createElement('div');
      o.style.cssText = css + 'inset:0;background:#fff;display:flex;flex-direction:column';
      const hash = a.getAttribute('href').split('#')[1] || '';
      o.innerHTML =
        '<button style="margin:calc(env(safe-area-inset-top,0px) + 8px) 12px 8px auto;padding:8px 14px;border-radius:10px;border:0;background:#0259E0;color:#fff;font:600 14px sans-serif">Cerrar</button><iframe style="flex:1;border:0" srcdoc=""></iframe>';
      o.querySelector('iframe').srcdoc = window.__LEGAL__.replace(
        '<body>',
        '<body onload="' +
          (hash
            ? "document.getElementById('" + hash + "')&&document.getElementById('" + hash + "').scrollIntoView()"
            : '') +
          '">',
      );
      o.querySelector('button').onclick = () => o.remove();
      document.body.appendChild(o);
    },
    true,
  );
})();
