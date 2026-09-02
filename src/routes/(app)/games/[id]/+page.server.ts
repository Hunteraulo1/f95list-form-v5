import { error } from '@sveltejs/kit';
import { asc, eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import {
  type GameEdition,
  type GameTranslation,
  game,
  gameEdition,
  gameTranslation,
} from '$lib/server/db/schema';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
  const slug = parseInt(params.id, 10);

  const rows = await db
    .select({ game, gameEdition, gameTranslation })
    .from(game)
    .where(eq(game.id, slug))
    .leftJoin(gameEdition, eq(gameEdition.gameId, game.id))
    .leftJoin(
      gameTranslation,
      eq(gameTranslation.gameEditionId, gameEdition.id),
    )
    .orderBy(asc(gameEdition.name), asc(gameTranslation.version));

  const first = rows[0];
  if (!first) error(404, 'Not found');

  const editions = new Map<
    string,
    GameEdition & { gameTranslations: GameTranslation[] }
  >();
  for (const row of rows) {
    if (!row.gameEdition) continue;

    let edition = editions.get(row.gameEdition.id);
    if (!edition) {
      edition = { ...row.gameEdition, gameTranslations: [] };
      editions.set(row.gameEdition.id, edition);
    }
    if (row.gameTranslation) {
      edition.gameTranslations.push(row.gameTranslation);
    }
  }

  return {
    game: {
      ...first.game,
      gameEditions: [...editions.values()],
    },
  };
};
