-- Mantenimientos: contratista, componente manual y costos
ALTER TABLE maintenances
  ADD COLUMN IF NOT EXISTS contractor_id uuid REFERENCES contractors(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS component_name text,
  ADD COLUMN IF NOT EXISTS last_maintenance_cost numeric(15, 2);

CREATE INDEX IF NOT EXISTS idx_maintenances_contractor ON maintenances(contractor_id);

COMMENT ON COLUMN maintenances.contractor_id IS 'Contratista asociado al mantenimiento';
COMMENT ON COLUMN maintenances.component_name IS 'Nombre del componente ingresado manualmente';
COMMENT ON COLUMN maintenances.last_maintenance_cost IS 'Costo del último mantenimiento (referencia para el próximo)';
