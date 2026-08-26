import React, { useMemo, useState } from 'react';
import { FilterX } from 'lucide-react';
import { Button } from '../../atoms/Button';
import { Select } from '../../atoms/Select';
import { useBills } from '../hooks/useBills';
import { useDashboardComparison } from '../hooks/useDashboardComparison';
import { useDashboardFilterOptions } from '../hooks/useDashboardFilterOptions';
import { KPICard } from '../molecules/KPICard';
import { PeriodSelector } from '../molecules/PeriodSelector';
import { RangeKeySelector } from '../molecules/RangeKeySelector';
import { LocationChart, ServiceTypeChart, TrendChart } from '../organisms/DashboardCharts';
import { DashboardRangeMode, ServiceType } from '../types';
import {
  BIMESTER_MONTHS,
  DASHBOARD_SERVICE_TYPE_ORDER,
  filterDashboardBills,
  isApprovedOrPaid,
  periodsFromRangeKeys,
  QUARTER_MONTHS,
  SEMESTER_MONTHS,
} from '../utils/dashboardHelpers';
import { formatCurrency, translateServiceType } from '../utils/formatters';

const RANGE_MODE_OPTIONS: Array<{ value: DashboardRangeMode; label: string }> = [
  { value: 'global', label: 'Global (todos)' },
  { value: 'month', label: 'Mes' },
  { value: 'bimester', label: 'Bimestre' },
  { value: 'quarter', label: 'Trimestre' },
  { value: 'semester', label: 'Semestre' },
];

const SERVICE_TYPE_FILTER_OPTIONS = [
  { value: 'all', label: 'Todos los servicios' },
  ...DASHBOARD_SERVICE_TYPE_ORDER.map((type) => ({
    value: type,
    label: translateServiceType(type),
  })),
];

const getTotalTitle = (selectedPeriods: string[]): string =>
  selectedPeriods.length === 1 ? 'Total Mensual' : 'Total Periodos';

const hasActiveDashboardFilters = ({
  rangeMode,
  selectedPeriods,
  selectedRangeKeys,
  locationFilter,
  serviceTypeFilter,
  compareActive,
  comparePeriods,
}: {
  rangeMode: DashboardRangeMode;
  selectedPeriods: string[];
  selectedRangeKeys: string[];
  locationFilter: string;
  serviceTypeFilter: ServiceType | 'all';
  compareActive: boolean;
  comparePeriods: string[];
}): boolean => {
  if (rangeMode !== 'global') return true;
  if (selectedPeriods.length > 0) return true;
  if (selectedRangeKeys.length > 0) return true;
  if (locationFilter !== 'all') return true;
  if (serviceTypeFilter !== 'all') return true;
  if (compareActive) return true;
  return comparePeriods.length > 0;
};

