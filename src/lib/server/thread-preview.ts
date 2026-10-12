import { GameTags, orm } from '#lib/server/db/index.ts';
import { previewThread } from '#lib/server/scraper.ts';

//? Aperçu d'un thread F95zone, avec ses tags traduits en tags locaux : le scraper ne connaît que
//? les identifiants F95Checker (`game_tags.f95_id`), le mappage se fait ici, côté base.
export const loadThreadPreview = async (threadId: number) => {
  const result = await previewThread(threadId);
  if (!result.ok) return result;

  const { tagsF95, ...data } = result.data;
  const tagIds =
    tagsF95.length === 0
      ? []
      : (
          await orm.em.find(
            GameTags,
            { f95Id: { $in: tagsF95 } },
            { fields: ['id'] },
          )
        ).map((tag) => tag.id);

  return {
    ok: true as const,
    data: {
      ...data,
      tagIds,
      //? Le thread donne tout ce qu'un jeu exige : rien n'est à saisir à la main.
      complete: Boolean(data.image && data.version && tagIds.length > 0),
    },
  };
};
