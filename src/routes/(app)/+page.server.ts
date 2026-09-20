import { randomInt } from 'node:crypto';
import { VIEW_ACTIVE_ONLY } from '$lib/server/config';
import { GameTranslation, orm } from '$lib/server/db';

interface LatestTranslationRow {
  id: string;
  name: string;
  editionName: string | null;
  image: string | null;
}

const countTranslators = async () => {
  const [row] = await orm.em.getConnection().execute<{ count: number }[]>(
    VIEW_ACTIVE_ONLY
      ? `select count(distinct gtt.user_id) as count
         from game_translation_translator gtt
         join game_translation gt on gt.id = gtt.game_translation_id
         where gt.active = 1`
      : 'select count(distinct user_id) as count from game_translation_translator',
  );

  return Number(row.count);
};

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
        //? Les comptes qui figurent comme traducteur ou relecteur d'au moins une traduction.
        value: await countTranslators(),
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
