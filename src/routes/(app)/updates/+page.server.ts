import { VIEW_ACTIVE_ONLY } from '$lib/server/config';
import { GameTranslation, orm } from '$lib/server/db';

interface UpdateRow {
  id: string;
  name: string;
  editionName: string | null;
  image: string | null;
  date: Date;
}

export const load = async () => {
  const games = await orm.em
    .createQueryBuilder(GameTranslation, 'gt')
    .join('gt.gameEdition', 'ge')
    .join('ge.game', 'g')
    .select([
      'gt.id as id',
      'g.name as name',
      'ge.name as editionName',
      'g.imageExternal as image',
      'gt.updatedAt as date',
    ])
    .where(
      VIEW_ACTIVE_ONLY
        ? { 'gt.active': true, 'ge.active': true, 'g.active': true }
        : {},
    )
    .orderBy({ 'gt.updatedAt': 'desc' })
    .execute<UpdateRow[]>();

  return { games };
};
