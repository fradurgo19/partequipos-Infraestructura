import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || process.env.PAGOS_JWT_SECRET;

export const getPagosJwtSecret = () => JWT_SECRET;

export const signPagosToken = (user) => {
  if (!JWT_SECRET) {
    const error = new Error('JWT_SECRET no configurado');
    error.statusCode = 500;
    throw error;
  }

  return jwt.sign(
    { id: user.id, email: user.email, role: user.role, pagos: true },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
};

export const verifyPagosToken = (token) => {
  if (!JWT_SECRET) {
    throw new Error('JWT_SECRET no configurado');
  }
  return jwt.verify(token, JWT_SECRET);
};
