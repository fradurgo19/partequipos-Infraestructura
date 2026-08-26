import { useMemo } from 'react';
import { UtilityBill } from '../types';

export const useDashboardFilterOptions = (allBills: UtilityBill[]) =>
  useMemo(() => {
    const availablePeriods = [
      ...new Set(allBills.map((bill) => bill.period).filter(Boolean)),
    ].sort((a, b) => b.localeCompare(a));

    const availableLocations = [
      ...new Set(allBills.map((bill) => bill.location?.trim()).filter(Boolean) as string[]),
    ].sort((a, b) => a.localeCompare(b, 'es'));

    const yearsFromPeriods = availablePeriods
      .map((period) => Number(period.slice(0, 4)))
      .filter((year) => Number.isFinite(year));

    const availableYears = [...new Set(yearsFromPeriods)].sort((a, b) => b - a);
    if (availableYears.length === 0) {
      availableYears.push(new Date().getFullYear());
    }

    return { availablePeriods, availableLocations, availableYears };
  }, [allBills]);
