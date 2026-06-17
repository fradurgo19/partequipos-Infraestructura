import { useEffect, useState } from 'react';
import {
  BillLocationEntry,
  LEGACY_BILL_LOCATION_CATALOG,
  getBillLocationAddresses,
  getBillLocationBusinessGroups,
  getBillLocationCities,
  mergeBillLocationCatalogs,
} from '../constants/billLocations';
import { pagosAuthService } from '../services/authService';
import { PAGOS_API } from '../config';
import { supabase } from '../../lib/supabase';
import { mapSitesToBillLocations } from '../utils/siteLocations';

const loadSitesFromApi = async (): Promise<BillLocationEntry[]> => {
  const headers = await pagosAuthService.getPagosApiAuthHeaders();
  const response = await fetch(`${PAGOS_API}/sites`, { headers });
  const contentType = response.headers.get('content-type') ?? '';

  if (!response.ok) {
    throw new Error('No se pudieron cargar las sedes');
  }

  if (!contentType.includes('application/json')) {
    throw new Error('Respuesta inválida del servidor de sedes');
  }

  return (await response.json()) as BillLocationEntry[];
};

const loadSitesFromSupabase = async (): Promise<BillLocationEntry[]> => {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return [];
  }

  const { data, error } = await supabase
    .from('sites')
    .select('id, name, location, city')
    .order('city', { ascending: true })
    .order('name', { ascending: true });

  if (error) {
    throw error;
  }

  return mapSitesToBillLocations(data ?? []);
};

export const useBillSiteLocations = () => {
  const [catalog, setCatalog] = useState<BillLocationEntry[]>(LEGACY_BILL_LOCATION_CATALOG);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadSites = async () => {
      try {
        let sites: BillLocationEntry[] = [];

        try {
          sites = await loadSitesFromApi();
        } catch (apiError) {
          const fallbackSites = await loadSitesFromSupabase();
          if (fallbackSites.length > 0) {
            sites = fallbackSites;
          } else {
            throw apiError;
          }
        }

        if (!cancelled) {
          setCatalog(mergeBillLocationCatalogs(sites, LEGACY_BILL_LOCATION_CATALOG));
        }
      } catch (err) {
        if (!cancelled) {
          console.error('Error cargando sedes para pagos:', err);
          setError(err instanceof Error ? err.message : 'Error al cargar sedes');
          setCatalog(LEGACY_BILL_LOCATION_CATALOG);
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
