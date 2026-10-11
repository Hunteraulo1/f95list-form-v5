import { error, fail, redirect } from '@sveltejs/kit';
import {
  EMAIL_MAX_LENGTH,
  EMAIL_PATTERN,
  USER_NAME_MAX_LENGTH,
} from '#lib/profile.ts';
import { confirmAge } from '#lib/server/age-gate.ts';
import {
  type AccountCreation,
  createAccount,
  readPasswordPolicy,
} from '#lib/server/auth/zitadel-account.ts';
import { serviceConfig } from '#lib/server/auth/zitadel-service.ts';
import { orm, User } from '#lib/server/db/index.ts';
import { logger } from '#lib/server/logger.ts';
import { checkNameSlug } from '#lib/server/slug.ts';
import type { Actions, PageServerLoad } from './$types';

//? Inscription : elle se fait ici et non sur l'écran de Zitadel, qui demanderait un prénom et un
//? nom. Le compte est créé chez Zitadel ; son compte local naît à sa première connexion.
export const load: PageServerLoad = async ({ locals }) => {
  if (locals.user) redirect(303, '/dashboard');

  const config = serviceConfig();
  if (!config) error(503, "L'inscription n'est pas configurée sur ce serveur.");

  return { passwordPolicy: await readPasswordPolicy(config) };
};

export const actions: Actions = {
  default: async ({ cookies, locals, request, url }) => {
    if (locals.user) redirect(303, '/dashboard');

    const config = serviceConfig();
    if (!config)
      error(503, "L'inscription n'est pas configurée sur ce serveur.");

    const form = await request.formData();
    const pseudo = String(form.get('pseudo') ?? '').trim();
    const email = String(form.get('email') ?? '').trim();
    const password = String(form.get('password') ?? '');
    //? Renvoyés au formulaire en cas d'erreur, pour ne pas tout ressaisir (jamais le mot de passe).
    const values = { pseudo, email };

    //? Case à cocher : absente du formulaire quand elle est décochée.
    if (!form.has('adult')) {
      return fail(400, {
        ...values,
        message: 'Tu dois certifier avoir 18 ans ou plus pour créer un compte.',
      });
    }
    if (!pseudo || pseudo.length > USER_NAME_MAX_LENGTH) {
      return fail(400, {
        ...values,
        message: `Le pseudo est requis (${USER_NAME_MAX_LENGTH} caractères max).`,
      });
    }
    if (!EMAIL_PATTERN.test(email) || email.length > EMAIL_MAX_LENGTH) {
      return fail(400, { ...values, message: 'Adresse e-mail invalide.' });
    }
    if (!password) {
      return fail(400, { ...values, message: 'Le mot de passe est requis.' });
    }
    if (password !== String(form.get('confirm') ?? '')) {
      return fail(400, {
        ...values,
        message: 'Les deux saisies du mot de passe ne correspondent pas.',
      });
    }

    //? Mêmes règles que le changement de pseudo : il doit être libre ici, et donner un lien de
    //? profil libre. La collation ignore la casse et les accents.
    if ((await orm.em.count(User, { name: pseudo })) > 0) {
      return fail(409, {
        ...values,
        message:
          "Ce pseudo est déjà pris. Si c'est ton compte de l'ancien site, ne te réinscris pas : utilise « Mot de passe oublié » sur la page de connexion pour le retrouver.",
      });
    }
    const slug = await checkNameSlug(pseudo);
    if (!slug.ok) return fail(409, { ...values, message: slug.message });

    let result: AccountCreation;
    try {
      result = await createAccount(
        config,
        { pseudo, email, password },
        url.origin,
      );
    } catch (cause) {
      logger.warn({ err: cause }, 'inscription échouée');

      return fail(502, {
        ...values,
        message: "L'inscription a échoué : réessaie dans un instant.",
      });
    }

    if (!result.ok) {
      return fail(400, {
        ...values,
        message:
          result.reason === 'taken'
            ? 'Ce pseudo est déjà pris.'
            : 'Le mot de passe ne respecte pas les règles indiquées.',
      });
    }

    //? L'âge vient d'être certifié : inutile de le redemander sur cet appareil.
    confirmAge(cookies, url);
    logger.info({ zitadelId: result.zitadelId }, 'compte inscrit');

    return { created: true, pseudo };
  },
};
