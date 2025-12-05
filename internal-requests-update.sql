-- Actualización del módulo Internal Requests
-- Este script agrega los campos necesarios para el sistema de solicitudes internas

-- Agregar nuevos campos a la tabla internal_requests
ALTER TABLE internal_requests ADD COLUMN IF NOT EXISTS site_id uuid REFERENCES sites(id) ON DELETE SET NULL;
ALTER TABLE internal_requests ADD COLUMN IF NOT EXISTS request_date date DEFAULT CURRENT_DATE;
ALTER TABLE internal_requests ADD COLUMN IF NOT EXISTS measurement_depth numeric;
ALTER TABLE internal_requests ADD COLUMN IF NOT EXISTS task_id uuid REFERENCES tasks(id) ON DELETE SET NULL;
-- Verificar si requester_id existe, si no, agregarlo
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'internal_requests' AND column_name = 'requester_id'
  ) THEN
    ALTER TABLE internal_requests ADD COLUMN requester_id uuid REFERENCES profiles(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Actualizar campo department para que sea más específico
-- Ya existe, solo agregamos comentario
COMMENT ON COLUMN internal_requests.site_id IS 'Sede donde se realiza la solicitud';
COMMENT ON COLUMN internal_requests.request_date IS 'Fecha de solicitud (se alinea con fecha de solicitud de tarea)';
COMMENT ON COLUMN internal_requests.measurement_depth IS 'Profundidad en metros';
COMMENT ON COLUMN internal_requests.task_id IS 'Tarea generada automáticamente para infraestructura';
COMMENT ON COLUMN internal_requests.requester_id IS 'Usuario que realiza la solicitud';

-- Renombrar campos de medidas si es necesario (verificar estructura actual)
-- measurement_length y measurement_height ya existen

-- Índices para mejorar rendimiento
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_internal_requests_site_id') THEN
    CREATE INDEX idx_internal_requests_site_id ON internal_requests(site_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_internal_requests_task_id') THEN
    CREATE INDEX idx_internal_requests_task_id ON internal_requests(task_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_internal_requests_requester_id') THEN
    CREATE INDEX idx_internal_requests_requester_id ON internal_requests(requester_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_internal_requests_request_date') THEN
    CREATE INDEX idx_internal_requests_request_date ON internal_requests(request_date);
  END IF;
END $$;

