import { createHash } from 'node:crypto';
import type { Cookies } from '@sveltejs/kit';
import { USER_NAME_MAX_LENGTH } from '#lib/profile.ts';
import type {
  ZitadelProfile,
  ZitadelTokens,
} from '#lib/server/auth/zitadel.ts';
import { randomToken } from '#lib/server/auth/zitadel.ts';
import { orm, Role, Session, User } from '#lib/server/db/index.ts';
import { logger } from '#lib/server/logger.ts';
import { allocateSlug } from '#lib/server/slug.ts';

export const SESSION_COOKIE = 'session';
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

//? Rôle d'un compte créé à sa première connexion.
const DEFAULT_ROLE = 'user';

//? SHA-256 suffit ici : le jeton est aléatoire (256 bits), pas un mot de passe devinable.
const hashToken = (token: string) =>
  createHash('sha256').update(token).digest('hex');

const cookieOptions = (url: URL) => ({
  path: '/',
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: url.protocol === 'https:',
});

//? Le compte local d'un compte Zitadel. Dans l'ordre : celui déjà lié ; sinon celui qui a la même
//? adresse e-mail, à condition que Zitadel l'ait vérifiée (comptes repris de la v4, dont le
//? `zitadelId` n'est qu'une valeur d'attente) ; sinon un nouveau compte.
export const findOrCreateUser = async (profile: ZitadelProfile) => {
  const linked = await orm.em.findOne(User, { zitadelId: profile.sub });
  if (linked) return linked;

  if (profile.email && profile.emailVerified) {
    //? Un compte fantôme n'a pas d'e-mail : il ne peut pas être pris par ce chemin.
    const sameEmail = await orm.em.find(
      User,
      { email: profile.email },
      { limit: 2 },
    );

    if (sameEmail.length === 1) {
      const [user] = sameEmail;
      user.zitadelId = profile.sub;
      await orm.em.flush();
      logger.info({ userId: user.id }, 'compte existant lié à Zitadel');

      return user;
    }
  }

  const role = await orm.em.findOneOrFail(Role, { name: DEFAULT_ROLE });

  //? Le nom affiché vient de Zitadel (sans le domaine d'un identifiant en forme d'e-mail). S'il
  //? est déjà pris, le lien de profil attribué (`nom-2`…) sert de nom.
  const base =
    (profile.name ?? profile.email ?? 'utilisateur')
      .split('@')[0]
      .trim()
      .slice(0, USER_NAME_MAX_LENGTH) || 'utilisateur';
  const slug = await allocateSlug(base);
  const taken = (await orm.em.count(User, { name: base })) > 0;

  const user = orm.em.create(User, {
    name: taken ? slug : base,
    slug,
    email: profile.email,
    zitadelId: profile.sub,
    role,
  });
  await orm.em.flush();
  logger.info({ userId: user.id }, 'compte créé à la première connexion');

  return user;
};

//? Ouvre une session pour ce compte et pose son cookie.
export const createSession = async (
  cookies: Cookies,
  url: URL,
  userId: string,
  tokens: ZitadelTokens,
) => {
  const token = randomToken();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

  //? Ménage au passage : les sessions expirées ne servent plus à rien.
  await orm.em.nativeDelete(Session, { expiresAt: { $lt: new Date() } });

  orm.em.create(Session, {
    id: hashToken(token),
    user: userId,
    idToken: tokens.idToken,
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    accessTokenExpiresAt: tokens.expiresIn
      ? new Date(Date.now() + tokens.expiresIn * 1000)
      : null,
    expiresAt,
  });
  await orm.em.flush();

  cookies.set(SESSION_COOKIE, token, {
    ...cookieOptions(url),
    expires: expiresAt,
  });
};

//? La session du cookie, si elle existe encore et n'a pas expiré.
export const findSession = async (cookies: Cookies) => {
  const token = cookies.get(SESSION_COOKIE);
  if (!token) return null;

  const session = await orm.em.findOne(Session, { id: hashToken(token) });
  if (!session || session.expiresAt.getTime() <= Date.now()) return null;

  return session;
};

//? Ferme la session du cookie. Retourne son `idToken`, pour fermer aussi celle de Zitadel.
export const destroySession = async (cookies: Cookies, url: URL) => {
  const token = cookies.get(SESSION_COOKIE);
  let idToken: string | null = null;

  if (token) {
    const session = await orm.em.findOne(Session, { id: hashToken(token) });
    idToken = session?.idToken ?? null;
    await orm.em.nativeDelete(Session, { id: hashToken(token) });
  }
  cookies.delete(SESSION_COOKIE, cookieOptions(url));

  return idToken;
};
