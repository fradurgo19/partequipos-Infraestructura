import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || process.env.PAGOS_JWT_SECRET;

export const signPagosToken = (user) =>
  jwt.sign({ id: user.id, email: user.email, role: user.role, pagos: true }, JWT_SECRET, {
    expiresIn: '7d',
  });

export const authenticatePagosToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'Token no proporcionado' });
  }

  if (!JWT_SECRET) {
    return res.status(500).json({ error: 'JWT_SECRET no configurado' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Token inválido' });
    }
    req.pagosUser = user;
    next();
  });
};

export const requirePagosCoordinator = (req, res, next) => {
  if (req.pagosUser?.role !== 'area_coordinator') {
    return res.status(403).json({ error: 'No tienes permisos de coordinador' });
  }
  next();
};
