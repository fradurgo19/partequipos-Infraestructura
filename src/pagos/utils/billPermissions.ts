import type { UtilityBill } from '../types';
import type { UserProfile } from '../types';
import { canManagePagosBillsTable } from './pagosPermissions';

export const canEditPagosBill = (
  bill: Pick<UtilityBill, 'user_id'>,
  profile: Pick<UserProfile, 'id' | 'role' | 'isTi'> | null | undefined
): boolean => {
  if (!profile?.id) {
    return false;
  }

  if (canManagePagosBillsTable(profile)) {
    return true;
  }

  return bill.user_id === profile.id;
};
