-- Ciudad SIBERIA → TENJO; ubicación canónica "Lote Siberia".
-- Corrige también CISNEROS con location "Lote" → FINCA EL ZARZAL.
-- Compatible con Supabase SQL Editor. Idempotente. Run completo.

-- 1) Ciudad SIBERIA → TENJO
UPDATE utility_bills
SET city = 'TENJO'
WHERE city ILIKE 'SIBERIA';

-- 2) TENJO: Lote / LOTE SIBERIA → Lote Siberia
UPDATE utility_bills
SET location = 'Lote Siberia'
WHERE city ILIKE 'TENJO'
  AND (
    upper(trim(both FROM location)) IN ('LOTE', 'LOTE SIBERIA', 'LOTE TENJO', 'LOTE SIBERIA')
    OR location ILIKE 'Lote Siberia%'
    OR location ILIKE 'LOTE SIBERIA%'
  );

-- 3) CISNEROS: location genérica "Lote" → FINCA EL ZARZAL
UPDATE utility_bills
SET location = 'FINCA EL ZARZAL'
WHERE city ILIKE 'CISNEROS'
  AND upper(trim(both FROM location)) = 'LOTE';

-- 4) sites: ciudad
UPDATE sites
SET city = 'TENJO'
WHERE city ILIKE 'SIBERIA';

-- 5) sites: TENJO / Siberia → Lote Siberia
UPDATE sites
SET
  city = 'TENJO',
  location = 'Lote Siberia',
  name = CASE
    WHEN name ILIKE 'Lote'
      OR name ILIKE 'LOTE'
      OR name ILIKE '%SIBERIA%'
      OR name ILIKE '%TENJO%'
      THEN 'Lote Siberia'
    ELSE name
  END
WHERE
  city ILIKE 'TENJO'
  OR city ILIKE 'SIBERIA'
  OR location ILIKE '%SIBERIA%'
  OR name ILIKE '%SIBERIA%'
  OR (
    upper(trim(both FROM coalesce(location, ''))) IN ('LOTE', 'LOTE SIBERIA', 'LOTE TENJO')
    AND (city ILIKE 'TENJO' OR city ILIKE 'SIBERIA' OR city IS NULL)
  );

-- 6) sites: CISNEROS con Lote → FINCA EL ZARZAL
UPDATE sites
SET
  city = 'CISNEROS',
  location = 'FINCA EL ZARZAL',
  name = CASE
    WHEN name ILIKE 'Lote' OR name ILIKE 'LOTE' THEN 'Finca el Zarzal'
    ELSE name
  END
WHERE
  city ILIKE 'CISNEROS'
  AND upper(trim(both FROM coalesce(location, ''))) = 'LOTE';

-- Verificación
SELECT city, location, COUNT(*) AS facturas
FROM utility_bills
WHERE city ILIKE 'TENJO'
   OR city ILIKE 'SIBERIA'
   OR city ILIKE 'CISNEROS'
   OR location ILIKE '%SIBERIA%'
   OR location ILIKE '%ZARZAL%'
   OR upper(trim(both FROM location)) = 'LOTE'
GROUP BY city, location
ORDER BY city, location;
