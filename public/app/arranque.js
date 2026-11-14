/* Atrás seguro, actualización de la app y marca. Se carga como script común, en este orden (ver index.html); comparte las variables con los demás archivos de app/. */
/* Seguro para salir: el botón Atrás (o el gesto de volver) no cierra la app sin preguntar.
   La entrada de abajo del historial se marca {ct:0} y se deja una "trampa" {ct:1} arriba. Al volver sobre la base se pregunta;
   si se queda, se vuelve a armar. Si hay un diálogo abierto, Atrás lo cierra en vez de preguntar. Funciona también después de recargar. */
(() => {
  let pregunta = false;
  const armar = () => {
    try {
      history.pushState({ ct: 1 }, '', location.href);
    } catch (e) {}
  };
  const preguntar = async () => {
    if (pregunta) return;
    pregunta = true;
    const r = await dlg({
      t: '¿Salir de Dicho y Hecho?',
      p: 'Tu sesión queda abierta: cuando vuelvas, seguís donde estabas.',
      ok: 'Sí, salir',
    });
    pregunta = false;
    if (r) {
      window.__saliendo = 1;
      history.back();
      setTimeout(() => {
        try {
          window.close();
        } catch (e) {}
      }, 150);
    } else armar();
  };
  addEventListener('popstate', () => {
    if (pregunta) return;
    const m = $('#md');
    if (m && m.classList.contains('on')) {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      armar();
      return;
    }
    preguntar();
  });
  const st = history.state || {},
    nv = ((performance.getEntriesByType && performance.getEntriesByType('navigation')[0]) || {}).type;
  if (st.ct === 1) {
    /* se recargó sobre la entrada de arriba: ya está armado */
  } else if (st.ct === 0 && nv === 'back_forward')
    preguntar(); /* se llegó a la base apretando Atrás después de una recarga */
  else {
    try {
      history.replaceState({ ct: 0 }, '', location.href);
    } catch (e) {}
    armar();
  }
})();
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
// Si llega una versión nueva de la app, se recarga sola cuando la pasás a segundo plano (así no se pierde lo que estés escribiendo)
if ('serviceWorker' in navigator) {
  const had = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!had) return;
    const r = () => location.reload();
    if (document.hidden) r();
    else
      document.addEventListener(
        'visibilitychange',
        () => {
          if (document.hidden) r();
        },
        { once: true },
      );
  });
}
init();
/* marca: el nombre Dicho y Hecho se muestra siempre con la fuente de marca */
(() => {
  const RX = /dicho ?y ?hecho/gi,
    SK = { SCRIPT: 1, STYLE: 1, TEXTAREA: 1, INPUT: 1, TITLE: 1, OPTION: 1 };
  function marca(n) {
    if (n.nodeType === 3) {
      const p = n.parentNode;
      if (!p || SK[p.nodeName] || (p.closest && p.closest('.mk,.wm'))) return;
      const t = n.nodeValue;
      RX.lastIndex = 0;
      if (!RX.test(t)) return;
      RX.lastIndex = 0;
      const fr = document.createDocumentFragment();
      let i = 0,
        m;
      while ((m = RX.exec(t))) {
        if (m.index > i) fr.append(t.slice(i, m.index));
        const s = document.createElement('span');
        s.className = 'mk';
        s.textContent = m[0];
        fr.append(s);
        i = m.index + m[0].length;
      }
      if (i < t.length) fr.append(t.slice(i));
      p.replaceChild(fr, n);
      return;
    }
    if (n.nodeType !== 1 || SK[n.nodeName]) return;
    Array.from(n.childNodes).forEach(marca);
  }
  const mo = new MutationObserver((ms) => {
    mo.disconnect();
    ms.forEach((m) => m.addedNodes.forEach(marca));
    on();
  });
  function on() {
    mo.observe(document.body, { childList: true, subtree: true });
  }
  marca(document.body);
  on();
})();
