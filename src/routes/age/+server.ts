import { redirect } from '@sveltejs/kit';
import { confirmAge } from '#lib/server/age-gate.ts';
import { safeRedirect } from '#lib/server/safe-redirect.ts';
import type { RequestHandler } from './$types';

//? Réponse à la fenêtre de confirmation d'âge du layout racine : retient la confirmation sur
//? l'appareil, puis ramène sur la page d'où elle vient.
export const POST: RequestHandler = ({ cookies, url }) => {
  confirmAge(cookies, url);

  redirect(303, safeRedirect(url.searchParams.get('redirectTo'), '/'));
};
