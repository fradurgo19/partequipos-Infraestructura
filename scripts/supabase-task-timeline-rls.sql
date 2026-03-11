-- =============================================================================
-- Script: Asegurar política RLS INSERT en task_timeline (evitar 403 al crear tarea)
-- Uso: Ejecutar en Supabase Dashboard → SQL Editor (como owner)
-- =============================================================================

DROP POLICY IF EXISTS "Users can create timeline entries" ON task_timeline;
CREATE POLICY "Users can create timeline entries"
  ON task_timeline FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());
