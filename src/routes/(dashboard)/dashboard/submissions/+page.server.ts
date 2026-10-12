import { error, fail } from '@sveltejs/kit';
import { canEditGame } from '#lib/server/game-access.ts';
import { translateGameDescriptionInBackground } from '#lib/server/game-description-fr.ts';
import {
  acceptSubmission,
  cancelSubmission,
  listSubmissions,
  NOTE_MAX_LENGTH,
  rejectSubmission,
} from '#lib/server/game-submission.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
  if (!locals.user) error(401, 'Non connecté');

  return {
    ...(await listSubmissions(locals.user)),
    submitted: url.searchParams.get('notice') === 'submitted',
    noteMaxLength: NOTE_MAX_LENGTH,
  };
};

//? Accepter ou refuser demande le droit de modifier les jeux : celui qui dispense de soumettre.
const review = async (
  locals: App.Locals,
  request: Request,
  decide: typeof acceptSubmission,
) => {
  if (!locals.user) error(401, 'Non connecté');
  if (!canEditGame(locals.user)) error(403, 'Accès refusé');

  const data = await request.formData();
  const note = String(data.get('note') ?? '').trim();
  if (note.length > NOTE_MAX_LENGTH) {
    return fail(400, {
      message: `Le message ne peut pas dépasser ${NOTE_MAX_LENGTH} caractères.`,
    });
  }

  const result = await decide(
    String(data.get('id') ?? ''),
    locals.user,
    note || null,
  );
  if (!result.ok) return fail(result.status, { message: result.message });

  //? Comme à la création : sans description française saisie, elle est traduite en arrière-plan.
  if (result.gameId !== null && result.description) {
    translateGameDescriptionInBackground(result.gameId, result.description);
  }

  return { done: true };
};

export const actions: Actions = {
  accept: ({ locals, request }) => review(locals, request, acceptSubmission),
  reject: ({ locals, request }) => review(locals, request, rejectSubmission),

  cancel: async ({ locals, request }) => {
    if (!locals.user) error(401, 'Non connecté');

    const data = await request.formData();
    if (!(await cancelSubmission(String(data.get('id') ?? ''), locals.user))) {
      return fail(409, {
        message:
          'Cette soumission a déjà été traitée : elle ne se retire plus.',
      });
    }

    return { done: true };
  },
};
