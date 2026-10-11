import { createHash, randomBytes } from 'node:crypto';
import { envConfig } from '#lib/server/env/index.ts';

//? Connexion par Zitadel (OpenID Connect, flux « authorization code » avec PKCE). Sans bibliothèque :
//? l'application n'a besoin que de trois appels, tous décrits par la spécification.

export interface ZitadelConfig {
  domain: string;
  clientId: string;
  clientSecret: string;
}

//? Nul tant que Zitadel n'est pas renseigné dans l'environnement (voir `handleAuth`).
export const zitadelConfig = (): ZitadelConfig | null => {
  const domain = envConfig.ZITADEL_DOMAIN?.trim().replace(/\/+$/, '');
  const clientId = envConfig.ZITADEL_CLIENT_ID?.trim();
  const clientSecret = envConfig.ZITADEL_CLIENT_SECRET?.trim();

  return domain && clientId && clientSecret
    ? { domain, clientId, clientSecret }
    : null;
};

export const CALLBACK_PATH = '/auth/callback';

//? `offline_access` : pour recevoir un jeton de rafraîchissement, et appeler plus tard l'API de
//? Zitadel au nom de l'utilisateur sans le renvoyer se connecter.
const SCOPES = 'openid profile email offline_access';

export const randomToken = () => randomBytes(32).toString('base64url');

const challengeOf = (verifier: string) =>
  createHash('sha256').update(verifier).digest('base64url');

//? Adresse de l'écran de connexion de Zitadel pour cette tentative.
export const authorizeUrl = (
  config: ZitadelConfig,
  origin: string,
  attempt: { state: string; verifier: string },
) => {
  const url = new URL(`${config.domain}/oauth/v2/authorize`);

  url.search = new URLSearchParams({
    client_id: config.clientId,
    response_type: 'code',
    redirect_uri: origin + CALLBACK_PATH,
    scope: SCOPES,
    state: attempt.state,
    code_challenge: challengeOf(attempt.verifier),
    code_challenge_method: 'S256',
  }).toString();

  return url.href;
};

export interface ZitadelTokens {
  idToken: string | null;
  accessToken: string;
  refreshToken: string | null;
  //? Durée de vie du jeton d'accès, en secondes.
  expiresIn: number | null;
}

//? Échange le code reçu au retour contre les jetons. Lève une erreur si Zitadel refuse.
export const exchangeCode = async (
  config: ZitadelConfig,
  origin: string,
  code: string,
  verifier: string,
): Promise<ZitadelTokens> => {
  const response = await fetch(`${config.domain}/oauth/v2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(
        `${encodeURIComponent(config.clientId)}:${encodeURIComponent(config.clientSecret)}`,
      ).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: origin + CALLBACK_PATH,
      code_verifier: verifier,
    }),
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) {
    throw new Error(`Zitadel a refusé le code (${response.status}).`);
  }

  const body = (await response.json()) as {
    id_token?: string;
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
  };

  return {
    idToken: body.id_token ?? null,
    accessToken: body.access_token,
    refreshToken: body.refresh_token ?? null,
    expiresIn: body.expires_in ?? null,
  };
};

export interface ZitadelProfile {
  //? Identifiant stable du compte chez Zitadel (`user.zitadel_id`).
  sub: string;
  email: string | null;
  emailVerified: boolean;
  name: string | null;
}

//? Le compte qui vient de se connecter. Demandé à Zitadel avec le jeton d'accès reçu à l'instant
//? par un canal direct (serveur à serveur) : pas de signature de jeton à vérifier nous-mêmes.
export const fetchProfile = async (
  config: ZitadelConfig,
  accessToken: string,
): Promise<ZitadelProfile> => {
  const response = await fetch(`${config.domain}/oidc/v1/userinfo`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) {
    throw new Error(`Profil Zitadel illisible (${response.status}).`);
  }

  const body = (await response.json()) as {
    sub?: string;
    email?: string;
    email_verified?: boolean;
    nickname?: string;
    preferred_username?: string;
    name?: string;
  };
  if (!body.sub) throw new Error('Profil Zitadel sans identifiant.');

  return {
    sub: body.sub,
    email: body.email?.trim() || null,
    emailVerified: body.email_verified === true,
    name:
      body.nickname?.trim() ||
      body.preferred_username?.trim() ||
      body.name?.trim() ||
      null,
  };
};

//? Adresse qui ferme aussi la session chez Zitadel, puis ramène à l'accueil.
export const endSessionUrl = (
  config: ZitadelConfig,
  origin: string,
  idToken: string | null,
) => {
  const url = new URL(`${config.domain}/oidc/v1/end_session`);

  url.search = new URLSearchParams({
    client_id: config.clientId,
    post_logout_redirect_uri: `${origin}/`,
    ...(idToken && { id_token_hint: idToken }),
  }).toString();

  return url.href;
};
