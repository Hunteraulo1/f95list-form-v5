import { error } from '@sveltejs/kit';
import { VIEW_ACTIVE_ONLY } from '$lib/server/config';
import { Game, orm } from '$lib/server/db';
import {
  translationQualityName,
  translationTypeName,
} from '$lib/utils/entriesConvert';
import type { PageServerLoad } from './$types';

//? Les crédités anonymes sont regroupés sous un seul « Anonyme » : ni nom, ni identifiant, ni nombre.
const publicTranslators = (
  items: { anonymous: boolean; user: { id: string; name: string } }[],
) => {
  const named = items
    .filter(({ anonymous }) => !anonymous)
    .map(({ user }) => ({ id: user.id as string | null, name: user.name }));

  return items.some(({ anonymous }) => anonymous)
    ? [...named, { id: null, name: 'Anonyme' }]
    : named;
};

export const load: PageServerLoad = async ({ params }) => {
  const id = parseInt(params.id, 10);

  const game = await orm.em.findOne(
    Game,
    { id },
    {
      populate: [
        'gameEditions.gameTranslations.gameTranslationTranslators.user',
        'gameEditions.gameTranslations.gameTranslationFiles',
        'gameGameTags.gameTag',
      ],
      orderBy: {
        gameEditions: { name: 'asc', gameTranslations: { version: 'asc' } },
        gameGameTags: { updatedAt: 'desc' },
      },
    },
  );

  if (!game) error(404, 'Not found');
  if (VIEW_ACTIVE_ONLY && !game.active) error(403, 'Forbidden');

  return {
    game: {
      id: game.id,
      name: game.name,
      link: game.link,
      threadId: game.threadId,
      image: game.imageInternal ?? game.imageExternal,
      description: game.descriptionFr ?? game.description,
      // autoCheck: game.autoCheck,
      active: game.active,
      // createdAt: game.createdAt,
      // updatedAt: game.updatedAt,
      tags: game.gameGameTags
        .getItems()
        .map(({ gameTag }) => ({ id: gameTag.id, name: gameTag.name })),
      gameEditions: game.gameEditions
        .getItems()
        .filter((edition) => !VIEW_ACTIVE_ONLY || edition.active)
        .map((edition) => ({
          id: edition.id,
          name:
            !edition.name && game.gameEditions.length === 1
              ? 'Édition de base'
              : (edition.name ?? `Non nommé (${edition.version})`),
          version: edition.version,
          status: edition.status,
          // autoCheck: edition.autoCheck,
          // lastAutoCheck: edition.lastAutoCheck,
          active: edition.active,
          // createdAt: edition.createdAt,
          // updatedAt: edition.updatedAt,
          gameTranslations: edition.gameTranslations
            .getItems()
            .filter((translation) => !VIEW_ACTIVE_ONLY || translation.active)
            .map((translation) => ({
              id: translation.id,
              version: translation.version,
              quality: translation.quality,
              qualityLabel: translationQualityName(translation.quality),
              type: translation.type,
              typeLabel: translationTypeName(translation.type),
              active: translation.active,
              // createdAt: translation.createdAt,
              // updatedAt: translation.updatedAt,
              translators: publicTranslators(
                translation.gameTranslationTranslators.getItems(),
              ),
              file:
                translation.gameTranslationFiles
                  .getItems()
                  .filter((file) => file.active)
                  .map((file) => ({
                    id: file.id,
                    internalLink: file.internalLink,
                    externalLink: file.externalLink,
                  }))[0] ?? null,
            })),
        })),
    },
  };
};
