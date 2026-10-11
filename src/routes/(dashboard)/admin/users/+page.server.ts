import { UniqueConstraintViolationException } from '@mikro-orm/core';
import { error, fail, redirect } from '@sveltejs/kit';
import { parseImageUrl } from '#lib/image-hosts.ts';
import { DISCORD_ID_PATTERN, USER_NAME_MAX_LENGTH } from '#lib/profile.ts';
import {
  readSecurity,
  removeSecurityKey,
  removeTotp,
} from '#lib/server/auth/zitadel-account.ts';
import { requestPasswordReset } from '#lib/server/auth/zitadel-login.ts';
import {
  assignZitadelRole,
  isLinkedToZitadel,
} from '#lib/server/auth/zitadel-roles.ts';
import { serviceConfig } from '#lib/server/auth/zitadel-service.ts';
import { Impersonation, orm, Role, User } from '#lib/server/db/index.ts';
import { logger } from '#lib/server/logger.ts';
import { requirePermission } from '#lib/server/permissions.ts';
import {
  checkCanAssignRole,
  checkCanImpersonate,
  checkCanManageUser,
  loadRoleTargets,
  type RoleCheck,
  roleActor,
} from '#lib/server/role-guard.ts';
import { checkNameSlug } from '#lib/server/slug.ts';
import type { Actions, PageServerLoad } from './$types';

const PAGE_SIZE = 20;
const SEARCH_MAX_LENGTH = 100;

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

  //? Retirer une double authentification ou envoyer une réinitialisation passe par Zitadel.
  const canSecure =
    !locals.impersonator &&
    serviceConfig() !== null &&
    locals.user.permissions.includes('users.security');

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
    canSecure,
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
        slug: user.slug,
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
        //? Débloquer sa connexion : pour un compte lié à Zitadel, qu'on a le droit de gérer, et jamais
        //? le sien (ses propres réglages sont dans ses paramètres).
        canSecure:
          canSecure &&
          manage.allowed &&
          user.id !== locals.user?.id &&
          isLinkedToZitadel(user.zitadelId),
        canImpersonate: impersonate.allowed,
        impersonateBlockedReason: impersonate.allowed
          ? null
          : impersonate.message,
      };
    }),
  };
};

const ZITADEL_DOWN =
  "Zitadel n'a pas pu faire l'opération : rien n'a été modifié, réessayez.";

