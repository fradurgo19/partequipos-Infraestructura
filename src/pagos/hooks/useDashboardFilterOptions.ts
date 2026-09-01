import { useMemo } from 'react';
import { UtilityBill } from '../types';
import { collectCanonicalSiteFilterOptions } from '../utils/billSiteResolution';

export const useDashboardFilterOptions = (allBills: UtilityBill[]) =>
  useMemo(() => {
    const availablePeriods = [
      ...new Set(allBills.map((bill) => bill.period).filter(Boolean)),
    ].sort((a, b) => b.localeCompare(a));

    const availableSites = collectCanonicalSiteFilterOptions(allBills);

    const yearsFromPeriods = availablePeriods
      .map((period) => Number(period.slice(0, 4)))
      .filter((year) => Number.isFinite(year));

    const availableYears = [...new Set(yearsFromPeriods)].sort((a, b) => b - a);
    if (availableYears.length === 0) {
      availableYears.push(new Date().getFullYear());
    }

    return { availablePeriods, availableSites, availableYears };
  }, [allBills]);
