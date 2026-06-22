import { resolveActorRole } from '../access.js';
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
