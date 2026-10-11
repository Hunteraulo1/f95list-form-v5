import { hasConfirmedAge } from '#lib/server/age-gate.ts';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = ({ cookies, locals }) => ({
  user: locals.user,
  //? Renseigné quand on navigue en tant qu'un autre : de quoi afficher le bandeau de retour.
  impersonator: locals.impersonator
    ? { id: locals.impersonator.id, name: locals.impersonator.name }
    : null,
  //? Contenu réservé aux adultes : tant que c'est faux, le layout floute la page derrière la fenêtre
  //? de confirmation (voir `+layout.svelte`).
  adultConfirmed: hasConfirmedAge(cookies),
});
