import { error, fail, redirect } from '@sveltejs/kit';
import {
  enforcePermissionDependencies,
  isPermission,
  MAX_ROLE_PRIORITY,
  permissionGroups,
  SUPER_ROLE,
} from '$lib/permissions';
import {
  MAX_API_DAILY_QUOTA,
  MAX_API_KEY_LIMIT,
  parseQuota,
} from '$lib/server/api-keys';
import { orm, Role, RolePermission, User } from '$lib/server/db';
import { requirePermission } from '$lib/server/permissions';
import {
  canGrant,
  checkCanManageRole,
  effectivePermissions,
  roleActor,
} from '$lib/server/role-guard';
import type { Actions, PageServerLoad } from './$types';

const LABEL_MAX_LENGTH = 64;
const DESCRIPTION_MAX_LENGTH = 500;

const NOTICES = {
  created: 'Rôle créé.',
  updated: 'Rôle mis à jour.',
  permissions: 'Permissions enregistrées.',
  deleted: 'Rôle supprimé.',
} as const;

type Notice = keyof typeof NOTICES;

const roleUrl = (name: string, notice?: Notice) => {
  const params = new URLSearchParams({ role: name });
  if (notice) params.set('notice', notice);

  return `/admin/roles?${params}`;
};

const slugify = (input: string) =>
  input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);

const loadRoleWithPermissions = async (id: string) => {
  const role = await orm.em.findOne(Role, { id });
  if (!role) return null;

  const stored = await orm.em.find(RolePermission, { role: id });
  return {
    role,
    permissions: effectivePermissions(
      role,
      stored.map(({ permission }) => permission),
    ),
  };
};

export const load: PageServerLoad = async ({ locals, url }) => {
  requirePermission(locals, 'manage.roles');
  if (!locals.user) error(401, 'Non connecté');

  const actor = roleActor(locals.user);

  const [roleEntities, rolePermissions] = await Promise.all([
    orm.em.find(Role, {}),
    orm.em.find(RolePermission, {}),
  ]);

  const rows = await Promise.all(
    roleEntities.map(async (role) => {
      const permissions = effectivePermissions(
        role,
        rolePermissions
          .filter(({ role: { id } }) => id === role.id)
          .map(({ permission }) => permission),
      );
      const check = checkCanManageRole(actor, {
        id: role.id,
        name: role.name,
        priority: role.priority,
        permissions,
      });

      return {
        id: role.id,
        name: role.name,
        label: role.label,
        description: role.description ?? '',
        isSystem: role.isSystem,
        isSuper: role.name === SUPER_ROLE,
        priority: role.priority,
        users: await orm.em.count(User, { role: role.id }),
        apiKeyLimit: role.apiKeyLimit,
        apiDailyQuota: role.apiDailyQuota,
        permissions,
        canManage: check.allowed,
        blockedReason: check.allowed ? null : check.message,
      };
    }),
  );

  //? Du plus fort au plus faible.
  const roles = rows.sort(
    (a, b) => b.priority - a.priority || a.label.localeCompare(b.label, 'fr'),
  );

  const selected = roles.find(
    ({ name }) => name === url.searchParams.get('role'),
  );
  if (!selected) redirect(303, roleUrl(roles[0].name));

  const notice = url.searchParams.get('notice');

  return {
    roles,
    selected,
    //? Sans être admin, on ne peut accorder que ce qu'on possède déjà.
    groups: permissionGroups(actor.isSuper ? undefined : actor.permissions),
    canEditPriority: actor.isSuper,
    notice:
      notice && Object.hasOwn(NOTICES, notice)
        ? NOTICES[notice as Notice]
        : null,
    limits: {
      keys: MAX_API_KEY_LIMIT,
      quota: MAX_API_DAILY_QUOTA,
      priority: MAX_ROLE_PRIORITY,
    },
  };
};

