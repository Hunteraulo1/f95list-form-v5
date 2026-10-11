import { zitadelConfig } from '#lib/server/auth/zitadel.ts';
import { envConfig } from '#lib/server/env/index.ts';

//? Appels à l'API de Zitadel faits par l'application elle-même, avec son compte de service
//? (`ZITADEL_SERVICE_TOKEN`) : gestion des rôles (zitadel-roles.ts) et du compte de l'utilisateur
//? depuis ses paramètres (zitadel-account.ts).

export interface ServiceConfig {
  domain: string;
  token: string;
}

//? Nul tant que Zitadel ou son compte de service ne sont pas renseignés dans l'environnement.
export const serviceConfig = (): ServiceConfig | null => {
  const domain = zitadelConfig()?.domain;
  const token = envConfig.ZITADEL_SERVICE_TOKEN?.trim();

  return domain && token ? { domain, token } : null;
};

export class ZitadelApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

//? `path` est complet : `/management/v1/…` ou `/v2/…`. Lève `ZitadelApiError` si Zitadel refuse.
export const zitadelApi = async <T>(
  config: ServiceConfig,
  method: string,
  path: string,
  body?: unknown,
): Promise<T> => {
  const response = await fetch(config.domain + path, {
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

//? Un compte est lié à Zitadel quand son `zitadelId` est un identifiant Zitadel (numérique) : ceux
//? repris de la v4 portent un UUID d'attente jusqu'à leur première connexion.
export const isLinkedToZitadel = (zitadelId: string | null | undefined) =>
  /^\d+$/.test(zitadelId ?? '');
