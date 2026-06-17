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

export default async function handler(req, res) {
  const startedAt = Date.now();
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
