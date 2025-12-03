-- Actualización del módulo Sites para incluir todas las características

-- Agregar campos faltantes a la tabla sites
ALTER TABLE sites ADD COLUMN IF NOT EXISTS area_to_paint DECIMAL(10,2);
ALTER TABLE sites ADD COLUMN IF NOT EXISTS bathrooms_count INTEGER DEFAULT 0;
ALTER TABLE sites ADD COLUMN IF NOT EXISTS walls_count INTEGER DEFAULT 0;
ALTER TABLE sites ADD COLUMN IF NOT EXISTS blueprint_urls TEXT[];
ALTER TABLE sites ADD COLUMN IF NOT EXISTS network_info JSONB;
ALTER TABLE sites ADD COLUMN IF NOT EXISTS site_history JSONB;
ALTER TABLE sites ADD COLUMN IF NOT EXISTS characteristics TEXT;

-- Índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_sites_name ON sites(name);
CREATE INDEX IF NOT EXISTS idx_sites_location ON sites(location);

COMMENT ON COLUMN sites.photos_urls IS 'URLs de fotografías de la sede';
COMMENT ON COLUMN sites.blueprint_urls IS 'URLs de planos de la sede';
COMMENT ON COLUMN sites.area_to_paint IS 'Área en metros cuadrados por pintar';
COMMENT ON COLUMN sites.bathrooms_count IS 'Cantidad de baños';
COMMENT ON COLUMN sites.walls_count IS 'Cantidad de paredes';
COMMENT ON COLUMN sites.network_info IS 'Información sobre ubicación de redes';
COMMENT ON COLUMN sites.site_history IS 'Hoja de vida de la sede';
COMMENT ON COLUMN sites.characteristics IS 'Características generales de la sede';

