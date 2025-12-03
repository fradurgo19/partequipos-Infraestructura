import express from 'express';
import { supabase } from '../index.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

// Get all users (admins only)
router.get('/', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('full_name', { ascending: true });

    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update user role
router.patch('/:id/role', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { role } = req.body;

    const { data, error } = await supabase
      .from('profiles')
      .update({ role })
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('Update user role error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;

