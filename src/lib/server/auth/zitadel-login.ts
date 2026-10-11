import { createPublicKey, verify } from 'node:crypto';
import type { Cookies } from '@sveltejs/kit';
import {
  type ServiceConfig,
  ZitadelApiError,
  zitadelApi,
} from '#lib/server/auth/zitadel-service.ts';

//? Le panel est l'écran de connexion de Zitadel (« login v2 » personnalisé) : quand une application
//? demande une connexion, Zitadel envoie le navigateur sur `/signin/login?authRequest=…`. Le panel
//? vérifie alors l'identité par l'API de sessions de Zitadel, puis lui rend la main.
//?
//? Le compte de service doit avoir le rôle IAM_LOGIN_CLIENT. Ce rôle permet d'ouvrir une session
//? pour n'importe quel compte : c'est ce fichier qui garantit qu'une session n'est validée qu'une
//? fois le mot de passe (ou Discord) vérifié, et le second facteur quand le compte en a un
//? (voir `completedUserId`).

export interface ZitadelSession {
  id: string;
  token: string;
}

const SESSION_LIFETIME = `${30 * 24 * 60 * 60}s`;

// --- cookies
//? `zitadel_session` : la session Zitadel du navigateur, qui évite de se reconnecter pour chaque
//? application. `signin_pending` : une connexion en attente de son second facteur (dix minutes).
const SSO_COOKIE = 'zitadel_session';
const PENDING_COOKIE = 'signin_pending';

const cookieOptions = (url: URL) => ({
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: url.protocol === 'https:',
});

const readSessionCookie = (
  cookies: Cookies,
  name: string,
): ZitadelSession | null => {
  try {
    const value = JSON.parse(
      cookies.get(name) ?? '',
    ) as Partial<ZitadelSession>;

    return typeof value.id === 'string' && typeof value.token === 'string'
      ? { id: value.id, token: value.token }
      : null;
  } catch {
    return null;
  }
};

export const readSsoSession = (cookies: Cookies) =>
  readSessionCookie(cookies, SSO_COOKIE);

export const writeSsoSession = (
  cookies: Cookies,
  url: URL,
  session: ZitadelSession,
) =>
  cookies.set(SSO_COOKIE, JSON.stringify(session), {
    ...cookieOptions(url),
    path: '/',
    maxAge: 30 * 24 * 60 * 60,
  });

export const clearSsoSession = (cookies: Cookies, url: URL) =>
  cookies.delete(SSO_COOKIE, { ...cookieOptions(url), path: '/' });

export const readPendingSession = (cookies: Cookies) =>
  readSessionCookie(cookies, PENDING_COOKIE);

export const writePendingSession = (
  cookies: Cookies,
  url: URL,
  session: ZitadelSession,
) =>
  cookies.set(PENDING_COOKIE, JSON.stringify(session), {
    ...cookieOptions(url),
    path: '/signin',
    maxAge: 600,
  });

export const clearPendingSession = (cookies: Cookies, url: URL) =>
  cookies.delete(PENDING_COOKIE, { ...cookieOptions(url), path: '/signin' });

// --- demande de connexion (OIDC)

export interface AuthRequest {
  id: string;
  //? L'application exige de se reconnecter, même avec une session en cours.
  forceLogin: boolean;
  loginHint: string | null;
}

//? La demande de connexion en cours, ou nul si elle n'existe pas ou plus.
export const readAuthRequest = async (
  config: ServiceConfig,
  id: string,
): Promise<AuthRequest | null> => {
  try {
    const { authRequest } = await zitadelApi<{
      authRequest?: { id: string; prompt?: string[]; loginHint?: string };
    }>(config, 'GET', `/v2/oidc/auth_requests/${encodeURIComponent(id)}`);
    if (!authRequest) return null;

    return {
      id: authRequest.id,
      forceLogin: (authRequest.prompt ?? []).includes('PROMPT_LOGIN'),
      loginHint: authRequest.loginHint || null,
    };
  } catch (cause) {
    if (cause instanceof ZitadelApiError && cause.status < 500) return null;
    throw cause;
  }
};

