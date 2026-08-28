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
  return [...new Set(months)].sort((a, b) => a.localeCompare(b)).map((month) => `${year}-${month}`);
};

export const sumBillTotal = (bills: UtilityBill[]): number =>
  bills.reduce((sum, bill) => sum + (Number(bill.totalAmount) || 0), 0);

export const normalizeLocation = (location?: string | null): string => location?.trim() || '';

export const billMatchesLocation = (bill: UtilityBill, locationFilter: string): boolean => {
  if (locationFilter === 'all') return true;
  return normalizeLocation(bill.location) === locationFilter;
};

export const billHasServiceType = (
  bill: UtilityBill,
  serviceType: ServiceType
): boolean => {
  if (bill.consumptions?.some((line) => line.serviceType === serviceType)) {
    return true;
  }
  return bill.serviceType === serviceType;
};

const sumConsumptionAmounts = (lines: UtilityBill['consumptions']): number =>
  (lines ?? []).reduce(
    (sum, line) => sum + (Number(line.totalAmount) || Number(line.value) || 0),
    0
  );

/** Reduce la factura al monto/líneas del tipo filtrado (evita inflar KPIs/gráficas). */
export const projectBillToServiceType = (
  bill: UtilityBill,
  serviceType: ServiceType | 'all'
): UtilityBill => {
  if (serviceType === 'all') return bill;

  const lines = bill.consumptions?.filter((line) => line.serviceType === serviceType) ?? [];
  if (lines.length === 0) {
    return { ...bill, serviceType, consumptions: [] };
  }

  const totalAmount = sumConsumptionAmounts(lines);
  const consumption = lines.reduce((sum, line) => sum + (Number(line.consumption) || 0), 0);
  const unitLine = lines.find((line) => line.unitOfMeasure);

  return {
    ...bill,
    serviceType,
    provider: lines[0]?.provider ?? bill.provider,
    totalAmount,
    value: totalAmount,
    consumption: consumption > 0 ? consumption : null,
    unitOfMeasure: unitLine?.unitOfMeasure ?? bill.unitOfMeasure,
    consumptions: lines,
  };
};

export interface DashboardBillFilters {
  periods: string[];
  locationFilter: string;
  serviceType: ServiceType | 'all';
  startDate?: string;
  endDate?: string;
}

const billPeriodMonth = (period: string): Date | null => {
  const [year, month] = period.split('-').map(Number);
  if (!year || !month) return null;
  return new Date(year, month - 1, 1);
};

const toMonthStart = (dateValue: string): Date | null => {
  const normalized = dateValue.includes('T') ? dateValue : `${dateValue}T00:00:00`;
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return null;
  return new Date(date.getFullYear(), date.getMonth(), 1);
};

export const billMatchesDateRange = (
  period: string,
  startDate?: string,
  endDate?: string
): boolean => {
  if (!startDate && !endDate) return true;

  const billMonth = billPeriodMonth(period);
  if (!billMonth) return false;

  if (startDate) {
    const startMonth = toMonthStart(startDate);
    if (startMonth && billMonth < startMonth) return false;
  }

  if (endDate) {
    const endMonth = toMonthStart(endDate);
    if (endMonth && billMonth > endMonth) return false;
  }

  return true;
};

/** Filtra por periodo/sede/tipo/rango de fechas y proyecta montos al tipo de servicio elegido. */
export const filterDashboardBills = (
  bills: UtilityBill[],
  filters: DashboardBillFilters
): UtilityBill[] => {
  const { periods, locationFilter, serviceType, startDate, endDate } = filters;
  const periodSet = periods.length > 0 ? new Set(periods) : null;

  return bills
    .filter((bill) => {
      if (periodSet && !periodSet.has(bill.period)) return false;
      if (!billMatchesDateRange(bill.period, startDate, endDate)) return false;
      if (!billMatchesLocation(bill, locationFilter)) return false;
      if (serviceType !== 'all' && !billHasServiceType(bill, serviceType)) return false;
      return true;
    })
    .map((bill) => projectBillToServiceType(bill, serviceType));
};

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
