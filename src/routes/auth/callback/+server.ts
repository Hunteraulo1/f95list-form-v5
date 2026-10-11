import { error, redirect } from '@sveltejs/kit';
import { createSession, findOrCreateUser } from '#lib/server/auth/session.ts';
import {
  exchangeCode,
  fetchProfile,
  zitadelConfig,
} from '#lib/server/auth/zitadel.ts';
import { logger } from '#lib/server/logger.ts';
import type { RequestHandler } from './$types';

const ATTEMPT_COOKIE = 'auth_attempt';

interface Attempt {
  state: string;
  verifier: string;
  redirectTo: string;
}

const readAttempt = (raw: string | undefined): Attempt | null => {
  try {
    const value = JSON.parse(raw ?? '') as Partial<Attempt>;

    return typeof value.state === 'string' &&
      typeof value.verifier === 'string' &&
      typeof value.redirectTo === 'string'
      ? (value as Attempt)
      : null;
  } catch {
    return null;
  }
};

//? Retour de Zitadel après la connexion : vérifie que la réponse correspond à la tentative lancée
//? depuis ce navigateur, récupère le compte et ouvre la session.
export const GET: RequestHandler = async ({ cookies, url }) => {
  const config = zitadelConfig();
  if (!config) error(503, "La connexion n'est pas configurée sur ce serveur.");

  const attempt = readAttempt(cookies.get(ATTEMPT_COOKIE));
  cookies.delete(ATTEMPT_COOKIE, { path: '/auth' });

  //? Connexion annulée ou refusée chez Zitadel : retour à l'accueil, sans session.
  if (url.searchParams.has('error')) redirect(303, '/');

  const code = url.searchParams.get('code');
  if (!attempt || !code || url.searchParams.get('state') !== attempt.state) {
    error(400, 'Tentative de connexion invalide ou expirée : réessayez.');
  }

  let userId: string;
  let tokens: Awaited<ReturnType<typeof exchangeCode>>;
  try {
    tokens = await exchangeCode(config, url.origin, code, attempt.verifier);
    userId = (
      await findOrCreateUser(await fetchProfile(config, tokens.accessToken))
    ).id;
  } catch (cause) {
    logger.warn({ err: cause }, 'connexion Zitadel échouée');
    error(502, 'La connexion a échoué : réessayez.');
  }

  await createSession(cookies, url, userId, tokens);
  logger.info({ userId }, 'connexion');

  redirect(303, attempt.redirectTo);
};
