-- Vincular cortes de obra con contratos (opcional)
ALTER TABLE measurements
  ADD COLUMN IF NOT EXISTS contract_id uuid REFERENCES contracts(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_measurements_contract_id ON measurements(contract_id);

COMMENT ON COLUMN measurements.contract_id IS 'Contrato asociado al corte (opcional)';

-- Permitir al creador editar sus cortes pendientes
DROP POLICY IF EXISTS "Users can update own pending measurements" ON measurements;

CREATE POLICY "Users can update own pending measurements"
  ON measurements FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid() AND status = 'pending')
  WITH CHECK (created_by = auth.uid() AND status = 'pending');
