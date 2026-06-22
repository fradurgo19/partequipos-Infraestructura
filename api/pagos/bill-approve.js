import { resolvePagosUserFromRequest } from '../../server/src/pagos/vercelAuth.js';
import { assertPagosCoordinator } from '../../server/src/pagos/handlers/coordinatorAccess.js';
import { approvePagosBill } from '../../server/src/pagos/handlers/updateBillStatus.js';

const resolveBillId = (req) => {
  const rawId = req.query?.id;
  if (typeof rawId === 'string' && rawId.trim()) {
    return rawId.trim();
  }
  if (Array.isArray(rawId) && typeof rawId[0] === 'string' && rawId[0].trim()) {
    return rawId[0].trim();
  }
  return null;
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Use POST' });
  }

  const billId = resolveBillId(req);
  if (!billId) {
    return res.status(400).json({ error: 'ID de factura inválido' });
  }

  try {
    const pagosUser = await resolvePagosUserFromRequest(req);
    await assertPagosCoordinator(pagosUser);
    const bill = await approvePagosBill(billId, pagosUser);

    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json(bill);
  } catch (error) {
    const status = error?.statusCode || 500;
    return res.status(status).json({
      error: error instanceof Error ? error.message : 'Error al aprobar factura',
    });
  }
}
