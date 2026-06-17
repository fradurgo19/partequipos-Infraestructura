import { useState, useEffect } from 'react';
import { UtilityBill, FilterOptions } from '../types';
import { billService } from '../services/billService';
import { usePagosAuth } from '../context/PagosAuthContext';

export const useBills = (filters?: FilterOptions) => {
  const { loading: authLoading } = usePagosAuth();
  const [bills, setBills] = useState<UtilityBill[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBills = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await billService.getAll(filters);
      setBills(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to fetch bills';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authLoading) {
      return;
    }
    fetchBills();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    authLoading,
    filters?.period,
    filters?.serviceType,
    filters?.location,
    filters?.status,
    filters?.search,
  ]);

  const refresh = () => {
    fetchBills();
  };

  return { bills, loading: loading || authLoading, error, refresh };
};