export const actions: Actions = {
  createRole: async ({ locals, request }) => {
    requirePermission(locals, 'manage.roles');

    const data = await request.formData();
    const label = String(data.get('label') ?? '').trim();
    const description = String(data.get('description') ?? '').trim();
    const name = slugify(label);

    if (!label || !name || label.length > LABEL_MAX_LENGTH) {
      return fail(400, {
        message: `Le libellé est requis (${LABEL_MAX_LENGTH} caractères max, avec au moins une lettre ou un chiffre).`,
      });
    }
    if (description.length > DESCRIPTION_MAX_LENGTH) {
      return fail(400, {
        message: `La description ne peut pas dépasser ${DESCRIPTION_MAX_LENGTH} caractères.`,
      });
    }
    if (await orm.em.findOne(Role, { name })) {
      return fail(409, {
        message: 'Un rôle avec cet identifiant existe déjà.',
      });
    }

    //? Un rôle créé n'a aucune permission et la force la plus basse : on lui donne ensuite ce qu'il faut.
    orm.em.create(Role, {
      name,
      label,
      description: description || null,
      isSystem: false,
      priority: 0,
    });
    await orm.em.flush();

    redirect(303, roleUrl(name, 'created'));
  },

  updateRole: async ({ locals, request }) => {
    requirePermission(locals, 'manage.roles');
    if (!locals.user) return fail(401, { message: 'Non connecté.' });

    const data = await request.formData();
    const found = await loadRoleWithPermissions(String(data.get('id') ?? ''));
    if (!found) return fail(404, { message: 'Rôle introuvable.' });

    const { role, permissions } = found;
    const actor = roleActor(locals.user);
    const isSuperRole = role.name === SUPER_ROLE;

    //? Sur le rôle super admin, seuls les quotas se règlent, et seulement par un super admin.
    if (isSuperRole && !actor.isSuper) {
      return fail(403, {
        message:
          'Seul un super admin peut modifier les quotas du rôle super admin.',
      });
    }
    if (!isSuperRole) {
      const check = checkCanManageRole(actor, {
        id: role.id,
        name: role.name,
        priority: role.priority,
        permissions,
      });
      if (!check.allowed) return fail(403, { message: check.message });
    }

    const apiKeyLimit = parseQuota(data.get('apiKeyLimit'), MAX_API_KEY_LIMIT);
    const apiDailyQuota = parseQuota(
      data.get('apiDailyQuota'),
      MAX_API_DAILY_QUOTA,
    );
    if (apiKeyLimit == null) {
      return fail(400, {
        message: `Le nombre de clés doit être un entier entre 0 et ${MAX_API_KEY_LIMIT}.`,
      });
    }
    if (apiDailyQuota == null) {
      return fail(400, {
        message: `Le quota quotidien doit être un entier entre 0 et ${MAX_API_DAILY_QUOTA}.`,
      });
    }

    role.apiKeyLimit = apiKeyLimit;
    role.apiDailyQuota = apiDailyQuota;

    //? Libellé et description : rôles personnalisés uniquement.
    if (!role.isSystem) {
      const label = String(data.get('label') ?? '').trim();
      const description = String(data.get('description') ?? '').trim();

      if (!label || label.length > LABEL_MAX_LENGTH) {
        return fail(400, {
          message: `Le libellé est requis (${LABEL_MAX_LENGTH} caractères max).`,
        });
      }
      if (description.length > DESCRIPTION_MAX_LENGTH) {
        return fail(400, {
          message: `La description ne peut pas dépasser ${DESCRIPTION_MAX_LENGTH} caractères.`,
        });
      }

      role.label = label;
      role.description = description || null;
    }

    //? La force ne se règle que par un super admin.
    //? Celle du super admin est fixe.
    if (actor.isSuper && !isSuperRole && data.has('priority')) {
      const priority = parseQuota(data.get('priority'), MAX_ROLE_PRIORITY);
      if (priority == null) {
        return fail(400, {
          message: `La force doit être un entier entre 0 et ${MAX_ROLE_PRIORITY}.`,
        });
      }
      role.priority = priority;
    }

    await orm.em.flush();

    redirect(303, roleUrl(role.name, 'updated'));
  },

  updatePermissions: async ({ locals, request }) => {
    requirePermission(locals, 'manage.roles');
    if (!locals.user) return fail(401, { message: 'Non connecté.' });

    const data = await request.formData();
    const found = await loadRoleWithPermissions(String(data.get('id') ?? ''));
    if (!found) return fail(404, { message: 'Rôle introuvable.' });

    const { role, permissions } = found;
    const actor = roleActor(locals.user);

    const check = checkCanManageRole(actor, {
      id: role.id,
      name: role.name,
      priority: role.priority,
      permissions,
    });
    if (!check.allowed) return fail(403, { message: check.message });

    const requested = data
      .getAll('permissions')
      .map(String)
      .filter(isPermission);
    if (!canGrant(actor, requested)) {
      return fail(403, {
        message:
          'Vous ne pouvez pas accorder des droits que vous ne possédez pas.',
      });
    }

    const keys = enforcePermissionDependencies(requested);

    //? Insertion directe : les anciennes lignes sont déjà chargées dans l'ORM (pour les gardes), un
    //? `create` sur la même clé serait pris pour l'une d'elles et ne ferait aucun INSERT.
    await orm.em.transactional(async (em) => {
      await em.nativeDelete(RolePermission, { role: role.id });

      if (keys.length > 0) {
        await em.insertMany(
          RolePermission,
          keys.map((permission) => ({ role: role.id, permission })),
        );
      }
    });

    redirect(303, roleUrl(role.name, 'permissions'));
  },

  deleteRole: async ({ locals, request }) => {
    requirePermission(locals, 'manage.roles');
    if (!locals.user) return fail(401, { message: 'Non connecté.' });

    const data = await request.formData();
    const found = await loadRoleWithPermissions(String(data.get('id') ?? ''));
    if (!found) return fail(404, { message: 'Rôle introuvable.' });

    const { role, permissions } = found;

    if (role.isSystem) {
      return fail(403, {
        message: 'Les rôles système ne peuvent pas être supprimés.',
      });
    }

    const check = checkCanManageRole(roleActor(locals.user), {
      id: role.id,
      name: role.name,
      priority: role.priority,
      permissions,
    });
    if (!check.allowed) return fail(403, { message: check.message });

    if ((await orm.em.count(User, { role: role.id })) > 0) {
      return fail(409, {
        message: 'Ce rôle est encore attribué à des utilisateurs.',
      });
    }

    //? Les permissions du rôle partent avec lui (clé étrangère en cascade).
    await orm.em.nativeDelete(Role, { id: role.id });

    redirect(303, '/admin/roles?notice=deleted');
  },
};