export const DashboardPage: React.FC = () => {
  const { bills: allBills, loading, error } = useBills({});
  const { availablePeriods, availableLocations, availableYears } =
    useDashboardFilterOptions(allBills);

  const [rangeMode, setRangeMode] = useState<DashboardRangeMode>('global');
  const [selectedPeriods, setSelectedPeriods] = useState<string[]>([]);
  const [selectedRangeKeys, setSelectedRangeKeys] = useState<string[]>([]);
  const [yearForRanges, setYearForRanges] = useState<number>(new Date().getFullYear());
  const [locationFilter, setLocationFilter] = useState('all');
  const [serviceTypeFilter, setServiceTypeFilter] = useState<ServiceType | 'all'>('all');
  const [compareActive, setCompareActive] = useState(false);
  const [comparePeriods, setComparePeriods] = useState<string[]>([]);

  const activeYear = availableYears.includes(yearForRanges) ? yearForRanges : availableYears[0];

  const applyRangeKeys = (keys: string[], mode: DashboardRangeMode, year: number) => {
    setSelectedRangeKeys(keys);
    if (mode === 'bimester') {
      setSelectedPeriods(periodsFromRangeKeys(keys, year, BIMESTER_MONTHS));
      return;
    }
    if (mode === 'quarter') {
      setSelectedPeriods(periodsFromRangeKeys(keys, year, QUARTER_MONTHS));
      return;
    }
    if (mode === 'semester') {
      setSelectedPeriods(periodsFromRangeKeys(keys, year, SEMESTER_MONTHS));
    }
  };

  const handleRangeModeChange = (mode: DashboardRangeMode) => {
    setRangeMode(mode);
    setSelectedRangeKeys([]);
    setSelectedPeriods([]);
  };

  const handleMonthPeriodsChange = (periods: string[]) => {
    setSelectedRangeKeys([]);
    setSelectedPeriods(periods);
  };

  const handleClearFilters = () => {
    setRangeMode('global');
    setSelectedPeriods([]);
    setSelectedRangeKeys([]);
    setYearForRanges(availableYears[0] ?? new Date().getFullYear());
    setLocationFilter('all');
    setServiceTypeFilter('all');
    setCompareActive(false);
    setComparePeriods([]);
  };

  const filtersActive = hasActiveDashboardFilters({
    rangeMode,
    selectedPeriods,
    selectedRangeKeys,
    locationFilter,
    serviceTypeFilter,
    compareActive,
    comparePeriods,
  });

  const scopeFilters = useMemo(
    () => ({
      periods: [] as string[],
      locationFilter,
      serviceType: serviceTypeFilter,
    }),
    [locationFilter, serviceTypeFilter]
  );

  /** Misma sede/tipo, todos los periodos → base del % de variación. */
  const baselineBills = useMemo(
    () => filterDashboardBills(allBills, scopeFilters),
    [allBills, scopeFilters]
  );

  const periodBills = useMemo(
    () =>
      filterDashboardBills(allBills, {
        periods: selectedPeriods,
        locationFilter,
        serviceType: serviceTypeFilter,
      }),
    [allBills, selectedPeriods, locationFilter, serviceTypeFilter]
  );

  const periodBillsCompare = useMemo(() => {
    if (!compareActive || comparePeriods.length === 0) return [];
    return filterDashboardBills(allBills, {
      periods: comparePeriods,
      locationFilter,
      serviceType: serviceTypeFilter,
    });
  }, [allBills, compareActive, comparePeriods, locationFilter, serviceTypeFilter]);

  const { mainData, compareData, compareTrendData, locationCompareDataAligned } =
    useDashboardComparison(
      periodBills,
      selectedPeriods,
      periodBillsCompare,
      comparePeriods,
      baselineBills,
      compareActive
    );

  const approvedCount = periodBills.filter((bill) => isApprovedOrPaid(bill.status)).length;
  const compareApprovedCount = compareData
    ? periodBillsCompare.filter((bill) => isApprovedOrPaid(bill.status)).length
    : null;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#cf1b22]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-600" role="alert">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="bg-gradient-to-r from-[#cf1b22] via-[#a11217] to-[#50504f] rounded-2xl shadow-xl p-6 sm:p-8 text-white">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard de Pagos</h1>
        <p className="text-white/85 mt-2">
          Indicadores de facturas agregados en cliente desde el listado autorizado.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-sm font-semibold text-[#50504f]">Filtros</h2>
          {filtersActive && (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleClearFilters}
              className="flex items-center justify-center gap-2 shrink-0 self-start sm:self-auto"
            >
              <FilterX className="w-4 h-4" aria-hidden />
              <span>Borrar filtros</span>
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <Select
            label="Vista temporal"
            value={rangeMode}
            options={RANGE_MODE_OPTIONS}
            onChange={(e) => handleRangeModeChange(e.target.value as DashboardRangeMode)}
          />
          <Select
            label="Tipo de servicio"
            value={serviceTypeFilter}
            options={SERVICE_TYPE_FILTER_OPTIONS}
            onChange={(e) => setServiceTypeFilter(e.target.value as ServiceType | 'all')}
          />
          <Select
            label="Sede / ubicación"
            value={locationFilter}
            options={[
              { value: 'all', label: 'Todas las sedes' },
              ...availableLocations.map((location) => ({ value: location, label: location })),
            ]}
            onChange={(e) => setLocationFilter(e.target.value)}
          />
          <div className="flex items-end">
            <label className="flex items-center gap-2 text-sm text-gray-700 pb-2">
              <input
                type="checkbox"
                checked={compareActive}
                onChange={(e) => setCompareActive(e.target.checked)}
                className="rounded border-gray-300 text-[#cf1b22] focus:ring-[#cf1b22]"
              />
              <span>Activar comparativo</span>
            </label>
          </div>
        </div>

        {rangeMode === 'month' && (
          <PeriodSelector
            availablePeriods={availablePeriods}
            selectedPeriods={selectedPeriods}
            onChange={handleMonthPeriodsChange}
          />
        )}

        {rangeMode === 'bimester' && (
          <RangeKeySelector
            title="Bimestres"
            keys={Object.keys(BIMESTER_MONTHS)}
            selectedKeys={selectedRangeKeys}
            onChange={(keys) => applyRangeKeys(keys, 'bimester', activeYear)}
            year={activeYear}
            availableYears={availableYears}
            onYearChange={(year) => {
              setYearForRanges(year);
              applyRangeKeys(selectedRangeKeys, 'bimester', year);
            }}
          />
        )}

        {rangeMode === 'quarter' && (
          <RangeKeySelector
            title="Trimestres"
            keys={Object.keys(QUARTER_MONTHS)}
            selectedKeys={selectedRangeKeys}
            onChange={(keys) => applyRangeKeys(keys, 'quarter', activeYear)}
            year={activeYear}
            availableYears={availableYears}
            onYearChange={(year) => {
              setYearForRanges(year);
              applyRangeKeys(selectedRangeKeys, 'quarter', year);
            }}
          />
        )}

        {rangeMode === 'semester' && (
          <RangeKeySelector
            title="Semestres"
            keys={Object.keys(SEMESTER_MONTHS)}
            selectedKeys={selectedRangeKeys}
            onChange={(keys) => applyRangeKeys(keys, 'semester', activeYear)}
            year={activeYear}
            availableYears={availableYears}
            onYearChange={(year) => {
              setYearForRanges(year);
              applyRangeKeys(selectedRangeKeys, 'semester', year);
            }}
          />
        )}

        {rangeMode === 'global' && (
          <p className="text-sm text-gray-600">
            Vista global: KPIs y gráficas usan todas las facturas autorizadas
            {locationFilter !== 'all' ? ' de la sede seleccionada' : ''}
            {serviceTypeFilter !== 'all' ? ` · ${translateServiceType(serviceTypeFilter)}` : ''}.
          </p>
        )}

        {compareActive && (
          <PeriodSelector
            availablePeriods={availablePeriods}
            selectedPeriods={comparePeriods}
            onChange={setComparePeriods}
            label="Periodos comparativos"
          />
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <KPICard
          title={getTotalTitle(selectedPeriods)}
          value={formatCurrency(mainData.kpis.monthlyTotal)}
          change={selectedPeriods.length > 0 ? mainData.kpis.monthlyChange : undefined}
          compareValue={
            compareData ? formatCurrency(compareData.kpis.monthlyTotal) : null
          }
        />
        <KPICard
          title="Facturas aprobadas"
          value={approvedCount}
          compareValue={compareApprovedCount}
          accentClassName="bg-emerald-600"
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <TrendChart trendData={mainData.trendData} compareData={compareTrendData} />
        <ServiceTypeChart serviceTypeData={mainData.serviceTypeData} />
      </div>

      <LocationChart
        locationData={mainData.locationData}
        compareData={locationCompareDataAligned}
      />
    </div>
  );
};
