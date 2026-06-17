/**
 * Handler serverless de Vercel: expone la API Express en /api/*
 */
import app from '../server/src/index.js';
import serverless from 'serverless-http';

const serverlessHandler = serverless(app);

const logApiHandler = (phase, data) => {
  // #region agent log
  console.log(`[debug-41f171] api-index-${phase}`, JSON.stringify(data));
  // #endregion
};

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
  const startedAt = Date.now();
  restoreCollapsedApiPath(req);
  logApiHandler('entry', {
    url: req.url,
    method: req.method,
    query: req.query,
    hypothesisId: 'D',
  });

  try {
    const result = await serverlessHandler(req, res);
    logApiHandler('exit', {
      url: req.url,
      method: req.method,
      durationMs: Date.now() - startedAt,
      hypothesisId: 'E',
    });
    return result;
  } catch (error) {
    logApiHandler('error', {
      url: req.url,
      method: req.method,
      durationMs: Date.now() - startedAt,
      error: error instanceof Error ? error.message : 'unknown',
      hypothesisId: 'E',
    });
    throw error;
  }
}
