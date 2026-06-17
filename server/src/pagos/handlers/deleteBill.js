import { supabase } from '../../lib/supabaseClient.js';

export const deletePagosBill = async (pagosUser, billId) => {
  const { data, error } = await supabase
    .from('utility_bills')
    .delete()
    .eq('id', billId)
    .eq('user_id', pagosUser.id)
    .eq('status', 'draft')
    .select('id');

  if (error || !data?.length) {
    const notFound = new Error('Factura no encontrada o no se puede eliminar');
    notFound.statusCode = 404;
    throw notFound;
  }

  return { message: 'Factura eliminada exitosamente' };
};
