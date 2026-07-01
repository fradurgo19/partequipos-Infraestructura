-- =============================================================================
-- Pagos: limpiar facturas duplicadas y crear índice único
-- Ejecutar en Supabase → SQL Editor
--
-- Criterio de duplicado: mismo invoice_number + contract_number + total_amount
-- Se conserva la factura más antigua (created_at) y se eliminan las copias.
-- =============================================================================

-- 1) REVISAR duplicados antes de borrar (opcional)
SELECT
  lower(trim(invoice_number)) AS invoice_key,
  lower(trim(contract_number)) AS contract_key,
  total_amount,
  COUNT(*) AS copies,
  array_agg(id ORDER BY created_at ASC) AS bill_ids,
  MIN(created_at) AS first_created
FROM utility_bills
WHERE invoice_number IS NOT NULL
  AND contract_number IS NOT NULL
  AND trim(invoice_number) <> ''
  AND trim(contract_number) <> ''
GROUP BY 1, 2, 3
HAVING COUNT(*) > 1
ORDER BY copies DESC, first_created;

-- 2) LIMPIAR duplicados (conserva el registro más antiguo por grupo)
BEGIN;

WITH ranked_bills AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY
        lower(trim(invoice_number)),
        lower(trim(contract_number)),
        total_amount
      ORDER BY created_at ASC, id ASC
    ) AS row_num
  FROM utility_bills
  WHERE invoice_number IS NOT NULL
    AND contract_number IS NOT NULL
    AND trim(invoice_number) <> ''
    AND trim(contract_number) <> ''
),
duplicate_bill_ids AS (
  SELECT id FROM ranked_bills WHERE row_num > 1
)
DELETE FROM bill_consumptions
WHERE bill_id IN (SELECT id FROM duplicate_bill_ids);

WITH ranked_bills AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY
        lower(trim(invoice_number)),
        lower(trim(contract_number)),
        total_amount
      ORDER BY created_at ASC, id ASC
    ) AS row_num
  FROM utility_bills
  WHERE invoice_number IS NOT NULL
    AND contract_number IS NOT NULL
    AND trim(invoice_number) <> ''
    AND trim(contract_number) <> ''
),
duplicate_bill_ids AS (
  SELECT id FROM ranked_bills WHERE row_num > 1
)
DELETE FROM utility_bills
WHERE id IN (SELECT id FROM duplicate_bill_ids);

COMMIT;

-- 3) CREAR índice único (solo funciona si ya no hay duplicados)
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
