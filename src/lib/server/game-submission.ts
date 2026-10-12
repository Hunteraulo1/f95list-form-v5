import { VERSION_MAX_LENGTH } from '#lib/games/game-form.ts';
import {
  Game,
  GameSubmission,
  GameTags,
  OriginWebsite,
  orm,
  User,
} from '#lib/server/db/index.ts';
import { canEditGame } from '#lib/server/game-access.ts';
import {
  type CreateGameInput,
  createGame,
  type PersonRef,
} from '#lib/server/game-create.ts';
import type { SessionUser } from '#lib/server/hooks/auth.ts';
import { logger } from '#lib/server/logger.ts';
import { loadThreadPreview } from '#lib/server/thread-preview.ts';
import {
  editionStatusName,
  translationQualityName,
  translationTypeName,
} from '#lib/utils/entriesConvert.ts';

//? Ajouter un jeu sans avoir le droit de modifier les jeux :
//?  - sur F95zone, quand le thread donne toutes les infos du jeu, elles sont imposées par le serveur
//?    (le formulaire ne peut pas les changer) et le jeu est créé tout de suite ;
//?  - dans tous les autres cas (autre site, scraper indisponible, thread incomplet), une partie au
//?    moins est saisie à la main et rien ne permet de la vérifier : le jeu est une soumission, créée
//?    seulement quand une personne qui a ce droit l'accepte.
//? Avec le droit de modifier les jeux, rien de tout cela ne s'applique.
export const NOTE_MAX_LENGTH = 500;

const AUTO_ORIGIN = 'F95zone';

//? Remplace dans le formulaire les infos du jeu par celles du thread F95zone ; ce que le thread ne
//? donne pas reste ce qui a été saisi. Retourne vrai si tout vient du thread : le jeu peut alors
//? être créé sans validation.
export const lockGameFormToThread = async (data: FormData) => {
  const origin = await orm.em.findOne(OriginWebsite, {
    id: String(data.get('originId') ?? ''),
  });
  if (origin?.name !== AUTO_ORIGIN) return false;

  const raw = String(data.get('threadId') ?? '').trim();
  if (!/^\d+$/.test(raw)) return false;

  const preview = await loadThreadPreview(Number(raw));
  if (!preview.ok) return false;

  const { name, image, description, version, status, tagIds, complete } =
    preview.data;
  data.set('name', name);
  data.set('description', description ?? '');
  //? Jamais saisie à la main ici : elle sera traduite en arrière-plan.
  data.delete('descriptionFr');
  if (image) data.set('image', image);
  if (version) data.set('editionVersion', version.slice(0, VERSION_MAX_LENGTH));
  if (status) data.set('status', status);
  if (tagIds.length > 0) {
    data.delete('tags');
    for (const id of tagIds) data.append('tags', String(id));
  }

  return complete;
};

const inputOf = (submission: GameSubmission) =>
  submission.data as CreateGameInput;

export type SubmitResult = { ok: true } | { ok: false; message: string };

export const createSubmission = async (
  input: CreateGameInput,
  viewer: SessionUser,
): Promise<SubmitResult> => {
  const pending = await orm.em.find(GameSubmission, { status: 'pending' });
  if (pending.some((other) => inputOf(other).game.link === input.game.link)) {
    return {
      ok: false,
      message: 'Ce jeu a déjà été soumis et attend sa validation.',
    };
  }

  const submission = orm.em.create(GameSubmission, {
    user: orm.em.getReference(User, viewer.id),
    status: 'pending',
    data: input,
  });
  await orm.em.flush();
  logger.info({ submissionId: submission.id, userId: viewer.id }, 'jeu soumis');

  return { ok: true };
};

const personIds = (refs: PersonRef[]) =>
  refs.flatMap((ref) => (ref.kind === 'user' ? [ref.id] : []));

//? Les soumissions à afficher, avec les noms à la place des identifiants. Qui peut modifier les
//? jeux voit toutes celles en attente ; chacun voit les siennes, traitées ou non.
export const listSubmissions = async (viewer: SessionUser) => {
  const reviewer = canEditGame(viewer);
  const submissions = await orm.em.find(
    GameSubmission,
    reviewer
      ? { $or: [{ user: viewer.id }, { status: 'pending' }] }
      : { user: viewer.id },
    {
      populate: ['user', 'reviewedBy', 'game'],
      orderBy: { createdAt: 'desc' },
      limit: 100,
    },
  );

  const inputs = submissions.map(inputOf);
  const userIds = inputs.flatMap(({ translation }) => [
    ...personIds(translation.translators),
    ...personIds(translation.proofreaders),
  ]);
  const [origins, tags, users] = await Promise.all([
    orm.em.find(OriginWebsite, {}),
    orm.em.find(GameTags, {
      id: { $in: inputs.flatMap(({ game }) => game.tagIds) },
    }),
    orm.em.find(User, { id: { $in: userIds } }),
  ]);
  const originNames = new Map(origins.map(({ id, name }) => [id, name]));
  const tagNames = new Map(tags.map(({ id, name }) => [id, name]));
  const userNames = new Map(users.map(({ id, name }) => [id, name]));
  const people = (refs: PersonRef[]) =>
    refs.map((ref) =>
      ref.kind === 'user'
        ? (userNames.get(ref.id) ?? 'Compte supprimé')
        : `${ref.name} (nouveau compte)`,
    );

  const rows = submissions.map((submission) => {
    const { game, edition, translation } = inputOf(submission);

    return {
      id: submission.id,
      status: submission.status,
      createdAt: submission.createdAt,
      mine: submission.user.id === viewer.id,
      author: { name: submission.user.name, slug: submission.user.slug },
      reviewer: submission.reviewedBy?.name ?? null,
      note: submission.note ?? null,
      gameId: submission.game?.id ?? null,
      game: {
        name: game.name,
        origin: originNames.get(game.originId) ?? 'Site supprimé',
        link: game.link,
        image: game.image,
        description: game.description,
        tags: game.tagIds.flatMap((id) => tagNames.get(id) ?? []),
      },
      edition: {
        name: edition.name,
        version: edition.version,
        status: editionStatusName(edition.status),
      },
      translation: {
        type: translationTypeName(translation.type),
        quality: translationQualityName(translation.quality),
        version: translation.version,
        link: translation.link,
        translators: people(translation.translators),
        proofreaders: people(translation.proofreaders),
      },
    };
  });

  return {
    reviewer,
    pending: reviewer ? rows.filter(({ status }) => status === 'pending') : [],
    mine: rows.filter(({ mine }) => mine),
  };
};

