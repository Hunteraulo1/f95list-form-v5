import { redirect } from '@sveltejs/kit';
import { Impersonation, orm } from '$lib/server/db';
import { logger } from '$lib/server/logger';
import type { RequestHandler } from './$types';

//? Revient à son propre compte. Volontairement sans aucune vérification de permission : le compte
//? dont on a pris la place peut n'avoir aucun droit, et la sortie doit toujours rester possible.
export const POST: RequestHandler = async ({ locals }) => {
  if (locals.impersonator) {
    await orm.em.nativeDelete(Impersonation, { user: locals.impersonator.id });
    logger.info(
      { userId: locals.impersonator.id, targetId: locals.user?.id },
      'prise de place terminée',
    );
  }

  redirect(303, '/admin/users');
};
