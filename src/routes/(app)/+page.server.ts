import { randomInt } from 'node:crypto';
import { VIEW_ACTIVE_ONLY } from '$lib/server/config';
import { GameTranslation, orm, Translator } from '$lib/server/db';

interface LatestTranslationRow {
  id: string;
  name: string;
  editionName: string | null;
  image: string | null;
}

export const load = async () => {
  const random = randomInt(1000000);

  const rows = await orm.em
    .createQueryBuilder(GameTranslation, 'gt')
    .join('gt.gameEdition', 'ge')
    .join('ge.game', 'g')
    .select([
      'g.id as id',
      'g.name as name',
      'ge.name as editionName',
      'g.imageExternal as image',
    ])
    .where(
      VIEW_ACTIVE_ONLY
        ? { 'gt.active': true, 'ge.active': true, 'g.active': true }
        : {},
    )
    .orderBy({ 'gt.updatedAt': 'desc' })
    .limit(5)
    .execute<LatestTranslationRow[]>();

  const games = rows.map(({ id, image, name, editionName }) => {
    return {
      id,
      image,
      name: editionName ? `${editionName} - ${name}` : name,
    };
  });
  return {
    games,
    stats: [
      {
        title: 'traducteur',
        value: await orm.em.count(
          Translator,
          VIEW_ACTIVE_ONLY ? { active: true } : {},
        ),
      },
      {
        title: 'traductions',
        value: await orm.em.count(
          GameTranslation,
          VIEW_ACTIVE_ONLY ? { active: true } : {},
        ),
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
