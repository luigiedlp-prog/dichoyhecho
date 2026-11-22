# Rediseño v82 · Dicho y Hecho

- Nombre nuevo "Dicho y Hecho" en toda la app, avisos, legal, manifest y pruebas. Se dejaron igual los identificadores técnicos (cercatuyo en wrangler.toml, package.json y og-cercatuyo.png) para no romper el despliegue ni la D1.
- Paleta: fondo #111827, tarjetas #1F2937, acento #14B8A6, coral #FB7185. (los estilos del rediseño viven al final de `public/app.css`).
- Inicio con foto de la plaza de Pergamino (`public/img/hero-iglesia.webp`), banner con foto (`public/img/trabajador.webp`), rubros fijos + "Más", Destacados con datos reales y menú con Publicar al centro.
- `sw.js` en ct-v82 y con las imágenes nuevas. `ajustes-visuales.css` vaciado.

# v83 · Modelo gratuito

- Se sacaron precios, pago por WhatsApp, promo de lanzamiento y el cobro en Gestión. `pagos/solicitar` pasó a `potenciar` y no cobra.
- Gestión: pestaña Potenciaciones (historial sin precios) y sin ingresos ni pagos pendientes.
- `legal.html` reescrito: todo gratis, publicidad de terceros y anuncios recompensados, datos de publicidad, responsabilidades, actividades reguladas, denuncias y apelaciones, derechos del consumidor. Se arregló `legal.js`.
- `sw.js` en ct-v83. Pruebas del Worker y de pantallas actualizadas.
- Pendiente: integrar anuncios recompensados.

# v84 · Logo nuevo y eslogan

- Eslogan: "Alguien lo necesita. Alguien lo hace." en título, metas, manifest, portada, inicio, compartir y pruebas.
- Logo nuevo (persona coral con gorra y caja verde petróleo sobre carbón): `logo-original.png`, favicon, íconos 192/512, maskable, apple-touch-icon, los 14 splash de iOS y la vista previa (`og-cercatuyo.png`).
- Paleta: tilde de verificado y ícono de locales en verde petróleo; `legal.html` con fondo #111827, links y títulos verde petróleo y abre oscuro como la app.
- Inicio: degradé más fuerte sobre la foto y eslogan en dos líneas. Modo claro: portada con textos legibles.
- `sw.js` en ct-v84.
- Fuente Righteous agregada (`fonts/righteous.woff` + licencia OFL), cacheada en `sw.js` y precargada.
- `rediseno.css` desapareció: su contenido pasó a `app.css` (bloque "Rediseño" al final), se sacó del `index.html`, de `sw.js` y de `tools/prueba/armar.py`. Se comparó contra la v84 anterior en celu y PC y se ve igual.
- Pendiente: dentro de `app.css` quedan reglas viejas (azul y amarillo) que el bloque "Rediseño" pisa; falta borrarlas.
- Más coral: es el color de acción y de marca. Botones principales, botón central "Publicar", banner "Publicá tu pedido", barrita de las tarjetas, barritas de sección, menú activo, "Hecho" del nombre y "Alguien lo hace." van en coral. El verde petróleo queda para íconos, filtros, estados, verificado y "¿Cómo llegar?". "Retirar propuesta" es gris con texto coral. Variables nuevas: `--rd-coral-ink` y `--rd-on-coral`.
- Inicio del cliente (Mis pedidos): se sacó "Destacados en Pergamino" (y la tarjeta chica `wkc` con su CSS). Directorio: los rubros pasaron de chips con scroll lateral a un desplegable "Todos los rubros", al lado del de barrios (`data-a="drubs"`).

# v85 · Escritorio (PC)

- Desde 1100 px de ancho el cliente ve el layout de escritorio del mockup: menú lateral fijo (Inicio, Mis pedidos, Locales, Perfil, Configuración, Ayuda, tarjeta "Alcanza tus objetivos" y cuenta), barra superior con buscador (lleva al Directorio con lo escrito) y un Inicio tipo panel: portada con la plaza, "Tus pedidos" (3 tarjetas con paso x de 4), "Explorá por categoría", banner "Más trabajo. Más soluciones." y panel derecho (perfil con números, accesos rápidos y actividad reciente).
- Todo sale de datos reales (`mis-pedidos` y `locales`); no se agregó ninguna ruta ni tabla. Sigue siendo Worker + D1.
- El banner usa la foto del cinturón de herramientas (`img/trabajador.webp`), no la del casco.
- Archivos nuevos: `public/escritorio.css` y `public/app/escritorio.js` (cargado después de `vistas.js`). Cambios chicos en `base.js` (`PCW`), `navegacion.js` (`tabs()`, `nav()`), `vistas.js` (en PC, Mis pedidos es solo la lista) e `index.html`. `sw.js` en ct-v85 y `tools/prueba/armar.py` incluye el CSS nuevo.
- Celu, tablet y la cuenta de trabajador quedan exactamente igual. En PC el Directorio se abre desde las categorías o el buscador, y Publicar desde la portada o el botón flotante.
- Inicio de PC: se achica solo (zoom, mínimo 55 %) para entrar en el alto de la ventana sin scroll; en pantallas bajas el menú lateral se compacta.

