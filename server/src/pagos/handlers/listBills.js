import { supabase } from '../../lib/supabaseClient.js';
import { canViewAllBills } from '../access.js';
import { fetchConsumptionsByBillIds } from '../storage.js';
import { transformBillToFrontend, transformConsumptionToFrontend } from '../transforms.js';

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

export const listPagosBills = async (pagosUser, query = {}) => {
  const { period, serviceType, city, businessGroup, location, status, search } = query;
  const viewAll = await canViewAllBills(pagosUser);

  let dbQuery = supabase.from('utility_bills').select('*');
  if (!viewAll) {
    dbQuery = dbQuery.eq('user_id', pagosUser.id);
  }
  if (period) dbQuery = dbQuery.eq('period', period);
  if (serviceType && serviceType !== 'all') dbQuery = dbQuery.eq('service_type', serviceType);
  if (city && city !== 'all') dbQuery = dbQuery.eq('city', city);
  if (businessGroup && businessGroup !== 'all') {
    dbQuery = dbQuery.eq('business_group', businessGroup);
  }
  if (location && location !== 'all') dbQuery = dbQuery.eq('location', location);
  if (status && status !== 'all') dbQuery = dbQuery.eq('status', status);
  if (search) {
    dbQuery = dbQuery.or(
      `invoice_number.ilike.%${search}%,description.ilike.%${search}%,provider.ilike.%${search}%`
    );
  }

  const { data: bills, error } = await dbQuery.order('created_at', { ascending: false });
  if (error) {
    const dbError = new Error('Error al obtener facturas');
    dbError.statusCode = 500;
    throw dbError;
  }

  return attachConsumptions(bills || []);
};
