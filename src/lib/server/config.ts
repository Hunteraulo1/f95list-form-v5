//? Temporaire : en attendant le système de droits, personne ne peut voir le contenu inactif.
//? À remplacer par une vérification de permission par utilisateur (ex: admin/modérateur) une fois implémentée.
export const VIEW_ACTIVE_ONLY = true;

//? Durée maximale d'une prise de place d'un autre utilisateur : passé ce délai, on revient
//? automatiquement à son propre compte.
export const IMPERSONATION_TTL_MS = 2 * 60 * 60 * 1000;

//? Repli utilisé par migrate-v4 quand aucun historique v4 (table `update`) n'existe pour
//? une ligne migrée. Sert aussi de sentinelle pour distinguer un createdAt/updatedAt réel
//? d'un createdAt/updatedAt inconnu ailleurs dans l'app (ex. page /updates).
export const UNKNOWN_HISTORY_DATE = new Date('2024-01-01T00:00:00Z');

//? Temporaire : en attendant l'auth Zitadel, l'utilisateur « connecté » est toujours celui-ci.
//? À remplacer par l'id résolu depuis la session. migrate-v4 conserve les id v4, donc cet UUID
//? existe après une migration ; sinon, prendre un id de la table `user` (ex. après db:seed).
export const DEV_USER_ID = '267073f1-69f6-491c-9118-75f7c055afae';
