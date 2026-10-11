import { type IdpLink, readIdpLink } from '#lib/server/auth/zitadel-account.ts';
import {
  isLinkedToZitadel,
  type ServiceConfig,
  serviceConfig,
} from '#lib/server/auth/zitadel-service.ts';
import { orm, User } from '#lib/server/db/index.ts';
import { envConfig } from '#lib/server/env/index.ts';
import { logger } from '#lib/server/logger.ts';

//? Discord passe par Zitadel : c'est un fournisseur d'identité de son écran de connexion, et
//? l'identifiant Discord d'un compte (`user.discord`) est celui du compte Discord qui y est lié.

export interface DiscordConfig {
  config: ServiceConfig;
  idpId: string;
}

//? Nul tant que le fournisseur Discord n'est pas renseigné : l'identifiant se saisit alors à la main.
export const discordConfig = (): DiscordConfig | null => {
  const config = serviceConfig();
  const idpId = envConfig.ZITADEL_DISCORD_IDP_ID?.trim();

  return config && idpId ? { config, idpId } : null;
};

//? Recopie dans la base l'identifiant du compte Discord lié chez Zitadel. Un compte sans lien garde
//? l'identifiant qu'il avait (repris de la v4 ou saisi à la main) : il ne sera remplacé que par un
//? vrai lien. Retourne le lien, ou nul. Une panne de Zitadel ne bloque rien.
export const syncDiscordFromZitadel = async (
  user: Pick<User, 'id' | 'zitadelId' | 'discord'>,
): Promise<IdpLink | null> => {
  const discord = discordConfig();
  if (!discord || !isLinkedToZitadel(user.zitadelId)) return null;

  try {
    const link = await readIdpLink(
      discord.config,
      user.zitadelId as string,
      discord.idpId,
    );

    if (link && link.userId !== user.discord) {
      await orm.em.nativeUpdate(
        User,
        { id: user.id },
        { discord: link.userId },
      );
    }

    return link;
  } catch (cause) {
    logger.warn({ err: cause, userId: user.id }, 'lien Discord illisible');

    return null;
  }
};
