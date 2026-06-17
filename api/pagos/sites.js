import { resolvePagosUserFromRequest } from '../../server/src/pagos/vercelAuth.js';
import { listPagosSiteLocations } from '../../server/src/pagos/handlers/listSites.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Use GET' });
  }

  try {
    await resolvePagosUserFromRequest(req);
    const locations = await listPagosSiteLocations();

    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json(locations);
  } catch (error) {
    const status = error?.statusCode || 500;
    return res.status(status).json({
      error: error instanceof Error ? error.message : 'Error al obtener sedes',
    });
  }
}