//? De quoi décider d'afficher « Soumissions » dans le menu, et combien attendent.
export const submissionCounts = async (viewer: SessionUser) => {
  const reviewer = canEditGame(viewer);
  const [pending, mine] = await Promise.all([
    reviewer ? orm.em.count(GameSubmission, { status: 'pending' }) : 0,
    orm.em.count(GameSubmission, { user: viewer.id }),
  ]);

  return { visible: reviewer || mine > 0, pending };
};

export type ReviewResult =
  | { ok: true; gameId: number | null; description: string | null }
  | { ok: false; status: 404 | 409; message: string };

const findPending = async (id: string) => {
  const submission = await orm.em.findOne(GameSubmission, { id });
  if (!submission) {
    return {
      ok: false as const,
      status: 404 as const,
      message: 'Soumission introuvable.',
    };
  }
  if (submission.status !== 'pending') {
    return {
      ok: false as const,
      status: 409 as const,
      message: 'Cette soumission a déjà été traitée.',
    };
  }

  return { ok: true as const, submission };
};

//? Crée le jeu soumis. La base a pu changer depuis la soumission : ce qui n'existe plus (tag,
//? compte crédité) est laissé de côté, et un jeu ajouté entre-temps bloque l'acceptation.
export const acceptSubmission = async (
  id: string,
  reviewer: SessionUser,
  note: string | null,
): Promise<ReviewResult> => {
  const found = await findPending(id);
  if (!found.ok) return found;

  const { submission } = found;
  const input = inputOf(submission);

  const duplicate = await orm.em.findOne(Game, { link: input.game.link });
  if (duplicate) {
    return {
      ok: false,
      status: 409,
      message: `Ce jeu existe déjà : « ${duplicate.name} » (/games/${duplicate.id}). Refusez la soumission.`,
    };
  }

  const tags = await orm.em.find(GameTags, { id: { $in: input.game.tagIds } });
  const { translators, proofreaders } = input.translation;
  const users = await orm.em.find(User, {
    id: { $in: [...personIds(translators), ...personIds(proofreaders)] },
  });
  const known = new Set(users.map(({ id }) => id));
  const existing = (refs: PersonRef[]) =>
    refs.filter((ref) => ref.kind !== 'user' || known.has(ref.id));

  const gameId = await createGame(
    {
      ...input,
      game: { ...input.game, tagIds: tags.map(({ id }) => id) },
      translation: {
        ...input.translation,
        translators: existing(translators),
        proofreaders: existing(proofreaders),
      },
    },
    reviewer,
  );

  submission.status = 'accepted';
  submission.reviewedBy = orm.em.getReference(User, reviewer.id);
  submission.game = orm.em.getReference(Game, gameId);
  submission.note = note;
  await orm.em.flush();
  logger.info(
    { submissionId: id, gameId, userId: reviewer.id },
    'soumission acceptée',
  );

  return {
    ok: true,
    gameId,
    description: input.game.descriptionFr ? null : input.game.description,
  };
};

export const rejectSubmission = async (
  id: string,
  reviewer: SessionUser,
  note: string | null,
): Promise<ReviewResult> => {
  const found = await findPending(id);
  if (!found.ok) return found;

  found.submission.status = 'rejected';
  found.submission.reviewedBy = orm.em.getReference(User, reviewer.id);
  found.submission.note = note;
  await orm.em.flush();
  logger.info({ submissionId: id, userId: reviewer.id }, 'soumission refusée');

  return { ok: true, gameId: null, description: null };
};

//? Retirer sa propre soumission tant qu'elle n'a pas été traitée.
export const cancelSubmission = async (id: string, viewer: SessionUser) => {
  const deleted = await orm.em.nativeDelete(GameSubmission, {
    id,
    user: viewer.id,
    status: 'pending',
  });

  return deleted > 0;
};
