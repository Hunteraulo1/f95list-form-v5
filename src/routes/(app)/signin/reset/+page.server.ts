import { error, fail, redirect } from '@sveltejs/kit';
import { readPasswordPolicy } from '#lib/server/auth/zitadel-account.ts';
import {
  findUserId,
  requestPasswordReset,
  resetPassword,
} from '#lib/server/auth/zitadel-login.ts';
import {
  type ServiceConfig,
  serviceConfig,
} from '#lib/server/auth/zitadel-service.ts';
import { logger } from '#lib/server/logger.ts';
import type { Actions, PageServerLoad } from './$types';

const requireConfig = (): ServiceConfig => {
  const config = serviceConfig();
  if (!config) error(503, "La connexion n'est pas configurée sur ce serveur.");

  return config;
};

//? Mot de passe oublié. Sans paramètres : on demande l'e-mail de réinitialisation. Avec `userId` et
//? `code` (le lien reçu par e-mail) : on choisit le nouveau mot de passe.
export const load: PageServerLoad = async ({ url }) => {
  const config = requireConfig();
  const userId = url.searchParams.get('userId');
  const code = url.searchParams.get('code');

  return {
    link: userId && code ? { userId, code } : null,
    passwordPolicy: await readPasswordPolicy(config),
  };
};

export const actions: Actions = {
  request: async ({ request, url }) => {
    const config = requireConfig();
    const login = String((await request.formData()).get('login') ?? '').trim();
    if (!login) {
      return fail(400, { message: 'Indique ton pseudo ou ton e-mail.' });
    }

    try {
      const userId = await findUserId(config, login);
      if (userId) {
        await requestPasswordReset(
          config,
          userId,
          `${url.origin}/signin/reset?userId={{.UserID}}&code={{.Code}}`,
        );
        logger.info({ zitadelId: userId }, 'réinitialisation demandée');
      }
    } catch (cause) {
      logger.warn({ err: cause }, 'réinitialisation non envoyée');
    }

    //? Même réponse que le compte existe ou non : rien ne dit qui est inscrit.
    return { sent: true };
  },

  set: async ({ request }) => {
    const config = requireConfig();
    const form = await request.formData();
    const userId = String(form.get('userId') ?? '');
    const code = String(form.get('code') ?? '');
    const password = String(form.get('password') ?? '');

    if (!/^\d+$/.test(userId) || !code) {
      return fail(400, { message: 'Lien de réinitialisation invalide.' });
    }
    if (!password) {
      return fail(400, { message: 'Le nouveau mot de passe est requis.' });
    }
    if (password !== String(form.get('confirm') ?? '')) {
      return fail(400, {
        message: 'Les deux saisies du mot de passe ne correspondent pas.',
      });
    }

    const result = await resetPassword(config, userId, code, password);
    if (!result.ok) {
      return fail(400, {
        message:
          result.reason === 'policy'
            ? 'Le mot de passe ne respecte pas les règles indiquées.'
            : 'Ce lien de réinitialisation est invalide ou a expiré : demandes-en un nouveau.',
      });
    }

    logger.info({ zitadelId: userId }, 'mot de passe réinitialisé');

    //? La page de connexion demandera une nouvelle connexion (voir sa remarque `password_reset`).
    redirect(303, '/auth/login');
  },
};
