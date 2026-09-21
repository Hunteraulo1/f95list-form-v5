import { UniqueConstraintViolationException } from '@mikro-orm/core';
import { error, fail, redirect } from '@sveltejs/kit';
import {
  EDITION_STATUSES,
  TRANSLATION_QUALITIES,
  TRANSLATION_TYPES,
  threadBase,
} from '$lib/games/game-form';
import { GameTags, OriginWebsite, orm } from '$lib/server/db';
import {
  canAddTranslation,
  canCreateGame,
  canManageAutoCheck,
} from '$lib/server/game-access';
import { createGame, isStaff, parseGameForm } from '$lib/server/game-create';
import {
  editionStatusName,
  translationQualityName,
  translationTypeName,
} from '$lib/utils/entriesConvert';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  if (!locals.user) error(401, 'Non connecté');
  if (!canCreateGame(locals.user)) error(403, 'Accès refusé');

  const [origins, tags] = await Promise.all([
    orm.em.find(OriginWebsite, {}, { orderBy: { name: 'asc' } }),
    orm.em.find(GameTags, {}, { orderBy: { name: 'asc' } }),
  ]);

  return {
    origins: origins.map((origin) => ({
      id: origin.id,
      name: origin.name,
      //? Site à thread : le lien se déduit du numéro ; sinon il est saisi à la main.
      hasThread: threadBase(origin.name) !== null,
      //? L'auto-check n'existe que pour F95zone (comme en v4).
      autoCheck: origin.name === 'F95zone',
    })),
    defaultOriginId:
      origins.find(({ name }) => name === 'F95zone')?.id ??
      origins[0]?.id ??
      '',
    tags: tags.map((tag) => ({ id: tag.id, name: tag.name })),
    statuses: EDITION_STATUSES.map((value) => ({
      value,
      label: editionStatusName(value),
    })),
    types: TRANSLATION_TYPES.map((value) => ({
      value,
      label: translationTypeName(value),
    })),
    qualities: TRANSLATION_QUALITIES.map((value) => ({
      value,
      label: translationQualityName(value),
    })),
    //? Ce que cette personne peut faire ici (voir game-access.ts et game-create.ts).
    canAddTranslation: canAddTranslation(locals.user),
    canManageAutoCheck: canManageAutoCheck(locals.user),
    staff: isStaff(locals.user),
    self: { id: locals.user.id, name: locals.user.name },
  };
};

export const actions: Actions = {
  create: async ({ locals, request }) => {
    if (!locals.user) error(401, 'Non connecté');
    if (!canCreateGame(locals.user)) error(403, 'Accès refusé');

    const parsed = await parseGameForm(await request.formData(), locals.user);
    if (!parsed.ok) return fail(400, { errors: parsed.errors });

    let gameId: number;
    try {
      gameId = await createGame(parsed.input, locals.user);
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

    redirect(303, `/games/${gameId}`);
  },
};
