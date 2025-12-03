/*
  # Maintenance Management System - Initial Schema

  ## Overview
  This migration creates the complete database schema for a comprehensive maintenance management system.

  ## Tables Created

  ### 1. profiles
  - Extended user profile information beyond auth.users
  - Links to Supabase auth system
  - Stores role, department, and contact info
  - Fields: id, email, full_name, role, department, phone, avatar_url, timestamps

  ### 2. sites
  - Physical locations and projects
  - Includes measurements, location data, and documentation
  - Fields: id, name, location, coordinates, measurements, blueprint/photo URLs, timestamps

  ### 3. contractors
  - Service provider information
  - Tracks specialty areas and ratings
  - Fields: id, company_name, contact_name, email, phone, specialty, rating, timestamps

  ### 4. tasks
  - Main task management system
  - Budget-based approval workflows
  - Photo documentation with watermarking support
  - Fields: id, title, description, task_type, requesting_area, site_id, requester_id, assignee_id, status, budget_amount, photo_urls, signature_url, approval info, timestamps

  ### 5. task_timeline
  - Audit trail for task changes
  - Tracks all status changes and updates
  - Fields: id, task_id, event_type, description, user_id, timestamp

  ### 6. service_orders
  - Formal service order management
  - Sequential numbering per site
  - Contractor assignment and authorization tracking
  - Fields: id, order_number, site_id, contractor_id, activity_type, description, dates, budget_amount, status, attachments, signatures, authorization info, timestamps

  ### 7. measurements
  - Measurement documentation with photo evidence
  - Three-level approval workflow (Edison → Felipe → Claudia)
  - Automatic area/volume calculations
  - Fields: id, title, site_id, dimensions, calculated values, photo_urls, multi-level approval tracking, timestamps

  ### 8. internal_requests
  - Department-based internal requests
  - Simplified request submission
  - Fields: id, title, description, department, photos, measurements, design_urls, status, assignment, timestamps

  ### 9. quotations
  - Three-quotation comparison system
  - Automatic notification to Pedro Cano
  - Fields: id, title, description, three quotation URLs and details, status, review info, timestamps

  ### 10. notifications
  - System notification management
  - Cross-module notification support
  - Fields: id, user_id, title, message, type, reference_id, read status, timestamp

  ## Security
  - RLS enabled on all tables
  - Restrictive policies based on user roles
  - Authentication required for all operations
  - Row-level access control for data privacy

  ## Indexes
  - Performance indexes on foreign keys
  - Status and date-based queries optimized
  - User-based lookups optimized
*/

-- Create enum types
CREATE TYPE user_role AS ENUM ('admin', 'infrastructure', 'supervision', 'contractor', 'internal_client');
CREATE TYPE task_status AS ENUM ('pending', 'in_progress', 'completed', 'cancelled');
CREATE TYPE service_order_status AS ENUM ('draft', 'pending_approval', 'approved', 'in_progress', 'completed', 'cancelled');
CREATE TYPE measurement_status AS ENUM ('pending', 'approved_edison', 'approved_felipe', 'approved_claudia');
CREATE TYPE notification_type AS ENUM ('task', 'service_order', 'quotation', 'measurement', 'internal_request');
CREATE TYPE timeline_event_type AS ENUM ('created', 'assigned', 'started', 'updated', 'completed', 'cancelled', 'approved');

