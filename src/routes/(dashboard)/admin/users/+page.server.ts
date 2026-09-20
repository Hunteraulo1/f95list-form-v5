import { error, fail, redirect } from '@sveltejs/kit';
import { Impersonation, orm, Role, User } from '$lib/server/db';
import { logger } from '$lib/server/logger';
import { requirePermission } from '$lib/server/permissions';
import {
  checkCanAssignRole,
  checkCanImpersonate,
  checkCanManageUser,
  loadRoleTargets,
  type RoleCheck,
  roleActor,
} from '$lib/server/role-guard';
import type { Actions, PageServerLoad } from './$types';

const PAGE_SIZE = 20;
const SEARCH_MAX_LENGTH = 100;
const NAME_MAX_LENGTH = 64;
const AVATAR_MAX_LENGTH = 2048;

//? Par défaut on ne liste que les comptes réels : les fantômes (traducteurs sans compte, sans
//? zitadelId) sont nombreux et ne se connectent pas ; « all » les remet tous.
const KINDS = ['real', 'ghost', 'all'] as const;
type Kind = (typeof KINDS)[number];

const SORTS = ['name', 'role', 'createdAt', 'translations'] as const;
type Sort = (typeof SORTS)[number];

const isSort = (value: string | null): value is Sort =>
  SORTS.includes(value as Sort);

const escapeLike = (value: string) => value.replace(/[\\%_]/g, '\\$&');

//? Le tri sur le nombre de traductions ne se fait pas en base (voir `load`).
const orderBy = (sort: Exclude<Sort, 'translations'>, dir: 'asc' | 'desc') => {
  switch (sort) {
    case 'name':
      return { name: dir };
    case 'role':
      return { role: { priority: dir }, name: 'asc' as const };
    case 'createdAt':
      return { createdAt: dir };
  }
};

//? Nombre de traductions par compte (traducteur ou relecteur) ; sans `userIds`, tous les comptes
//? qui en ont au moins une.
const loadTranslationCounts = async (
  into: Map<string, number>,
  userIds?: string[],
) => {
  if (userIds?.length === 0) return;

  const rows = await orm.em
    .getConnection()
    .execute<{ userId: string; count: number }[]>(
      `select user_id as userId, count(*) as count from game_translation_translator
       ${userIds ? `where user_id in (${userIds.map(() => '?').join(', ')})` : ''}
       group by user_id`,
      userIds ?? [],
    );

  for (const { userId, count } of rows) into.set(userId, Number(count));
};

