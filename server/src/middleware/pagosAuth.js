import { supabase } from '../lib/supabaseClient.js';
import { isInfraAdminProfile } from '../pagos/access.js';
import { getPagosJwtSecret, verifyPagosToken } from '../pagos/jwt.js';

export { signPagosToken } from '../pagos/jwt.js';

const JWT_SECRET = getPagosJwtSecret();

const attachInfraAdminAsPagosCoordinator = async (req, res, next, token) => {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser(token);

  if (authError || !user) {
    return res.status(403).json({ error: 'Token inválido' });
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role, full_name, email')
    .eq('id', user.id)
    .single();

  if (profileError || !isInfraAdminProfile(profile)) {
    return res.status(403).json({ error: 'Token inválido' });
  }

  req.pagosUser = {
    id: user.id,
    email: user.email,
    role: 'area_coordinator',
    infraAdmin: true,
    fullName: profile.full_name,
  };
  return next();
};

const applyPagosJwtUser = (req, res, next, decoded) => {
  req.pagosUser = decoded;
  return next();
};

export const authenticatePagosToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'Token no proporcionado' });
  }

  if (!JWT_SECRET) {
    return res.status(500).json({ error: 'JWT_SECRET no configurado' });
  }

  try {
    const decoded = verifyPagosToken(token);
    if (decoded.pagos) {
      return applyPagosJwtUser(req, res, next, decoded);
    }
  } catch {
    // No es JWT de pagos; intentar sesión admin de infraestructura
  }

  try {
    return await attachInfraAdminAsPagosCoordinator(req, res, next, token);
  } catch (error) {
    console.error('Error en autenticación pagos:', error);
    return res.status(403).json({ error: 'Token inválido' });
  }
};

export const requirePagosCoordinator = (req, res, next) => {
  if (req.pagosUser?.infraAdmin || req.pagosUser?.role === 'area_coordinator') {
    return next();
  }

  return res.status(403).json({ error: 'No tienes permisos de coordinador' });
};
