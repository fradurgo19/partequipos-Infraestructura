import { ADDITIONAL_BILL_CITIES } from './billLocations';

export interface BillCanonicalSite {
  key: string;
  siteName: string;
  city: string;
  canonicalAddress: string;
  aliases: string[];
}

const site = (
  key: string,
  siteName: string,
  city: string,
  canonicalAddress: string,
  aliases: string[] = []
): BillCanonicalSite => ({
  key,
  siteName,
  city,
  canonicalAddress,
  aliases: [canonicalAddress, ...aliases],
});

/** Sedes canónicas: unifica variantes de dirección para dashboard y formulario de facturas. */
export const BILL_CANONICAL_SITES: BillCanonicalSite[] = [
  site(
    'el-portal-casa-1',
    'El Portal Casa 1',
    'ENVIGADO',
    'CALLE 35ASUR NRO. 45B -66 ELPORTAL 1',
    ['EL PORTAL. CALLE 35ASUR NRO. 45B -66 - MAQUINARIA', 'PORTAL 1']
  ),
  site(
    'el-portal-casa-2',
    'El Portal Casa 2',
    'ENVIGADO',
    'CALLE 35ASUR NRO. 45B -52 EL PORTAL 2',
    ['EL PORTAL. CALLE 35ASUR NRO. 45B -52 - MAQUINARIA', 'PORTAL 2']
  ),
  site(
    'apto-la-riviera-bogota',
    'Apto La Riviera Bogota',
    'BOGOTA',
    'BOGOTA APTO LA RIVIERA CL 23 NRO.72-91 APT 701',
    [
      'BOGOTA APTO LA RIVIERA CL 23 NRO.72-91 APT 701 - MAQUINARIA (WACONDA)',
      'CL 23 NRO.72-91 APT 701 LA RIVIERA',
    ]
  ),
  site(
    'barranquilla-bodega-8',
    'BARRANQUILLA CL 110 NRO.10-427 BODEGA NRO. 8',
    'BARRANQUILLA',
    'BARRANQUILLA CL 110 NRO.10-427 BODEGA NRO. 8',
    [
      'BARRANQUILLA CL 110 NRO.10-427 BODEGA NRO. 8 - REPUESTOS',
      'CL 110 NRO.10-427 BODEGA NRO. 8',
    ]
  ),
  site(
    'apto-barranquilla-fenix',
    'Apto Barranquilla Fenix',
    'BARRANQUILLA',
    'CRA 51 NRO.96A-79 ED FENIX',
    ['BARRANQUILLA, CRA 51 NRO.96A-79 ED FENIX - MAQUINARIA (WACONDA)']
  ),
  site(
    'barranquilla-bodega-7',
    'BARRANQUILLA CL 110 NRO.10-427 BODEGA NRO. 7',
    'BARRANQUILLA',
    'CL 110 NRO. 10-427 BODEGA NRO. 7'
  ),
  site(
    'bogota-sede-nueva-cra68d',
    'BOGOTA SEDE NUEVA CRA68D Nro.17A - 84',
    'BOGOTA',
    'BOGOTA SEDE NUEVA CRA68D Nro.17A - 84',
    [
      'BOGOTA SEDE NUEVA CRA68D Nro.',
      'BOGOTA SEDE NUEVA CRA68D Nro.17A - 84 - REPUESTOS',
      'CRA68D Nro.17A - 84',
    ]
  ),
  site('istmina', 'Istmina', 'ISTMINA-CHOCO', 'BOMBA ZEUZ LA 70 ALM ERA EN MVTO'),
  site(
    'buenaventura-lote-37',
    'BUENAVENTURA KM 13 VIA ALTERNA LOTE 37',
    'BUENAVENTURA',
    'BUENAVENTURA KM 13 VIA ALTERNA',
    ['LOTE 37']
  ),
  site(
    'buenaventura-lote-38',
    'BUENAVENTURA KM 13 VIA ALTERNA LOTE 38',
    'BUENAVENTURA',
    'LOTE 38'
  ),
  site(
    'cali-yumbo',
    'Cali',
    'YUMBO-CALI',
    'CALLE 15 NRO. 38-21 LOCAL 1 y 2 yumbo'
  ),
  site(
    'apto-cantoluna-sabaneta',
    'Apto Cantoluna Sabaneta',
    'SABANETA',
    'CL 70 SUR NRO. 43A - 15 INT 2404 CANTO LUNA',
    ['CALLE 70 SUR NRO. 43A - 15 INT 2404 CANTO LUNA - MAQUINARIA (WACONDA)']
  ),
  site(
    'caucasia',
    'Caucasia',
    'CAUCASIA',
    'CRA 20 NRO.3 A - 29',
    ['CAUCASIA CRA 20 NRO.3 A - 29 - REPUESTOS']
  ),
  site(
    'monterrey-medellin',
    'Monterrey',
    'MEDELLIN',
    'CL 16 Nro.45-104 b. colombia.'
  ),
  site(
    'itagui',
    'Itagüí',
    'ITAGUI',
    'CL 30 NRO. 41-30',
    ['ITAGUI CL 30 NRO. 41-30 - REPUESTOS', 'Cll 30 41 30', 'CII 30 41 30']
  ),
  site(
    'la-sexta-bogota',
    'La Sexta Bogota',
    'BOGOTA',
    'CL 6 NRO. 26 -73',
    ['SEXTA CALLE 6 NRO. 26 -7 3 BOGOTA - REPUESTOS']
  ),
  site('apto-gratia', 'Apto GRATIA', 'BARRANQUILLA', 'CONDOMINIO GRATIA'),
  site(
    'el-vergel-bogota',
    'El Vergel Bogota',
    'BOGOTA',
    'CR 80 NRO.16D-54 El vergel.'
  ),
  site(
    'monteria',
    'Montería',
    'MONTERIA',
    'CRA 17 NRO. 76-94 BOSQUES DE SEVILLA',
    ['MONTERIA CRA 17 NRO. 76-94 BOSQUES DE SEVILLA - MAQUINARIA']
  ),
  site('ibague', 'Ibagué', 'IBAGUE', 'CRA 48 SUR Nro.88-45 local 2'),
  site(
    'almacen-palace',
    'Almacén Palace',
    'MEDELLIN',
    'MEDELLIN ALMACEN PALACE. CRA 50 NRO.35-32',
    ['CRA 50 NRO.35-32', 'MEDELLIN CRA 50 Nro 30 - 12 PALACE']
  ),
  site(
    'apto-cartagena',
    'Apto Cartagena',
    'CARTAGENA',
    'CRA18 Nro. 24 45 apto 703 ED PUNTA MADERO'
  ),
  site(
    'maquinaria-fontibon',
    'Maquinaria Fontibón',
    'BOGOTA',
    'MQ BOGOTA DG 16 NRO. 96G- 85 - MAQUINARIA',
    ['DG 16 NRO. 96G- 85', 'MQ BOGOTA DG 16 NRO. 96G- 85 - M']
  ),
  site('bucaramanga', 'Bucaramanga', 'BUCARAMANGA', 'KM 7 VIA GIRON NRO. 4-80'),
  site(
    'guarne-repuestos',
    'Guarne Repuestos',
    'GUARNE',
    'KM26+800 MTS AUT. MED-BOGOTA',
    [
      'MAQUINARIA GUARNE KM26+800 MTS AUT. MED. B - MAQUINARIA',
      'LOTE GUARNE CEDI',
    ]
  ),
  site(
    'guarne-bellavista',
    'Guarne Bellavista',
    'GUARNE',
    'MAQUINARIA GUARNE (CASA NUEVA) VEREDA BELLAVISTA - MAQUINARIA',
    ['VEREDA BELLAVISTA - Casa archivo']
  ),
  site('apto-guarne-407', 'Apto Guarne 407', 'GUARNE', 'APTO GUARNE 407'),
  site('apto-guarne-603', 'Apto Guarne 603', 'GUARNE', 'APTO GUARNE 603'),
  site('casa-lote-guarne', 'Casa Lote Guarne', 'GUARNE', 'CASA LOTE GUARNE'),
  site('lote-cartagena', 'Lote Cartagena', 'CARTAGENA', 'LOTE CARTAGENA'),
  site(
    'lote-villavicencio',
    'Lote Villavicencio Condominio Entrelagos',
    'VILLAVICENCIO',
    'Lote en Villavicencio'
  ),
  ...ADDITIONAL_BILL_CITIES.map((city) =>
    site(`finca-el-zarzal-${city.toLowerCase()}`, 'Finca el Zarzal', city, 'Lote', ['Lote'])
  ),
];

const sortLabels = (items: string[]) =>
  [...new Set(items)].sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }));

export const getCanonicalSiteCities = (): string[] =>
  sortLabels(BILL_CANONICAL_SITES.map((entry) => entry.city));

export const getCanonicalSitesByCity = (city: string): BillCanonicalSite[] =>
  BILL_CANONICAL_SITES.filter((entry) => entry.city === city).sort((a, b) =>
    a.siteName.localeCompare(b.siteName, 'es', { sensitivity: 'base' })
  );

export const getCanonicalSiteByKey = (key: string): BillCanonicalSite | undefined =>
  BILL_CANONICAL_SITES.find((entry) => entry.key === key);
