import { UtilityBill } from '../types';

const DATE_COLUMNS = new Set<keyof UtilityBill>([
  'createdAt',
  'updatedAt',
  'dueDate',
  'approvedAt',
]);

const NUMERIC_COLUMNS = new Set<keyof UtilityBill>(['totalAmount', 'value', 'consumption']);

const toTimestamp = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  const time = new Date(value as string | Date).getTime();
  return Number.isFinite(time) ? time : null;
};

const compareNullable = (a: number | null, b: number | null): number => {
  if (a === null && b === null) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  return a - b;
};

const toSortableText = (value: unknown): string => {
  if (value === null || value === undefined) {
    return '';
  }
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  return '';
};

export const compareBillColumn = (
  a: UtilityBill,
  b: UtilityBill,
  column: keyof UtilityBill
): number => {
  const aVal = a[column];
  const bVal = b[column];

  if (DATE_COLUMNS.has(column)) {
    return compareNullable(toTimestamp(aVal), toTimestamp(bVal));
  }

  if (NUMERIC_COLUMNS.has(column)) {
    const aNum = Number(aVal);
    const bNum = Number(bVal);
    if (!Number.isFinite(aNum) && !Number.isFinite(bNum)) return 0;
    if (!Number.isFinite(aNum)) return 1;
    if (!Number.isFinite(bNum)) return -1;
    return aNum - bNum;
  }

  return toSortableText(aVal).localeCompare(toSortableText(bVal), 'es', {
    sensitivity: 'base',
    numeric: true,
  });
};

export const sortBills = (
  bills: UtilityBill[],
  column: keyof UtilityBill = 'createdAt',
  direction: 'asc' | 'desc' = 'desc'
): UtilityBill[] =>
  [...bills].sort((a, b) => {
    let comparison = compareBillColumn(a, b, column);

    if (comparison === 0 && column !== 'createdAt') {
      comparison = compareBillColumn(a, b, 'createdAt');
    }

    if (comparison === 0) {
      comparison = String(a.id).localeCompare(String(b.id));
    }

    return direction === 'asc' ? comparison : -comparison;
  });

export const sortBillsByNewest = (bills: UtilityBill[]): UtilityBill[] =>
  sortBills(bills, 'createdAt', 'desc');
