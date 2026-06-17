import { supabase } from '../lib/supabaseClient.js';
import { signPagosToken } from '../middleware/pagosAuth.js';
import { getPagosTable } from './transforms.js';

const PAGOS_TABLE = getPagosTable();
const PROFILE_FIELDS = 'id, email, full_name, role, department, location, created_at, updated_at';

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

export const authenticatePagosCredentials = async (email, password) => {
  if (!supabase) {
    throw new Error('Supabase no configurado en el servidor');
  }

  const { data: isValid, error: rpcError } = await supabase.rpc('check_password', {
    user_email: email,
    user_password: password,
  });

  if (rpcError) {
    console.error('Error RPC check_password:', rpcError);
    const error = new Error(rpcError.message || 'Error al validar credenciales');
    error.statusCode = 500;
    throw error;
  }

  if (!isValid) {
    return null;
  }

  const { data: user, error: userError } = await supabase
    .from(PAGOS_TABLE)
    .select(PROFILE_FIELDS)
    .eq('email', email)
    .single();

  if (userError || !user) {
    return null;
  }

  const token = signPagosToken(user);
  return {
    user: mapProfileResponse(user),
    token,
  };
};
