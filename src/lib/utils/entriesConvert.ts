import type { GameTranslation } from '$lib/server/db';

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

export const translationTypeName = (quality: GameTranslation['type']) => {
  switch (quality) {
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
