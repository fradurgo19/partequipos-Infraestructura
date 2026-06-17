import express from 'express';
import { supabase } from '../../lib/supabaseClient.js';
import { authenticatePagosToken } from '../../middleware/pagosAuth.js';
import { signPagosToken } from '../../pagos/jwt.js';
import { getPagosTable } from '../../pagos/transforms.js';
import { authenticatePagosCredentials } from '../../pagos/login.js';
const router = express.Router();
const PAGOS_TABLE = getPagosTable();

const mapProfileResponse = (user) => ({
  id: user.id,
  email: user.email,
  fullName: user.full_name,
  role: user.role,
  department: user.department,
  location: user.location,
  createdAt: user.created_at,
  updatedAt: user.updated_at,
});

router.post('/signup', async (req, res) => {
  try {
    const { email, password, fullName, location } = req.body;
    if (!email || !password || !fullName || !location) {
      return res.status(400).json({ error: 'Todos los campos son requeridos' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
    }

    const { data: existing } = await supabase.from(PAGOS_TABLE).select('id').eq('email', email).maybeSingle();
    if (existing) {
      return res.status(400).json({ error: 'El usuario ya existe' });
    }

    const { data: userId, error: registerError } = await supabase.rpc('register_user', {
      p_email: email,
      p_password: password,
      p_full_name: fullName,
      p_location: location,
    });

    if (registerError) {
      return res.status(500).json({ error: registerError.message });
    }

    const { data: user, error: fetchError } = await supabase
      .from(PAGOS_TABLE)
      .select('id, email, full_name, role, department, location, created_at, updated_at')
      .eq('id', userId)
      .single();

    if (fetchError || !user) {
      return res.status(500).json({ error: 'Error al obtener usuario creado' });
    }

    const token = signPagosToken(user);
    res.status(201).json({ user: mapProfileResponse(user), token });
  } catch (error) {
    console.error('Error en signup pagos:', error);
    const status = error.statusCode || 500;
    res.status(status).json({ error: error.message || 'Error al crear usuario' });
  }
});

router.post('/login', async (req, res) => {
  const routeStartedAt = Date.now();
  // #region agent log
  console.log('[debug-41f171] login-route-entry', JSON.stringify({
    url: req.url,
    originalUrl: req.originalUrl,
    method: req.method,
  }));
  // #endregion
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email y contraseña son requeridos' });
    }

    if (!supabase) {
      return res.status(500).json({ error: 'Supabase no configurado en el servidor' });
    }

    const result = await authenticatePagosCredentials(email, password);
    if (!result) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    res.json(result);
  } catch (error) {
    console.error('Error en login pagos:', error);
    const status = error.statusCode || 500;
    res.status(status).json({ error: error.message || 'Error al iniciar sesión' });
  } finally {
    // #region agent log
    console.log('[debug-41f171] login-route-finally', JSON.stringify({
      durationMs: Date.now() - routeStartedAt,
      url: req.url,
    }));
    // #endregion
  }
});

router.get('/profile', authenticatePagosToken, async (req, res) => {
  try {
    const { data: user, error } = await supabase
      .from(PAGOS_TABLE)
      .select('id, email, full_name, role, department, location, created_at, updated_at')
      .eq('id', req.pagosUser.id)
      .single();

    if (error || !user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    res.json(mapProfileResponse(user));
  } catch (error) {
    console.error('Error al obtener perfil pagos:', error);
    res.status(500).json({ error: 'Error al obtener perfil' });
  }
});

router.get('/verify', authenticatePagosToken, (req, res) => {
  res.json({ valid: true, user: req.pagosUser });
});

router.post('/logout', authenticatePagosToken, (req, res) => {
  res.json({ message: 'Sesión cerrada exitosamente' });
});

export default router;
