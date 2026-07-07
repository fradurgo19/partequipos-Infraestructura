import { supabase } from '../../lib/supabaseClient.js';
import { resolvePagosProfileId } from '../ensurePagosProfile.js';
import { notifyBillApproved, notifyBillPaid } from '../billNotificationEmail.js';
import { transformBillToFrontend } from '../transforms.js';

const shouldNotifyBillApproval = (previousStatus, nextStatus) =>
  nextStatus === 'approved' && previousStatus !== 'approved';

const shouldNotifyBillPaid = (previousStatus, nextStatus) =>
  nextStatus === 'paid' && previousStatus !== 'paid';

const sendBillApprovalNotification = async (bill, pagosUser) => {
  try {
    await notifyBillApproved(bill, pagosUser);
  } catch (emailError) {
    console.error('Error enviando notificación de factura aprobada:', emailError);
  }
};

const sendBillPaidNotification = async (bill, pagosUser) => {
  try {
    await notifyBillPaid(bill, pagosUser);
  } catch (emailError) {
    console.error('Error enviando notificación de factura pagada:', emailError);
  }
};

export const updatePagosBillStatus = async (billId, status, pagosUser) => {
  const validStatuses = ['pending', 'approved', 'paid'];
  if (!validStatuses.includes(status)) {
    const error = new Error('Estado inválido. Solo pending, approved o paid');
    error.statusCode = 400;
    throw error;
  }

  const { data: existingBill, error: existingError } = await supabase
    .from('utility_bills')
    .select('status')
    .eq('id', billId)
    .maybeSingle();

  if (existingError || !existingBill) {
    const notFound = new Error('Factura no encontrada');
    notFound.statusCode = 404;
    throw notFound;
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

  if (shouldNotifyBillApproval(existingBill.status, status)) {
    await sendBillApprovalNotification(data, pagosUser);
  }

  if (shouldNotifyBillPaid(existingBill.status, status)) {
    await sendBillPaidNotification(data, pagosUser);
  }

  return transformBillToFrontend(data);
};

export const approvePagosBill = async (billId, pagosUser) =>
  updatePagosBillStatus(billId, 'approved', pagosUser);
