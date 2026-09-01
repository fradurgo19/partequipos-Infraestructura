import type { UserProfile } from '../types';

export const isTiPagosUser = (profile: Pick<UserProfile, 'isTi'> | null | undefined): boolean =>
  Boolean(profile?.isTi);

export const isPagosCoordinator = (
  profile: Pick<UserProfile, 'role'> | null | undefined
): boolean => profile?.role === 'area_coordinator';

export const canAccessPagosBillManagement = (
  profile: Pick<UserProfile, 'role' | 'isTi'> | null | undefined
): boolean => isPagosCoordinator(profile) || isTiPagosUser(profile);

export const canManagePagosBillsTable = (
  profile: Pick<UserProfile, 'role' | 'isTi'> | null | undefined
): boolean => canAccessPagosBillManagement(profile);

export const canAccessPagosUsersManagement = (
  profile: Pick<UserProfile, 'role' | 'isTi'> | null | undefined
): boolean => canAccessPagosBillManagement(profile);