-- Profiles table (extends auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
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
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  location text NOT NULL,
  latitude numeric,
  longitude numeric,
  area_to_paint numeric,
  bathrooms_count integer DEFAULT 0,
  walls_count integer DEFAULT 0,
  blueprint_urls text[] DEFAULT '{}',
  photo_urls text[] DEFAULT '{}',
  created_by uuid REFERENCES profiles(id) NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Contractors table
CREATE TABLE IF NOT EXISTS contractors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name text NOT NULL,
  contact_name text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL,
  specialty text[] DEFAULT '{}',
  rating numeric CHECK (rating >= 0 AND rating <= 5),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Tasks table
CREATE TABLE IF NOT EXISTS tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL,
  task_type text NOT NULL,
  requesting_area text NOT NULL,
  site_id uuid REFERENCES sites(id),
  requester_id uuid REFERENCES profiles(id) NOT NULL,
  assignee_id uuid REFERENCES profiles(id),
  status task_status DEFAULT 'pending',
  budget_amount numeric,
  photo_urls text[] DEFAULT '{}',
  signature_url text,
  approved_by uuid REFERENCES profiles(id),
  approved_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Task timeline table
CREATE TABLE IF NOT EXISTS task_timeline (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid REFERENCES tasks(id) ON DELETE CASCADE NOT NULL,
  event_type timeline_event_type NOT NULL,
  description text NOT NULL,
  user_id uuid REFERENCES profiles(id) NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Service orders table
CREATE TABLE IF NOT EXISTS service_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number text NOT NULL,
  site_id uuid REFERENCES sites(id) NOT NULL,
  contractor_id uuid REFERENCES contractors(id) NOT NULL,
  activity_type text NOT NULL,
  description text NOT NULL,
  request_date timestamptz DEFAULT now(),
  start_date timestamptz,
  end_date timestamptz,
  budget_amount numeric NOT NULL,
  status service_order_status DEFAULT 'draft',
  attachment_urls text[] DEFAULT '{}',
  signature_url text,
  authorized_by uuid REFERENCES profiles(id),
  authorized_at timestamptz,
  created_by uuid REFERENCES profiles(id) NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(site_id, order_number)
);

-- Measurements table
CREATE TABLE IF NOT EXISTS measurements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  site_id uuid REFERENCES sites(id),
  length numeric,
  height numeric,
  depth numeric,
  calculated_area numeric,
  calculated_volume numeric,
  photo_urls text[] DEFAULT '{}',
  status measurement_status DEFAULT 'pending',
  approved_by_edison uuid REFERENCES profiles(id),
  approved_by_felipe uuid REFERENCES profiles(id),
  approved_by_claudia uuid REFERENCES profiles(id),
  approved_at_edison timestamptz,
  approved_at_felipe timestamptz,
  approved_at_claudia timestamptz,
  created_by uuid REFERENCES profiles(id) NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Internal requests table
CREATE TABLE IF NOT EXISTS internal_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL,
  department text NOT NULL,
  photo_urls text[] DEFAULT '{}',
  measurement_length numeric,
  measurement_height numeric,
  design_urls text[] DEFAULT '{}',
  status task_status DEFAULT 'pending',
  assigned_to uuid REFERENCES profiles(id),
  created_by uuid REFERENCES profiles(id) NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Quotations table
CREATE TABLE IF NOT EXISTS quotations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL,
  quotation_1_url text,
  quotation_2_url text,
  quotation_3_url text,
  quotation_1_amount numeric,
  quotation_2_amount numeric,
  quotation_3_amount numeric,
  quotation_1_provider text,
  quotation_2_provider text,
  quotation_3_provider text,
  status text DEFAULT 'pending',
  reviewed_by uuid REFERENCES profiles(id),
  reviewed_at timestamptz,
  created_by uuid REFERENCES profiles(id) NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  type notification_type NOT NULL,
  reference_id uuid,
  read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_tasks_requester ON tasks(requester_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assignee ON tasks(assignee_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_site ON tasks(site_id);
CREATE INDEX IF NOT EXISTS idx_task_timeline_task ON task_timeline(task_id);
CREATE INDEX IF NOT EXISTS idx_service_orders_site ON service_orders(site_id);
CREATE INDEX IF NOT EXISTS idx_service_orders_contractor ON service_orders(contractor_id);
CREATE INDEX IF NOT EXISTS idx_service_orders_status ON service_orders(status);
CREATE INDEX IF NOT EXISTS idx_measurements_site ON measurements(site_id);
CREATE INDEX IF NOT EXISTS idx_measurements_status ON measurements(status);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
CREATE INDEX IF NOT EXISTS idx_internal_requests_assigned ON internal_requests(assigned_to);
CREATE INDEX IF NOT EXISTS idx_sites_created_by ON sites(created_by);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE contractors ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_timeline ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE measurements ENABLE ROW LEVEL SECURITY;
ALTER TABLE internal_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins can manage all profiles"
  ON profiles FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Sites policies
CREATE POLICY "Users can view all sites"
  ON sites FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Infrastructure and admins can manage sites"
  ON sites FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'infrastructure')
    )
  );

