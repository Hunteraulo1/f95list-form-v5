import { orm, User } from '$lib/server/db';
import { slugBase, slugify, withSuffix } from '$lib/slug';

//? Un autre compte (que `exceptUserId`) porte-t-il déjà ce slug ?
export const isSlugTaken = async (slug: string, exceptUserId?: string) =>
  (await orm.em.count(User, {
    slug,
    ...(exceptUserId && { id: { $ne: exceptUserId } }),
  })) > 0;

//? Pour un compte créé automatiquement (traducteur fantôme, inscription) : personne à qui
//? demander, donc le premier slug libre (`nom`, `nom-2`, `nom-3`…).
export const allocateSlug = async (name: string) => {
  const base = slugify(name);
  let slug = base;

  for (let attempt = 2; await isSlugTaken(slug); attempt++) {
    slug = withSuffix(base, attempt);
  }

  return slug;
};

export type NameSlugCheck =
  | { ok: true; slug: string }
  | { ok: false; message: string };

//? Pour un nom choisi par une personne (création manuelle, renommage) : le slug qui en découle doit
//? être disponible, sinon on refuse en le disant, plutôt que de lui coller un suffixe à son insu.
export const checkNameSlug = async (
  name: string,
  exceptUserId?: string,
): Promise<NameSlugCheck> => {
  if (!slugBase(name)) {
    return {
      ok: false,
      message:
        'Le nom doit contenir au moins une lettre ou un chiffre (a-z, 0-9) pour fabriquer le lien du profil.',
    };
  }

  const slug = slugify(name);
  if (await isSlugTaken(slug, exceptUserId)) {
    return {
      ok: false,
      message: `Ce nom donne le lien de profil « /profile/${slug} », déjà utilisé par un autre compte.`,
    };
  }

  return { ok: true, slug };
};
