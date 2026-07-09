import { isValidPagosServiceType } from './serviceTypes.js';

export const isServiceTypeConstraintDbError = (error) =>
  error?.code === '23514' &&
  String(error?.message ?? '').toLowerCase().includes('service_type');

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

  const serviceType = invalid.serviceType ?? invalid.service_type ?? 'desconocido';
  const validationError = new Error(`Tipo de servicio no válido: ${serviceType}`);
  validationError.statusCode = 400;
  throw validationError;
};

export const toConsumptionDbError = (error, fallbackMessage) => {
  if (isServiceTypeConstraintDbError(error)) {
    const constraintError = new Error(
      'El tipo de servicio no está habilitado en la base de datos. Solicite la actualización del catálogo de servicios.'
    );
    constraintError.statusCode = 400;
    return constraintError;
  }

  const dbError = new Error(fallbackMessage);
  dbError.statusCode = 500;
  return dbError;
};
