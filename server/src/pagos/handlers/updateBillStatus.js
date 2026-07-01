import { supabase } from '../../lib/supabaseClient.js';
import { resolvePagosProfileId } from '../ensurePagosProfile.js';
import { transformBillToFrontend } from '../transforms.js';

export const updatePagosBillStatus = async (billId, status, pagosUser) => {
  const validStatuses = ['pending', 'approved'];
  if (!validStatuses.includes(status)) {
    const error = new Error('Estado inválido. Solo pending o approved');
    error.statusCode = 400;
    throw error;
  }

  const updateData = { status };
  if (status === 'approved') {
    updateData.approved_by = await resolvePagosProfileId(pagosUser);
    updateData.approved_at = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from('utility_bills')
    .update(updateData)
    .eq('id', billId)
    .select()
    .single();

  if (error || !data) {
    const notFound = new Error('Factura no encontrada');
    notFound.statusCode = 404;
    throw notFound;
  }

  return transformBillToFrontend(data);
};

export const approvePagosBill = async (billId, pagosUser) =>
  updatePagosBillStatus(billId, 'approved', pagosUser);
