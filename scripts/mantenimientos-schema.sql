-- Módulo Mantenimientos (solo admin)
-- Ejecutar en Supabase SQL Editor

-- Tipos
DO $$ BEGIN
  CREATE TYPE maintenance_kind AS ENUM ('preventive', 'corrective');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE component_status AS ENUM ('active', 'inactive');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'maintenance';

-- Tabla principal
CREATE TABLE IF NOT EXISTS maintenances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id uuid NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  component_type text NOT NULL,
  component_id text NOT NULL,
  maintenance_kind maintenance_kind NOT NULL DEFAULT 'preventive',
  last_maintenance_date date NOT NULL,
  next_maintenance_date date NOT NULL,
  component_status component_status NOT NULL DEFAULT 'active',
  notes text,
  created_by uuid NOT NULL REFERENCES profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_maintenances_site ON maintenances(site_id);
CREATE INDEX IF NOT EXISTS idx_maintenances_next_date ON maintenances(next_maintenance_date);
CREATE INDEX IF NOT EXISTS idx_maintenances_status ON maintenances(component_status);

COMMENT ON TABLE maintenances IS 'Registro de mantenimientos preventivos/correctivos por componente de sede';
COMMENT ON COLUMN maintenances.component_type IS 'Tipo de componente (air_conditioners, water_tanks, etc.)';
COMMENT ON COLUMN maintenances.component_id IS 'Identificador único del componente en la sede';

-- RLS
ALTER TABLE maintenances ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view maintenances" ON maintenances;
CREATE POLICY "Admins can view maintenances"
  ON maintenances FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can insert maintenances" ON maintenances;
CREATE POLICY "Admins can insert maintenances"
  ON maintenances FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can update maintenances" ON maintenances;
CREATE POLICY "Admins can update maintenances"
  ON maintenances FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can delete maintenances" ON maintenances;
CREATE POLICY "Admins can delete maintenances"
  ON maintenances FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Trigger updated_at
DROP TRIGGER IF EXISTS update_maintenances_updated_at ON maintenances;
CREATE TRIGGER update_maintenances_updated_at
  BEFORE UPDATE ON maintenances
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
