import { error, fail } from '@sveltejs/kit';
import {
  API_KEY_NAME_MAX_LENGTH,
  effectiveDailyQuota,
  generateApiKey,
  usedToday,
} from '$lib/server/api-keys';
import { ApiKey, orm, Role, User } from '$lib/server/db';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  if (!locals.user) error(401, 'Non connecté');

  const role = await orm.em.findOneOrFail(Role, locals.user.role.id);
  const keys = await orm.em.find(
    ApiKey,
    { user: locals.user.id },
    { populate: ['user.role'], orderBy: { createdAt: 'desc' } },
  );

  return {
    limit: role.apiKeyLimit,
    dailyQuota: role.apiDailyQuota,
    keys: keys.map((key) => ({
      id: key.id,
      name: key.name,
      prefix: key.prefix,
      used: usedToday(key),
      quota: effectiveDailyQuota(key),
      createdAt: key.createdAt.toISOString(),
      lastUsedAt: key.lastUsedAt?.toISOString() ?? null,
    })),
  };
};

export const actions: Actions = {
  create: async ({ locals, request }) => {
    if (!locals.user) error(401, 'Non connecté');

    const name = String((await request.formData()).get('name') ?? '').trim();

    if (!name) return fail(400, { error: 'Le nom est requis.', name });
    if (name.length > API_KEY_NAME_MAX_LENGTH) {
      return fail(400, {
        error: `Le nom ne peut pas dépasser ${API_KEY_NAME_MAX_LENGTH} caractères.`,
        name,
      });
    }

    const role = await orm.em.findOneOrFail(Role, locals.user.role.id);
    const count = await orm.em.count(ApiKey, { user: locals.user.id });
    if (count >= role.apiKeyLimit) {
      return fail(400, {
        error: `Vous ne pouvez pas avoir plus de ${role.apiKeyLimit} clé${role.apiKeyLimit > 1 ? 's' : ''}. Révoquez-en une avant d'en créer une nouvelle.`,
        name,
      });
    }

    const { key, prefix, hash } = generateApiKey();

    orm.em.create(ApiKey, {
      user: orm.em.getReference(User, locals.user.id),
      name,
      prefix,
      hash,
    });
    await orm.em.flush();

    //? La clé en clair n'est renvoyée qu'ici, une seule fois : seul son hash est stocké.
    return { created: { name, key } };
  },

  revoke: async ({ locals, request }) => {
    if (!locals.user) error(401, 'Non connecté');

    const id = String((await request.formData()).get('id') ?? '');

    //? Filtré par utilisateur : on ne peut révoquer que ses propres clés.
    const deleted = await orm.em.nativeDelete(ApiKey, {
      id,
      user: locals.user.id,
    });
    if (deleted === 0) return fail(404, { error: 'Clé introuvable.' });

    return { revoked: true };
  },
};
