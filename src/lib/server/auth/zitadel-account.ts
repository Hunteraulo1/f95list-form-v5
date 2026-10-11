import {
  type ServiceConfig,
  ZitadelApiError,
  zitadelApi,
} from '#lib/server/auth/zitadel-service.ts';

//? Le compte de l'utilisateur chez Zitadel, lu et modifié depuis ses paramètres. C'est Zitadel qui
//? détient le pseudo, l'e-mail et le mot de passe : la base locale n'en garde qu'une copie (pseudo,
//? e-mail vérifié). L'appelant garantit que `zitadelId` est bien celui du compte de la session.

export interface ZitadelAccount {
  nickName: string | null;
  email: string | null;
  emailVerified: boolean;
}

interface RawUser {
  user?: {
    human?: {
      profile?: {
        givenName?: string;
        familyName?: string;
        nickName?: string;
      };
      email?: { email?: string; isVerified?: boolean };
    };
  };
}

const readUser = (config: ServiceConfig, zitadelId: string) =>
  zitadelApi<RawUser>(config, 'GET', `/v2/users/${zitadelId}`);

export const readAccount = async (
  config: ServiceConfig,
  zitadelId: string,
): Promise<ZitadelAccount> => {
  const human = (await readUser(config, zitadelId)).user?.human;

  return {
    nickName: human?.profile?.nickName?.trim() || null,
    email: human?.email?.email?.trim() || null,
    emailVerified: human?.email?.isVerified === true,
  };
};

//? Le pseudo est le nom affiché partout : surnom et nom d'affichage du profil Zitadel. Prénom et
//? nom, que Zitadel exige, sont renvoyés tels quels ; l'identifiant de connexion ne change pas.
export const updatePseudo = async (
  config: ServiceConfig,
  zitadelId: string,
  pseudo: string,
) => {
  const profile = (await readUser(config, zitadelId)).user?.human?.profile;

  await zitadelApi(config, 'PUT', `/v2/users/human/${zitadelId}`, {
    profile: {
      givenName: profile?.givenName || pseudo,
      familyName: profile?.familyName || pseudo,
      nickName: pseudo,
      displayName: pseudo,
    },
  });
};

//? Adresse du panel où mène le lien de vérification d'un e-mail (`/signin/verify`), avec les jokers
//? de Zitadel.
const verifyEmailTemplate = (origin: string) =>
  `${origin}/signin/verify?userId={{.UserID}}&code={{.Code}}`;

//? Change l'adresse e-mail : Zitadel envoie un e-mail de vérification à la nouvelle adresse, qui
//? reste « non vérifiée » tant que le lien reçu n'a pas été suivi.
export const changeEmail = (
  config: ServiceConfig,
  zitadelId: string,
  email: string,
  origin: string,
) =>
  zitadelApi(config, 'POST', `/v2/users/${zitadelId}/email`, {
    email,
    sendCode: { urlTemplate: verifyEmailTemplate(origin) },
  });

//? Un mot de passe refusé pour sa forme : « Password is too short », « Password must contain upper
//? case »… (le mot de passe actuel faux se dit, lui, « Password is invalid »).
const isPasswordPolicyError = (cause: ZitadelApiError) =>
  /password (is too|must )/i.test(cause.message);

export type PasswordChange =
  | { ok: true }
  | { ok: false; reason: 'wrong_current' | 'policy' | 'locked' };

//? Change le mot de passe ; Zitadel vérifie lui-même le mot de passe actuel et ses règles de
//? complexité. Toute autre erreur est levée telle quelle.
export const changePassword = async (
  config: ServiceConfig,
  zitadelId: string,
  current: string,
  next: string,
): Promise<PasswordChange> => {
  try {
    await zitadelApi(config, 'POST', `/v2/users/${zitadelId}/password`, {
      newPassword: { password: next, changeRequired: false },
      currentPassword: current,
    });

    return { ok: true };
  } catch (cause) {
    if (cause instanceof ZitadelApiError && cause.status < 500) {
      if (/locked/i.test(cause.message)) return { ok: false, reason: 'locked' };
      if (isPasswordPolicyError(cause)) return { ok: false, reason: 'policy' };
      if (/invalid|not set|not found/i.test(cause.message)) {
        return { ok: false, reason: 'wrong_current' };
      }
    }

    throw cause;
  }
};

export interface PasswordPolicy {
  minLength: number;
  uppercase: boolean;
  lowercase: boolean;
  number: boolean;
  symbol: boolean;
}

//? Règles de complexité en vigueur chez Zitadel, pour les annoncer avant la saisie.
export const readPasswordPolicy = async (
  config: ServiceConfig,
): Promise<PasswordPolicy> => {
  const { settings } = await zitadelApi<{
    settings?: {
      minLength?: string | number;
      requiresUppercase?: boolean;
      requiresLowercase?: boolean;
      requiresNumber?: boolean;
      requiresSymbol?: boolean;
    };
  }>(config, 'GET', '/v2/settings/password/complexity');

  return {
    minLength: Number(settings?.minLength ?? 8),
    uppercase: settings?.requiresUppercase === true,
    lowercase: settings?.requiresLowercase === true,
    number: settings?.requiresNumber === true,
    symbol: settings?.requiresSymbol === true,
  };
};

