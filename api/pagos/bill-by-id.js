import { resolvePagosUserFromRequest } from '../../server/src/pagos/vercelAuth.js';
import { getPagosBillById } from '../../server/src/pagos/handlers/getBillById.js';
import { updatePagosBill } from '../../server/src/pagos/handlers/updateBill.js';
import { deletePagosBill } from '../../server/src/pagos/handlers/deleteBill.js';
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
  const billId = resolveBillId(req);
  if (!billId) {
    return res.status(400).json({ error: 'ID de factura inválido' });
  }

  if (req.method === 'GET') {
    try {
      const pagosUser = await resolvePagosUserFromRequest(req);
      const bill = await getPagosBillById(pagosUser, billId);

      res.setHeader('Cache-Control', 'no-store');
      return res.status(200).json(bill);
    } catch (error) {
      const status = error?.statusCode || 500;
      return res.status(status).json({
        error: error instanceof Error ? error.message : 'Error al obtener factura',
      });
    }
  }

  if (req.method === 'PUT') {
    let body;
    try {
      body = await readJsonBody(req);
    } catch {
      return res.status(400).json({ error: 'JSON inválido' });
    }

    try {
      const pagosUser = await resolvePagosUserFromRequest(req);
      const bill = await updatePagosBill(pagosUser, billId, body);

      res.setHeader('Cache-Control', 'no-store');
      return res.status(200).json(bill);
    } catch (error) {
      const status = error?.statusCode || 500;
      return res.status(status).json({
        error: error instanceof Error ? error.message : 'Error al actualizar factura',
      });
    }
  }

  if (req.method === 'DELETE') {
    try {
      const pagosUser = await resolvePagosUserFromRequest(req);
      const result = await deletePagosBill(pagosUser, billId);

      res.setHeader('Cache-Control', 'no-store');
      return res.status(200).json(result);
    } catch (error) {
      const status = error?.statusCode || 500;
      return res.status(status).json({
        error: error instanceof Error ? error.message : 'Error al eliminar factura',
      });
    }
  }

  res.setHeader('Allow', 'GET, PUT, DELETE');
  return res.status(405).json({ error: 'Use GET, PUT o DELETE' });
}
