import { UniqueConstraintViolationException } from '@mikro-orm/core';
import { error, fail, redirect } from '@sveltejs/kit';
import {
  EDITION_STATUSES,
  TRANSLATION_QUALITIES,
  TRANSLATION_TYPES,
} from '#lib/games/game-form.ts';
import { VIEW_ACTIVE_ONLY } from '#lib/server/config.ts';
import { Game, orm } from '#lib/server/db/index.ts';
import { canAddTranslation } from '#lib/server/game-access.ts';
import { isStaff } from '#lib/server/game-create.ts';
import {
  createTranslation,
  editionAutoCheckAvailable,
  NEW_EDITION,
  parseTranslationCreateForm,
} from '#lib/server/translation-create.ts';
import {
  editionStatusName,
  translationQualityName,
  translationTypeName,
} from '#lib/utils/entriesConvert.ts';
import type { Actions, PageServerLoad } from './$types';

//? Le jeu auquel ajouter une traduction, pour qui en a le droit.
const loadGame = async (locals: App.Locals, rawId: string) => {
  if (!locals.user) error(401, 'Non connecté');
  if (!canAddTranslation(locals.user)) error(403, 'Accès refusé');

  const game = await orm.em.findOne(
    Game,
    { id: parseInt(rawId, 10) },
    {
      populate: ['origin', 'gameEditions.gameTranslations'],
      orderBy: {
        gameEditions: { name: 'asc', gameTranslations: { version: 'asc' } },
      },
    },
  );
  if (!game) error(404, 'Not found');
  if (VIEW_ACTIVE_ONLY && !game.active) error(403, 'Forbidden');

  return { game, user: locals.user };
};

export const load: PageServerLoad = async ({ locals, params }) => {
  const { game, user } = await loadGame(locals, params.id);
  const editions = game.gameEditions.getItems();

  return {
    game: {
      id: game.id,
      name: game.name,
      origin: game.origin.name,
      threadId: game.threadId ?? null,
    },
    newEdition: NEW_EDITION,
    editions: editions.map((edition) => ({
      id: edition.id,
      name:
        !edition.name && editions.length === 1
          ? 'Édition de base'
          : (edition.name ?? `Non nommé (${edition.version})`),
      version: edition.version,
      status: editionStatusName(edition.status),
      //? Ce que l'édition a déjà : pour ne pas ajouter une traduction qui existe.
      translations: edition.gameTranslations
        .getItems()
        .filter(({ type }) => type !== 'no_translation')
        .map((translation) => ({
          id: translation.id,
          type: translationTypeName(translation.type),
          version: translation.version,
        })),
    })),
    statuses: EDITION_STATUSES.map((value) => ({
      value,
      label: editionStatusName(value),
    })),
    //? « Pas de traduction » ne s'ajoute pas : c'est l'état d'une édition qui n'en a pas.
    types: TRANSLATION_TYPES.filter((value) => value !== 'no_translation').map(
      (value) => ({ value, label: translationTypeName(value) }),
    ),
    qualities: TRANSLATION_QUALITIES.map((value) => ({
      value,
      label: translationQualityName(value),
    })),
    editionAutoCheck: editionAutoCheckAvailable(game, user),
    staff: isStaff(user),
    self: { id: user.id, name: user.name },
  };
};

export const actions: Actions = {
  create: async ({ locals, params, request }) => {
    const { game, user } = await loadGame(locals, params.id);

    const parsed = await parseTranslationCreateForm(
      await request.formData(),
      user,
      game,
    );
    if (!parsed.ok) return fail(400, { errors: parsed.errors });

    try {
      await createTranslation(game.id, parsed.input, user);
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

    redirect(303, `/games/${game.id}`);
  },
};
