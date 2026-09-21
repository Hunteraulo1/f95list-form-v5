import type {
  GamesFilterableGame,
  GamesFilterOptions,
} from '$lib/games/games-filter';
import { UNKNOWN_HISTORY_DATE, VIEW_ACTIVE_ONLY } from '$lib/server/config';
import { GameTags, GameTranslation, OriginWebsite, orm } from '$lib/server/db';

export const load = async () => {
  const [translations, origins, tags] = await Promise.all([
    orm.em.find(
      GameTranslation,
      VIEW_ACTIVE_ONLY
        ? {
            active: true,
            gameEdition: { active: true, game: { active: true } },
          }
        : {},
      {
        populate: ['gameEdition.game', 'gameTranslationTranslators.user'],
        orderBy: { updatedAt: 'desc' },
      },
    ),
    orm.em.find(OriginWebsite, {}, { orderBy: { name: 'asc' } }),
    orm.em.find(GameTags, {}, { orderBy: { name: 'asc' } }),
  ]);

  //? Les traducteurs proposés au filtre : ceux qui figurent sur au moins une mise à jour affichée.
  const translators = new Map<string, string>();

  const games = translations.map((translation) => {
    const edition = translation.gameEdition;
    const game = edition.game;
    const translatorIds = translation.gameTranslationTranslators
      .getItems()
      //? Les anonymes ne sont ni listés ni filtrables : ce serait les identifier.
      .filter(({ anonymous }) => !anonymous)
      .map(({ user }) => {
        translators.set(user.id, user.name);
        return user.id;
      });

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
      //? Recherche sur la version filtrée des tags (ids F95Checker) ; les tags réels sont sur la page du jeu.
      tagIds: game.tagsF95 ?? [],
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
    translators: [...translators]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name, 'fr')),
    tags: tags.flatMap((tag) =>
      tag.f95Id ? [{ id: tag.f95Id, name: tag.name }] : [],
    ),
  };

  return { games, filterOptions };
};
