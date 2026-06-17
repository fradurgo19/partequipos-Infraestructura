/**
 * Handler serverless de Vercel: expone la API Express en /api/*
 */
import app from '../server/src/index.js';
import serverless from 'serverless-http';

const serverlessHandler = serverless(app);

const restoreCollapsedApiPath = (req) => {
  const pathParam = req.query?.path;
  if (!pathParam) {
    return;
  }

  const segments = Array.isArray(pathParam) ? pathParam.join('/') : String(pathParam);
  if (segments.startsWith('pagos')) {
    return;
  }

  const query = { ...req.query };
  delete query.path;
  const qs = new URLSearchParams(
    Object.entries(query).flatMap(([key, value]) =>
      Array.isArray(value) ? value.map((v) => [key, String(v)]) : [[key, String(value ?? '')]]
    )
  ).toString();

  const restored =
    segments === 'health' ? '/health' : `/api/${segments.replace(/^\//, '')}`;
  const restoredUrl = `${restored}${qs ? `?${qs}` : ''}`;
  req.url = restoredUrl;
  if (typeof req.originalUrl === 'string') {
    req.originalUrl = restoredUrl;
  }
};

export default async function handler(req, res) {
  if (typeof req.url === 'string' && req.url.includes('/api/pagos')) {
    return res.status(404).json({ error: 'Ruta pagos no disponible en api/index' });
  }

  restoreCollapsedApiPath(req);
  return serverlessHandler(req, res);
}
