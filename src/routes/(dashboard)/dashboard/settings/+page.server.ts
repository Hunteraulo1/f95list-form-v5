import { UniqueConstraintViolationException } from '@mikro-orm/core';
import { error, fail } from '@sveltejs/kit';
import {
  DISCORD_ID_PATTERN,
  THEME_PREFERENCES,
  USER_NAME_MAX_LENGTH,
} from '#lib/profile.ts';
import { orm, User } from '#lib/server/db/index.ts';
import { logger } from '#lib/server/logger.ts';
import { checkNameSlug } from '#lib/server/slug.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = ({ locals }) => {
  if (!locals.user) error(401, 'Non connecté');

  return {
    settings: {
      name: locals.user.name,
      slug: locals.user.slug,
      email: locals.user.email,
      discord: locals.user.discord,
      theme: locals.user.theme,
      discordNotification: locals.user.discordNotification,
    },
  };
};

type Section = 'account' | 'preferences';

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
    }

    user.name = name;
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
