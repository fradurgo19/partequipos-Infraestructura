-- Campos de póliza de seguro en contratos.
-- Ejecutar en Supabase → SQL Editor → Run.

ALTER TABLE contracts
  ADD COLUMN IF NOT EXISTS has_policy boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS policy_type text,
  ADD COLUMN IF NOT EXISTS policy_start_date date,
  ADD COLUMN IF NOT EXISTS policy_end_date date,
  ADD COLUMN IF NOT EXISTS insured_amount decimal(12,2);

COMMENT ON COLUMN contracts.has_policy IS 'Indica si el contrato cuenta con póliza de seguro';
COMMENT ON COLUMN contracts.policy_type IS 'Tipo de póliza (cumplimiento, calidad, RC, etc.)';
COMMENT ON COLUMN contracts.policy_start_date IS 'Fecha de inicio de vigencia de la póliza';
COMMENT ON COLUMN contracts.policy_end_date IS 'Fecha de vencimiento de la póliza';
COMMENT ON COLUMN contracts.insured_amount IS 'Monto asegurado de la póliza';
