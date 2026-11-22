-- Insignia "Pionero": las primeras 50 cuentas.
-- Correr UNA sola vez en la D1 que ya existe (consola de D1 o: wrangler d1 execute dicho-y-hecho-db --remote --file=migracion-pionero.sql).
-- Una base nueva creada con schema.sql ya trae la columna y no necesita esto.

ALTER TABLE usuarios ADD COLUMN pionero INTEGER NOT NULL DEFAULT 0;
-- pionero_visto: 1 cuando la persona ya vio el cartelito de bienvenida Pionero (se muestra una sola vez por cuenta)
ALTER TABLE usuarios ADD COLUMN pionero_visto INTEGER NOT NULL DEFAULT 0;

-- Marca a las primeras 50 cuentas reales por orden de registro (las eliminadas y las suspendidas no cuentan).
-- Con 37 cuentas hoy, quedan marcadas las 37 y el Worker reparte los 13 lugares que faltan a medida que se registren.
UPDATE usuarios SET pionero = 1
WHERE id IN (
  SELECT id FROM usuarios
  WHERE suspendido = 0 AND telefono NOT LIKE 'eliminada-%'
  ORDER BY id ASC
  LIMIT 50
);

-- Para revisar el resultado:
-- SELECT COUNT(*) FROM usuarios WHERE pionero = 1;
