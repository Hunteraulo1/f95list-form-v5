import {
  enforcePermissionDependencies,
  PERMISSION_KEYS,
  SUPER_ROLE,
} from '$lib/permissions';
import { orm, Role, RolePermission } from '$lib/server/db';
import type { SessionUser } from '$lib/server/hooks/auth';

//? Garde-fous de délégation (comme en v4) : un gestionnaire de rôles ne peut pas s'octroyer plus
//? de pouvoir qu'il n'en a, sinon « gérer les rôles » revient à être admin.
export interface RoleActor {
  userId: string;
  roleId: string;
  priority: number;
  permissions: ReadonlySet<string>;
  isSuper: boolean;
}

export interface RoleTarget {
  id: string;
  name: string;
  priority: number;
  permissions: readonly string[];
}

export type RoleCheck = { allowed: true } | { allowed: false; message: string };

export const roleActor = (user: SessionUser): RoleActor => ({
  userId: user.id,
  roleId: user.role.id,
  priority: user.role.priority,
  permissions: new Set(user.permissions),
  isSuper: user.role.name === SUPER_ROLE,
});

//? Peut-on modifier les permissions, le libellé ou supprimer ce rôle ?
export const checkCanManageRole = (
  actor: RoleActor,
  target: RoleTarget,
): RoleCheck => {
  if (target.name === SUPER_ROLE) {
    return {
      allowed: false,
      message:
        'Le rôle super admin possède tous les droits et ne peut pas être modifié ici.',
    };
  }
  if (actor.isSuper) return { allowed: true };

  if (actor.roleId === target.id) {
    return {
      allowed: false,
      message: 'Vous ne pouvez pas modifier votre propre rôle.',
    };
  }
  if (target.priority >= actor.priority) {
    return {
      allowed: false,
      message: 'Ce rôle est plus fort que le vôtre ou de force égale.',
    };
  }
  if (target.permissions.some((key) => !actor.permissions.has(key))) {
    return {
      allowed: false,
      message: "Ce rôle possède des droits que vous n'avez pas.",
    };
  }

  return { allowed: true };
};

//? Seul un super admin peut accorder une permission qu'il ne possède pas lui-même (donc jamais).
export const canGrant = (actor: RoleActor, permissions: readonly string[]) =>
  actor.isSuper || permissions.every((key) => actor.permissions.has(key));

//? Permissions effectives d'un rôle, dépendances comprises ; le rôle super admin a tout.
export const effectivePermissions = (
  role: { name: string },
  stored: readonly string[],
) =>
  role.name === SUPER_ROLE
    ? [...PERMISSION_KEYS]
    : enforcePermissionDependencies(stored);

export const loadRoleTargets = async (): Promise<RoleTarget[]> => {
  const [roles, rolePermissions] = await Promise.all([
    orm.em.find(Role, {}),
    orm.em.find(RolePermission, {}),
  ]);

  return roles.map((role) => ({
    id: role.id,
    name: role.name,
    priority: role.priority,
    permissions: effectivePermissions(
      role,
      rolePermissions
        .filter(({ role: { id } }) => id === role.id)
        .map(({ permission }) => permission),
    ),
  }));
};

const hasExtraPermissions = (actor: RoleActor, role: RoleTarget) =>
  role.permissions.some((key) => !actor.permissions.has(key));

//? Peut-on attribuer ce rôle à un utilisateur ? Jamais un rôle plus fort que le sien, ni qui
//? donne des droits qu'on n'a pas : sinon on pourrait s'élever ou élever un complice.
export const checkCanAssignRole = (
  actor: RoleActor,
  role: RoleTarget,
): RoleCheck => {
  if (actor.isSuper) return { allowed: true };

  if (role.name === SUPER_ROLE) {
    return {
      allowed: false,
      message: 'Seul un super admin peut attribuer le rôle super admin.',
    };
  }
  if (role.priority >= actor.priority) {
    return {
      allowed: false,
      message:
        'Vous ne pouvez pas attribuer un rôle plus fort que le vôtre ou de force égale.',
    };
  }
  if (hasExtraPermissions(actor, role)) {
    return {
      allowed: false,
      message: "Ce rôle possède des droits que vous n'avez pas.",
    };
  }

  return { allowed: true };
};

//? Peut-on modifier ce compte ? On peut toujours modifier le sien (hors rôle, vérifié à part).
export const checkCanManageUser = (
  actor: RoleActor,
  user: { id: string; role: RoleTarget },
): RoleCheck => {
  if (actor.isSuper || user.id === actor.userId) return { allowed: true };

  if (user.role.name === SUPER_ROLE) {
    return {
      allowed: false,
      message: 'Seul un super admin peut modifier un super admin.',
    };
  }
  if (user.role.priority >= actor.priority) {
    return {
      allowed: false,
      message:
        'Le rôle de cet utilisateur est plus fort que le vôtre ou de force égale.',
    };
  }
  if (hasExtraPermissions(actor, user.role)) {
    return {
      allowed: false,
      message:
        "Le rôle de cet utilisateur possède des droits que vous n'avez pas.",
    };
  }

  return { allowed: true };
};

//? Peut-on prendre la place de ce compte ? Jamais celle d'un super admin, jamais soi-même ; et sans
//? être super admin, seulement celle d'un compte qu'on aurait le droit de gérer : on ne peut pas
//? se hisser au-dessus de ses droits en passant par un autre compte.
export const checkCanImpersonate = (
  actor: RoleActor,
  target: { id: string; role: RoleTarget },
): RoleCheck => {
  if (target.id === actor.userId) {
    return { allowed: false, message: 'Vous êtes déjà connecté à ce compte.' };
  }
  if (target.role.name === SUPER_ROLE) {
    return {
      allowed: false,
      message: "Impossible de prendre la place d'un super admin.",
    };
  }
  if (actor.isSuper) return { allowed: true };

  return checkCanManageUser(actor, target);
};
