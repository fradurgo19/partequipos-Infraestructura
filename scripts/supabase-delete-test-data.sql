-- =============================================================================
-- Script: Eliminación de datos de prueba - Supabase
-- Uso: Ejecutar en Supabase Dashboard → SQL Editor (como owner/service role)
-- IMPORTANTE: Esto borra TODOS los datos de las tablas listadas. No borra profiles.
-- Ejecutar solo en entorno de pruebas o antes de pruebas en producción.
-- Si alguna tabla no existe en tu proyecto (ej. contract_addendums), comenta esa línea.
-- =============================================================================

BEGIN;

-- 1. Tablas que referencian a otras (hijos): eliminar primero
DELETE FROM notifications;
DELETE FROM task_timeline;
DELETE FROM contract_tracking;
DELETE FROM contract_addendums;
DELETE FROM measurements;
DELETE FROM quotations;
DELETE FROM purchase_orders;
DELETE FROM internal_requests;

-- 2. Romper referencias circulares entre tasks y service_orders (si existen columnas)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'service_orders' AND column_name = 'task_id'
  ) THEN
    UPDATE service_orders SET task_id = NULL;
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'tasks' AND column_name = 'service_order_id'
  ) THEN
    UPDATE tasks SET service_order_id = NULL;
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'service_orders' AND column_name = 'purchase_order_id'
  ) THEN
    UPDATE service_orders SET purchase_order_id = NULL;
  END IF;
END $$;

-- 3. Órdenes de servicio y tareas
DELETE FROM service_orders;
DELETE FROM tasks;

-- 4. Contratos, contratistas y sedes
DELETE FROM contracts;
DELETE FROM contractors;
DELETE FROM sites;

-- No se elimina: profiles (usuarios). Se conservan para login.

COMMIT;

-- Opcional: reiniciar secuencias de numeración si usas seriales
-- (En este esquema se usan uuid, no es necesario.)

-- =============================================================================
-- Storage (opcional): archivos en el bucket "documents"
-- Eliminar desde Supabase Dashboard → Storage → documents → eliminar objetos
-- o vía API/listado si lo automatizas. No se incluye aquí para evitar borrado accidental.
-- =============================================================================
