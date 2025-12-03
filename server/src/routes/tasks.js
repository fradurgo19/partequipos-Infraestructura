import express from 'express';
import { supabase } from '../index.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Get all tasks (with filters)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { status, search } = req.query;

    let query = supabase
      .from('tasks')
      .select(
        `*,
        requester:profiles!tasks_requester_id_fkey(id, full_name, role),
        assignee:profiles!tasks_assignee_id_fkey(id, full_name, role),
        site:sites(id, name, location)`
      )
      .order('created_at', { ascending: false });

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    if (search) {
      query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
    }

    const { data, error } = await query;

    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('Get tasks error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get single task
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('tasks')
      .select(
        `*,
        requester:profiles!tasks_requester_id_fkey(id, full_name, role),
        assignee:profiles!tasks_assignee_id_fkey(id, full_name, role),
        site:sites(id, name, location)`
      )
      .eq('id', req.params.id)
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('Get task error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create task
router.post('/', authenticateToken, async (req, res) => {
  try {
    const taskData = {
      ...req.body,
      requester_id: req.profile.id,
      status: req.body.status || 'pending',
    };

    const { data, error } = await supabase
      .from('tasks')
      .insert([taskData])
      .select()
      .single();

    if (error) throw error;

    // Create timeline entry
    await supabase.from('task_timeline').insert([
      {
        task_id: data.id,
        event_type: 'created',
        description: `Task created by ${req.profile.full_name}`,
        user_id: req.profile.id,
      },
    ]);

    // Create notification for high budget tasks
    if (taskData.budget_amount && taskData.budget_amount > 10000000) {
      await supabase.from('notifications').insert([
        {
          user_id: req.profile.id,
          title: 'High Budget Task Created',
          message: `Task "${taskData.title}" has a budget over $10M and requires Don Pedro's approval`,
          type: 'task',
          reference_id: data.id,
        },
      ]);
    }

    res.status(201).json(data);
  } catch (error) {
    console.error('Create task error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update task status
router.patch('/:id/status', authenticateToken, async (req, res) => {
  try {
    const { status } = req.body;
    const updateData = { status };

    if (status === 'in_progress') {
      updateData.started_at = new Date().toISOString();
    }

    if (status === 'completed') {
      updateData.completed_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from('tasks')
      .update(updateData)
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;

    // Create timeline entry
    await supabase.from('task_timeline').insert([
      {
        task_id: req.params.id,
        event_type: status === 'completed' ? 'completed' : 'updated',
        description: `Status changed to ${status}`,
        user_id: req.profile.id,
      },
    ]);

    res.json(data);
  } catch (error) {
    console.error('Update task status error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;

