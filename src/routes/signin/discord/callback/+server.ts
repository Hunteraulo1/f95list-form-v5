import { error, redirect } from '@sveltejs/kit';
import { discordConfig } from '#lib/server/auth/discord.ts';
import { retrieveIdpIntent } from '#lib/server/auth/zitadel-account.ts';
import {
  completeAuthRequest,
  startIdpSession,
  writeSsoSession,
} from '#lib/server/auth/zitadel-login.ts';
import { logger } from '#lib/server/logger.ts';
import type { RequestHandler } from './$types';

//? Retour de Discord (par Zitadel) pendant une connexion : ouvre la session du compte auquel ce
//? compte Discord est lié, et rend la main à Zitadel.
export const GET: RequestHandler = async ({ cookies, url }) => {
  const authRequest = url.searchParams.get('authRequest');
  if (!authRequest) error(400, 'Demande de connexion manquante.');

  const expected = cookies.get('signin_discord');
  cookies.delete('signin_discord', { path: '/signin/discord' });
  if (!expected || url.searchParams.get('nonce') !== expected) {
    error(400, 'Connexion Discord invalide ou expirée : réessayez.');
  }

  const back = (notice: string) =>
    `/signin/login?authRequest=${encodeURIComponent(authRequest)}&notice=${notice}`;
  const discord = discordConfig();
  const intentId = url.searchParams.get('id');
  const token = url.searchParams.get('token');
  //? Refus ou annulation chez Discord : Zitadel renvoie ici sans jeton.
  if (!discord || !intentId || !token) redirect(303, back('discord_failed'));

  let callback: string | null;
  try {
    const intent = await retrieveIdpIntent(discord.config, intentId, token);
    if (intent.idpId !== discord.idpId) redirect(303, back('discord_failed'));
    //? Compte Discord que personne n'a lié : pas d'inscription par ce chemin.
    if (!intent.linkedZitadelId) redirect(303, back('discord_unknown'));

    const session = await startIdpSession(
      discord.config,
      intent.linkedZitadelId,
      { id: intentId, token },
    );
    callback = await completeAuthRequest(discord.config, authRequest, session);
    if (callback) {
      writeSsoSession(cookies, url, session);
      logger.info(
        { zitadelId: intent.linkedZitadelId },
        'connexion par Discord',
      );
    }
  } catch (cause) {
    //? `redirect` se propage par une exception : on ne l'intercepte pas.
    if (!(cause instanceof Error)) throw cause;

    logger.warn({ err: cause }, 'connexion Discord échouée');
    callback = null;
  }

  redirect(303, callback ?? back('discord_failed'), { external: true });
};
