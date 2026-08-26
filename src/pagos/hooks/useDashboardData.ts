import { useMemo } from 'react';
import {
  DashboardComputedData,
  DashboardKPI,
  LocationChartData,
  ServiceTypeChartItem,
  TrendChartData,
  UtilityBill,
} from '../types';
import { getPreviousPeriod, translateServiceType } from '../utils/formatters';
import {
  DASHBOARD_SERVICE_TYPE_ORDER,
  formatPeriodShortLabel,
  formatUnitsSummary,
  sumBillTotal,
} from '../utils/dashboardHelpers';

const buildKpis = (bills: UtilityBill[], selectedPeriods: string[], allBills: UtilityBill[]): DashboardKPI => {
  const monthlyTotal = sumBillTotal(bills);

  if (selectedPeriods.length === 0) {
    return {
      monthlyTotal,
      monthlyChange: 0,
    };
  }

  const latestPeriod = [...selectedPeriods].sort((a, b) => a.localeCompare(b)).at(-1) ?? '';
  const previousPeriod = getPreviousPeriod(latestPeriod);
  const previousTotal = sumBillTotal(allBills.filter((bill) => bill.period === previousPeriod));
  const monthlyChange =
    previousTotal > 0 ? ((monthlyTotal - previousTotal) / previousTotal) * 100 : 0;

  return {
    monthlyTotal,
    monthlyChange,
  };
};

const buildTrendData = (allBills: UtilityBill[]): TrendChartData => {
  const periods = [...new Set(allBills.map((bill) => bill.period).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b)
  );
  const labels = periods.map(formatPeriodShortLabel);
  const data = periods.map((period) =>
    sumBillTotal(allBills.filter((bill) => bill.period === period))
  );
  return { periods, labels, data };
};

const accumulateConsumptionUnits = (
  units: Map<string, number>,
  amount: number | null | undefined,
  unit: string | null | undefined
) => {
  if (!amount || amount <= 0) return;
  const key = unit?.trim() || 'und';
  units.set(key, (units.get(key) || 0) + amount);
};

const buildServiceTypeData = (bills: UtilityBill[]): ServiceTypeChartItem[] =>
  DASHBOARD_SERVICE_TYPE_ORDER.map((type) => {
    let value = 0;
    let consumption = 0;
    const units = new Map<string, number>();

    bills.forEach((bill) => {
      const lines = bill.consumptions?.filter((item) => item.serviceType === type) ?? [];
      if (lines.length > 0) {
        lines.forEach((line) => {
          value += Number(line.totalAmount) || Number(line.value) || 0;
          const lineConsumption = Number(line.consumption) || 0;
          consumption += lineConsumption;
          accumulateConsumptionUnits(units, lineConsumption, line.unitOfMeasure);
        });
        return;
      }

      if (bill.serviceType !== type) return;
      value += Number(bill.totalAmount) || 0;
      const headerConsumption = Number(bill.consumption) || 0;
      consumption += headerConsumption;
      accumulateConsumptionUnits(units, headerConsumption, bill.unitOfMeasure);
    });

    return {
      label: translateServiceType(type),
      value,
      consumption,
      unitOfMeasure: formatUnitsSummary(units),
    };
  }).filter((item) => item.value > 0 || item.consumption > 0);

const buildLocationData = (bills: UtilityBill[]): LocationChartData => {
  const byLocation = new Map<
    string,
    { total: number; count: number; units: Map<string, number> }
  >();

  bills.forEach((bill) => {
    const key = bill.location?.trim() || 'Sin sede';
    const current = byLocation.get(key) ?? { total: 0, count: 0, units: new Map() };
    current.total += Number(bill.totalAmount) || 0;
    current.count += 1;

    if (bill.consumptions?.length) {
      bill.consumptions.forEach((line) => {
        accumulateConsumptionUnits(current.units, Number(line.consumption) || 0, line.unitOfMeasure);
      });
    } else {
      accumulateConsumptionUnits(current.units, Number(bill.consumption) || 0, bill.unitOfMeasure);
    }

    byLocation.set(key, current);
  });

  const labels = [...byLocation.entries()]
    .sort(([, left], [, right]) => {
      const totalDiff = right.total - left.total;
      if (totalDiff !== 0) return totalDiff;
      return left.localeCompare(right, 'es');
    })
    .map(([label]) => label);
  return {
    labels,
    data: labels.map((label) => byLocation.get(label)?.total ?? 0),
    counts: labels.map((label) => byLocation.get(label)?.count ?? 0),
    unitsSummary: labels.map((label) => formatUnitsSummary(byLocation.get(label)?.units ?? new Map())),
  };
};

/**
 * @param bills Facturas del filtro activo (periodo + sede + tipo) → KPIs y charts tipo/sede + tendencia
 * @param baselineBills Universo para % vs mes anterior (misma sede/tipo, todos los periodos)
 */
export const useDashboardData = (
  bills: UtilityBill[],
  selectedPeriods: string[],
  baselineBills: UtilityBill[]
): DashboardComputedData =>
  useMemo(
    () => ({
      kpis: buildKpis(bills, selectedPeriods, baselineBills),
      trendData: buildTrendData(bills),
      serviceTypeData: buildServiceTypeData(bills),
      locationData: buildLocationData(bills),
    }),
    [bills, selectedPeriods, baselineBills]
  );
