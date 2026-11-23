/* Reglas compartidas de Dicho y Hecho.
   Las usan la app (public/app.js), el Worker (src/) y el servidor simulado de la página de prueba.
   Cambiar una regla acá la cambia en los tres lugares. Funciona como script común (window.REGLAS) y como módulo (import). */
(function (g, fabrica) {
  const R = fabrica();
  if (typeof module === 'object' && module.exports) module.exports = R;
  else g.REGLAS = R;
})(globalThis, function () {
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
    'Reparación de celulares',
    'Lavadero y estética vehicular',
    'Clases y cuidados',
    'Publicidad y diseño',
    'Otros',
  ];

  // PIN: 6 números. El Worker lo valida igual.
  const PIN = /^\d{6}$/;
  const errPin = (p, nuevo) =>
    PIN.test(p || '') ? '' : nuevo ? 'El PIN nuevo tiene 6 números' : 'El PIN tiene 6 números';

  // Teléfono: se acepta como lo escriba la persona (con 0, con 15, +54 9, espacios, guiones)
  // y queda solo código de área + número.
  const TEL_MIN = 8,
    TEL_MAX = 13;
  const limpiarTel = (s) => {
    let d = String(s || '').replace(/\D/g, '');
    if (/^00/.test(d)) d = d.slice(2);
    if (/^54/.test(d) && d.length >= 12) {
      d = d.slice(2);
      if (/^9/.test(d) && d.length === 11) d = d.slice(1);
    }
    d = d.replace(/^0+/, '');
    if (d.length === 12)
      for (const i of [2, 3, 4])
        if (d.slice(i, i + 2) === '15') {
          d = d.slice(0, i) + d.slice(i + 2);
          break;
        }
    return d;
  };
  const telValido = (t) => t.length >= TEL_MIN && t.length <= TEL_MAX;

  // Nombre y apellido: solo letras (con tildes, ñ, ü). Dentro de una palabra se aceptan ' y - entre letras (D'Angelo, María-José).
  // Al menos dos palabras (la primera y la última de 2 letras o más), hasta 6. Devuelve el nombre limpio, o "" si no sirve.
  const PALABRA = /^[\p{L}\p{M}]+(?:['’-][\p{L}\p{M}]+)*$/u;
  const nombre = (n) => {
    const w = String(n || '')
      .normalize('NFC')
      .trim()
      .replace(/\s+/g, ' ')
      .split(' ');
    return w.length >= 2 &&
      w.length <= 6 &&
      w[0].length >= 2 &&
      w[w.length - 1].length >= 2 &&
      w.every((x) => PALABRA.test(x))
      ? w.join(' ').slice(0, 60)
      : '';
  };

  const MAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  const mailOk = (m) => !m || MAIL.test(m);

  // Pregunta de seguridad: se elige de esta lista. El Worker también la usa
  // para mostrar una pregunta a los teléfonos que no existen, así no se sabe quién está registrado.
  const PREGUNTAS = [
    '¿Cómo se llamaba tu primera mascota?',
    '¿En qué calle vivías de chico?',
    '¿Cómo se llamaba tu escuela primaria?',
    '¿Cuál era tu comida preferida de chico?',
    '¿Cuál fue tu primer trabajo?',
    '¿Cómo se llama tu mejor amigo de la infancia?',
    '¿Cuál fue tu primer auto, moto o bici?',
  ];
  const preg = (s) => {
    const t = String(s || '')
      .trim()
      .replace(/\s+/g, ' ');
    return t.length >= 10 && t.length <= 80 ? t : '';
  };

  // La respuesta no distingue mayúsculas, tildes, espacios ni signos.
  const NR = (s) =>
    String(s || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '');
  const RESP_MIN = 8,
    RESP_MAX = 60;
  // Devuelve el motivo si la respuesta no sirve, o "" si está bien. "pregunta" es el texto de la pregunta elegida.
  const errRespuesta = (r, pregunta) => {
    const n = NR(r);
    if (n.length < RESP_MIN || String(r || '').length > RESP_MAX)
      return 'La respuesta tiene que tener al menos ' + RESP_MIN + ' letras o números';
    if (new Set(n).size <= 2) return 'Esa respuesta es muy fácil de adivinar. Probá con otra';
    if (pregunta && NR(pregunta).includes(n)) return 'La respuesta no puede estar escrita en la pregunta';
    return '';
  };

  return {
    RUBROS,
    PIN,
    errPin,
    limpiarTel,
    telValido,
    TEL_MIN,
    TEL_MAX,
    nombre,
    MAIL,
    mailOk,
    PREGUNTAS,
    preg,
    NR,
    RESP_MIN,
    RESP_MAX,
    errRespuesta,
  };
});
