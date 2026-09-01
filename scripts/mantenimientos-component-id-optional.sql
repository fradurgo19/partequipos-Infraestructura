-- Hacer opcional el ID del componente en mantenimientos.
-- Ejecutar en Supabase → SQL Editor → Run.

ALTER TABLE maintenances
  ALTER COLUMN component_id DROP NOT NULL;

COMMENT ON COLUMN maintenances.component_id IS 'Identificador opcional del componente en la sede';
