import type { Handle } from '@sveltejs/kit';
import {
  enforcePermissionDependencies,
  PERMISSION_KEYS,
  type Permission,
  SUPER_ROLE,
} from '$lib/permissions';
import { DEV_USER_ID, IMPERSONATION_TTL_MS } from '$lib/server/config';
import { Impersonation, orm, RolePermission, User } from '$lib/server/db';
import {
  checkCanImpersonate,
  loadRoleTargets,
  roleActor,
} from '$lib/server/role-guard';
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

//? Le compte dont `real` a pris la place, tant que c'est encore valable. Tout est revérifié à
//? chaque requête : durée, permission de `real`, et règle d'autorisation (ses droits ou ceux du
//? compte ont pu changer). Sinon l'usurpation est levée et on revient à son propre compte.
const resolveImpersonation = async (
  real: SessionUser,
): Promise<SessionUser | null> => {
  const row = await orm.em.findOne(
    Impersonation,
    { user: real.id },
    { populate: ['target'] },
  );
  if (!row) return null;

  const end = async (reason: string) => {
    await orm.em.nativeDelete(Impersonation, { user: real.id });
    logger.info(
      { userId: real.id, targetId: row.target.id, reason },
      'prise de place levée',
    );
    return null;
  };

  if (Date.now() - row.createdAt.getTime() > IMPERSONATION_TTL_MS) {
    return end('expirée');
  }
  if (!real.permissions.includes('users.impersonate')) {
    return end('permission retirée');
  }

  const target = await loadUser(row.target.id);
  if (!target) return end('compte introuvable');

  const role = (await loadRoleTargets()).find(
    ({ id }) => id === target.role.id,
  );
  const check = role
    ? checkCanImpersonate(roleActor(real), { id: target.id, role })
    : { allowed: false as const };
  if (!check.allowed) return end('plus autorisée');

  return target;
};

//? Temporaire : le compte réel est toujours DEV_USER_ID (voir config.ts).
export const handleAuth: Handle = async ({ event, resolve }) => {
  const real = await loadUser(DEV_USER_ID);

  if (!real) {
    logger.warn(
      { userId: DEV_USER_ID },
      'DEV_USER_ID introuvable en base, aucun utilisateur connecté',
    );
  }

  //? `user` est le compte avec lequel on navigue ; `impersonator` le vrai compte quand on a pris
  //? la place d'un autre (null sinon).
  const target = real ? await resolveImpersonation(real) : null;
  event.locals.user = target ?? real;
  event.locals.impersonator = target ? real : null;

  return resolve(event);
};
