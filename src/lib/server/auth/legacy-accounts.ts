import {
  hasNoSignInMethod,
  importAccount,
} from '#lib/server/auth/zitadel-account.ts';
import {
  findUserId,
  requestPasswordReset,
} from '#lib/server/auth/zitadel-login.ts';
import { assignZitadelRole } from '#lib/server/auth/zitadel-roles.ts';
import {
  isLinkedToZitadel,
  type ServiceConfig,
} from '#lib/server/auth/zitadel-service.ts';
import { orm, User } from '#lib/server/db/index.ts';
import { logger } from '#lib/server/logger.ts';

//? Les membres de l'ancien site (v4) ont leur compte ici, mais pas chez Zitadel, et leur mot de passe
//? n'a pas été repris. Leur porte d'entrée est « Mot de passe oublié » : à leur demande, on crée
//? leur compte Zitadel sans mot de passe, on le rattache à leur compte d'ici, et Zitadel leur envoie
//? le lien pour en choisir un. Seul le détenteur de l'adresse e-mail du compte reçoit ce lien : c'est
//? ce qui prouve que c'est bien lui.

//? Le compte de l'ancien site désigné par ce pseudo ou cet e-mail, s'il n'a encore jamais été
//? rattaché à Zitadel. Les comptes fantômes (sans e-mail) n'en font pas partie.
export const findLegacyAccount = async (login: string) => {
  const matches = await orm.em.find(
    User,
    {
      $or: [{ name: login }, { email: login }],
      email: { $ne: null },
      zitadelId: { $ne: null },
    },
    { populate: ['role'], limit: 2 },
  );

  //? Plusieurs comptes pour un même identifiant : on ne devine pas lequel.
  const [user] = matches;
  return matches.length === 1 && !isLinkedToZitadel(user.zitadelId)
    ? user
    : null;
};

//? Un lien renvoyé à chaque tentative de connexion ferait de l'écran de connexion un moyen
//? d'inonder une boîte aux lettres : au plus un toutes les cinq minutes par compte.
const RESEND_COOLDOWN_MS = 5 * 60 * 1000;
const lastLinkAt = new Map<string, number>();

//? Crée le compte Zitadel d'un membre de l'ancien site et lui envoie l'e-mail pour choisir son mot
//? de passe. Vrai si un compte a été activé. `urlTemplate` : voir `requestPasswordReset`.
export const activateLegacyAccount = async (
  config: ServiceConfig,
  login: string,
  urlTemplate: string,
) => {
  const user = await findLegacyAccount(login);
  if (!user?.email) return false;

  const zitadelId = await importAccount(config, {
    pseudo: user.name,
    email: user.email,
  });
  if (!zitadelId) {
    logger.warn(
      { userId: user.id },
      'compte de la v4 non activé : identifiant déjà pris chez Zitadel',
    );
    return false;
  }

  //? Son rôle d'ici est repris chez Zitadel avant de le rattacher, comme à une première connexion.
  await assignZitadelRole(zitadelId, user.role.name);
  user.zitadelId = zitadelId;
  await orm.em.flush();

  lastLinkAt.set(zitadelId, Date.now());
  await requestPasswordReset(config, zitadelId, urlTemplate);
  logger.info({ userId: user.id }, 'compte de la v4 activé chez Zitadel');

  return true;
};

//? À une connexion refusée : si l'identifiant est celui d'un membre de l'ancien site qui n'a pas
//? encore choisi son mot de passe, lui envoie le lien pour le faire. Vrai dans ce cas (l'écran de
//? connexion l'en avertit), que le compte soit activé à l'instant ou l'ait déjà été sans que son
//? lien ait servi.
export const sendLegacyLink = async (
  config: ServiceConfig,
  login: string,
  urlTemplate: string,
) => {
  if (await activateLegacyAccount(config, login, urlTemplate)) return true;

  //? Compte déjà créé chez Zitadel mais sans aucun moyen de connexion (ni mot de passe, ni Discord,
  //? ni clé) : un membre de l'ancien site dont le lien n'a pas servi.
  const zitadelId = await findUserId(config, login);
  if (!zitadelId || !(await hasNoSignInMethod(config, zitadelId))) return false;

  const last = lastLinkAt.get(zitadelId) ?? 0;
  if (Date.now() - last > RESEND_COOLDOWN_MS) {
    lastLinkAt.set(zitadelId, Date.now());
    await requestPasswordReset(config, zitadelId, urlTemplate);
  }

  return true;
};
