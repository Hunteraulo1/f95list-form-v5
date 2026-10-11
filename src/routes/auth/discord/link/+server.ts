import { error, redirect } from '@sveltejs/kit';
import { discordConfig } from '#lib/server/auth/discord.ts';
import { randomToken } from '#lib/server/auth/zitadel.ts';
import { startIdpLink } from '#lib/server/auth/zitadel-account.ts';
import { isLinkedToZitadel } from '#lib/server/auth/zitadel-service.ts';
import { orm, User } from '#lib/server/db/index.ts';
import { logger } from '#lib/server/logger.ts';
import type { RequestHandler } from './$types';

const failed = '/dashboard/settings?discord=failed';

//? « Lier mon compte Discord » (paramètres) : envoie chez Discord, qui ramène ensuite sur
//? `/auth/discord/callback`. Un lien et non un formulaire : la politique de sécurité de la page
//? interdit à un formulaire de mener hors du site.
export const GET: RequestHandler = async ({ cookies, locals, url }) => {
  if (!locals.user) error(401, 'Non connecté');

  const discord = discordConfig();
  const user = await orm.em.findOne(User, { id: locals.user.id });
  //? Lier le compte d'un autre serait le faire à sa place.
  if (
    !discord ||
    !user ||
    !isLinkedToZitadel(user.zitadelId) ||
    locals.impersonator
  ) {
    redirect(303, failed);
  }

  //? Lie le retour à ce navigateur et à cette session.
  const link = randomToken();
  const callback = `${url.origin}/auth/discord/callback?link=${link}`;

  let authUrl: string;
  try {
    authUrl = await startIdpLink(discord.config, discord.idpId, {
      successUrl: callback,
      failureUrl: callback,
    });
  } catch (cause) {
    logger.warn({ err: cause, userId: user.id }, 'liaison Discord non lancée');
    redirect(303, failed);
  }

  cookies.set('discord_link', link, {
    path: '/auth/discord',
    httpOnly: true,
    sameSite: 'lax',
    secure: url.protocol === 'https:',
    maxAge: 600,
  });

  //? L'adresse vient de Zitadel : c'est celle du fournisseur qu'il a déclaré.
  redirect(303, authUrl, { external: true });
};
