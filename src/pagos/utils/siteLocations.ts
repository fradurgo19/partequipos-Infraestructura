import { BillLocationEntry } from '../constants/billLocations';

type SiteRow = {
  id: string;
  name: string | null;
  location: string | null;
  city: string | null;
};

const normalizeCity = (city?: string | null) => {
  const trimmed = city?.trim();
  return trimmed ? trimmed.toUpperCase() : 'SIN CIUDAD';
};

export const mapSitesToBillLocations = (sites: SiteRow[]): BillLocationEntry[] =>
  sites
    .map((site) => ({
      siteId: site.id,
      city: normalizeCity(site.city),
      businessGroup: site.name?.trim() || 'Sede sin nombre',
      address: site.location?.trim() || site.name?.trim() || '',
    }))
    .filter((entry) => entry.address);
