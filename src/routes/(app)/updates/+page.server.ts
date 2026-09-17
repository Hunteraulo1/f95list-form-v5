import type {
  GamesFilterableGame,
  GamesFilterOptions,
} from '$lib/games/games-filter';
import { UNKNOWN_HISTORY_DATE, VIEW_ACTIVE_ONLY } from '$lib/server/config';
import {
  GameTags,
  GameTranslation,
  OriginWebsite,
  orm,
  Translator,
} from '$lib/server/db';

export const load = async () => {
  const [translations, origins, translators, tags] = await Promise.all([
    orm.em.find(
      GameTranslation,
      VIEW_ACTIVE_ONLY
        ? {
            active: true,
            gameEdition: { active: true, game: { active: true } },
          }
        : {},
      {
        populate: [
          'gameEdition.game.gameGameTags.gameTag',
          'gameTranslationTranslators.translator',
        ],
        orderBy: { updatedAt: 'desc' },
      },
    ),
    orm.em.find(OriginWebsite, {}, { orderBy: { name: 'asc' } }),
    orm.em.find(Translator, VIEW_ACTIVE_ONLY ? { active: true } : {}, {
      orderBy: { name: 'asc' },
    }),
    orm.em.find(GameTags, {}, { orderBy: { name: 'asc' } }),
  ]);

  const games = translations.map((translation) => {
    const edition = translation.gameEdition;
    const game = edition.game;
    const translatorIds = translation.gameTranslationTranslators
      .getItems()
      .filter(({ translator }) => !VIEW_ACTIVE_ONLY || translator.active)
      .map(({ translator }) => translator.id);

    const row: GamesFilterableGame & {
      id: string;
      gameId: number;
      image: string | null;
      date: Date;
      updateType: 'ajout' | 'mise à jour';
    } = {
      id: translation.id,
      gameId: game.id,
      name: edition.name ? `${game.name} - ${edition.name}` : game.name,
      threadId: game.threadId ?? null,
      image: game.imageInternal ?? game.imageExternal ?? null,
      date: translation.updatedAt,
      originId: game.origin.id,
      statuses: [edition.status],
      qualities: [translation.quality],
      types: translation.type ? [translation.type] : [],
      translatorIds: [...new Set(translatorIds)],
      tagIds: game.gameGameTags.getItems().map(({ gameTag }) => gameTag.id),
      //? égalité de valeur (pas de référence, ce sont deux instances Date distinctes) ;
      //? on exclut le repli UNKNOWN_HISTORY_DATE, dont on ne sait rien de réel.
      updateType:
        translation.updatedAt.getTime() === translation.createdAt.getTime() &&
        translation.createdAt.getTime() !== UNKNOWN_HISTORY_DATE.getTime()
          ? 'ajout'
          : 'mise à jour',
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

  return { games, filterOptions };
};
