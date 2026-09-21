import { error, json } from '@sveltejs/kit';
import { orm, User } from '$lib/server/db';
import { canCreateGame } from '$lib/server/game-access';
import type { RequestHandler } from './$types';

const SEARCH_MAX_LENGTH = 64;
const LIMIT = 8;

const escapeLike = (value: string) => value.replace(/[\\%_]/g, '\\$&');

//? Recherche de comptes pour désigner un traducteur ou un relecteur (formulaire d'ajout de jeu).
//? Ne renvoie que ce qu'un profil public montre : jamais d'e-mail.
export const GET: RequestHandler = async ({ locals, url }) => {
  if (!locals.user) error(401, 'Non connecté');
  if (!canCreateGame(locals.user)) error(403, 'Accès refusé');

  const term = (url.searchParams.get('q') ?? '')
    .trim()
    .slice(0, SEARCH_MAX_LENGTH);
  if (!term) return json({ users: [] });

  const like = `%${escapeLike(term)}%`;
  const users = await orm.em.find(
    User,
    { $or: [{ name: { $like: like } }, { slug: { $like: like } }] },
    { orderBy: { name: 'asc' }, limit: LIMIT },
  );

  return json({
    users: users.map((user) => ({
      id: user.id,
      name: user.name,
      slug: user.slug,
      ghost: user.zitadelId === null,
    })),
  });
};
