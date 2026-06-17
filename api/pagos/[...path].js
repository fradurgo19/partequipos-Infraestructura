/**
 * Handler serverless para /api/pagos/*
 */
import serverless from 'serverless-http';
import { createPagosApp } from '../../server/src/pagos/app.js';

const app = createPagosApp();
const serverlessHandler = serverless(app);

const logPagosHandler = (phase, data) => {
  // #region agent log
  console.log(`[debug-41f171] pagos-handler-${phase}`, JSON.stringify(data));
  // #endregion
};

export default async function handler(req, res) {
  const startedAt = Date.now();
  logPagosHandler('entry', {
    url: req.url,
    method: req.method,
    query: req.query,
    hypothesisId: 'A',
  });

  try {
    const result = await serverlessHandler(req, res);
    logPagosHandler('exit', {
      url: req.url,
      method: req.method,
      durationMs: Date.now() - startedAt,
      hypothesisId: 'B',
    });
    return result;
  } catch (error) {
    logPagosHandler('error', {
      url: req.url,
      method: req.method,
      durationMs: Date.now() - startedAt,
      error: error instanceof Error ? error.message : 'unknown',
      hypothesisId: 'C',
    });
    throw error;
  }
}
