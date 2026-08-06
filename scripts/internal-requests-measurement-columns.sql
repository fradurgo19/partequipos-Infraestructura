-- Columnas de medidas y adjuntos para solicitudes internas (formulario público e interno).
-- Ejecutar en Supabase SQL Editor.

ALTER TABLE internal_requests ADD COLUMN IF NOT EXISTS measurement_length numeric;
ALTER TABLE internal_requests ADD COLUMN IF NOT EXISTS measurement_height numeric;
ALTER TABLE internal_requests ADD COLUMN IF NOT EXISTS measurement_depth numeric;
ALTER TABLE internal_requests ADD COLUMN IF NOT EXISTS photo_urls text[] DEFAULT '{}';
ALTER TABLE internal_requests ADD COLUMN IF NOT EXISTS design_urls text[] DEFAULT '{}';
ALTER TABLE internal_requests ADD COLUMN IF NOT EXISTS site_id uuid REFERENCES sites(id) ON DELETE SET NULL;
ALTER TABLE internal_requests ADD COLUMN IF NOT EXISTS request_date date DEFAULT CURRENT_DATE;
ALTER TABLE internal_requests ADD COLUMN IF NOT EXISTS requester_name text;

COMMENT ON COLUMN internal_requests.measurement_length IS 'Longitud en metros';
COMMENT ON COLUMN internal_requests.measurement_height IS 'Altura en metros';
COMMENT ON COLUMN internal_requests.measurement_depth IS 'Profundidad en metros';
COMMENT ON COLUMN internal_requests.photo_urls IS 'URLs de fotos adjuntas';
COMMENT ON COLUMN internal_requests.design_urls IS 'URLs de diseños adjuntos';
COMMENT ON COLUMN internal_requests.site_id IS 'Sede donde se realiza la solicitud';
COMMENT ON COLUMN internal_requests.request_date IS 'Fecha de solicitud';
COMMENT ON COLUMN internal_requests.requester_name IS 'Nombre de quien solicita';

-- Refrescar schema cache de PostgREST (Supabase)
NOTIFY pgrst, 'reload schema';
