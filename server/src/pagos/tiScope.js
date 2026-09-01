import { supabase } from '../lib/supabaseClient.js';

let tiScopeCache = null;

const isMissingTiColumnError = (error) => {
  if (!error) return false;
  const message = String(error.message ?? '').toLowerCase();
  const details = String(error.details ?? '').toLowerCase();
  return (
    error.code === '42703' ||
    message.includes('is_ti') ||
    details.includes('is_ti') ||
    message.includes('does not exist')
  );
};

const probeTiColumn = async (table) => {
  const { error } = await supabase.from(table).select('is_ti').limit(1);
  if (!error) {
    return true;
  }
  if (isMissingTiColumnError(error)) {
    return false;
  }
  return true;
};

export const getTiScopeSupport = async () => {
  if (tiScopeCache) {
    return tiScopeCache;
  }

  const [bills, profiles] = await Promise.all([
    probeTiColumn('utility_bills'),
    probeTiColumn('pagos_profiles'),
  ]);

  tiScopeCache = { bills, profiles };
  return tiScopeCache;
};

export const isTiBillsScopeEnabled = async () => (await getTiScopeSupport()).bills;

export const isTiProfilesScopeEnabled = async () => (await getTiScopeSupport()).profiles;

export const withTiBillFlag = async (payload, actorIsTi) => {
  const scope = await getTiScopeSupport();
  if (!scope.bills) {
    return payload;
  }
  return { ...payload, is_ti: actorIsTi };
};

export const getPagosProfileSelectFields = async (extended = true) => {
  const scope = await getTiScopeSupport();
  if (!extended) {
    return 'role';
  }
  return scope.profiles ? 'role, is_ti' : 'role';
};

export const applyTiUserScope = async (query, actorIsTi) => {
  const scope = await getTiScopeSupport();
  if (!scope.profiles) {
    return query;
  }
  return query.eq('is_ti', actorIsTi);
};

export const getPagosUsersSelectFields = async () => {
  const scope = await getTiScopeSupport();
  const base = 'id, email, full_name, role, department, location, created_at, updated_at';
  return scope.profiles ? `${base}, is_ti` : base;
};

export const applyTiBillDeleteScope = async (query, actorIsTi) => {
  const scope = await getTiScopeSupport();
  if (!scope.bills) {
    return query;
  }
  return query.eq('is_ti', actorIsTi);
};
