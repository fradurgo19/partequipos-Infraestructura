import type { ServiceType } from '../types';

export type BillProviderOption = { value: string; label: string };

const toProviderOptions = (names: string[]): BillProviderOption[] =>
  names.map((name) => ({ value: name, label: name }));

const LOGISTIC_PACIFIC_PROVIDER_NAMES = [
  'CENTRO LOGISTICO DEL PACIFICO',
  'COPROPIEDAD CENTRO LOGISTICO DEL PACIFICO',
] as const;

/** Proveedores compartidos (copropiedad CELPA / Centro Logístico del Pacífico). */
export const LOGISTIC_PACIFIC_PROVIDERS = toProviderOptions([...LOGISTIC_PACIFIC_PROVIDER_NAMES]);

/**
 * Proveedores del tipo de servicio Administración.
 * También se reutilizan en Impuesto Predial (predios/conjuntos con administración).
 */
export const ADMINISTRATION_SERVICE_PROVIDERS = toProviderOptions([
  'CONDOMINIO GRATIA BARRANQUILLA',
  'CONJUNTO RESIDENCIAL CANTO LUNA',
  'CONJUNTO RESIDENCIAL LA RIVIERA - P. H.',
  'EDIFICIO FENIX',
  'EDIFICIO PUNTA MADERO - PROPIEDAD HORIZONTAL',
  'ENTRELAGOS CONDOMINIO CAMPESTRE',
]);

/**
 * Predios / inmuebles específicos del registro de Impuesto Predial.
 * No incluye autoridades municipales: el “proveedor” identifica el predio cobrado.
 */
export const PROPERTY_TAX_PREDIOS_PROVIDERS = toProviderOptions([
  'LOTE GUARNE CEDI',
  'LOTE SIBERIA',
  'LOTE 38 CELPA',
  'LOTE 37 CELPA',
  'APTO GUARNE MIRADOR 360 N°407',
  'APTO GUARNE MIRADOR 360 N°603',
  'LOTE BARRANQUILLA LOGIK 40',
  'FINCA EL ZARZAL',
  'CASA EL PORTAL 1',
  'CASA EL PORTAL 2',
  'FINCA URRAO',
  'LOTE CARTAGENA',
  'LOTE TURBACO',
  'BOGOTA SEDE NUEVA',
  'CRA 68D Nro.17A - 84',
  'MAQUINARIA FONTIBON',
  'GUARNE BELLAVISTA',
]);

/**
 * Proveedores del tipo de servicio Impuesto Predial (`property_tax`):
 * conjuntos/administración + predios/inmuebles sujetos a predial.
 */
export const PROPERTY_TAX_SERVICE_PROVIDERS: BillProviderOption[] = [
  ...ADMINISTRATION_SERVICE_PROVIDERS,
  ...PROPERTY_TAX_PREDIOS_PROVIDERS,
];

/**
 * Arrendadores / inmobiliarias del tipo de servicio Arrendamiento (`rent`).
 */
export const RENT_SERVICE_PROVIDERS = toProviderOptions([
  'ANSERRA GLOBEL S.A.S.',
  'COLTEBIENES',
  'SOTO S.A.S',
  'FERNANDO REINA Y CIA SAS',
  'ARRENDAMIENTO VILLA CRUZ SAS',
  'CIMA COMPAÑIA INMOBILIARIA SAS',
  'SAJEAL SAS',
  'AGRO ZETA SAS',
  'CENTRO LOGISTICO STOCK CARIBE SAS',
  'PROMOTORA INMOBILIARIA DEL PACIFICO COLOMBIANO SAS',
  'WACONDA SAS',
  'ARAUJO Y SEGOVIA DE CORDOBA SA',
  'MARIELA SANABRIA ALDANA',
  'CELPA ZONA FRANCA',
  'CARLOS A SANCHEZ Y CIA CASYCO SAS',
  'Arrendador',
  ...LOGISTIC_PACIFIC_PROVIDER_NAMES,
]);

export const SECURITY_SERVICE_PROVIDERS = toProviderOptions([
  'PROSEGUR VIGILANCIA Y SEGURIDAD',
  'ATLAS',
  'SEGURTRONIC',
  'VIPERS',
  'COSMOS',
  'Miro',
  'TASA DE SEGURIDAD (TS) GOBERNACION VALLE DEL CAUCA',
  'Air-e S.A.S. (SS PCOS Barranquilla)',
  'Grupo Afinia EPM Caribe Mar de la Costa S.A.S. E.S.P.',
]);

/** Identifica si un proveedor pertenece al catálogo de Impuesto Predial. */
export const isPropertyTaxProvider = (provider: string): boolean =>
  PROPERTY_TAX_SERVICE_PROVIDERS.some((item) => item.value === provider.trim());

/** Identifica si un proveedor pertenece al catálogo de Arrendamiento. */
export const isRentProvider = (provider: string): boolean =>
  RENT_SERVICE_PROVIDERS.some((item) => item.value === provider.trim());

export const getProvidersForServiceType = (
  serviceType: Extract<ServiceType, 'property_tax' | 'rent' | 'administration' | 'security'>
): BillProviderOption[] => {
  switch (serviceType) {
    case 'property_tax':
      return PROPERTY_TAX_SERVICE_PROVIDERS;
    case 'rent':
      return RENT_SERVICE_PROVIDERS;
    case 'administration':
      return ADMINISTRATION_SERVICE_PROVIDERS;
    case 'security':
      return SECURITY_SERVICE_PROVIDERS;
    default:
      return [];
  }
};
