import express from 'express';
import { supabase } from '../index.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Get all contracts
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { status, contract_type, activity_type } = req.query;
    
    let query = supabase
      .from('contracts')
      .select(`
        *,
        contractor:contractors(id, company_name, contact_name, email, phone, nit),
        site:sites(id, name, location),
        created_by_user:profiles!contracts_created_by_fkey(id, full_name),
        legal_reviewed_by_user:profiles!contracts_legal_reviewed_by_fkey(id, full_name)
      `)
      .order('created_at', { ascending: false });

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    if (contract_type) {
      query = query.eq('contract_type', contract_type);
    }

    if (activity_type) {
      query = query.eq('activity_type', activity_type);
    }

    const { data, error } = await query;

    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('Get contracts error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get single contract
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('contracts')
      .select(`
        *,
        contractor:contractors(id, company_name, contact_name, email, phone, nit),
        site:sites(id, name, location)
      `)
      .eq('id', req.params.id)
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('Get contract error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create contract
router.post('/', authenticateToken, async (req, res) => {
  try {
    let contractNumber = req.body.contract_number;

    if (!contractNumber) {
      const contractType = req.body.contract_type || 'labor';
      try {
        const { data: rpcData } = await supabase.rpc('generate_contract_number', {
          contract_type_param: contractType,
        });
        contractNumber = rpcData || '';
      } catch {
        contractNumber = '';
      }
      if (!contractNumber) {
        let prefix = 'CON-MIX-';
        if (contractType === 'labor') prefix = 'CON-MO-';
        else if (contractType === 'supply') prefix = 'CON-SUM-';
        const year = new Date().getFullYear();
        const { data: lastContract } = await supabase
          .from('contracts')
          .select('contract_number')
          .like('contract_number', `${prefix}${year}%`)
          .order('contract_number', { ascending: false })
          .limit(1)
          .maybeSingle();
        const nextNum = lastContract?.contract_number
          ? Number.parseInt(String(lastContract.contract_number).slice(-4), 10) + 1
          : 1;
        contractNumber = `${prefix}${year}${String(nextNum).padStart(4, '0')}`;
      }
    }

    const today = new Date().toISOString().split('T')[0];
    const contractData = {
      ...req.body,
      contract_number: contractNumber,
      total_amount: req.body.total_amount ?? 0,
      start_date: req.body.start_date ?? today,
      end_date: req.body.end_date ?? null,
      created_by: req.profile.id,
      status: req.body.status || 'draft',
      legal_review_status: 'pending',
    };

    const { data, error } = await supabase
      .from('contracts')
      .insert([contractData])
      .select()
      .single();

    if (error?.code === '23505' && error?.message?.includes('contract_number')) {
      // Duplicate key: obtener de nuevo el último número y reintentar una vez
      const prefix = (req.body.contract_type || 'labor') === 'supply' ? 'CON-SUM-' : (req.body.contract_type || 'labor') === 'mixed' ? 'CON-MIX-' : 'CON-MO-';
      const year = new Date().getFullYear();
      const { data: lastContract } = await supabase
        .from('contracts')
        .select('contract_number')
        .ilike('contract_number', `${prefix}${year}%`)
        .order('contract_number', { ascending: false })
        .limit(1)
        .maybeSingle();
      const nextNum = lastContract?.contract_number
        ? Number.parseInt(String(lastContract.contract_number).slice(-4), 10) + 1
        : 1;
      contractData.contract_number = `${prefix}${year}${String(nextNum).padStart(4, '0')}`;
      const retry = await supabase.from('contracts').insert([contractData]).select().single();
      if (retry.error) throw retry.error;
      return res.status(201).json(retry.data);
    }
    if (error) throw error;
    res.status(201).json(data);
  } catch (error) {
    console.error('Create contract error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update contract
router.patch('/:id', authenticateToken, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('contracts')
      .update(req.body)
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('Update contract error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete contract
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { error } = await supabase
      .from('contracts')
      .delete()
      .eq('id', req.params.id);

    if (error) throw error;
    res.json({ message: 'Contract deleted successfully' });
  } catch (error) {
    console.error('Delete contract error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get addendums for a contract
router.get('/:id/addendums', authenticateToken, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('contract_addendums')
      .select('*')
      .eq('contract_id', req.params.id)
      .order('addendum_number', { ascending: true });

    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('Get addendums error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create addendum
router.post('/:id/addendums', authenticateToken, async (req, res) => {
  try {
    const addendumData = {
      ...req.body,
      contract_id: req.params.id,
      created_by: req.profile.id,
    };

    const { data, error } = await supabase
      .from('contract_addendums')
      .insert([addendumData])
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (error) {
    console.error('Create addendum error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;

