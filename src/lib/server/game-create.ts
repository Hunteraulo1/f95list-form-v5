import {
  DESCRIPTION_MAX_LENGTH,
  EDITION_NAME_MAX_LENGTH,
  EDITION_STATUSES,
  type EditionStatus,
  type FieldErrors,
  GAME_NAME_MAX_LENGTH,
  LINK_MAX_LENGTH,
  parseUserRef,
  parseWebUrl,
  THREAD_ID_MAX,
  TRANSLATION_QUALITIES,
  TRANSLATION_TYPES,
  type TranslationQuality,
  type TranslationType,
  threadBase,
  threadLink,
  translationShape,
  VERSION_MAX_LENGTH,
} from '$lib/games/game-form';
import { parseImageUrl } from '$lib/image-hosts';
import {
  Game,
  GameEdition,
  GameGameTags,
  GameTags,
  GameTranslation,
  GameTranslationFile,
  GameTranslationTranslator,
  OriginWebsite,
  orm,
  Role,
  User,
} from '$lib/server/db';
import { canAddTranslation, canManageAutoCheck } from '$lib/server/game-access';
import type { SessionUser } from '$lib/server/hooks/auth';
import { logger } from '$lib/server/logger';
import { allocateSlug } from '$lib/server/slug';
import { slugBase, slugify } from '$lib/slug';

const USER_NAME_MAX_LENGTH = 64;

export type PersonRef =
  | { kind: 'user'; id: string }
  | { kind: 'new'; name: string };

export interface CreateGameInput {
  game: {
    name: string;
    originId: string;
    link: string;
    threadId: number | null;
    image: string | null;
    description: string | null;
    descriptionFr: string | null;
    autoCheck: boolean;
    tagIds: number[];
  };
  edition: {
    name: string | null;
    version: string;
    status: EditionStatus;
    //? Auto-check de la traduction (éditions), distinct de celui du jeu.
    autoCheck: boolean;
  };
  translation: {
    type: TranslationType;
    quality: TranslationQuality;
    version: string;
    link: string | null;
    translators: PersonRef[];
    proofreaders: PersonRef[];
  };
}

export type ParsedGameForm =
  | { ok: true; input: CreateGameInput }
  | { ok: false; errors: FieldErrors };

const text = (data: FormData, key: string) =>
  String(data.get(key) ?? '').trim();

const oneOf = <T extends string>(values: readonly T[], value: string) =>
  values.find((candidate) => candidate === value);

//? Le staff (droit de gérer les traductions des autres) peut désigner un autre traducteur que soi et
//? créer des comptes fantômes ; les autres sont toujours traducteurs de ce qu'ils créent.
export const isStaff = (viewer: Pick<SessionUser, 'permissions'>) =>
  viewer.permissions.includes('translation.edit_others');

const optionalText = (
  data: FormData,
  key: string,
  max: number,
  label: string,
  errors: FieldErrors,
) => {
  const value = text(data, key);

  if (value.length > max) {
    errors[key] = `${label} : ${max} caractères maximum.`;
    return null;
  }

  return value || null;
};

