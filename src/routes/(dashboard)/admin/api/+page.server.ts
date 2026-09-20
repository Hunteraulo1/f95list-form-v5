import { error, fail } from '@sveltejs/kit';
import {
  effectiveDailyQuota,
  MAX_API_DAILY_QUOTA,
  MAX_API_KEY_LIMIT,
  parseQuota,
  usedToday,
} from '$lib/server/api-keys';
import { ApiKey, orm, Role } from '$lib/server/db';
import type { Actions, PageServerLoad } from './$types';

//? Temporaire : en attendant le système de droits, seul le rôle « admin » gère les clés des autres.
const requireAdmin = (locals: App.Locals) => {
  if (!locals.user) error(401, 'Non connecté');
  if (locals.user.role.name !== 'admin') error(403, 'Accès refusé');
};

export const load: PageServerLoad = async ({ locals }) => {
  requireAdmin(locals);

  const [keys, roles] = await Promise.all([
    orm.em.find(
      ApiKey,
      {},
      { populate: ['user.role'], orderBy: { createdAt: 'desc' } },
    ),
    orm.em.find(Role, {}, { orderBy: { label: 'asc' } }),
  ]);

  return {
    maxKeyLimit: MAX_API_KEY_LIMIT,
    maxDailyQuota: MAX_API_DAILY_QUOTA,
    roles: roles.map((role) => ({
      id: role.id,
      label: role.label,
      apiKeyLimit: role.apiKeyLimit,
      apiDailyQuota: role.apiDailyQuota,
    })),
    keys: keys.map((key) => ({
      id: key.id,
      name: key.name,
      prefix: key.prefix,
      owner: { id: key.user.id, name: key.user.name },
      used: usedToday(key),
      quota: effectiveDailyQuota(key),
      customQuota: key.dailyQuota ?? null,
      createdAt: key.createdAt.toISOString(),
      lastUsedAt: key.lastUsedAt?.toISOString() ?? null,
    })),
  };
};

export const actions: Actions = {
  revoke: async ({ locals, request }) => {
    requireAdmin(locals);

    const id = String((await request.formData()).get('id') ?? '');

    const deleted = await orm.em.nativeDelete(ApiKey, { id });
    if (deleted === 0) return fail(404, { error: 'Clé introuvable.' });

    return { revoked: true };
  },

  //? Champ vide = retour au quota du rôle.
  setKeyQuota: async ({ locals, request }) => {
    requireAdmin(locals);

    const data = await request.formData();
    const id = String(data.get('id') ?? '');
    const quota = parseQuota(data.get('quota'), MAX_API_DAILY_QUOTA);

    if (quota === undefined) {
      return fail(400, {
        error: `Le quota doit être un entier entre 0 et ${MAX_API_DAILY_QUOTA}.`,
      });
    }

    const updated = await orm.em.nativeUpdate(
      ApiKey,
      { id },
      { dailyQuota: quota },
    );
    if (updated === 0) return fail(404, { error: 'Clé introuvable.' });

    return { saved: true };
  },

  setRoleQuota: async ({ locals, request }) => {
    requireAdmin(locals);

    const data = await request.formData();
    const id = String(data.get('id') ?? '');
    const apiKeyLimit = parseQuota(data.get('apiKeyLimit'), MAX_API_KEY_LIMIT);
    const apiDailyQuota = parseQuota(
      data.get('apiDailyQuota'),
      MAX_API_DAILY_QUOTA,
    );

    if (apiKeyLimit == null) {
      return fail(400, {
        error: `Le nombre de clés doit être un entier entre 0 et ${MAX_API_KEY_LIMIT}.`,
      });
    }
    if (apiDailyQuota == null) {
      return fail(400, {
        error: `Le quota quotidien doit être un entier entre 0 et ${MAX_API_DAILY_QUOTA}.`,
      });
    }

    const updated = await orm.em.nativeUpdate(
      Role,
      { id },
      { apiKeyLimit, apiDailyQuota },
    );
    if (updated === 0) return fail(404, { error: 'Rôle introuvable.' });

    return { saved: true };
  },
};
