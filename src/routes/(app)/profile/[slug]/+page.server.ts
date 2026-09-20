import { error, redirect } from '@sveltejs/kit';
import { parseMarkdownDocument } from '$lib/markdown/content';
import {
  findProfileBySlug,
  findProfileUser,
  loadProfileTranslations,
  parseTranslationsQuery,
} from '$lib/server/profile';
import type { PageServerLoad } from './$types';

//? Profil public d'un compte, en lecture seule. On n'expose que ce qu'un profil montre : jamais
//? l'e-mail, ni l'identifiant Discord, ni les crédits anonymes.
export const load: PageServerLoad = async ({ params, url }) => {
  //? L'ancienne adresse par le nom (/profile/<nom>) continue de fonctionner, par redirection.
  const user =
    (await findProfileBySlug(params.slug)) ??
    (await findProfileUser(params.slug));
  if (!user) error(404, 'Profil introuvable');

  //? Une seule adresse par profil : le slug exact (casse comprise).
  if (params.slug !== user.slug) {
    redirect(301, `/profile/${user.slug}${url.search}`);
  }

  const query = parseTranslationsQuery(url);

  return {
    profile: {
      name: user.name,
      slug: user.slug,
      roleLabel: user.role.label,
      avatar: user.avatar ?? null,
      banner: user.banner ?? null,
      description: user.description ?? null,
    },
    descriptionDocument: parseMarkdownDocument(user.description ?? ''),
    query,
    translations: await loadProfileTranslations(user.id, query),
  };
};
