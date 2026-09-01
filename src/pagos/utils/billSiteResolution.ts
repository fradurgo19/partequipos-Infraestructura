import {
  BILL_CANONICAL_SITES,
  BillCanonicalSite,
  getCanonicalSiteByKey,
} from '../constants/billSiteRegistry';
import { BillLocationEntry, findBillLocationEntry, mergeBillLocationCatalogs, LEGACY_BILL_LOCATION_CATALOG } from '../constants/billLocations';
import { UtilityBill } from '../types';

const MIN_FUZZY_ALIAS_LENGTH = 12;

const LOCATION_SUFFIXES = [
  ' - MAQUINARIA (WACONDA)',
  ' - MAQUINARIA',
  ' - REPUESTOS',
] as const;

const stripLocationSuffixes = (value: string): string => {
  let result = value.trim();
  for (const suffix of LOCATION_SUFFIXES) {
    if (result.toUpperCase().endsWith(suffix)) {
      result = result.slice(0, -suffix.length).trimEnd();
    }
  }
  return result;
};

const UNMAPPED_SITE_LABEL = 'Sin sede asignada';

const compactLocationTokens = (value: string): string =>
  value
    .replace(/\bNRO\.?\s*/gi, 'NRO ')
    .replace(/\bCLL?\.?\s*/gi, 'CL ')
    .replace(/\bCALLE\.?\s*/gi, 'CALLE ')
    .replace(/\bCRA\.?\s*/gi, 'CRA ')
    .replace(/\bCR\.?\s*/gi, 'CR ')
    .replace(/\bDG\.?\s*/gi, 'DG ')
    .replace(/\bKM\s*/gi, 'KM ')
    .replaceAll(',', ' ')
    .replaceAll(';', ' ')
    .replaceAll('.', ' ')
    .replaceAll('-', ' ')
    .replace(/\s+/g, ' ')
    .trim();

export const normalizeSiteAlias = (value: string): string =>
  compactLocationTokens(
    stripLocationSuffixes(
      value
        .trim()
        .toUpperCase()
        .normalize('NFD')
        .replace(/\p{M}/gu, '')
    )
  );

const registerAlias = (
  map: Map<string, BillCanonicalSite>,
  alias: string,
  site: BillCanonicalSite
) => {
  const key = normalizeSiteAlias(alias);
  if (!key || map.has(key)) return;
  map.set(key, site);
};

const buildAliasMap = (): Map<string, BillCanonicalSite> => {
  const map = new Map<string, BillCanonicalSite>();

  for (const canonicalSite of BILL_CANONICAL_SITES) {
    registerAlias(map, canonicalSite.siteName, canonicalSite);
    canonicalSite.aliases.forEach((alias) => registerAlias(map, alias, canonicalSite));
  }

  return map;
};

const ALIAS_MAP = buildAliasMap();

const resolveLoteByCity = (city?: string | null): BillCanonicalSite | null => {
  if (!city) return null;
  const normalizedCity = city.trim().toUpperCase();
  return (
    BILL_CANONICAL_SITES.find(
      (entry) => entry.city === normalizedCity && normalizeSiteAlias(entry.canonicalAddress) === 'LOTE'
    ) ?? null
  );
};

const findFuzzySiteMatch = (normalizedLocation: string): BillCanonicalSite | null => {
  for (const canonicalSite of BILL_CANONICAL_SITES) {
    const aliases = [canonicalSite.siteName, canonicalSite.canonicalAddress, ...canonicalSite.aliases];
    for (const alias of aliases) {
      const normalizedAlias = normalizeSiteAlias(alias);
      if (normalizedAlias.length < MIN_FUZZY_ALIAS_LENGTH) continue;
      if (
        normalizedLocation.includes(normalizedAlias) ||
        normalizedAlias.includes(normalizedLocation)
      ) {
        return canonicalSite;
      }
    }
  }

  return null;
};

export const resolveCanonicalSite = (
  location?: string | null,
  city?: string | null
): BillCanonicalSite | null => {
  const trimmed = location?.trim();
  if (!trimmed) return null;

  const normalized = normalizeSiteAlias(trimmed);
  if (normalized === 'LOTE') {
    return resolveLoteByCity(city);
  }

  const exact = ALIAS_MAP.get(normalized);
  if (exact) return exact;

  return findFuzzySiteMatch(normalized);
};

export const getBillSiteDisplayName = (bill: Pick<UtilityBill, 'location' | 'city'>): string => {
  const resolved = resolveCanonicalSite(bill.location, bill.city);
  if (resolved) return resolved.siteName;
  const raw = bill.location?.trim();
  return raw || UNMAPPED_SITE_LABEL;
};

