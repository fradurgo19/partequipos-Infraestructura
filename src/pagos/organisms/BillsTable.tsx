import React, { useEffect, useRef, useState } from 'react';
import { ArrowUpDown, Eye, Trash2, Download } from 'lucide-react';
import { UtilityBill, SortState } from '../types';
import { BillStatusBadge } from '../atoms/BillStatusBadge';
import { Button } from '../../atoms/Button';
import { formatCurrency, formatDate, translateServiceType } from '../utils/formatters';
import { sortBills } from '../utils/billSort';
import { usePagosAuth } from '../context/PagosAuthContext';
import { billService } from '../services/billService';
import { BillDetailsModal } from '../molecules/BillDetailsModal';
import {
  BILL_TABLE_STATUS_OPTIONS,
  getBillTableStatusOption,
  resolveBillTableStatusValue,
} from '../utils/billStatusOptions';

interface BillsTableProps {
  bills: UtilityBill[];
  onBillUpdated: () => void;
  onBillDeleted: () => void;
}

const SortIcon: React.FC<{ column: keyof UtilityBill; activeColumn: keyof UtilityBill }> = ({ column, activeColumn }) => (
  <ArrowUpDown
    className={`w-4 h-4 ml-1 inline ${activeColumn === column ? 'text-[#cf1b22]' : 'text-gray-400'}`}
  />
);

