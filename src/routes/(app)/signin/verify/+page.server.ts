import { error } from '@sveltejs/kit';
import { verifyEmail } from '#lib/server/auth/zitadel-login.ts';
import { serviceConfig } from '#lib/server/auth/zitadel-service.ts';
import type { PageServerLoad } from './$types';

//? Lien de vérification reçu par e-mail (inscription, changement d'adresse) : confirme l'adresse.
export const load: PageServerLoad = async ({ url }) => {
  const config = serviceConfig();
  if (!config) error(503, "La connexion n'est pas configurée sur ce serveur.");

  const userId = url.searchParams.get('userId') ?? '';
  const code = url.searchParams.get('code') ?? '';

  return {
    verified:
      /^\d+$/.test(userId) && code !== ''
        ? await verifyEmail(config, userId, code)
        : false,
  };
};
