import { desc, eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { game, gameEdition, gameTranslation } from '$lib/server/db/schema';

export const load = async () => {
  return {
    games: await db
      .select({
        id: gameTranslation.id,
        name: game.name,
        editionName: gameEdition.name,
        image: game.imageExternal,
        date: gameTranslation.updatedAt,
      })
      .from(gameTranslation)
      .innerJoin(gameEdition, eq(gameTranslation.gameEditionId, gameEdition.id))
      .innerJoin(game, eq(gameEdition.gameId, game.id))
      .orderBy(desc(gameTranslation.updatedAt)),
  };
};
