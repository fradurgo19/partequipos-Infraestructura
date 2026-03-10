/**
 * Handler serverless de Vercel: expone la API Express en /api/*
 * Todas las rutas /api/* se enrutan a este handler.
 */
import app from '../server/src/index.js';
import serverless from 'serverless-http';

const handler = serverless(app);

export default handler;
