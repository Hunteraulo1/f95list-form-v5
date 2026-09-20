//? Hébergeurs d'images autorisés : la source unique de la CSP (`img-src`, voir vite.config.ts) et
//? de la validation des liens d'images saisis par les utilisateurs (avatar, bannière). Une image
//? hébergée ailleurs serait bloquée par le navigateur ; on la refuse donc à la saisie, plutôt que
//? d'afficher une image cassée. À terme, tout passera par le CDN de F95 France.
export const IMAGE_HOSTS = [
  'https://attachments.f95zone.to',
  'https://cdn.f95france.site',
  'https://cdn.jsdelivr.net',
  'https://cdn.discordapp.com',
] as const;
