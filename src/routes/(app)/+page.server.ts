import { randomInt } from 'node:crypto';
import { GameTranslation, orm, Translator } from '$lib/server/db';

interface LatestTranslationRow {
  id: string;
  name: string;
  editionName: string | null;
  image: string | null;
}

export const load = async () => {
  const random = randomInt(1000000);

  const games = await orm.em
    .createQueryBuilder(GameTranslation, 'gt')
    .join('gt.gameEdition', 'ge')
    .join('ge.game', 'g')
    .select([
      'gt.id as id',
      'g.name as name',
      'ge.name as editionName',
      'g.imageExternal as image',
    ])
    .orderBy({ 'gt.updatedAt': 'desc' })
    .limit(5)
    .execute<LatestTranslationRow[]>();

  return {
    games,
    stats: [
      {
        title: 'traducteur',
        value: await orm.em.count(Translator),
      },
      {
        title: 'traductions',
        value: await orm.em.count(GameTranslation),
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
