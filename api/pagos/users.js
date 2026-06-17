import { resolvePagosUserFromRequest } from '../../server/src/pagos/vercelAuth.js';
import {
  assertPagosCoordinator,
  listPagosUsers,
} from '../../server/src/pagos/handlers/listUsers.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Use GET' });
  }

  try {
    const pagosUser = await resolvePagosUserFromRequest(req);
    assertPagosCoordinator(pagosUser);
    const users = await listPagosUsers();

    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json(users);
  } catch (error) {
    const status = error?.statusCode || 500;
    return res.status(status).json({
      error: error instanceof Error ? error.message : 'Error al obtener usuarios',
    });
  }
}
