//? Temporaire : en attendant le système de droits, personne ne peut voir le contenu inactif.
//? À remplacer par une vérification de permission par utilisateur (ex: admin/modérateur) une fois implémentée.
export const VIEW_ACTIVE_ONLY = true;

//? Repli utilisé par migrate-v4 quand aucun historique v4 (table `update`) n'existe pour
//? une ligne migrée. Sert aussi de sentinelle pour distinguer un createdAt/updatedAt réel
//? d'un createdAt/updatedAt inconnu ailleurs dans l'app (ex. page /updates).
export const UNKNOWN_HISTORY_DATE = new Date('2024-01-01T00:00:00Z');
