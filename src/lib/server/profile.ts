import { parseImageUrl } from '#lib/image-hosts.ts';
import { type Permission, SUPER_ROLE } from '#lib/permissions.ts';
import { extractYoutubeVideoId } from '#lib/profile-music.ts';
import { VIEW_ACTIVE_ONLY } from '#lib/server/config.ts';
import {
  GameTranslationTranslator,
  orm,
  RolePermission,
  User,
} from '#lib/server/db/index.ts';
import { isTranslationOutdated } from '#lib/server/my-translations.ts';
import { editionStatusName } from '#lib/utils/entriesConvert.ts';

const PAGE_SIZE = 20;
const SEARCH_MAX_LENGTH = 100;

//? Le compte d'un slug (adresse canonique de son profil, en minuscules).
export const findProfileBySlug = (slug: string) =>
  orm.em.findOne(User, { slug: slug.toLowerCase() }, { populate: ['role'] });

//? Le compte d'un nom (anciennes adresses /profile/<nom>, redirigées vers le slug). Le nom est unique en pratique (vérifié à la modification) mais pas par
//? contrainte : en cas d'homonymes, le compte réel puis le plus ancien l'emporte.
export const findProfileUser = async (name: string) => {
  const users = await orm.em.find(
    User,
    { name },
    { populate: ['role'], orderBy: { createdAt: 'asc' } },
  );

  return users.find(({ zitadelId }) => zitadelId !== null) ?? users[0] ?? null;
};

const CUSTOMIZE: Permission[] = [
  'profile.background',
  'profile.music',
  'profile.cursor',
];

//? Image de fond et musique d'un profil, telles qu'elles s'affichent : seulement tant que le rôle du
//? compte en a la permission. La retirer au rôle les masque, sans effacer ce qui était choisi.
export const profileCustomization = async (user: User) => {
  const granted =
    user.role.name === SUPER_ROLE
      ? CUSTOMIZE
      : (
          await orm.em.find(RolePermission, {
            role: user.role.id,
            permission: { $in: CUSTOMIZE },
          })
        ).map(({ permission }) => permission);

  return shownCustomization(user, granted);
};

const shownImage = (value: string | null | undefined) => {
  const image = parseImageUrl(value ?? '');

  return image.ok ? image.url : null;
};

//? Même règle, pour un compte dont on connaît déjà les permissions (celui de la session).
export const shownCustomization = (
  user: {
    background?: string | null;
    music?: string | null;
    cursor?: string | null;
  },
  permissions: readonly string[],
) => ({
  //? Une image reprise de l'ancien site peut venir d'un hébergeur que le navigateur bloque désormais
  //? (voir `IMAGE_HOSTS`) : plutôt rien qu'une image cassée.
  background: permissions.includes('profile.background')
    ? shownImage(user.background)
    : null,
  musicVideoId: permissions.includes('profile.music')
    ? extractYoutubeVideoId(user.music)
    : null,
  cursor: permissions.includes('profile.cursor')
    ? shownImage(user.cursor)
    : null,
});

const SORTS = ['name', 'version', 'tversion'] as const;
export type ProfileSort = (typeof SORTS)[number];

export interface ProfileTranslationsQuery {
  q: string;
  sort: ProfileSort;
  dir: 'asc' | 'desc';
  page: number;
}

export const parseTranslationsQuery = (url: URL): ProfileTranslationsQuery => {
  const sort = url.searchParams.get('sort');

  return {
    q: (url.searchParams.get('q') ?? '').trim().slice(0, SEARCH_MAX_LENGTH),
    sort: SORTS.find((value) => value === sort) ?? 'name',
    dir: url.searchParams.get('dir') === 'desc' ? 'desc' : 'asc',
    page: Math.max(
      1,
      Number.parseInt(url.searchParams.get('page') ?? '1', 10) || 1,
    ),
  };
};

const escapeLike = (value: string) => value.replace(/[\\%_]/g, '\\$&');

//? Les traductions d'un compte telles que le public les voit : ni les crédits anonymes, ni le
//? contenu masqué. Le propriétaire voit la même liste (avec le nombre d'anonymes en plus).
export const loadProfileTranslations = async (
  userId: string,
  query: ProfileTranslationsQuery,
  options: { countHidden?: boolean } = {},
) => {
  const rows = await orm.em.find(
    GameTranslationTranslator,
    {
      user: userId,
      anonymous: false,
      gameTranslation: {
        ...(VIEW_ACTIVE_ONLY && { active: true }),
        gameEdition: {
          ...(VIEW_ACTIVE_ONLY && { active: true }),
          game: {
            ...(VIEW_ACTIVE_ONLY && { active: true }),
            ...(query.q && { name: { $like: `%${escapeLike(query.q)}%` } }),
          },
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
      gameStatus: editionStatusName(edition.status),
      role: row.type ?? null,
      outdated: isTranslationOutdated({
        type: translation.type,
        version: translation.version,
        editionVersion: edition.version,
        followed: true,
      }),
    };
  });

  const factor = query.dir === 'asc' ? 1 : -1;
  items.sort(
    (a, b) =>
      factor *
      a[query.sort].localeCompare(b[query.sort], 'fr', { numeric: true }),
  );

  const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const page = Math.min(query.page, totalPages);

  return {
    total: items.length,
    totalPages,
    page,
    items: items.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    hiddenAnonymous: options.countHidden
      ? await orm.em.count(GameTranslationTranslator, {
          user: userId,
          anonymous: true,
        })
      : 0,
  };
};
