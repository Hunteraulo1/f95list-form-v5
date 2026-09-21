import { GameTranslationTranslator, orm, Role } from '$lib/server/db';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
  //? « Mes traductions » n'a d'intérêt que pour qui peut en ajouter ou en a déjà (par exemple retiré
  //? du rôle traducteur depuis) : sinon la question n'est même pas posée à la base.
  const canAddTranslation =
    locals.user?.permissions.includes('translation.add') ?? false;

  //? Même règle que la page « Devenir traducteur » : réservée aux rôles plus faibles que traducteur.
  const translatorRole = locals.user
    ? await orm.em.findOne(Role, { name: 'translator' })
    : null;

  return {
    canBecomeTranslator:
      !!locals.user &&
      !!translatorRole &&
      locals.user.role.priority < translatorRole.priority,
    hasTranslations:
      canAddTranslation ||
      (locals.user
        ? (await orm.em.count(GameTranslationTranslator, {
            user: locals.user.id,
          })) > 0
        : false),
  };
};