export const BillsTable: React.FC<BillsTableProps> = ({ bills, onBillUpdated, onBillDeleted }) => {
  const { profile } = usePagosAuth();
  const [sortState, setSortState] = useState<SortState>({ column: 'createdAt', direction: 'desc' });
  const [selectedBills, setSelectedBills] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState<string | null>(null);
  const [viewingBill, setViewingBill] = useState<UtilityBill | null>(null);
  const [tableScrollWidth, setTableScrollWidth] = useState(1200);
  const [showTopScrollbar, setShowTopScrollbar] = useState(false);

  const topScrollRef = useRef<HTMLDivElement>(null);
  const tableScrollRef = useRef<HTMLDivElement>(null);
  const tableRef = useRef<HTMLTableElement>(null);
  const isSyncingScrollRef = useRef(false);

  const isAreaCoordinator = profile?.role === 'area_coordinator';

  const handleSort = (column: keyof UtilityBill) => {
    setSortState(prev => ({
      column,
      direction: prev.column === column && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const sortedBills = sortBills(bills, sortState.column, sortState.direction);

  // Calcular total de montos
  const totalAmount = bills.reduce((sum, bill) => sum + bill.totalAmount, 0);

  const handleSelectAll = () => {
    if (selectedBills.size === bills.length) {
      setSelectedBills(new Set());
    } else {
      setSelectedBills(new Set(bills.map(b => b.id)));
    }
  };

  const handleSelectBill = (id: string) => {
    const newSelected = new Set(selectedBills);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedBills(newSelected);
  };

  const handleDelete = async (id: string) => {
    if (!globalThis.confirm('¿Estás seguro de que quieres eliminar esta factura?')) return;

    setLoading(id);
    try {
      await billService.delete(id);
      onBillDeleted();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al eliminar la factura';
      alert(message);
    } finally {
      setLoading(null);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedBills.size === 0) return;
    if (!globalThis.confirm(`¿Eliminar ${selectedBills.size} facturas seleccionadas?`)) return;

    try {
      await billService.bulkDelete(Array.from(selectedBills));
      setSelectedBills(new Set());
      onBillDeleted();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al eliminar las facturas';
      alert(message);
    }
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    if (!isAreaCoordinator) return;

    setLoading(id);
    try {
      await billService.updateStatus(id, newStatus);
      onBillUpdated();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al actualizar el estado de la factura';
      alert(message);
    } finally {
      setLoading(null);
    }
  };

  const syncHorizontalScroll = (source: 'top' | 'table') => {
    if (isSyncingScrollRef.current) return;

    const topScrollEl = topScrollRef.current;
    const tableScrollEl = tableScrollRef.current;
    if (!topScrollEl || !tableScrollEl) return;

    isSyncingScrollRef.current = true;
    if (source === 'top') {
      tableScrollEl.scrollLeft = topScrollEl.scrollLeft;
    } else {
      topScrollEl.scrollLeft = tableScrollEl.scrollLeft;
    }

    globalThis.requestAnimationFrame(() => {
      isSyncingScrollRef.current = false;
    });
  };

  useEffect(() => {
    const updateScrollMetrics = () => {
      const tableEl = tableRef.current;
      const tableScrollEl = tableScrollRef.current;
      if (!tableEl || !tableScrollEl) return;

      const nextWidth = tableEl.scrollWidth;
      setTableScrollWidth(nextWidth);
      setShowTopScrollbar(nextWidth > tableScrollEl.clientWidth);
    };

    updateScrollMetrics();

    const tableEl = tableRef.current;
    let resizeObserver: ResizeObserver | null = null;
    if (tableEl && 'ResizeObserver' in globalThis) {
      resizeObserver = new ResizeObserver(updateScrollMetrics);
      resizeObserver.observe(tableEl);
    }

    globalThis.addEventListener('resize', updateScrollMetrics);

    return () => {
      resizeObserver?.disconnect();
      globalThis.removeEventListener('resize', updateScrollMetrics);
    };
  }, [bills.length]);

  return (
    <>
      {viewingBill && (
        <BillDetailsModal
          bill={viewingBill}
          onClose={() => setViewingBill(null)}
        />
      )}
      
      <div className="space-y-4">
        {selectedBills.size > 0 && (
        <div className="bg-[#fdebec] border border-[#f3b8bc] rounded-lg p-4 flex items-center justify-between">
          <span className="text-sm text-[#8b1016]">
            {selectedBills.size} factura{selectedBills.size > 1 ? 's' : ''} seleccionada{selectedBills.size > 1 ? 's' : ''}
          </span>
          <Button variant="danger" size="sm" onClick={handleBulkDelete}>
            <Trash2 className="w-4 h-4 mr-2" />
            Eliminar Seleccionadas
          </Button>
        </div>
      )}

      <div className="border border-gray-200 rounded-lg">
        {showTopScrollbar && (
          <div
            ref={topScrollRef}
            className="w-full overflow-x-auto overflow-y-hidden border-b border-gray-200"
            onScroll={() => syncHorizontalScroll('top')}
            aria-label="Desplazamiento horizontal superior de la tabla"
          >
            <div style={{ width: tableScrollWidth, height: 14 }} />
          </div>
        )}
        <div
          ref={tableScrollRef}
          className="w-full overflow-x-auto"
          onScroll={() => syncHorizontalScroll('table')}
        >
        <table ref={tableRef} className="min-w-[1200px] w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left">
                <input
                  type="checkbox"
                  checked={selectedBills.size === bills.length && bills.length > 0}
                  onChange={handleSelectAll}
                  className="rounded border-gray-300 text-[#cf1b22] focus:ring-[#cf1b22]"
                  aria-label="Seleccionar todas las facturas"
                />
              </th>
              <th
                className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('period')}
              >
                Período <SortIcon column="period" activeColumn={sortState.column} />
              </th>
              <th
                className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('serviceType')}
              >
                Servicio <SortIcon column="serviceType" activeColumn={sortState.column} />
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                Proveedor
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                N° Contrato
              </th>
              <th
                className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('totalAmount')}
              >
                Monto <SortIcon column="totalAmount" activeColumn={sortState.column} />
              </th>
              <th
                className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('dueDate')}
              >
                Vencimiento <SortIcon column="dueDate" activeColumn={sortState.column} />
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                Ubicación
              </th>
              <th
                className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('status')}
              >
                Estado <SortIcon column="status" activeColumn={sortState.column} />
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedBills.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-4 py-12 text-center text-gray-500">
                  No se encontraron facturas
                </td>
              </tr>
            ) : (
              sortedBills.map((bill) => {
                const selectedStatus = resolveBillTableStatusValue(bill.status);
                const selectedOption = getBillTableStatusOption(selectedStatus);

                return (
                <tr key={bill.id} className="hover:bg-gray-50">
                  <td className="px-4 py-4">
                    <input
                      type="checkbox"
                      checked={selectedBills.has(bill.id)}
                      onChange={() => handleSelectBill(bill.id)}
                    className="rounded border-gray-300 text-[#cf1b22] focus:ring-[#cf1b22]"
                      aria-label={`Seleccionar factura ${bill.invoiceNumber || bill.id}`}
                    />
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                    {bill.period}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                    {translateServiceType(bill.serviceType)}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">
                    {bill.provider || '-'}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">
                    {bill.contractNumber || '-'}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {formatCurrency(bill.totalAmount)}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">
                    {formatDate(bill.dueDate)}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">
                    {bill.location}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    {isAreaCoordinator ? (
                      <select
                        value={selectedStatus}
                        onChange={(e) => handleStatusChange(bill.id, e.target.value)}
                        disabled={loading === bill.id}
                      className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#cf1b22] disabled:opacity-50 disabled:cursor-not-allowed"
                        style={{
                          backgroundColor: selectedOption.backgroundColor,
                          color: selectedOption.color,
                          fontWeight: '500'
                        }}
                      >
                        {BILL_TABLE_STATUS_OPTIONS.map((option) => (
                          <option
                            key={option.value}
                            value={option.value}
                            style={{ backgroundColor: option.backgroundColor, color: option.color }}
                          >
                            {option.label}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <BillStatusBadge status={bill.status} />
                    )}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setViewingBill(bill)}
                        className="text-[#cf1b22] hover:text-[#7f0c12]"
                        aria-label="Ver detalles de factura"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      {bill.documentUrl && (
                        <a
                          href={bill.documentUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-gray-600 hover:text-gray-900"
                          aria-label="Descargar documento"
                        >
                          <Download className="w-4 h-4" />
                        </a>
                      )}
                      {bill.status === 'draft' && (
                        <button
                          onClick={() => handleDelete(bill.id)}
                          disabled={loading === bill.id}
                          className="text-red-600 hover:text-red-900"
                          aria-label="Eliminar factura"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
                );
              })
            )}
            {/* Fila de totales */}
            {bills.length > 0 && (
              <tr className="bg-[#fdebec] border-t-2 border-[#f3b8bc] font-bold">
                <td className="px-4 py-4" colSpan={5}>
                  <div className="text-right text-gray-900 font-bold">
                    TOTAL:
                  </div>
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-lg font-bold text-[#cf1b22]">
                  {formatCurrency(totalAmount)}
                </td>
                <td className="px-4 py-4" colSpan={4}></td>
              </tr>
            )}
          </tbody>
        </table>
        </div>
      </div>
    </div>
    </>
  );
};
