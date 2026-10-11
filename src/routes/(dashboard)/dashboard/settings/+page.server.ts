import { UniqueConstraintViolationException } from '@mikro-orm/core';
import { error, fail } from '@sveltejs/kit';
import QRCode from 'qrcode';
import {
  DISCORD_ID_PATTERN,
  EMAIL_MAX_LENGTH,
  EMAIL_PATTERN,
  THEME_PREFERENCES,
  USER_NAME_MAX_LENGTH,
} from '#lib/profile.ts';
import {
  discordConfig,
  syncDiscordFromZitadel,
} from '#lib/server/auth/discord.ts';
import {
  type AccountSecurity,
  changeEmail,
  changePassword,
  hasPassword,
  type IdpLink,
  type PasswordChange,
  type PasswordPolicy,
  readAccount,
  readIdpLink,
  readPasswordPolicy,
  readSecurity,
  removeIdpLink,
  removeSecurityKey,
  removeTotp,
  startSecurityKey,
  startTotp,
  updatePseudo,
  verifySecurityKey,
  verifyTotp,
} from '#lib/server/auth/zitadel-account.ts';
import {
  isLinkedToZitadel,
  serviceConfig,
} from '#lib/server/auth/zitadel-service.ts';
import { orm, User } from '#lib/server/db/index.ts';
import { logger } from '#lib/server/logger.ts';
import { checkNameSlug } from '#lib/server/slug.ts';
import type { Actions, PageServerLoad } from './$types';

//? Le compte Zitadel de l'utilisateur, quand c'est Zitadel qui détient son pseudo, son e-mail et son
//? mot de passe : compte lié, et compte de service renseigné. Sinon tout reste local, comme avant.
const zitadelAccountOf = (user: Pick<User, 'zitadelId'>) => {
  const config = serviceConfig();

  return config && isLinkedToZitadel(user.zitadelId)
    ? { config, zitadelId: user.zitadelId as string }
    : null;
};

const ZITADEL_DOWN =
  "Zitadel n'a pas pu enregistrer la modification : rien n'a été changé, réessaie dans un instant.";

export const load: PageServerLoad = async ({ locals }) => {
  if (!locals.user) error(401, 'Non connecté');

  const user = await orm.em.findOne(User, { id: locals.user.id });
  const zitadel = user ? zitadelAccountOf(user) : null;

  let email = locals.user.email;
  let account: {
    emailVerified: boolean;
    passwordPolicy: PasswordPolicy;
    security: AccountSecurity;
    //? Un compte créé par Discord n'a pas de mot de passe à changer.
    hasPassword: boolean;
  } | null = null;
  //? Renseigné quand Discord passe par Zitadel : le lien du compte (nul s'il n'y en a pas). Sinon
  //? `undefined`, et l'identifiant Discord se saisit à la main.
  let discordLink: IdpLink | null | undefined;

  if (user && zitadel) {
    try {
      const [remote, passwordPolicy, security, password] = await Promise.all([
        readAccount(zitadel.config, zitadel.zitadelId),
        readPasswordPolicy(zitadel.config),
        readSecurity(zitadel.config, zitadel.zitadelId),
        hasPassword(zitadel.config, zitadel.zitadelId),
      ]);

      //? La copie locale ne suit que les adresses vérifiées (voir l'action `email`).
      if (remote.email && remote.emailVerified && remote.email !== user.email) {
        user.email = remote.email;
        await orm.em.flush();
      }

      email = remote.email;
      account = {
        emailVerified: remote.emailVerified,
        passwordPolicy,
        security,
        hasPassword: password,
      };

      if (discordConfig()) discordLink = await syncDiscordFromZitadel(user);
    } catch (cause) {
      //? Zitadel injoignable : la page s'affiche quand même, sans ce qu'il gère.
      logger.warn({ err: cause, userId: user.id }, 'compte Zitadel illisible');
    }
  }

  return {
    settings: {
      name: locals.user.name,
      slug: locals.user.slug,
      email,
      discord: discordLink?.userId ?? locals.user.discord,
      theme: locals.user.theme,
      discordNotification: locals.user.discordNotification,
    },
    //? Nul quand l'e-mail et le mot de passe ne se gèrent pas ici (compte non lié à Zitadel).
    account,
    discordLink,
  };
};

