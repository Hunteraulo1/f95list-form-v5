import { db } from '$lib/server/db';

export const load = async () => {
  return {
    games: await db.query.game.findMany(),
  };
};
