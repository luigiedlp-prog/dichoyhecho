# Dicho y Hecho

Pedidos y trabajadores de Pergamino. App en `public/` (HTML/CSS/JS sin build) + Worker de Cloudflare en `src/` + base D1.

## Estructura

- `public/` la app. `index.html` carga los scripts en orden: `config.js`, `datos.js`, `qr.js`, `reglas.js` y `app/*.js`.
  Son scripts comunes que comparten variables, así que **el orden de `index.html` importa** (y `sw.js` tiene que listarlos todos).
  - `reglas.js` reglas compartidas con el Worker (teléfono, PIN, pregunta de seguridad, nombre, mail, rubros).
  - `app/` base, utiles, componentes, portada-registro, navegacion, mapa, listas, vistas, escritorio, acciones, gestion, arranque.
  - `escritorio.css` + `app/escritorio.js`: layout de PC (1100 px o más) para cliente y trabajador: menú lateral, buscador arriba e Inicio tipo panel (cada tipo de cuenta con su menú, su buscador y su Inicio). Celu y tablet no lo usan.
- `src/worker.js` entrada (fetch y cron) y despachador. `src/rutas/*.js` las rutas de la API; cada una recibe un contexto `C`
  y devuelve una `Response` si la ruta es suya. `src/comun.js` ayudas y constantes; `src/avisos.js` avisos y push.
- `schema.sql` crea la base D1 desde cero (alcanza para la primera subida).
- `tools/` pruebas y armado de las páginas de prueba y de edición.

## Pruebas

```
npm test                 # las dos suites
node tools/probar-worker.mjs      # Worker real contra SQLite con el schema real (Node 22+)
python3 tools/probar-pantallas.py # Chromium simulando un celular (pip install playwright)
npm run formato          # Prettier
npm run prueba           # arma ../dichoyhecho-prueba.html (app + servidor simulado, un solo archivo)
```

## Subir

1. Crear la D1 y correr `schema.sql`; pegar el id en `wrangler.toml`.
2. Secrets: `wrangler secret put ADMIN_KEY` (larga y aleatoria) y, para avisos, `VAPID_PUBLIC` / `VAPID_PRIVATE` (`tools/generar-vapid.mjs`). Recomendado: `IP_SALT` (texto largo y aleatorio, `wrangler secret put IP_SALT`) para que las huellas de IP guardadas no se puedan revertir. Ponerlo antes del primer uso y no cambiarlo después.
3. Poner Cloudflare Access delante de `/api/admin/*` y de `#gestion`.
4. `wrangler deploy`. Al cambiar la app, subir el número de `V` en `public/sw.js`.

## Modelo gratuito (v83)

Todo es gratis: publicar, registrarse, ofrecer servicios, proponer y perfiles de comercio. Sin comisiones ni suscripciones, y sin cobro de potenciaciones. `src/rutas/potenciaciones.js` (`POST /api/potenciar`) activa destacado (72 hs) y alertas (7 días) con la primera potenciación de cada cuenta o las ganadas por invitar. Los anuncios recompensados de Google están pendientes: cuando se integren, la recompensa se tiene que validar desde el Worker. Todo sigue en D1.

## Insignia Pionero (v85)

Las primeras 50 cuentas que se registran (clientes y trabajadores) llevan la insignia "Pionero", de por vida. Se guarda en `usuarios.pionero` y la asigna el registro en la misma sentencia que inserta la cuenta (`PIONEROS` en `src/comun.js`, no hay carrera entre dos registros a la vez). Si una cuenta se elimina, libera su lugar y lo toma la próxima que se registre. Una base que ya existe necesita correr una vez `migracion-pionero.sql`. La portada y el registro muestran cuántos lugares quedan (viene en `GET /api/zona`, campo `pioneros`) y el cartel desaparece al llenarse. Al entrar por primera vez, cada Pionero ve un cartelito de bienvenida (una sola vez, `usuarios.pionero_visto`). Prueba: `node tools/probar-pionero.mjs`.
