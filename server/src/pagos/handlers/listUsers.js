import { supabase } from '../../lib/supabaseClient.js';
import { getPagosTable, transformUserToFrontend } from '../transforms.js';
import { resolveActorIsTi } from '../access.js';

export const listPagosUsers = async (pagosUser) => {
  const pagosTable = getPagosTable();
  const actorIsTi = await resolveActorIsTi(pagosUser);

  const { data: users, error } = await supabase
    .from(pagosTable)
    .select('id, email, full_name, role, department, location, is_ti, created_at, updated_at')
    .eq('is_ti', actorIsTi)
    .order('created_at', { ascending: false });

  if (error) {
    const dbError = new Error('Error al obtener usuarios');
    dbError.statusCode = 500;
    throw dbError;
  }

  return (users || []).map(transformUserToFrontend);
};

export { assertPagosCoordinator, assertPagosBillManager } from './coordinatorAccess.js';
