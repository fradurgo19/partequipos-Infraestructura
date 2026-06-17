import express from 'express';
import cors from 'cors';
import pagosRoutes from '../routes/pagos/index.js';

export const createPagosApp = () => {
  const app = express();

  app.use(
    cors({
      origin: process.env.FRONTEND_URL || '*',
      credentials: true,
    })
  );
  app.use(express.json({ limit: '10mb' }));

  app.use('/api/pagos', pagosRoutes);

  app.use((err, _req, res, _next) => {
    console.error('Error en API pagos:', err);
    res.status(err.status || 500).json({
      error: err.message || 'Error interno del servidor',
    });
  });

  return app;
};
