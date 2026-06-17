import bcrypt from 'bcryptjs';
import { supabase } from '../lib/supabaseClient.js';
import { signPagosToken } from './jwt.js';
import { getPagosTable } from './transforms.js';

const PAGOS_TABLE = getPagosTable();
const PROFILE_FIELDS =
  'id, email, full_name, role, department, location, created_at, updated_at, password_hash';

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

const verifyPagosPassword = async (plainPassword, passwordHash) => {
  if (!passwordHash) {
    return false;
  }

  try {
    return await bcrypt.compare(plainPassword, passwordHash);
  } catch (error) {
    console.error('Error al comparar contraseña pagos:', error);
    return false;
  }
};

export const authenticatePagosCredentials = async (email, password) => {
  if (!supabase) {
    const error = new Error('Supabase no configurado en el servidor');
    error.statusCode = 500;
    throw error;
  }

  const trimmedEmail = email.trim();

  let { data: user, error: userError } = await supabase
    .from(PAGOS_TABLE)
    .select(PROFILE_FIELDS)
    .eq('email', trimmedEmail)
    .maybeSingle();

  if (!user && !userError) {
    const fallback = await supabase
      .from(PAGOS_TABLE)
      .select(PROFILE_FIELDS)
      .ilike('email', trimmedEmail)
      .maybeSingle();
    user = fallback.data;
    userError = fallback.error;
  }

  if (userError) {
    console.error('Error al buscar usuario pagos:', userError);
    const error = new Error('Error al validar credenciales');
    error.statusCode = 500;
    throw error;
  }

  if (!user) {
    return null;
  }

  const isValid = await verifyPagosPassword(password, user.password_hash);
  if (!isValid) {
    return null;
  }

  const token = signPagosToken(user);
  return {
    user: mapProfileResponse(user),
    token,
  };
};
