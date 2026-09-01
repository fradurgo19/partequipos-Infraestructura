import { supabase } from '../lib/supabaseClient.js';
import { isCoordinator } from './transforms.js';
import { getTiScopeSupport, isTiBillsScopeEnabled } from './tiScope.js';

const PAGOS_PROFILE_FIELDS = 'role, is_ti';
const PAGOS_PROFILE_ROLE_ONLY = 'role';

const getInfraProfileByUser = async (pagosUser) => {
  if (!pagosUser) return null;

  if (pagosUser.id) {
    const { data: byId } = await supabase
      .from('profiles')
      .select('role, full_name, email')
      .eq('id', pagosUser.id)
      .maybeSingle();
    if (byId) return byId;
  }

  if (pagosUser.email) {
    const { data: byEmail } = await supabase
      .from('profiles')
      .select('role, full_name, email')
      .eq('email', pagosUser.email)
      .maybeSingle();
    if (byEmail) return byEmail;
  }

  return null;
};

export const isInfraAdminProfile = (profile) => profile?.role === 'admin';

export const enrichPagosUserIfInfraAdmin = async (pagosUser) => {
  if (!pagosUser || pagosUser.infraAdmin || pagosUser.pagos) {
    return pagosUser;
  }

  const infraProfile = await getInfraProfileByUser(pagosUser);
  if (!isInfraAdminProfile(infraProfile)) {
    return pagosUser;
  }

  return {
    ...pagosUser,
    email: pagosUser.email || infraProfile.email,
    role: 'area_coordinator',
    infraAdmin: true,
    fullName: pagosUser.fullName || infraProfile.full_name,
  };
};

export const resolveActorRole = async (pagosUser) => {
  if (!pagosUser) return null;
  if (pagosUser.infraAdmin) return 'area_coordinator';

  const scope = await getTiScopeSupport();
  const profileFields = scope.profiles ? PAGOS_PROFILE_FIELDS : PAGOS_PROFILE_ROLE_ONLY;

  if (pagosUser.id) {
    const { data } = await supabase
      .from('pagos_profiles')
      .select(profileFields)
      .eq('id', pagosUser.id)
      .maybeSingle();

    if (data?.role) {
      return data.role;
    }
  }

  if (pagosUser.pagos && pagosUser.role) return pagosUser.role;
  if (isCoordinator(pagosUser.role)) return pagosUser.role;

  const infraProfile = await getInfraProfileByUser(pagosUser);
  if (isInfraAdminProfile(infraProfile)) {
    return 'area_coordinator';
  }

  return null;
};

export const getPagosProfileAccess = async (pagosUser) => {
  if (!pagosUser) {
    return { role: null, isTi: false };
  }

  if (pagosUser.infraAdmin) {
    return { role: 'area_coordinator', isTi: false };
  }

  if (pagosUser.id) {
    const scope = await getTiScopeSupport();
    const profileFields = scope.profiles ? PAGOS_PROFILE_FIELDS : PAGOS_PROFILE_ROLE_ONLY;
    const { data } = await supabase
      .from('pagos_profiles')
      .select(profileFields)
      .eq('id', pagosUser.id)
      .maybeSingle();

    if (data) {
      return { role: data.role, isTi: scope.profiles ? Boolean(data.is_ti) : false };
    }
  }

  return {
    role: pagosUser.role ?? null,
    isTi: Boolean(pagosUser.is_ti),
  };
};

export const resolveActorIsTi = async (pagosUser) => {
  const profile = await getPagosProfileAccess(pagosUser);
  return profile.isTi;
};

export const canManagePagosScope = async (pagosUser) => {
  const profile = await getPagosProfileAccess(pagosUser);
  return profile.isTi || isCoordinator(profile.role) || Boolean(pagosUser?.infraAdmin);
};

export const canViewAllBillsInScope = async (pagosUser) => canManagePagosScope(pagosUser);

export const resolveBillListTiFilter = async (pagosUser, { consolidated = false } = {}) => {
  if (consolidated) {
    const profile = await getPagosProfileAccess(pagosUser);
    const canConsolidate = Boolean(pagosUser?.infraAdmin) || isCoordinator(profile.role);
    if (!canConsolidate) {
      const error = new Error('No autorizado para vista consolidada');
      error.statusCode = 403;
      throw error;
    }
    return undefined;
  }

  const scope = await getTiScopeSupport();
  if (!scope.bills) {
    return undefined;
  }

  return resolveActorIsTi(pagosUser);
};

/** @deprecated Use resolveBillListTiFilter and apply .eq() synchronously on the query builder. */
export const applyBillListScope = async (query, pagosUser, options = {}) => {
  const tiFilter = await resolveBillListTiFilter(pagosUser, options);
  if (tiFilter === undefined) {
    return query;
  }
  return query.eq('is_ti', tiFilter);
};

export const assertBillScopeAccess = async (pagosUser, billRow) => {
  if (!billRow) {
    const error = new Error('Factura no encontrada');
    error.statusCode = 404;
    throw error;
  }

  const scopeEnabled = await isTiBillsScopeEnabled();
  if (!scopeEnabled) {
    return;
  }

  const actorIsTi = await resolveActorIsTi(pagosUser);
  if (Boolean(billRow.is_ti) !== actorIsTi) {
    const error = new Error('Factura no encontrada');
    error.statusCode = 404;
    throw error;
  }
};

const canViewAllBillsFromToken = (pagosUser) => {
  if (!pagosUser) return false;
  if (pagosUser.infraAdmin) return true;
  return null;
};

export const canViewAllBills = async (pagosUser) => {
  const fromToken = canViewAllBillsFromToken(pagosUser);
  if (fromToken !== null) {
    return fromToken;
  }

  return canViewAllBillsInScope(pagosUser);
};
