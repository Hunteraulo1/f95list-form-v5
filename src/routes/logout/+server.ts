import { redirect } from '@sveltejs/kit';
import { destroySession } from '#lib/server/auth/session.ts';
import { endSessionUrl, zitadelConfig } from '#lib/server/auth/zitadel.ts';
import { Impersonation, orm } from '#lib/server/db/index.ts';
import type { RequestHandler } from './$types';

//? Ferme la session ici, puis chez Zitadel (sinon « Se connecter » reconnecterait aussitôt).
export const GET: RequestHandler = async ({ cookies, locals, url }) => {
  //? Une prise de place en cours ne survit pas à la déconnexion.
  const realId = locals.impersonator?.id ?? locals.user?.id;
  if (realId) await orm.em.nativeDelete(Impersonation, { user: realId });

  const idToken = await destroySession(cookies, url);
  const config = zitadelConfig();

  if (!config) redirect(303, '/');

  redirect(303, endSessionUrl(config, url.origin, idToken), {
    external: [config.domain],
  });
};
