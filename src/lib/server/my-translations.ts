import { orm } from '$lib/server/db';

//? Ces traductions n'ont pas de version propre à suivre : rien à mettre à jour.
const UNTRACKED_TYPES = ['integrated', 'no_translation'] as const;

//? « Pas à jour » (règle de la v4) : la version de la traduction diffère de celle de l'édition,
//? hors traductions intégrées, et hors celles dont le suivi est coupé par la personne.
export const isTranslationOutdated = (row: {
  type: string;
  version: string;
  editionVersion: string;
  followed: boolean;
}) =>
  row.followed &&
  !(UNTRACKED_TYPES as readonly string[]).includes(row.type) &&
  row.version.trim() !== row.editionVersion.trim();

export const countOutdatedTranslations = async (userId: string) => {
  const [row] = await orm.em.getConnection().execute<{ count: number }[]>(
    `select count(*) as count
     from game_translation_translator g
     join game_translation t on t.id = g.game_translation_id
     join game_edition e on e.id = t.game_edition_id
     where g.user_id = ? and g.alert = 1
       and t.type not in (${UNTRACKED_TYPES.map(() => '?').join(', ')})
       and trim(t.version) <> trim(e.version)`,
    [userId, ...UNTRACKED_TYPES],
  );

  return Number(row.count);
};
