-- Actualiza restricciones CHECK de service_type en utility_bills y bill_consumptions.
-- Incluye: public_lighting, security, administration, property_tax, rent, operation_fixed_fee, etc.
-- REQUERIDO en producción: sin este script, nuevos tipos (p. ej. operation_fixed_fee) fallan con 23514.
-- Ejecutar en Supabase → SQL Editor → Run.

ALTER TABLE bill_consumptions DROP CONSTRAINT IF EXISTS bill_consumptions_service_type_check;

ALTER TABLE bill_consumptions
  ADD CONSTRAINT bill_consumptions_service_type_check
  CHECK (service_type IN (
    'electricity',
    'water',
    'gas',
    'internet',
    'phone',
    'cellular',
    'waste',
    'sewer',
    'public_lighting',
    'security',
    'administration',
    'property_tax',
    'rent',
    'operation_fixed_fee',
    'other'
  ));

ALTER TABLE utility_bills DROP CONSTRAINT IF EXISTS utility_bills_service_type_check;

ALTER TABLE utility_bills
  ADD CONSTRAINT utility_bills_service_type_check
  CHECK (service_type IN (
    'electricity',
    'water',
    'gas',
    'internet',
    'phone',
    'cellular',
    'waste',
    'sewer',
    'public_lighting',
    'security',
    'administration',
    'property_tax',
    'rent',
    'operation_fixed_fee',
    'other'
  ));

COMMENT ON COLUMN bill_consumptions.service_type IS
  'Tipo de servicio del consumo (incluye property_tax, rent, operation_fixed_fee, etc.)';

COMMENT ON COLUMN utility_bills.service_type IS
  'Tipo de servicio principal de la factura (incluye property_tax, rent, operation_fixed_fee, etc.)';

-- Verificación opcional: debe listar property_tax en la definición del CHECK.
-- SELECT conname, pg_get_constraintdef(oid)
-- FROM pg_constraint
-- WHERE conrelid = 'utility_bills'::regclass
--   AND conname = 'utility_bills_service_type_check';