//? Rend la main à Zitadel : la session devient la réponse à la demande de connexion. Retourne
//? l'adresse de l'application où renvoyer le navigateur.
const finalizeAuthRequest = async (
  config: ServiceConfig,
  authRequestId: string,
  session: ZitadelSession,
) =>
  (
    await zitadelApi<{ callbackUrl: string }>(
      config,
      'POST',
      `/v2/oidc/auth_requests/${encodeURIComponent(authRequestId)}`,
      { session: { sessionId: session.id, sessionToken: session.token } },
    )
  ).callbackUrl;

// --- sessions

export type PasswordCheck =
  | { ok: true; session: ZitadelSession; userId: string }
  | { ok: false; reason: 'invalid' | 'locked' };

const sessionFromCreate = (body: {
  sessionId: string;
  sessionToken: string;
}) => ({
  id: body.sessionId,
  token: body.sessionToken,
});

//? Le compte d'un identifiant de connexion ou, à défaut, d'une adresse e-mail (unique).
export const findUserId = async (config: ServiceConfig, login: string) => {
  const search = async (query: object) =>
    (
      await zitadelApi<{ result?: { userId: string }[] }>(
        config,
        'POST',
        '/v2/users',
        { queries: [query] },
      )
    ).result ?? [];

  const byLogin = await search({
    loginNameQuery: {
      loginName: login,
      method: 'TEXT_QUERY_METHOD_EQUALS_IGNORE_CASE',
    },
  });
  if (byLogin.length === 1) return byLogin[0].userId;

  const byEmail = await search({
    emailQuery: {
      emailAddress: login,
      method: 'TEXT_QUERY_METHOD_EQUALS_IGNORE_CASE',
    },
  });

  //? Zitadel n'impose pas l'unicité de l'e-mail : à plusieurs comptes, il ne désigne personne.
  return byEmail.length === 1 ? byEmail[0].userId : null;
};

//? Ouvre une session en vérifiant le mot de passe. Identifiant inconnu et mot de passe faux
//? donnent la même réponse : rien ne dit si le compte existe.
export const startPasswordSession = async (
  config: ServiceConfig,
  login: string,
  password: string,
): Promise<PasswordCheck> => {
  const userId = await findUserId(config, login);
  if (!userId) return { ok: false, reason: 'invalid' };

  try {
    const body = await zitadelApi<{ sessionId: string; sessionToken: string }>(
      config,
      'POST',
      '/v2/sessions',
      {
        checks: { user: { userId }, password: { password } },
        lifetime: SESSION_LIFETIME,
      },
    );

    return { ok: true, session: sessionFromCreate(body), userId };
  } catch (cause) {
    if (cause instanceof ZitadelApiError && cause.status < 500) {
      return {
        ok: false,
        reason: /locked/i.test(cause.message) ? 'locked' : 'invalid',
      };
    }

    throw cause;
  }
};

//? Ouvre une session pour un compte qui vient de s'identifier chez un fournisseur (Discord).
export const startIdpSession = async (
  config: ServiceConfig,
  userId: string,
  intent: { id: string; token: string },
): Promise<ZitadelSession> =>
  sessionFromCreate(
    await zitadelApi(config, 'POST', '/v2/sessions', {
      checks: {
        user: { userId },
        idpIntent: { idpIntentId: intent.id, idpIntentToken: intent.token },
      },
      lifetime: SESSION_LIFETIME,
    }),
  );

const patchSession = (
  config: ServiceConfig,
  session: ZitadelSession,
  body: object,
) =>
  zitadelApi<{
    sessionToken: string;
    challenges?: {
      webAuthN?: {
        publicKeyCredentialRequestOptions?: {
          publicKey: Record<string, unknown>;
        };
      };
    };
  }>(config, 'PATCH', `/v2/sessions/${session.id}`, {
    sessionToken: session.token,
    ...body,
  });

//? Vérifie un code d'application d'authentification. Nul si le code est refusé ; sinon la session,
//? dont le jeton a changé.
export const checkTotp = async (
  config: ServiceConfig,
  session: ZitadelSession,
  code: string,
): Promise<ZitadelSession | null> => {
  try {
    const { sessionToken } = await patchSession(config, session, {
      checks: { totp: { code } },
    });

    return { id: session.id, token: sessionToken };
  } catch (cause) {
    if (cause instanceof ZitadelApiError && cause.status < 500) return null;
    throw cause;
  }
};

