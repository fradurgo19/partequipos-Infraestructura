-- Renombra sede Guarne Maquinaria → Guarne en utility_bills y sites.
-- Además: asigna city = GUARNE a sedes de Guarne que la tienen NULL.
-- Compatible con Supabase SQL Editor (sin tablas temporales).
-- Idempotente. Ejecutar en Supabase → SQL Editor → Run.

-- 1) Facturas: variantes de Guarne Maquinaria / sede KM26 maquinaria
UPDATE utility_bills
SET
  city = 'GUARNE',
  location = 'Guarne'
WHERE
  location ILIKE 'Guarne Maquinaria%'
  OR upper(trim(both FROM location)) IN (
    'GUARNE MAQUINARIA',
    'GUARNE REPUESTOS',
    'GUARNE'
  )
  OR upper(trim(both FROM location)) IN (
    'KM26+800 MTS AUT. MED-BOGOTA',
    'KM26+800 MTS AUT. MED. B'
  )
  OR location ILIKE 'KM26+800%AUT%MED%'
  OR (
    location ILIKE '%MAQUINARIA GUARNE%KM26%'
    AND location NOT ILIKE '%BELLAVISTA%'
    AND location NOT ILIKE '%CASA NUEVA%'
  )
  OR location ILIKE 'Guarne Repuestos%';

-- 2) Tabla sites: renombrar Guarne Maquinaria → Guarne (ubicación canónica)
UPDATE sites
SET
  name = CASE
    WHEN name ILIKE '%Guarne Maquinaria%'
      OR name ILIKE '%GUARNE MAQUINARIA%'
      OR name ILIKE '%Guarne Repuestos%'
      OR (name ILIKE '%MAQUINARIA GUARNE%KM26%' AND name NOT ILIKE '%BELLAVISTA%')
      THEN 'Guarne'
    ELSE name
  END,
  location = CASE
    WHEN location ILIKE '%Guarne Maquinaria%'
      OR upper(trim(both FROM coalesce(location, ''))) IN (
        'GUARNE MAQUINARIA',
        'GUARNE REPUESTOS',
        'KM26+800 MTS AUT. MED-BOGOTA'
      )
      OR (
        location ILIKE '%MAQUINARIA GUARNE%KM26%'
        AND location NOT ILIKE '%BELLAVISTA%'
        AND location NOT ILIKE '%CASA NUEVA%'
      )
      OR location ILIKE 'KM26+800%AUT%MED%'
      THEN 'Guarne'
    ELSE location
  END,
  city = 'GUARNE'
WHERE
  name ILIKE '%Guarne Maquinaria%'
  OR name ILIKE '%GUARNE MAQUINARIA%'
  OR name ILIKE '%Guarne Repuestos%'
  OR location ILIKE '%Guarne Maquinaria%'
  OR upper(trim(both FROM coalesce(location, ''))) IN (
    'GUARNE MAQUINARIA',
    'GUARNE REPUESTOS',
    'KM26+800 MTS AUT. MED-BOGOTA',
    'GUARNE'
  )
  OR location ILIKE 'KM26+800%AUT%MED%'
  OR (
    (name ILIKE '%MAQUINARIA GUARNE%KM26%' OR location ILIKE '%MAQUINARIA GUARNE%KM26%')
    AND coalesce(name, '') NOT ILIKE '%BELLAVISTA%'
    AND coalesce(location, '') NOT ILIKE '%BELLAVISTA%'
    AND coalesce(name, '') NOT ILIKE '%CASA NUEVA%'
    AND coalesce(location, '') NOT ILIKE '%CASA NUEVA%'
  );

-- 3) Sedes de Guarne sin city: asignar GUARNE (aptos Mirador 360, etc.)
UPDATE sites
SET
  city = 'GUARNE',
  name = CASE
    WHEN name ILIKE 'Apto Guane%' THEN replace(name, 'Guane', 'Guarne')
    ELSE name
  END
WHERE
  (city IS NULL OR trim(both FROM coalesce(city, '')) = '')
  AND (
    name ILIKE '%Guarne%'
    OR name ILIKE '%Guane%'
    OR location ILIKE '%Guarne%'
    OR location ILIKE '%Mirador 360%'
  );

-- 4) IDs explícitos reportados (garantiza city GUARNE)
UPDATE sites
SET
  city = 'GUARNE',
  name = CASE id
    WHEN 'fbaea320-55cd-4af2-ac59-b783d434d96a'::uuid THEN 'Apto Guarne 602'
    WHEN '23f05cc0-56e4-40c6-9302-d239af8071a2'::uuid THEN 'Apto Guarne 407'
    ELSE name
  END
WHERE id IN (
  'fbaea320-55cd-4af2-ac59-b783d434d96a'::uuid,
  '23f05cc0-56e4-40c6-9302-d239af8071a2'::uuid,
  '5d6e9012-f155-4eff-876a-19b785c03beb'::uuid,
  'ee8f6fde-8904-496e-8dfa-affae5878aaf'::uuid
);

-- Verificación
SELECT id, name, city, location
FROM sites
WHERE
  id IN (
    'fbaea320-55cd-4af2-ac59-b783d434d96a'::uuid,
    '23f05cc0-56e4-40c6-9302-d239af8071a2'::uuid,
    '5d6e9012-f155-4eff-876a-19b785c03beb'::uuid,
    'ee8f6fde-8904-496e-8dfa-affae5878aaf'::uuid
  )
  OR name ILIKE '%GUARNE%'
  OR name ILIKE '%Guane%'
  OR location ILIKE '%Guarne%'
  OR city ILIKE 'GUARNE'
ORDER BY name;
