try {
  var t = localStorage.getItem('tema') || 'oscuro';
  if (t === 'oscuro' || (t === 'auto' && matchMedia('(prefers-color-scheme:dark)').matches))
    document.documentElement.dataset.tema = 'dark';
} catch (e) {}
