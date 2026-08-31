import { isValidPagosServiceType } from './serviceTypes.js';

export const isServiceTypeConstraintDbError = (error) =>
  error?.code === '23514' &&
  String(error?.message ?? '').toLowerCase().includes('service_type');

const throwInvalidServiceType = (serviceType) => {
  const validationError = new Error(`Tipo de servicio no válido: ${serviceType || 'desconocido'}`);
  validationError.statusCode = 400;
  throw validationError;
};

export const assertValidPagosBillServiceType = (serviceType) => {
  if (isValidPagosServiceType(serviceType)) {
    return;
  }
  throwInvalidServiceType(serviceType);
};

export const assertValidConsumptionServiceTypes = (consumptions) => {
  if (!Array.isArray(consumptions)) {
    return;
  }

  const invalid = consumptions.find(
    (consumption) => !isValidPagosServiceType(consumption.serviceType ?? consumption.service_type)
  );

  if (!invalid) {
    return;
  }

  throwInvalidServiceType(invalid.serviceType ?? invalid.service_type);
};

export const toConsumptionDbError = (error, fallbackMessage) => {
  if (isServiceTypeConstraintDbError(error)) {
    const constraintError = new Error(
      'El tipo de servicio (p. ej. Impuesto Predial) no está habilitado en la base de datos. Un administrador debe actualizar el catálogo de service_type.'
    );
    constraintError.statusCode = 400;
    return constraintError;
  }

  const dbError = new Error(fallbackMessage);
  dbError.statusCode = 500;
  return dbError;
};
