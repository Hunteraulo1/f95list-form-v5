import { redirect } from '@sveltejs/kit';
import {
  clearSsoSession,
  endSession,
  readLogoutToken,
  readSsoSession,
} from '#lib/server/auth/zitadel-login.ts';
import { serviceConfig } from '#lib/server/auth/zitadel-service.ts';
import type { RequestHandler } from './$types';

//? Déconnexion : Zitadel envoie ici le navigateur quand une application le déconnecte, avec un
//? jeton signé qui dit où le renvoyer. On ferme la session Zitadel de ce navigateur.
export const GET: RequestHandler = async ({ cookies, url }) => {
  const config = serviceConfig();
  const session = readSsoSession(cookies);

  if (config && session) await endSession(config, session);
  clearSsoSession(cookies, url);

  const token = url.searchParams.get('logout_token');
  const target = config && token ? await readLogoutToken(config, token) : null;

  //? L'adresse n'est suivie que si le jeton est bien signé par Zitadel ; sinon, retour à l'accueil.
  redirect(303, target ?? '/', { external: true });
};
