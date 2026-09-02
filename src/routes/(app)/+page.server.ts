import { randomInt } from 'node:crypto';
import { desc, eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import {
  game,
  gameEdition,
  gameTranslation,
  translator,
} from '$lib/server/db/schema';

export const load = async () => {
  const random = randomInt(1000000);

  return {
    games: await db
      .select({
        id: gameTranslation.id,
        name: game.name,
        editionName: gameEdition.name,
        image: game.imageExternal,
      })
      .from(gameTranslation)
      .innerJoin(gameEdition, eq(gameTranslation.gameEditionId, gameEdition.id))
      .innerJoin(game, eq(gameEdition.gameId, game.id))
      .orderBy(desc(gameTranslation.updatedAt))
      .limit(5),
    stats: [
      {
        title: 'traducteur',
        value: await db.$count(translator),
      },
      {
        title: 'traductions',
        value: await db.$count(gameTranslation),
      },
      {
        title: 'téléchargements',
        value: random,
      },
      {
        title: 'visites',
        value: random + randomInt(10000000),
      },
    ],
  };
};
