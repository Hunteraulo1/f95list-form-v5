import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

//? Tableau de bord et administration demandent d'être connecté : sinon, direction la connexion,
//? puis retour à la page demandée.
export const load: LayoutServerLoad = ({ locals, url }) => {
  if (!locals.user) {
    redirect(
      303,
      `/auth/login?redirectTo=${encodeURIComponent(url.pathname + url.search)}`,
    );
  }
};
