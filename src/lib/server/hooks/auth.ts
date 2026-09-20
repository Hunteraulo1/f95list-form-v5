import type { Handle } from '@sveltejs/kit';
import {
  enforcePermissionDependencies,
  PERMISSION_KEYS,
  type Permission,
  SUPER_ROLE,
} from '$lib/permissions';
import { DEV_USER_ID } from '$lib/server/config';
import { orm, RolePermission, User } from '$lib/server/db';
import { logger } from '../logger';

//? Données exposées au client : volontairement sans zitadelId.
export interface SessionUser {
  id: string;
  name: string;
  email: string | null;
  description: string | null;
  avatar: string | null;
  banner: string | null;
  discord: string | null;
  theme: 'system' | 'light' | 'dark';
  discordNotification: boolean;
  role: { id: string; name: string; label: string; priority: number };
  permissions: Permission[];
}

const loadUser = async (id: string): Promise<SessionUser | null> => {
  const user = await orm.em.findOne(User, { id }, { populate: ['role'] });
  if (!user) return null;

  const permissions =
    user.role.name === SUPER_ROLE
      ? [...PERMISSION_KEYS]
      : enforcePermissionDependencies(
          (await orm.em.find(RolePermission, { role: user.role.id })).map(
            ({ permission }) => permission,
          ),
        );

  return {
    id: user.id,
    name: user.name,
    email: user.email ?? null,
    description: user.description ?? null,
    avatar: user.avatar ?? null,
    banner: user.banner ?? null,
    discord: user.discord ?? null,
    theme: user.theme,
    discordNotification: user.discordNotification,
    role: {
      id: user.role.id,
      name: user.role.name,
      label: user.role.label,
      priority: user.role.priority,
    },
    permissions,
  };
};

//? Temporaire : l'utilisateur est toujours DEV_USER_ID (voir config.ts).
export const handleAuth: Handle = async ({ event, resolve }) => {
  event.locals.user = await loadUser(DEV_USER_ID);

  if (!event.locals.user) {
    logger.warn(
      { userId: DEV_USER_ID },
      'DEV_USER_ID introuvable en base, aucun utilisateur connecté',
    );
  }

  return resolve(event);
};