//? Lit et valide le formulaire. Chaque champ fautif reçoit son message ; rien n'est écrit en base.
export const parseGameForm = async (
  data: FormData,
  viewer: SessionUser,
): Promise<ParsedGameForm> => {
  const errors: FieldErrors = {};
  const staff = isStaff(viewer);

  // --- le jeu
  const name = text(data, 'name');
  if (!name) errors.name = 'Le nom est requis.';
  else if (name.length > GAME_NAME_MAX_LENGTH) {
    errors.name = `Le nom ne peut pas dépasser ${GAME_NAME_MAX_LENGTH} caractères.`;
  }

  const origin = await orm.em.findOne(OriginWebsite, {
    id: text(data, 'originId'),
  });
  if (!origin) errors.originId = "Choisissez le site d'origine.";

  let link = '';
  let threadId: number | null = null;

  if (origin && threadBase(origin.name)) {
    const raw = text(data, 'threadId');
    threadId = /^\d+$/.test(raw) ? Number(raw) : null;

    if (threadId === null || threadId < 1 || threadId > THREAD_ID_MAX) {
      errors.threadId = 'Le numéro du thread est requis (nombre entier).';
      threadId = null;
    } else {
      link = threadLink(origin.name, threadId) ?? '';
    }
  } else if (origin) {
    const parsed = parseWebUrl(text(data, 'link'));
    if (!parsed || parsed.length > LINK_MAX_LENGTH) {
      errors.link = 'Le lien du jeu doit être une adresse http(s) valide.';
    } else {
      link = parsed;
    }
  }

  const imageRaw = text(data, 'image');
  let image: string | null = null;
  if (!imageRaw) {
    //? Tous les jeux des sites à thread ont une image ; ailleurs elle reste facultative.
    if (origin && threadBase(origin.name))
      errors.image = "L'image est requise.";
  } else {
    const parsed = parseImageUrl(imageRaw);
    if (parsed.ok) image = parsed.url;
    else errors.image = parsed.message;
  }

  const description = optionalText(
    data,
    'description',
    DESCRIPTION_MAX_LENGTH,
    'Description',
    errors,
  );
  const descriptionFr = optionalText(
    data,
    'descriptionFr',
    DESCRIPTION_MAX_LENGTH,
    'Description française',
    errors,
  );

  const tagIds = [
    ...new Set(
      data
        .getAll('tags')
        .map(String)
        .filter((value) => /^\d+$/.test(value))
        .map(Number),
    ),
  ];
  if (tagIds.length === 0) errors.tags = 'Choisissez au moins un tag.';
  else if (
    (await orm.em.count(GameTags, { id: { $in: tagIds } })) !== tagIds.length
  ) {
    errors.tags = "Un des tags choisis n'existe pas.";
  }

  //? L'auto-check ne concerne que F95zone. Sans le droit de le choisir, le jeu suit son site
  //? d'origine (activé pour F95zone) et la traduction n'est pas suivie.
  const autoCheckAllowed = origin?.name === 'F95zone';
  const chooseAutoCheck = canManageAutoCheck(viewer);
  const autoCheck =
    autoCheckAllowed &&
    (chooseAutoCheck ? data.get('autoCheck') === 'on' : true);
  const editionAutoCheck =
    chooseAutoCheck && autoCheck && data.get('editionAutoCheck') === 'on';

  // --- l'édition
  const editionName = optionalText(
    data,
    'editionName',
    EDITION_NAME_MAX_LENGTH,
    "Le nom de l'édition",
    errors,
  );
  const editionVersion = text(data, 'editionVersion');
  if (!editionVersion) errors.editionVersion = 'La version du jeu est requise.';
  else if (editionVersion.length > VERSION_MAX_LENGTH) {
    errors.editionVersion = `La version ne peut pas dépasser ${VERSION_MAX_LENGTH} caractères.`;
  }
  const status = oneOf(EDITION_STATUSES, text(data, 'status'));
  if (!status) errors.status = 'Choisissez le statut du jeu.';

  // --- la traduction : sans le droit d'en ajouter, le jeu reçoit « pas de traduction »
  const type = canAddTranslation(viewer)
    ? oneOf(TRANSLATION_TYPES, text(data, 'type'))
    : 'no_translation';
  if (!type) errors.type = 'Choisissez le type de traduction.';

  const shape = translationShape(type ?? 'no_translation');

  let quality: TranslationQuality | undefined = shape.fixedQuality ?? undefined;
  if (!quality) {
    quality = oneOf(TRANSLATION_QUALITIES, text(data, 'quality'));
    if (!quality && type)
      errors.quality = 'Choisissez la qualité de la traduction.';
  }

  let translationVersion = shape.fixedVersion;
  if (shape.versionRequired) {
    translationVersion = text(data, 'translationVersion');
    if (!translationVersion)
      errors.translationVersion = 'La version de la traduction est requise.';
    else if (translationVersion.length > VERSION_MAX_LENGTH) {
      errors.translationVersion = `La version ne peut pas dépasser ${VERSION_MAX_LENGTH} caractères.`;
    }
  }

  let translationLink: string | null = null;
  if (shape.link !== 'none') {
    const raw = text(data, 'translationLink');
    if (raw) {
      const parsed = parseWebUrl(raw);
      if (!parsed || parsed.length > LINK_MAX_LENGTH) {
        errors.translationLink =
          'Le lien de téléchargement doit être une adresse http(s) valide.';
      } else {
        translationLink = parsed;
      }
    } else if (shape.link === 'required') {
      errors.translationLink = 'Le lien de téléchargement est requis.';
    }
  }

  // --- traducteurs et relecteurs
  const translators: PersonRef[] = [];
  const proofreaders: PersonRef[] = [];

  if (shape.translators) {
    //? Soi-même est toujours traducteur, sauf pour le staff qui peut y renoncer.
    if (!staff || data.get('selfTranslator') === 'on') {
      translators.push({ kind: 'user', id: viewer.id });
    }

    const collect = (key: string, into: PersonRef[]) => {
      for (const raw of data.getAll(key).map(String)) {
        const ref = parseUserRef(raw);

        if (!ref) continue;
        if (ref.kind === 'new') {
          if (!staff) {
            errors[key] =
              'Seul le staff peut créer un compte pour une personne inconnue.';
            continue;
          }

          const cleaned = ref.name.trim();
          if (
            !cleaned ||
            cleaned.length > USER_NAME_MAX_LENGTH ||
            !slugBase(cleaned)
          ) {
            errors[key] =
              `Un nom de traducteur doit avoir 1 à ${USER_NAME_MAX_LENGTH} caractères, dont au moins une lettre ou un chiffre.`;
            continue;
          }

          into.push({ kind: 'new', name: cleaned });
        } else {
          into.push(ref);
        }
      }
    };

    collect('translators', translators);
    collect('proofreaders', proofreaders);

    const knownIds = [...translators, ...proofreaders].flatMap((ref) =>
      ref.kind === 'user' ? [ref.id] : [],
    );
    if (knownIds.length > 0) {
      const found = await orm.em.count(User, { id: { $in: knownIds } });
      if (found !== new Set(knownIds).size) {
        errors.translators = "Un des comptes choisis n'existe pas.";
      }
    }

    if (translators.length === 0 && !errors.translators) {
      errors.translators = 'Il faut au moins un traducteur.';
    }

    const translatorKeys = new Set(translators.map(refKey));
    if (proofreaders.some((ref) => translatorKeys.has(refKey(ref)))) {
      errors.proofreaders =
        'Une personne ne peut pas être à la fois traducteur et relecteur.';
    }
  }

  // --- doublons : même lien, ou même thread sur le même site
  if (origin && link && !errors.link && !errors.threadId) {
    const duplicate = await orm.em.findOne(Game, {
      $or: [
        { link },
        ...(threadId !== null ? [{ origin: origin.id, threadId }] : []),
      ],
    });
    if (duplicate) {
      const field = threadBase(origin.name) ? 'threadId' : 'link';
      errors[field] =
        `Ce jeu existe déjà : « ${duplicate.name} » (/games/${duplicate.id}).`;
    }
  }

  if (
    Object.keys(errors).length > 0 ||
    !origin ||
    !status ||
    !type ||
    !quality
  ) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    input: {
      game: {
        name,
        originId: origin.id,
        link,
        threadId,
        image,
        description,
        descriptionFr,
        autoCheck,
        tagIds,
      },
      edition: {
        name: editionName,
        version: editionVersion,
        status,
        autoCheck: editionAutoCheck,
      },
      translation: {
        type,
        quality,
        version: translationVersion,
        link: translationLink,
        translators: dedupe(translators),
        proofreaders: dedupe(proofreaders),
      },
    },
  };
};

