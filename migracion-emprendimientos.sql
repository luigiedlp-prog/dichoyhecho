-- v88: Emprendimientos, fotos de locales e insignia Donador. Correr UNA vez en una base que ya existe (la base nueva ya lo trae en schema.sql).
ALTER TABLE locales ADD COLUMN tipo TEXT NOT NULL DEFAULT 'local';
CREATE TABLE IF NOT EXISTS local_fotos(id INTEGER PRIMARY KEY AUTOINCREMENT,local_id INTEGER NOT NULL,rol TEXT NOT NULL,img TEXT NOT NULL,k TEXT NOT NULL DEFAULT '',creado INTEGER NOT NULL DEFAULT 0);
CREATE INDEX IF NOT EXISTS i_lf ON local_fotos(local_id,rol);
-- Insignia Donador (se marca a mano desde Gestión)
ALTER TABLE usuarios ADD COLUMN donador INTEGER NOT NULL DEFAULT 0;
