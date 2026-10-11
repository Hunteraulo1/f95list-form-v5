import { error, redirect } from '@sveltejs/kit';
import { discordConfig } from '#lib/server/auth/discord.ts';
import { randomToken } from '#lib/server/auth/zitadel.ts';
import { startIdpLink } from '#lib/server/auth/zitadel-account.ts';
import { logger } from '#lib/server/logger.ts';
import type { RequestHandler } from './$types';

//? « Se connecter avec Discord » de l'écran de connexion : envoie chez Discord, qui ramène sur
//? `/signin/discord/callback`.
export const GET: RequestHandler = async ({ cookies, url }) => {
  const authRequest = url.searchParams.get('authRequest');
  if (!authRequest) error(400, 'Demande de connexion manquante.');

  const back = `/signin/login?authRequest=${encodeURIComponent(authRequest)}`;
  const discord = discordConfig();
  if (!discord) redirect(303, `${back}&notice=discord_failed`);

  //? Lie le retour à ce navigateur : sans cela, un lien piégé pourrait connecter quelqu'un au
  //? compte d'un autre.
  const nonce = randomToken();
  const callback = `${url.origin}/signin/discord/callback?authRequest=${encodeURIComponent(authRequest)}&nonce=${nonce}`;

  let authUrl: string;
  try {
    authUrl = await startIdpLink(discord.config, discord.idpId, {
      successUrl: callback,
      failureUrl: callback,
    });
  } catch (cause) {
    logger.warn({ err: cause }, 'connexion Discord non lancée');
    redirect(303, `${back}&notice=discord_failed`);
  }

  cookies.set('signin_discord', nonce, {
    path: '/signin/discord',
    httpOnly: true,
    sameSite: 'lax',
    secure: url.protocol === 'https:',
    maxAge: 600,
  });

  //? L'adresse vient de Zitadel : c'est celle du fournisseur qu'il a déclaré.
  redirect(303, authUrl, { external: true });
};
