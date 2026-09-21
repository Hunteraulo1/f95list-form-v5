//? Règles de comportement à accepter pour devenir traducteur. À relire et adapter à la communauté :
//? quand le texte change vraiment, incrémenter `TRANSLATOR_RULES_VERSION` (la version acceptée est
//? enregistrée sur le compte, `user.translator_rules_version`).
export const TRANSLATOR_RULES_VERSION = 1;

export interface TranslatorRule {
  id: string;
  title: string;
  text: string;
}

export const TRANSLATOR_RULES: TranslatorRule[] = [
  {
    id: 'credit',
    title: 'Respecter le travail des autres',
    text: 'Je cite le développeur du jeu et les autres traducteurs, et je ne reprends pas leur travail sans leur accord.',
  },
  {
    id: 'source',
    title: 'Respecter le site d’origine',
    text: 'Je respecte les règles du site où le jeu est publié et le souhait du développeur s’il refuse qu’on traduise son jeu.',
  },
  {
    id: 'honesty',
    title: 'Renseigner des informations exactes',
    text: 'J’indique la vraie version, le vrai type et la vraie qualité de ma traduction : une traduction automatique n’est pas présentée comme relue.',
  },
  {
    id: 'links',
    title: 'Ne partager que des liens sûrs',
    text: 'Mes liens de téléchargement mènent bien à la traduction, sans logiciel malveillant, sans publicité déguisée ni contenu payant.',
  },
  {
    id: 'courtesy',
    title: 'Rester courtois et à jour',
    text: 'Je reste respectueux envers la communauté et l’équipe, et je mets à jour mes traductions ou je les signale comme abandonnées.',
  },
];
