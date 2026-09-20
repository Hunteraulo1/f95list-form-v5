import { json } from '@sveltejs/kit';
import { requirePermission } from '$lib/server/permissions';
import { checkNameSlug } from '$lib/server/slug';
import { slugBase } from '$lib/slug';
import type { RequestHandler } from './$types';

const NAME_MAX_LENGTH = 64;

//? Disponibilité en direct du slug qu'un nom donnerait (voir le formulaire de modification). Le
//? serveur revérifie de toute façon à l'enregistrement.
export const GET: RequestHandler = async ({ locals, url }) => {
  requirePermission(locals, 'manage.users');

  const name = (url.searchParams.get('name') ?? '')
    .trim()
    .slice(0, NAME_MAX_LENGTH);
  const exceptUserId = url.searchParams.get('id') ?? undefined;

  const check = await checkNameSlug(name, exceptUserId);

  return json(
    check.ok
      ? { available: true, slug: check.slug }
      : { available: false, slug: slugBase(name), message: check.message },
  );
};