const refKey = (ref: PersonRef) =>
  ref.kind === 'user' ? `user:${ref.id}` : `new:${slugify(ref.name)}`;

const dedupe = (refs: PersonRef[]) => [
  ...new Map(refs.map((ref) => [refKey(ref), ref])).values(),
];

//? Crée le jeu, ses tags, sa première édition, sa traduction, son fichier et ses traducteurs d'un
//? seul tenant : tout ou rien. Retourne l'identifiant du jeu.
export const createGame = async (input: CreateGameInput, viewer: SessionUser) =>
  orm.em.transactional(async (em) => {
    const { game: g, edition: e, translation: t } = input;

    const game = em.create(Game, {
      name: g.name,
      link: g.link,
      origin: em.getReference(OriginWebsite, g.originId),
      threadId: g.threadId,
      imageExternal: g.image,
      description: g.description,
      descriptionFr: g.descriptionFr,
      autoCheck: g.autoCheck,
      active: true,
    });
    //? L'identifiant est attribué par la base : il faut écrire le jeu avant ce qui s'y rattache.
    await em.flush();

    for (const tagId of g.tagIds) {
      em.create(GameGameTags, {
        game,
        gameTag: em.getReference(GameTags, tagId),
      });
    }

    const edition = em.create(GameEdition, {
      game,
      name: e.name,
      version: e.version,
      status: e.status,
      autoCheck: e.autoCheck,
      active: true,
    });

    const translation = em.create(GameTranslation, {
      gameEdition: edition,
      version: t.version,
      quality: t.quality,
      type: t.type,
      active: true,
    });

    em.create(GameTranslationFile, {
      gameTranslation: translation,
      version: t.version,
      active: true,
      externalLink: t.link,
      internalLink: null,
    });

    const translatorRole =
      t.translators.length + t.proofreaders.length > 0
        ? await em.findOne(Role, { name: 'translator' })
        : null;

    //? Un nom inconnu devient un compte fantôme ; si son slug existe déjà, c'est ce compte.
    const resolve = async (ref: PersonRef) => {
      if (ref.kind === 'user') return em.getReference(User, ref.id);

      const existing = await em.findOne(User, { slug: slugify(ref.name) });
      if (existing) return existing;

      if (!translatorRole) throw new Error('Rôle « translator » introuvable.');

      return em.create(User, {
        name: ref.name,
        slug: await allocateSlug(ref.name),
        role: translatorRole,
      });
    };

    for (const [refs, type] of [
      [t.translators, 'translator'],
      [t.proofreaders, 'proofreader'],
    ] as const) {
      for (const ref of refs) {
        em.create(GameTranslationTranslator, {
          gameTranslation: translation,
          user: await resolve(ref),
          type,
        });
      }
    }

    await em.flush();
    logger.info({ gameId: game.id, userId: viewer.id }, 'jeu créé');

    return game.id;
  });
