-- Actualiza restricciones CHECK de service_type en utility_bills y bill_consumptions.
-- Incluye tipos del formulario: public_lighting, security, administration, property_tax, rent, etc.
-- REQUERIDO en producción: sin este script, Impuesto Predial (property_tax) falla con 23514.
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
    'other'
  ));

COMMENT ON COLUMN bill_consumptions.service_type IS
  'Tipo de servicio del consumo (electricity, water, public_lighting, security, administration, property_tax, rent, other, etc.)';

COMMENT ON COLUMN utility_bills.service_type IS
  'Tipo de servicio principal de la factura (electricity, water, public_lighting, security, administration, property_tax, rent, other, etc.)';

-- Verificación opcional: debe listar property_tax en la definición del CHECK.
-- SELECT conname, pg_get_constraintdef(oid)
-- FROM pg_constraint
-- WHERE conrelid = 'utility_bills'::regclass
--   AND conname = 'utility_bills_service_type_check';
