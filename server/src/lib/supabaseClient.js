import { createClient } from '@supabase/supabase-js';

const FETCH_TIMEOUT_MS = 12_000;

const fetchWithTimeout = (url, options = {}) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  return fetch(url, { ...options, signal: controller.signal }).finally(() => {
    clearTimeout(timeoutId);
  });
};

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_KEY ||
  process.env.SUPABASE_STORAGE_KEY;

const useLocalDb = process.env.USE_LOCAL_DB === 'true';

export const supabase =
  useLocalDb || !supabaseUrl || !supabaseServiceKey
    ? null
    : createClient(supabaseUrl, supabaseServiceKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },
        global: {
          fetch: fetchWithTimeout,
        },
      });
