import { useEffect, useState } from 'react';
import {
  BillLocationEntry,
  LEGACY_BILL_LOCATION_CATALOG,
  getBillLocationAddresses,
  getBillLocationBusinessGroups,
  getBillLocationCities,
} from '../constants/billLocations';
import { pagosAuthService } from '../services/authService';
import { PAGOS_API } from '../config';

export const useBillSiteLocations = () => {
  const [catalog, setCatalog] = useState<BillLocationEntry[]>(LEGACY_BILL_LOCATION_CATALOG);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadSites = async () => {
      try {
        const headers = await pagosAuthService.getPagosApiAuthHeaders();
        const response = await fetch(`${PAGOS_API}/sites`, { headers });

        if (!response.ok) {
          throw new Error('No se pudieron cargar las sedes');
        }

        const sites = (await response.json()) as BillLocationEntry[];
        if (!cancelled && sites.length > 0) {
          setCatalog(sites);
        }
      } catch (err) {
        if (!cancelled) {
          console.error('Error cargando sedes para pagos:', err);
          setError(err instanceof Error ? err.message : 'Error al cargar sedes');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadSites();

    return () => {
      cancelled = true;
    };
  }, []);

  return {
    catalog,
    loading,
    error,
    cities: getBillLocationCities(catalog),
    getBusinessGroups: (city: string) => getBillLocationBusinessGroups(city, catalog),
    getAddresses: (city: string, businessGroup: string) =>
      getBillLocationAddresses(city, businessGroup, catalog),
  };
};
