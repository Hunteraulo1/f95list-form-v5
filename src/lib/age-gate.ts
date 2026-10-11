//? Pages visibles sans confirmation d'âge : les documents légaux, et tout ce qui sert à se connecter. L'écran de connexion (`/signin`) sert aussi aux autres services, qui ne montrent pas
//? le contenu pour adultes.
const EXEMPT = ['/legals', '/signin', '/auth', '/logout', '/impersonation'];

export const isExemptFromAgeGate = (pathname: string) =>
  EXEMPT.some((path) => pathname === path || pathname.startsWith(`${path}/`));
