import { supabase } from '../../lib/supabaseClient.js';
import { canViewAllBills, assertBillScopeAccess } from '../access.js';
import { transformBillToFrontend, transformConsumptionToFrontend } from '../transforms.js';

export const getPagosBillById = async (pagosUser, billId) => {
  const viewAll = await canViewAllBills(pagosUser);

  let query = supabase.from('utility_bills').select('*').eq('id', billId);
  if (!viewAll) {
    query = query.eq('user_id', pagosUser.id);
  }

  const { data: billRow, error } = await query.single();
  if (error || !billRow) {
    const notFound = new Error('Factura no encontrada');
    notFound.statusCode = 404;
    throw notFound;
  }

  await assertBillScopeAccess(pagosUser, billRow);

  const { data: consumptionsData } = await supabase
    .from('bill_consumptions')
    .select('*')
    .eq('bill_id', billId);

  const consumptions = (consumptionsData || []).map(transformConsumptionToFrontend);
  return transformBillToFrontend(billRow, consumptions);
};
