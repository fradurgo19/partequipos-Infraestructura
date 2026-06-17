import { supabase } from '../../lib/supabaseClient.js';
import { getPagosTable } from '../transforms.js';

const PAGOS_TABLE = getPagosTable();

const mapProfileResponse = (user) => ({
  id: user.id,
  email: user.email,
  fullName: user.full_name,
  role: user.role,
  department: user.department,
  location: user.location,
  createdAt: user.created_at,
  updatedAt: user.updated_at,
});

export const getPagosProfileById = async (userId) => {
  const { data: user, error } = await supabase
    .from(PAGOS_TABLE)
    .select('id, email, full_name, role, department, location, created_at, updated_at')
    .eq('id', userId)
    .single();

  if (error || !user) {
    const notFound = new Error('Usuario no encontrado');
    notFound.statusCode = 404;
    throw notFound;
  }

  return mapProfileResponse(user);
};

export const mapInfraAdminPagosProfile = (pagosUser) => ({
  id: pagosUser.id,
  email: pagosUser.email,
  fullName: pagosUser.fullName || pagosUser.email,
  role: 'area_coordinator',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});
