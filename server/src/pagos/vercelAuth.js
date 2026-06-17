import { supabase } from '../lib/supabaseClient.js';
import { isInfraAdminProfile } from './access.js';
import { getPagosJwtSecret, verifyPagosToken } from './jwt.js';

const JWT_SECRET = getPagosJwtSecret();

const resolveInfraAdminUser = async (token) => {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser(token);

  if (authError || !user) {
    return null;
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role, full_name, email')
    .eq('id', user.id)
    .single();

  if (profileError || !isInfraAdminProfile(profile)) {
    return null;
  }

  return {
    id: user.id,
    email: user.email,
    role: 'area_coordinator',
    infraAdmin: true,
    fullName: profile.full_name,
  };
};

export const resolvePagosUserFromRequest = async (req) => {
  const authHeader = req.headers.authorization || req.headers.Authorization;
  const token =
    typeof authHeader === 'string' && authHeader.startsWith('Bearer ')
      ? authHeader.slice(7)
      : null;

  if (!token) {
    const error = new Error('Token no proporcionado');
    error.statusCode = 401;
    throw error;
  }

  if (!JWT_SECRET) {
    const error = new Error('JWT_SECRET no configurado');
    error.statusCode = 500;
    throw error;
  }

  try {
    const decoded = verifyPagosToken(token);
    if (decoded.pagos) {
      return decoded;
    }
  } catch {
    // Intentar sesión admin de infraestructura
  }

  const infraAdmin = await resolveInfraAdminUser(token);
  if (infraAdmin) {
    return infraAdmin;
  }

  const error = new Error('Token inválido');
  error.statusCode = 403;
  throw error;
};
