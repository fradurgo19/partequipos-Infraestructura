import express from 'express';
import { supabase } from '../index.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Get all contractors
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { is_active } = req.query;
    let query = supabase
      .from('contractors')
      .select('*')
      .order('company_name');

    if (is_active !== undefined) {
      query = query.eq('is_active', is_active === 'true');
    }

    const { data, error } = await query;

    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('Get contractors error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get single contractor
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('contractors')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('Get contractor error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create contractor
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('contractors')
      .insert([req.body])
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (error) {
    console.error('Create contractor error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update contractor
router.patch('/:id', authenticateToken, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('contractors')
      .update(req.body)
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('Update contractor error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete contractor
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { error } = await supabase
      .from('contractors')
      .delete()
      .eq('id', req.params.id);

    if (error) throw error;
    res.json({ message: 'Contractor deleted successfully' });
  } catch (error) {
    console.error('Delete contractor error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;

