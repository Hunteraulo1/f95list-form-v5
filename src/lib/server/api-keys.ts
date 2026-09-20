import { createHash, randomBytes } from 'node:crypto';

export const API_KEY_PREFIX_LENGTH = 12;
export const API_KEY_NAME_MAX_LENGTH = 64;

//? Bornes de saisie des quotas côté admin (0 = tout bloquer).
export const MAX_API_KEY_LIMIT = 100;
export const MAX_API_DAILY_QUOTA = 1_000_000;

//? SHA-256 suffit ici : la clé est aléatoire (256 bits), pas un mot de passe devinable.
export const hashApiKey = (key: string) =>
  createHash('sha256').update(key).digest('hex');

export const generateApiKey = () => {
  const key = `f95_${randomBytes(32).toString('base64url')}`;

  return {
    key,
    prefix: key.slice(0, API_KEY_PREFIX_LENGTH),
    hash: hashApiKey(key),
  };
};

//? Le compteur de requêtes est remis à zéro chaque jour à minuit UTC.
export const todayUtc = () => new Date().toISOString().slice(0, 10);

export const nextResetUtc = () => {
  const now = new Date();

  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1),
  );
};

interface QuotaKey {
  dailyQuota?: number | null;
  usageCount: number;
  usageDate?: unknown;
  user: { role: { apiDailyQuota: number } };
}

//? Le quota de la clé, sinon celui du rôle de son propriétaire.
export const effectiveDailyQuota = (key: QuotaKey) =>
  key.dailyQuota ?? key.user.role.apiDailyQuota;

export const usedToday = (key: QuotaKey) =>
  key.usageDate != null && String(key.usageDate).slice(0, 10) === todayUtc()
    ? key.usageCount
    : 0;

//? Entier entre 0 et `max` ; `null` si vide (pas de valeur), `undefined` si invalide.
export const parseQuota = (
  value: FormDataEntryValue | null,
  max: number,
): number | null | undefined => {
  const text = String(value ?? '').trim();
  if (!text) return null;
  if (!/^\d+$/.test(text)) return undefined;

  const number = Number(text);
  return number <= max ? number : undefined;
};
