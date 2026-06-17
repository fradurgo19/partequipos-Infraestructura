import jwt from 'jsonwebtoken';
import { supabase } from '../index.js';
import { enrichPagosUserIfInfraAdmin, isInfraAdminProfile } from '../pagos/access.js';

const JWT_SECRET = process.env.JWT_SECRET || process.env.PAGOS_JWT_SECRET;

export const signPagosToken = (user) =>
  jwt.sign({ id: user.id, email: user.email, role: user.role, pagos: true }, JWT_SECRET, {
    expiresIn: '7d',
  });

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

const applyPagosJwtUser = async (req, res, next, decoded) => {
  req.pagosUser = await enrichPagosUserIfInfraAdmin(decoded);
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
    const decoded = jwt.verify(token, JWT_SECRET);
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

export const requirePagosCoordinator = async (req, res, next) => {
  if (req.pagosUser?.infraAdmin || req.pagosUser?.role === 'area_coordinator') {
    return next();
  }

  const enriched = await enrichPagosUserIfInfraAdmin(req.pagosUser);
  if (enriched?.infraAdmin || enriched?.role === 'area_coordinator') {
    req.pagosUser = enriched;
    return next();
  }

  return res.status(403).json({ error: 'No tienes permisos de coordinador' });
};
