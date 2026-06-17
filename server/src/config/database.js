import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;
const USE_LOCAL_DB = process.env.USE_LOCAL_DB === 'true';

export const pool = USE_LOCAL_DB
  ? new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME || 'maintenance_db',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'password',
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    })
  : null;

if (pool) {
  pool.on('connect', () => {
    console.log('✅ Conectado a PostgreSQL');
  });

  pool.on('error', (err) => {
    console.error('❌ Error inesperado en el pool de PostgreSQL:', err);
    if (process.env.VERCEL !== '1') {
      process.exit(-1);
    }
  });
}

export const query = async (text, params) => {
  if (!pool) {
    throw new Error('PostgreSQL local no configurado');
  }

  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    if (process.env.LOG_LEVEL === 'debug' || process.env.DEBUG === 'true') {
      const duration = Date.now() - start;
      console.log('Ejecutada query', { text: text.substring(0, 80), duration, rows: res.rowCount });
    }
    return res;
  } catch (error) {
    console.error('Error en query:', error);
    throw error;
  }
};

export const getClient = async () => {
  if (!pool) {
    throw new Error('PostgreSQL local no configurado');
  }

  const client = await pool.connect();
  const release = client.release.bind(client);

  const timeout = setTimeout(() => {
    console.error('Cliente no liberado después de 5 segundos!');
  }, 5000);

  client.release = () => {
    clearTimeout(timeout);
    return release();
  };

  return client;
};

export default pool;
