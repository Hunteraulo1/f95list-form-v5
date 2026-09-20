import { error, fail } from '@sveltejs/kit';
import { GameTranslationTranslator, orm } from '$lib/server/db';
import { isTranslationOutdated } from '$lib/server/my-translations';
import {
  editionStatusName,
  translationQualityName,
  translationTypeName,
} from '$lib/utils/entriesConvert';
import type { Actions, PageServerLoad } from './$types';

const PAGE_SIZE = 20;
const SEARCH_MAX_LENGTH = 100;

const STATUSES = ['in_progress', 'completed', 'abandoned', 'on_hold'] as const;
const ROLES = ['translator', 'proofreader'] as const;
const SORTS = ['name', 'version', 'tversion'] as const;

type Sort = (typeof SORTS)[number];

const pick = <T extends string>(
  values: readonly T[],
  value: string | null,
): T | '' => values.find((candidate) => candidate === value) ?? '';

const escapeLike = (value: string) => value.replace(/[\\%_]/g, '\\$&');

export const load: PageServerLoad = async ({ locals, url }) => {
  if (!locals.user) error(401, 'Non connecté');

  const q = (url.searchParams.get('q') ?? '')
    .trim()
    .slice(0, SEARCH_MAX_LENGTH);
  const status = pick(STATUSES, url.searchParams.get('status'));
  const role = pick(ROLES, url.searchParams.get('role'));
  const sort: Sort = pick(SORTS, url.searchParams.get('sort')) || 'name';
  const dir = url.searchParams.get('dir') === 'desc' ? 'desc' : 'asc';
  const requestedPage = Math.max(
    1,
    Number.parseInt(url.searchParams.get('page') ?? '1', 10) || 1,
  );

  const rows = await orm.em.find(
    GameTranslationTranslator,
    {
      user: locals.user.id,
      ...(role && { type: role }),
      gameTranslation: {
        gameEdition: {
          ...(status && { status }),
          ...(q && { game: { name: { $like: `%${escapeLike(q)}%` } } }),
        },
      },
    },
    { populate: ['gameTranslation.gameEdition.game'] },
  );

  const items = rows.map((row) => {
    const translation = row.gameTranslation;
    const edition = translation.gameEdition;
    const game = edition.game;

    return {
      translationId: translation.id,
      gameId: game.id,
      name: edition.name ? `${game.name} - ${edition.name}` : game.name,
      version: edition.version,
      tversion: translation.version,
      editionStatus: editionStatusName(edition.status),
      typeLabel: translationTypeName(translation.type),
      qualityLabel: translationQualityName(translation.quality),
      role: row.type,
      followed: row.alert,
      anonymous: row.anonymous,
      outdated: isTranslationOutdated({
        type: translation.type,
        version: translation.version,
        editionVersion: edition.version,
        followed: row.alert,
      }),
    };
  });

  const compare = (a: (typeof items)[number], b: (typeof items)[number]) => {
    //? Règles immuables : les traductions abandonnées (suivi coupé) en dernier, puis les pas à
    //? jour en premier, quel que soit le tri choisi.
    if (a.followed !== b.followed) return a.followed ? -1 : 1;
    if (a.outdated !== b.outdated) return a.outdated ? -1 : 1;

    const result = a[sort].localeCompare(b[sort], 'fr', { numeric: true });
    return dir === 'asc' ? result : -result;
  };

  const sorted = items.sort(compare);
  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const page = Math.min(requestedPage, totalPages);

  return {
    query: { q, status, role, sort, dir, page },
    total: sorted.length,
    totalPages,
    outdatedCount: sorted.filter(({ outdated }) => outdated).length,
    translations: sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    statusOptions: STATUSES.map((value) => ({
      value,
      label: editionStatusName(value),
    })),
  };
};

//? Les deux réglages sont propres à la ligne de la personne connectée : on ne touche jamais celle
//? d'un autre traducteur.
const updateOwnRow = async (
  locals: App.Locals,
  request: Request,
  apply: (row: GameTranslationTranslator, value: boolean) => void,
) => {
  if (!locals.user) error(401, 'Non connecté');

  const data = await request.formData();
  const translationId = String(data.get('translationId') ?? '');
  const value = data.get('value');

  if (value !== '0' && value !== '1') {
    return fail(400, { message: 'Valeur invalide.' });
  }

  const row = await orm.em.findOne(GameTranslationTranslator, {
    gameTranslation: translationId,
    user: locals.user.id,
  });
  if (!row) return fail(404, { message: 'Traduction introuvable.' });

  apply(row, value === '1');
  await orm.em.flush();

  return { saved: translationId };
};

export const actions: Actions = {
  //? « Abandonner » = ne plus suivre les mises à jour de cette traduction (plus d'alerte, plus
  //? comptée comme « pas à jour ») ; « Reprendre » remet le suivi. Rien n'est supprimé.
  follow: ({ locals, request }) =>
    updateOwnRow(locals, request, (row, value) => {
      row.alert = value;
    }),

  //? Anonyme : le nom n'est plus affiché au public sur cette traduction.
  anonymous: ({ locals, request }) =>
    updateOwnRow(locals, request, (row, value) => {
      row.anonymous = value;
    }),
};
