import { asc, eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { game, gameEdition, gameTranslation } from '$lib/server/db/schema';

export const load = async () => {
  return {
    games: await db
      .select({
        id: game.id,
        translationId: gameTranslation.id,
        name: game.name,
        editionName: gameEdition.name,
        image: game.imageExternal,
      })
      .from(game)
      .innerJoin(gameEdition, eq(game.id, gameEdition.gameId))
      .innerJoin(
        gameTranslation,
        eq(gameTranslation.gameEditionId, gameEdition.id),
      )
      .orderBy(asc(game.name), asc(gameEdition.name)),
  };
};
