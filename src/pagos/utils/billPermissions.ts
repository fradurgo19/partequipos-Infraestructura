import type { UtilityBill } from '../types';
import type { UserProfile } from '../types';

export const canEditPagosBill = (
  bill: Pick<UtilityBill, 'user_id'>,
  profile: Pick<UserProfile, 'id' | 'role'> | null | undefined
): boolean => {
  if (!profile?.id) {
    return false;
  }

  if (profile.role === 'area_coordinator') {
    return true;
  }

  return bill.user_id === profile.id;
};
