-- Renombra sede URRAO: Lote Urrao / LOTE URRAO → FINCA URRAO (Finca Urrao).
-- Compatible con Supabase SQL Editor (sin tablas temporales).
-- Idempotente. Ejecutar en Supabase → SQL Editor → Run.

-- 1) Facturas (utility_bills.location)
UPDATE utility_bills
SET location = 'FINCA URRAO'
WHERE
  city ILIKE 'URRAO'
  OR upper(trim(both FROM location)) IN (
    'LOTE URRAO',
    'LOTE DE URRAO',
    'FINCA URRAO',
    'LOTE'
  )
    AND (
      city ILIKE 'URRAO'
      OR location ILIKE '%URRAO%'
    );

-- Ajuste más seguro solo por ciudad URRAO + variantes de lote/finca
UPDATE utility_bills
SET location = 'FINCA URRAO'
WHERE city ILIKE 'URRAO'
  AND (
    location ILIKE '%LOTE%URRAO%'
    OR location ILIKE '%FINCA%URRAO%'
    OR upper(trim(both FROM location)) IN ('LOTE', 'LOTE URRAO', 'LOTE DE URRAO', 'FINCA URRAO')
    OR location ILIKE 'Lote Urrao%'
    OR location ILIKE 'Lote de Urrao%'
  );

-- Cualquier location que mencione Lote + Urrao aunque city varíe
UPDATE utility_bills
SET
  city = 'URRAO',
  location = 'FINCA URRAO'
WHERE
  location ILIKE '%LOTE%URRAO%'
  OR location ILIKE 'Lote Urrao%'
  OR location ILIKE 'Lote de Urrao%'
  OR upper(trim(both FROM location)) = 'LOTE URRAO';

-- 2) Tabla sites (si existe sede con ese nombre/ubicación)
UPDATE sites
SET
  name = CASE
    WHEN name ILIKE '%LOTE%URRAO%' OR name ILIKE 'Lote Urrao%' OR name ILIKE 'Lote de Urrao%'
      THEN 'Finca Urrao'
    ELSE name
  END,
  location = CASE
    WHEN location ILIKE '%LOTE%URRAO%'
      OR location ILIKE 'Lote Urrao%'
      OR location ILIKE 'Lote de Urrao%'
      OR upper(trim(both FROM coalesce(location, ''))) = 'LOTE URRAO'
      THEN 'FINCA URRAO'
    ELSE location
  END
WHERE
  name ILIKE '%URRAO%'
  OR location ILIKE '%URRAO%'
  OR city ILIKE 'URRAO';

-- Verificación
SELECT city, location, COUNT(*) AS facturas
FROM utility_bills
WHERE city ILIKE 'URRAO' OR location ILIKE '%URRAO%'
GROUP BY city, location
ORDER BY city, location;

SELECT id, name, city, location
FROM sites
WHERE name ILIKE '%URRAO%' OR location ILIKE '%URRAO%' OR city ILIKE 'URRAO'
ORDER BY name;
