import { useState, useEffect } from 'react';
import { UtilityBill, FilterOptions } from '../types';
import { billService } from '../services/billService';

export const useBills = (filters?: FilterOptions) => {
  const [bills, setBills] = useState<UtilityBill[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBills = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await billService.getAll(filters);
      setBills(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch bills');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBills();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters?.period, filters?.serviceType, filters?.location, filters?.status, filters?.search]);

  const refresh = () => {
    fetchBills();
  };

  return { bills, loading, error, refresh };
};
