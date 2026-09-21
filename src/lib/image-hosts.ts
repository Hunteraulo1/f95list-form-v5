import { IMAGE_URL_MAX_LENGTH } from './profile.ts';

//? Hébergeurs d'images autorisés : la source unique de la CSP (`img-src`, voir vite.config.ts) et
//? de la validation des liens d'images saisis par les utilisateurs (avatar, bannière). Une image
//? hébergée ailleurs serait bloquée par le navigateur ; on la refuse donc à la saisie, plutôt que
//? d'afficher une image cassée. À terme, tout passera par le CDN de F95 France.
export const IMAGE_HOSTS = [
  'https://attachments.f95zone.to',
  'https://preview.f95zone.to',
  'https://cdn.f95france.site',
  'https://cdn.jsdelivr.net',
  'https://cdn.discordapp.com',
] as const;

export const IMAGE_HOSTS_LABEL = IMAGE_HOSTS.map(
  (host) => new URL(host).hostname,
).join(', ');

export type ImageUrlResult =
  | { ok: true; url: string | null }
  | { ok: false; message: string };

//? Un lien d'image doit être en https et venir d'un hébergeur de la CSP ; vide = pas d'image.
//? Partagé : le serveur valide, et les formulaires signalent l'erreur pendant la saisie.
export const parseImageUrl = (value: string): ImageUrlResult => {
  const text = value.trim();
  if (!text) return { ok: true, url: null };

  const invalid = {
    ok: false,
    message: `Le lien doit être une adresse https d'un hébergeur autorisé (${IMAGE_HOSTS_LABEL}).`,
  } as const;

  if (text.length > IMAGE_URL_MAX_LENGTH) return invalid;

  try {
    const url = new URL(text);
    const allowed = (IMAGE_HOSTS as readonly string[]).includes(url.origin);

    return allowed ? { ok: true, url: url.href } : invalid;
  } catch {
    return invalid;
  }
};
