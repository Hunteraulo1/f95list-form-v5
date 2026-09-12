import { Game, orm } from '$lib/server/db';

interface GameListRow {
  id: number;
  translationId: string;
  name: string;
  editionName: string | null;
  image: string | null;
}

export const load = async () => {
  const rows = await orm.em
    .createQueryBuilder(Game, 'g')
    .join('g.gameEditions', 'ge')
    .join('ge.gameTranslations', 'gt')
    .select([
      'g.id as id',
      'gt.id as translationId',
      'g.name as name',
      'ge.name as editionName',
      'g.imageExternal as image',
    ])
    .orderBy({ 'g.name': 'asc', 'ge.name': 'asc' })
    .execute<GameListRow[]>();

  return { games: rows };
};