# v86 · Logo en PC

- Trabajadores y comercios en PC (1100 px o más) no tenían logo: el encabezado nunca lo llevó y el menú lateral es solo del cliente. Ahora el encabezado muestra el logo y "Dicho y Hecho" (`.pcb` en `index.html`, estilos al final de `escritorio.css`). En celu y tablet queda oculto, igual que antes.
- Menú lateral del cliente: en pantallas bajas (menos de 640 px de alto, típico de notebook con el navegador abierto) el logo se ocultaba; ahora se achica a 36 px y se mantiene.
- `sw.js` en ct-v86.
- Renombre técnico completo (antes se había dejado `cercatuyo`): Worker `dichoyhecho` y base D1 `dichoyhecho` en `wrangler.toml`, `package.json`, comando del SQL de locales, `og-cercatuyo.png` pasó a `og-dichoyhecho.png`, y las páginas de prueba y editor se arman como `dichoyhecho-*.html`. Como la D1 todavía no se creó, no hay nada que migrar: crearla con el nombre `dichoyhecho`. "Cerca tuyo" dentro de la app se dejó porque es el texto de la función (pedidos cerca tuyo), no la marca.

# v86 · Revisión de seguridad (Worker y D1)

- Fotos (`/api/foto`, `pfoto`, `rfoto`, `tfoto`): ahora salen con `X-Content-Type-Options: nosniff` y CSP cerrado, así un archivo que no sea imagen nunca se ejecuta en el navegador.
- La huella de IP (límites y `reg_ip`) admite un secret opcional `IP_SALT`; con él no se puede recalcular la IP probando todas las posibles. Ponerlo antes del primer uso y no cambiarlo.
- `esc()` de la app también escapa la comilla simple.
- Sin cambios (ya estaba bien): todo el SQL va con parámetros; sesión con token en `Authorization` (sin cookies, no hay CSRF); tokens guardados con hash; PIN y respuesta de seguridad con PBKDF2; límites de intentos en login, recuperar PIN, registro y clave de Gestión con comparación sin filtrar tiempo; el teléfono del otro solo se muestra al elegido; CSP sin scripts inline.

# v87 · Crédito de Modus Grid

- Pie "Sistema hecho por @modus.grid" con el logo y link a Instagram, igual al de Fausto Furlano (`public/modusgrid.webp`). Está en `index.html` (debajo de `<main>`, estilos `.credit` al final de `app.css`).
- PC con menú lateral (1100 px o más): el crédito va abajo del menú (`navPC()` en `app/escritorio.js`, estilos `.sb-cr` en `escritorio.css`) y el pie de la página se esconde, porque el panel de Inicio no scrollea.
- Arreglo: los links a términos y privacidad (`legal.html#...`) daban ERR_FAILED. Cloudflare redirige `/legal.html` a `/legal`, y el service worker devolvía esa respuesta redirigida desde la caché, cosa que el navegador no acepta en una navegación. Ahora `sw.js` rearma una copia limpia (`limpia()`).
- `sw.js` en ct-v87 y con `modusgrid.webp` en el caché.


# v95 · Escritorio también para trabajadores

- En PC (1100 px o más) el trabajador ahora ve el mismo layout que el cliente: menú lateral fijo, barra superior con buscador e Inicio tipo panel. Antes era solo del cliente y el trabajador veía la versión del celu estirada.
- Menú del trabajador: Inicio, Pedidos, Propuestas, Locales, Perfil, Configuración y Ayuda (`navPC()` en `app/escritorio.js`). El del cliente no cambia.
- Buscador de arriba: el del trabajador busca pedidos (lleva a Pedidos con lo escrito); el del cliente sigue buscando trabajadores en el Directorio (`app/acciones.js`).
- Inicio del trabajador (`iniTrab()` en `app/escritorio.js`): Tus propuestas (estado real: te eligieron, enviada, terminada, cerrada), Explorá, perfil con propuestas, reseñas y pedidos abiertos, accesos rápidos (Pedidos, Mis datos y rubros, Alertas, Soporte) y Actividad reciente. Usa solo `mis-postulaciones`, `locales` y `zona`: no hay cambios en el Worker ni en D1.
- En PC, la pantalla Pedidos del trabajador ya no lleva la portada con foto arriba (`vistas.js`); queda filtros a la izquierda y pedidos en grilla. El botón flotante "Publicar pedido" sigue siendo solo del cliente.
- Con menos de 1100 px (celu, tablet y ventanas angostas) todo queda como antes.
- `sw.js` en ct-v95.
