import { fail } from '@sveltejs/kit';
import {
  ADMIN_LINK_DESCRIPTION_MAX_LENGTH,
  ADMIN_LINK_LABEL_MAX_LENGTH,
  ADMIN_LINK_URL_MAX_LENGTH,
} from '#lib/admin-links.ts';
import { parseWebUrl } from '#lib/games/game-form.ts';
import { AdminLink, orm } from '#lib/server/db/index.ts';
import { logger } from '#lib/server/logger.ts';
import { requirePermission } from '#lib/server/permissions.ts';
import type { Actions, PageServerLoad } from './$types';

const ordered = () =>
  orm.em.find(
    AdminLink,
    {},
    { orderBy: { position: 'asc', createdAt: 'asc' } },
  );

export const load: PageServerLoad = async ({ locals }) => {
  requirePermission(locals, 'manage.settings');

  return {
    links: (await ordered()).map((link) => ({
      id: link.id,
      label: link.label,
      description: link.description ?? '',
      url: link.url,
    })),
  };
};

type LinkFields =
  | { ok: true; label: string; description: string | null; url: string }
  | { ok: false; message: string };

//? Lit et valide les champs d'un lien. Seules les adresses http(s) sont acceptées : un lien
//? `javascript:` s'exécuterait chez celui qui clique.
const parseLink = (form: FormData): LinkFields => {
  const label = String(form.get('label') ?? '').trim();
  const description = String(form.get('description') ?? '').trim();
  const url = parseWebUrl(String(form.get('url') ?? '').trim());

  if (!label || label.length > ADMIN_LINK_LABEL_MAX_LENGTH) {
    return {
      ok: false,
      message: `Le nom est requis (${ADMIN_LINK_LABEL_MAX_LENGTH} caractères max).`,
    };
  }
  if (description.length > ADMIN_LINK_DESCRIPTION_MAX_LENGTH) {
    return {
      ok: false,
      message: `La description ne peut pas dépasser ${ADMIN_LINK_DESCRIPTION_MAX_LENGTH} caractères.`,
    };
  }
  if (!url || url.length > ADMIN_LINK_URL_MAX_LENGTH) {
    return {
      ok: false,
      message: "L'adresse doit être une adresse http(s) valide.",
    };
  }

  return { ok: true, label, description: description || null, url };
};

export const actions: Actions = {
  add: async ({ locals, request }) => {
    requirePermission(locals, 'manage.settings');

    const fields = parseLink(await request.formData());
    if (!fields.ok) return fail(400, { id: 'new', message: fields.message });

    //? Un nouveau lien se place à la fin.
    const last = (await ordered()).at(-1);
    orm.em.create(AdminLink, {
      label: fields.label,
      description: fields.description,
      url: fields.url,
      position: (last?.position ?? -1) + 1,
    });
    await orm.em.flush();
    logger.info(
      { userId: locals.user?.id, label: fields.label },
      'lien utile ajouté',
    );

    return { saved: 'new' };
  },

  update: async ({ locals, request }) => {
    requirePermission(locals, 'manage.settings');

    const form = await request.formData();
    const id = String(form.get('id') ?? '');
    const link = await orm.em.findOne(AdminLink, { id });
    if (!link) return fail(404, { id, message: 'Lien introuvable.' });

    const fields = parseLink(form);
    if (!fields.ok) return fail(400, { id, message: fields.message });

    link.label = fields.label;
    link.description = fields.description;
    link.url = fields.url;
    await orm.em.flush();

    return { saved: id };
  },

  //? Monte ou descend un lien d'un cran : il échange sa place avec son voisin.
  move: async ({ locals, request }) => {
    requirePermission(locals, 'manage.settings');

    const form = await request.formData();
    const id = String(form.get('id') ?? '');
    const links = await ordered();
    const index = links.findIndex((link) => link.id === id);
    const target = index + (form.get('direction') === 'up' ? -1 : 1);
    if (index === -1 || target < 0 || target >= links.length) {
      return { moved: false };
    }

    [links[index], links[target]] = [links[target], links[index]];
    //? Renumérotés d'un bloc : les positions restent uniques, même après des suppressions.
    links.forEach((link, position) => {
      link.position = position;
    });
    await orm.em.flush();

    return { moved: true };
  },

  delete: async ({ locals, request }) => {
    requirePermission(locals, 'manage.settings');

    const id = String((await request.formData()).get('id') ?? '');
    await orm.em.nativeDelete(AdminLink, { id });
    logger.info({ userId: locals.user?.id, linkId: id }, 'lien utile supprimé');

    return { deleted: true };
  },
};
