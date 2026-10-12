import { UniqueConstraintViolationException } from '@mikro-orm/core';
import { error, fail } from '@sveltejs/kit';
import {
  EDITION_STATUSES,
  TRANSLATION_QUALITIES,
  TRANSLATION_TYPES,
  threadBase,
  userRef,
} from '#lib/games/game-form.ts';
import { VIEW_ACTIVE_ONLY } from '#lib/server/config.ts';
import {
  Game,
  GameEdition,
  GameTags,
  GameTranslation,
  OriginWebsite,
  orm,
} from '#lib/server/db/index.ts';
import {
  parseEditionEditForm,
  updateEdition,
} from '#lib/server/edition-edit.ts';
import {
  canAddTranslation,
  canEditGame,
  canEditTranslation,
  canManageAutoCheck,
  canSetActive,
} from '#lib/server/game-access.ts';
import { isStaff } from '#lib/server/game-create.ts';
import { translateGameDescriptionInBackground } from '#lib/server/game-description-fr.ts';
import { parseGameEditForm, updateGame } from '#lib/server/game-edit.ts';
import { canRefreshGame, refreshGameData } from '#lib/server/game-refresh.ts';
import { logger } from '#lib/server/logger.ts';
import { editionAutoCheckAvailable } from '#lib/server/translation-create.ts';
import {
  isHiddenCredit,
  parseTranslationEditForm,
  updateTranslation,
} from '#lib/server/translation-edit.ts';
import {
  editionStatusName,
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

//? `updated_at` est gardé tel quel : il date la dernière mise à jour du contenu (page « Mises à jour »,
//? accueil), et réactiver une traduction ne doit pas la faire remonter en tête.
const writeActive = (
  table: 'game' | 'game_edition' | 'game_translation',
  id: string | number,
  active: boolean,
) =>
  orm.em
    .getConnection()
    .execute(
      `update ${table} set active = ?, updated_at = updated_at where id = ?`,
      [active, id],
    );

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
        'origin',
      ],
      orderBy: {
        gameEditions: { name: 'asc', gameTranslations: { version: 'asc' } },
        gameGameTags: { updatedAt: 'desc' },
      },
    },
  );

  if (!game) error(404, 'Not found');
  const editGame = canEditGame(locals.user);
  //? Un contenu désactivé n'est plus visible que de ceux qui peuvent le réactiver.
  const setActive = canSetActive(locals.user);
  if (VIEW_ACTIVE_ONLY && !game.active && !setActive) error(403, 'Forbidden');
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
      //? Actualiser depuis F95zone : même droit que modifier le jeu, pour un jeu qui a un thread F95zone.
      refreshGame: editGame && canRefreshGame(game),
      addTranslation: canAddTranslation(locals.user),
      setActive,
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
    //? Pour la fenêtre « Modifier l'édition » (voir `edit` sur chaque édition).
    editionForm:
      editGame && viewer
        ? {
            statuses: EDITION_STATUSES.map((value) => ({
              value,
              label: editionStatusName(value),
            })),
            canManageAutoCheck: editionAutoCheckAvailable(game, viewer),
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
        .filter((edition) => !VIEW_ACTIVE_ONLY || edition.active || setActive)
        .map((edition) => ({
          id: edition.id,
          name:
            !edition.name && game.gameEditions.length === 1
              ? 'Édition de base'
              : (edition.name ?? `Non nommé (${edition.version})`),
          version: edition.version,
          status: edition.status,
          //? Valeurs à modifier, pour qui peut modifier le jeu seulement (sinon `null`).
          edit: editGame
            ? {
                name: edition.name ?? null,
                version: edition.version,
                status: edition.status,
                autoCheck: edition.autoCheck,
              }
            : null,
          // autoCheck: edition.autoCheck,
          // lastAutoCheck: edition.lastAutoCheck,
          active: edition.active,
          // createdAt: edition.createdAt,
          // updatedAt: edition.updatedAt,
          gameTranslations: edition.gameTranslations
            .getItems()
            .filter(
              (translation) =>
                !VIEW_ACTIVE_ONLY || translation.active || setActive,
            )
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
  //? Active ou désactive le jeu, une de ses éditions ou une de ses traductions. Désactiver masque
  //? du site sans rien supprimer ; ce qui dépend d'un contenu désactivé est masqué avec lui.
  setActive: async ({ locals, params, request }) => {
    if (!locals.user) error(401, 'Non connecté');
    if (!canSetActive(locals.user)) error(403, 'Accès refusé');

    const data = await request.formData();
    const kind = String(data.get('kind') ?? '');
    const id = String(data.get('id') ?? '');
    const active = data.get('active') === 'true';
    const gameId = parseInt(params.id, 10);

    if (kind === 'translation') {
      //? La traduction doit être celle d'une édition de ce jeu.
      const translation = await orm.em.findOne(GameTranslation, {
        id,
        gameEdition: { game: gameId },
      });
      if (!translation) error(404, 'Not found');

      await writeActive('game_translation', translation.id, active);
    } else if (kind === 'edition') {
      const edition = await orm.em.findOne(GameEdition, { id, game: gameId });
      if (!edition) error(404, 'Not found');

      await writeActive('game_edition', edition.id, active);
    } else if (kind === 'game') {
      const game = await orm.em.findOne(Game, { id: gameId });
      if (!game) error(404, 'Not found');

      await writeActive('game', game.id, active);
    } else {
      error(400, 'Bad request');
    }

    logger.info(
      { gameId, kind, id, active, userId: locals.user.id },
      active ? 'contenu activé' : 'contenu désactivé',
    );

    return { activeChanged: true };
  },

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

  refresh: async ({ locals, params }) => {
    if (!locals.user) error(401, 'Non connecté');
    if (!canEditGame(locals.user)) error(403, 'Accès refusé');

    const game = await orm.em.findOne(
      Game,
      { id: parseInt(params.id, 10) },
      { populate: ['origin'] },
    );
    if (!game) error(404, 'Not found');
    if (!canRefreshGame(game)) {
      return fail(400, {
        refreshError: 'Seul un jeu F95zone avec un thread peut être actualisé.',
      });
    }

    const result = await refreshGameData(game.id, locals.user);
    if (!result.ok) {
      return fail(result.reason === 'not_found' ? 404 : 502, {
        refreshError:
          result.reason === 'not_found'
            ? "Le thread n'existe plus chez F95zone (supprimé, privé ou déplacé) : rien n'a été modifié."
            : result.reason === 'not_configured'
              ? "Le service d'actualisation n'est pas configuré sur ce serveur."
              : "Le service d'actualisation est indisponible pour le moment : réessayez plus tard.",
      });
    }

    return {
      refreshed: {
        editions: result.editions,
        tagsAdded: result.tagsAdded,
        tagsRemoved: result.tagsRemoved,
      },
    };
  },

  editEdition: async ({ locals, params, request }) => {
    if (!locals.user) error(401, 'Non connecté');
    if (!canEditGame(locals.user)) error(403, 'Accès refusé');

    const data = await request.formData();
    const game = await orm.em.findOne(
      Game,
      { id: parseInt(params.id, 10) },
      { populate: ['origin', 'gameEditions'] },
    );
    //? L'édition doit être celle de ce jeu.
    const edition = game?.gameEditions
      .getItems()
      .find(({ id }) => id === String(data.get('editionId') ?? ''));
    if (!game || !edition) error(404, 'Not found');

    const parsed = parseEditionEditForm(data, locals.user, game, edition);
    if (!parsed.ok) return fail(400, { errors: parsed.errors });

    await updateEdition(edition.id, parsed.input, locals.user);

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
