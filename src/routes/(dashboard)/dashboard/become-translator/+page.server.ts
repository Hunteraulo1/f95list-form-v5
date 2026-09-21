import { error, fail } from '@sveltejs/kit';
import { orm, Role, User } from '$lib/server/db';
import { logger } from '$lib/server/logger';
import {
  TRANSLATOR_RULES,
  TRANSLATOR_RULES_VERSION,
} from '$lib/translator-rules';
import type { Actions, PageServerLoad } from './$types';

const TRANSLATOR_ROLE = 'translator';

//? Peut demander : un rôle plus faible que celui de traducteur. On ne rétrograde jamais personne.
const loadTranslatorRole = async (locals: App.Locals) => {
  if (!locals.user) error(401, 'Non connecté');

  const role = await orm.em.findOne(Role, { name: TRANSLATOR_ROLE });
  if (!role) error(500, 'Rôle « translator » introuvable.');

  return { role, eligible: locals.user.role.priority < role.priority };
};

export const load: PageServerLoad = async ({ locals }) => {
  const { role, eligible } = await loadTranslatorRole(locals);

  return {
    eligible,
    roleLabel: locals.user?.role.label ?? '',
    translatorLabel: role.label,
    rules: TRANSLATOR_RULES,
  };
};

export const actions: Actions = {
  accept: async ({ locals, request }) => {
    const { role, eligible } = await loadTranslatorRole(locals);
    if (!locals.user) error(401, 'Non connecté');

    //? Changer de rôle en naviguant en tant qu'un autre compte serait le faire à sa place.
    if (locals.impersonator) {
      return fail(403, {
        error:
          "Impossible de faire cette demande en naviguant en tant qu'un autre compte.",
      });
    }
    if (!eligible) {
      return fail(400, { error: 'Tu as déjà un rôle égal ou supérieur.' });
    }

    //? Chaque règle doit être cochée : on ne se fie pas au bouton désactivé côté page.
    const accepted = new Set(
      (await request.formData()).getAll('rules').map(String),
    );
    if (!TRANSLATOR_RULES.every((rule) => accepted.has(rule.id))) {
      return fail(400, { error: 'Tu dois accepter toutes les règles.' });
    }

    //? Le rôle de la session peut avoir changé depuis (promotion par un admin) : la condition est dans
    //? l'UPDATE lui-même pour qu'un compte promu entre-temps ne soit pas rétrogradé.
    const weakerRoles = await orm.em.find(Role, {
      priority: { $lt: role.priority },
    });
    const updated = await orm.em.nativeUpdate(
      User,
      { id: locals.user.id, role: { $in: weakerRoles.map(({ id }) => id) } },
      {
        role: role.id,
        translatorRulesAcceptedAt: new Date(),
        translatorRulesVersion: TRANSLATOR_RULES_VERSION,
      },
    );
    if (updated === 0) {
      return fail(409, {
        error:
          'Ton rôle a changé entre-temps ou ton compte est introuvable : recharge la page.',
      });
    }

    logger.info(
      { userId: locals.user.id, rulesVersion: TRANSLATOR_RULES_VERSION },
      'compte devenu traducteur',
    );

    return { accepted: true };
  },
};
