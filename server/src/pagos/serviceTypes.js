/** Tipos de servicio soportados por la app Pagos (alineados con el frontend). */
export const PAGOS_SERVICE_TYPES = [
  'electricity',
  'water',
  'gas',
  'internet',
  'phone',
  'cellular',
  'waste',
  'sewer',
  'public_lighting',
  'security',
  'administration',
  'rent',
  'other',
];

const SERVICE_TYPE_SET = new Set(PAGOS_SERVICE_TYPES);

export const isValidPagosServiceType = (serviceType) =>
  typeof serviceType === 'string' && SERVICE_TYPE_SET.has(serviceType);
