import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { pool } from './config/database.js';

// Import routes
import authRoutes from './routes/auth.js';
import sitesRoutes from './routes/sites.js';
import tasksRoutes from './routes/tasks.js';
import serviceOrdersRoutes from './routes/serviceOrders.js';
import measurementsRoutes from './routes/measurements.js';
import internalRequestsRoutes from './routes/internalRequests.js';
import quotationsRoutes from './routes/quotations.js';
import usersRoutes from './routes/users.js';
import uploadRoutes from './routes/upload.js';
import notificationsRoutes from './routes/notifications.js';
import purchaseOrdersRoutes from './routes/purchaseOrders.js';
import contractorsRoutes from './routes/contractors.js';
import contractsRoutes from './routes/contracts.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const USE_LOCAL_DB = process.env.USE_LOCAL_DB === 'true';

// Initialize database connection
let db = null;
let supabase = null;

if (USE_LOCAL_DB) {
  // Usar PostgreSQL local
  console.log('📦 Usando PostgreSQL local');
  db = pool;
} else {
  // Usar Supabase
  console.log('☁️  Usando Supabase');
  supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

// Exportar para uso en otros módulos
export { db, supabase };

// Middleware
app.use(helmet());
app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  })
);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
});
app.use('/api/', limiter);

// Health check
app.get('/health', async (req, res) => {
  try {
    if (USE_LOCAL_DB) {
      // Test conexión a PostgreSQL
      const result = await pool.query('SELECT NOW()');
      res.json({ 
        status: 'ok', 
        database: 'PostgreSQL local',
        timestamp: new Date().toISOString(),
        db_time: result.rows[0].now
      });
    } else {
      // Test conexión a Supabase
      res.json({ 
        status: 'ok', 
        database: 'Supabase',
        timestamp: new Date().toISOString() 
      });
    }
  } catch (error) {
    res.status(500).json({ 
      status: 'error', 
      message: error.message,
      timestamp: new Date().toISOString() 
    });
  }
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/sites', sitesRoutes);
app.use('/api/tasks', tasksRoutes);
app.use('/api/service-orders', serviceOrdersRoutes);
app.use('/api/measurements', measurementsRoutes);
app.use('/api/internal-requests', internalRequestsRoutes);
app.use('/api/quotations', quotationsRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/purchase-orders', purchaseOrdersRoutes);
app.use('/api/contractors', contractorsRoutes);
app.use('/api/contracts', contractsRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📦 Database: ${USE_LOCAL_DB ? 'PostgreSQL Local' : 'Supabase'}`);
});

