-- Permite el estado "paid" (Pagada) en utility_bills.
-- Ejecutar en Supabase SQL Editor si la columna status tiene restricción CHECK.

ALTER TABLE utility_bills DROP CONSTRAINT IF EXISTS utility_bills_status_check;

ALTER TABLE utility_bills
  ADD CONSTRAINT utility_bills_status_check
  CHECK (status IN ('draft', 'pending', 'approved', 'overdue', 'paid'));

COMMENT ON COLUMN utility_bills.status IS
  'Estado de la factura: draft, pending, approved, overdue, paid (Pagada)';
