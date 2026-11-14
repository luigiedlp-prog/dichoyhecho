try {
  var t = localStorage.getItem('tema') || 'oscuro';
  document.documentElement.dataset.tema =
    t === 'oscuro' || (t === 'auto' && matchMedia('(prefers-color-scheme:dark)').matches) ? 'dark' : 'light';
} catch (e) {}
