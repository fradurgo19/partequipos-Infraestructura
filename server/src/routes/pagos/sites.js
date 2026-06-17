import express from 'express';
import { supabase } from '../../index.js';
import { authenticatePagosToken } from '../../middleware/pagosAuth.js';

const router = express.Router();

const normalizeCity = (city) => {
  const trimmed = city?.trim();
  return trimmed ? trimmed.toUpperCase() : 'SIN CIUDAD';
};

router.get('/', authenticatePagosToken, async (req, res) => {
  try {
    const { data: sites, error } = await supabase
      .from('sites')
      .select('id, name, location, city')
      .order('city', { ascending: true })
      .order('name', { ascending: true });

    if (error) {
      console.error('Error al obtener sedes para pagos:', error);
      return res.status(500).json({ error: 'Error al obtener sedes' });
    }

    const locations = (sites || []).map((site) => ({
      siteId: site.id,
      city: normalizeCity(site.city),
      businessGroup: site.name?.trim() || 'Sede sin nombre',
      address: site.location?.trim() || '',
    }));

    res.set('Cache-Control', 'no-store');
    res.json(locations);
  } catch (error) {
    console.error('Error en GET pagos/sites:', error);
    res.status(500).json({ error: 'Error al obtener sedes' });
  }
});

export default router;
