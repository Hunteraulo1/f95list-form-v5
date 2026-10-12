//? Couleur d'un rôle : celle de son badge et du pseudo de ses membres, là où ils sont affichés
//? (accueil, profil, administration). Réglée par rôle sur /admin/roles (`role.badge_style`).
export const ROLE_STYLES = [
  'default',
  'primary',
  'secondary',
  'accent',
  'info',
  'success',
  'warning',
  'error',
  'neutral',
  'superadmin',
] as const;

export type RoleStyle = (typeof ROLE_STYLES)[number];

export const isRoleStyle = (value: unknown): value is RoleStyle =>
  ROLE_STYLES.includes(value as RoleStyle);

//? Une valeur inconnue en base (style retiré depuis) retombe sur le style neutre.
export const toRoleStyle = (value: unknown): RoleStyle =>
  isRoleStyle(value) ? value : 'default';

//? Le dégradé animé est la marque du rôle super admin : aucun autre rôle ne peut le prendre.
export const SUPER_ROLE_STYLE: RoleStyle = 'superadmin';

export const ROLE_STYLE_LABELS: Record<RoleStyle, string> = {
  default: 'Par défaut',
  primary: 'Primaire',
  secondary: 'Secondaire',
  accent: 'Accent',
  info: 'Info',
  success: 'Succès',
  warning: 'Avertissement',
  error: 'Erreur',
  neutral: 'Neutre',
  superadmin: 'Super admin (dégradé animé)',
};

//? Couleurs de la v4, reprises pour les rôles qui portent le même nom.
export const DEFAULT_ROLE_STYLES: Record<string, RoleStyle> = {
  translator: 'primary',
  moderator: 'warning',
  sysadmin: 'secondary',
  admin: 'error',
  superadmin: 'superadmin',
};

//? Les classes sont écrites en toutes lettres : Tailwind ne garde que celles qu'il lit dans le code.
const TEXT: Record<RoleStyle, string> = {
  default: '',
  primary: 'text-primary',
  secondary: 'text-secondary',
  accent: 'text-accent',
  info: 'text-info',
  success: 'text-success',
  warning: 'text-warning',
  error: 'text-error',
  neutral: 'text-base-content/70',
  superadmin: 'role-superadmin',
};

const BADGE: Record<RoleStyle, string> = {
  default: 'border-base-content/30 text-base-content/80',
  primary: 'border-primary/45 bg-primary/12 text-primary',
  secondary: 'border-secondary/45 bg-secondary/12 text-secondary',
  accent: 'border-accent/45 bg-accent/12 text-accent',
  info: 'border-info/45 bg-info/12 text-info',
  success: 'border-success/45 bg-success/12 text-success',
  warning: 'border-warning/45 bg-warning/12 text-warning',
  error: 'border-error/45 bg-error/12 text-error',
  neutral: 'border-base-content/45 bg-base-content/10 text-base-content/70',
  superadmin: 'role-superadmin border-primary/45',
};

//? Classe à poser sur le pseudo d'un membre du rôle.
export const roleNameClass = (style: unknown) => TEXT[toRoleStyle(style)];

//? Classes de couleur du badge du rôle (la forme est dans `RoleBadge.svelte`).
export const roleBadgeClass = (style: unknown) => BADGE[toRoleStyle(style)];
