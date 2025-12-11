-- Actualizar tabla purchase_orders con campos del formato
-- Basado en el formato PARTEQUIPOS MAQUINARIA S.A.S

-- Agregar campos faltantes del formato
ALTER TABLE purchase_orders 
ADD COLUMN IF NOT EXISTS quotation_attachment_url text, -- URL de cotización adjunta
ADD COLUMN IF NOT EXISTS invoice_attachment_url text, -- URL de factura adjunta
ADD COLUMN IF NOT EXISTS pdf_url text, -- URL del PDF generado
ADD COLUMN IF NOT EXISTS area_code text, -- Código de área (IF REPARACIONES LOCATIVAS)
ADD COLUMN IF NOT EXISTS prepared_by_name text, -- Nombre de quien elaboró
ADD COLUMN IF NOT EXISTS authorized_by_name text, -- Nombre de quien autorizó
ADD COLUMN IF NOT EXISTS prepared_signature_url text, -- Firma de quien elaboró
ADD COLUMN IF NOT EXISTS employee_signature_url text, -- Firma del empleado
ADD COLUMN IF NOT EXISTS prepared_date date, -- Fecha de elaboración
ADD COLUMN IF NOT EXISTS employee_signature_date date, -- Fecha de firma del empleado
ADD COLUMN IF NOT EXISTS tax_type text DEFAULT 'Impuesto ventas', -- Tipo de impuesto
ADD COLUMN IF NOT EXISTS other_taxes decimal(12,2) DEFAULT 0, -- Otros impuestos
ADD COLUMN IF NOT EXISTS company_nit text DEFAULT '830.116.807-7', -- NIT de PARTEQUIPOS
ADD COLUMN IF NOT EXISTS company_phone text DEFAULT '4485878 - 4926260', -- Teléfono de PARTEQUIPOS
ADD COLUMN IF NOT EXISTS erpg_number text, -- Número ERPG (ej: ERPG 542)
ADD COLUMN IF NOT EXISTS service_order_id uuid REFERENCES service_orders(id) ON DELETE SET NULL; -- Relación con orden de servicio

-- Crear función para generar número consecutivo de orden de compra
CREATE OR REPLACE FUNCTION generate_purchase_order_number()
RETURNS text AS $$
DECLARE
  new_number text;
  year_part text;
  last_number integer;
BEGIN
  year_part := TO_CHAR(CURRENT_DATE, 'YYYY');
  
  -- Buscar el último número del año actual
  SELECT COALESCE(MAX(CAST(SUBSTRING(order_number FROM '[0-9]+$') AS INTEGER)), 0)
  INTO last_number
  FROM purchase_orders
  WHERE order_number LIKE year_part || '%';
  
  -- Generar nuevo número: AÑO + número consecutivo (ej: 202512345)
  new_number := year_part || LPAD((last_number + 1)::text, 5, '0');
  
  RETURN new_number;
END;
$$ LANGUAGE plpgsql;

-- Crear índice para búsqueda por número de orden
CREATE INDEX IF NOT EXISTS idx_purchase_orders_order_number_full ON purchase_orders(order_number);

-- Comentarios
COMMENT ON COLUMN purchase_orders.quotation_attachment_url IS 'URL de la cotización adjunta';
COMMENT ON COLUMN purchase_orders.invoice_attachment_url IS 'URL de la factura adjunta';
COMMENT ON COLUMN purchase_orders.area_code IS 'Código de área (ej: IF REPARACIONES LOCATIVAS)';

