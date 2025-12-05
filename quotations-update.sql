-- Actualización del módulo Quotations para comparativo de cotizaciones
-- Este script agrega los campos necesarios para el sistema de comparación

-- Agregar nuevos campos a la tabla quotations
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS tipo_cotizacion text;
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS cantidad numeric(10, 2);
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS formato_contratista text;
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS pdf_comparativo_url text;
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS comparativo_por_monto jsonb;
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS comparativo_por_valor jsonb;
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS comparativo_por_descripcion jsonb;

-- Comentarios para los nuevos campos
COMMENT ON COLUMN quotations.tipo_cotizacion IS 'Tipo de cotización';
COMMENT ON COLUMN quotations.cantidad IS 'Cantidad de la cotización';
COMMENT ON COLUMN quotations.formato_contratista IS 'Formato de contratista';
COMMENT ON COLUMN quotations.pdf_comparativo_url IS 'URL del PDF comparativo generado';
COMMENT ON COLUMN quotations.comparativo_por_monto IS 'Comparativo ordenado por monto';
COMMENT ON COLUMN quotations.comparativo_por_valor IS 'Comparativo ordenado por valor';
COMMENT ON COLUMN quotations.comparativo_por_descripcion IS 'Comparativo ordenado por descripción';

-- Índices para mejorar rendimiento
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_quotations_tipo_cotizacion') THEN
    CREATE INDEX idx_quotations_tipo_cotizacion ON quotations(tipo_cotizacion);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_quotations_status') THEN
    CREATE INDEX idx_quotations_status ON quotations(status);
  END IF;
END $$;

