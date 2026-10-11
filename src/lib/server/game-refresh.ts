import {
  type EditionStatus,
  VERSION_MAX_LENGTH,
} from '#lib/games/game-form.ts';
import {
  Game,
  GameEdition,
  GameGameTags,
  GameTags,
  orm,
} from '#lib/server/db/index.ts';
import { translateGameDescriptionInBackground } from '#lib/server/game-description-fr.ts';
import { syncGameTagsF95 } from '#lib/server/game-tags.ts';
import type { SessionUser } from '#lib/server/hooks/auth.ts';
import { logger } from '#lib/server/logger.ts';
import { type RefreshResult, refreshGame } from '#lib/server/scraper.ts';

//? Statuts F95 → statut d'une édition, comme le scraper (passation-scraper.md, section 6). Un
//? identifiant inconnu laisse le statut en place.
const F95_STATUSES: Record<number, EditionStatus> = {
  1: 'in_progress',
  2: 'completed',
  3: 'on_hold',
  4: 'abandoned',
};

//? L'actualisation n'existe que pour un jeu F95zone qui a un thread (comme l'auto-check).
export const canRefreshGame = (game: Game) =>
  game.origin.name === 'F95zone' && game.threadId != null;

export type GameRefresh =
  | { ok: true; editions: number; tagsAdded: number; tagsRemoved: number }
  | Extract<RefreshResult, { ok: false }>;

//? « Actualiser les données » : tout ce qui vient du thread F95zone. Le scraper écrit le jeu et ses
//? éditions en auto-check ; ce qu'il ne fait pas est complété ici : les tags, l'édition d'un jeu qui
//? n'en a qu'une (même hors auto-check : c'est forcément celle du thread) et la description française
//? manquante. Avec plusieurs éditions, seules celles en auto-check suivent le thread.
export const refreshGameData = async (
  gameId: number,
  viewer: SessionUser,
): Promise<GameRefresh> => {
  const result = await refreshGame(gameId);
  if (!result.ok) return result;

  const { thread } = result;

  const summary = await orm.em.transactional(async (em) => {
    // --- l'édition unique, si le scraper ne l'a pas déjà mise à jour
    let editions = result.editions;
    const active = await em.find(GameEdition, { game: gameId, active: true });
    if (active.length === 1 && !active[0].autoCheck) {
      const [edition] = active;
      const status = F95_STATUSES[thread.status];

      if (thread.version) {
        edition.version = thread.version.slice(0, VERSION_MAX_LENGTH);
      }
      if (status) edition.status = status;
      editions += 1;
    }

    // --- les tags : ceux du thread. Les tags qui ne viennent pas de F95zone (sans `f95Id`) restent.
    let tagsAdded = 0;
    let tagsRemoved = 0;
    //? Comme pour le reste : une liste vide côté F95zone n'efface rien.
    if (thread.tags.length > 0) {
      const wanted = new Map(
        (await em.find(GameTags, { f95Id: { $in: thread.tags } })).map(
          (tag) => [tag.id, tag],
        ),
      );
      const rows = await em.find(
        GameGameTags,
        { game: gameId },
        { populate: ['gameTag'] },
      );

      for (const row of rows) {
        if (wanted.delete(row.gameTag.id)) continue;
        if (row.gameTag.f95Id != null) {
          em.remove(row);
          tagsRemoved += 1;
        }
      }
      for (const tag of wanted.values()) {
        em.create(GameGameTags, { game: gameId, gameTag: tag });
        tagsAdded += 1;
      }
    }

    await em.flush();
    await syncGameTagsF95(em, [gameId]);

    const game = await em.findOneOrFail(Game, { id: gameId });

    return {
      editions,
      tagsAdded,
      tagsRemoved,
      description: game.description ?? null,
      descriptionFr: game.descriptionFr ?? null,
    };
  });

  //? Comme à la création : une description française saisie à la main n'est jamais écrasée.
  if (!summary.descriptionFr) {
    translateGameDescriptionInBackground(gameId, summary.description);
  }

  logger.info({ gameId, userId: viewer.id }, 'jeu actualisé');

  return {
    ok: true,
    editions: summary.editions,
    tagsAdded: summary.tagsAdded,
    tagsRemoved: summary.tagsRemoved,
  };
};
