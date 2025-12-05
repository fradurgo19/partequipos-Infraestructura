-- Actualización del módulo Measurements para implementar Cortes
-- Este script agrega todos los campos necesarios para el sistema de cortes

-- Agregar nuevos campos a la tabla measurements
ALTER TABLE measurements ADD COLUMN IF NOT EXISTS task_id uuid REFERENCES tasks(id) ON DELETE SET NULL;
ALTER TABLE measurements ADD COLUMN IF NOT EXISTS measurement_unit text;
-- Agregar constraint después de crear la columna
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'measurements_measurement_unit_check'
  ) THEN
    ALTER TABLE measurements ADD CONSTRAINT measurements_measurement_unit_check 
    CHECK (measurement_unit IN ('m', 'm²', 'm³') OR measurement_unit IS NULL);
  END IF;
END $$;
ALTER TABLE measurements ADD COLUMN IF NOT EXISTS activities text;
ALTER TABLE measurements ADD COLUMN IF NOT EXISTS globales text;
ALTER TABLE measurements ADD COLUMN IF NOT EXISTS admin_hours numeric(10, 2);
ALTER TABLE measurements ADD COLUMN IF NOT EXISTS observations text;
ALTER TABLE measurements ADD COLUMN IF NOT EXISTS how_to_do text;
ALTER TABLE measurements ADD COLUMN IF NOT EXISTS cut_value numeric(15, 2);
ALTER TABLE measurements ADD COLUMN IF NOT EXISTS edison_signature_url text;
ALTER TABLE measurements ADD COLUMN IF NOT EXISTS pdf_url text;
ALTER TABLE measurements ADD COLUMN IF NOT EXISTS photo_height_url text;
ALTER TABLE measurements ADD COLUMN IF NOT EXISTS photo_length_url text;
ALTER TABLE measurements ADD COLUMN IF NOT EXISTS photo_width_url text;
ALTER TABLE measurements ADD COLUMN IF NOT EXISTS photo_general_url text;
ALTER TABLE measurements ADD COLUMN IF NOT EXISTS width numeric; -- Ancho para m² y m³
ALTER TABLE measurements ADD COLUMN IF NOT EXISTS submitted_at timestamptz; -- Fecha de cierre del registro

-- Agregar campo para guardar PDFs de cortes en sites
ALTER TABLE sites ADD COLUMN IF NOT EXISTS cut_pdf_urls text[] DEFAULT '{}';

-- Comentarios para los nuevos campos
COMMENT ON COLUMN measurements.task_id IS 'Tarea asociada al corte';
COMMENT ON COLUMN measurements.measurement_unit IS 'Unidad de medida: m (metros lineales), m² (metros cuadrados), m³ (metros cúbicos)';
COMMENT ON COLUMN measurements.activities IS 'Actividades realizadas en el corte';
COMMENT ON COLUMN measurements.globales IS 'Información global del corte';
COMMENT ON COLUMN measurements.admin_hours IS 'Horas por administración';
COMMENT ON COLUMN measurements.observations IS 'Observaciones del corte';
COMMENT ON COLUMN measurements.how_to_do IS 'Cómo se realiza el corte';
COMMENT ON COLUMN measurements.cut_value IS 'Valor del corte para aprobación';
COMMENT ON COLUMN measurements.edison_signature_url IS 'URL de la firma digital de Edison';
COMMENT ON COLUMN measurements.pdf_url IS 'URL del PDF del corte generado';
COMMENT ON COLUMN measurements.photo_height_url IS 'URL de la foto de altura';
COMMENT ON COLUMN measurements.photo_length_url IS 'URL de la foto de longitud';
COMMENT ON COLUMN measurements.photo_width_url IS 'URL de la foto de ancho';
COMMENT ON COLUMN measurements.photo_general_url IS 'URL de la foto general';
COMMENT ON COLUMN measurements.width IS 'Ancho para cálculos de m² y m³';
COMMENT ON COLUMN measurements.submitted_at IS 'Fecha de cierre del registro del corte';
COMMENT ON COLUMN sites.cut_pdf_urls IS 'URLs de los PDFs de cortes guardados en la sede';

-- Índices para mejorar rendimiento (solo crear si no existen)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_measurements_task_id') THEN
    CREATE INDEX idx_measurements_task_id ON measurements(task_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_measurements_site_id') THEN
    CREATE INDEX idx_measurements_site_id ON measurements(site_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_measurements_status') THEN
    CREATE INDEX idx_measurements_status ON measurements(status);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_measurements_cut_value') THEN
    CREATE INDEX idx_measurements_cut_value ON measurements(cut_value);
  END IF;
END $$;

