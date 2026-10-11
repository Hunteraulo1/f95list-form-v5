import { zitadelConfig } from '#lib/server/auth/zitadel.ts';
import { orm, Role, User } from '#lib/server/db/index.ts';
import { envConfig } from '#lib/server/env/index.ts';
import { logger } from '#lib/server/logger.ts';

//? Le rôle d'un compte est commun à tous les services : il est attribué dans le projet Zitadel
//? (clé = `role.name`), et la base locale n'en garde qu'une copie. Ce que le rôle permet ici
//? (permissions, force, quotas) reste propre à cette application.
//?
//? Tout passe par un compte de service Zitadel (`ZITADEL_SERVICE_TOKEN`) autorisé à gérer les rôles
//? et les attributions du projet (`ZITADEL_PROJECT_ID`). Sans eux, la synchronisation est coupée :
//? le rôle local fait foi, comme avant.

interface RolesConfig {
  domain: string;
  projectId: string;
  token: string;
}

export const rolesConfig = (): RolesConfig | null => {
  const domain = zitadelConfig()?.domain;
  const projectId = envConfig.ZITADEL_PROJECT_ID?.trim();
  const token = envConfig.ZITADEL_SERVICE_TOKEN?.trim();

  return domain && projectId && token ? { domain, projectId, token } : null;
};

//? Un compte est lié à Zitadel quand son `zitadelId` est un identifiant Zitadel (numérique) : ceux
//? repris de la v4 portent un UUID d'attente jusqu'à leur première connexion.
export const isLinkedToZitadel = (zitadelId: string | null | undefined) =>
  /^\d+$/.test(zitadelId ?? '');

class ZitadelApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

const api = async <T>(
  config: RolesConfig,
  method: string,
  path: string,
  body?: unknown,
): Promise<T> => {
  const response = await fetch(`${config.domain}/management/v1${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${config.token}`,
      'Content-Type': 'application/json',
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(15_000),
  });
  const data = (await response.json().catch(() => ({}))) as T & {
    message?: string;
  };

  if (!response.ok) {
    throw new ZitadelApiError(
      response.status,
      data.message ?? `Zitadel a répondu ${response.status}.`,
    );
  }

  return data;
};

//? Zitadel répond par une erreur quand une écriture ne change rien : ce n'en est pas une pour nous.
const ignoreUnchanged = (cause: unknown) => {
  if (
    cause instanceof ZitadelApiError &&
    /not been changed|no changes/i.test(cause.message)
  ) {
    return;
  }

  throw cause;
};

// --- les rôles du projet

const listProjectRoleKeys = async (config: RolesConfig) =>
  new Set(
    (
      await api<{ result?: { key: string }[] }>(
        config,
        'POST',
        `/projects/${config.projectId}/roles/_search`,
        { query: { limit: 1000 } },
      )
    ).result?.map(({ key }) => key) ?? [],
  );

//? Crée le rôle dans le projet Zitadel, ou met à jour son libellé s'il existe déjà.
export const upsertProjectRole = async (name: string, label: string) => {
  const config = rolesConfig();
  if (!config) return;

  if ((await listProjectRoleKeys(config)).has(name)) {
    await api(config, 'PUT', `/projects/${config.projectId}/roles/${name}`, {
      displayName: label,
    }).catch(ignoreUnchanged);
  } else {
    await api(config, 'POST', `/projects/${config.projectId}/roles`, {
      roleKey: name,
      displayName: label,
    });
  }
};

export const removeProjectRole = async (name: string) => {
  const config = rolesConfig();
  if (!config) return;

  await api(
    config,
    'DELETE',
    `/projects/${config.projectId}/roles/${name}`,
  ).catch((cause) => {
    //? Déjà absent chez Zitadel : rien à retirer.
    if (cause instanceof ZitadelApiError && cause.status === 404) return;
    throw cause;
  });
};

//? Déclare dans le projet Zitadel les rôles locaux qui y manquent. Une fois par démarrage (et de
//? nouveau après un échec) : les rôles créés ensuite passent par `upsertProjectRole`.
let projectRolesReady: Promise<void> | null = null;

