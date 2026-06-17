import { resolvePagosUserFromRequest } from '../../../server/src/pagos/vercelAuth.js';
import {
  getPagosProfileById,
  mapInfraAdminPagosProfile,
} from '../../../server/src/pagos/handlers/profile.js';

export default async function handler(req, res) {
  const startedAt = Date.now();
  // #region agent log
  console.log(
    '[debug-41f171] pagos-profile-direct-entry',
    JSON.stringify({ method: req.method, url: req.url })
  );
  // #endregion

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Use GET' });
  }

  try {
    const pagosUser = await resolvePagosUserFromRequest(req);
    const profile = pagosUser.infraAdmin
      ? mapInfraAdminPagosProfile(pagosUser)
      : await getPagosProfileById(pagosUser.id);

    // #region agent log
    console.log(
      '[debug-41f171] pagos-profile-direct-success',
      JSON.stringify({ durationMs: Date.now() - startedAt })
    );
    // #endregion

    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json(profile);
  } catch (error) {
    // #region agent log
    console.log(
      '[debug-41f171] pagos-profile-direct-error',
      JSON.stringify({
        durationMs: Date.now() - startedAt,
        message: error instanceof Error ? error.message : 'unknown',
      })
    );
    // #endregion

    const status = error?.statusCode || 500;
    return res.status(status).json({
      error: error instanceof Error ? error.message : 'Error al obtener perfil',
    });
  }
}