// --- double authentification : application d'authentification (TOTP) et clés de sécurité (U2F)
//? Enrôler un second facteur pour un compte demande au compte de service le droit
//? `user.credential.write` (rôle ORG_OWNER).

export interface SecurityKey {
  id: string;
  name: string;
}

export interface AccountSecurity {
  totp: boolean;
  keys: SecurityKey[];
}

//? Les seconds facteurs en service sur ce compte (un enrôlement commencé mais jamais confirmé ne compte pas).
export const readSecurity = async (
  config: ServiceConfig,
  zitadelId: string,
): Promise<AccountSecurity> => {
  const { result } = await zitadelApi<{
    result?: {
      state?: string;
      otp?: object;
      u2f?: { id: string; name?: string };
    }[];
  }>(
    config,
    'POST',
    `/management/v1/users/${zitadelId}/auth_factors/_search`,
    {},
  );
  const ready = (result ?? []).filter(
    ({ state }) => state === 'AUTH_FACTOR_STATE_READY',
  );

  return {
    totp: ready.some(({ otp }) => otp !== undefined),
    keys: ready.flatMap(({ u2f }) =>
      u2f ? [{ id: u2f.id, name: u2f.name || 'Clé de sécurité' }] : [],
    ),
  };
};

//? Commence l'enrôlement d'une application d'authentification : le secret à lui donner (et son
//? adresse `otpauth://`, pour un QR code). Sans effet tant qu'un code n'a pas été confirmé.
export const startTotp = (config: ServiceConfig, zitadelId: string) =>
  zitadelApi<{ uri: string; secret: string }>(
    config,
    'POST',
    `/v2/users/${zitadelId}/totp`,
    {},
  );

//? Confirme l'enrôlement avec un code de l'application. Faux si le code est refusé.
export const verifyTotp = async (
  config: ServiceConfig,
  zitadelId: string,
  code: string,
) => {
  try {
    await zitadelApi(config, 'POST', `/v2/users/${zitadelId}/totp/verify`, {
      code,
    });

    return true;
  } catch (cause) {
    if (
      cause instanceof ZitadelApiError &&
      /invalid code/i.test(cause.message)
    ) {
      return false;
    }

    throw cause;
  }
};

export const removeTotp = (config: ServiceConfig, zitadelId: string) =>
  zitadelApi(config, 'DELETE', `/v2/users/${zitadelId}/totp`);

//? Commence l'enrôlement d'une clé de sécurité : les options à passer telles quelles à
//? `navigator.credentials.create`. `domain` est celui où la clé servira, c'est-à-dire celui de
//? l'écran de connexion de Zitadel.
export const startSecurityKey = async (
  config: ServiceConfig,
  zitadelId: string,
  domain: string,
) => {
  const body = await zitadelApi<{
    u2fId: string;
    publicKeyCredentialCreationOptions: { publicKey: Record<string, unknown> };
  }>(config, 'POST', `/v2/users/${zitadelId}/u2f`, { domain });

  return {
    id: body.u2fId,
    options: body.publicKeyCredentialCreationOptions.publicKey,
  };
};

//? Termine l'enrôlement avec la réponse de la clé (`PublicKeyCredential` en JSON).
export const verifySecurityKey = (
  config: ServiceConfig,
  zitadelId: string,
  keyId: string,
  credential: unknown,
  name: string,
) =>
  zitadelApi(config, 'POST', `/v2/users/${zitadelId}/u2f/${keyId}`, {
    publicKeyCredential: credential,
    tokenName: name,
  });

export const removeSecurityKey = (
  config: ServiceConfig,
  zitadelId: string,
  keyId: string,
) => zitadelApi(config, 'DELETE', `/v2/users/${zitadelId}/u2f/${keyId}`);

// --- compte Discord lié
//? Discord est un fournisseur d'identité déclaré dans Zitadel (`ZITADEL_DISCORD_IDP_ID`) : on s'y
//? connecte depuis l'écran de Zitadel, et l'identifiant Discord du compte vient de ce lien plutôt
//? que d'une saisie à la main.

export interface IdpLink {
  //? Identifiant du compte chez le fournisseur (l'identifiant numérique Discord).
  userId: string;
  userName: string | null;
}

export const readIdpLink = async (
  config: ServiceConfig,
  zitadelId: string,
  idpId: string,
): Promise<IdpLink | null> => {
  const { result } = await zitadelApi<{
    result?: { idpId: string; userId: string; userName?: string }[];
  }>(config, 'POST', `/v2/users/${zitadelId}/links/_search`, {});
  const link = result?.find((item) => item.idpId === idpId);

  return link ? { userId: link.userId, userName: link.userName || null } : null;
};

