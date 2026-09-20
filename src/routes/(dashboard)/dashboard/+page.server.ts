import { Game, orm } from '$lib/server/db';
import { countOutdatedTranslations } from '$lib/server/my-translations';

export type TranslationStatus = 'up_to_date' | 'outdated' | 'none';

export const load = async ({ locals }: { locals: App.Locals }) => {
  const games = await orm.em.find(
    Game,
    {},
    {
      populate: ['gameEditions.gameTranslations'],
      orderBy: { name: 'asc' },
    },
  );

  const rows = games.map((game) => {
    const translations = game.gameEditions.getItems().flatMap((edition) =>
      edition.gameTranslations
        .getItems()
        .filter((translation) => translation.type !== 'no_translation')
        .map((translation) => ({
          version: translation.version,
          editionVersion: edition.version,
        })),
    );

    //? "à jour" = la version traduite correspond à la version de l'édition, comme
    //? sur /dashboard/translates (version vs tversion).
    const translationStatus: TranslationStatus =
      translations.length === 0
        ? 'none'
        : translations.some((t) => t.version === t.editionVersion)
          ? 'up_to_date'
          : 'outdated';

    return {
      id: game.id,
      name: game.name,
      threadId: game.threadId ?? null,
      image: game.imageInternal ?? game.imageExternal ?? null,
      translationStatus,
    };
  });

  return {
    games: rows,
    //? Mes traductions dont la version n'est plus à jour (mêmes règles que /dashboard/translates).
    outdated: locals.user ? await countOutdatedTranslations(locals.user.id) : 0,
  };
};