//? Demande à Zitadel le défi à faire signer par une clé de sécurité : les options à passer à
//? `navigator.credentials.get`, et la session (son jeton a changé).
export const startKeyCheck = async (
  config: ServiceConfig,
  session: ZitadelSession,
  domain: string,
) => {
  const body = await patchSession(config, session, {
    challenges: {
      webAuthN: {
        domain,
        //? Second facteur : la présence de la clé suffit, le mot de passe a déjà été vérifié.
        userVerificationRequirement:
          'USER_VERIFICATION_REQUIREMENT_DISCOURAGED',
      },
    },
  });
  const options =
    body.challenges?.webAuthN?.publicKeyCredentialRequestOptions?.publicKey;
  if (!options) throw new Error('Défi de clé de sécurité absent.');

  return { session: { id: session.id, token: body.sessionToken }, options };
};

//? Vérifie la réponse de la clé. Nul si elle est refusée.
export const checkKey = async (
  config: ServiceConfig,
  session: ZitadelSession,
  assertion: unknown,
): Promise<ZitadelSession | null> => {
  try {
    const { sessionToken } = await patchSession(config, session, {
      checks: { webAuthN: { credentialAssertionData: assertion } },
    });

    return { id: session.id, token: sessionToken };
  } catch (cause) {
    if (cause instanceof ZitadelApiError && cause.status < 500) return null;
    throw cause;
  }
};

export const endSession = async (
  config: ServiceConfig,
  session: ZitadelSession,
) => {
  await zitadelApi(config, 'DELETE', `/v2/sessions/${session.id}`, {
    sessionToken: session.token,
  }).catch(() => {
    //? Déjà fermée ou expirée : le résultat est le même.
  });
};

export interface SecondFactors {
  totp: boolean;
  key: boolean;
}

//? Les seconds facteurs que le compte a mis en place (voir ses paramètres).
export const secondFactorsOf = async (
  config: ServiceConfig,
  userId: string,
): Promise<SecondFactors> => {
  const methods =
    (
      await zitadelApi<{ authMethodTypes?: string[] }>(
        config,
        'GET',
        `/v2/users/${userId}/authentication_methods`,
      )
    ).authMethodTypes ?? [];

  return {
    totp: methods.includes('AUTHENTICATION_METHOD_TYPE_TOTP'),
    key: methods.includes('AUTHENTICATION_METHOD_TYPE_U2F'),
  };
};

//? Où en est une session : le compte, et ce qui a réellement été vérifié.
const inspectSession = async (
  config: ServiceConfig,
  session: ZitadelSession,
) => {
  const { session: body } = await zitadelApi<{
    session?: {
      expirationDate?: string;
      factors?: {
        user?: { id: string };
        password?: { verifiedAt?: string };
        intent?: { verifiedAt?: string };
        totp?: { verifiedAt?: string };
        webAuthN?: { verifiedAt?: string };
      };
    };
  }>(
    config,
    'GET',
    `/v2/sessions/${session.id}?sessionToken=${encodeURIComponent(session.token)}`,
  );
  const factors = body?.factors;

  return {
    userId: factors?.user?.id ?? null,
    expired: body?.expirationDate
      ? new Date(body.expirationDate).getTime() <= Date.now()
      : false,
    password: Boolean(factors?.password?.verifiedAt),
    idp: Boolean(factors?.intent?.verifiedAt),
    secondFactor: Boolean(
      factors?.totp?.verifiedAt || factors?.webAuthN?.verifiedAt,
    ),
  };
};

export type SessionState =
  | { state: 'complete'; userId: string }
  //? Mot de passe vérifié, second facteur attendu.
  | { state: 'second_factor'; userId: string; factors: SecondFactors }
  | { state: 'invalid' };

//? Dit si une session suffit à connecter son compte. C'est le verrou de tout l'écran de connexion :
//? rien n'est validé auprès de Zitadel sans passer par ici. Un compte connecté par mot de passe
//? doit avoir présenté son second facteur s'il en a un ; un compte connecté par Discord s'en remet
//? à Discord.
export const sessionState = async (
  config: ServiceConfig,
  session: ZitadelSession,
): Promise<SessionState> => {
  let inspected: Awaited<ReturnType<typeof inspectSession>>;
  try {
    inspected = await inspectSession(config, session);
  } catch (cause) {
    if (cause instanceof ZitadelApiError && cause.status < 500) {
      return { state: 'invalid' };
    }
    throw cause;
  }

  const { userId } = inspected;
  if (!userId || inspected.expired) return { state: 'invalid' };
  if (inspected.idp) return { state: 'complete', userId };
  if (!inspected.password) return { state: 'invalid' };
  if (inspected.secondFactor) return { state: 'complete', userId };

  const factors = await secondFactorsOf(config, userId);

  return factors.totp || factors.key
    ? { state: 'second_factor', userId, factors }
    : { state: 'complete', userId };
};

