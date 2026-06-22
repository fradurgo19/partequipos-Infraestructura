import { resolvePagosUserFromRequest } from '../../server/src/pagos/vercelAuth.js';
import { assertPagosCoordinator } from '../../server/src/pagos/handlers/coordinatorAccess.js';
import { updatePagosBillStatus } from '../../server/src/pagos/handlers/updateBillStatus.js';
import { readJsonBody } from '../../server/src/pagos/vercelRequest.js';

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
  if (req.method !== 'PATCH') {
    res.setHeader('Allow', 'PATCH');
    return res.status(405).json({ error: 'Use PATCH' });
  }

  const billId = resolveBillId(req);
  if (!billId) {
    return res.status(400).json({ error: 'ID de factura inválido' });
  }

  let body;
  try {
    body = await readJsonBody(req);
  } catch {
    return res.status(400).json({ error: 'JSON inválido' });
  }

  try {
    const pagosUser = await resolvePagosUserFromRequest(req);
    await assertPagosCoordinator(pagosUser);
    const bill = await updatePagosBillStatus(billId, body.status, pagosUser);

    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json(bill);
  } catch (error) {
    const status = error?.statusCode || 500;
    return res.status(status).json({
      error: error instanceof Error ? error.message : 'Error al actualizar estado',
    });
  }
}
