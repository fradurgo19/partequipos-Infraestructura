-- Agregar módulos faltantes: Órdenes de Compra y Contratos

-- Enum para tipos de contrato
CREATE TYPE contract_type AS ENUM ('labor', 'supply', 'mixed');
CREATE TYPE purchase_order_status AS ENUM ('draft', 'pending_approval', 'approved', 'completed', 'cancelled');
CREATE TYPE contract_status AS ENUM ('draft', 'active', 'completed', 'cancelled');

-- Tabla de Órdenes de Compra
CREATE TABLE IF NOT EXISTS purchase_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number text UNIQUE NOT NULL,
  issued_to text NOT NULL, -- Nombre del proveedor
  issued_to_nit text NOT NULL,
  order_date date DEFAULT CURRENT_DATE,
  authorized_by uuid REFERENCES profiles(id),
  activity_type text NOT NULL, -- Tipo de actividad (Reparaciones locativas, etc)
  items jsonb NOT NULL, -- [{description, price, quantity}]
  subtotal decimal(12,2) NOT NULL,
  taxes decimal(12,2) DEFAULT 0,
  total decimal(12,2) NOT NULL,
  site_id uuid REFERENCES sites(id),
  project_code text,
  cost_center text, -- Centro de costos
  comments text,
  quotation_number text,
  status purchase_order_status DEFAULT 'draft',
  created_by uuid REFERENCES profiles(id),
  prepared_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Tabla de Contratos
CREATE TABLE IF NOT EXISTS contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_number text UNIQUE NOT NULL,
  contractor_id uuid REFERENCES contractors(id),
  contract_type contract_type NOT NULL,
  description text NOT NULL,
  total_amount decimal(12,2) NOT NULL,
  start_date date NOT NULL,
  end_date date,
  status contract_status DEFAULT 'draft',
  activities jsonb, -- Actividades del contrato
  additional_activities jsonb, -- Otros si (actividades adicionales)
  payment_terms text,
  legal_review_status text,
  legal_reviewed_by uuid REFERENCES profiles(id),
  legal_reviewed_at timestamptz,
  site_id uuid REFERENCES sites(id),
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Tabla de Seguimiento de Contratos (Cortes de Obra)
CREATE TABLE IF NOT EXISTS contract_tracking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id uuid REFERENCES contracts(id) ON DELETE CASCADE,
  tracking_date date DEFAULT CURRENT_DATE,
  dimensions jsonb, -- {length, width, height, area, unit}
  activity_description text NOT NULL,
  location_detail text, -- Localización específica dentro de la sede
  photo_urls text[],
  budget_review text,
  activities_completed jsonb,
  reviewer_signature_url text,
  reviewed_by uuid REFERENCES profiles(id),
  compliance_status text, -- Cumplimiento de plazos
  notes text,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_purchase_orders_site ON purchase_orders(site_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_status ON purchase_orders(status);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_order_number ON purchase_orders(order_number);
CREATE INDEX IF NOT EXISTS idx_contracts_contractor ON contracts(contractor_id);
CREATE INDEX IF NOT EXISTS idx_contracts_site ON contracts(site_id);
CREATE INDEX IF NOT EXISTS idx_contracts_status ON contracts(status);
CREATE INDEX IF NOT EXISTS idx_contract_tracking_contract ON contract_tracking(contract_id);

-- Triggers para updated_at
CREATE TRIGGER update_purchase_orders_updated_at BEFORE UPDATE ON purchase_orders 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_contracts_updated_at BEFORE UPDATE ON contracts 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_contract_tracking_updated_at BEFORE UPDATE ON contract_tracking 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Políticas RLS
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE contract_tracking ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios autenticados pueden leer purchase_orders" ON purchase_orders
FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Usuarios autenticados pueden crear purchase_orders" ON purchase_orders
FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Usuarios autenticados pueden actualizar purchase_orders" ON purchase_orders
FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "Usuarios autenticados pueden leer contracts" ON contracts
FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Usuarios autenticados pueden crear contracts" ON contracts
FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Usuarios autenticados pueden actualizar contracts" ON contracts
FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "Usuarios autenticados pueden leer contract_tracking" ON contract_tracking
FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Usuarios autenticados pueden crear contract_tracking" ON contract_tracking
FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

