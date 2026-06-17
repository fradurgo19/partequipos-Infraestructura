import { resolvePagosUserFromRequest } from '../../../server/src/pagos/vercelAuth.js';
import { listPagosBills } from '../../../server/src/pagos/handlers/listBills.js';

export default async function handler(req, res) {
  const startedAt = Date.now();
  // #region agent log
  console.log(
    '[debug-41f171] pagos-bills-direct-entry',
    JSON.stringify({ method: req.method, url: req.url })
  );
  // #endregion

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Use GET' });
  }

  try {
    const pagosUser = await resolvePagosUserFromRequest(req);
    const bills = await listPagosBills(pagosUser, req.query || {});

    // #region agent log
    console.log(
      '[debug-41f171] pagos-bills-direct-success',
      JSON.stringify({ durationMs: Date.now() - startedAt, count: bills.length })
    );
    // #endregion

    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json(bills);
  } catch (error) {
    // #region agent log
    console.log(
      '[debug-41f171] pagos-bills-direct-error',
      JSON.stringify({
        durationMs: Date.now() - startedAt,
        message: error instanceof Error ? error.message : 'unknown',
      })
    );
    // #endregion

    const status = error?.statusCode || 500;
    return res.status(status).json({
      error: error instanceof Error ? error.message : 'Error al obtener facturas',
    });
  }
}
