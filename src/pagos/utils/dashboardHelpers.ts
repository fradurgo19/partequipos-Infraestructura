import { ServiceType, UtilityBill } from '../types';

export const DASHBOARD_SERVICE_TYPE_ORDER: ServiceType[] = [
  'electricity',
  'water',
  'gas',
  'internet',
  'phone',
  'cellular',
  'waste',
  'sewer',
  'public_lighting',
  'security',
  'administration',
  'property_tax',
  'rent',
  'other',
];

export const QUARTER_MONTHS: Record<string, string[]> = {
  Q1: ['01', '02', '03'],
  Q2: ['04', '05', '06'],
  Q3: ['07', '08', '09'],
  Q4: ['10', '11', '12'],
};

export const BIMESTER_MONTHS: Record<string, string[]> = {
  B1: ['01', '02'],
  B2: ['03', '04'],
  B3: ['05', '06'],
  B4: ['07', '08'],
  B5: ['09', '10'],
  B6: ['11', '12'],
};

export const SEMESTER_MONTHS: Record<string, string[]> = {
  S1: ['01', '02', '03', '04', '05', '06'],
  S2: ['07', '08', '09', '10', '11', '12'],
};

export const periodsFromRangeKeys = (
  keys: string[],
  year: number,
  map: Record<string, string[]>
): string[] => {
  const months = keys.flatMap((key) => map[key] ?? []);
  return [...new Set(months)].sort().map((month) => `${year}-${month}`);
};

export const sumBillTotal = (bills: UtilityBill[]): number =>
  bills.reduce((sum, bill) => sum + (Number(bill.totalAmount) || 0), 0);

export const formatPeriodShortLabel = (period: string): string => {
  const [year, month] = period.split('-').map(Number);
  if (!year || !month) return period;
  const date = new Date(year, month - 1, 1);
  return date.toLocaleDateString('es-ES', { month: 'short', year: '2-digit' });
};

export const formatUnitsSummary = (units: Map<string, number>): string => {
  const parts = [...units.entries()]
    .filter(([, amount]) => amount > 0)
    .map(([unit, amount]) => `${amount.toLocaleString('es-CO')} ${unit}`);
  return parts.join(', ');
};

export const isApprovedOrPaid = (status: string): boolean =>
  status === 'approved' || status === 'paid';
