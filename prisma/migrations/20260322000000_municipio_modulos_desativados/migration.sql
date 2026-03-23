ALTER TABLE "Municipio" ADD COLUMN IF NOT EXISTS "modulosDesativados" TEXT[] NOT NULL DEFAULT '{}';
