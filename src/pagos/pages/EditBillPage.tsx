import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { BillForm } from '../organisms/BillForm';
import { billService } from '../services/billService';
import { billToFormData } from '../utils/billFormUtils';
import { canEditPagosBill } from '../utils/billPermissions';
import { usePagosAuth } from '../context/PagosAuthContext';
import type { UtilityBillFormData } from '../types';

export const EditBillPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile } = usePagosAuth();
  const [initialData, setInitialData] = useState<UtilityBillFormData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setError('Identificador de factura no válido');
      setLoading(false);
      return;
    }

    let cancelled = false;

    const load = async () => {
      try {
        const bill = await billService.getById(id);
        if (cancelled) return;
        if (!bill) {
          setError('Factura no encontrada');
          return;
        }
        if (!canEditPagosBill(bill, profile)) {
          setError('No tienes permisos para modificar esta factura');
          return;
        }
        setInitialData(billToFormData(bill));
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Error al cargar la factura');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [id, profile]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#cf1b22]" aria-hidden="true" />
      </div>
    );
  }

  if (error || !initialData) {
    return (
      <div className="animate-fadeIn">
        <div className="rounded-2xl shadow-2xl p-8 mb-6 bg-red-50 border border-red-200">
          <p className="text-red-700 font-medium">{error ?? 'Datos no disponibles'}</p>
          <button
            type="button"
            onClick={() => navigate('/pagos/reports')}
            className="mt-4 px-4 py-2 bg-[#cf1b22] text-white rounded-lg hover:bg-[#a11217] transition-colors"
          >
            Volver a Reportes
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fadeIn">
      <div className="bg-gradient-to-r from-[#cf1b22] via-[#a11217] to-[#50504f] rounded-2xl shadow-2xl p-8 mb-6 border border-[#cf1b22]/40">
        <h1 className="text-4xl font-bold text-white mb-2 tracking-tight">Modificar Factura</h1>
        <p className="text-white/80 text-lg">
          Corrija los datos que necesite y guarde los cambios.
        </p>
      </div>
      <BillForm billId={id} initialData={initialData} />
    </div>
  );
};
