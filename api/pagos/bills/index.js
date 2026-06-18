import { resolvePagosUserFromRequest } from '../../../server/src/pagos/vercelAuth.js';
import { listPagosBills } from '../../../server/src/pagos/handlers/listBills.js';
import { createPagosBill } from '../../../server/src/pagos/handlers/createBill.js';
import { readJsonBody } from '../../../server/src/pagos/vercelRequest.js';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const pagosUser = await resolvePagosUserFromRequest(req);
      const bills = await listPagosBills(pagosUser, req.query || {});

      res.setHeader('Cache-Control', 'no-store');
      return res.status(200).json(bills);
    } catch (error) {
      const status = error?.statusCode || 500;
      return res.status(status).json({
        error: error instanceof Error ? error.message : 'Error al obtener facturas',
      });
    }
  }

  if (req.method === 'POST') {
    let body;
    try {
      body = await readJsonBody(req);
    } catch {
      return res.status(400).json({ error: 'JSON inválido' });
    }

    try {
      const pagosUser = await resolvePagosUserFromRequest(req);
      const bill = await createPagosBill(pagosUser, body);

      res.setHeader('Cache-Control', 'no-store');
      return res.status(201).json(bill);
    } catch (error) {
      const status = error?.statusCode || 500;
      return res.status(status).json({
        error: error instanceof Error ? error.message : 'Error al crear factura',
      });
    }
  }

  res.setHeader('Allow', 'GET, POST');
  return res.status(405).json({ error: 'Use GET o POST' });
}
