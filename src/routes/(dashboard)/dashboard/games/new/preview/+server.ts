import { error, json } from '@sveltejs/kit';
import { GameTags, orm } from '$lib/server/db';
import { canCreateGame } from '$lib/server/game-access';
import { previewThread } from '$lib/server/scraper';
import type { RequestHandler } from './$types';

//? Aperçu F95zone pour pré-remplir l'étape « Infos jeu » de l'assistant : le serveur du scraper ne
//? touche rien à la base pour cette route (voir `GET /threads/:id` dans f95list-form-v5-scraper).
export const GET: RequestHandler = async ({ locals, url }) => {
  if (!locals.user) error(401, 'Non connecté');
  if (!canCreateGame(locals.user)) error(403, 'Accès refusé');

  const raw = url.searchParams.get('threadId') ?? '';
  const threadId = /^\d+$/.test(raw) ? Number(raw) : null;
  if (threadId === null) return json({ ok: false, reason: 'not_found' });

  const result = await previewThread(threadId);
  if (!result.ok) return json(result);

  //? Le scraper ne connaît pas nos tags : on mappe ses ids F95Checker vers nos tags locaux
  //? (`game_tags.f95_id`) ici, côté base.
  const { tagsF95, ...data } = result.data;
  const tagIds =
    tagsF95.length === 0
      ? []
      : (
          await orm.em.find(
            GameTags,
            { f95Id: { $in: tagsF95 } },
            { fields: ['id'] },
          )
        ).map((tag) => tag.id);

  return json({ ok: true, data: { ...data, tagIds } });
};
