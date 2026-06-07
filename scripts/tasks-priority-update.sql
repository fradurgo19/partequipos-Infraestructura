-- Prioridad de tareas: EMERGENCIA, ALTA, MEDIA, BAJA
-- Ejecutar en Supabase SQL Editor

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS priority text NOT NULL DEFAULT 'medium';

ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_priority_check;
ALTER TABLE tasks ADD CONSTRAINT tasks_priority_check
  CHECK (priority IN ('emergency', 'high', 'medium', 'low'));

CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);

COMMENT ON COLUMN tasks.priority IS 'Prioridad: emergency=EMERGENCIA, high=ALTA, medium=MEDIA, low=BAJA';
