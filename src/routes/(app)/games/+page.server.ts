import type {
  GamesFilterableGame,
  GamesFilterOptions,
} from '$lib/games/games-filter';
import { VIEW_ACTIVE_ONLY } from '$lib/server/config';
import { Game, GameTags, OriginWebsite, orm, Translator } from '$lib/server/db';

export const load = async () => {
  const [games, origins, translators, tags] = await Promise.all([
    orm.em.find(Game, VIEW_ACTIVE_ONLY ? { active: true } : {}, {
      populate: [
        'gameEditions.gameTranslations.gameTranslationTranslators.translator',
        'gameGameTags.gameTag',
      ],
      orderBy: { name: 'asc' },
    }),
    orm.em.find(OriginWebsite, {}, { orderBy: { name: 'asc' } }),
    orm.em.find(Translator, VIEW_ACTIVE_ONLY ? { active: true } : {}, {
      orderBy: { name: 'asc' },
    }),
    orm.em.find(GameTags, {}, { orderBy: { name: 'asc' } }),
  ]);

  const gameRows = games.map((game) => {
    const editions = game.gameEditions
      .getItems()
      .filter((edition) => !VIEW_ACTIVE_ONLY || edition.active);
    const translations = editions.flatMap((edition) =>
      edition.gameTranslations
        .getItems()
        .filter((translation) => !VIEW_ACTIVE_ONLY || translation.active),
    );
    const translatorIds = translations.flatMap((translation) =>
      translation.gameTranslationTranslators
        .getItems()
        .filter(({ translator }) => !VIEW_ACTIVE_ONLY || translator.active)
        .map(({ translator }) => translator.id),
    );

    const row: GamesFilterableGame & { id: number; image: string | null } = {
      id: game.id,
      name: game.name,
      threadId: game.threadId ?? null,
      image: game.imageInternal ?? game.imageExternal ?? null,
      originId: game.origin.id,
      statuses: [...new Set(editions.map((edition) => edition.status))],
      qualities: [
        ...new Set(translations.map((translation) => translation.quality)),
      ],
      types: [
        ...new Set(
          translations.flatMap((translation) =>
            translation.type ? [translation.type] : [],
          ),
        ),
      ],
      translatorIds: [...new Set(translatorIds)],
      tagIds: game.gameGameTags.getItems().map(({ gameTag }) => gameTag.id),
    };
    return row;
  });

  const filterOptions: GamesFilterOptions = {
    origins: origins.map((origin) => ({ id: origin.id, name: origin.name })),
    translators: translators.map((translator) => ({
      id: translator.id,
      name: translator.name,
    })),
    tags: tags.map((tag) => ({ id: tag.id, name: tag.name })),
  };

  return { games: gameRows, filterOptions };
};
