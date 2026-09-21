import type { EntityManager } from '@mikro-orm/mariadb';
import { orm } from '$lib/server/db';
import { F95_TAG_ID_BY_NAME } from '$lib/server/db/f95-tag-ids';

export interface GameTagRow {
  id: number;
  name: string;
  //? Identifiant F95Checker : renseigné = tag de F95zone (cible possible d'un lien).
  f95Id: number | null;
  active: boolean;
  //? Tag F95zone auquel ce tag est lié.
  linkedTo: number | null;
  games: number;
  //? Tag F95zone vers lequel le dictionnaire `F95_TAG_ID_BY_NAME` rattache ce tag, s'il existe en base.
  suggestion: number | null;
  //? Le dictionnaire dit que ce tag n'a pas d'équivalent chez F95zone.
  noEquivalent: boolean;
}

interface RawRow {
  id: number;
  name: string;
  f95_id: number | null;
  active: number | boolean;
  f95_tag_id: number | null;
  games: number | bigint;
}

export const listGameTags = async (): Promise<GameTagRow[]> => {
  const rows = await orm.em.execute<RawRow[]>(
    'select t.id, t.name, t.f95_id, t.active, t.f95_tag_id, count(gt.game_id) as games from game_tags t left join game_game_tags gt on gt.game_tag_id = t.id group by t.id order by t.name',
  );

  const idByF95Id = new Map<number, number>();
  for (const row of rows) {
    if (row.f95_id !== null) idByF95Id.set(Number(row.f95_id), row.id);
  }

  return rows.map((row) => {
    const key = row.name.trim().toLowerCase();
    const dictionaryId = Object.hasOwn(F95_TAG_ID_BY_NAME, key)
      ? F95_TAG_ID_BY_NAME[key]
      : undefined;

    return {
      id: row.id,
      name: row.name,
      f95Id: row.f95_id === null ? null : Number(row.f95_id),
      active: Boolean(row.active),
      linkedTo: row.f95_tag_id,
      games: Number(row.games),
      suggestion: dictionaryId ? (idByF95Id.get(dictionaryId) ?? null) : null,
      noEquivalent: dictionaryId === 0,
    };
  });
};

//? Recalcule `game.tags_f95` : les ids F95Checker des tags F95zone du jeu et de ceux vers lesquels
//? pointent ses autres tags, triés et sans doublon. Sans `gameIds`, tous les jeux ; sinon ceux-là.
export const syncGameTagsF95 = async (
  em: EntityManager,
  gameIds?: number[],
): Promise<void> => {
  if (gameIds?.length === 0) return;

  await em.execute(
    `update game g set g.tags_f95 = coalesce((select json_arrayagg(distinct coalesce(t.f95_id, l.f95_id) order by coalesce(t.f95_id, l.f95_id)) from game_game_tags gt join game_tags t on t.id = gt.game_tag_id left join game_tags l on l.id = t.f95_tag_id where gt.game_id = g.id and coalesce(t.f95_id, l.f95_id) is not null), json_array())${gameIds ? ` where g.id in (${gameIds.map(() => '?').join(', ')})` : ''}`,
    gameIds,
  );
};

const gamesOfTag = async (em: EntityManager, tagId: number) =>
  (
    await em.execute<{ game_id: number }[]>(
      'select game_id from game_game_tags where game_tag_id = ?',
      [tagId],
    )
  ).map((row) => row.game_id);

//? Lie `tagId` (tag sans id F95) à `targetId` (tag de F95zone), ou retire son lien si `targetId` est nul.
//? Le tag garde ses jeux ; seul `game.tags_f95` de ces jeux est recalculé. Un tag lié est classé.
//? Renvoie un message d'erreur, ou null.
export const linkGameTag = (
  tagId: number,
  targetId: number | null,
): Promise<string | null> =>
  orm.em.transactional(async (em: EntityManager) => {
    if (tagId === targetId) return 'Un tag ne peut pas être lié à lui-même.';

    const rows = await em.execute<{ id: number; f95_id: number | null }[]>(
      'select id, f95_id from game_tags where id in (?, ?)',
      [tagId, targetId ?? tagId],
    );
    const tag = rows.find((row) => row.id === tagId);
    const target = rows.find((row) => row.id === targetId);

    if (!tag) return 'Tag introuvable.';
    if (tag.f95_id !== null) {
      return 'Ce tag vient de F95zone : il ne peut pas être lié.';
    }
    if (targetId !== null) {
      if (!target) return 'Tag introuvable.';
      if (target.f95_id === null) {
        return 'La cible doit être un tag de F95zone.';
      }
    }

    await em.execute(
      'update game_tags set f95_tag_id = ?, active = ? where id = ?',
      [targetId, targetId !== null, tagId],
    );
    await syncGameTagsF95(em, await gamesOfTag(em, tagId));

    return null;
  });
