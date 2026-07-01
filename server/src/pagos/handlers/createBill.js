import { supabase } from '../../lib/supabaseClient.js';
import { normalizeBillBody } from '../billBody.js';
import { resolvePagosProfileId } from '../ensurePagosProfile.js';
import { resolveBillSiteId } from '../siteMatching.js';
import { transformBillToFrontend, transformConsumptionToFrontend } from '../transforms.js';
import { notifyNewBillRegistered } from '../billNotificationEmail.js';
import { buildConsumptionPayload } from '../consumptionPayload.js';
import { assertBillNotDuplicate, isDuplicateBillDbError } from '../duplicateBill.js';

export const createPagosBill = async (pagosUser, bill) => {
  const consumptions = Array.isArray(bill.consumptions) ? bill.consumptions : [];
  if (consumptions.length === 0) {
    const error = new Error('Debe agregar al menos un consumo para la factura');
    error.statusCode = 400;
    throw error;
  }

  const normalized = normalizeBillBody(bill, consumptions);

  await assertBillNotDuplicate({
    invoiceNumber: normalized.invoiceNumber,
    contractNumber: normalized.contractNumber,
    totalAmount: normalized.totalAmount,
    value: normalized.value,
    consumptions,
  });

  const siteId = await resolveBillSiteId({
    siteId: normalized.siteId,
    city: normalized.city,
    businessGroup: normalized.businessGroup,
    location: normalized.location,
  });

  const ownerProfileId = await resolvePagosProfileId(pagosUser);

  const { data: createdBill, error } = await supabase
    .from('utility_bills')
    .insert({
      user_id: ownerProfileId,
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
    console.error('Error al crear factura en utility_bills:', error);
    if (isDuplicateBillDbError(error)) {
      const dupError = new Error(
        'Ya existe una factura con el mismo número de factura, contrato y monto. No se puede registrar duplicada.'
      );
      dupError.statusCode = 409;
      throw dupError;
    }
    const dbError = new Error('Error al crear factura');
    dbError.statusCode = 500;
    throw dbError;
  }

  const consumptionsPayload = consumptions.map((c) => buildConsumptionPayload(createdBill.id, c));

  const { data: createdConsumptions, error: consumptionsError } = await supabase
    .from('bill_consumptions')
    .insert(consumptionsPayload)
    .select();

  if (consumptionsError) {
    console.error('Error al crear consumos en bill_consumptions:', consumptionsError);
    await supabase.from('utility_bills').delete().eq('id', createdBill.id);
    const dbError = new Error('Error al crear consumos');
    dbError.statusCode = 500;
    throw dbError;
  }

  setImmediate(() => {
    notifyNewBillRegistered(createdBill, pagosUser).catch((error) => {
      console.error('Error enviando notificación de nueva factura:', error);
    });
  });

  return transformBillToFrontend(
    createdBill,
    (createdConsumptions || []).map(transformConsumptionToFrontend)
  );
};
