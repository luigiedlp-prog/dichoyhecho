/* Errores, avisos (toast), sesión, formatos y el diálogo (dlg). Se carga como script común, en este orden (ver index.html); comparte las variables con los demás archivos de app/. */
// Si algo falla en el celular, se avisa a Gestión (máx. 5 distintos por visita)
let ERN = 0;
const ERV = new Set();
const repErr = (msg, src) => {
  msg = String(msg || '').slice(0, 300);
  if (ERN >= 5 || ERV.has(msg) || /ResizeObserver|Script error|Failed to fetch|NetworkError|Load failed/i.test(msg))
    return;
  ERN++;
  ERV.add(msg);
  try {
    fetch('/api/error', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: 'Bearer ' + (typeof T === 'string' ? T : '') },
      body: JSON.stringify({ msg, src: String(src || '').slice(0, 200), pag: location.pathname + location.hash }),
      keepalive: true,
    }).catch(() => {});
  } catch (e) {}
};
addEventListener('error', (e) => repErr(e.message, (e.filename || '').split('/').pop() + ':' + e.lineno));
addEventListener('unhandledrejection', (e) => repErr((e.reason && e.reason.message) || e.reason, 'promesa'));
function toast(m) {
  const t = $('#toast');
  t.textContent = m;
  t.classList.add('on');
  setTimeout(() => t.classList.remove('on'), 2800);
}
const go = async (f) => {
  try {
    await f();
  } catch (e) {
    toast(e.message);
  }
};
const login = (t) => {
  T = t;
  localStorage.setItem('t', t);
};
const SELLO = (() => {
  let d = '';
  for (let i = 0; i < 24; i++) {
    const a = (Math.PI * i) / 12,
      r = i % 2 ? 8.4 : 11.6;
    d += (i ? 'L' : 'M') + (12 + r * Math.sin(a)).toFixed(2) + ' ' + (12 - r * Math.cos(a)).toFixed(2);
  }
  return d + 'Z';
})();
const vb = (v) =>
  v
    ? `<svg class="ver" viewBox="0 0 24 24" role="img" aria-label="Verificado"><path d="${SELLO}" fill="#14b8a6" stroke="#14b8a6" stroke-width="1.4" stroke-linejoin="round"/><path d="M7.6 12.4l3 3 5.8-6.2" fill="none" stroke="#0b1f1d" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`
    : '';
const pe = (n) => '$' + Number(n).toLocaleString('es-AR');
const av = (id, v, n, c) =>
  v
    ? `<img class="${c}" src="/api/pfoto/${id}?v=${v}" alt="">`
    : `<span class="${c}">${esc((n || '?')[0].toUpperCase())}</span>`;
const fec = (t) => new Date(t).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' });
const fecD = (t) =>
  new Date(t - 3 * 36e5).toLocaleDateString('es-AR', { timeZone: 'UTC', day: 'numeric', month: 'long' }); // día en hora de Argentina
const fecH = (t) =>
  new Date(t).toLocaleString('es-AR', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
const compSq = (file) =>
  new Promise((res, rej) => {
    const i = new Image();
    i.onerror = () => rej(new Error('No pude leer la foto'));
    i.onload = () => {
      const s = Math.min(i.width, i.height),
        c = document.createElement('canvas');
      c.width = c.height = 320;
      c.getContext('2d').drawImage(i, (i.width - s) / 2, (i.height - s) / 2, s, s, 0, 0, 320, 320);
      res(c.toDataURL('image/jpeg', 0.75));
    };
    i.src = URL.createObjectURL(file);
  });
const fld = (f) =>
  f.h
    ? f.h
    : (f.lb ? `<label class="lb" for="d_${f.id}">${esc(f.lb)}</label>` : '') +
      (f.opts
        ? `<select id="d_${f.id}">${f.opts.map((o) => `<option value="${esc(o[0])}"${o[0] === f.val ? ' selected' : ''}>${esc(o[1])}</option>`).join('')}</select>`
        : f.area
          ? `<textarea id="d_${f.id}" maxlength="${f.max || 300}" placeholder="${esc(f.ph || '')}">${esc(f.val || '')}</textarea>`
          : `<input id="d_${f.id}" type="${f.type || 'text'}" ${f.mode ? `inputmode="${f.mode}" ` : ''}maxlength="${f.max || 60}" placeholder="${esc(f.ph || '')}" value="${esc(f.val || '')}">`);
// Pantalla emergente con el estilo de la app. Devuelve los valores, o null si cancelan.
let DLGN = 0;
// confirmaciones que borran, quitan o cancelan algo: el botón sale en rojo
const DLG_DN = /^(s[ií], )?(borr|elimin|quit|retir|cancel|descart)|para siempre/i;
function dlg(o) {
  return new Promise((res) => {
    const m = $('#md'),
      F = o.f || [];
    let e = 0;
    DLGN++;
    m.classList.remove('out');
    m.innerHTML = `<div class="sh" role="dialog" aria-modal="true" aria-label="${esc(o.t)}"><h2>${esc(o.t)}</h2>${o.p ? `<p class="s">${esc(o.p)}</p>` : ''}${o.h || ''}${o.est ? '<div class="stars" id="d_st">' + [1, 2, 3, 4, 5].map((n) => `<button type="button" data-n="${n}" aria-label="${n} de 5">${STAR}</button>`).join('') + '</div>' : ''}${F.map(fld).join('')}<p class="er" id="d_er" role="alert"></p>${o.solo ? '' : `<button class="btn${o.dn || DLG_DN.test(o.ok || '') ? ' dn' : ''}" id="d_ok">${esc(o.ok || 'Aceptar')}</button>`}<button class="btn g" id="d_no">${o.solo ? 'Cerrar' : 'Cancelar'}</button></div>`;
    m.classList.add('on');
    const kd = (ev) => {
      if (ev.key === 'Escape') fin(null);
    };
    const fin = (v) => {
      document.removeEventListener('keydown', kd);
      const id = ++DLGN;
      m.classList.add('out');
      setTimeout(() => {
        if (id === DLGN) {
          m.classList.remove('on', 'out');
          m.innerHTML = '';
        }
      }, 230);
      res(v);
    };
    document.addEventListener('keydown', kd);
    m.onclick = (ev) => {
      if (ev.target === m) fin(null);
    };
    m.querySelectorAll('#d_st button').forEach(
      (b) =>
        (b.onclick = () => {
          e = +b.dataset.n;
          m.querySelectorAll('#d_st button').forEach((x) => x.classList.toggle('on', +x.dataset.n <= e));
        }),
    );
    $('#d_no').onclick = () => fin(null);
    const ok = $('#d_ok');
    if (ok)
      ok.onclick = async () => {
        const v = {
          e,
          files: [...(m.querySelector('#d_fo')?.files || [])],
          rb: [...m.querySelectorAll('.rb:checked')].map((x) => x.value),
        };
        F.forEach((f) => {
          if (f.id) v[f.id] = val('d_' + f.id);
        });
        ok.disabled = true;
        let er = '';
        try {
          er = o.v ? await o.v(v) : '';
        } catch (x) {
          er = x.message || 'Error';
        }
        ok.disabled = false;
        if (er) {
          $('#d_er').textContent = er;
          return;
        }
        fin(v);
      };
    (m.querySelector('input,textarea') || $('#d_no')).focus();
    if (o.on) o.on(m, fin);
  });
}
