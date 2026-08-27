import { useMemo } from 'react';
import { DashboardComputedData, UtilityBill } from '../types';
import { useDashboardData } from './useDashboardData';

const alignSeries = (labelsA: string[], labelsB: string[], valuesB: number[]): number[] =>
  labelsA.map((label) => {
    const index = labelsB.indexOf(label);
    return index >= 0 ? valuesB[index] ?? 0 : 0;
  });

export const useDashboardComparison = (
  periodBills: UtilityBill[],
  selectedPeriods: string[],
  periodBillsCompare: UtilityBill[],
  comparePeriods: string[],
  baselineBills: UtilityBill[],
  compareActive: boolean
) => {
  const mainData = useDashboardData(periodBills, selectedPeriods, baselineBills);
  const compareData = useDashboardData(
    compareActive ? periodBillsCompare : [],
    compareActive ? comparePeriods : [],
    baselineBills
  );

  return useMemo(() => {
    if (!compareActive) {
      return {
        mainData,
        compareData: null as DashboardComputedData | null,
        compareTrendData: null as number[] | null,
        locationCompareDataAligned: null as number[] | null,
      };
    }

    return {
      mainData,
      compareData,
      compareTrendData: alignSeries(
        mainData.trendData.periods,
        compareData.trendData.periods,
        compareData.trendData.data
      ),
      locationCompareDataAligned: alignSeries(
        mainData.locationData.labels,
        compareData.locationData.labels,
        compareData.locationData.data
      ),
    };
  }, [mainData, compareData, compareActive]);
};
