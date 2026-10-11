import { error, redirect } from '@sveltejs/kit';
import { discordConfig } from '#lib/server/auth/discord.ts';
import {
  addIdpLink,
  retrieveIdpIntent,
} from '#lib/server/auth/zitadel-account.ts';
import { isLinkedToZitadel } from '#lib/server/auth/zitadel-service.ts';
import { orm, User } from '#lib/server/db/index.ts';
import { logger } from '#lib/server/logger.ts';
import type { RequestHandler } from './$types';

const LINK_COOKIE = 'discord_link';
const back = (outcome: string) => `/dashboard/settings?discord=${outcome}`;

//? Retour de Discord (par Zitadel) après « Lier mon compte Discord » dans les paramètres : rattache
//? le compte Discord présenté au compte de la session.
export const GET: RequestHandler = async ({ cookies, locals, url }) => {
  if (!locals.user) error(401, 'Non connecté');

  //? La liaison doit avoir été lancée depuis ce navigateur, par ce compte (voir l'action `discordLink`).
  const expected = cookies.get(LINK_COOKIE);
  cookies.delete(LINK_COOKIE, { path: '/auth/discord' });
  if (!expected || url.searchParams.get('link') !== expected) {
    error(400, 'Liaison Discord invalide ou expirée : réessayez.');
  }
  if (locals.impersonator) redirect(303, back('failed'));

  const discord = discordConfig();
  const user = await orm.em.findOne(User, { id: locals.user.id });
  const intentId = url.searchParams.get('id');
  const token = url.searchParams.get('token');

  //? Refus ou annulation chez Discord : Zitadel renvoie sur l'adresse d'échec, sans jeton.
  if (
    !discord ||
    !user ||
    !isLinkedToZitadel(user.zitadelId) ||
    !intentId ||
    !token
  ) {
    redirect(303, back('failed'));
  }

  let outcome = 'linked';
  try {
    const intent = await retrieveIdpIntent(discord.config, intentId, token);

    if (intent.idpId !== discord.idpId) {
      outcome = 'failed';
    } else if (
      intent.linkedZitadelId &&
      intent.linkedZitadelId !== user.zitadelId
    ) {
      //? Ce compte Discord sert déjà à se connecter à un autre compte.
      outcome = 'taken';
    } else {
      if (!intent.linkedZitadelId) {
        await addIdpLink(
          discord.config,
          user.zitadelId as string,
          discord.idpId,
          intent.link,
        );
      }

      user.discord = intent.link.userId;
      await orm.em.flush();
      logger.info({ userId: user.id }, 'compte Discord lié');
    }
  } catch (cause) {
    logger.warn({ err: cause, userId: user.id }, 'liaison Discord échouée');
    outcome = 'failed';
  }

  redirect(303, back(outcome));
};
