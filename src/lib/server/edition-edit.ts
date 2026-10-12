import type { EditionStatus, FieldErrors } from '#lib/games/game-form.ts';
import { type Game, GameEdition, orm } from '#lib/server/db/index.ts';
import { parseEditionFields } from '#lib/server/game-create.ts';
import type { SessionUser } from '#lib/server/hooks/auth.ts';
import { logger } from '#lib/server/logger.ts';
import { editionAutoCheckAvailable } from '#lib/server/translation-create.ts';

export interface UpdateEditionInput {
  name: string | null;
  version: string;
  status: EditionStatus;
  autoCheck: boolean;
}

export type ParsedEditionEditForm =
  | { ok: true; input: UpdateEditionInput }
  | { ok: false; errors: FieldErrors };

const key = (value: string | null | undefined) =>
  (value ?? '').trim().toLowerCase();

//? Lit et valide le formulaire « Modifier l'édition » avec les règles de la création.
//? `game` doit être chargé avec son site d'origine et ses éditions.
export const parseEditionEditForm = (
  data: FormData,
  viewer: SessionUser,
  game: Game,
  edition: GameEdition,
): ParsedEditionEditForm => {
  const errors: FieldErrors = {};
  const { name, version, status } = parseEditionFields(data, errors);

  //? Deux éditions d'un jeu ne portent pas le même nom, et une seule peut être l'édition de base
  //? (sans nom). Vérifié seulement si le nom change : des éditions reprises de l'ancien site
  //? peuvent déjà être plusieurs sans nom, et doivent rester modifiables.
  if (
    key(name) !== key(edition.name) &&
    game.gameEditions
      .getItems()
      .some((other) => other.id !== edition.id && key(other.name) === key(name))
  ) {
    errors.editionName = name
      ? `Ce jeu a déjà une édition « ${name} ».`
      : 'Ce jeu a déjà une édition de base : gardez un nom à celle-ci.';
  }

  if (Object.keys(errors).length > 0 || !status) return { ok: false, errors };

  return {
    ok: true,
    input: {
      name,
      version,
      status,
      //? Sans le droit de régler l'auto-check (ou sur un jeu qui n'en a pas), il reste tel quel.
      autoCheck: editionAutoCheckAvailable(game, viewer)
        ? data.get('editionAutoCheck') === 'on'
        : edition.autoCheck,
    },
  };
};

export const updateEdition = async (
  editionId: string,
  input: UpdateEditionInput,
  viewer: SessionUser,
) => {
  const edition = await orm.em.findOneOrFail(GameEdition, { id: editionId });

  edition.name = input.name;
  edition.version = input.version;
  edition.status = input.status;
  edition.autoCheck = input.autoCheck;

  await orm.em.flush();
  logger.info({ editionId, userId: viewer.id }, 'édition modifiée');
};
