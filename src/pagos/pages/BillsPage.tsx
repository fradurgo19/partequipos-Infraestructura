import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { PlusCircle, Download, FilterX } from 'lucide-react';
import { Button } from '../../atoms/Button';
import { SearchBar } from '../molecules/SearchBar';
import { FilterBar } from '../molecules/FilterBar';
import { BillsTable } from '../organisms/BillsTable';
import { useBills } from '../hooks/useBills';
import { FilterOptions, UtilityBill } from '../types';
import { translateServiceType, translateStatus } from '../utils/formatters';
import { billService } from '../services/billService';
import { usePagosAuth } from '../context/PagosAuthContext';

const DEFAULT_FILTERS: FilterOptions = {
  period: 'all',
  serviceType: 'all',
  city: 'all',
  businessGroup: 'all',
  location: 'all',
  status: 'all',
  search: '',
};

const sortUnique = (values: Array<string | undefined>) =>
  Array.from(new Set(values.filter((value): value is string => Boolean(value?.trim())))).sort(
    (a, b) => a.localeCompare(b, 'es')
  );

const hasActiveFilters = (filters: FilterOptions) =>
  (filters.period && filters.period !== 'all') ||
  (filters.serviceType && filters.serviceType !== 'all') ||
  (filters.city && filters.city !== 'all') ||
  (filters.businessGroup && filters.businessGroup !== 'all') ||
  (filters.location && filters.location !== 'all') ||
  (filters.status && filters.status !== 'all') ||
  Boolean(filters.search?.trim());

const matchesFilterOptions = (bill: UtilityBill, filters: FilterOptions) => {
  if (filters.period && filters.period !== 'all' && bill.period !== filters.period) {
    return false;
  }
  if (
    filters.serviceType &&
    filters.serviceType !== 'all' &&
    bill.serviceType !== filters.serviceType
  ) {
    return false;
  }
  if (filters.status && filters.status !== 'all' && bill.status !== filters.status) {
    return false;
  }
  if (filters.search) {
    const query = filters.search.toLowerCase();
    const haystack = [bill.invoiceNumber, bill.description, bill.provider]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    if (!haystack.includes(query)) {
      return false;
    }
  }
  return true;
};

export const BillsPage: React.FC = () => {
  const { loading: authLoading } = usePagosAuth();
  const [filters, setFilters] = useState<FilterOptions>(DEFAULT_FILTERS);
  const [searchResetKey, setSearchResetKey] = useState(0);
  const [filterSourceBills, setFilterSourceBills] = useState<UtilityBill[]>([]);

  const { bills, loading, refresh } = useBills(filters);

  useEffect(() => {
    if (authLoading) {
      return;
    }

    let cancelled = false;
    billService
      .getAll()
      .then((data) => {
        if (!cancelled) {
          setFilterSourceBills(data);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setFilterSourceBills([]);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [authLoading]);

  const scopedBills = useMemo(
    () => filterSourceBills.filter((bill) => matchesFilterOptions(bill, filters)),
    [filterSourceBills, filters]
  );

  const uniqueCities = useMemo(() => sortUnique(scopedBills.map((bill) => bill.city)), [scopedBills]);

  const uniqueBusinessGroups = useMemo(() => {
    const cityFiltered =
      filters.city && filters.city !== 'all'
        ? scopedBills.filter((bill) => bill.city === filters.city)
        : scopedBills;
    return sortUnique(cityFiltered.map((bill) => bill.businessGroup));
  }, [scopedBills, filters.city]);

  const uniqueLocations = useMemo(() => {
    let locationScope = scopedBills;
    if (filters.city && filters.city !== 'all') {
      locationScope = locationScope.filter((bill) => bill.city === filters.city);
    }
    if (filters.businessGroup && filters.businessGroup !== 'all') {
      locationScope = locationScope.filter((bill) => bill.businessGroup === filters.businessGroup);
    }
    return sortUnique(locationScope.map((bill) => bill.location));
  }, [scopedBills, filters.city, filters.businessGroup]);

  const uniquePeriods = useMemo(
    () => sortUnique(filterSourceBills.map((bill) => bill.period)).reverse(),
    [filterSourceBills]
  );

  const handleFilterChange = (newFilters: FilterOptions) => {
    setFilters(newFilters);
  };

  const handleSearch = (query: string) => {
    setFilters((prev) => ({ ...prev, search: query }));
  };

  const handleClearFilters = () => {
    setFilters(DEFAULT_FILTERS);
    setSearchResetKey((key) => key + 1);
  };

  const handleExport = () => {
    const csvContent = [
      [
        'Período',
        'Tipo de Servicio',
        'Proveedor',
        'Monto',
        'Fecha de Vencimiento',
        'Ciudad',
        'Grupo',
        'Ubicación',
        'Estado',
        'Número de Factura',
      ],
      ...bills.map((bill) => [
        bill.period,
        translateServiceType(bill.serviceType),
        bill.provider || '',
        bill.totalAmount.toString(),
        bill.dueDate.toString(),
        bill.city || '',
        bill.businessGroup || '',
        bill.location,
        translateStatus(bill.status),
        bill.invoiceNumber || '',
      ]),
    ]
      .map((row) => row.join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = globalThis.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bills-export-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    globalThis.URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#cf1b22]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="bg-gradient-to-r from-[#cf1b22] via-[#a11217] to-[#50504f] rounded-2xl shadow-2xl p-8 border border-[#cf1b22]/40">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2 tracking-tight">Gestión de Facturas</h1>
            <p className="text-white/80 text-lg">Administración completa de facturas de servicios</p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={handleExport}
              className="flex items-center space-x-2 px-6 py-3 bg-white/20 hover:bg-white/30 text-white rounded-xl transition-all shadow-lg backdrop-blur-sm font-medium"
            >
              <Download className="w-5 h-5" />
              <span>Exportar</span>
            </button>
            <Link to="/pagos/new-bill">
              <button className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-[#cf1b22] to-[#a11217] hover:from-[#b2181d] hover:to-[#7f0c12] text-white rounded-xl transition-all shadow-lg font-medium">
                <PlusCircle className="w-5 h-5" />
                <span>Nueva Factura</span>
              </button>
            </Link>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <SearchBar
          key={searchResetKey}
          placeholder="Buscar facturas..."
          onSearch={handleSearch}
        />
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex-1 min-w-0">
            <FilterBar
              filters={filters}
              onFilterChange={handleFilterChange}
              cities={uniqueCities}
              businessGroups={uniqueBusinessGroups}
              locations={uniqueLocations}
              periods={uniquePeriods}
            />
          </div>
          {hasActiveFilters(filters) && (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleClearFilters}
              className="flex items-center justify-center gap-2 shrink-0"
            >
              <FilterX className="w-4 h-4" />
              <span>Eliminar filtros</span>
            </Button>
          )}
        </div>
      </div>

      <BillsTable bills={bills} onBillUpdated={refresh} onBillDeleted={refresh} />

      <div className="flex items-center justify-between text-sm text-gray-600">
        <span>
          Mostrando {bills.length} factura{bills.length === 1 ? '' : 's'}
        </span>
      </div>
    </div>
  );
};
