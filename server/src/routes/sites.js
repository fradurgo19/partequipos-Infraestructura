import express from 'express';
import { supabase } from '../index.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

// Get all sites
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('sites')
      .select('*, created_by:profiles!sites_created_by_fkey(full_name)')
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('Get sites error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get single site
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('sites')
      .select('*, created_by:profiles!sites_created_by_fkey(full_name)')
      .eq('id', req.params.id)
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('Get site error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create site
router.post('/', authenticateToken, requireRole('admin', 'infrastructure'), async (req, res) => {
  try {
    const siteData = {
      ...req.body,
      created_by: req.profile.id,
    };

    const { data, error } = await supabase
      .from('sites')
      .insert([siteData])
      .select('*, created_by:profiles!sites_created_by_fkey(full_name)')
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (error) {
    console.error('Create site error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update site
router.put('/:id', authenticateToken, requireRole('admin', 'infrastructure'), async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('sites')
      .update(req.body)
      .eq('id', req.params.id)
      .select('*, created_by:profiles!sites_created_by_fkey(full_name)')
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('Update site error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete site
router.delete('/:id', authenticateToken, requireRole('admin', 'infrastructure'), async (req, res) => {
  try {
    const { error } = await supabase.from('sites').delete().eq('id', req.params.id);

    if (error) throw error;
    res.json({ message: 'Site deleted successfully' });
  } catch (error) {
    console.error('Delete site error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;

