import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_KEY ||
  process.env.SUPABASE_STORAGE_KEY;

const useLocalDb = process.env.USE_LOCAL_DB === 'true';

export const supabase =
  useLocalDb || !supabaseUrl || !supabaseServiceKey
    ? null
    : createClient(supabaseUrl, supabaseServiceKey);
