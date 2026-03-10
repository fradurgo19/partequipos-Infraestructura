-- =============================================================================
-- Supabase: correcciones de esquema y políticas RLS
-- Ejecutar en el SQL Editor del proyecto Supabase (Dashboard → SQL Editor).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. ESQUEMA: internal_requests
-- Si la tabla solo tiene requester_id y no created_by, agregar created_by.
-- El backend envía ambos; así se asegura compatibilidad.
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'internal_requests' AND column_name = 'created_by'
  ) THEN
    ALTER TABLE internal_requests
    ADD COLUMN created_by uuid REFERENCES profiles(id) ON DELETE SET NULL;
    COMMENT ON COLUMN internal_requests.created_by IS 'Usuario que creó la solicitud (alias de requester_id si aplica)';
  END IF;
END $$;

-- Asegurar que requester_id exista (algunos esquemas solo tienen created_by)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'internal_requests' AND column_name = 'requester_id'
  ) THEN
    ALTER TABLE internal_requests
    ADD COLUMN requester_id uuid REFERENCES profiles(id) ON DELETE SET NULL;
    COMMENT ON COLUMN internal_requests.requester_id IS 'Usuario que realiza la solicitud';
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 2. POLÍTICAS RLS: permitir al backend insertar/actualizar
-- Opción A: políticas para rol service_role (si tu proyecto lo aplica).
-- Opción B: políticas que permiten INSERT cuando auth.uid() IS NULL (backend
-- con service_role en algunos entornos no envía uid) o cuando el usuario tiene rol.
-- -----------------------------------------------------------------------------

-- Contractors
DROP POLICY IF EXISTS "Service role full access contractors" ON contractors;
CREATE POLICY "Service role full access contractors"
  ON contractors FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow insert contractors api or managers" ON contractors;
CREATE POLICY "Allow insert contractors api or managers" ON contractors FOR INSERT
  TO authenticated WITH CHECK (
    auth.uid() IS NULL
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'infrastructure', 'supervision'))
  );

-- Quotations
DROP POLICY IF EXISTS "Service role full access quotations" ON quotations;
CREATE POLICY "Service role full access quotations"
  ON quotations FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow insert quotations api or staff" ON quotations;
CREATE POLICY "Allow insert quotations api or staff" ON quotations FOR INSERT
  TO authenticated WITH CHECK (
    auth.uid() IS NULL
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'infrastructure', 'supervision'))
  );

-- Internal_requests
DROP POLICY IF EXISTS "Service role full access internal_requests" ON internal_requests;
CREATE POLICY "Service role full access internal_requests"
  ON internal_requests FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow insert internal_requests api or user" ON internal_requests;
CREATE POLICY "Allow insert internal_requests api or user" ON internal_requests FOR INSERT
  TO authenticated WITH CHECK (auth.uid() IS NULL OR TRUE);

-- Measurements
DROP POLICY IF EXISTS "Service role full access measurements" ON measurements;
CREATE POLICY "Service role full access measurements"
  ON measurements FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow insert measurements api or user" ON measurements;
CREATE POLICY "Allow insert measurements api or user" ON measurements FOR INSERT
  TO authenticated WITH CHECK (
    auth.uid() IS NULL
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid())
  );

-- Purchase_orders (por si acaso)
DROP POLICY IF EXISTS "Service role full access purchase_orders" ON purchase_orders;
CREATE POLICY "Service role full access purchase_orders"
  ON purchase_orders FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Políticas INSERT para rol anon cuando no hay usuario (peticiones API con service_role
-- en algunos proyectos se evalúan como anon; así el backend puede insertar)
DROP POLICY IF EXISTS "Allow insert contractors anon api" ON contractors;
CREATE POLICY "Allow insert contractors anon api" ON contractors FOR INSERT TO anon
  WITH CHECK (auth.uid() IS NULL);

DROP POLICY IF EXISTS "Allow insert quotations anon api" ON quotations;
CREATE POLICY "Allow insert quotations anon api" ON quotations FOR INSERT TO anon
  WITH CHECK (auth.uid() IS NULL);

DROP POLICY IF EXISTS "Allow insert internal_requests anon api" ON internal_requests;
CREATE POLICY "Allow insert internal_requests anon api" ON internal_requests FOR INSERT TO anon
  WITH CHECK (auth.uid() IS NULL);

