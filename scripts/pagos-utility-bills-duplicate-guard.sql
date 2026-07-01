-- Evita facturas duplicadas: mismo número de factura, contrato y monto total
--
-- Si falla con ERROR 23505 (duplicados existentes), ejecutar primero:
--   scripts/pagos-utility-bills-deduplicate-and-index.sql

CREATE UNIQUE INDEX IF NOT EXISTS idx_utility_bills_invoice_contract_amount
  ON utility_bills (
    lower(trim(invoice_number)),
    lower(trim(contract_number)),
    total_amount
  )
  WHERE invoice_number IS NOT NULL
    AND contract_number IS NOT NULL
    AND trim(invoice_number) <> ''
    AND trim(contract_number) <> '';

COMMENT ON INDEX idx_utility_bills_invoice_contract_amount IS
  'Bloquea duplicados por número de factura, contrato y monto total';
