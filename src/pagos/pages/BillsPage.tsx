import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { PlusCircle, Download } from 'lucide-react';
import { SearchBar } from '../molecules/SearchBar';
import { FilterBar } from '../molecules/FilterBar';
import { BillsTable } from '../organisms/BillsTable';
import { useBills } from '../hooks/useBills';
import { FilterOptions } from '../types';
import { translateServiceType, translateStatus } from '../utils/formatters';

export const BillsPage: React.FC = () => {
  const [filters, setFilters] = useState<FilterOptions>({
    serviceType: 'all',
    location: 'all',
    status: 'all',
    search: ''
  });

  const { bills, loading, refresh } = useBills(filters);

  const uniqueLocations = Array.from(new Set(bills.map(b => b.location)));
  const uniquePeriods = Array.from(new Set(bills.map(b => b.period))).sort((a, b) => b.localeCompare(a));

  const handleFilterChange = (newFilters: FilterOptions) => {
    setFilters(newFilters);
  };

  const handleSearch = (query: string) => {
    setFilters(prev => ({ ...prev, search: query }));
  };

  const handleExport = () => {
    const csvContent = [
      ['Período', 'Tipo de Servicio', 'Proveedor', 'Monto', 'Fecha de Vencimiento', 'Ubicación', 'Estado', 'Número de Factura'],
      ...bills.map(bill => [
        bill.period,
        translateServiceType(bill.serviceType),
        bill.provider || '',
        bill.totalAmount.toString(),
        bill.dueDate.toString(),
        bill.location,
        translateStatus(bill.status),
        bill.invoiceNumber || ''
      ])
    ].map(row => row.join(',')).join('\n');

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
      {/* Header Elegante */}
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
          placeholder="Buscar facturas..."
          onSearch={handleSearch}
        />
        <FilterBar
          filters={filters}
          onFilterChange={handleFilterChange}
          locations={uniqueLocations}
          periods={uniquePeriods}
        />
      </div>

      <BillsTable
        bills={bills}
        onBillUpdated={refresh}
        onBillDeleted={refresh}
      />

      <div className="flex items-center justify-between text-sm text-gray-600">
        <span>Mostrando {bills.length} factura{bills.length === 1 ? '' : 's'}</span>
      </div>
    </div>
  );
};