//? Commence la liaison : l'adresse du fournisseur où envoyer l'utilisateur. Il revient ensuite sur
//? `successUrl` avec `id` et `token` (voir `retrieveIdpIntent`), ou sur `failureUrl`.
export const startIdpLink = async (
  config: ServiceConfig,
  idpId: string,
  urls: { successUrl: string; failureUrl: string },
) =>
  (
    await zitadelApi<{ authUrl: string }>(config, 'POST', '/v2/idp_intents', {
      idpId,
      urls,
    })
  ).authUrl;

//? Ce que le fournisseur a répondu : le compte présenté, et le compte Zitadel auquel il est déjà
//? lié s'il y en a un.
export const retrieveIdpIntent = async (
  config: ServiceConfig,
  intentId: string,
  token: string,
) => {
  const body = await zitadelApi<{
    idpInformation?: {
      idpId: string;
      userId: string;
      userName?: string;
      //? Réponse brute du fournisseur (pour Discord : son objet « utilisateur »).
      rawInformation?: {
        RawInfo?: { username?: unknown; global_name?: unknown };
      };
    };
    userId?: string;
  }>(config, 'POST', `/v2/idp_intents/${intentId}`, { idpIntentToken: token });

  if (!body.idpInformation) throw new Error('Réponse du fournisseur vide.');

  //? Un fournisseur OAuth générique ne dit à Zitadel que l'identifiant du compte : son nom est lu
  //? dans la réponse brute.
  const raw = body.idpInformation.rawInformation?.RawInfo;
  const rawName = [raw?.username, raw?.global_name].find(
    (value): value is string => typeof value === 'string' && value !== '',
  );

  return {
    idpId: body.idpInformation.idpId,
    link: {
      userId: body.idpInformation.userId,
      userName: body.idpInformation.userName || rawName || null,
    } satisfies IdpLink,
    linkedZitadelId: body.userId || null,
  };
};

export const addIdpLink = (
  config: ServiceConfig,
  zitadelId: string,
  idpId: string,
  link: IdpLink,
) =>
  zitadelApi(config, 'POST', `/v2/users/${zitadelId}/links`, {
    //? Zitadel exige un nom : à défaut, l'identifiant du compte.
    idpLink: {
      idpId,
      userId: link.userId,
      userName: link.userName ?? link.userId,
    },
  });

export const removeIdpLink = (
  config: ServiceConfig,
  zitadelId: string,
  idpId: string,
  linkedUserId: string,
) =>
  zitadelApi(
    config,
    'DELETE',
    `/v2/users/${zitadelId}/links/${idpId}/${encodeURIComponent(linkedUserId)}`,
  );

//? Le compte a-t-il un mot de passe ? Un compte créé par Discord n'en a pas.
export const hasPassword = async (config: ServiceConfig, zitadelId: string) =>
  (
    (
      await zitadelApi<{ authMethodTypes?: string[] }>(
        config,
        'GET',
        `/v2/users/${zitadelId}/authentication_methods`,
      )
    ).authMethodTypes ?? []
  ).includes('AUTHENTICATION_METHOD_TYPE_PASSWORD');

// --- inscription
//? Zitadel exige un prénom et un nom sur chaque compte, et son propre formulaire d'inscription les
//? demande. L'inscription se fait donc ici : la personne ne donne qu'un pseudo, qui sert aussi de
//? prénom et de nom.

export type AccountCreation =
  | { ok: true; zitadelId: string }
  | { ok: false; reason: 'taken' | 'policy' };

//? Crée le compte chez Zitadel. Le pseudo est son identifiant de connexion (l'e-mail en est un
//? aussi) ; Zitadel envoie un e-mail pour vérifier l'adresse. Toute autre erreur est levée.
export const createAccount = async (
  config: ServiceConfig,
  account: { pseudo: string; email: string; password: string },
  origin: string,
): Promise<AccountCreation> => {
  try {
    const { userId } = await zitadelApi<{ userId: string }>(
      config,
      'POST',
      '/v2/users/human',
      {
        username: account.pseudo,
        profile: {
          givenName: account.pseudo,
          familyName: account.pseudo,
          nickName: account.pseudo,
          displayName: account.pseudo,
        },
        email: {
          email: account.email,
          sendCode: { urlTemplate: verifyEmailTemplate(origin) },
        },
        password: { password: account.password, changeRequired: false },
      },
    );

    return { ok: true, zitadelId: userId };
  } catch (cause) {
    if (cause instanceof ZitadelApiError && cause.status < 500) {
      if (cause.status === 409 || /already exists/i.test(cause.message)) {
        return { ok: false, reason: 'taken' };
      }
      if (isPasswordPolicyError(cause)) return { ok: false, reason: 'policy' };
    }

    throw cause;
  }
};