export const load: PageServerLoad = async ({ locals, url }) => {
  requirePermission(locals, 'manage.users');
  if (!locals.user) error(401, 'Non connecté');

  const actor = roleActor(locals.user);
  const canViewEmails = locals.user.permissions.includes('users.view_email');
  //? On ne prend pas la place d'un autre depuis un compte déjà emprunté : on revient d'abord.
  const canImpersonate =
    !locals.impersonator &&
    locals.user.permissions.includes('users.impersonate');

  const q = (url.searchParams.get('q') ?? '')
    .trim()
    .slice(0, SEARCH_MAX_LENGTH);
  const roleFilter = url.searchParams.get('role') ?? '';
  const kindParam = url.searchParams.get('kind');
  const kind: Kind = KINDS.find((value) => value === kindParam) ?? 'real';
  const sortParam = url.searchParams.get('sort');
  const sort = isSort(sortParam) ? sortParam : 'createdAt';
  const dir = url.searchParams.get('dir') === 'asc' ? 'asc' : 'desc';
  const requestedPage = Math.max(
    1,
    Number.parseInt(url.searchParams.get('page') ?? '1', 10) || 1,
  );

  const roleTargets = await loadRoleTargets();
  const targetById = new Map(roleTargets.map((role) => [role.id, role]));
  const roles = await orm.em.find(Role, {}, { orderBy: { priority: 'desc' } });

  const search = `%${escapeLike(q)}%`;
  const where = {
    ...(q && {
      $or: [
        { name: { $like: search } },
        { discord: { $like: search } },
        //? L'e-mail n'est cherchable que par ceux qui ont le droit de le voir.
        ...(canViewEmails ? [{ email: { $like: search } }] : []),
      ],
    }),
    ...(roles.some(({ name }) => name === roleFilter) && {
      role: { name: roleFilter },
    }),
    //? Un compte fantôme n'a pas de zitadelId : c'est un traducteur sans compte réel.
    ...(kind === 'real' && { zitadelId: { $ne: null } }),
    ...(kind === 'ghost' && { zitadelId: null }),
  };

  const total = await orm.em.count(User, where);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(requestedPage, totalPages);

  const offset = (page - 1) * PAGE_SIZE;
  const counts = new Map<string, number>();
  let users: User[];

  if (sort === 'translations') {
    //? Le nombre de traductions n'est pas une colonne : on trie les comptes filtrés en mémoire,
    //? avec les compteurs de tous ceux qui ont au moins une traduction (les autres valent 0).
    //? Le `fork` évite de laisser dans l'ORM des entités partielles (nom seulement).
    await loadTranslationCounts(counts);
    const matching = await orm.em
      .fork()
      .find(User, where, { fields: ['id', 'name'] });
    const factor = dir === 'asc' ? 1 : -1;

    const ids = matching
      .sort(
        (a, b) =>
          factor * ((counts.get(a.id) ?? 0) - (counts.get(b.id) ?? 0)) ||
          a.name.localeCompare(b.name, 'fr'),
      )
      .slice(offset, offset + PAGE_SIZE)
      .map(({ id }) => id);

    const loaded = await orm.em.find(
      User,
      { id: { $in: ids } },
      { populate: ['role'] },
    );
    const byId = new Map(loaded.map((user) => [user.id, user]));
    users = ids.flatMap((id) => byId.get(id) ?? []);
  } else {
    users = await orm.em.find(User, where, {
      populate: ['role'],
      orderBy: orderBy(sort, dir),
      limit: PAGE_SIZE,
      offset,
    });
    await loadTranslationCounts(
      counts,
      users.map(({ id }) => id),
    );
  }

  return {
    query: { q, role: roleFilter, kind, sort, dir, page },
    total,
    totalPages,
    canViewEmails,
    canImpersonate,
    roles: roles.flatMap((role) => {
      const target = targetById.get(role.id);
      if (!target) return [];

      const assign = checkCanAssignRole(actor, target);

      return {
        id: role.id,
        name: role.name,
        label: role.label,
        assignable: assign.allowed,
        blockedReason: assign.allowed ? null : assign.message,
      };
    }),
    users: users.map((user) => {
      const target = targetById.get(user.role.id);
      const manage: RoleCheck = target
        ? checkCanManageUser(actor, { id: user.id, role: target })
        : { allowed: false, message: 'Rôle inconnu.' };

      const impersonate: RoleCheck =
        canImpersonate && target
          ? checkCanImpersonate(actor, { id: user.id, role: target })
          : { allowed: false, message: 'Non autorisé.' };

      return {
        id: user.id,
        name: user.name,
        avatar: user.avatar ?? null,
        discord: user.discord ?? null,
        email: canViewEmails ? (user.email ?? null) : null,
        ghost: user.zitadelId === null,
        role: {
          id: user.role.id,
          name: user.role.name,
          label: user.role.label,
        },
        translations: counts.get(user.id) ?? 0,
        createdAt: user.createdAt.toISOString(),
        isSelf: user.id === locals.user?.id,
        canEdit: manage.allowed,
        blockedReason: manage.allowed ? null : manage.message,
        canImpersonate: impersonate.allowed,
        impersonateBlockedReason: impersonate.allowed
          ? null
          : impersonate.message,
      };
    }),
  };
};

const validAvatar = (value: string) => {
  if (value.length > AVATAR_MAX_LENGTH) return false;

  try {
    return ['http:', 'https:'].includes(new URL(value).protocol);
  } catch {
    return false;
  }
};

