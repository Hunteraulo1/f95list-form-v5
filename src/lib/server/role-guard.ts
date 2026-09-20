import { SUPER_ROLE } from '$lib/permissions';
import type { SessionUser } from '$lib/server/hooks/auth';

//? Garde-fous de délégation (comme en v4) : un gestionnaire de rôles ne peut pas s'octroyer plus
//? de pouvoir qu'il n'en a, sinon « gérer les rôles » revient à être admin.
export interface RoleActor {
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
        'Le rôle admin possède tous les droits et ne peut pas être modifié ici.',
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

//? Seul un admin peut accorder une permission qu'il ne possède pas lui-même (donc jamais).
export const canGrant = (actor: RoleActor, permissions: readonly string[]) =>
  actor.isSuper || permissions.every((key) => actor.permissions.has(key));
