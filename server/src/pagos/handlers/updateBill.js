import { supabase } from '../../lib/supabaseClient.js';
import { normalizeBillBody } from '../billBody.js';
import { canViewAllBills } from '../access.js';
import { resolveBillSiteId } from '../siteMatching.js';
import { transformBillToFrontend, transformConsumptionToFrontend } from '../transforms.js';
import { buildConsumptionPayload } from '../consumptionPayload.js';

export const updatePagosBill = async (pagosUser, billId, updates) => {
  const incomingConsumptions = Array.isArray(updates.consumptions) ? updates.consumptions : null;

  if (incomingConsumptions?.length === 0) {
    const error = new Error('Debe incluir al menos un consumo');
    error.statusCode = 400;
    throw error;
  }

  const normalizedUpdates = { ...updates };
  if (incomingConsumptions?.length) {
    const normalized = normalizeBillBody(updates, incomingConsumptions);
    normalizedUpdates.serviceType = normalized.serviceType;
    normalizedUpdates.provider = normalized.provider;
    normalizedUpdates.value = normalized.value;
    normalizedUpdates.totalAmount = normalized.totalAmount;
    normalizedUpdates.consumption = normalized.consumption;
    normalizedUpdates.unitOfMeasure = normalized.unitOfMeasure;
  }

  const shouldResolveSite =
    normalizedUpdates.siteId !== undefined ||
    normalizedUpdates.location !== undefined ||
    normalizedUpdates.city !== undefined ||
    normalizedUpdates.businessGroup !== undefined;

  const resolvedSiteId = shouldResolveSite
    ? await resolveBillSiteId({
        siteId: normalizedUpdates.siteId,
        city: normalizedUpdates.city,
        businessGroup: normalizedUpdates.businessGroup,
        location: normalizedUpdates.location,
      })
    : undefined;

  const rawPayload = {
    service_type: normalizedUpdates.serviceType,
    provider: normalizedUpdates.provider,
    description: normalizedUpdates.description,
    value: normalizedUpdates.value,
    period: normalizedUpdates.period,
    invoice_number: normalizedUpdates.invoiceNumber,
    contract_number: normalizedUpdates.contractNumber,
    total_amount: normalizedUpdates.totalAmount,
    consumption: normalizedUpdates.consumption,
    unit_of_measure: normalizedUpdates.unitOfMeasure,
    cost_center: normalizedUpdates.costCenter,
    city: normalizedUpdates.city,
    business_group: normalizedUpdates.businessGroup,
    location: normalizedUpdates.location,
    site_id: resolvedSiteId,
    due_date: normalizedUpdates.dueDate,
    document_url: normalizedUpdates.documentUrl,
    document_name: normalizedUpdates.documentName,
    status: normalizedUpdates.status,
    notes: normalizedUpdates.notes,
    approved_by: normalizedUpdates.approvedBy,
    approved_at: normalizedUpdates.approvedAt,
  };
  const updatePayload = Object.fromEntries(
    Object.entries(rawPayload).filter(([, value]) => value !== undefined)
  );

  const viewAll = await canViewAllBills(pagosUser);
  let updateQuery = supabase.from('utility_bills').update(updatePayload).eq('id', billId);
  if (!viewAll) {
    updateQuery = updateQuery.eq('user_id', pagosUser.id);
  }

  const { data: updatedRow, error: updateError } = await updateQuery.select().single();

  if (updateError || !updatedRow) {
    const notFound = new Error('Factura no encontrada');
    notFound.statusCode = 404;
    throw notFound;
  }

  if (!incomingConsumptions) {
    return transformBillToFrontend(updatedRow);
  }

  await supabase.from('bill_consumptions').delete().eq('bill_id', billId);
  const payload = incomingConsumptions.map((consumption) => buildConsumptionPayload(billId, consumption));

  const { data: newConsumptions, error: consumptionsError } = await supabase
    .from('bill_consumptions')
    .insert(payload)
    .select();

  if (consumptionsError) {
    console.error('Error al actualizar consumos en bill_consumptions:', consumptionsError);
    const dbError = new Error('Error al actualizar consumos');
    dbError.statusCode = 500;
    throw dbError;
  }
  const consumptions = (newConsumptions || []).map(transformConsumptionToFrontend);
  return transformBillToFrontend(updatedRow, consumptions);
};
