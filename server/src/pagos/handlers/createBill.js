import { supabase } from '../../lib/supabaseClient.js';
import { normalizeBillBody } from '../billBody.js';
import { resolveBillSiteId } from '../siteMatching.js';
import { transformBillToFrontend, transformConsumptionToFrontend } from '../transforms.js';

export const createPagosBill = async (pagosUser, bill) => {
  const consumptions = Array.isArray(bill.consumptions) ? bill.consumptions : [];
  if (consumptions.length === 0) {
    const error = new Error('Debe agregar al menos un consumo para la factura');
    error.statusCode = 400;
    throw error;
  }

  const normalized = normalizeBillBody(bill, consumptions);
  const siteId = await resolveBillSiteId({
    siteId: normalized.siteId,
    city: normalized.city,
    businessGroup: normalized.businessGroup,
    location: normalized.location,
  });

  const { data: createdBill, error } = await supabase
    .from('utility_bills')
    .insert({
      user_id: pagosUser.id,
      site_id: siteId,
      service_type: normalized.serviceType,
      provider: normalized.provider,
      description: normalized.description,
      value: normalized.value,
      period: normalized.period,
      invoice_number: normalized.invoiceNumber,
      contract_number: normalized.contractNumber,
      total_amount: normalized.totalAmount,
      consumption: normalized.consumption,
      unit_of_measure: normalized.unitOfMeasure,
      cost_center: normalized.costCenter,
      city: normalized.city,
      business_group: normalized.businessGroup,
      location: normalized.location,
      due_date: normalized.dueDate,
      document_url: normalized.documentUrl,
      document_name: normalized.documentName,
      status: normalized.status,
      notes: normalized.notes,
    })
    .select()
    .single();

  if (error) {
    const dbError = new Error('Error al crear factura');
    dbError.statusCode = 500;
    throw dbError;
  }

  const consumptionsPayload = consumptions.map((c) => ({
    bill_id: createdBill.id,
    service_type: c.serviceType || c.service_type,
    provider: c.provider,
    period_from: c.periodFrom || c.period_from,
    period_to: c.periodTo || c.period_to,
    value: Number.parseFloat(c.value),
    total_amount: Number.parseFloat(c.totalAmount),
    consumption: c.consumption ? Number.parseFloat(c.consumption) : null,
    unit_of_measure: c.unitOfMeasure || c.unit_of_measure,
  }));

  const { data: createdConsumptions, error: consumptionsError } = await supabase
    .from('bill_consumptions')
    .insert(consumptionsPayload)
    .select();

  if (consumptionsError) {
    const dbError = new Error('Error al crear consumos');
    dbError.statusCode = 500;
    throw dbError;
  }

  return transformBillToFrontend(
    createdBill,
    (createdConsumptions || []).map(transformConsumptionToFrontend)
  );
};
