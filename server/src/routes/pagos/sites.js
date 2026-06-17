import express from 'express';
import { authenticatePagosToken } from '../../middleware/pagosAuth.js';
import { listPagosSiteLocations } from '../../pagos/handlers/listSites.js';

const router = express.Router();

router.get('/', authenticatePagosToken, async (req, res) => {
  try {
    const locations = await listPagosSiteLocations();
    res.set('Cache-Control', 'no-store');
    res.json(locations);
  } catch (error) {
    console.error('Error en GET pagos/sites:', error);
    const status = error?.statusCode || 500;
    res.status(status).json({ error: error.message || 'Error al obtener sedes' });
  }
});

export default router;
