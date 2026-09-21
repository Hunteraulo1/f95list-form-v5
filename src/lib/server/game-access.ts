import type { SessionUser } from '$lib/server/hooks/auth';

//? Règles d'accès aux jeux et traductions, écrites une seule fois : la fiche de jeu s'en sert pour
//? masquer les boutons, et les actions serveur d'édition devront s'en servir pour refuser (masquer
//? un bouton ne protège rien).
type Viewer = Pick<SessionUser, 'id' | 'permissions'> | null;

const has = (viewer: Viewer, permission: SessionUser['permissions'][number]) =>
  viewer?.permissions.includes(permission) ?? false;

export const canCreateGame = (viewer: Viewer) => has(viewer, 'game.create');

//? Modifier un jeu n'est pas le créer : deux permissions distinctes.
export const canEditGame = (viewer: Viewer) => has(viewer, 'game.edit');

//? Choisir l'auto-check à la création (étapes « Auto-check » et « Validation » de l'assistant).
export const canManageAutoCheck = (viewer: Viewer) =>
  has(viewer, 'game.auto_check');

export const canAddTranslation = (viewer: Viewer) =>
  has(viewer, 'translation.add');

export interface TranslationOwner {
  userId: string;
  type: 'translator' | 'proofreader' | null;
}

//? Une traduction appartient à ses traducteurs ; les relecteurs n'en sont pas propriétaires (ils
//? ont besoin du droit de modifier celles des autres). Un crédit anonyme reste un propriétaire.
export const ownsTranslation = (viewer: Viewer, owners: TranslationOwner[]) =>
  viewer !== null &&
  owners.some(
    ({ userId, type }) => userId === viewer.id && type !== 'proofreader',
  );

//? Modifier une traduction : la sienne, ou celle des autres avec la permission dédiée.
export const canEditTranslation = (
  viewer: Viewer,
  owners: TranslationOwner[],
) => has(viewer, 'translation.edit_others') || ownsTranslation(viewer, owners);
