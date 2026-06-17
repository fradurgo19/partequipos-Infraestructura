export interface BillLocationEntry {
  siteId?: string;
  city: string;
  address: string;
  businessGroup: string;
}

/** Catálogo legacy para facturas migradas con grupos empresariales históricos. */
export const LEGACY_BILL_LOCATION_CATALOG: BillLocationEntry[] = [
  { city: 'ITAGUI', address: 'CL 30 NRO. 41-30', businessGroup: 'PARTEQUIPOS S.A.S.' },
  { city: 'MEDELLIN', address: 'CRA 50 NRO.35-32', businessGroup: 'PARTEQUIPOS S.A.S.' },
  { city: 'MEDELLIN', address: 'CL 16 Nro.45-104 b. colombia.', businessGroup: 'PARTEQUIPOS S.A.S.' },
  { city: 'YUMBO-CALI', address: 'CALLE 15 NRO. 38-21 LOCAL 1 y 2 yumbo', businessGroup: 'PARTEQUIPOS S.A.S.' },
  { city: 'BARRANQUILLA', address: 'CL 110 NRO.10-427 BODEGA NRO. 8', businessGroup: 'PARTEQUIPOS S.A.S.' },
  { city: 'BARRANQUILLA', address: 'CL 110 NRO. 10-427 BODEGA NRO. 7', businessGroup: 'PARTEQUIPOS S.A.S.' },
  { city: 'BOGOTA', address: 'CRA68D Nro.17A - 84', businessGroup: 'PARTEQUIPOS S.A.S.' },
  { city: 'BOGOTA', address: 'CR 80 NRO.16D-54 El vergel.', businessGroup: 'PARTEQUIPOS S.A.S.' },
  { city: 'BOGOTA', address: 'CL 6 NRO. 26 -73', businessGroup: 'PARTEQUIPOS S.A.S.' },
  { city: 'BUCARAMANGA', address: 'KM 7 VIA GIRON NRO. 4-80', businessGroup: 'PARTEQUIPOS S.A.S.' },
  { city: 'CAUCASIA', address: 'CRA 20 NRO.3 A - 29', businessGroup: 'PARTEQUIPOS S.A.S.' },
  { city: 'ISTMINA-CHOCO', address: 'BOMBA ZEUZ LA 70 ALM ERA EN MVTO', businessGroup: 'PARTEQUIPOS S.A.S.' },
  { city: 'IBAGUE', address: 'CRA 48 SUR Nro.88-45 local 2', businessGroup: 'PARTEQUIPOS S.A.S.' },
  { city: 'BOGOTA', address: 'DG 16 NRO. 96G- 85', businessGroup: 'PARTEQUIPOS MAQUINARIA S.A.S.' },
  { city: 'GUARNE', address: 'KM26+800 MTS AUT. MED-BOGOTA', businessGroup: 'PARTEQUIPOS MAQUINARIA S.A.S.' },
  { city: 'GUARNE', address: 'VEREDA BELLAVISTA - Casa archivo', businessGroup: 'PARTEQUIPOS MAQUINARIA S.A.S.' },
  { city: 'MONTERIA', address: 'CRA 17 NRO. 76-94 BOSQUES DE SEVILLA', businessGroup: 'PARTEQUIPOS MAQUINARIA S.A.S.' },
  { city: 'ENVIGADO', address: 'CALLE 35ASUR NRO. 45B -66 ELPORTAL 1', businessGroup: 'PARTEQUIPOS MAQUINARIA S.A.S.' },
  { city: 'ENVIGADO', address: 'CALLE 35ASUR NRO. 45B -52 EL PORTAL 2', businessGroup: 'PARTEQUIPOS MAQUINARIA S.A.S.' },
  { city: 'SABANETA', address: 'CL 70 SUR NRO. 43A - 15 INT 2404 CANTO LUNA', businessGroup: 'WACONDA S.A.S.' },
  { city: 'BOGOTA', address: 'CL 23 NRO.72-91 APT 701 LA RIVIERA', businessGroup: 'WACONDA S.A.S.' },
  { city: 'CARTAGENA', address: 'CRA18 Nro. 24 45 apto 703 ED PUNTA MADERO', businessGroup: 'WACONDA S.A.S.' },
  { city: 'BARRANQUILLA', address: 'CRA 51 NRO.96A-79 ED FENIX', businessGroup: 'WACONDA S.A.S.' },
];

const sortLabels = (items: string[]) =>
  [...new Set(items)].sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }));

const mergeCatalogs = (primary: BillLocationEntry[], fallback: BillLocationEntry[]) => {
  const seen = new Set<string>();
  const merged: BillLocationEntry[] = [];

  for (const entry of [...primary, ...fallback]) {
    const key = `${entry.city}|${entry.businessGroup}|${entry.address}`;
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(entry);
  }

  return merged;
};

export const mergeBillLocationCatalogs = (
  primary: BillLocationEntry[],
  fallback: BillLocationEntry[]
): BillLocationEntry[] => mergeCatalogs(primary, fallback);

export const getBillLocationCities = (catalog: BillLocationEntry[]): string[] =>
  sortLabels(catalog.map((entry) => entry.city));

export const getBillLocationBusinessGroups = (city: string, catalog: BillLocationEntry[]): string[] =>
  sortLabels(catalog.filter((entry) => entry.city === city).map((entry) => entry.businessGroup));

export const getBillLocationAddresses = (
  city: string,
  businessGroup: string,
  catalog: BillLocationEntry[]
): BillLocationEntry[] =>
  catalog
    .filter((entry) => entry.city === city && entry.businessGroup === businessGroup)
    .sort((a, b) => a.address.localeCompare(b.address, 'es', { sensitivity: 'base' }));

export const findBillLocationEntry = (
  city: string,
  businessGroup: string,
  address: string,
  catalog: BillLocationEntry[]
): BillLocationEntry | undefined =>
  catalog.find(
    (entry) => entry.city === city && entry.businessGroup === businessGroup && entry.address === address
  );

/** Resuelve ciudad/sede a partir de datos almacenados o catálogo combinado. */
export const resolveBillLocationFromStored = (
  location: string,
  city?: string,
  businessGroup?: string,
  siteCatalog: BillLocationEntry[] = [],
  legacyCatalog: BillLocationEntry[] = LEGACY_BILL_LOCATION_CATALOG
): Pick<BillLocationEntry, 'city' | 'address' | 'businessGroup'> => {
  const catalog = mergeCatalogs(siteCatalog, legacyCatalog);

  if (city && businessGroup && location) {
    const exact = findBillLocationEntry(city, businessGroup, location, catalog);
    if (exact) return exact;
  }

  const normalized = location.trim().toUpperCase();
  const byAddress = catalog.find((entry) => entry.address.toUpperCase() === normalized);
  if (byAddress) return byAddress;

  const byPartial = catalog.find(
    (entry) =>
      normalized.includes(entry.address.toUpperCase()) ||
      entry.address.toUpperCase().includes(normalized)
  );
  if (byPartial) return byPartial;

  return {
    city: city ?? '',
    address: location,
    businessGroup: businessGroup ?? '',
  };
};
