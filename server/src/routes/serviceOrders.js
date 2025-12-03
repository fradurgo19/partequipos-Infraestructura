import express from 'express';
import { supabase } from '../index.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

// Get all service orders
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('service_orders')
      .select(
        `*,
        site:sites(id, name, location),
        contractor:contractors(id, company_name, contact_name),
        created_by_user:profiles!service_orders_created_by_fkey(id, full_name)`
      )
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('Get service orders error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get single service order
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('service_orders')
      .select(
        `*,
        site:sites(id, name, location),
        contractor:contractors(id, company_name, contact_name),
        created_by_user:profiles!service_orders_created_by_fkey(id, full_name)`
      )
      .eq('id', req.params.id)
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('Get service order error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create service order
router.post('/', authenticateToken, requireRole('admin', 'infrastructure', 'supervision'), async (req, res) => {
  try {
    const { site_id } = req.body;

    // Get next order number for this site
    const { data: existingOrders } = await supabase
      .from('service_orders')
      .select('order_number')
      .eq('site_id', site_id)
      .order('order_number', { ascending: false })
      .limit(1);

    const nextOrderNumber = existingOrders && existingOrders.length > 0
      ? (parseInt(existingOrders[0].order_number) + 1).toString().padStart(4, '0')
      : '0001';

    const orderData = {
      ...req.body,
      order_number: nextOrderNumber,
      created_by: req.profile.id,
      status: req.body.status || 'draft',
    };

    const { data, error } = await supabase
      .from('service_orders')
      .insert([orderData])
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (error) {
    console.error('Create service order error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;

