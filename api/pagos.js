/**
 * Handler serverless dedicado para /api/pagos/*
 * Evita cargar toda la app Express en cada request de pagos (menor cold start).
 */
import serverless from 'serverless-http';
import { createPagosApp } from '../server/src/pagos/app.js';

const app = createPagosApp();

export default serverless(app);
