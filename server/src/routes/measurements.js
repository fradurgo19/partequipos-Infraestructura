import express from 'express';
import { supabase } from '../index.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Get all measurements
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('measurements')
      .select('*, site:sites(id, name, location)')
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('Get measurements error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create measurement
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { length, height, depth, ...restBody } = req.body;

    const measurementData = {
      ...restBody,
      length: length ?? null,
      height: height ?? null,
      status: 'pending',
    };
    if (depth != null) measurementData.depth = depth;
    if (req.body.created_by != null) measurementData.created_by = req.body.created_by;

    const { data, error } = await supabase
      .from('measurements')
      .insert([measurementData])
      .select()
      .single();

    if (error) throw error;

    const area = length != null && height != null ? Number(length) * Number(height) : null;
    const volume = length != null && height != null && depth != null
      ? Number(length) * Number(height) * Number(depth)
      : null;

    res.status(201).json({ ...data, calculated_area: area, calculated_volume: volume });
  } catch (error) {
    console.error('Create measurement error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Approve measurement (multi-level approval)
router.post('/:id/approve', authenticateToken, async (req, res) => {
  try {
    const { approvalLevel } = req.body; // 'edison', 'felipe', 'claudia'

    const updateData = {};
    const newStatus = `approved_${approvalLevel}`;

    if (approvalLevel === 'edison') {
      updateData.approved_by_edison = req.profile.id;
      updateData.approved_at_edison = new Date().toISOString();
      updateData.status = newStatus;
    } else if (approvalLevel === 'felipe') {
      updateData.approved_by_felipe = req.profile.id;
      updateData.approved_at_felipe = new Date().toISOString();
      updateData.status = newStatus;
    } else if (approvalLevel === 'claudia') {
      updateData.approved_by_claudia = req.profile.id;
      updateData.approved_at_claudia = new Date().toISOString();
      updateData.status = newStatus;
    }

    const { data, error } = await supabase
      .from('measurements')
      .update(updateData)
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('Approve measurement error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;

