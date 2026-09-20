import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = ({ locals }) => ({
  user: locals.user,
  //? Renseigné quand on navigue en tant qu'un autre : de quoi afficher le bandeau de retour.
  impersonator: locals.impersonator
    ? { id: locals.impersonator.id, name: locals.impersonator.name }
    : null,
});
