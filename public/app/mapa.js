/* Mapa de barrios con zoom. Se carga como script común, en este orden (ver index.html); comparte las variables con los demás archivos de app/. */
// Mapa de barrios con zoom real: pellizcar, arrastrar, rueda, doble toque y botones. Cada zona se pinta más oscura cuanto más pedidos abiertos tiene.
const MV = MAPA_VB.split(' ').map(Number);
const mapaSvg = () => {
  const { cnt, sel } = MZ,
    mx = Math.max(1, ...Object.values(cnt)),
    ps = Object.entries(MAPA).sort((a, b) => (a[0] === sel) - (b[0] === sel)),
    rk = {},
    pl = Math.min(60, 900 / Math.max(1, ps.length));
  Object.keys(MAPA)
    .sort((a, b) => (cnt[a] || 0) - (cnt[b] || 0))
    .forEach((b, i) => (rk[b] = Math.round(i * pl)));
  return (
    `<svg viewBox="${MAPA_VB}" class="mapa${MZ.ent ? ' ent' : ''}" role="group" aria-label="Mapa de barrios de Pergamino">` +
    ps
      .map(([b, m]) => {
        const n = cnt[b] || 0,
          hot = n >= 2 && n >= mx * 0.7;
        return `<path d="${m.d}" data-a="mz" data-b="${esc(b)}" class="${b === sel ? 'sel' : ''}${n ? '' : ' z0'}${hot ? ' hot' : ''}" style="${n ? `--fo:${(0.22 + (0.78 * n) / mx).toFixed(2)};fill-opacity:var(--fo);` : ''}--d:${rk[b]}ms" tabindex="0" role="button" aria-label="${esc(b)}: ${n} ${n === 1 ? 'pedido' : 'pedidos'}"/>`;
      })
      .join('') +
    (MZ.glow && sel && MAPA[sel] ? `<path class="gl" d="${MAPA[sel].d}"/>` : '') +
    Object.entries(MAPA)
      .map(([b, m]) => `<text x="${m.x}" y="${m.y}" class="mnm">${esc(b)}</text>`)
      .join('') +
    '</svg>'
  );
};
// Aplica el zoom (MZ.k, de 1 a 8) y el centro (MZ.cx, MZ.cy) al viewBox, sin salirse del mapa
const mapaVista = () => {
  const w = $('#mpw'),
    sv = w && w.firstElementChild,
    W = w ? w.clientWidth : 0,
    H = w ? w.clientHeight : 0;
  if (!sv || !W || !H) return;
  const s = Math.min(W / MV[2], H / MV[3]) * MZ.k,
    vw = W / s,
    vh = H / s,
    cl = (c, v, o, t) => (v >= t ? o + t / 2 : Math.min(o + t - v / 2, Math.max(o + v / 2, c)));
  MZ.cx = cl(MZ.cx, vw, MV[0], MV[2]);
  MZ.cy = cl(MZ.cy, vh, MV[1], MV[3]);
  sv.setAttribute('viewBox', `${MZ.cx - vw / 2} ${MZ.cy - vh / 2} ${vw} ${vh}`);
  sv.style.setProperty('--fs', 13 / s + 'px');
  sv.classList.toggle('zl', MZ.k >= 1.8);
  sv.querySelectorAll('.dot').forEach((c) => c.setAttribute('r', 4.5 / s));
  document.querySelectorAll('.mzc').forEach((b) => {
    b.disabled = (b.dataset.z === 'in' && MZ.k >= 8) || (b.dataset.z !== 'in' && MZ.k <= 1.001);
  });
};
const MRM = () => window.matchMedia && matchMedia('(prefers-reduced-motion:reduce)').matches;
// Destino de un zoom hacia un punto de la pantalla: [k, cx, cy]
const mapaMeta = (k2, px, py) => {
  const w = $('#mpw'),
    W = w.clientWidth,
    H = w.clientHeight,
    s0 = Math.min(W / MV[2], H / MV[3]),
    s = s0 * MZ.k;
  k2 = Math.min(8, Math.max(1, k2));
  const s2 = s0 * k2,
    ux = MZ.cx - W / s / 2 + px / s,
    uy = MZ.cy - H / s / 2 + py / s;
  return [k2, ux - px / s2 + W / s2 / 2, uy - py / s2 + H / s2 / 2];
};
const mapaCl = (k, cx, cy) => {
  const w = $('#mpw'),
    W = w.clientWidth,
    H = w.clientHeight,
    s = Math.min(W / MV[2], H / MV[3]) * k,
    vw = W / s,
    vh = H / s,
    cl = (c, v, o, t) => (v >= t ? o + t / 2 : Math.min(o + t - v / 2, Math.max(o + v / 2, c)));
  return [k, cl(cx, vw, MV[0], MV[2]), cl(cy, vh, MV[1], MV[3])];
};
const mapaZoom = (k2, px, py) => {
  const w = $('#mpw');
  if (!w) return;
  [MZ.k, MZ.cx, MZ.cy] = mapaMeta(k2, px, py);
  mapaVista();
};
// Lleva el mapa suavemente al zoom y centro indicados (el centro se mueve en 1/zoom, así el punto tocado se queda quieto al acercar)
const mapaAnim = (k2, cx2, cy2, ms = 340) => {
  const w = $('#mpw');
  if (!w) return;
  cancelAnimationFrame(MZ.raf);
  [k2, cx2, cy2] = mapaCl(k2, cx2, cy2);
  const k0 = MZ.k,
    x0 = MZ.cx,
    y0 = MZ.cy;
  if (MRM() || !ms) {
    MZ.k = k2;
    MZ.cx = cx2;
    MZ.cy = cy2;
    mapaVista();
    return;
  }
  const u0 = 1 / k0,
    u1 = 1 / k2,
    t0 = performance.now(),
    paso = (t) => {
      if (!$('#mpw')) return;
      const p = Math.min(1, (t - t0) / ms),
        e = 1 - Math.pow(1 - p, 3),
        k = k0 * Math.pow(k2 / k0, e),
        f = Math.abs(u1 - u0) < 1e-6 ? e : (1 / k - u0) / (u1 - u0);
      MZ.k = k;
      MZ.cx = x0 + (cx2 - x0) * f;
      MZ.cy = y0 + (cy2 - y0) * f;
      mapaVista();
      if (p < 1) MZ.raf = requestAnimationFrame(paso);
    };
  MZ.raf = requestAnimationFrame(paso);
};
const mapaZoomA = (k2, px, py) => {
  if (!$('#mpw')) return;
  mapaAnim(...mapaMeta(k2, px, py));
};
// Acerca el mapa al barrio elegido (o vuelve a la vista completa si se quitó la selección)
const mapaFoco = (b) => {
  const w = $('#mpw');
  if (!w) return;
  if (!b) {
    mapaAnim(1, MV[0] + MV[2] / 2, MV[1] + MV[3] / 2);
    return;
  }
  const p = [...w.querySelectorAll('path[data-b]')].find((x) => x.dataset.b === b);
  if (!p || !p.getBBox) return;
  const r = p.getBBox(),
    W = w.clientWidth,
    H = w.clientHeight,
    s0 = Math.min(W / MV[2], H / MV[3]),
    k = Math.min(
      6,
      Math.max(1.5, Math.min((0.6 * W) / (Math.max(r.width, 1) * s0), (0.6 * H) / (Math.max(r.height, 1) * s0))),
    );
  mapaAnim(k, r.x + r.width / 2, r.y + r.height / 2, 420);
};
// Un puntito por pedido, repartidos de forma fija dentro de cada barrio
const mapaPuntos = () => {
  const w = $('#mpw'),
    sv = w && w.firstElementChild;
  if (!sv || !sv.createSVGPoint) return;
  const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  g.setAttribute('class', 'dots');
  let i = 0,
    o = '';
  [...sv.querySelectorAll('path[data-b]')].forEach((p) => {
    const n = Math.min(10, MZ.cnt[p.dataset.b] || 0);
    if (!n || !p.getBBox || !p.isPointInFill) return;
    const r = p.getBBox();
    let h = 0;
    for (const c of p.dataset.b) h = (h * 31 + c.charCodeAt(0)) >>> 0;
    const rnd = () => (h = (h * 1664525 + 1013904223) >>> 0) / 4294967296;
    let ok = 0,
      t = 0;
    while (ok < n && t < 400) {
      t++;
      const pt = sv.createSVGPoint();
      pt.x = r.x + rnd() * r.width;
      pt.y = r.y + rnd() * r.height;
      if (p.isPointInFill(pt)) {
        o += `<circle class="dot" cx="${pt.x.toFixed(1)}" cy="${pt.y.toFixed(1)}" r="4" style="--di:${i++}"/>`;
        ok++;
      }
    }
  });
  g.innerHTML = o;
  const tx = sv.querySelector('.mnm');
  sv.insertBefore(g, tx || null);
  mapaVista();
};
// El número cuenta hacia arriba desde 0 (al abrir el mapa y cada vez que cambia el barrio)
const mapaConta = (n) => {
  const e = $('#mcn');
  if (!e) return;
  cancelAnimationFrame(MZ.rc);
  const a = MZ.shown === n ? n : 0;
  MZ.shown = n;
  if (a === n || MRM()) {
    e.textContent = n;
    return;
  }
  const t0 = performance.now(),
    ms = Math.min(900, 380 + Math.abs(n - a) * 40),
    f = (t) => {
      const p = Math.min(1, (t - t0) / ms);
      e.textContent = Math.round(a + (n - a) * (1 - Math.pow(1 - p, 3)));
      if (p < 1 && $('#mcn') === e) MZ.rc = requestAnimationFrame(f);
    };
  e.textContent = a;
  MZ.rc = requestAnimationFrame(f);
};
const mapaMover = (dx, dy) => {
  const w = $('#mpw');
  if (!w) return;
  const s = Math.min(w.clientWidth / MV[2], w.clientHeight / MV[3]) * MZ.k;
  MZ.cx -= dx / s;
  MZ.cy -= dy / s;
  mapaVista();
};
const mapaGestos = (w) => {
  const P = new Map();
  let d0 = 1,
    k0 = 1,
    pm = null,
    mv = 0,
    last = 0,
    lx = 0,
    ly = 0;
  const pos = (e) => {
      const r = w.getBoundingClientRect();
      return [e.clientX - r.left, e.clientY - r.top];
    },
    two = () => {
      const [a, b] = [...P.values()];
      return { d: Math.hypot(a[0] - b[0], a[1] - b[1]) || 1, x: (a[0] + b[0]) / 2, y: (a[1] + b[1]) / 2 };
    };
  w.addEventListener('pointerdown', (e) => {
    cancelAnimationFrame(MZ.raf);
    if (e.isPrimary) P.clear();
    const [x, y] = pos(e);
    P.set(e.pointerId, [x, y, x, y]);
    if (P.size === 1) mv = 0;
    if (P.size === 2) {
      const t = two();
      d0 = t.d;
      k0 = MZ.k;
      pm = [t.x, t.y];
      mv = 1;
    }
  });
  w.addEventListener('pointermove', (e) => {
    const o = P.get(e.pointerId);
    if (!o) return;
    const [x, y] = pos(e);
    if (P.size >= 2) {
      o[0] = x;
      o[1] = y;
      const t = two();
      mapaMover(t.x - pm[0], t.y - pm[1]);
      pm = [t.x, t.y];
      mapaZoom((k0 * t.d) / d0, t.x, t.y);
      return;
    }
    if (!mv && Math.hypot(x - o[2], y - o[3]) < 6) return;
    if (!mv) {
      mv = 1;
      try {
        w.setPointerCapture(e.pointerId);
      } catch {}
      w.classList.add('mov');
    }
    mapaMover(x - o[0], y - o[1]);
    o[0] = x;
    o[1] = y;
  });
  const up = (e) => {
    const o = P.get(e.pointerId);
    if (!o) return;
    P.delete(e.pointerId);
    if (P.size === 0) {
      w.classList.remove('mov');
      MZ.mv = mv;
      setTimeout(() => {
        MZ.mv = 0;
      }, 60);
      if (!mv && e.type === 'pointerup') {
        const [x, y] = pos(e),
          n = Date.now();
        if (n - last < 320 && Math.hypot(x - lx, y - ly) < 28) {
          mapaZoomA(MZ.k >= 3 ? 1 : MZ.k * 2, x, y);
          last = 0;
        } else {
          last = n;
          lx = x;
          ly = y;
        }
      }
    } else if (P.size === 1) {
      const r = [...P.values()][0];
      r[2] = r[0];
      r[3] = r[1];
      mv = 1;
    }
  };
  w.addEventListener('pointerup', up);
  w.addEventListener('pointercancel', up);
  w.addEventListener(
    'wheel',
    (e) => {
      e.preventDefault();
      cancelAnimationFrame(MZ.raf);
      const [x, y] = pos(e);
      mapaZoom(MZ.k * Math.exp(-e.deltaY * (e.ctrlKey ? 0.012 : 0.002)), x, y);
    },
    { passive: false },
  );
};
const mapaDib = () => {
  const w = $('#mpw');
  if (!w) return;
  w.innerHTML = mapaSvg();
  const t = Object.values(MZ.cnt).reduce((a, b) => a + b, 0),
    n = MZ.sel ? MZ.cnt[MZ.sel] || 0 : t,
    ab = n === 1 ? 'pedido abierto' : 'pedidos abiertos';
  $('#mc').innerHTML =
    (MZ.sel ? `<b>${esc(MZ.sel)}</b> · ` : 'Todos los barrios · ') + `<span id="mcn">${MZ.shown || 0}</span> ${ab}`;
  mapaVista();
  mapaConta(n);
  mapaPuntos();
  MZ.ent = 0;
  MZ.glow = 0;
};
