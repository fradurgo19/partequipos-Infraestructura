-- Relaciona facturas de pagos con sedes del módulo de infraestructura
ALTER TABLE utility_bills
  ADD COLUMN IF NOT EXISTS site_id uuid REFERENCES sites(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_utility_bills_site_id ON utility_bills(site_id);

COMMENT ON COLUMN utility_bills.site_id IS 'Sede de infraestructura asociada por dirección/ubicación';
