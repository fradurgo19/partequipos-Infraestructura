import { supabase } from '../../lib/supabaseClient.js';

const normalizeCity = (city) => {
  const trimmed = city?.trim();
  return trimmed ? trimmed.toUpperCase() : 'SIN CIUDAD';
};

export const listPagosSiteLocations = async () => {
  const { data: sites, error } = await supabase
    .from('sites')
    .select('id, name, location, city')
    .order('city', { ascending: true })
    .order('name', { ascending: true });

  if (error) {
    const dbError = new Error('Error al obtener sedes');
    dbError.statusCode = 500;
    throw dbError;
  }

  return (sites || [])
    .map((site) => ({
      siteId: site.id,
      city: normalizeCity(site.city),
      businessGroup: site.name?.trim() || 'Sede sin nombre',
      address: site.location?.trim() || site.name?.trim() || '',
    }))
    .filter((entry) => entry.address);
};
