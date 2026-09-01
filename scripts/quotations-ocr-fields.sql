-- Campos para conversión imagen → tabla Excel en cotizaciones.
-- Ejecutar en Supabase → SQL Editor → Run.

ALTER TABLE quotations
  ADD COLUMN IF NOT EXISTS ocr_image_url text,
  ADD COLUMN IF NOT EXISTS ocr_table_data jsonb;

COMMENT ON COLUMN quotations.ocr_image_url IS 'Imagen de cotización usada para extracción OCR';
COMMENT ON COLUMN quotations.ocr_table_data IS 'Tabla extraída de la imagen (array de filas)';
