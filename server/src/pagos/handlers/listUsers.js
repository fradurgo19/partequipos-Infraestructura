import { supabase } from '../../lib/supabaseClient.js';
import { getPagosTable, transformUserToFrontend } from '../transforms.js';
import { resolveActorIsTi } from '../access.js';
import { applyTiUserScope, getPagosUsersSelectFields } from '../tiScope.js';

export const listPagosUsers = async (pagosUser) => {
  const pagosTable = getPagosTable();
  const actorIsTi = await resolveActorIsTi(pagosUser);
  const selectFields = await getPagosUsersSelectFields();

  let usersQuery = supabase.from(pagosTable).select(selectFields);
  usersQuery = await applyTiUserScope(usersQuery, actorIsTi);

  const { data: users, error } = await usersQuery.order('created_at', { ascending: false });

  if (error) {
    const dbError = new Error('Error al obtener usuarios');
    dbError.statusCode = 500;
    throw dbError;
  }

  return (users || []).map(transformUserToFrontend);
};

export { assertPagosCoordinator, assertPagosBillManager } from './coordinatorAccess.js';
