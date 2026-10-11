import { error, fail, redirect } from '@sveltejs/kit';
import { discordConfig } from '#lib/server/auth/discord.ts';
import { sendLegacyLink } from '#lib/server/auth/legacy-accounts.ts';
import {
  checkKey,
  checkTotp,
  clearPendingSession,
  clearSsoSession,
  completeAuthRequest,
  readAuthRequest,
  readPendingSession,
  readSsoSession,
  type SecondFactors,
  sessionState,
  startKeyCheck,
  startPasskeySession,
  startPasswordSession,
  writePendingSession,
  writeSsoSession,
  type ZitadelSession,
} from '#lib/server/auth/zitadel-login.ts';
import {
  type ServiceConfig,
  serviceConfig,
} from '#lib/server/auth/zitadel-service.ts';
import { logger } from '#lib/server/logger.ts';
import type { Actions, PageServerLoad, RequestEvent } from './$types';

//? Écran de connexion de Zitadel, tenu par le panel : Zitadel y envoie le navigateur avec
//? `?authRequest=…` quand une application (le panel lui-même, ou un autre service) demande une
//? connexion. Toute la vérification est dans `auth/zitadel-login.ts`.

const requireConfig = (): ServiceConfig => {
  const config = serviceConfig();
  if (!config) error(503, "La connexion n'est pas configurée sur ce serveur.");

  return config;
};

//? Sans demande de connexion en cours (adresse ouverte à la main, demande expirée), on en fait
//? naître une en passant par la connexion du panel.
const RESTART = '/auth/login';

const NOTICES: Record<string, string> = {
  discord_unknown:
    "Aucun compte n'est lié à ce compte Discord. Connecte-toi avec ton mot de passe, puis lie Discord dans tes paramètres.",
  discord_failed: "La connexion avec Discord n'a pas abouti : réessaie.",
  password_reset: 'Mot de passe modifié : tu peux te connecter.',
};

export const load: PageServerLoad = async ({ cookies, url }) => {
  const config = requireConfig();
  const authRequestId = url.searchParams.get('authRequest');
  if (!authRequestId) redirect(303, RESTART);

  const request = await readAuthRequest(config, authRequestId);
  if (!request) redirect(303, RESTART);

  //? Déjà connecté auprès de Zitadel depuis ce navigateur : pas besoin de redemander quoi que ce soit.
  const sso = readSsoSession(cookies);
  if (sso && !request.forceLogin) {
    const callback = await completeAuthRequest(config, request.id, sso);
    if (callback) redirect(303, callback, { external: true });

    clearSsoSession(cookies, url);
  }

  //? Mot de passe déjà vérifié, second facteur attendu (voir l'action `password`).
  let secondFactors: SecondFactors | null = null;
  const pending = readPendingSession(cookies);
  if (pending) {
    const state = await sessionState(config, pending);
    if (state.state === 'second_factor') secondFactors = state.factors;
    else clearPendingSession(cookies, url);
  }

  return {
    authRequest: request.id,
    loginHint: request.loginHint,
    secondFactors,
    discord: Boolean(discordConfig()),
    notice: NOTICES[url.searchParams.get('notice') ?? ''] ?? null,
  };
};

const authRequestOf = (url: URL) => url.searchParams.get('authRequest') ?? '';

//? Termine la connexion : la session devient celle du navigateur, et Zitadel donne l'adresse de
//? l'application où repartir. L'adresse est rendue à la page plutôt que suivie d'ici : la politique
//? de sécurité interdit à un formulaire de mener hors du site.
const finish = async (
  { cookies, url }: RequestEvent,
  config: ServiceConfig,
  session: ZitadelSession,
) => {
  const callback = await completeAuthRequest(
    config,
    authRequestOf(url),
    session,
  );
  if (!callback) {
    clearPendingSession(cookies, url);

    return fail(400, {
      message: 'La connexion a expiré : recommence depuis le début.',
    });
  }

  writeSsoSession(cookies, url, session);
  clearPendingSession(cookies, url);

  return { callback };
};

const SECOND_FACTOR_EXPIRED =
  'La vérification a expiré : saisis de nouveau ton mot de passe.';

