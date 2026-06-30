import express from 'express';
import rateLimit from 'express-rate-limit';
import { supabase } from '../index.js';
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
    const sites = await listPublicInternalRequestSites();
    res.json(sites);
  } catch (error) {
    console.error('Get public internal request sites error:', error);
    res.status(500).json({ error: 'No se pudieron cargar las sedes' });
  }
});

router.post('/public', publicSubmitLimiter, async (req, res) => {
  try {
    const result = await createInternalRequestWithTask(req.body, { isPublic: true });
    res.status(201).json(result);
  } catch (error) {
    const status = error?.statusCode || 500;
    console.error('Create public internal request error:', error);
    res.status(status).json({ error: error.message || 'Error al crear la solicitud' });
  }
});

// Get all internal requests
router.get('/', authenticateToken, async (req, res) => {