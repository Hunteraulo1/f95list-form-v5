import type { GameEdition, GameTranslation } from '$lib/server/db';

export const editionStatusName = (status: GameEdition['status']) => {
  switch (status) {
    case 'in_progress':
      return 'En cours';
    case 'completed':
      return 'Terminée';
    case 'abandoned':
      return 'Abandonnée';
    case 'on_hold':
      return 'En pause';
  }
};

export const translationQualityName = (quality: GameTranslation['quality']) => {
  switch (quality) {
    case 'automatic':
      return 'Automatique';
    case 'full-proofreading':
      return 'Relecture complète';
    case 'not-working':
      return 'Non fonctionnelle';
    case 'original-french':
      return 'Version franaçise original';
    case 'partial-proofreading':
      return 'Relecture partielle';
    case 'unrated':
      return 'Non noté';
  }
};

export const translationTypeName = (type: GameTranslation['type']) => {
  switch (type) {
    case 'integrated':
      return 'Intégrée';
    case 'mods':
      return "Traduction d'un mod";
    case 'no_translation':
      return 'Plus de traduction';
    case 'translation':
      return 'Traduction classique';
    case 'translation_with_mods':
      return 'Traduction avec mods';
  }
};
