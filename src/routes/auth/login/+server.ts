import { error, redirect } from '@sveltejs/kit';
import {
  authorizeUrl,
  randomToken,
  zitadelConfig,
} from '#lib/server/auth/zitadel.ts';
import type { RequestHandler } from './$types';

//? Tentative de connexion en cours : gardée dix minutes dans un cookie, le temps de l'aller-retour
//? chez Zitadel (voir `/auth/callback`).
const ATTEMPT_COOKIE = 'auth_attempt';

//? Page où revenir après la connexion : une adresse interne uniquement, jamais un autre site.
const safeRedirect = (value: string | null) =>
  value?.startsWith('/') && !value.startsWith('//') && !value.includes('\\')
    ? value
    : '/dashboard';

export const GET: RequestHandler = ({ cookies, locals, url }) => {
  const redirectTo = safeRedirect(url.searchParams.get('redirectTo'));
  if (locals.user) redirect(303, redirectTo);

  const config = zitadelConfig();
  if (!config) error(503, "La connexion n'est pas configurée sur ce serveur.");

  const attempt = { state: randomToken(), verifier: randomToken() };
  cookies.set(ATTEMPT_COOKIE, JSON.stringify({ ...attempt, redirectTo }), {
    path: '/auth',
    httpOnly: true,
    sameSite: 'lax',
    secure: url.protocol === 'https:',
    maxAge: 600,
  });

  //? Seul Zitadel est une destination permise hors du site.
  redirect(303, authorizeUrl(config, url.origin, attempt), {
    external: [config.domain],
  });
};
