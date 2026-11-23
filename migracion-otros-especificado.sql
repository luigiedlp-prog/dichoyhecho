-- "Otros" con lo que la persona especificó (ej. "Reparación de bicicletas").
-- Correr UNA sola vez en la D1 que ya existe, ANTES de subir el código nuevo
-- (consola de D1 o: wrangler d1 execute dicho-y-hecho-db --remote --file=migracion-otros-especificado.sql).
-- Una base nueva creada con schema.sql ya trae las columnas y no necesita esto.
-- Son dos ALTER: si uno da "duplicate column name", ese ya estaba y se sigue con el otro.

-- pedidos.rubro_otro: lo que escribió el cliente cuando eligió el rubro Otros
ALTER TABLE pedidos ADD COLUMN rubro_otro TEXT NOT NULL DEFAULT '';
-- usuarios.rubro_otro: lo que escribió el trabajador cuando marcó Otros entre sus rubros
ALTER TABLE usuarios ADD COLUMN rubro_otro TEXT NOT NULL DEFAULT '';
