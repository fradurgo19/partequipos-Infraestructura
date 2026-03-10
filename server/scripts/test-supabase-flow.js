/**
 * Script de pruebas de integración: API Backend → Supabase
 * Verifica que todos los recursos se lean y escriban correctamente en Supabase.
 *
 * Uso (desde server/):
 *   node scripts/test-supabase-flow.js
 *
 * Variables de entorno (server/.env o export):
 *   API_URL=http://localhost:3000  (opcional, default localhost:3000)
 *   TEST_EMAIL=tu_usuario@ejemplo.com
 *   TEST_PASSWORD=tu_contraseña
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env') });

const API_URL = process.env.API_URL || 'http://localhost:3000';
const TEST_EMAIL = process.env.TEST_EMAIL;
const TEST_PASSWORD = process.env.TEST_PASSWORD;

const results = { ok: [], fail: [] };

function log(msg, type = 'info') {
  const prefix = type === 'ok' ? '✅' : type === 'fail' ? '❌' : '📌';
  console.log(`${prefix} ${msg}`);
}

async function request(method, path, token, body = null) {
  const opts = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  };
  if (body && (method === 'POST' || method === 'PATCH')) opts.body = JSON.stringify(body);
  const res = await fetch(`${API_URL}${path}`, opts);
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }
  return { status: res.status, data };
}

async function run() {
  console.log('\n--- Pruebas de flujo API → Supabase ---\n');
  console.log(`API: ${API_URL}`);
  if (!TEST_EMAIL || !TEST_PASSWORD) {
    log('Define TEST_EMAIL y TEST_PASSWORD en .env (server/) para ejecutar todas las pruebas.', 'fail');
    process.exitCode = 1;
    return;
  }

  let token = null;

  // 1. Health check
  try {
    const health = await request('GET', '/health');
    if (health.status !== 200) throw new Error(health.data?.message || health.status);
    log(`Health: ${health.data?.database ?? 'ok'}`, 'ok');
  } catch (e) {
    log(`Health: ${e.message}`, 'fail');
    results.fail.push({ step: 'health', error: e.message });
  }

  // 2. Login
  try {
    const login = await request('POST', '/api/auth/login', null, {
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
    });
    if (login.status !== 200 || !login.data?.session?.access_token) {
      throw new Error(login.data?.error || 'Login failed');
    }
    token = login.data.session.access_token;
    log('Login OK', 'ok');
  } catch (e) {
    log(`Login: ${e.message}`, 'fail');
    results.fail.push({ step: 'login', error: e.message });
    console.log('\nNo se pudo obtener token. Revisa TEST_EMAIL, TEST_PASSWORD y que el backend use Supabase (USE_LOCAL_DB no definido o false).\n');
    process.exitCode = 1;
    return;
  }

  const assert = (step, res, expectStatus = 200) => {
    if (res.status === expectStatus || (expectStatus === 201 && res.status === 201)) {
      results.ok.push(step);
      log(step, 'ok');
      return true;
    }
    const err = res.data?.error || res.data?.message || res.status;
    results.fail.push({ step, error: err });
    log(`${step}: ${err}`, 'fail');
    return false;
  };

  // 3. GET de todos los recursos (lectura desde Supabase)
  const getEndpoints = [
    ['GET /api/sites', '/api/sites'],
    ['GET /api/contractors', '/api/contractors'],
    ['GET /api/tasks', '/api/tasks'],
    ['GET /api/service-orders', '/api/service-orders'],
    ['GET /api/measurements', '/api/measurements'],
    ['GET /api/internal-requests', '/api/internal-requests'],
    ['GET /api/quotations', '/api/quotations'],
    ['GET /api/purchase-orders', '/api/purchase-orders'],
    ['GET /api/contracts', '/api/contracts'],
    ['GET /api/users', '/api/users'],
  ];

  log('--- Lectura (GET) ---', 'info');
  for (const [label, path] of getEndpoints) {
    try {
      const res = await request('GET', path, token);
      assert(label, res);
    } catch (e) {
      results.fail.push({ step: label, error: e.message });
      log(`${label}: ${e.message}`, 'fail');
    }
  }

  // 4. POST (creación en Supabase) — orden por dependencias
  log('--- Creación (POST) ---', 'info');

  let siteId = null;
  let contractorId = null;

  try {
    const sitesRes = await request('POST', '/api/sites', token, {
      name: `Test Site ${Date.now()}`,
      location: 'Ubicación prueba Supabase',
    });
    if (assert('POST /api/sites', sitesRes, 201) && sitesRes.data?.id) siteId = sitesRes.data.id;
  } catch (e) {
    results.fail.push({ step: 'POST /api/sites', error: e.message });
    log(`POST /api/sites: ${e.message}`, 'fail');
  }

  try {
    const contractorsRes = await request('POST', '/api/contractors', token, {
      company_name: `Test Contractor ${Date.now()}`,
      contact_name: 'Contacto Prueba',
      email: `test-${Date.now()}@test.com`,
      phone: '3000000000',
    });
    if (assert('POST /api/contractors', contractorsRes, 201) && contractorsRes.data?.id) {
      contractorId = contractorsRes.data.id;
    }
  } catch (e) {
    results.fail.push({ step: 'POST /api/contractors', error: e.message });
    log(`POST /api/contractors: ${e.message}`, 'fail');
  }

  try {
    const tasksRes = await request('POST', '/api/tasks', token, {
      title: 'Tarea prueba Supabase',
      description: 'Descripción de prueba',
      task_type: 'maintenance',
      requesting_area: 'Área prueba',
    });
    assert('POST /api/tasks', tasksRes, 201);
  } catch (e) {
    results.fail.push({ step: 'POST /api/tasks', error: e.message });
    log(`POST /api/tasks: ${e.message}`, 'fail');
  }

  try {
    const measurementsRes = await request('POST', '/api/measurements', token, {
      title: 'Medición prueba Supabase',
    });
    assert('POST /api/measurements', measurementsRes, 201);
  } catch (e) {
    results.fail.push({ step: 'POST /api/measurements', error: e.message });
    log(`POST /api/measurements: ${e.message}`, 'fail');
  }

  try {
    const internalRes = await request('POST', '/api/internal-requests', token, {
      title: 'Solicitud interna prueba',
      description: 'Descripción prueba',
      department: 'Departamento prueba',
    });
    assert('POST /api/internal-requests', internalRes, 201);
  } catch (e) {
    results.fail.push({ step: 'POST /api/internal-requests', error: e.message });
    log(`POST /api/internal-requests: ${e.message}`, 'fail');
  }

  try {
    const quotationsRes = await request('POST', '/api/quotations', token, {
      title: 'Cotización prueba Supabase',
      description: 'Descripción prueba',
    });
    assert('POST /api/quotations', quotationsRes, 201);
  } catch (e) {
    results.fail.push({ step: 'POST /api/quotations', error: e.message });
    log(`POST /api/quotations: ${e.message} (puede requerir rol admin/infra/supervision)`, 'fail');
  }

  let contractorIdForSo = contractorId;
  if (!contractorIdForSo) {
    const cr = await request('GET', '/api/contractors', token);
    contractorIdForSo = Array.isArray(cr.data) && cr.data.length > 0 ? cr.data[0].id : null;
  }
  if (siteId && contractorIdForSo) {
    try {
      const soRes = await request('POST', '/api/service-orders', token, {
        site_id: siteId,
        contractor_id: contractorIdForSo,
        activity_type: 'maintenance',
        description: 'Orden de servicio prueba',
        budget_amount: 100000,
      });
      assert('POST /api/service-orders', soRes, 201);
    } catch (e) {
      results.fail.push({ step: 'POST /api/service-orders', error: e.message });
      log(`POST /api/service-orders: ${e.message}`, 'fail');
    }
  } else {
    log('POST /api/service-orders: omitido (falta site_id o contractor_id)', 'info');
  }

  let siteIdForPo = siteId;
  if (!siteIdForPo) {
    const sr = await request('GET', '/api/sites', token);
    siteIdForPo = Array.isArray(sr.data) && sr.data.length > 0 ? sr.data[0].id : null;
  }
  if (siteIdForPo) {
    try {
      const poRes = await request('POST', '/api/purchase-orders', token, {
        site_id: siteIdForPo,
        status: 'draft',
      });
      assert('POST /api/purchase-orders', poRes, 201);
    } catch (e) {
      results.fail.push({ step: 'POST /api/purchase-orders', error: e.message });
      log(`POST /api/purchase-orders: ${e.message}`, 'fail');
    }
  } else {
    log('POST /api/purchase-orders: omitido (falta site_id)', 'info');
  }

  let siteIdForContract = siteId;
  let contractorIdForContract = contractorId;
  if (!siteIdForContract) {
    const sr = await request('GET', '/api/sites', token);
    siteIdForContract = Array.isArray(sr.data) && sr.data.length > 0 ? sr.data[0].id : null;
  }
  if (!contractorIdForContract) {
    const cr = await request('GET', '/api/contractors', token);
    contractorIdForContract = Array.isArray(cr.data) && cr.data.length > 0 ? cr.data[0].id : null;
  }
  if (siteIdForContract && contractorIdForContract) {
    try {
      const contractsRes = await request('POST', '/api/contracts', token, {
        site_id: siteIdForContract,
        contractor_id: contractorIdForContract,
        contract_type: 'service',
        activity_type: 'maintenance',
        description: 'Contrato prueba Supabase',
      });
      assert('POST /api/contracts', contractsRes, 201);
    } catch (e) {
      results.fail.push({ step: 'POST /api/contracts', error: e.message });
      log(`POST /api/contracts: ${e.message}`, 'fail');
    }
  } else {
    log('POST /api/contracts: omitido (falta site_id o contractor_id)', 'info');
  }

  // Resumen
  console.log('\n--- Resumen ---');
  console.log(`OK: ${results.ok.length}`);
  console.log(`Fallos: ${results.fail.length}`);
  if (results.fail.length > 0) {
    results.fail.forEach(({ step, error }) => console.log(`  - ${step}: ${error}`));
    process.exitCode = 1;
  }
  console.log('');
}

run().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