export const actions: Actions = {
  updateUser: async ({ locals, request }) => {
    requirePermission(locals, 'manage.users');
    if (!locals.user) return fail(401, { message: 'Non connecté.' });

    const data = await request.formData();
    const id = String(data.get('id') ?? '');
    const name = String(data.get('name') ?? '').trim();
    const avatar = String(data.get('avatar') ?? '').trim();
    const discord = String(data.get('discord') ?? '').trim();
    const roleId = String(data.get('roleId') ?? '');

    const user = await orm.em.findOne(User, { id }, { populate: ['role'] });
    if (!user) return fail(404, { id, message: 'Utilisateur introuvable.' });

    const actor = roleActor(locals.user);
    const roleTargets = await loadRoleTargets();
    const current = roleTargets.find(({ id }) => id === user.role.id);
    const target = roleTargets.find(({ id }) => id === roleId);

    if (!current || !target)
      return fail(400, { id, message: 'Rôle invalide.' });

    const manage = checkCanManageUser(actor, { id: user.id, role: current });
    if (!manage.allowed) return fail(403, { id, message: manage.message });

    if (!name || name.length > NAME_MAX_LENGTH) {
      return fail(400, {
        id,
        message: `Le nom est requis (${NAME_MAX_LENGTH} caractères max).`,
      });
    }
    if (avatar && !validAvatar(avatar)) {
      return fail(400, {
        id,
        message: "L'avatar doit être une adresse http(s) valide.",
      });
    }
    if (discord && !/^\d{5,32}$/.test(discord)) {
      return fail(400, {
        id,
        message: "L'identifiant Discord doit être numérique (5 à 32 chiffres).",
      });
    }

    //? La collation est insensible à la casse et aux accents : « Rémi » et « remi » sont en conflit.
    const duplicate = await orm.em.findOne(User, { name, id: { $ne: id } });
    if (duplicate) {
      return fail(409, { id, message: 'Un utilisateur porte déjà ce nom.' });
    }

    if (target.id !== current.id) {
      if (user.id === actor.userId) {
        return fail(403, {
          id,
          message: 'Vous ne pouvez pas modifier votre propre rôle.',
        });
      }

      const assign = checkCanAssignRole(actor, target);
      if (!assign.allowed) return fail(403, { id, message: assign.message });

      user.role = orm.em.getReference(Role, target.id);
    }

    user.name = name;
    user.avatar = avatar || null;
    user.discord = discord || null;
    await orm.em.flush();

    return { saved: user.id };
  },

  //? Prend la place d'un autre compte : le compte réel reste connu du serveur, et le bandeau de la
  //? page permet de revenir à tout moment. La prise de place expire d'elle-même (voir config.ts).
  impersonate: async ({ locals, request }) => {
    requirePermission(locals, 'manage.users');
    requirePermission(locals, 'users.impersonate');
    if (!locals.user)
      return fail(401, { impersonate: true, message: 'Non connecté.' });

    if (locals.impersonator) {
      return fail(403, {
        impersonate: true,
        message: "Revenez d'abord à votre compte.",
      });
    }

    const id = String((await request.formData()).get('id') ?? '');
    const user = await orm.em.findOne(User, { id }, { populate: ['role'] });
    if (!user) {
      return fail(404, {
        impersonate: true,
        message: 'Utilisateur introuvable.',
      });
    }

    const role = (await loadRoleTargets()).find(
      ({ id }) => id === user.role.id,
    );
    const check: RoleCheck = role
      ? checkCanImpersonate(roleActor(locals.user), { id: user.id, role })
      : { allowed: false, message: 'Rôle inconnu.' };
    if (!check.allowed) {
      return fail(403, { impersonate: true, message: check.message });
    }

    await orm.em.nativeDelete(Impersonation, { user: locals.user.id });
    orm.em.create(Impersonation, {
      user: orm.em.getReference(User, locals.user.id),
      target: orm.em.getReference(User, user.id),
      //? Fixé ici plutôt que par la base : l'expiration compare avec l'horloge de l'application.
      createdAt: new Date(),
    });
    await orm.em.flush();

    logger.info(
      { userId: locals.user.id, targetId: user.id },
      'prise de place commencée',
    );

    redirect(303, '/dashboard');
  },
};
