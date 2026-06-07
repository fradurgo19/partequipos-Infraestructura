-- Campos adicionales para sedes (Sites)
-- Ejecutar en Supabase Dashboard → SQL Editor

ALTER TABLE sites ADD COLUMN IF NOT EXISTS urinals_count INTEGER DEFAULT 0;
ALTER TABLE sites ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE sites ADD COLUMN IF NOT EXISTS google_maps_url TEXT;
ALTER TABLE sites ADD COLUMN IF NOT EXISTS air_conditioners_count INTEGER DEFAULT 0;
ALTER TABLE sites ADD COLUMN IF NOT EXISTS water_tanks_count INTEGER DEFAULT 0;
ALTER TABLE sites ADD COLUMN IF NOT EXISTS water_pumps_count INTEGER DEFAULT 0;
ALTER TABLE sites ADD COLUMN IF NOT EXISTS rci_pumps_count INTEGER DEFAULT 0;
ALTER TABLE sites ADD COLUMN IF NOT EXISTS electrical_plants_count INTEGER DEFAULT 0;

COMMENT ON COLUMN sites.urinals_count IS 'Cantidad de orinales';
COMMENT ON COLUMN sites.city IS 'Ciudad de la sede';
COMMENT ON COLUMN sites.google_maps_url IS 'Enlace o ubicación en Google Maps';
COMMENT ON COLUMN sites.air_conditioners_count IS 'Cantidad de aires acondicionados';
COMMENT ON COLUMN sites.water_tanks_count IS 'Cantidad de tanques de agua';
COMMENT ON COLUMN sites.water_pumps_count IS 'Cantidad de bombas de agua';
COMMENT ON COLUMN sites.rci_pumps_count IS 'Cantidad de bombas RCI';
COMMENT ON COLUMN sites.electrical_plants_count IS 'Cantidad de plantas eléctricas';
