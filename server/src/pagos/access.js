import { supabase } from '../lib/supabaseClient.js';
import { isCoordinator } from './transforms.js';

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

  if (pagosUser.id) {
    const { data } = await supabase
      .from('pagos_profiles')
      .select('role')
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

  const role = await resolveActorRole(pagosUser);
  return isCoordinator(role);
};
