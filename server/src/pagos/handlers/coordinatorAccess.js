import { resolveActorRole, canManagePagosScope } from '../access.js';
import { isCoordinator } from '../transforms.js';

export const assertPagosCoordinator = async (pagosUser) => {
  if (pagosUser?.infraAdmin) {
    return;
  }

  const role = await resolveActorRole(pagosUser);
  if (!isCoordinator(role)) {
    const error = new Error('No tienes permisos de coordinador');
    error.statusCode = 403;
    throw error;
  }
};

export const assertPagosBillManager = async (pagosUser) => {
  if (!(await canManagePagosScope(pagosUser))) {
    const error = new Error('No tienes permisos para gestionar facturas');
    error.statusCode = 403;
    throw error;
  }
};
