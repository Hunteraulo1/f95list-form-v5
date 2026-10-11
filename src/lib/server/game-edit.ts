import type { FieldErrors } from '#lib/games/game-form.ts';
import {
  Game,
  GameGameTags,
  GameTags,
  OriginWebsite,
  orm,
} from '#lib/server/db/index.ts';
import { canManageAutoCheck } from '#lib/server/game-access.ts';
import { parseGameFields } from '#lib/server/game-create.ts';
import { syncGameTagsF95 } from '#lib/server/game-tags.ts';
import type { SessionUser } from '#lib/server/hooks/auth.ts';
import { logger } from '#lib/server/logger.ts';

export interface UpdateGameInput {
  name: string;
  originId: string;
  link: string;
  threadId: number | null;
  image: string | null;
  description: string | null;
  descriptionFr: string | null;
  autoCheck: boolean;
  tagIds: number[];
}

export type ParsedGameEditForm =
  | { ok: true; input: UpdateGameInput }
  | { ok: false; errors: FieldErrors };

//? Lit et valide le formulaire « Modifier le jeu » avec les règles de la création. Seules les
//? informations du jeu sont concernées : ses éditions et ses traductions se modifient ailleurs.
export const parseGameEditForm = async (
  data: FormData,
  viewer: SessionUser,
  game: Game,
): Promise<ParsedGameEditForm> => {
  const errors: FieldErrors = {};

  const { origin, ...fields } = await parseGameFields(data, errors, {
    id: game.id,
    image: game.imageExternal ?? null,
  });

  if (Object.keys(errors).length > 0 || !origin) return { ok: false, errors };

  //? L'auto-check ne concerne que F95zone. Sans le droit de le choisir, il reste tel quel ; un jeu
  //? qui arrive sur F95zone le reçoit activé, comme à la création.
  let autoCheck = false;
  if (origin.name === 'F95zone') {
    if (canManageAutoCheck(viewer)) autoCheck = data.get('autoCheck') === 'on';
    else autoCheck = game.origin.id === origin.id ? game.autoCheck : true;
  }

  return { ok: true, input: { ...fields, originId: origin.id, autoCheck } };
};

//? Enregistre les informations du jeu et ses tags d'un seul tenant : tout ou rien.
export const updateGame = async (
  gameId: number,
  input: UpdateGameInput,
  viewer: SessionUser,
) =>
  orm.em.transactional(async (em) => {
    const game = await em.findOneOrFail(
      Game,
      { id: gameId },
      { populate: ['gameGameTags'] },
    );

    //? Autre thread : le repère de synchronisation F95Checker de l'ancien ne vaut plus rien.
    if (
      game.origin.id !== input.originId ||
      (game.threadId ?? null) !== input.threadId
    ) {
      game.lastChange = null;
    }

    game.name = input.name;
    game.origin = em.getReference(OriginWebsite, input.originId);
    game.link = input.link;
    game.threadId = input.threadId;
    game.imageExternal = input.image;
    game.description = input.description;
    game.descriptionFr = input.descriptionFr;
    game.autoCheck = input.autoCheck;

    const wanted = new Set(input.tagIds);
    for (const row of game.gameGameTags.getItems()) {
      if (!wanted.delete(row.gameTag.id)) em.remove(row);
    }
    for (const tagId of wanted) {
      em.create(GameGameTags, {
        game,
        gameTag: em.getReference(GameTags, tagId),
      });
    }

    await em.flush();
    await syncGameTagsF95(em, [game.id]);
    logger.info({ gameId: game.id, userId: viewer.id }, 'jeu modifié');
  });
