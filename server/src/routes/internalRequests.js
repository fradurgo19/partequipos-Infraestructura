import express from 'express';
import { supabase } from '../index.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

// Get all internal requests
router.get('/', authenticateToken, async (req, res) => {
  try {
    let query = supabase
      .from('internal_requests')
      .select('*, created_by_user:profiles!internal_requests_created_by_fkey(id, full_name)')
      .order('created_at', { ascending: false });

    // Filter by role
    if (req.profile.role === 'internal_client') {
      query = query.eq('created_by', req.profile.id);
    }

    const { data, error } = await query;

    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('Get internal requests error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create internal request
router.post('/', authenticateToken, async (req, res) => {
  try {
    const requestData = {
      ...req.body,
      created_by: req.profile.id,
      status: 'pending',
    };

    const { data, error } = await supabase
      .from('internal_requests')
      .insert([requestData])
      .select()
      .single();

    if (error) throw error;

    // Notify infrastructure team
    const { data: infrastructureTeam } = await supabase
      .from('profiles')
      .select('id')
      .eq('role', 'infrastructure');

    if (infrastructureTeam) {
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

