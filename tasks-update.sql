-- Actualización del módulo Tasks con todas las características

-- Agregar campos faltantes a tasks
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS project_name text;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS requester_name text;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS request_date date DEFAULT CURRENT_DATE;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS start_date date;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS service_order_date date;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS budget_approval_date date;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS delivery_date date;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS completion_date date;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS initial_photo_url text;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS completion_photo_url text;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS service_order_id uuid;
-- Agregar foreign key constraint si la tabla service_orders existe
-- ALTER TABLE tasks ADD CONSTRAINT tasks_service_order_id_fkey FOREIGN KEY (service_order_id) REFERENCES service_orders(id) ON DELETE SET NULL;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS notification_sent boolean DEFAULT false;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS notification_recipients text[];
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS responsible_id uuid REFERENCES profiles(id) ON DELETE SET NULL;

-- Agregar campo photo_url a task_timeline para almacenar fotos de cada evento
ALTER TABLE task_timeline ADD COLUMN IF NOT EXISTS photo_url text;

-- Actualizar enum de task_type si es necesario (ya existe en el schema inicial)
-- Los tipos de área solicitante: Maquinaria, Repuestos, Bienes inmuebles

-- Índices adicionales
CREATE INDEX IF NOT EXISTS idx_tasks_request_date ON tasks(request_date);
CREATE INDEX IF NOT EXISTS idx_tasks_site_project ON tasks(site_id, project_name);
CREATE INDEX IF NOT EXISTS idx_tasks_status_date ON tasks(status, request_date);

COMMENT ON COLUMN tasks.project_name IS 'Nombre del proyecto (opcional)';
COMMENT ON COLUMN tasks.requester_name IS 'Nombre de quien solicita la tarea';
COMMENT ON COLUMN tasks.request_date IS 'Fecha de solicitud de la tarea';
COMMENT ON COLUMN tasks.start_date IS 'Fecha en que comenzó la tarea';
COMMENT ON COLUMN tasks.service_order_date IS 'Fecha en que se envió la orden de servicio';
COMMENT ON COLUMN tasks.budget_approval_date IS 'Fecha de aprobación del presupuesto';
COMMENT ON COLUMN tasks.delivery_date IS 'Fecha de entrega de la tarea';
COMMENT ON COLUMN tasks.completion_date IS 'Fecha de finalización de la tarea';
COMMENT ON COLUMN tasks.initial_photo_url IS 'Foto inicial cuando comenzó la tarea';
COMMENT ON COLUMN tasks.completion_photo_url IS 'Foto final cuando se completó la tarea';

