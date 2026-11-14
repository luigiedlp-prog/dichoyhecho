if (window.CFG && CFG.soporte)
  document.getElementById('ct').innerHTML =
    '¿Dudas o pedidos sobre tus datos? Escribinos por <a href="https://wa.me/' +
    CFG.soporte +
    '">WhatsApp</a>.';
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
