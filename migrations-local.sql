-- Migraciones para PostgreSQL Local
-- Sistema de Gestión de Mantenimiento

-- Crear extensión para UUIDs si no existe
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Crear enum types
CREATE TYPE user_role AS ENUM ('admin', 'infrastructure', 'supervision', 'contractor', 'internal_client');
CREATE TYPE task_status AS ENUM ('pending', 'in_progress', 'completed', 'cancelled');
CREATE TYPE service_order_status AS ENUM ('draft', 'pending_approval', 'approved', 'in_progress', 'completed', 'cancelled');
CREATE TYPE measurement_status AS ENUM ('pending', 'approved_edison', 'approved_felipe', 'approved_claudia');
CREATE TYPE notification_type AS ENUM ('task', 'service_order', 'quotation', 'measurement', 'internal_request');
CREATE TYPE timeline_event_type AS ENUM ('created', 'assigned', 'started', 'updated', 'completed', 'cancelled', 'approved');

-- Tabla de usuarios (reemplaza auth.users de Supabase)
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  email text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Tabla de perfiles (perfil extendido de usuarios)
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  full_name text NOT NULL,
  role user_role NOT NULL DEFAULT 'internal_client',
  department text,
  phone text,
  avatar_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Sites table
CREATE TABLE IF NOT EXISTS sites (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  location text NOT NULL,
  coordinates jsonb,
  measurements jsonb,
  blueprint_url text,
  photos_urls text[],
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Contractors table
CREATE TABLE IF NOT EXISTS contractors (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_name text NOT NULL,
  contact_name text NOT NULL,
  email text,
  phone text NOT NULL,
  specialty text,
  rating decimal(3,2) DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Tasks table
CREATE TABLE IF NOT EXISTS tasks (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  title text NOT NULL,
  description text,
  task_type text NOT NULL,
  requesting_area text NOT NULL,
  site_id uuid REFERENCES sites(id) ON DELETE CASCADE,
  requester_id uuid REFERENCES profiles(id),
  assignee_id uuid REFERENCES profiles(id),
  status task_status DEFAULT 'pending',
  priority text DEFAULT 'medium',
  budget_amount decimal(12,2),
  photo_urls text[],
  signature_url text,
  approval_required boolean DEFAULT false,
  approved_by uuid REFERENCES profiles(id),
  approved_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Task timeline (audit trail)
CREATE TABLE IF NOT EXISTS task_timeline (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id uuid REFERENCES tasks(id) ON DELETE CASCADE,
  event_type timeline_event_type NOT NULL,
  description text NOT NULL,
  user_id uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now()
);

-- Service orders table
CREATE TABLE IF NOT EXISTS service_orders (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_number text UNIQUE NOT NULL,
  site_id uuid REFERENCES sites(id),
  contractor_id uuid REFERENCES contractors(id),
  activity_type text NOT NULL,
  description text NOT NULL,
  start_date date NOT NULL,
  end_date date,
  budget_amount decimal(12,2) NOT NULL,
  status service_order_status DEFAULT 'draft',
  attachments text[],
  contractor_signature_url text,
  supervisor_signature_url text,
  authorization_number text,
  authorized_by uuid REFERENCES profiles(id),
  authorized_at timestamptz,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Measurements table
CREATE TABLE IF NOT EXISTS measurements (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  title text NOT NULL,
  site_id uuid REFERENCES sites(id),
  length decimal(10,2),
  width decimal(10,2),
  height decimal(10,2),
  area decimal(12,2),
  volume decimal(12,2),
  unit text DEFAULT 'm',
  photo_urls text[],
  notes text,
  status measurement_status DEFAULT 'pending',
  measured_by uuid REFERENCES profiles(id),
  approved_edison_at timestamptz,
  approved_edison_by uuid REFERENCES profiles(id),
  approved_felipe_at timestamptz,
  approved_felipe_by uuid REFERENCES profiles(id),
  approved_claudia_at timestamptz,
  approved_claudia_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Internal requests table
CREATE TABLE IF NOT EXISTS internal_requests (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  title text NOT NULL,
  description text NOT NULL,
  department text NOT NULL,
  requester_id uuid REFERENCES profiles(id),
  photos_urls text[],
  measurements jsonb,
  design_urls text[],
  status task_status DEFAULT 'pending',
  assigned_to uuid REFERENCES profiles(id),
  completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Quotations table
CREATE TABLE IF NOT EXISTS quotations (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  title text NOT NULL,
  description text NOT NULL,
  quotation1_url text,
  quotation1_amount decimal(12,2),
  quotation1_provider text,
  quotation2_url text,
  quotation2_amount decimal(12,2),
  quotation2_provider text,
  quotation3_url text,
  quotation3_amount decimal(12,2),
  quotation3_provider text,
  status text DEFAULT 'pending_review',
  reviewed_by uuid REFERENCES profiles(id),
  reviewed_at timestamptz,
  notes text,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES profiles(id),
  title text NOT NULL,
  message text NOT NULL,
  type notification_type NOT NULL,
  reference_id uuid,
  read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Índices para mejorar performance
CREATE INDEX idx_tasks_requester ON tasks(requester_id);
CREATE INDEX idx_tasks_assignee ON tasks(assignee_id);
CREATE INDEX idx_tasks_site ON tasks(site_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_service_orders_site ON service_orders(site_id);
CREATE INDEX idx_service_orders_contractor ON service_orders(contractor_id);
CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(read);
CREATE INDEX idx_task_timeline_task ON task_timeline(task_id);

-- Trigger para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Aplicar trigger a todas las tablas con updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_sites_updated_at BEFORE UPDATE ON sites FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_contractors_updated_at BEFORE UPDATE ON contractors FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_service_orders_updated_at BEFORE UPDATE ON service_orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_measurements_updated_at BEFORE UPDATE ON measurements FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_internal_requests_updated_at BEFORE UPDATE ON internal_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_quotations_updated_at BEFORE UPDATE ON quotations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Crear usuario admin por defecto (password: admin123)
-- Hash bcrypt de 'admin123': $2a$10$rRj3KZkqH8xnZ4Y6R6B4XeQ0qxv9FHxZ8gZ3jH4Y6R6B4XeQ0qxv9G
INSERT INTO users (id, email, password_hash) 
VALUES (
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid,
  'admin@partequipos.com',
  '$2a$10$rRj3KZkqH8xnZ4Y6R6B4XeQ0qxv9FHxZ8gZ3jH4Y6R6B4XeQ0qxv9G'
) ON CONFLICT (email) DO NOTHING;

INSERT INTO profiles (id, email, full_name, role, department) 
VALUES (
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid,
  'admin@partequipos.com',
  'Administrador',
  'admin',
  'IT'
) ON CONFLICT (id) DO NOTHING;

COMMIT;

