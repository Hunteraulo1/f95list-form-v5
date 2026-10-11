import type { Cookies } from '@sveltejs/kit';

//? Le site présente du contenu réservé aux adultes : avant toute page, le visiteur confirme avoir
//? 18 ans ou plus (fenêtre du layout racine, qui envoie la réponse à `/age`). C'est une déclaration de sa part, pas une vérification d'âge.
//? Elle est retenue un an sur l'appareil.
const COOKIE = 'adult_confirmed';
const MAX_AGE = 365 * 24 * 60 * 60;

export const hasConfirmedAge = (cookies: Cookies) =>
  cookies.get(COOKIE) === '1';

export const confirmAge = (cookies: Cookies, url: URL) =>
  cookies.set(COOKIE, '1', {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure: url.protocol === 'https:',
    maxAge: MAX_AGE,
  });
