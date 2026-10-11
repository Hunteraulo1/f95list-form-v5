import { UniqueConstraintViolationException } from '@mikro-orm/core';
import { error, fail } from '@sveltejs/kit';
import {
  TRANSLATION_QUALITIES,
  TRANSLATION_TYPES,
  threadBase,
  userRef,
} from '#lib/games/game-form.ts';
import { VIEW_ACTIVE_ONLY } from '#lib/server/config.ts';
import {
  Game,
  GameTags,
  GameTranslation,
  OriginWebsite,
  orm,
} from '#lib/server/db/index.ts';
import {
  canAddTranslation,
  canEditGame,
  canEditTranslation,
  canManageAutoCheck,
} from '#lib/server/game-access.ts';
import { isStaff } from '#lib/server/game-create.ts';
import { translateGameDescriptionInBackground } from '#lib/server/game-description-fr.ts';
import { parseGameEditForm, updateGame } from '#lib/server/game-edit.ts';
import {
  isHiddenCredit,
  parseTranslationEditForm,
  updateTranslation,
} from '#lib/server/translation-edit.ts';
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

const owners = (translation: GameTranslation) =>
  translation.gameTranslationTranslators.getItems().map(({ user, type }) => ({
    userId: user.id,
    type: type ?? null,
  }));

type Credit = GameTranslation['gameTranslationTranslators'][number];

//? De quoi remplir la fenêtre « Modifier la traduction ». Les crédits anonymes des autres n'y sont
//? pas nommés (seulement comptés) ; soi-même est traité à part, comme à la création.
const translationEditValues = (
  translation: GameTranslation,
  viewerId: string,
) => {
  const credits = translation.gameTranslationTranslators.getItems();
  const visible = credits.filter((credit) => !isHiddenCredit(credit, viewerId));
  const picked = (keep: (credit: Credit) => boolean) =>
    visible
      .filter((credit) => keep(credit) && credit.user.id !== viewerId)
      .map(({ user }) => ({ ref: userRef(user.id), label: user.name }));
  const isProofreader = ({ type }: Credit) => type === 'proofreader';
  const self = credits.find(({ user }) => user.id === viewerId);

  return {
    type: translation.type,
    quality: translation.quality,
    version: translation.version,
    link:
      translation.gameTranslationFiles.getItems().find(({ active }) => active)
        ?.externalLink ?? null,
    translators: picked((credit) => !isProofreader(credit)),
    proofreaders: picked(isProofreader),
    selfRole: self
      ? isProofreader(self)
        ? ('proofreader' as const)
        : ('translator' as const)
      : null,
    hiddenCredits: credits.length - visible.length,
  };
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

  const viewer = locals.user;

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
    //? Pour la fenêtre « Modifier la traduction » (voir `edit` sur chaque traduction modifiable).
    translationForm: viewer
      ? {
          types: TRANSLATION_TYPES.map((value) => ({
            value,
            label: translationTypeName(value),
          })),
          qualities: TRANSLATION_QUALITIES.map((value) => ({
            value,
            label: translationQualityName(value),
          })),
          staff: isStaff(viewer),
          self: { id: viewer.id, name: viewer.name },
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
              //? Valeurs à modifier, pour qui en a le droit seulement (sinon `null`).
              edit:
                viewer && canEditTranslation(viewer, owners(translation))
                  ? translationEditValues(translation, viewer.id)
                  : null,
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

  editTranslation: async ({ locals, params, request }) => {
    if (!locals.user) error(401, 'Non connecté');

    const data = await request.formData();
    //? La traduction doit être celle d'une édition de ce jeu.
    const translation = await orm.em.findOne(
      GameTranslation,
      {
        id: String(data.get('translationId') ?? ''),
        gameEdition: { game: parseInt(params.id, 10) },
      },
      { populate: ['gameTranslationTranslators'] },
    );
    if (!translation) error(404, 'Not found');
    if (!canEditTranslation(locals.user, owners(translation))) {
      error(403, 'Accès refusé');
    }

    const parsed = await parseTranslationEditForm(
      data,
      locals.user,
      translation,
    );
    if (!parsed.ok) return fail(400, { errors: parsed.errors });

    try {
      await updateTranslation(translation.id, parsed.input, locals.user);
    } catch (cause) {
      //? Course : un compte fantôme du même nom vient d'être créé par quelqu'un d'autre.
      if (cause instanceof UniqueConstraintViolationException) {
        return fail(409, {
          errors: {
            form: "Un élément vient d'être créé en même temps par quelqu'un d'autre : réessayez.",
          },
        });
      }

      throw cause;
    }

    return { edited: true };
  },
};
