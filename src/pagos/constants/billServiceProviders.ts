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

/** Proveedores del tipo de servicio Administración. */
export const ADMINISTRATION_SERVICE_PROVIDERS = toProviderOptions([
  'CONDOMINIO GRATIA BARRANQUILLA',
  'CONJUNTO RESIDENCIAL CANTO LUNA',
  'CONJUNTO RESIDENCIAL LA RIVIERA - P. H.',
  'EDIFICIO FENIX',
  'EDIFICIO PUNTA MADERO - PROPIEDAD HORIZONTAL',
  'ENTRELAGOS CONDOMINIO CAMPESTRE',
]);

/**
 * Proveedores del tipo Impuesto Predial (`property_tax`):
 * autoridades municipales / alcaldías (sin ubicaciones/predios).
 */
export const PROPERTY_TAX_SERVICE_PROVIDERS = toProviderOptions([
  'Municipio de Tenjo',
  'Municipio de Cisneros',
  'Municipio de Guarne',
  'Municipio de Envigado',
  'Municipio de Sabaneta',
  'Alcaldia municipal Turbaco',
  'Alcaldia municipal de Urrao',
  'Alcaldia mayor de Bogotá',
  'Alcaldia distrital de Buenaventura',
  'Alcaldia de Barranquilla',
  'Alcaldia Mayor Cartagena',
  'Alcaldia de Villavicencio',
]);

/**
 * Proveedores del tipo Cuota fija de operación (`operation_fixed_fee`).
 */
export const OPERATION_FIXED_FEE_PROVIDERS = toProviderOptions(['Celpa zona franca']);

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
  serviceType: Extract<
    ServiceType,
    'property_tax' | 'rent' | 'administration' | 'security' | 'operation_fixed_fee'
  >
): BillProviderOption[] => {
  switch (serviceType) {
    case 'property_tax':
      return PROPERTY_TAX_SERVICE_PROVIDERS;
    case 'operation_fixed_fee':
      return OPERATION_FIXED_FEE_PROVIDERS;
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