type Section =
  | 'account'
  | 'discord'
  | 'email'
  | 'password'
  | 'totp'
  | 'keys'
  | 'preferences';

const KEY_NAME_MAX_LENGTH = 64;

//? Chacun ne modifie que ses propres paramètres : le compte est toujours celui de la session.
const loadOwnUser = async (locals: App.Locals, section: Section) => {
  if (!locals.user) error(401, 'Non connecté');

  //? Modifier les paramètres d'un compte emprunté serait une modification faite à sa place.
  if (locals.impersonator) {
    return fail(403, {
      section,
      message:
        "Impossible de modifier les paramètres en naviguant en tant qu'un autre compte.",
    });
  }

  const user = await orm.em.findOne(User, { id: locals.user.id });
  if (!user) return fail(404, { section, message: 'Compte introuvable.' });

  return user;
};

//? Enveloppe des actions qui ne font qu'appeler Zitadel pour le compte de la session : mêmes refus
//? (non connecté, compte emprunté, compte non lié) et même message si Zitadel ne répond pas.
const withZitadel = async <T>(
  locals: App.Locals,
  section: Section,
  run: (
    zitadel: NonNullable<ReturnType<typeof zitadelAccountOf>>,
    user: User,
  ) => Promise<T>,
) => {
  const user = await loadOwnUser(locals, section);
  if (!(user instanceof User)) return user;

  const zitadel = zitadelAccountOf(user);
  if (!zitadel) {
    return fail(400, {
      section,
      message: 'La sécurité de ce compte ne se règle pas ici.',
    });
  }

  try {
    return await run(zitadel, user);
  } catch (cause) {
    logger.warn(
      { err: cause, userId: user.id, section },
      'appel Zitadel échoué',
    );

    return fail(502, { section, message: ZITADEL_DOWN });
  }
};

