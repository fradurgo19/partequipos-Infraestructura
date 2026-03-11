-- =============================================================================
-- Script: Crear buckets de Storage en Supabase
-- Uso: Ejecutar en Supabase Dashboard → SQL Editor (como owner)
-- Requerido para: Sedes (fotos/planos), Solicitudes Internas, Órdenes de Servicio
-- =============================================================================

-- Crear buckets solo si no existen (evita error de clave duplicada)
INSERT INTO storage.buckets (id, name, public)
SELECT 'general', 'general', true
WHERE NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'general');

INSERT INTO storage.buckets (id, name, public)
SELECT 'service-orders', 'service-orders', true
WHERE NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'service-orders');

INSERT INTO storage.buckets (id, name, public)
SELECT 'documents', 'documents', true
WHERE NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'documents');

-- Políticas para bucket "general" (Sedes: fotos y planos; Solicitudes internas)
DROP POLICY IF EXISTS "general_select" ON storage.objects;
CREATE POLICY "general_select"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'general');

DROP POLICY IF EXISTS "general_insert" ON storage.objects;
CREATE POLICY "general_insert"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'general');

DROP POLICY IF EXISTS "general_update" ON storage.objects;
CREATE POLICY "general_update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'general');

DROP POLICY IF EXISTS "general_delete" ON storage.objects;
CREATE POLICY "general_delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'general');

-- Políticas para bucket "service-orders"
DROP POLICY IF EXISTS "service_orders_select" ON storage.objects;
CREATE POLICY "service_orders_select"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'service-orders');

DROP POLICY IF EXISTS "service_orders_insert" ON storage.objects;
CREATE POLICY "service_orders_insert"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'service-orders');

DROP POLICY IF EXISTS "service_orders_update" ON storage.objects;
CREATE POLICY "service_orders_update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'service-orders');

DROP POLICY IF EXISTS "service_orders_delete" ON storage.objects;
CREATE POLICY "service_orders_delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'service-orders');

-- Políticas para bucket "documents" (Cotizaciones, Mediciones, Órdenes de compra)
DROP POLICY IF EXISTS "documents_select" ON storage.objects;
CREATE POLICY "documents_select"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'documents');

DROP POLICY IF EXISTS "documents_insert" ON storage.objects;
CREATE POLICY "documents_insert"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'documents');

DROP POLICY IF EXISTS "documents_update" ON storage.objects;
CREATE POLICY "documents_update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'documents');

DROP POLICY IF EXISTS "documents_delete" ON storage.objects;
CREATE POLICY "documents_delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'documents');
