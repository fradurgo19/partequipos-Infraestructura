import express from 'express';
import { supabase } from '../index.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

// Get all quotations
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('quotations')
      .select('*, created_by_user:profiles!quotations_created_by_fkey(id, full_name)')
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('Get quotations error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create quotation comparison
router.post('/', authenticateToken, requireRole('admin', 'infrastructure', 'supervision'), async (req, res) => {
  try {
    const quotationData = {
      ...req.body,
      created_by: req.profile.id,
      status: 'pending',
    };

    const { data, error } = await supabase
      .from('quotations')
      .insert([quotationData])
      .select()
      .single();

    if (error) throw error;

    // Notify Pedro Cano for review
    const { data: pedroCano } = await supabase
      .from('profiles')
      .select('id')
      .ilike('full_name', '%Pedro Cano%')
      .limit(1);

    if (pedroCano && pedroCano.length > 0) {
      await supabase.from('notifications').insert([
        {
          user_id: pedroCano[0].id,
          title: 'Quotation Review Required',
          message: `A new quotation comparison "${quotationData.title}" requires your review`,
          type: 'quotation',
          reference_id: data.id,
        },
      ]);
    }

    res.status(201).json(data);
  } catch (error) {
    console.error('Create quotation error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;

