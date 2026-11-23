-- Eliminar cuenta con revisión del administrador.
-- Correr UNA sola vez en la D1 que ya existe, ANTES de subir el código nuevo
-- (consola de D1 o: wrangler d1 execute dicho-y-hecho-db --remote --file=migracion-eliminar-cuenta.sql).
-- Una base nueva creada con schema.sql ya trae la columna y no necesita esto.

-- elim_pedida: momento (en milisegundos) en que la persona pidió eliminar su cuenta. 0 = no pidió.
-- Mientras tanto la cuenta queda suspendida; el borrado completo lo hace un administrador desde Gestión.
ALTER TABLE usuarios ADD COLUMN elim_pedida INTEGER NOT NULL DEFAULT 0;
