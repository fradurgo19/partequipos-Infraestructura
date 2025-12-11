import express from 'express';
import { supabase } from '../index.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Get all purchase orders
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('purchase_orders')
      .select(`
        *,
        site:sites(id, name, location),
        service_order:service_orders(id, order_number),
        created_by_user:profiles!purchase_orders_created_by_fkey(id, full_name),
        prepared_by_user:profiles!purchase_orders_prepared_by_fkey(id, full_name),
        authorized_by_user:profiles!purchase_orders_authorized_by_fkey(id, full_name)
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('Get purchase orders error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get single purchase order
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('purchase_orders')
      .select(`
        *,
        site:sites(id, name, location),
        service_order:service_orders(id, order_number)
      `)
      .eq('id', req.params.id)
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('Get purchase order error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create purchase order
router.post('/', authenticateToken, async (req, res) => {
  try {
    const orderData = {
      ...req.body,
      created_by: req.profile.id,
      status: req.body.status || 'draft',
    };

    const { data, error } = await supabase
      .from('purchase_orders')
      .insert([orderData])
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (error) {
    console.error('Create purchase order error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update purchase order
router.patch('/:id', authenticateToken, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('purchase_orders')
      .update(req.body)
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('Update purchase order error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete purchase order
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { error } = await supabase
      .from('purchase_orders')
      .delete()
      .eq('id', req.params.id);

    if (error) throw error;
    res.json({ message: 'Purchase order deleted successfully' });
  } catch (error) {
    console.error('Delete purchase order error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;

