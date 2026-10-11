import { error, fail } from '@sveltejs/kit';
import { threadBase } from '#lib/games/game-form.ts';
import { VIEW_ACTIVE_ONLY } from '#lib/server/config.ts';
import { Game, GameTags, OriginWebsite, orm } from '#lib/server/db/index.ts';
import {
  canAddTranslation,
  canEditGame,
  canEditTranslation,
  canManageAutoCheck,
} from '#lib/server/game-access.ts';
import { translateGameDescriptionInBackground } from '#lib/server/game-description-fr.ts';
import { parseGameEditForm, updateGame } from '#lib/server/game-edit.ts';
import {
  translationQualityName,
  translationTypeName,
} from '#lib/utils/entriesConvert.ts';
import type { Actions, PageServerLoad } from './$types';

//? Les crédités anonymes sont regroupés sous un seul « Anonyme » : ni nom, ni identifiant, ni nombre.
const publicTranslators = (
  items: {
    anonymous: boolean;
    user: { id: string; name: string; slug: string };
  }[],
) => {
  const named = items
    .filter(({ anonymous }) => !anonymous)
    .map(({ user }) => ({
      id: user.id as string | null,
      name: user.name,
      slug: user.slug as string | null,
    }));

  return items.some(({ anonymous }) => anonymous)
    ? [...named, { id: null, name: 'Anonyme', slug: null }]
    : named;
};

export const load: PageServerLoad = async ({ params, locals }) => {
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

  const editGame = canEditGame(locals.user);
  //? De quoi remplir la fenêtre « Modifier le jeu » : chargé seulement pour qui peut s'en servir.
  const [origins, allTags] = editGame
    ? await Promise.all([
        orm.em.find(OriginWebsite, {}, { orderBy: { name: 'asc' } }),
        orm.em.find(GameTags, {}, { orderBy: { name: 'asc' } }),
      ])
    : [[], []];

  return {
    //? Ce que la personne connectée peut faire ici : sert à masquer les boutons (les actions
    //? d'édition refuseront de toute façon, voir game-access.ts).
    access: {
      editGame,
      addTranslation: canAddTranslation(locals.user),
    },
    edit: editGame
      ? {
          values: {
            name: game.name,
            originId: game.origin.id,
            threadId: game.threadId ?? null,
            link: game.link,
            image: game.imageExternal ?? null,
            description: game.description ?? null,
            descriptionFr: game.descriptionFr ?? null,
            autoCheck: game.autoCheck,
            tagIds: game.gameGameTags
              .getItems()
              .map(({ gameTag }) => gameTag.id),
          },
          //? L'image affichée est celle hébergée chez nous : changer le lien ne la remplace pas.
          hasInternalImage: Boolean(game.imageInternal),
          origins: origins.map((origin) => ({
            id: origin.id,
            name: origin.name,
            //? Site à thread : le lien se déduit du numéro ; sinon il est saisi à la main.
            hasThread: threadBase(origin.name) !== null,
            //? L'auto-check n'existe que pour F95zone (comme en v4).
            autoCheck: origin.name === 'F95zone',
          })),
          tags: allTags.map((tag) => ({ id: tag.id, name: tag.name })),
          canManageAutoCheck: canManageAutoCheck(locals.user),
        }
      : null,
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
              canEdit: canEditTranslation(
                locals.user,
                translation.gameTranslationTranslators
                  .getItems()
                  .map(({ user, type }) => ({
                    userId: user.id,
                    type: type ?? null,
                  })),
              ),
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

export const actions: Actions = {
  edit: async ({ locals, params, request }) => {
    if (!locals.user) error(401, 'Non connecté');
    if (!canEditGame(locals.user)) error(403, 'Accès refusé');

    const game = await orm.em.findOne(Game, { id: parseInt(params.id, 10) });
    if (!game) error(404, 'Not found');

    const parsed = await parseGameEditForm(
      await request.formData(),
      locals.user,
      game,
    );
    if (!parsed.ok) return fail(400, { errors: parsed.errors });

    await updateGame(game.id, parsed.input, locals.user);

    //? Comme à la création : sans description française saisie à la main, elle est traduite en
    //? arrière-plan.
    if (!parsed.input.descriptionFr) {
      translateGameDescriptionInBackground(game.id, parsed.input.description);
    }

    return { edited: true };
  },
};