-- Contractors policies
CREATE POLICY "Users can view contractors"
  ON contractors FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Infrastructure and admins can manage contractors"
  ON contractors FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'infrastructure', 'supervision')
    )
  );

-- Tasks policies
CREATE POLICY "Users can view tasks they are involved in"
  ON tasks FOR SELECT
  TO authenticated
  USING (
    requester_id = auth.uid() 
    OR assignee_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'infrastructure', 'supervision')
    )
  );

CREATE POLICY "Users can create tasks"
  ON tasks FOR INSERT
  TO authenticated
  WITH CHECK (requester_id = auth.uid());

CREATE POLICY "Assignees and managers can update tasks"
  ON tasks FOR UPDATE
  TO authenticated
  USING (
    assignee_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'infrastructure', 'supervision')
    )
  )
  WITH CHECK (
    assignee_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'infrastructure', 'supervision')
    )
  );

-- Task timeline policies
CREATE POLICY "Users can view timeline for accessible tasks"
  ON task_timeline FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tasks
      WHERE tasks.id = task_timeline.task_id
      AND (
        tasks.requester_id = auth.uid()
        OR tasks.assignee_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM profiles
          WHERE id = auth.uid() AND role IN ('admin', 'infrastructure', 'supervision')
        )
      )
    )
  );

CREATE POLICY "Users can create timeline entries"
  ON task_timeline FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Service orders policies
CREATE POLICY "Users can view service orders"
  ON service_orders FOR SELECT
  TO authenticated
  USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'infrastructure', 'supervision', 'contractor')
    )
  );

CREATE POLICY "Infrastructure and supervision can manage service orders"
  ON service_orders FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'infrastructure', 'supervision')
    )
  );

-- Measurements policies
CREATE POLICY "Users can view measurements"
  ON measurements FOR SELECT
  TO authenticated
  USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'infrastructure', 'supervision')
    )
  );

CREATE POLICY "Users can create measurements"
  ON measurements FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Approvers can update measurements"
  ON measurements FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'infrastructure', 'supervision')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'infrastructure', 'supervision')
    )
  );

-- Internal requests policies
CREATE POLICY "Users can view own requests or if staff"
  ON internal_requests FOR SELECT
  TO authenticated
  USING (
    created_by = auth.uid()
    OR assigned_to = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'infrastructure')
    )
  );

CREATE POLICY "Users can create internal requests"
  ON internal_requests FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Infrastructure can manage internal requests"
  ON internal_requests FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'infrastructure')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'infrastructure')
    )
  );

-- Quotations policies
CREATE POLICY "Users can view quotations"
  ON quotations FOR SELECT
  TO authenticated
  USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'infrastructure', 'supervision')
    )
  );

CREATE POLICY "Users can create quotations"
  ON quotations FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Supervision can manage quotations"
  ON quotations FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'supervision')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'supervision')
    )
  );

-- Notifications policies
CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "System can create notifications"
  ON notifications FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sites_updated_at BEFORE UPDATE ON sites
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_contractors_updated_at BEFORE UPDATE ON contractors
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_service_orders_updated_at BEFORE UPDATE ON service_orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_measurements_updated_at BEFORE UPDATE ON measurements
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_internal_requests_updated_at BEFORE UPDATE ON internal_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_quotations_updated_at BEFORE UPDATE ON quotations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'internal_client')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
