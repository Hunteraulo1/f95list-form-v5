import type { Handle } from '@sveltejs/kit';

//? Le thème choisi dans les paramètres du compte est posé dès le rendu serveur, pour qu'il suive
//? l'utilisateur d'un appareil à l'autre sans flash. Le choix fait sur l'appareil (bouton de
//? l'en-tête, gardé en localStorage) reste prioritaire : le script de `app.html` l'applique ensuite.
export const handleTheme: Handle = ({ event, resolve }) => {
  const theme = event.locals.user?.theme ?? 'system';
  if (theme === 'system') return resolve(event);

  return resolve(event, {
    transformPageChunk: ({ html }) =>
      html.replace(/<html\b/, `<html data-theme="${theme}"`),
  });
};
