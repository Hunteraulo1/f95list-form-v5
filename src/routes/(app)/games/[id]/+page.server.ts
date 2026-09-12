import { error } from '@sveltejs/kit';
import { Game, orm } from '$lib/server/db';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
  const id = parseInt(params.id, 10);

  const game = await orm.em.findOne(
    Game,
    { id },
    {
      populate: [
        'gameEditions.gameTranslations.gameTranslationTranslators.translator',
      ],
      orderBy: {
        gameEditions: { name: 'asc', gameTranslations: { version: 'asc' } },
      },
    },
  );

  if (!game) error(404, 'Not found');

  return {
    game: {
      id: game.id,
      name: game.name,
      link: game.link,
      threadId: game.threadId,
      imageInternal: game.imageInternal,
      imageExternal: game.imageExternal,
      description: game.description,
      descriptionFr: game.descriptionFr,
      autoCheck: game.autoCheck,
      active: game.active,
      createdAt: game.createdAt,
      updatedAt: game.updatedAt,
      gameEditions: game.gameEditions.getItems().map((edition) => ({
        id: edition.id,
        name: edition.name,
        version: edition.version,
        status: edition.status,
        autoCheck: edition.autoCheck,
        lastAutoCheck: edition.lastAutoCheck,
        active: edition.active,
        createdAt: edition.createdAt,
        updatedAt: edition.updatedAt,
        gameTranslations: edition.gameTranslations
          .getItems()
          .map((translation) => ({
            id: translation.id,
            version: translation.version,
            quality: translation.quality,
            type: translation.type,
            active: translation.active,
            createdAt: translation.createdAt,
            updatedAt: translation.updatedAt,
            translators: translation.gameTranslationTranslators
              .getItems()
              .map(({ translator }) => ({
                id: translator.id,
                name: translator.name,
                discordId: translator.discordId,
                active: translator.active,
                createdAt: translator.createdAt,
                updatedAt: translator.updatedAt,
              })),
          })),
      })),
    },
  };
};