const ensureProjectRoles = (config: RolesConfig) => {
  projectRolesReady ??= (async () => {
    const existing = await listProjectRoleKeys(config);
    const missing = (await orm.em.fork().find(Role, {})).filter(
      ({ name }) => !existing.has(name),
    );

    for (const role of missing) {
      await api(config, 'POST', `/projects/${config.projectId}/roles`, {
        roleKey: role.name,
        displayName: role.label,
      });
    }
    if (missing.length > 0) {
      logger.info(
        { roles: missing.map(({ name }) => name) },
        'rôles déclarés dans le projet Zitadel',
      );
    }
  })().catch((cause) => {
    projectRolesReady = null;
    throw cause;
  });

  return projectRolesReady;
};

// --- le rôle d'un compte

interface UserGrant {
  id: string;
  roleKeys: string[];
}

const findGrant = async (
  config: RolesConfig,
  zitadelId: string,
): Promise<UserGrant | null> => {
  const { result } = await api<{
    result?: { id: string; roleKeys?: string[] }[];
  }>(config, 'POST', '/users/grants/_search', {
    queries: [
      { userIdQuery: { userId: zitadelId } },
      { projectIdQuery: { projectId: config.projectId } },
    ],
  });
  const grant = result?.[0];

  return grant ? { id: grant.id, roleKeys: grant.roleKeys ?? [] } : null;
};

//? Attribue ce rôle au compte dans Zitadel. Les clés que cette application ne connaît pas (rôles
//? propres à un autre service) sont conservées. Lève une erreur si Zitadel refuse : l'appelant ne
//? doit alors pas changer le rôle local. Sans effet si la synchronisation est coupée.
export const assignZitadelRole = async (
  zitadelId: string,
  roleName: string,
) => {
  const config = rolesConfig();
  if (!config) return;

  await ensureProjectRoles(config);

  const local = new Set(
    (await orm.em.fork().find(Role, {})).map(({ name }) => name),
  );
  const grant = await findGrant(config, zitadelId);
  const roleKeys = [
    ...(grant?.roleKeys.filter((key) => !local.has(key)) ?? []),
    roleName,
  ];

  if (grant) {
    await api(config, 'PUT', `/users/${zitadelId}/grants/${grant.id}`, {
      roleKeys,
    }).catch(ignoreUnchanged);
  } else {
    await api(config, 'POST', `/users/${zitadelId}/grants`, {
      projectId: config.projectId,
      roleKeys,
    });
  }

  roleCheckedAt.set(zitadelId, Date.now());
};

//? Le rôle que Zitadel donne à ce compte, parmi ceux que cette application connaît : le plus fort
//? s'il en a plusieurs, et le plus faible de tous s'il n'en a aucun.
const zitadelRoleOf = async (config: RolesConfig, zitadelId: string) => {
  const keys = (await findGrant(config, zitadelId))?.roleKeys ?? [];
  const roles = await orm.em.find(Role, {}, { orderBy: { priority: 'desc' } });

  return roles.find(({ name }) => keys.includes(name)) ?? roles.at(-1) ?? null;
};

//? Un rôle changé par un autre service doit se voir ici sans attendre une reconnexion : il est
//? relu à la connexion, puis au plus toutes les cinq minutes par compte. Si Zitadel ne répond
//? pas, le rôle local reste en place et on réessaie une minute plus tard.
const ROLE_TTL_MS = 5 * 60 * 1000;
const RETRY_MS = 60 * 1000;
const roleCheckedAt = new Map<string, number>();

//? Aligne le rôle local du compte sur celui de Zitadel. `force` : sans attendre le délai (connexion).
export const syncRoleFromZitadel = async (
  userId: string,
  zitadelId: string | null | undefined,
  options: { force?: boolean } = {},
) => {
  const config = rolesConfig();
  if (!config || !zitadelId || !isLinkedToZitadel(zitadelId)) return;

  const checkedAt = roleCheckedAt.get(zitadelId) ?? 0;
  if (!options.force && Date.now() - checkedAt < ROLE_TTL_MS) return;
  //? Posé avant l'appel : les requêtes simultanées du même compte n'interrogent pas toutes Zitadel.
  roleCheckedAt.set(zitadelId, Date.now());

  try {
    const role = await zitadelRoleOf(config, zitadelId);
    if (!role) return;

    const changed = await orm.em.nativeUpdate(
      User,
      { id: userId, role: { $ne: role.id } },
      { role: role.id },
    );
    if (changed > 0) {
      logger.info(
        { userId, role: role.name },
        'rôle mis à jour depuis Zitadel',
      );
    }
  } catch (cause) {
    roleCheckedAt.set(zitadelId, Date.now() - ROLE_TTL_MS + RETRY_MS);
    logger.warn({ err: cause, userId }, 'lecture du rôle Zitadel échouée');
  }
};
