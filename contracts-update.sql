-- Actualizar tabla contracts con campos adicionales
-- Organización por tipo de actividad, centro de costos, cliente interno

ALTER TABLE contracts
ADD COLUMN IF NOT EXISTS activity_type text, -- Tipo de actividad
ADD COLUMN IF NOT EXISTS cost_center text, -- Centro de costos
ADD COLUMN IF NOT EXISTS internal_client_type text, -- Tipo de cliente interno (Maquinaria, Repuestos, Bienes inmuebles)
ADD COLUMN IF NOT EXISTS contract_document_url text, -- URL del documento del contrato generado
ADD COLUMN IF NOT EXISTS legal_review_notes text, -- Notas de revisión jurídica
ADD COLUMN IF NOT EXISTS budget_control jsonb, -- Control de presupuesto {total_budget, spent, remaining, items: []}
ADD COLUMN IF NOT EXISTS project_name text, -- Nombre del proyecto asociado
ADD COLUMN IF NOT EXISTS payment_schedule jsonb, -- Cronograma de pagos
ADD COLUMN IF NOT EXISTS deliverables jsonb, -- Entregables del contrato
ADD COLUMN IF NOT EXISTS warranty_period integer, -- Período de garantía en días
ADD COLUMN IF NOT EXISTS warranty_terms text; -- Términos de garantía

-- Tabla para "Otro sí" (actividades adicionales)
CREATE TABLE IF NOT EXISTS contract_addendums (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id uuid REFERENCES contracts(id) ON DELETE CASCADE NOT NULL,
  addendum_number integer NOT NULL, -- Número del otro sí (1, 2, 3...)
  description text NOT NULL, -- Descripción de las actividades adicionales
  additional_amount decimal(12,2) NOT NULL, -- Monto adicional
  additional_activities jsonb, -- Actividades adicionales detalladas
  approved_by uuid REFERENCES profiles(id),
  approved_at timestamptz,
  document_url text, -- URL del documento del otro sí
  created_by uuid REFERENCES profiles(id) NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(contract_id, addendum_number)
);

-- Función para generar número de contrato
CREATE OR REPLACE FUNCTION generate_contract_number(contract_type_param contract_type)
RETURNS text AS $$
DECLARE
  prefix text;
  new_number text;
  year_part text;
  last_number integer;
BEGIN
  -- Prefijo según tipo de contrato
  CASE contract_type_param
    WHEN 'labor' THEN prefix := 'CON-MO-'; -- Mano de obra
    WHEN 'supply' THEN prefix := 'CON-SUM-'; -- Suministro
    WHEN 'mixed' THEN prefix := 'CON-MIX-'; -- Mixto
    ELSE prefix := 'CON-';
  END CASE;
  
  year_part := TO_CHAR(CURRENT_DATE, 'YYYY');
  
  -- Buscar el último número del año actual y tipo
  SELECT COALESCE(MAX(CAST(SUBSTRING(contract_number FROM '[0-9]+$') AS INTEGER)), 0)
  INTO last_number
  FROM contracts
  WHERE contract_number LIKE prefix || year_part || '%';
  
  -- Generar nuevo número: PREFIJO + AÑO + número consecutivo
  new_number := prefix || year_part || LPAD((last_number + 1)::text, 4, '0');
  
  RETURN new_number;
END;
$$ LANGUAGE plpgsql;

-- Índices
CREATE INDEX IF NOT EXISTS idx_contracts_activity_type ON contracts(activity_type);
CREATE INDEX IF NOT EXISTS idx_contracts_cost_center ON contracts(cost_center);
CREATE INDEX IF NOT EXISTS idx_contracts_internal_client ON contracts(internal_client_type);
CREATE INDEX IF NOT EXISTS idx_contract_addendums_contract ON contract_addendums(contract_id);

-- Triggers
DROP TRIGGER IF EXISTS update_contract_addendums_updated_at ON contract_addendums;
CREATE TRIGGER update_contract_addendums_updated_at BEFORE UPDATE ON contract_addendums 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS para contract_addendums
ALTER TABLE contract_addendums ENABLE ROW LEVEL SECURITY;

-- Eliminar políticas existentes si existen y crear nuevas
DROP POLICY IF EXISTS "Usuarios autenticados pueden leer contract_addendums" ON contract_addendums;
DROP POLICY IF EXISTS "Usuarios autenticados pueden crear contract_addendums" ON contract_addendums;
DROP POLICY IF EXISTS "Usuarios autenticados pueden actualizar contract_addendums" ON contract_addendums;

CREATE POLICY "Usuarios autenticados pueden leer contract_addendums" ON contract_addendums
FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Usuarios autenticados pueden crear contract_addendums" ON contract_addendums
FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Usuarios autenticados pueden actualizar contract_addendums" ON contract_addendums
FOR UPDATE USING (auth.uid() IS NOT NULL);

-- Comentarios
COMMENT ON COLUMN contracts.activity_type IS 'Tipo de actividad del contrato';
COMMENT ON COLUMN contracts.cost_center IS 'Centro de costos';
COMMENT ON COLUMN contracts.internal_client_type IS 'Tipo de cliente interno (Maquinaria, Repuestos, Bienes inmuebles)';
COMMENT ON COLUMN contracts.budget_control IS 'Control de presupuesto del contrato';

