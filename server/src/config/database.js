import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

// Configuración de la conexión a PostgreSQL
export const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'maintenance_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  max: 20, // máximo de conexiones en el pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Test de conexión
pool.on('connect', () => {
  console.log('✅ Conectado a PostgreSQL');
});

pool.on('error', (err) => {
  console.error('❌ Error inesperado en el pool de PostgreSQL:', err);
  process.exit(-1);
});

// Función helper para ejecutar queries
export const query = async (text, params) => {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log('Ejecutada query', { text, duration, rows: res.rowCount });
    return res;
  } catch (error) {
    console.error('Error en query:', error);
    throw error;
  }
};

// Función para obtener un cliente del pool (para transacciones)
export const getClient = async () => {
  const client = await pool.connect();
  const query = client.query.bind(client);
  const release = client.release.bind(client);

  // Monitorear el timeout de la conexión
  const timeout = setTimeout(() => {
    console.error('Cliente no liberado después de 5 segundos!');
  }, 5000);

  // Wrapper de release para limpiar el timeout
  client.release = () => {
    clearTimeout(timeout);
    return release();
  };

  return client;
};

export default pool;

