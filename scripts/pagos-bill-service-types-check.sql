-- Actualiza restricciones CHECK de service_type en utility_bills y bill_consumptions.
-- Incluye tipos usados en el formulario: public_lighting, security, administration, rent, etc.
-- Ejecutar en Supabase SQL Editor.

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
    'rent',
    'other'
  ));

COMMENT ON COLUMN bill_consumptions.service_type IS
  'Tipo de servicio del consumo (electricity, water, public_lighting, security, rent, other, etc.)';

COMMENT ON COLUMN utility_bills.service_type IS
  'Tipo de servicio principal de la factura (electricity, water, public_lighting, security, rent, other, etc.)';
