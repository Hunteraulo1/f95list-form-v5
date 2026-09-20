import type { QueryResult } from '@mikro-orm/core';
import { type Handle, json } from '@sveltejs/kit';
import {
  effectiveDailyQuota,
  hashApiKey,
  nextResetUtc,
  todayUtc,
  usedToday,
} from '$lib/server/api-keys';
import { ApiKey, orm } from '$lib/server/db';

const BEARER_KEY = /^Bearer (f95_\S+)$/i;

//? Compte une requête pour la clé, sauf si son quota du jour est atteint. Une seule requête SQL
//? pour rester atomique : `usage_count` doit être assigné avant `usage_date` (MariaDB évalue
//? les affectations d'un UPDATE mono-table de gauche à droite).
const consumeQuota = async (id: string, quota: number) => {
  const today = todayUtc();

  const result = await orm.em.getConnection().execute<QueryResult>(
    `update api_key
       set usage_count = if(usage_date = ?, usage_count + 1, 1), usage_date = ?, last_used_at = ?
       where id = ? and if(usage_date = ?, usage_count, 0) < ?`,
    [today, today, new Date(), id, today, quota],
    'run',
  );

  return result.affectedRows > 0;
};

//? Seules les requêtes portant `Authorization: Bearer f95_…` sont concernées : les autres
//? (navigateur, futur jeton de session) passent sans changement.
export const handleApiKey: Handle = async ({ event, resolve }) => {
  const match = event.request.headers.get('authorization')?.match(BEARER_KEY);
  if (!match) return resolve(event);

  const key = await orm.em.findOne(
    ApiKey,
    { hash: hashApiKey(match[1]) },
    { populate: ['user.role'] },
  );
  if (!key) return json({ error: 'Clé API invalide' }, { status: 401 });

  const quota = effectiveDailyQuota(key);
  const used = usedToday(key);
  const reset = nextResetUtc();

  const headers: Record<string, string> = {
    'X-RateLimit-Limit': String(quota),
    'X-RateLimit-Reset': String(Math.floor(reset.getTime() / 1000)),
  };

  if (!(await consumeQuota(key.id, quota))) {
    return json(
      { error: 'Quota quotidien de la clé API atteint' },
      {
        status: 429,
        headers: {
          ...headers,
          'X-RateLimit-Remaining': '0',
          'Retry-After': String(
            Math.ceil((reset.getTime() - Date.now()) / 1000),
          ),
        },
      },
    );
  }

  event.locals.apiKey = { id: key.id, userId: key.user.id };

  const response = await resolve(event);

  for (const [name, value] of Object.entries(headers)) {
    response.headers.set(name, value);
  }
  response.headers.set('X-RateLimit-Remaining', String(quota - used - 1));

  return response;
};
