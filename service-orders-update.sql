-- Actualización del módulo Service Orders con todas las características
-- Ajustado para la estructura real de la tabla

-- Agregar request_date si no existe (fecha de solicitud)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'service_orders' AND column_name = 'request_date'
  ) THEN
    ALTER TABLE service_orders ADD COLUMN request_date date DEFAULT CURRENT_DATE;
  END IF;
END $$;

-- Agregar campos nuevos
ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS task_id uuid REFERENCES tasks(id) ON DELETE SET NULL;
ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS requester_id uuid REFERENCES profiles(id) ON DELETE SET NULL;
ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS executor_id uuid REFERENCES profiles(id) ON DELETE SET NULL;
ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS oco_date date; -- Fecha OCO (autorizaciones y pagos)
ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS actual_amount numeric(15, 2); -- Monto ejecutado
ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS activities text[]; -- Lista de actividades seleccionadas
ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS purchase_order_id uuid REFERENCES purchase_orders(id) ON DELETE SET NULL;
ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS response_time_hours integer; -- Tiempo de respuesta en horas
ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS execution_time_hours integer; -- Tiempo de ejecución en horas

-- Crear función para generar número consecutivo por sede
CREATE OR REPLACE FUNCTION generate_service_order_number(site_uuid uuid)
RETURNS text AS $$
DECLARE
  site_code text;
  next_number integer;
  order_num text;
BEGIN
  -- Obtener código de la sede (primeras 3 letras del nombre)
  SELECT UPPER(SUBSTRING(name FROM 1 FOR 3)) INTO site_code
  FROM sites WHERE id = site_uuid;
  
  -- Si no hay código, usar 'SED'
  IF site_code IS NULL OR site_code = '' THEN
    site_code := 'SED';
  END IF;
  
  -- Obtener el siguiente número consecutivo para esta sede
  SELECT COALESCE(MAX(CAST(SUBSTRING(order_number FROM LENGTH(site_code) + 2) AS INTEGER)), 0) + 1
  INTO next_number
  FROM service_orders
  WHERE site_id = site_uuid
  AND order_number LIKE site_code || '-%';
  
  -- Formatear número: SED-001, SED-002, etc.
  order_num := site_code || '-' || LPAD(next_number::text, 3, '0');
  
  RETURN order_num;
END;
$$ LANGUAGE plpgsql;

-- Funciones para calcular tiempos (opcionales, para uso manual si es necesario)
-- Ajustadas para trabajar con campos date
CREATE OR REPLACE FUNCTION calculate_response_time(order_id uuid)
RETURNS integer AS $$
DECLARE
  request_dt date;
  start_dt date;
  hours_diff integer;
BEGIN
  SELECT request_date, start_date
  INTO request_dt, start_dt
  FROM service_orders
  WHERE id = order_id;
  
  IF request_dt IS NOT NULL AND start_dt IS NOT NULL THEN
    hours_diff := EXTRACT(EPOCH FROM (start_dt::timestamp - request_dt::timestamp)) / 3600;
    RETURN hours_diff;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION calculate_execution_time(order_id uuid)
RETURNS integer AS $$
DECLARE
  start_dt date;
  end_dt date;
  hours_diff integer;
BEGIN
  SELECT start_date, end_date
  INTO start_dt, end_dt
  FROM service_orders
  WHERE id = order_id;
  
  IF start_dt IS NOT NULL AND end_dt IS NOT NULL THEN
    hours_diff := EXTRACT(EPOCH FROM (end_dt::timestamp - start_dt::timestamp)) / 3600;
    RETURN hours_diff;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar tiempos automáticamente
-- Ajustado para trabajar con campos date en lugar de timestamptz
CREATE OR REPLACE FUNCTION update_service_order_times()
RETURNS TRIGGER AS $$
DECLARE
  hours_diff integer;
BEGIN
  -- Calcular tiempo de respuesta (desde request_date hasta start_date)
  -- Como son campos date, calculamos días y convertimos a horas
  IF NEW.start_date IS NOT NULL AND NEW.request_date IS NOT NULL THEN
    hours_diff := EXTRACT(EPOCH FROM (NEW.start_date::timestamp - NEW.request_date::timestamp)) / 3600;
    NEW.response_time_hours := hours_diff;
  ELSE
    NEW.response_time_hours := NULL;
  END IF;
  
  -- Calcular tiempo de ejecución (desde start_date hasta end_date)
  IF NEW.start_date IS NOT NULL AND NEW.end_date IS NOT NULL THEN
    hours_diff := EXTRACT(EPOCH FROM (NEW.end_date::timestamp - NEW.start_date::timestamp)) / 3600;
    NEW.execution_time_hours := hours_diff;
  ELSE
    NEW.execution_time_hours := NULL;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Eliminar trigger si existe
DROP TRIGGER IF EXISTS update_service_order_times_trigger ON service_orders;

CREATE TRIGGER update_service_order_times_trigger
BEFORE INSERT OR UPDATE ON service_orders
FOR EACH ROW
EXECUTE FUNCTION update_service_order_times();

-- Índices adicionales
CREATE INDEX IF NOT EXISTS idx_service_orders_task_id ON service_orders(task_id);
CREATE INDEX IF NOT EXISTS idx_service_orders_site_order_number ON service_orders(site_id, order_number);
CREATE INDEX IF NOT EXISTS idx_service_orders_purchase_order_id ON service_orders(purchase_order_id);
-- Índice para request_date (se crea después de agregar la columna)
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'service_orders' AND column_name = 'request_date'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_service_orders_request_date ON service_orders(request_date);
  END IF;
END $$;

-- Vista para conteo de órdenes por sede
CREATE OR REPLACE VIEW service_orders_by_site AS
SELECT 
  s.id as site_id,
  s.name as site_name,
  COUNT(so.id) as total_orders,
  COUNT(CASE WHEN so.status = 'completed' THEN 1 END) as completed_orders,
  COUNT(CASE WHEN so.status = 'in_progress' THEN 1 END) as in_progress_orders,
  COUNT(CASE WHEN so.status = 'pending_approval' THEN 1 END) as pending_orders,
  SUM(so.budget_amount) as total_budget,
  SUM(so.actual_amount) as total_actual
FROM sites s
LEFT JOIN service_orders so ON s.id = so.site_id
GROUP BY s.id, s.name
ORDER BY s.name;

COMMENT ON COLUMN service_orders.task_id IS 'Tarea relacionada que generó esta orden de servicio';
COMMENT ON COLUMN service_orders.requester_id IS 'Usuario que solicitó el servicio';
COMMENT ON COLUMN service_orders.executor_id IS 'Usuario que ejecuta el servicio';
COMMENT ON COLUMN service_orders.oco_date IS 'Fecha OCO (autorizaciones y pagos)';
COMMENT ON COLUMN service_orders.actual_amount IS 'Monto ejecutado (vs presupuesto)';
COMMENT ON COLUMN service_orders.activities IS 'Lista de actividades seleccionadas';
COMMENT ON COLUMN service_orders.purchase_order_id IS 'Orden de compra relacionada';
COMMENT ON COLUMN service_orders.response_time_hours IS 'Tiempo de respuesta en horas';
COMMENT ON COLUMN service_orders.execution_time_hours IS 'Tiempo de ejecución en horas';

