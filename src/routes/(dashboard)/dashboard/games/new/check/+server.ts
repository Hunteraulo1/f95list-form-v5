import { error, json } from '@sveltejs/kit';
import { threadBase, threadLink } from '$lib/games/game-form';
import { Game, OriginWebsite, orm } from '$lib/server/db';
import { canCreateGame } from '$lib/server/game-access';
import { translationTypeName } from '$lib/utils/entriesConvert';
import type { RequestHandler } from './$types';

//? Le thread est-il déjà dans la base ? Sert à l'étape « Thread » de l'assistant : signale le conflit
//? avant d'aller plus loin, avec les traductions déjà enregistrées (le serveur revérifie à la création).
export const GET: RequestHandler = async ({ locals, url }) => {
  if (!locals.user) error(401, 'Non connecté');
  if (!canCreateGame(locals.user)) error(403, 'Accès refusé');

  const origin = await orm.em.findOne(OriginWebsite, {
    id: url.searchParams.get('originId') ?? '',
  });
  const raw = url.searchParams.get('threadId') ?? '';
  const threadId = /^\d+$/.test(raw) ? Number(raw) : null;

  if (!origin || threadId === null || !threadBase(origin.name)) {
    return json({ exists: false });
  }

  const link = threadLink(origin.name, threadId);
  const game = await orm.em.findOne(
    Game,
    { $or: [{ origin: origin.id, threadId }, ...(link ? [{ link }] : [])] },
    { populate: ['gameEditions.gameTranslations'] },
  );
  if (!game) return json({ exists: false });

  return json({
    exists: true,
    game: {
      id: game.id,
      name: game.name,
      translations: game.gameEditions.getItems().flatMap((edition) =>
        edition.gameTranslations.getItems().map((translation) => ({
          id: translation.id,
          edition: edition.name,
          type: translationTypeName(translation.type),
          version: translation.version,
        })),
      ),
    },
  });
};
