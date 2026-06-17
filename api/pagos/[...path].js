/**
 * Handler serverless para /api/pagos/*
 * Catch-all de Vercel preserva la ruta (p. ej. /api/pagos/auth/login).
 */
import serverless from 'serverless-http';
import { createPagosApp } from '../../server/src/pagos/app.js';

const app = createPagosApp();

export default serverless(app);
