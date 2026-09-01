import { supabase } from '../../lib/supabaseClient.js';
import { getPagosTable, transformUserToFrontend } from '../transforms.js';
import { resolveActorIsTi } from '../access.js';
import { getPagosUsersSelectFields, getTiScopeSupport } from '../tiScope.js';

export const listPagosUsers = async (pagosUser) => {
  const pagosTable = getPagosTable();
  const scope = await getTiScopeSupport();
  const selectFields = await getPagosUsersSelectFields();

  let usersQuery = supabase.from(pagosTable).select(selectFields);

  if (scope.profiles) {
    const actorIsTi = await resolveActorIsTi(pagosUser);
    usersQuery = usersQuery.eq('is_ti', actorIsTi);
  }

  const { data: users, error } = await usersQuery.order('created_at', { ascending: false });

  if (error) {
    console.error('Error listPagosUsers:', error);
    const dbError = new Error(error.message || 'Error al obtener usuarios');
    dbError.statusCode = 500;
    throw dbError;
  }

  return (users || []).map(transformUserToFrontend);
};

export { assertPagosCoordinator, assertPagosBillManager } from './coordinatorAccess.js';
