import express from 'express';
import { supabase } from '../../lib/supabaseClient.js';
import { authenticatePagosToken, requirePagosCoordinator } from '../../middleware/pagosAuth.js';
import {
  transformBillToFrontend,
  transformConsumptionToFrontend,
} from '../../pagos/transforms.js';
import { canViewAllBills } from '../../pagos/access.js';
import { fetchConsumptionsByBillIds } from '../../pagos/storage.js';
import { normalizeBillBody } from '../../pagos/billBody.js';
import { createPagosBill } from '../../pagos/handlers/createBill.js';

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
    const { id } = req.params;
    const viewAll = await canViewAllBills(req.pagosUser);

    let query = supabase.from('utility_bills').select('*').eq('id', id);
    if (!viewAll) {
      query = query.eq('user_id', req.pagosUser.id);
    }

    const { data: billRow, error } = await query.single();
    if (error || !billRow) {
      return res.status(404).json({ error: 'Factura no encontrada' });
    }

    const { data: consumptionsData } = await supabase.from('bill_consumptions').select('*').eq('bill_id', id);
    const consumptions = (consumptionsData || []).map(transformConsumptionToFrontend);
    res.json(transformBillToFrontend(billRow, consumptions));
  } catch (error) {
    console.error('Error al obtener factura:', error);
    res.status(500).json({ error: 'Error al obtener factura' });
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
    const { id } = req.params;
    const updates = req.body;
    const incomingConsumptions = Array.isArray(updates.consumptions) ? updates.consumptions : null;

    if (incomingConsumptions?.length === 0) {
      return res.status(400).json({ error: 'Debe incluir al menos un consumo' });
    }

    if (incomingConsumptions?.length) {
      const normalized = normalizeBillBody(updates, incomingConsumptions);
      updates.serviceType = normalized.serviceType;
      updates.provider = normalized.provider;
      updates.value = normalized.value;
      updates.totalAmount = normalized.totalAmount;
      updates.consumption = normalized.consumption;
      updates.unitOfMeasure = normalized.unitOfMeasure;
    }

    const rawPayload = {
      service_type: updates.serviceType,
      provider: updates.provider,
      description: updates.description,
      value: updates.value,
      period: updates.period,
      invoice_number: updates.invoiceNumber,
      contract_number: updates.contractNumber,
      total_amount: updates.totalAmount,
      consumption: updates.consumption,
      unit_of_measure: updates.unitOfMeasure,
      cost_center: updates.costCenter,
      city: updates.city,
      business_group: updates.businessGroup,
      location: updates.location,
      due_date: updates.dueDate,
      document_url: updates.documentUrl,
      document_name: updates.documentName,
      status: updates.status,
      notes: updates.notes,
      approved_by: updates.approvedBy,
      approved_at: updates.approvedAt,
    };
    const updatePayload = Object.fromEntries(
      Object.entries(rawPayload).filter(([, v]) => v !== undefined)
    );

    const { data: updatedRow, error: updateError } = await supabase
      .from('utility_bills')
      .update(updatePayload)
      .eq('id', id)
      .eq('user_id', req.pagosUser.id)
      .select()
      .single();

    if (updateError || !updatedRow) {
      return res.status(404).json({ error: 'Factura no encontrada' });
    }

    if (!incomingConsumptions) {
      return res.json(transformBillToFrontend(updatedRow));
    }

    await supabase.from('bill_consumptions').delete().eq('bill_id', id);
    const payload = incomingConsumptions.map((c) => ({
      bill_id: id,
      service_type: c.serviceType || c.service_type,
      provider: c.provider,
      period_from: c.periodFrom || c.period_from,
      period_to: c.periodTo || c.period_to,
      value: Number.parseFloat(c.value),
      total_amount: Number.parseFloat(c.totalAmount),
      consumption: c.consumption ? Number.parseFloat(c.consumption) : null,
      unit_of_measure: c.unitOfMeasure || c.unit_of_measure,
    }));

    const { data: newConsumptions } = await supabase.from('bill_consumptions').insert(payload).select();
    const consumptions = (newConsumptions || []).map(transformConsumptionToFrontend);
    return res.json(transformBillToFrontend(updatedRow, consumptions));
  } catch (error) {
    console.error('Error al actualizar factura:', error);
    res.status(500).json({ error: 'Error al actualizar factura' });
  }
});

router.delete('/:id', authenticatePagosToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from('utility_bills')
      .delete()
      .eq('id', id)
      .eq('user_id', req.pagosUser.id)
      .eq('status', 'draft')
      .select('id');

    if (error || !data?.length) {
      return res.status(404).json({ error: 'Factura no encontrada o no se puede eliminar' });
    }
    res.json({ message: 'Factura eliminada exitosamente' });
  } catch (error) {
    console.error('Error al eliminar factura:', error);
    res.status(500).json({ error: 'Error al eliminar factura' });
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
