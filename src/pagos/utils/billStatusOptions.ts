import { BillStatus } from '../types';

export type BillTableStatusValue = 'pending' | 'approved' | 'paid';

export const BILL_TABLE_STATUS_OPTIONS: Array<{
  value: BillTableStatusValue;
  label: string;
  backgroundColor: string;
  color: string;
}> = [
  { value: 'pending', label: '⏳ Pendiente', backgroundColor: '#fdebec', color: '#b5181d' },
  { value: 'approved', label: '✅ Aprobada', backgroundColor: '#f7d7da', color: '#7f0c12' },
  { value: 'paid', label: '💰 Pagada', backgroundColor: '#dbeafe', color: '#1e40af' },
];

export const resolveBillTableStatusValue = (status: BillStatus): BillTableStatusValue => {
  if (status === 'approved' || status === 'paid') {
    return status;
  }
  return 'pending';
};

export const getBillTableStatusOption = (status: BillTableStatusValue) =>
  BILL_TABLE_STATUS_OPTIONS.find((option) => option.value === status) ?? BILL_TABLE_STATUS_OPTIONS[0];