export const actions: Actions = {
  password: async (event) => {
    const { cookies, request, url } = event;
    const config = requireConfig();

    const form = await request.formData();
    const login = String(form.get('login') ?? '').trim();
    const password = String(form.get('password') ?? '');
    if (!login || !password) {
      return fail(400, {
        login,
        message: "L'identifiant et le mot de passe sont requis.",
      });
    }

    const check = await startPasswordSession(config, login, password);
    if (!check.ok) {
      //? Membre de l'ancien site : son mot de passe n'a pas été repris. On lui envoie le lien pour
      //? en choisir un, et la page l'en avertit plutôt que d'annoncer un mot de passe incorrect.
      if (check.reason === 'invalid') {
        try {
          const sent = await sendLegacyLink(
            config,
            login,
            `${url.origin}/signin/reset?userId={{.UserID}}&code={{.Code}}`,
          );
          if (sent) return { login, legacy: true };
        } catch (cause) {
          logger.warn({ err: cause }, "lien de l'ancien site non envoyé");
        }
      }

      return fail(400, {
        login,
        message:
          check.reason === 'locked'
            ? 'Compte verrouillé après trop de tentatives : réessaie plus tard.'
            : 'Identifiant ou mot de passe incorrect.',
      });
    }

    const state = await sessionState(config, check.session);
    if (state.state === 'second_factor') {
      //? La session attend son second facteur : elle ne vaut rien tant qu'il n'est pas présenté.
      writePendingSession(cookies, url, check.session);

      return { secondFactor: true };
    }

    logger.info({ zitadelId: check.userId }, 'connexion par mot de passe');

    return finish(event, config, check.session);
  },

  //? Connexion sans mot de passe : la clé d'accès du compte suffit (voir `sessionState`).
  passkeyStart: async ({ cookies, request, url }) => {
    const config = requireConfig();
    const login = String((await request.formData()).get('login') ?? '').trim();
    if (!login) {
      return fail(400, {
        login,
        message: "Saisis d'abord ton pseudo ou ton e-mail.",
      });
    }

    const started = await startPasskeySession(config, login, url.hostname);
    if (!started) {
      //? Même réponse pour un compte inconnu : rien ne dit qui est inscrit.
      return fail(400, {
        login,
        message: "Aucune clé d'accès n'est enregistrée pour cet identifiant.",
      });
    }

    //? La session ne vaut rien tant que la clé n'a pas répondu (action `keyVerify`).
    writePendingSession(cookies, url, started.session);

    return { key: started.options };
  },

  totp: async (event) => {
    const { cookies, request } = event;
    const config = requireConfig();
    const pending = readPendingSession(cookies);
    if (!pending) return fail(400, { message: SECOND_FACTOR_EXPIRED });

    const code = String((await request.formData()).get('code') ?? '').replace(
      /\s/g,
      '',
    );
    const session = /^\d{6}$/.test(code)
      ? await checkTotp(config, pending, code)
      : null;
    if (!session) return fail(400, { message: 'Code incorrect.' });

    return finish(event, config, session);
  },

  keyStart: async ({ cookies, url }) => {
    const config = requireConfig();
    const pending = readPendingSession(cookies);
    if (!pending) return fail(400, { message: SECOND_FACTOR_EXPIRED });

    try {
      const { session, options } = await startKeyCheck(
        config,
        pending,
        url.hostname,
      );
      //? Le jeton de la session change à chaque étape.
      writePendingSession(cookies, url, session);

      return { key: options };
    } catch (cause) {
      logger.warn({ err: cause }, 'défi de clé de sécurité refusé');

      return fail(400, {
        message: "La clé de sécurité n'a pas pu être sollicitée : réessaie.",
      });
    }
  },

  keyVerify: async (event) => {
    const { cookies, request } = event;
    const config = requireConfig();
    const pending = readPendingSession(cookies);
    if (!pending) return fail(400, { message: SECOND_FACTOR_EXPIRED });

    let assertion: unknown;
    try {
      assertion = JSON.parse(
        String((await request.formData()).get('assertion') ?? ''),
      );
    } catch {
      assertion = null;
    }

    const session =
      assertion && typeof assertion === 'object'
        ? await checkKey(config, pending, assertion)
        : null;
    if (!session) {
      return fail(400, { message: 'Clé de sécurité refusée.' });
    }

    return finish(event, config, session);
  },

  //? « Utiliser un autre compte » à l'étape du second facteur.
  cancel: ({ cookies, url }) => {
    clearPendingSession(cookies, url);

    return { cancelled: true };
  },
};