//? Le compte visé par une action de déblocage, après tous les contrôles : permission, pas en tant
//? qu'un autre, compte existant et lié à Zitadel, rôle qu'on a le droit de gérer, et pas le sien.
const loadSecurityTarget = async (locals: App.Locals, request: Request) => {
  requirePermission(locals, 'manage.users');
  requirePermission(locals, 'users.security');
  const refuse = (status: number, message: string) =>
    fail(status, { security: true, message });

  if (!locals.user) return refuse(401, 'Non connecté.');
  if (locals.impersonator) {
    return refuse(403, "Revenez d'abord à votre compte.");
  }

  const config = serviceConfig();
  if (!config)
    return refuse(503, "Zitadel n'est pas configuré sur ce serveur.");

  const id = String((await request.formData()).get('id') ?? '');
  const user = await orm.em.findOne(User, { id }, { populate: ['role'] });
  if (!user) return refuse(404, 'Utilisateur introuvable.');
  if (user.id === locals.user.id) {
    return refuse(403, 'Pour votre propre compte, passez par vos paramètres.');
  }
  if (!isLinkedToZitadel(user.zitadelId)) {
    return refuse(400, "Ce compte ne s'est encore jamais connecté.");
  }

  const role = (await loadRoleTargets()).find(({ id }) => id === user.role.id);
  const check: RoleCheck = role
    ? checkCanManageUser(roleActor(locals.user), { id: user.id, role })
    : { allowed: false, message: 'Rôle inconnu.' };
  if (!check.allowed) return refuse(403, check.message);

  return { config, user, zitadelId: user.zitadelId as string };
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

    if (!name || name.length > USER_NAME_MAX_LENGTH) {
      return fail(400, {
        id,
        message: `Le nom est requis (${USER_NAME_MAX_LENGTH} caractères max).`,
      });
    }
    //? Un avatar inchangé n'est pas revalidé : certains avatars migrés viennent d'hébergeurs qui ne
    //? sont plus autorisés, et cela ne doit pas empêcher de modifier autre chose sur le compte.
    const image =
      avatar === (user.avatar ?? '')
        ? { ok: true as const, url: user.avatar ?? null }
        : parseImageUrl(avatar);
    if (!image.ok) return fail(400, { id, message: image.message });
    if (discord && !DISCORD_ID_PATTERN.test(discord)) {
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

    //? Le nom donne le slug de l'adresse du profil : il doit être libre. Le slug ne change que si le
    //? nom change (une simple modification de casse redonne le même slug, toujours libre pour soi).
    let slug = user.slug;
    if (name !== user.name) {
      const check = await checkNameSlug(name, id);
      if (!check.ok) return fail(409, { id, message: check.message });

      slug = check.slug;
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

      //? Le rôle est commun à tous les services : il change d'abord chez Zitadel, puis ici. Un
      //? compte pas encore lié garde son rôle local, repris dans Zitadel à sa première connexion.
      if (isLinkedToZitadel(user.zitadelId)) {
        try {
          await assignZitadelRole(user.zitadelId as string, target.name);
        } catch (cause) {
          logger.warn(
            { err: cause, userId: user.id },
            'attribution du rôle Zitadel échouée',
          );

          return fail(502, {
            id,
            message:
              "Zitadel n'a pas pu enregistrer le nouveau rôle : rien n'a été modifié, réessayez.",
          });
        }
      }

      user.role = orm.em.getReference(Role, target.id);
    }

    user.name = name;
    user.slug = slug;
    user.avatar = image.url;
    user.discord = discord || null;

    try {
      await orm.em.flush();
    } catch (cause) {
      //? Course : un autre compte a pris ce slug entre la vérification et l'enregistrement.
      if (cause instanceof UniqueConstraintViolationException) {
        return fail(409, {
          id,
          message: "Ce lien de profil vient d'être pris par un autre compte.",
        });
      }

      throw cause;
    }

    return { saved: user.id };
  },

  //? Prend la place d'un autre compte : le compte réel reste connu du serveur, et le bandeau de la
  //? page permet de revenir à tout moment. La prise de place expire d'elle-même (voir config.ts).
  //? Un compte qui a perdu son second facteur ne peut plus se connecter : on lui retire son
  //? application d'authentification et ses clés de sécurité. Il se reconnecte avec son seul mot de
  //? passe, et en enregistre de nouveaux s'il le souhaite. Ses clés d'accès ne sont pas touchées.
  removeSecondFactor: async ({ locals, request }) => {
    const target = await loadSecurityTarget(locals, request);
    if (!('config' in target)) return target;
    const { config, user, zitadelId } = target;

    try {
      const security = await readSecurity(config, zitadelId);
      if (!security.totp && security.keys.length === 0) {
        return {
          security: true,
          done: `${user.name} n'a pas de double authentification active.`,
        };
      }

      if (security.totp) await removeTotp(config, zitadelId);
      for (const key of security.keys) {
        await removeSecurityKey(config, zitadelId, key.id);
      }
    } catch (cause) {
      logger.warn(
        { err: cause, targetId: user.id },
        'second facteur non retiré',
      );

      return fail(502, { security: true, message: ZITADEL_DOWN });
    }

    logger.info(
      { userId: locals.user?.id, targetId: user.id },
      'double authentification retirée par un administrateur',
    );

    return {
      security: true,
      done: `Double authentification de ${user.name} retirée : il se connecte maintenant avec son seul mot de passe.`,
    };
  },

  //? Envoie à l'utilisateur l'e-mail « mot de passe oublié » : c'est lui qui choisit son nouveau mot
  //? de passe, l'administrateur ne le voit jamais.
  sendPasswordReset: async ({ locals, request, url }) => {
    const target = await loadSecurityTarget(locals, request);
    if (!('config' in target)) return target;
    const { config, user, zitadelId } = target;

    try {
      await requestPasswordReset(
        config,
        zitadelId,
        `${url.origin}/signin/reset?userId={{.UserID}}&code={{.Code}}`,
      );
    } catch (cause) {
      logger.warn(
        { err: cause, targetId: user.id },
        'réinitialisation non envoyée',
      );

      return fail(502, { security: true, message: ZITADEL_DOWN });
    }

    logger.info(
      { userId: locals.user?.id, targetId: user.id },
      'réinitialisation du mot de passe envoyée par un administrateur',
    );

    return {
      security: true,
      done: `E-mail de réinitialisation du mot de passe envoyé à ${user.name}.`,
    };
  },

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
