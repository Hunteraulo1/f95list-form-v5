import type {
  FieldErrors,
  TranslationQuality,
  TranslationType,
} from '#lib/games/game-form.ts';
import { translationShape } from '#lib/games/game-form.ts';
import {
  GameTranslation,
  GameTranslationFile,
  GameTranslationTranslator,
  orm,
} from '#lib/server/db/index.ts';
import {
  type PersonRef,
  parseTranslationFields,
  personResolver,
} from '#lib/server/game-create.ts';
import type { SessionUser } from '#lib/server/hooks/auth.ts';
import { logger } from '#lib/server/logger.ts';

export interface UpdateTranslationInput {
  type: TranslationType;
  quality: TranslationQuality;
  version: string;
  link: string | null;
  translators: PersonRef[];
  proofreaders: PersonRef[];
}

export type ParsedTranslationEditForm =
  | { ok: true; input: UpdateTranslationInput }
  | { ok: false; errors: FieldErrors };

type Credit = GameTranslationTranslator;

//? Un crédit anonyme d'une autre personne n'est ni montré ni modifiable dans le formulaire (son
//? nom n'a pas à être révélé à qui modifie la traduction) : il est toujours conservé tel quel.
export const isHiddenCredit = (credit: Credit, viewerId: string) =>
  credit.anonymous && credit.user.id !== viewerId;

//? Lit et valide le formulaire « Modifier la traduction » avec les règles de la création.
//? `translation` doit être chargée avec ses crédits (`gameTranslationTranslators`).
export const parseTranslationEditForm = async (
  data: FormData,
  viewer: SessionUser,
  translation: GameTranslation,
): Promise<ParsedTranslationEditForm> => {
  const errors: FieldErrors = {};

  const keptTranslators = translation.gameTranslationTranslators
    .getItems()
    .filter(
      (credit) =>
        isHiddenCredit(credit, viewer.id) && credit.type !== 'proofreader',
    ).length;

  const { type, quality, ...fields } = await parseTranslationFields(
    data,
    viewer,
    errors,
    { keptTranslators },
  );

  if (Object.keys(errors).length > 0 || !type || !quality) {
    return { ok: false, errors };
  }

  return { ok: true, input: { type, quality, ...fields } };
};

//? Enregistre la traduction, son fichier et ses crédits d'un seul tenant : tout ou rien.
export const updateTranslation = async (
  translationId: string,
  input: UpdateTranslationInput,
  viewer: SessionUser,
) =>
  orm.em.transactional(async (em) => {
    const translation = await em.findOneOrFail(
      GameTranslation,
      { id: translationId },
      { populate: ['gameTranslationFiles', 'gameTranslationTranslators'] },
    );

    translation.type = input.type;
    translation.quality = input.quality;
    translation.version = input.version;

    //? Le fichier actif suit la traduction (même version, lien de téléchargement) ; le lien hébergé
    //? chez nous n'est pas concerné.
    const file = translation.gameTranslationFiles
      .getItems()
      .find(({ active }) => active);
    if (file) {
      file.version = input.version;
      file.externalLink = input.link;
    } else {
      em.create(GameTranslationFile, {
        gameTranslation: translation,
        version: input.version,
        active: true,
        externalLink: input.link,
        internalLink: null,
      });
    }

    // --- crédits : ceux qui restent gardent leurs réglages (anonymat, alertes)
    const keepHidden = translationShape(input.type).translators !== 'none';
    const resolve = await personResolver(
      em,
      input.translators.length + input.proofreaders.length > 0,
    );

    const wanted = new Map<string, 'translator' | 'proofreader'>();
    for (const [refs, type] of [
      [input.translators, 'translator'],
      [input.proofreaders, 'proofreader'],
    ] as const) {
      for (const ref of refs) {
        const user = await resolve(ref);
        //? Deux noms différents peuvent mener au même compte : le premier rôle l'emporte.
        if (!wanted.has(user.id)) wanted.set(user.id, type);
      }
    }
    //? Un compte fantôme tout juste créé n'a d'identifiant qu'une fois écrit en base.
    await em.flush();

    for (const credit of translation.gameTranslationTranslators.getItems()) {
      if (keepHidden && isHiddenCredit(credit, viewer.id)) {
        wanted.delete(credit.user.id);
        continue;
      }

      const type = wanted.get(credit.user.id);
      if (type) {
        credit.type = type;
        wanted.delete(credit.user.id);
      } else {
        em.remove(credit);
      }
    }
    for (const [userId, type] of wanted) {
      em.create(GameTranslationTranslator, {
        gameTranslation: translation,
        user: userId,
        type,
      });
    }

    await em.flush();
    logger.info(
      { translationId: translation.id, userId: viewer.id },
      'traduction modifiée',
    );
  });
