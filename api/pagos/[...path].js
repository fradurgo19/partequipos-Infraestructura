/**
 * Handler serverless para /api/pagos/*
 */
import serverless from 'serverless-http';
import { createPagosApp } from '../../server/src/pagos/app.js';

const app = createPagosApp();
const serverlessHandler = serverless(app);

const restorePagosRequestPath = (req) => {
  try {
    const baseUrl = 'http://localhost';
    const url = new URL(req.url || '/api/pagos', baseUrl);
    const pathParam = url.searchParams.get('path');
    if (!pathParam) {
      return;
    }

    url.searchParams.delete('path');
    const queryString = url.searchParams.toString();
    req.url = `/api/pagos/${pathParam}${queryString ? `?${queryString}` : ''}`;
    if (typeof req.originalUrl === 'string') {
      req.originalUrl = req.url;
    }
  } catch (error) {
    console.error('Error al restaurar ruta pagos:', error);
  }
};

export default async function handler(req, res) {
  restorePagosRequestPath(req);
  return serverlessHandler(req, res);
}
