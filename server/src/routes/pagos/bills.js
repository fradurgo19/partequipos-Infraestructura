import express from 'express';
import { supabase } from '../../lib/supabaseClient.js';
import { authenticatePagosToken, requirePagosCoordinator } from '../../middleware/pagosAuth.js';
import {
  transformBillToFrontend,
  transformConsumptionToFrontend,
} from '../../pagos/transforms.js';
import { canViewAllBills } from '../../pagos/access.js';
import { fetchConsumptionsByBillIds } from '../../pagos/storage.js';
import { createPagosBill } from '../../pagos/handlers/createBill.js';
import { getPagosBillById } from '../../pagos/handlers/getBillById.js';
import { updatePagosBill } from '../../pagos/handlers/updateBill.js';
import { deletePagosBill } from '../../pagos/handlers/deleteBill.js';

const router = express.Router();

const attachConsumptions = async (bills) => {
  const billIds = bills.map((b) => b.id);
  const consumptions = await fetchConsumptionsByBillIds(billIds);
  const byBill = consumptions.reduce((acc, item) => {
    const list = acc[item.bill_id] || [];
    list.push(transformConsumptionToFrontend(item));
    acc[item.bill_id] = list;
    return acc;
  }, {});
  return bills.map((row) => transformBillToFrontend(row, byBill[row.id] || []));
};

router.get('/', authenticatePagosToken, async (req, res) => {
  try {
    const { period, serviceType, city, businessGroup, location, status, search } = req.query;
    const viewAll = await canViewAllBills(req.pagosUser);

    let query = supabase.from('utility_bills').select('*');
    if (!viewAll) {
      query = query.eq('user_id', req.pagosUser.id);
    }
    if (period) query = query.eq('period', period);
    if (serviceType && serviceType !== 'all') query = query.eq('service_type', serviceType);
    if (city && city !== 'all') query = query.eq('city', city);
    if (businessGroup && businessGroup !== 'all') {
      query = query.eq('business_group', businessGroup);
    }
    if (location && location !== 'all') query = query.eq('location', location);
    if (status && status !== 'all') query = query.eq('status', status);
    if (search) {
      query = query.or(
        `invoice_number.ilike.%${search}%,description.ilike.%${search}%,provider.ilike.%${search}%`
      );
    }

    const { data: bills, error } = await query.order('created_at', { ascending: false });
    if (error) return res.status(500).json({ error: 'Error al obtener facturas' });

    const transformed = await attachConsumptions(bills || []);
    res.set('Cache-Control', 'no-store');
    res.json(transformed);
  } catch (error) {
    console.error('Error al listar facturas:', error);
    res.status(500).json({ error: 'Error al obtener facturas' });
  }
});

router.get('/:id', authenticatePagosToken, async (req, res) => {
  try {
    const bill = await getPagosBillById(req.pagosUser, req.params.id);
    res.json(bill);
  } catch (error) {
    console.error('Error al obtener factura:', error);
    const status = error?.statusCode || 500;
    res.status(status).json({ error: error.message || 'Error al obtener factura' });
  }
});

router.post('/', authenticatePagosToken, async (req, res) => {
  try {
    const bill = await createPagosBill(req.pagosUser, req.body);
    res.status(201).json(bill);
  } catch (error) {
    console.error('Error al crear factura:', error);
    const status = error?.statusCode || 500;
    res.status(status).json({ error: error.message || 'Error al crear factura' });
  }
});

router.put('/:id', authenticatePagosToken, async (req, res) => {
  try {
    const bill = await updatePagosBill(req.pagosUser, req.params.id, req.body);
    res.json(bill);
  } catch (error) {
    console.error('Error al actualizar factura:', error);
    const status = error?.statusCode || 500;
    res.status(status).json({ error: error.message || 'Error al actualizar factura' });
  }
});

router.delete('/:id', authenticatePagosToken, async (req, res) => {
  try {
    const result = await deletePagosBill(req.pagosUser, req.params.id);
    res.json(result);
  } catch (error) {
    console.error('Error al eliminar factura:', error);
    const status = error?.statusCode || 500;
    res.status(status).json({ error: error.message || 'Error al eliminar factura' });
  }
});

router.post('/bulk-delete', authenticatePagosToken, async (req, res) => {
  try {
    const actorId = req.pagosUser.id;
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'IDs inválidos' });
    }

    const idList = ids.map((id) => String(id).trim()).filter(Boolean);
    const viewAll = await canViewAllBills(req.pagosUser);

    let deletedCount = 0;

    if (viewAll) {
      const { data: deletedRows, error: deleteError } = await supabase
        .from('utility_bills')
        .delete()
        .in('id', idList)
        .select('id');

      if (deleteError) {
        console.error('Error en bulk delete coordinador:', deleteError);
        return res.status(500).json({ error: 'Error al eliminar facturas' });
      }
      deletedCount = deletedRows?.length ?? 0;
    } else {
      const { data: rpcRows, error: rpcError } = await supabase.rpc('bulk_delete_utility_bills', {
        p_actor_id: actorId,
        p_ids: idList,
      });

      if (!rpcError && Array.isArray(rpcRows)) {
        deletedCount = rpcRows.length;
      }
    }

    if (deletedCount === 0) {
      return res.status(403).json({ error: 'No se pudieron eliminar las facturas' });
    }

    res.json({ message: `${deletedCount} facturas eliminadas`, deletedCount });
  } catch (error) {
    console.error('Error al eliminar facturas en bulk:', error);
    res.status(500).json({ error: 'Error al eliminar facturas' });
  }
});

router.post('/:id/approve', authenticatePagosToken, requirePagosCoordinator, async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from('utility_bills')
      .update({
        status: 'approved',
        approved_by: req.pagosUser.id,
        approved_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error || !data) {
      return res.status(404).json({ error: 'Factura no encontrada' });
    }
    res.json(transformBillToFrontend(data));
  } catch (error) {
    console.error('Error al aprobar factura:', error);
    res.status(500).json({ error: 'Error al aprobar factura' });
  }
});

router.patch('/:id/status', authenticatePagosToken, requirePagosCoordinator, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const validStatuses = ['pending', 'approved'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Estado inválido. Solo pending o approved' });
    }

    const updateData = { status };
    if (status === 'approved') {
      updateData.approved_by = req.pagosUser.id;
      updateData.approved_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from('utility_bills')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error || !data) {
      return res.status(404).json({ error: 'Factura no encontrada' });
    }
    res.json(transformBillToFrontend(data));
  } catch (error) {
    console.error('Error al actualizar estado de factura:', error);
    res.status(500).json({ error: 'Error al actualizar estado' });
  }
});

export default router;