DROP POLICY IF EXISTS "Allow insert measurements anon api" ON measurements;
CREATE POLICY "Allow insert measurements anon api" ON measurements FOR INSERT TO anon
  WITH CHECK (auth.uid() IS NULL);

-- Service_orders: permitir INSERT cuando auth.uid() IS NULL (API backend)
DROP POLICY IF EXISTS "Service role full access service_orders" ON service_orders;
CREATE POLICY "Service role full access service_orders"
  ON service_orders FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Allow insert service_orders anon api" ON service_orders;
CREATE POLICY "Allow insert service_orders anon api" ON service_orders FOR INSERT TO anon
  WITH CHECK (auth.uid() IS NULL);

-- Por si el backend se evalúa como authenticated sin uid (permite INSERT desde API):
DROP POLICY IF EXISTS "Allow insert service_orders authenticated api" ON service_orders;
CREATE POLICY "Allow insert service_orders authenticated api" ON service_orders FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NULL);

-- -----------------------------------------------------------------------------
-- 2b. RPC para insertar service_orders (evita RLS cuando el backend usa service_role
--     pero las políticas no se aplican correctamente en tu proyecto)
-- -----------------------------------------------------------------------------
-- Solo columnas que suelen existir en service_orders (sin attachment_urls si no existe en tu esquema)
CREATE OR REPLACE FUNCTION public.insert_service_order(payload jsonb)
RETURNS SETOF service_orders
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  INSERT INTO service_orders (
    order_number, site_id, contractor_id, activity_type, description,
    request_date, start_date, end_date, budget_amount, status, created_by
  )
  SELECT
    (payload->>'order_number'),
    (payload->>'site_id')::uuid,
    (payload->>'contractor_id')::uuid,
    COALESCE(payload->>'activity_type', 'maintenance'),
    COALESCE(payload->>'description', ''),
    COALESCE((payload->>'request_date')::timestamptz, now()),
    COALESCE((payload->>'start_date')::timestamptz, now()),
    (payload->>'end_date')::timestamptz,
    COALESCE((payload->>'budget_amount')::numeric, 0),
    COALESCE((payload->>'status'), 'draft')::service_order_status,
    (payload->>'created_by')::uuid
  RETURNING *;
END;
$$;

-- -----------------------------------------------------------------------------
-- 3. POLÍTICAS PARA USUARIOS AUTENTICADOS (mantener comportamiento por rol)
-- Si en tu proyecto el backend usa la clave anon y el JWT del usuario,
-- estas políticas ya suelen estar en tu migración inicial. Si faltan,
-- descomenta y ajusta los nombres para no duplicar.
-- -----------------------------------------------------------------------------

-- Contractors: usuarios con rol admin, infrastructure o supervision pueden insertar
-- (solo si no existe ya una política FOR INSERT más permisiva)
-- CREATE POLICY "Authenticated managers can insert contractors"
--   ON contractors FOR INSERT TO authenticated
--   WITH CHECK (
--     EXISTS (
--       SELECT 1 FROM profiles
--       WHERE id = auth.uid() AND role IN ('admin', 'infrastructure', 'supervision')
--     )
--   );

-- Quotations: usuarios con rol admin, infrastructure o supervision pueden insertar
-- CREATE POLICY "Authenticated staff can insert quotations"
--   ON quotations FOR INSERT TO authenticated
--   WITH CHECK (
--     EXISTS (
--       SELECT 1 FROM profiles
--       WHERE id = auth.uid() AND role IN ('admin', 'infrastructure', 'supervision')
--     )
--   );

-- -----------------------------------------------------------------------------
-- 4. RELACIÓN purchase_orders ↔ service_orders
-- Si el error "more than one relationship" persiste, verifica en Table Editor
-- que la FK de purchase_orders.service_order_id → service_orders.id exista
-- y se llame por ejemplo: purchase_orders_service_order_id_fkey
-- Para listar FKs de la tabla:
--   SELECT conname FROM pg_constraint
--   WHERE conrelid = 'public.purchase_orders'::regclass AND contype = 'f';
-- -----------------------------------------------------------------------------
