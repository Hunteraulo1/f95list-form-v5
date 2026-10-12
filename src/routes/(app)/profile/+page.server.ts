import { error, fail } from '@sveltejs/kit';
import { parseImageUrl } from '#lib/image-hosts.ts';
import { parseMarkdownDocument } from '#lib/markdown/content.ts';
import type { Permission } from '#lib/permissions.ts';
import { DESCRIPTION_MAX_LENGTH } from '#lib/profile.ts';
import { extractYoutubeVideoId, youtubeWatchUrl } from '#lib/profile-music.ts';
import { orm, User } from '#lib/server/db/index.ts';
import {
  loadProfileTranslations,
  parseTranslationsQuery,
  shownCustomization,
} from '#lib/server/profile.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
  if (!locals.user) error(401, 'Non connecté');

  const query = parseTranslationsQuery(url);

  return {
    profile: locals.user,
    //? Image de fond et musique : affichées, et modifiables, seulement avec leur permission.
    customization: shownCustomization(locals.user, locals.user.permissions),
    customize: {
      background: locals.user.permissions.includes('profile.background'),
      music: locals.user.permissions.includes('profile.music'),
      cursor: locals.user.permissions.includes('profile.cursor'),
    },
    descriptionDocument: parseMarkdownDocument(locals.user.description ?? ''),
    query,
    translations: await loadProfileTranslations(locals.user.id, query, {
      countHidden: true,
    }),
  };
};

type Field =
  | 'avatar'
  | 'banner'
  | 'description'
  | 'background'
  | 'music'
  | 'cursor';

//? Les réglages qui demandent une permission (voir `profileCustomization`).
const REQUIRED: Partial<Record<Field, Permission>> = {
  background: 'profile.background',
  music: 'profile.music',
  cursor: 'profile.cursor',
};

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

  const required = REQUIRED[field];
  if (required && !locals.user.permissions.includes(required)) {
    return fail(403, {
      field,
      message: 'Votre rôle ne permet pas ce réglage du profil.',
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
  } else if (field === 'music') {
    const videoId = extractYoutubeVideoId(value);
    if (value.trim() && !videoId) {
      return fail(400, {
        field,
        message:
          "Le lien doit être celui d'une vidéo YouTube ou YouTube Music (par exemple https://music.youtube.com/watch?v=… ou https://youtu.be/…).",
      });
    }

    saved = videoId ? youtubeWatchUrl(videoId) : null;
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
  background: ({ locals, request }) =>
    updateOwnProfile(locals, request, 'background'),
  music: ({ locals, request }) => updateOwnProfile(locals, request, 'music'),
  cursor: ({ locals, request }) => updateOwnProfile(locals, request, 'cursor'),
};
