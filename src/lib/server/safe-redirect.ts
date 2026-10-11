//? Adresse où renvoyer après une étape (connexion, confirmation d'âge) : une adresse interne
//? uniquement, jamais un autre site. Sinon `fallback`.
export const safeRedirect = (value: string | null, fallback: string) =>
  value?.startsWith('/') && !value.startsWith('//') && !value.includes('\\')
    ? value
    : fallback;
