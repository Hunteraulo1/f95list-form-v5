import { error, json } from '@sveltejs/kit';
import { canCreateGame } from '#lib/server/game-access.ts';
import { loadThreadPreview } from '#lib/server/thread-preview.ts';
import type { RequestHandler } from './$types';

//? Aperçu F95zone pour pré-remplir l'étape « Infos jeu » de l'assistant : le serveur du scraper ne
//? touche rien à la base pour cette route (voir `GET /threads/:id` dans f95list-form-v5-scraper).
export const GET: RequestHandler = async ({ locals, url }) => {
  if (!locals.user) error(401, 'Non connecté');
  if (!canCreateGame(locals.user)) error(403, 'Accès refusé');

  const raw = url.searchParams.get('threadId') ?? '';
  const threadId = /^\d+$/.test(raw) ? Number(raw) : null;
  if (threadId === null) return json({ ok: false, reason: 'not_found' });

  return json(await loadThreadPreview(threadId));
};
