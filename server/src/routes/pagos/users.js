import express from 'express';
import { supabase } from '../../lib/supabaseClient.js';
import {
  authenticatePagosToken,
  requirePagosCoordinator,
} from '../../middleware/pagosAuth.js';
import { getPagosTable, transformUserToFrontend } from '../../pagos/transforms.js';

const router = express.Router();
const PAGOS_TABLE = getPagosTable();

router.get('/', authenticatePagosToken, requirePagosCoordinator, async (req, res) => {
  try {
    const { data: users, error } = await supabase
      .from(PAGOS_TABLE)
      .select('id, email, full_name, role, department, location, created_at, updated_at')
      .order('created_at', { ascending: false });

    if (error) return res.status(500).json({ error: 'Error al obtener usuarios' });
    res.json((users || []).map(transformUserToFrontend));
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener usuarios' });
  }
});

router.post('/create', authenticatePagosToken, requirePagosCoordinator, async (req, res) => {
  try {
    const { email, password, fullName, location, department, role } = req.body;
    if (!email || !password || !fullName || !location) {
      return res.status(400).json({ error: 'Faltan campos requeridos' });
    }

    const { data: existing } = await supabase.from(PAGOS_TABLE).select('id').eq('email', email).maybeSingle();
    if (existing) {
      return res.status(400).json({ error: 'El email ya está registrado' });
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

    const { data: user, error: updateError } = await supabase
      .from(PAGOS_TABLE)
      .update({
        role: role || 'basic_user',
        department: department || null,
      })
      .eq('id', userId)
      .select('id, email, full_name, role, department, location, created_at, updated_at')
      .single();

    if (updateError || !user) {
      return res.status(500).json({ error: 'Error al configurar usuario' });
    }

    res.status(201).json(transformUserToFrontend(user));
  } catch (error) {
    res.status(500).json({ error: 'Error al crear usuario' });
  }
});

router.put('/:id', authenticatePagosToken, requirePagosCoordinator, async (req, res) => {
  try {
    const { id } = req.params;
    const { fullName, location, department, role, password } = req.body;
    if (!fullName || !location) {
      return res.status(400).json({ error: 'Faltan campos requeridos' });
    }

    const { error: updateError } = await supabase
      .from(PAGOS_TABLE)
      .update({
        full_name: fullName,
        location,
        department: department || null,
        role: role || 'basic_user',
      })
      .eq('id', id);

    if (updateError) {
      return res.status(500).json({ error: updateError.message });
    }

    if (password) {
      const { error: pwdError } = await supabase.rpc('update_pagos_password', {
        p_user_id: id,
        p_password: password,
      });
      if (pwdError) {
        return res.status(500).json({ error: 'Error al actualizar contraseña' });
      }
    }

    const { data: user, error } = await supabase
      .from(PAGOS_TABLE)
      .select('id, email, full_name, role, department, location, created_at, updated_at')
      .eq('id', id)
      .single();

    if (error || !user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    res.json(transformUserToFrontend(user));
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar usuario' });
  }
});

router.delete('/:id', authenticatePagosToken, requirePagosCoordinator, async (req, res) => {
  try {
    const { id } = req.params;
    if (id === req.pagosUser.id) {
      return res.status(400).json({ error: 'No puedes eliminar tu propia cuenta' });
    }

    const { data, error } = await supabase.from(PAGOS_TABLE).delete().eq('id', id).select('id');
    if (error || !data?.length) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    res.json({ message: 'Usuario eliminado correctamente' });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar usuario' });
  }
});

export default router;
