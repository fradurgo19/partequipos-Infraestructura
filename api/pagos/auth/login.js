import { authenticatePagosCredentials } from '../../../server/src/pagos/login.js';

const readJsonBody = (req) =>
  new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => {
      try {
        const raw = Buffer.concat(chunks).toString('utf8');
        resolve(raw ? JSON.parse(raw) : {});
      } catch (error) {
        reject(error);
      }
    });
    req.on('error', reject);
  });

export default async function handler(req, res) {
  const startedAt = Date.now();
  // #region agent log
  console.log(
    '[debug-41f171] pagos-login-direct-entry',
    JSON.stringify({ method: req.method, url: req.url })
  );
  // #endregion

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Use POST' });
  }

  let body;
  try {
    body = await readJsonBody(req);
  } catch {
    return res.status(400).json({ error: 'JSON inválido' });
  }

  const { email, password } = body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email y contraseña son requeridos' });
  }

  try {
    const result = await authenticatePagosCredentials(email, password);
    if (!result) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    // #region agent log
    console.log(
      '[debug-41f171] pagos-login-direct-success',
      JSON.stringify({ durationMs: Date.now() - startedAt })
    );
    // #endregion

    return res.status(200).json(result);
  } catch (error) {
    // #region agent log
    console.log(
      '[debug-41f171] pagos-login-direct-error',
      JSON.stringify({
        durationMs: Date.now() - startedAt,
        message: error instanceof Error ? error.message : 'unknown',
      })
    );
    // #endregion

    const status = error?.statusCode || 500;
    return res.status(status).json({
      error: error instanceof Error ? error.message : 'Error al iniciar sesión',
    });
  }
}
