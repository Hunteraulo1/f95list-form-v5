import type { EditionStatus, FieldErrors } from '#lib/games/game-form.ts';
import {
  type Game,
  GameEdition,
  GameTranslation,
  orm,
} from '#lib/server/db/index.ts';
import { canManageAutoCheck } from '#lib/server/game-access.ts';
import {
  addTranslation,
  type CreateGameInput,
  parseEditionFields,
  parseTranslationFields,
} from '#lib/server/game-create.ts';
import type { SessionUser } from '#lib/server/hooks/auth.ts';
import { logger } from '#lib/server/logger.ts';

//? Valeur du champ « Édition » qui demande d'en créer une nouvelle (sinon : l'identifiant d'une existante).
export const NEW_EDITION = 'new';

export interface CreateTranslationInput {
  edition:
    | { kind: 'existing'; id: string }
    | {
        kind: 'new';
        name: string | null;
        version: string;
        status: EditionStatus;
        autoCheck: boolean;
      };
  translation: CreateGameInput['translation'];
}

export type ParsedTranslationCreateForm =
  | { ok: true; input: CreateTranslationInput }
  | { ok: false; errors: FieldErrors };

//? L'auto-check d'une édition ne se choisit que pour un jeu F95zone lui-même en auto-check, avec le
//? droit de le faire (comme à la création d'un jeu).
export const editionAutoCheckAvailable = (game: Game, viewer: SessionUser) =>
  canManageAutoCheck(viewer) &&
  game.autoCheck &&
  game.origin.name === 'F95zone';

//? Lit et valide le formulaire « Ajouter une traduction » avec les règles de la création d'un jeu.
//? `game` doit être chargé avec son site d'origine et ses éditions.
export const parseTranslationCreateForm = async (
  data: FormData,
  viewer: SessionUser,
  game: Game,
): Promise<ParsedTranslationCreateForm> => {
  const errors: FieldErrors = {};
  const editions = game.gameEditions.getItems();

  // --- l'édition : une existante de ce jeu, ou une nouvelle
  const editionId = String(data.get('editionId') ?? '');
  let edition: CreateTranslationInput['edition'] | null = null;

  if (editionId === NEW_EDITION) {
    const { name, version, status } = parseEditionFields(data, errors);

    //? Deux éditions d'un jeu ne portent pas le même nom ; une seule peut être l'édition de base
    //? (sans nom). La collation de la base ignore la casse : on compare de même.
    const key = (value: string | null | undefined) =>
      (value ?? '').trim().toLowerCase();
    if (editions.some((existing) => key(existing.name) === key(name))) {
      errors.editionName = name
        ? `Ce jeu a déjà une édition « ${name} ».`
        : 'Ce jeu a déjà une édition de base : donnez un nom à la nouvelle édition.';
    }

    if (status) {
      edition = {
        kind: 'new',
        name,
        version,
        status,
        autoCheck:
          editionAutoCheckAvailable(game, viewer) &&
          data.get('editionAutoCheck') === 'on',
      };
    }
  } else if (editions.some(({ id }) => id === editionId)) {
    edition = { kind: 'existing', id: editionId };
  } else {
    errors.editionId = "Choisissez l'édition du jeu.";
  }

  // --- la traduction
  const { type, quality, ...fields } = await parseTranslationFields(
    data,
    viewer,
    errors,
  );
  //? « Pas de traduction » n'est pas une traduction à ajouter : c'est l'état d'une édition qui n'en a pas.
  if (type === 'no_translation') {
    errors.type = 'Choisissez le type de traduction.';
  }

  if (Object.keys(errors).length > 0 || !edition || !type || !quality) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    input: { edition, translation: { type, quality, ...fields } },
  };
};

//? Ajoute la traduction (et son édition si elle est nouvelle) d'un seul tenant : tout ou rien.
//? Retourne l'identifiant de la traduction.
export const createTranslation = async (
  gameId: number,
  input: CreateTranslationInput,
  viewer: SessionUser,
) =>
  orm.em.transactional(async (em) => {
    const e = input.edition;

    const edition =
      e.kind === 'existing'
        ? await em.findOneOrFail(GameEdition, { id: e.id, game: gameId })
        : em.create(GameEdition, {
            game: gameId,
            name: e.name,
            version: e.version,
            status: e.status,
            autoCheck: e.autoCheck,
            active: true,
          });

    //? Une édition sans traduction porte une ligne « pas de traduction » : elle n'a plus lieu d'être
    //? dès que l'édition en reçoit une vraie.
    if (e.kind === 'existing') {
      const placeholders = await em.find(
        GameTranslation,
        { gameEdition: edition.id, type: 'no_translation' },
        { populate: ['gameTranslationFiles', 'gameTranslationTranslators'] },
      );
      for (const placeholder of placeholders) {
        em.remove(placeholder.gameTranslationFiles.getItems());
        em.remove(placeholder.gameTranslationTranslators.getItems());
        em.remove(placeholder);
      }
    }

    const translation = await addTranslation(em, edition, input.translation);
    await em.flush();

    logger.info(
      { gameId, translationId: translation.id, userId: viewer.id },
      'traduction ajoutée',
    );

    return translation.id;
  });
