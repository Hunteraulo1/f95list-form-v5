//? Limites du profil partagées entre le serveur (validation) et l'éditeur (compteur, blocage).
export const DESCRIPTION_MAX_LENGTH = 2000;
export const IMAGE_URL_MAX_LENGTH = 2048;

//? Règles du pseudo et de l'identifiant Discord, communes aux paramètres du compte et à l'admin.
export const USER_NAME_MAX_LENGTH = 64;
export const DISCORD_ID_PATTERN = /^\d{5,32}$/;

//? Thème enregistré sur le compte ; « system » suit le réglage de l'appareil.
export const THEME_PREFERENCES = ['system', 'light', 'dark'] as const;
export type ThemePreference = (typeof THEME_PREFERENCES)[number];

//? Contrôle de forme seulement : c'est l'e-mail de vérification qui prouve que l'adresse existe.
export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const EMAIL_MAX_LENGTH = 128;
