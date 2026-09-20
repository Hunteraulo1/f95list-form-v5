export interface PermissionDefinition {
  label: string;
  description: string;
  group: string;
  //? Permission parente : sans elle, celle-ci n'a pas de sens (ex. gérer les rôles sans accéder à l'administration).
  requires?: string;
}

//? Catalogue des permissions : la source de vérité côté code. Quel rôle a quoi est en base
//? (table `role_permission`, éditable sur /admin/roles).
export const PERMISSIONS = {
  'admin.access': {
    label: "Accéder à l'administration",
    description: "Voir l'espace d'administration.",
    group: 'Administration',
  },
  'manage.users': {
    label: 'Gérer les utilisateurs',
    description: 'Consulter et modifier les utilisateurs.',
    group: 'Administration',
    requires: 'admin.access',
  },
  'users.view_email': {
    label: 'Voir les e-mails des utilisateurs',
    description:
      "Afficher l'adresse e-mail des comptes dans la liste des utilisateurs.",
    group: 'Administration',
    requires: 'manage.users',
  },
  'users.impersonate': {
    label: "Prendre la place d'un utilisateur",
    description:
      "Naviguer en tant qu'un autre compte (jamais un super admin, ni un rôle plus fort que le sien), avec retour immédiat à son compte.",
    group: 'Administration',
    requires: 'manage.users',
  },
  'manage.roles': {
    label: 'Gérer les rôles',
    description: 'Modifier les permissions et quotas des rôles plus faibles.',
    group: 'Administration',
    requires: 'admin.access',
  },
  'manage.api': {
    label: 'Gérer les clés API',
    description: 'Voir, limiter et révoquer les clés API de tous.',
    group: 'Administration',
    requires: 'admin.access',
  },
  'manage.game': {
    label: 'Gérer les jeux',
    description: 'Modifier les jeux, éditions et traductions.',
    group: 'Contenu',
  },
} as const satisfies Record<string, PermissionDefinition>;

export type Permission = keyof typeof PERMISSIONS;

export const PERMISSION_KEYS = Object.keys(PERMISSIONS) as Permission[];

export const isPermission = (value: string): value is Permission =>
  Object.hasOwn(PERMISSIONS, value);

//? Ce rôle a toutes les permissions sans passer par la base : impossible de se verrouiller
//? hors de l'administration en décochant une case. Il est au-dessus de tous les autres rôles,
//? et seul un super admin peut le modifier ou l'attribuer.
export const SUPER_ROLE = 'superadmin';

//? La force du super admin est fixe et supérieure à toute force réglable : aucun autre rôle ne
//? peut l'égaler, donc personne ne peut se hisser à son niveau.
export const SUPER_ROLE_PRIORITY = 1000;
export const MAX_ROLE_PRIORITY = SUPER_ROLE_PRIORITY - 1;

export const getPermissionParent = (key: string): Permission | undefined => {
  if (!isPermission(key)) return undefined;

  const definition: PermissionDefinition = PERMISSIONS[key];
  return definition.requires as Permission | undefined;
};

export const getDependentPermissions = (key: string): Permission[] =>
  PERMISSION_KEYS.filter((candidate) => getPermissionParent(candidate) === key);

//? Ne garde que les permissions connues dont le parent est aussi accordé.
export const enforcePermissionDependencies = (
  keys: Iterable<string>,
): Permission[] => {
  const granted = new Set([...keys].filter(isPermission));

  let changed = true;
  while (changed) {
    changed = false;
    for (const key of granted) {
      const parent = getPermissionParent(key);
      if (parent && !granted.has(parent)) {
        granted.delete(key);
        changed = true;
      }
    }
  }

  return PERMISSION_KEYS.filter((key) => granted.has(key));
};

export interface PermissionGroup {
  group: string;
  items: (PermissionDefinition & { key: Permission })[];
}

//? Le catalogue groupé pour l'affichage, limité aux permissions de `only` si fourni.
export const permissionGroups = (only?: ReadonlySet<string>) => {
  const groups = new Map<string, PermissionGroup['items']>();

  for (const key of PERMISSION_KEYS) {
    if (only && !only.has(key)) continue;

    const definition: PermissionDefinition = PERMISSIONS[key];
    groups.set(definition.group, [
      ...(groups.get(definition.group) ?? []),
      { key, ...definition },
    ]);
  }

  return [...groups].map(
    ([group, items]): PermissionGroup => ({ group, items }),
  );
};

//? Décoche les permissions dont le parent n'est pas coché (état des cases de la page rôles).
export const applyDependenciesToChecks = (checks: Record<string, boolean>) => {
  const next = { ...checks };

  let changed = true;
  while (changed) {
    changed = false;
    for (const key of Object.keys(next)) {
      const parent = getPermissionParent(key);
      if (next[key] && parent && !next[parent]) {
        next[key] = false;
        changed = true;
      }
    }
  }

  return next;
};
