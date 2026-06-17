import { supabase } from '../../lib/supabaseClient.js';
import { getPagosTable, transformUserToFrontend } from '../transforms.js';

export const listPagosUsers = async () => {
  const pagosTable = getPagosTable();
  const { data: users, error } = await supabase
    .from(pagosTable)
    .select('id, email, full_name, role, department, location, created_at, updated_at')
    .order('created_at', { ascending: false });

  if (error) {
    const dbError = new Error('Error al obtener usuarios');
    dbError.statusCode = 500;
    throw dbError;
  }

  return (users || []).map(transformUserToFrontend);
};

const isPagosCoordinator = (pagosUser) =>
  pagosUser?.infraAdmin || pagosUser?.role === 'area_coordinator';

export const assertPagosCoordinator = (pagosUser) => {
  if (!isPagosCoordinator(pagosUser)) {
    const error = new Error('No tienes permisos de coordinador');
    error.statusCode = 403;
    throw error;
  }
};
