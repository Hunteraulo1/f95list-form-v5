import { fail } from '@sveltejs/kit';
import { GameTags, orm } from '$lib/server/db';
import { fetchF95zoneTags } from '$lib/server/f95zone-tags';
import { linkGameTag, listGameTags } from '$lib/server/game-tags';
import { requirePermission } from '$lib/server/permissions';
import type { Actions, PageServerLoad } from './$types';

const parseId = (value: FormDataEntryValue | null) => {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
};

export const load: PageServerLoad = async ({ locals }) => {
  requirePermission(locals, 'manage.tags');

  const rows = await listGameTags();

  return {
    //? Les tags de F95zone sont les cibles ; les autres sont ceux à classer.
    targets: rows
      .filter((row) => row.f95Id !== null)
      .map(({ id, name }) => ({ id, name })),
    tags: rows.filter((row) => row.f95Id === null),
  };
};

export const actions: Actions = {
  //? Sans `targetId`, le lien du tag est retiré (il retourne « à classer »).
  link: async ({ locals, request }) => {
    requirePermission(locals, 'manage.tags');

    const data = await request.formData();
    const id = parseId(data.get('id'));
    const targetId = parseId(data.get('targetId'));
    if (id === null) return fail(404, { error: 'Tag introuvable.' });
    if (targetId === null && data.get('unlink') === null) {
      return fail(400, { error: 'Choisis le tag de F95zone à lier.' });
    }

    const error = await linkGameTag(id, targetId);
    if (error) return fail(400, { error });

    return { message: targetId === null ? 'Lien retiré.' : 'Tag lié.' };
  },

  //? Lie d'un coup les tags que le dictionnaire rattache à un tag de F95zone (ceux déjà liés sont laissés).
  applySuggestions: async ({ locals }) => {
    requirePermission(locals, 'manage.tags');

    let linked = 0;
    for (const tag of await listGameTags()) {
      if (tag.f95Id !== null || tag.linkedTo !== null) continue;
      if (tag.suggestion === null) continue;

      const error = await linkGameTag(tag.id, tag.suggestion);
      if (error) return fail(400, { error: `« ${tag.name} » : ${error}` });
      linked++;
    }

    return {
      message:
        linked === 0
          ? 'Aucune suggestion à appliquer.'
          : `${linked} tag${linked > 1 ? 's' : ''} lié${linked > 1 ? 's' : ''}.`,
    };
  },

  //? Ajoute les tags de la page publique de F95zone qu'on ne connaît pas encore. Leur id F95Checker est
  //? inconnu (la page ne le donne pas) : ils arrivent sans `f95_id` et « à classer ».
  fetchF95zone: async ({ locals }) => {
    requirePermission(locals, 'manage.tags');

    let siteTags: string[];
    try {
      siteTags = await fetchF95zoneTags();
    } catch (cause) {
      const reason =
        cause instanceof Error ? cause.message : 'Erreur inconnue.';
      return fail(502, {
        error: `Impossible de récupérer les tags de F95zone. ${reason}`,
      });
    }

    const known = new Set(
      (await listGameTags()).map((tag) => tag.name.trim().toLowerCase()),
    );
    const missing = siteTags.filter((name) => !known.has(name.toLowerCase()));

    for (const name of missing) {
      await orm.em.execute(
        'insert into game_tags (name, active) values (?, false)',
        [name],
      );
    }

    return {
      message:
        missing.length === 0
          ? `${siteTags.length} tags sur F95zone : aucun nouveau.`
          : `${siteTags.length} tags sur F95zone : ${missing.length} ajouté${missing.length > 1 ? 's' : ''} à classer (${missing.join(', ')}).`,
    };
  },

  //? Garder = tag sans équivalent chez F95zone, classé sans lien ; sinon il retourne « à classer ».
  //? Ne s'applique qu'à un tag non lié : un lien se retire avec `link`.
  setActive: async ({ locals, request }) => {
    requirePermission(locals, 'manage.tags');

    const data = await request.formData();
    const id = parseId(data.get('id'));
    if (id === null) return fail(400, { error: 'Tag introuvable.' });

    const updated = await orm.em.nativeUpdate(
      GameTags,
      { id, f95Id: null, f95Tag: null },
      { active: data.get('active') === 'true' },
    );
    if (updated === 0) return fail(404, { error: 'Tag introuvable.' });

    return { message: 'Tag mis à jour.' };
  },
};
