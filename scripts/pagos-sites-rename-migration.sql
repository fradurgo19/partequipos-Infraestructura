-- Migración de sedes/ciudades en facturas (utility_bills).
-- Ejecutar en Supabase → SQL Editor → Run.

-- 1) Sede Finca el Zarzal → ciudad CISNEROS (y ubicación canónica)
UPDATE utility_bills
SET
  city = 'CISNEROS',
  location = 'FINCA EL ZARZAL'
WHERE
  location ILIKE '%FINCA%ZARZAL%'
  OR location ILIKE '%ZARZAL%';

-- 2) Lote Cartagena → Lote Turbaco
UPDATE utility_bills
SET location = 'LOTE TURBACO'
WHERE
  UPPER(TRIM(location)) = 'LOTE CARTAGENA'
  OR location ILIKE 'LOTE CARTAGENA%';

-- 3) Bogotá Sede Nueva → CRA 68D Nro.17A - 84 (sede y ubicación)
UPDATE utility_bills
SET
  city = 'BOGOTA',
  location = 'CRA 68D Nro.17A - 84'
WHERE
  location ILIKE '%SEDE NUEVA%CRA%68%'
  OR location ILIKE '%BOGOTA SEDE NUEVA%'
  OR (
    location ILIKE '%CRA%68D%'
    AND location ILIKE '%17A%'
    AND location ILIKE '%84%'
  );

-- Verificación
SELECT city, location, COUNT(*) AS facturas
FROM utility_bills
WHERE
  location ILIKE '%ZARZAL%'
  OR location ILIKE '%TURBACO%'
  OR UPPER(TRIM(location)) IN ('LOTE CARTAGENA', 'LOTE TURBACO', 'CRA 68D Nro.17A - 84')
  OR location ILIKE '%SEDE NUEVA%'
  OR location ILIKE '%CRA%68D%'
GROUP BY city, location
ORDER BY city, location;