export const getBillCanonicalSiteKey = (
  bill: Pick<UtilityBill, 'location' | 'city'>
): string => {
  const resolved = resolveCanonicalSite(bill.location, bill.city);
  if (resolved) return resolved.key;
  const normalized = normalizeSiteAlias(bill.location ?? '');
  return normalized ? `unmapped:${normalized}` : 'unmapped:empty';
};

/** Opciones únicas de sede para filtros del dashboard (solo sedes canónicas con facturas). */
export const collectCanonicalSiteFilterOptions = (
  bills: Pick<UtilityBill, 'location' | 'city'>[]
): string[] => {
  const siteNames = new Set<string>();

  bills.forEach((bill) => {
    const resolved = resolveCanonicalSite(bill.location, bill.city);
    if (resolved) {
      siteNames.add(resolved.siteName);
    }
  });

  return sortSiteNames([...siteNames]);
};

export const billMatchesCanonicalSite = (
  bill: Pick<UtilityBill, 'location' | 'city'>,
  siteFilter: string
): boolean => {
  if (siteFilter === 'all') return true;
  return getBillSiteDisplayName(bill) === siteFilter;
};

/** Agrupa facturas por sede canónica única para gráficos del dashboard. */
export const groupBillsByCanonicalSite = <T extends Pick<UtilityBill, 'location' | 'city'>>(
  bills: T[]
): Map<string, { label: string; bills: T[] }> => {
  const grouped = new Map<string, { label: string; bills: T[] }>();

  bills.forEach((bill) => {
    const siteKey = getBillCanonicalSiteKey(bill);
    const label = getBillSiteDisplayName(bill);
    const current = grouped.get(siteKey) ?? { label, bills: [] };
    current.bills.push(bill);
    grouped.set(siteKey, current);
  });

  return grouped;
};

export const sortSiteNames = (names: string[]): string[] =>
  [...new Set(names.filter(Boolean))].sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }));

export const resolveSiteFromForm = (
  siteKey: string,
  location?: string,
  city?: string
): BillCanonicalSite | null => {
  const byKey = getCanonicalSiteByKey(siteKey);
  if (byKey) return byKey;
  return resolveCanonicalSite(location, city);
};

const findSiteIdInCatalog = (
  city: string,
  address: string,
  catalog: BillLocationEntry[]
): string | undefined => {
  const match = catalog.find((entry) => entry.city === city && entry.address === address);
  return match?.siteId;
};

export interface ResolvedBillFormSite {
  city: string;
  siteKey: string;
  businessGroup: string;
  location: string;
  siteId?: string;
}

/** Resuelve ciudad, sede canónica y dirección para el formulario de facturas. */
export const resolveBillFormSite = (
  location: string,
  city?: string,
  businessGroup?: string,
  siteCatalog: BillLocationEntry[] = []
): ResolvedBillFormSite => {
  const catalog = mergeBillLocationCatalogs(siteCatalog, LEGACY_BILL_LOCATION_CATALOG);
  const canonical = resolveCanonicalSite(location, city);

  if (canonical) {
    const resolvedCity = city?.trim() || canonical.city;
    const siteId =
      findSiteIdInCatalog(resolvedCity, canonical.canonicalAddress, catalog) ??
      (city && businessGroup
        ? findBillLocationEntry(city, businessGroup, location, catalog)?.siteId
        : undefined);

    return {
      city: resolvedCity,
      siteKey: canonical.key,
      businessGroup: businessGroup?.trim() ?? '',
      location: canonical.canonicalAddress,
      siteId,
    };
  }

  if (city && businessGroup && location) {
    const exact = findBillLocationEntry(city, businessGroup, location, catalog);
    if (exact) {
      return {
        city: exact.city,
        siteKey: '',
        businessGroup: exact.businessGroup,
        location: exact.address,
        siteId: exact.siteId,
      };
    }
  }

  const normalized = location.trim().toUpperCase();
  const byAddress = catalog.find((entry) => entry.address.toUpperCase() === normalized);
  if (byAddress) {
    const matchedSite = resolveCanonicalSite(byAddress.address, byAddress.city);
    return {
      city: byAddress.city,
      siteKey: matchedSite?.key ?? '',
      businessGroup: businessGroup?.trim() || byAddress.businessGroup,
      location: matchedSite?.canonicalAddress ?? byAddress.address,
      siteId: byAddress.siteId,
    };
  }

  return {
    city: city ?? '',
    siteKey: '',
    businessGroup: businessGroup ?? '',
    location: location,
    siteId: undefined,
  };
};
