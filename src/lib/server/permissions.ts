import { error } from '@sveltejs/kit';
import type { Permission } from '$lib/permissions';

export const requirePermission = (
  locals: App.Locals,
  permission: Permission,
) => {
  if (!locals.user) error(401, 'Non connecté');
  if (!locals.user.permissions.includes(permission)) {
    error(403, 'Accès refusé');
  }
};
