import type {
  GamesFilterableGame,
  GamesFilterOptions,
} from '$lib/games/games-filter';
import { VIEW_ACTIVE_ONLY } from '$lib/server/config';
import { Game, GameTags, OriginWebsite, orm } from '$lib/server/db';

export const load = async () => {
  const [games, origins, tags] = await Promise.all([
    orm.em.find(Game, VIEW_ACTIVE_ONLY ? { active: true } : {}, {
      populate: [
        'gameEditions.gameTranslations.gameTranslationTranslators.user',
      ],
      orderBy: { name: 'asc' },
    }),
    orm.em.find(OriginWebsite, {}, { orderBy: { name: 'asc' } }),
    orm.em.find(GameTags, {}, { orderBy: { name: 'asc' } }),
  ]);

  //? Les traducteurs proposés au filtre : ceux qui figurent sur au moins une traduction affichée.
  const translators = new Map<string, string>();

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
        //? Les anonymes ne sont ni listés ni filtrables : ce serait les identifier.
        .filter(({ anonymous }) => !anonymous)
        .map(({ user }) => {
          translators.set(user.id, user.name);
          return user.id;
        }),
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
      //? Recherche sur la version filtrée des tags (ids F95Checker) ; les tags réels sont sur la page du jeu.
      tagIds: game.tagsF95 ?? [],
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

  return { games: gameRows, filterOptions };
};
