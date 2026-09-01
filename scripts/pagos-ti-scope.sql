-- Alcance TI para facturas y usuarios del módulo Pagos.
-- Ejecutar en Supabase → SQL Editor → Run.

ALTER TABLE pagos_profiles
  ADD COLUMN IF NOT EXISTS is_ti boolean NOT NULL DEFAULT false;

ALTER TABLE utility_bills
  ADD COLUMN IF NOT EXISTS is_ti boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_pagos_profiles_is_ti ON pagos_profiles(is_ti);
CREATE INDEX IF NOT EXISTS idx_utility_bills_is_ti ON utility_bills(is_ti);

COMMENT ON COLUMN pagos_profiles.is_ti IS 'Usuario del área de TI con gestión aislada de facturas';
COMMENT ON COLUMN utility_bills.is_ti IS 'Factura registrada por el área de TI';

-- 2) Marcar usuario(s) de TI (reemplace el correo antes de ejecutar):
-- UPDATE pagos_profiles
-- SET is_ti = true
-- WHERE email = 'usuario.ti@partequipos.com';

-- Verificar:
-- SELECT id, email, full_name, role, is_ti FROM pagos_profiles WHERE is_ti = true;