export const actions: Actions = {
  account: async ({ locals, request }) => {
    const section = 'account';
    const user = await loadOwnUser(locals, section);
    if (!(user instanceof User)) return user;

    const form = await request.formData();
    const name = String(form.get('name') ?? '').trim();
    const discord = String(form.get('discord') ?? '').trim();

    if (!name || name.length > USER_NAME_MAX_LENGTH) {
      return fail(400, {
        section,
        message: `Le pseudo est requis (${USER_NAME_MAX_LENGTH} caractères max).`,
      });
    }
    if (discord && !DISCORD_ID_PATTERN.test(discord)) {
      return fail(400, {
        section,
        message: "L'identifiant Discord doit être numérique (5 à 32 chiffres).",
      });
    }

    //? La collation est insensible à la casse et aux accents : « Rémi » et « remi » sont en conflit.
    const duplicate = await orm.em.findOne(User, {
      name,
      id: { $ne: user.id },
    });
    if (duplicate) {
      return fail(409, {
        section,
        message: 'Un utilisateur porte déjà ce pseudo.',
      });
    }

    //? Le pseudo donne le slug de l'adresse du profil : il doit être libre. Le slug ne change que
    //? si le pseudo change.
    const previousName = user.name;
    if (name !== previousName) {
      const check = await checkNameSlug(name, user.id);
      if (!check.ok) return fail(409, { section, message: check.message });

      user.slug = check.slug;

      //? Le pseudo est commun à tous les services : il change d'abord chez Zitadel, puis ici.
      const zitadel = zitadelAccountOf(user);
      if (zitadel) {
        try {
          await updatePseudo(zitadel.config, zitadel.zitadelId, name);
        } catch (cause) {
          logger.warn(
            { err: cause, userId: user.id },
            'pseudo Zitadel non modifié',
          );

          return fail(502, { section, message: ZITADEL_DOWN });
        }
      }
    }

    user.name = name;
    //? Quand Discord passe par Zitadel, l'identifiant vient du compte lié, pas de ce formulaire.
    if (!(discordConfig() && zitadelAccountOf(user)))
      user.discord = discord || null;

    try {
      await orm.em.flush();
    } catch (cause) {
      //? Course : un autre compte a pris ce slug entre la vérification et l'enregistrement.
      if (cause instanceof UniqueConstraintViolationException) {
        return fail(409, {
          section,
          message: "Ce lien de profil vient d'être pris par un autre compte.",
        });
      }

      throw cause;
    }

    if (name !== previousName) {
      logger.info(
        { userId: user.id, from: previousName, to: name },
        'pseudo modifié par son propriétaire',
      );
    }

    return { saved: section };
  },

  email: async ({ locals, request, url }) => {
    const section = 'email';
    const user = await loadOwnUser(locals, section);
    if (!(user instanceof User)) return user;

    const zitadel = zitadelAccountOf(user);
    if (!zitadel) {
      return fail(400, {
        section,
        message: "L'e-mail de ce compte ne se modifie pas ici.",
      });
    }

    const email = String((await request.formData()).get('email') ?? '').trim();
    if (!EMAIL_PATTERN.test(email) || email.length > EMAIL_MAX_LENGTH) {
      return fail(400, { section, message: 'Adresse e-mail invalide.' });
    }

    try {
      await changeEmail(zitadel.config, zitadel.zitadelId, email, url.origin);
    } catch (cause) {
      logger.warn(
        { err: cause, userId: user.id },
        'e-mail Zitadel non modifié',
      );

      return fail(502, { section, message: ZITADEL_DOWN });
    }

    //? La copie locale attend la vérification : elle est mise à jour au chargement de la page une
    //? fois le lien reçu par e-mail suivi.
    logger.info({ userId: user.id }, "changement d'e-mail demandé");

    return { saved: section };
  },

  password: async ({ locals, request }) => {
    const section = 'password';
    const user = await loadOwnUser(locals, section);
    if (!(user instanceof User)) return user;

    const zitadel = zitadelAccountOf(user);
    if (!zitadel) {
      return fail(400, {
        section,
        message: 'Le mot de passe de ce compte ne se modifie pas ici.',
      });
    }

    const form = await request.formData();
    const current = String(form.get('current') ?? '');
    const next = String(form.get('next') ?? '');

    if (!current || !next) {
      return fail(400, {
        section,
        message: 'Le mot de passe actuel et le nouveau sont requis.',
      });
    }
    if (next !== String(form.get('confirm') ?? '')) {
      return fail(400, {
        section,
        message:
          'Les deux saisies du nouveau mot de passe ne correspondent pas.',
      });
    }

    let result: PasswordChange;
    try {
      result = await changePassword(
        zitadel.config,
        zitadel.zitadelId,
        current,
        next,
      );
    } catch (cause) {
      logger.warn({ err: cause, userId: user.id }, 'mot de passe non modifié');

      return fail(502, { section, message: ZITADEL_DOWN });
    }

    if (!result.ok) {
      return fail(400, {
        section,
        message:
          result.reason === 'wrong_current'
            ? 'Le mot de passe actuel est incorrect.'
            : result.reason === 'locked'
              ? 'Compte verrouillé après trop de tentatives : réessaie plus tard.'
              : 'Le nouveau mot de passe ne respecte pas les règles ci-dessus.',
      });
    }

    logger.info({ userId: user.id }, 'mot de passe modifié');

    return { saved: section };
  },

  // --- compte Discord (fournisseur d'identité de Zitadel)
  discordUnlink: ({ locals }) => {
    const discord = discordConfig();
    if (!discord) {
      return fail(400, {
        section: 'discord' as const,
        message: "La connexion par Discord n'est pas configurée.",
      });
    }

    return withZitadel(
      locals,
      'discord',
      async ({ config, zitadelId }, user) => {
        const link = await readIdpLink(config, zitadelId, discord.idpId);
        if (!link) return { removed: 'discord' as const };

        //? Sans mot de passe, Discord est le seul moyen de se connecter : le délier fermerait le compte.
        if (!(await hasPassword(config, zitadelId))) {
          return fail(400, {
            section: 'discord' as const,
            message:
              'Discord est ton seul moyen de connexion : impossible de le délier sans mot de passe sur le compte.',
          });
        }

        await removeIdpLink(config, zitadelId, discord.idpId, link.userId);
        user.discord = null;
        await orm.em.flush();
        logger.info({ userId: user.id }, 'compte Discord délié');

        return { removed: 'discord' as const };
      },
    );
  },

  // --- double authentification
  totpStart: ({ locals }) =>
    withZitadel(locals, 'totp', async ({ config, zitadelId }) => {
      const { uri, secret } = await startTotp(config, zitadelId);

      //? Le secret ne sort que dans cette réponse : il n'est gardé nulle part côté serveur.
      return {
        totp: {
          secret,
          qr: await QRCode.toDataURL(uri, { margin: 1, width: 220 }),
        },
      };
    }),

  totpVerify: async ({ locals, request }) => {
    const code = String((await request.formData()).get('code') ?? '').replace(
      /\s/g,
      '',
    );

    return withZitadel(locals, 'totp', async ({ config, zitadelId }, user) => {
      if (
        !/^\d{6}$/.test(code) ||
        !(await verifyTotp(config, zitadelId, code))
      ) {
        return fail(400, {
          section: 'totp' as const,
          message:
            "Code incorrect : saisis le code à 6 chiffres affiché par l'application.",
        });
      }

      logger.info(
        { userId: user.id },
        "application d'authentification activée",
      );

      return { saved: 'totp' as const };
    });
  },

  totpRemove: ({ locals }) =>
    withZitadel(locals, 'totp', async ({ config, zitadelId }, user) => {
      await removeTotp(config, zitadelId);
      logger.info(
        { userId: user.id },
        "application d'authentification retirée",
      );

      return { removed: 'totp' as const };
    }),

  keyStart: ({ locals, url }) =>
    withZitadel(locals, 'keys', async ({ config, zitadelId }) => ({
      //? La clé servira sur l'écran de connexion, tenu par le panel : c'est son domaine qu'elle retient.
      key: await startSecurityKey(config, zitadelId, url.hostname),
    })),

  keyVerify: async ({ locals, request }) => {
    const form = await request.formData();
    const keyId = String(form.get('id') ?? '');
    const name =
      String(form.get('name') ?? '')
        .trim()
        .slice(0, KEY_NAME_MAX_LENGTH) || 'Clé de sécurité';

    let credential: unknown;
    try {
      credential = JSON.parse(String(form.get('credential') ?? ''));
    } catch {
      credential = null;
    }
    if (!/^\d+$/.test(keyId) || !credential || typeof credential !== 'object') {
      return fail(400, {
        section: 'keys' as const,
        message: 'La réponse de la clé de sécurité est illisible : réessaie.',
      });
    }

    return withZitadel(locals, 'keys', async ({ config, zitadelId }, user) => {
      await verifySecurityKey(config, zitadelId, keyId, credential, name);
      logger.info({ userId: user.id }, 'clé de sécurité ajoutée');

      return { saved: 'keys' as const };
    });
  },

  keyRemove: async ({ locals, request }) => {
    const keyId = String((await request.formData()).get('id') ?? '');
    if (!/^\d+$/.test(keyId)) {
      return fail(400, { section: 'keys' as const, message: 'Clé inconnue.' });
    }

    return withZitadel(locals, 'keys', async ({ config, zitadelId }, user) => {
      await removeSecurityKey(config, zitadelId, keyId);
      logger.info({ userId: user.id }, 'clé de sécurité retirée');

      return { removed: 'keys' as const };
    });
  },

  preferences: async ({ locals, request }) => {
    const section = 'preferences';
    const user = await loadOwnUser(locals, section);
    if (!(user instanceof User)) return user;

    const form = await request.formData();
    const theme = THEME_PREFERENCES.find(
      (value) => value === form.get('theme'),
    );
    if (!theme) return fail(400, { section, message: 'Thème invalide.' });

    user.theme = theme;
    //? Case à cocher : absente du formulaire quand elle est décochée.
    user.discordNotification = form.has('discordNotification');
    await orm.em.flush();

    return { saved: section, theme };
  },
};