//? Valide la connexion auprès de Zitadel si, et seulement si, la session est complète. Retourne
//? l'adresse de l'application où renvoyer le navigateur, ou nul.
export const completeAuthRequest = async (
  config: ServiceConfig,
  authRequestId: string,
  session: ZitadelSession,
) =>
  (await sessionState(config, session)).state === 'complete'
    ? finalizeAuthRequest(config, authRequestId, session)
    : null;

// --- mot de passe oublié, vérification d'e-mail

//? Fait envoyer par Zitadel un e-mail de réinitialisation. `urlTemplate` : l'adresse du panel où
//? mène le lien, avec les jokers `{{.UserID}}` et `{{.Code}}` de Zitadel.
export const requestPasswordReset = (
  config: ServiceConfig,
  userId: string,
  urlTemplate: string,
) =>
  zitadelApi(config, 'POST', `/v2/users/${userId}/password_reset`, {
    sendLink: { urlTemplate },
  });

export type PasswordReset =
  | { ok: true }
  | { ok: false; reason: 'code' | 'policy' };

//? Pose un nouveau mot de passe avec le code reçu par e-mail.
export const resetPassword = async (
  config: ServiceConfig,
  userId: string,
  code: string,
  password: string,
): Promise<PasswordReset> => {
  try {
    await zitadelApi(config, 'POST', `/v2/users/${userId}/password`, {
      newPassword: { password, changeRequired: false },
      verificationCode: code,
    });

    return { ok: true };
  } catch (cause) {
    if (cause instanceof ZitadelApiError && cause.status < 500) {
      return {
        ok: false,
        reason: /password (is too|must )/i.test(cause.message)
          ? 'policy'
          : 'code',
      };
    }

    throw cause;
  }
};

//? Confirme une adresse e-mail avec le code du lien reçu. Faux si le code est refusé.
export const verifyEmail = async (
  config: ServiceConfig,
  userId: string,
  code: string,
) => {
  try {
    await zitadelApi(config, 'POST', `/v2/users/${userId}/email/verify`, {
      verificationCode: code,
    });

    return true;
  } catch (cause) {
    if (cause instanceof ZitadelApiError && cause.status < 500) return false;
    throw cause;
  }
};

// --- déconnexion

//? À la déconnexion d'une application, Zitadel envoie le navigateur ici avec un jeton signé qui dit
//? où le renvoyer ensuite. La signature est vérifiée avec les clés publiques de Zitadel : sans
//? cela, n'importe quel lien pourrait se servir de cette page pour rediriger ailleurs.
export const readLogoutToken = async (
  config: ServiceConfig,
  token: string,
): Promise<string | null> => {
  const [rawHeader, rawPayload, rawSignature] = token.split('.');
  if (!rawHeader || !rawPayload || !rawSignature) return null;

  try {
    const header = JSON.parse(
      Buffer.from(rawHeader, 'base64url').toString(),
    ) as { kid?: string; alg?: string };
    if (header.alg !== 'RS256') return null;

    const response = await fetch(`${config.domain}/oauth/v2/keys`, {
      signal: AbortSignal.timeout(15_000),
    });
    const { keys } = (await response.json()) as {
      keys?: (JsonWebKey & { kid?: string })[];
    };
    const jwk = keys?.find(({ kid }) => kid === header.kid);
    if (!jwk) return null;

    const valid = verify(
      'RSA-SHA256',
      Buffer.from(`${rawHeader}.${rawPayload}`),
      createPublicKey({ key: jwk, format: 'jwk' }),
      Buffer.from(rawSignature, 'base64url'),
    );
    if (!valid) return null;

    const payload = JSON.parse(
      Buffer.from(rawPayload, 'base64url').toString(),
    ) as { post_logout_redirect_uri?: string; exp?: number };
    if (payload.exp && payload.exp * 1000 < Date.now()) return null;

    return payload.post_logout_redirect_uri || null;
  } catch {
    return null;
  }
};
