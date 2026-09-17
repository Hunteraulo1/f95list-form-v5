import { VIEW_ACTIVE_ONLY } from '$lib/server/config';
import { Game, orm } from '$lib/server/db';

interface GameListRow {
  id: number;
  name: string;
  imageInternal: string | null;
  imageExternal: string | null;
}

export const load = async () => {
  const rows = await orm.em
    .createQueryBuilder(Game)
    .select(['id', 'name', 'imageInternal', 'imageExternal'])
    .where(VIEW_ACTIVE_ONLY ? { active: true } : {})
    .orderBy({ name: 'asc' })
    .execute<GameListRow[]>();

  const games = rows.map(({ imageInternal, imageExternal, ...rest }) => ({
    ...rest,
    image: imageInternal ?? imageExternal,
  }));

  return { games };
};
