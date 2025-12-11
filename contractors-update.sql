-- Actualizar tabla contractors con información completa
-- Agregar campos faltantes: NIT, dirección, etc.

ALTER TABLE contractors 
ADD COLUMN IF NOT EXISTS nit text,
ADD COLUMN IF NOT EXISTS address text,
ADD COLUMN IF NOT EXISTS city text,
ADD COLUMN IF NOT EXISTS country text DEFAULT 'Colombia',
ADD COLUMN IF NOT EXISTS website text,
ADD COLUMN IF NOT EXISTS tax_id text, -- ID tributario adicional si es necesario
ADD COLUMN IF NOT EXISTS bank_account text,
ADD COLUMN IF NOT EXISTS bank_name text,
ADD COLUMN IF NOT EXISTS notes text,
ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;

-- Crear índice para búsqueda por NIT
CREATE INDEX IF NOT EXISTS idx_contractors_nit ON contractors(nit) WHERE nit IS NOT NULL;

-- Comentarios para documentación
COMMENT ON COLUMN contractors.nit IS 'Número de Identificación Tributaria';
COMMENT ON COLUMN contractors.address IS 'Dirección completa del contratista';
COMMENT ON COLUMN contractors.city IS 'Ciudad donde opera el contratista';
COMMENT ON COLUMN contractors.is_active IS 'Indica si el contratista está activo';

