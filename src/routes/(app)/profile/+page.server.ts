import { error, fail } from '@sveltejs/kit';
import { parseImageUrl } from '$lib/image-hosts';
import { parseMarkdownDocument } from '$lib/markdown/content';
import { DESCRIPTION_MAX_LENGTH } from '$lib/profile';
import { orm, User } from '$lib/server/db';
import {
  loadProfileTranslations,
  parseTranslationsQuery,
} from '$lib/server/profile';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
  if (!locals.user) error(401, 'Non connecté');

  const query = parseTranslationsQuery(url);

  return {
    profile: locals.user,
    descriptionDocument: parseMarkdownDocument(locals.user.description ?? ''),
    query,
    translations: await loadProfileTranslations(locals.user.id, query, {
      countHidden: true,
    }),
  };
};

type Field = 'avatar' | 'banner' | 'description';

//? Chacun ne modifie que son propre profil : le compte est toujours celui de la session.
const updateOwnProfile = async (
  locals: App.Locals,
  request: Request,
  field: Field,
) => {
  if (!locals.user) error(401, 'Non connecté');

  //? Modifier le profil d'un compte emprunté serait une modification faite à sa place.
  if (locals.impersonator) {
    return fail(403, {
      field,
      message:
        "Impossible de modifier le profil en naviguant en tant qu'un autre compte.",
    });
  }

  const value = String((await request.formData()).get(field) ?? '');
  let saved: string | null;

  if (field === 'description') {
    saved = value.trim() || null;

    if (saved && saved.length > DESCRIPTION_MAX_LENGTH) {
      return fail(400, {
        field,
        message: `La description ne peut pas dépasser ${DESCRIPTION_MAX_LENGTH} caractères.`,
      });
    }
  } else {
    const image = parseImageUrl(value);
    if (!image.ok) return fail(400, { field, message: image.message });

    saved = image.url;
  }

  const user = await orm.em.findOne(User, { id: locals.user.id });
  if (!user) return fail(404, { field, message: 'Compte introuvable.' });

  user[field] = saved;
  await orm.em.flush();

  return { saved: field };
};

export const actions: Actions = {
  avatar: ({ locals, request }) => updateOwnProfile(locals, request, 'avatar'),
  banner: ({ locals, request }) => updateOwnProfile(locals, request, 'banner'),
  description: ({ locals, request }) =>
    updateOwnProfile(locals, request, 'description'),
};
