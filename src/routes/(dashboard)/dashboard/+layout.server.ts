import { GameTranslationTranslator, orm, Role } from '#lib/server/db/index.ts';
import { submissionCounts } from '#lib/server/game-submission.ts';
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
    //? Soumissions de jeux : les siennes, et celles à traiter pour qui peut modifier les jeux.
    submissions: locals.user
      ? await submissionCounts(locals.user)
      : { visible: false, pending: 0 },
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
