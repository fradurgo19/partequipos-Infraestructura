import express from 'express';
import rateLimit from 'express-rate-limit';
import { supabase } from '../lib/supabaseClient.js';
import { authenticateToken } from '../middleware/auth.js';
import {
  createInternalRequestWithTask,
  listPublicInternalRequestSites,
} from '../services/internalRequestFlow.js';

const router = express.Router();

const publicSubmitLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiadas solicitudes. Intente más tarde.' },
});

router.get('/public/sites', async (req, res) => {
  try {
    if (!supabase) {
      return res.status(500).json({ error: 'Base de datos no configurada en el servidor' });
    }

    const sites = await listPublicInternalRequestSites();
    res.setHeader('Cache-Control', 'public, max-age=300');
    return res.json(sites);
  } catch (error) {
    console.error('Get public internal request sites error:', error);
    return res.status(500).json({ error: 'No se pudieron cargar las sedes' });
  }
});

router.post('/public', publicSubmitLimiter, async (req, res) => {
  try {
    if (!supabase) {
      return res.status(500).json({ error: 'Base de datos no configurada en el servidor' });
    }

    const result = await createInternalRequestWithTask(req.body, { isPublic: true });
    return res.status(201).json(result);
  } catch (error) {
    const status = error?.statusCode || 500;
    console.error('Create public internal request error:', error);
    return res.status(status).json({ error: error.message || 'Error al crear la solicitud' });
  }
});

router.get('/', authenticateToken, async (req, res) => {
  try {
    let query = supabase
      .from('internal_requests')
      .select('*')
      .order('created_at', { ascending: false });

    if (req.profile.role === 'internal_client') {
      query = query.eq('created_by', req.profile.id);
    }

    const { data: requests, error } = await query;

    if (error) throw error;

    const creatorIds = [...new Set((requests || []).map((r) => r.created_by).filter(Boolean))];
    let profilesMap = {};
    if (creatorIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', creatorIds);
      if (Array.isArray(profiles)) {
        profilesMap = Object.fromEntries(profiles.map((p) => [p.id, { id: p.id, full_name: p.full_name }]));
      }
    }

    const enriched = (requests || []).map((r) => ({
      ...r,
      created_by_user: r.created_by ? profilesMap[r.created_by] || null : null,
    }));

    res.json(enriched);
  } catch (error) {
    console.error('Get internal requests error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/', authenticateToken, async (req, res) => {
  try {
    const profileId = req.profile.id;
    const requestData = {
      ...req.body,
      created_by: profileId,
      requester_id: profileId,
      status: 'pending',
    };

    const { data, error } = await supabase
      .from('internal_requests')
      .insert([requestData])
      .select()
      .single();

    if (error) throw error;

    const { data: infrastructureTeam } = await supabase
      .from('profiles')
      .select('id')
      .eq('role', 'infrastructure');

    if (Array.isArray(infrastructureTeam) && infrastructureTeam.length > 0) {
      const notifications = infrastructureTeam.map((member) => ({
        user_id: member.id,
        title: 'New Internal Request',
        message: `A new request "${requestData.title}" has been submitted by ${req.profile.full_name}`,
        type: 'internal_request',
        reference_id: data.id,
      }));

      await supabase.from('notifications').insert(notifications);
    }

    res.status(201).json(data);
  } catch (error) {
    console.error('Create internal request error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
