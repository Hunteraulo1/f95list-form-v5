import { fail } from '@sveltejs/kit';
import {
  effectiveDailyQuota,
  MAX_API_DAILY_QUOTA,
  parseQuota,
  usedToday,
} from '$lib/server/api-keys';
import { ApiKey, orm } from '$lib/server/db';
import { requirePermission } from '$lib/server/permissions';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  requirePermission(locals, 'manage.api');

  const keys = await orm.em.find(
    ApiKey,
    {},
    { populate: ['user.role'], orderBy: { createdAt: 'desc' } },
  );

  return {
    maxDailyQuota: MAX_API_DAILY_QUOTA,
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
    requirePermission(locals, 'manage.api');

    const id = String((await request.formData()).get('id') ?? '');

    const deleted = await orm.em.nativeDelete(ApiKey, { id });
    if (deleted === 0) return fail(404, { error: 'Clé introuvable.' });

    return { revoked: true };
  },

  //? Champ vide = retour au quota du rôle.
  setKeyQuota: async ({ locals, request }) => {
    requirePermission(locals, 'manage.api');

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
};
