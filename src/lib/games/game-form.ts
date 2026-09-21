import { parseImageUrl } from '$lib/image-hosts';

//? Règles du formulaire « Ajouter un jeu », partagées entre la page (champs affichés selon le type)
//? et le serveur (validation). Elles reprennent les conventions des données existantes : une
//? traduction « pas de traduction » a une version vide et la qualité « non fonctionnelle », une
//? traduction intégrée a la version « Intégrée » et aucun traducteur.
export const GAME_NAME_MAX_LENGTH = 255;
export const EDITION_NAME_MAX_LENGTH = 255;
export const VERSION_MAX_LENGTH = 36;
export const DESCRIPTION_MAX_LENGTH = 10000;
export const LINK_MAX_LENGTH = 2048;
export const THREAD_ID_MAX = 16_777_215;

export const EDITION_STATUSES = [
  'in_progress',
  'completed',
  'abandoned',
  'on_hold',
] as const;

export const TRANSLATION_TYPES = [
  'translation',
  'translation_with_mods',
  'mods',
  'integrated',
  'no_translation',
] as const;

export const TRANSLATION_QUALITIES = [
  'automatic',
  'partial-proofreading',
  'full-proofreading',
  'original-french',
  'unrated',
  'not-working',
] as const;

export type EditionStatus = (typeof EDITION_STATUSES)[number];
export type TranslationType = (typeof TRANSLATION_TYPES)[number];
export type TranslationQuality = (typeof TRANSLATION_QUALITIES)[number];

export const INTEGRATED_VERSION = 'Intégrée';
export const NO_TRANSLATION_QUALITY: TranslationQuality = 'not-working';

//? Sites dont l'adresse du thread se déduit de son numéro. Les autres sites : lien saisi à la main.
const THREAD_BASES: Record<string, string> = {
  F95zone: 'https://f95zone.to',
  LewdCorner: 'https://lewdcorner.com',
};

export const threadBase = (originName: string) =>
  THREAD_BASES[originName] ?? null;

export const threadLink = (originName: string, threadId: number) => {
  const base = threadBase(originName);

  return base ? `${base}/threads/${threadId}` : null;
};

//? Ce que chaque type de traduction demande ou impose.
export interface TranslationShape {
  //? Version de la traduction saisie par la personne ; sinon `fixedVersion` (ou vide).
  versionRequired: boolean;
  fixedVersion: string;
  //? Lien de téléchargement obligatoire, facultatif, ou sans objet.
  link: 'required' | 'optional' | 'none';
  //? Qualité imposée (sinon au choix).
  fixedQuality: TranslationQuality | null;
  //? Traducteurs demandés (une traduction intégrée ou absente n'en a pas).
  translators: boolean;
}

export const translationShape = (type: TranslationType): TranslationShape => {
  switch (type) {
    case 'no_translation':
      return {
        versionRequired: false,
        fixedVersion: '',
        link: 'none',
        fixedQuality: NO_TRANSLATION_QUALITY,
        translators: false,
      };
    case 'integrated':
      return {
        versionRequired: false,
        fixedVersion: INTEGRATED_VERSION,
        link: 'optional',
        fixedQuality: null,
        translators: false,
      };
    default:
      return {
        versionRequired: true,
        fixedVersion: '',
        link: 'required',
        fixedQuality: null,
        translators: true,
      };
  }
};

//? Adresse web (http ou https) : pour les liens de jeu et de téléchargement.
export const parseWebUrl = (value: string) => {
  try {
    const url = new URL(value);

    return ['http:', 'https:'].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
};

export type FieldErrors = Record<string, string>;

//? Références de personnes envoyées par le formulaire : un compte existant, ou un nom à créer.
export const userRef = (id: string) => `user:${id}`;
export const newUserRef = (name: string) => `new:${name}`;

export const parseUserRef = (
  value: string,
): { kind: 'user'; id: string } | { kind: 'new'; name: string } | null => {
  if (value.startsWith('user:')) return { kind: 'user', id: value.slice(5) };
  if (value.startsWith('new:')) return { kind: 'new', name: value.slice(4) };

  return null;
};

export interface FieldStateInput {
  hasThread: boolean;
  threadId: string;
  link: string;
  name: string;
  image: string;
  tagCount: number;
  description: string;
  editionVersion: string;
  type: TranslationType;
  translationVersion: string;
  translationLink: string;
  translatorCount: number;
}

//? Champs en erreur (rouge, bloquants) ou à surveiller (jaune) pendant la saisie, comme dans la v4.
//? Le serveur revérifie tout et reste seul juge : ceci ne sert qu'à guider et à bloquer l'envoi.
export const computeFieldState = (v: FieldStateInput) => {
  const errors: Record<string, boolean> = {};
  const warns: Record<string, boolean> = {};
  const shape = translationShape(v.type);

  if (!v.name.trim()) errors.name = true;

  if (v.hasThread) {
    const id = /^\d+$/.test(v.threadId.trim()) ? Number(v.threadId) : 0;
    if (id < 1 || id > THREAD_ID_MAX) errors.threadId = true;
  } else if (!parseWebUrl(v.link.trim())) {
    errors.link = true;
  }

  const image = v.image.trim();
  if (!image ? v.hasThread : !parseImageUrl(image).ok) errors.image = true;

  if (v.tagCount === 0) errors.tags = true;

  const version = v.editionVersion.trim();
  if (!version || version.length > VERSION_MAX_LENGTH)
    errors.editionVersion = true;

  if (shape.versionRequired && !v.translationVersion.trim()) {
    errors.translationVersion = true;
  }

  const link = v.translationLink.trim();
  if (shape.link === 'required') {
    if (!parseWebUrl(link)) errors.translationLink = true;
  } else if (shape.link === 'optional' && link && !parseWebUrl(link)) {
    errors.translationLink = true;
  }

  if (shape.translators && v.translatorCount === 0) errors.translators = true;

  if (!v.description.trim()) warns.description = true;

  return { errors, warns, blocking: Object.keys(errors).length > 0 };
};
