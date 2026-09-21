# Passation : utiliser l'API du scraper depuis f95list-form-v5

Document destiné à la personne (ou à l'agent) qui intègre le scraper dans le projet principal, `f95list-form-v5`. Il décrit ce que fait le service, son contrat HTTP exact, les règles d'écriture en base, et ce qu'il reste à faire côté principal.

Rédigé le 21 septembre 2026. Le code du scraper est dans le dépôt `f95list-form-v5-scraper` ; ses fichiers de référence sont cités en section 10.

## 1. Résumé

- **Rôle** : le scraper est le seul à parler à l'API de cache de WillyJL (`api.f95checker.dev`, celle de F95Checker). Il en tire les données des jeux F95zone et **les écrit directement dans la base MariaDB du projet principal**. Il n'a pas d'interface.
- **Deux usages depuis le principal** :
  1. **Nouveau jeu** : récupérer les infos d'un thread (`GET /threads/:threadId`), puis remplir le jeu créé, nom compris (`POST /games/:gameId/refresh` avec `updateName: true`).
  2. **Actualisation manuelle** d'un jeu : `POST /games/:gameId/refresh`, le nom n'est **pas** modifié.
- **Mises à jour automatiques** : déclenchées par Coolify (pas par le principal), toutes les 6 h pour les jeux actifs et une fois par jour pour les autres. Le principal n'a rien à faire pour ça.
- **Périmètre** : uniquement les jeux dont l'origine est **F95zone**. Les autres origines (LewdCorner, Autre) sont ignorées et renvoient `422` en actualisation manuelle.
- **Sécurité** : toutes les routes (sauf `/health`) demandent un token `Authorization: Bearer …`. Le principal doit appeler le scraper **depuis son serveur uniquement**, jamais depuis le navigateur.

## 2. Ce qui est déjà fait dans le principal

Dans `f95list-form-v5`, branche `dev`, deux migrations ajoutent les colonnes que le scraper remplit :

| Migration | Colonnes de `game` |
|---|---|
| `Migration20260921120000_add_game_last_change` | `last_change` |
| `Migration20260921130000_add_game_f95checker_data` | `developer`, `last_updated`, `score`, `votes`, `downloads` (json), `reviews` (json) |

Elles sont appliquées sur la base de dev. **Elles restent à appliquer en production** avant de déployer le scraper (`bun run db:migration:up`).

## 3. Connexion

À ajouter dans le principal (noms proposés, au choix) :

```env
# .env.example
SCRAPER_URL=http://localhost:3000
SCRAPER_TOKEN=
```

- `SCRAPER_TOKEN` est la valeur de `AUTH_TOKEN` dans le `.env` du scraper (16 caractères minimum). En dev, elle est déjà générée dans `f95list-form-v5-scraper/.env`.
- En production, l'URL est celle du service Coolify du scraper, de préférence sur le réseau interne : il n'a pas besoin d'être exposé publiquement.
- Chaque appel : `Authorization: Bearer <SCRAPER_TOKEN>`, `Content-Type: application/json` pour les `POST`.

## 4. Contrat HTTP

Tous les corps de réponse sont du JSON, sauf `401` (texte `Unauthorized`).

### `GET /health`
Sans authentification. `200 { "status": "ok" }`.

### `POST /games/:gameId/refresh` : actualiser un jeu ou remplir un nouveau jeu

`gameId` est l'id du jeu **en base** (`game.id`). Corps optionnel :

```json
{ "updateName": false }
```

- `updateName` : `false` par défaut. Mettre `true` **pour un nouveau jeu** ; laisser `false` pour une actualisation d'un jeu existant, dont le nom a pu être corrigé à la main.

L'appel ne compare **pas** au `last_change` connu : il va chercher la donnée fraîche et l'écrit toujours.

**Succès `200`** :

```json
{
  "ok": true,
  "gameId": 1030,
  "threadId": 26476,
  "lastChange": 1789388586,
  "nameUpdated": false,
  "games": 1,
  "editions": 1,
  "thread": { "…": "voir section 5" }
}
```

- `games` : nombre de lignes `game` touchées (1 normalement). `editions` : nombre d'éditions mises à jour (peut être 0 si aucune édition n'est en `auto_check`).
- `nameUpdated` : vrai seulement si `updateName` était vrai **et** que le thread a un nom.

**Erreurs** :

| Statut | Corps | Cause |
|---|---|---|
| `400` | `{"error":"invalid_request"}` | `gameId` non numérique, ou corps invalide (`updateName` doit être un booléen) |
| `401` | `Unauthorized` | token absent ou faux |
| `404` | `{"error":"game_not_found"}` | aucun jeu avec cet id |
| `404` | `{"error":"thread_not_found"}` | le thread n'existe plus chez F95 (supprimé, privé, déplacé). Rien n'est écrit |
| `422` | `{"error":"unsupported_origin"}` | le jeu n'est pas d'origine F95zone |
| `422` | `{"error":"no_thread"}` | le jeu n'a pas de `thread_id` |
| `502` | `{"error":"<kind>","message":"…"}` | l'API de WillyJL est indisponible, lente ou a répondu de travers. `kind` vaut `network`, `http`, `invalid_response`, `index_error` ou `bad_request` |
| `500` | `{"error":"internal_error"}` | erreur inattendue (voir les logs du scraper) |

### `GET /threads/:threadId` : aperçu d'un jeu qui n'existe pas encore

`threadId` est l'id du thread F95zone (1 à 999999). **Rien n'est écrit en base.** Sert à pré-remplir le formulaire de création.

```json
{
  "threadId": 1000,
  "lastChange": 1782662170,
  "editionStatus": "completed",
  "thread": { "…": "voir section 5" }
}
```

`editionStatus` vaut déjà une valeur de `game_edition.status` (`in_progress`, `completed`, `abandoned`, `on_hold`), ou `null` si l'API renvoie un statut inconnu.

Erreurs : `400 invalid_request`, `401`, `404 thread_not_found`, `502`, `500`, comme ci-dessus.

### `POST /sync` : lancer un cycle (normalement appelé par Coolify)

Le principal n'a pas besoin de l'appeler, mais peut le faire (par exemple un bouton d'administration). Corps optionnel : `{ "scope": "active" | "inactive" | "all" }` (`all` par défaut).

| Statut | Corps |
|---|---|
| `202` | `{"started":true,"scope":"active","total":2521}` : le cycle tourne en arrière-plan |
| `200` | `{"started":false,"total":0}` : aucun jeu à suivre pour ce scope |
| `409` | `{"error":"sync_already_running"}` : un cycle est déjà en cours |
| `400` | `{"error":"invalid_body","issues":{…}}` |

Répond immédiatement : un cycle peut durer des heures (la première synchro « à froid » notamment).

### `GET /status` : suivre le cycle

```json
{ "state": "idle", "lastReport": { "…": "rapport" } , "lastError": null }
```

```json
{
  "state": "running",
  "runId": "…", "scope": "active", "startedAt": 1789990000000,
  "progress": { "total": 2521, "checked": 1200, "changed": 34, "fullDone": 30 },
  "lastReport": null
}
```

Rapport d'un cycle terminé (`lastReport`) : `total`, `checked`, `changed`, `fullDone`, `updated`, `unchanged`, `notFound`, `failed`, `aborted` (booléen), `durationMs`. L'état est **en mémoire** : il est perdu si le scraper redémarre, et ne garde que le dernier cycle. Pour l'historique, voir les logs (section 9).

## 5. L'objet `thread`

Renvoyé par `/threads/:threadId` et par `/games/:gameId/refresh`. C'est la donnée **décodée** de l'API de WillyJL (les chaînes et les listes JSON de l'original sont déjà converties en vrais types) :

```ts
type Thread = {
  name: string;
  version: string | null;        // null si vide côté API
  developer: string | null;
  type: number;                  // identifiant F95, non converti
  status: number;                // identifiant F95 (voir §6), utiliser editionStatus
  tags: number[];                // identifiants F95, non convertis
  unknownTags: unknown[];
  lastUpdated: number;           // unix, secondes
  score: number;                 // 0 à 5
  votes: number;
  downloads: { platform: string; links: { host: string; url: string }[] }[];
  imageUrl: string | null;       // null si le thread n'a pas d'image
  previewsUrls: string[];
  reviewsTotal: number;
  reviews: { user: string; score: number; message: string; likes: number; timestamp: number }[];
  description: string;
  changelog: string;
  cachedAt: number;              // unix, dernière indexation par l'API de WillyJL
};
```

Points d'attention :

- `downloads` est renvoyé **tel que décodé, non filtré** : il peut contenir des « liens » qui sont en réalité des XPath hérités (`//a[starts-with(@href,'https://mixdrop.ag/')][1]`). Ils sont inutilisables. Le scraper les écarte quand il écrit `game.downloads` en base, mais pas dans cette réponse : ne les affiche pas tels quels dans le formulaire de création.
- Un thread qui n'est pas un jeu (discussion, ressource) renvoie quand même un `thread` valide, avec `type` 1 et `status` 1 et des listes vides. Rien dans l'API ne le distingue d'un vrai jeu à part ces valeurs.
- `type` et `tags` ne sont pas convertis en libellés (voir section 8).

## 6. Ce qui est écrit en base

| Table | Colonnes | Condition |
|---|---|---|
| `game` | `description`, `image_external`, `developer`, `last_updated`, `downloads`, `reviews`, `score`, `votes`, `last_change` | toujours, pour les jeux F95zone dont le `thread_id` correspond |
| `game` | `name` | **uniquement si `updateName: true`** ; jamais par le cron |
| `game_edition` | `version`, `status`, `last_auto_check` | uniquement les éditions avec `auto_check = 1` **et** `active = 1` |

Jamais touchés : `description_fr`, `image_internal`, `link`, `auto_check`, `active`, les traductions.

Règles de conversion :

- **Une valeur vide ou inconnue côté API n'efface jamais la base** : description vide, pas d'image, pas de développeur, pas de version, pas de lien, statut inconnu. Exceptions ci-dessous.
- **`score` et `votes` sont écrits tels quels, et un jeu sans vote a `score` nul** (le `0.0` de l'API signifie « pas noté »).
- **`last_updated` est écrit en UTC.** À lire comme de l'UTC côté principal (voir section 8).
- **`downloads` (json)** : `[{platform, links:[{host, url}]}]`, sans les liens XPath ; une plateforme qui n'a plus de lien est retirée. Si plus aucun lien utilisable n'existe, la colonne garde sa valeur précédente.
- **`reviews` (json)** : `[{user, score, message, likes, timestamp}]`, tel que renvoyé.
- **`version`** est tronquée à 36 caractères (taille de la colonne).
- **`status`** est converti ainsi : `1` → `in_progress`, `2` → `completed`, `3` → `on_hold`, `4` → `abandoned`. `1`, `2` et `4` ont été vérifiés sur nos données ; `3` est déduit (aucun jeu `on_hold` en base pour le contrôler). Tout autre identifiant laisse le statut de la base intact.
- **`last_change`** est le timestamp Unix renvoyé par l'API de WillyJL. Le cron ne redemande les données complètes d'un jeu que si ce timestamp a augmenté.

L'écriture d'un jeu est **transactionnelle** : tout ou rien.

## 7. Comment l'intégrer

### Création d'un jeu (étape « Thread » de l'assistant)
1. Quand l'utilisateur saisit un `threadId` (origine F95zone), appeler `GET /threads/:threadId` côté serveur, et pré-remplir le formulaire : nom, description, image, développeur, version, `editionStatus`.
2. Créer le jeu comme aujourd'hui.
3. Appeler `POST /games/:gameId/refresh` avec `{ "updateName": true }` pour écrire le reste (score, avis, liens, `last_change`…). Sans cet appel, le jeu n'aurait pas de `last_change` et le premier cycle le traiterait comme jamais synchronisé, ce qui est acceptable mais fait un appel de plus.

Si l'utilisateur a saisi lui-même le nom dans le formulaire et veut le garder, passer `updateName: false` : c'est la règle « nouveau jeu = nom du thread » qui devient un choix de ta part.

### Bouton « Actualiser » sur un jeu
`POST /games/:gameId/refresh` avec `{}` (le nom n'est jamais modifié). Afficher ensuite le jeu rechargé depuis la base, ou utiliser directement `thread` de la réponse.

### Appels côté serveur, avec vérification des droits
Passer par une action ou une route serveur SvelteKit, après avoir vérifié les permissions de l'utilisateur (par exemple `game.edit` pour l'actualisation). Ne jamais exposer `SCRAPER_TOKEN` au navigateur.

### Gestion des erreurs à prévoir dans l'interface
- `404 thread_not_found` : dire que le thread n'existe plus chez F95zone.
- `422 unsupported_origin` : masquer ou désactiver le bouton pour les jeux qui ne sont pas F95zone.
- `502` : l'API de WillyJL est indisponible ou lente ; proposer de réessayer plus tard. Ne pas boucler.

### Durée des appels
Normalement moins d'une seconde. Mais `/fast` chez WillyJL peut être lent, et le scraper l'exécute **un seul à la fois pour tout le service** : une actualisation manuelle attend son tour derrière les appels en cours (un cycle en cours ne la bloque pas jusqu'à sa fin). Au pire, comptez plusieurs dizaines de secondes, et théoriquement jusqu'à 240 s (deux appels de 120 s au maximum). Recommandation : timeout côté principal d'environ **150 s** et un indicateur de chargement.

### Limiter les abus (recommandation)
Chaque actualisation manuelle sollicite l'API de WillyJL, qui a demandé de ne pas la surcharger. Prévoir côté principal une limite par jeu (par exemple une actualisation par minute) et par utilisateur.

## 8. Points ouverts et à trancher côté principal

1. **Lire `last_updated` comme de l'UTC.** MikroORM lit un `datetime` selon le fuseau du serveur : configurer son fuseau en UTC, ou lancer l'app en UTC, sinon les dates seront décalées.
2. **Tags non synchronisés.** L'API renvoie des identifiants numériques de tags F95 ; ta table `game_tags` a des noms. Il manque la correspondance id → nom. Elle vient du code de F95Checker (licence GPLv3) : décision de reprise à prendre. Les tags du jeu ne sont donc jamais modifiés par le scraper pour l'instant.
3. **`type` non converti** (moteur du jeu), pas de colonne en base pour l'instant.
4. **Threads supprimés** (`sync.game.not_found` dans les logs, `404 thread_not_found` en manuel) : aucune politique définie (archiver le jeu, l'ignorer, alerter). Pour l'instant, rien n'est modifié en base.
5. **`reviews`** contient des pseudos et des messages de tiers copiés du forum : à valider côté RGPD.
6. **Compte MariaDB du scraper** à créer en production, limité à `SELECT` et `UPDATE` sur `game`, `game_edition`, `game_translation` et `origin-website`.
7. **Première synchro à froid** : prévenir WillyJL avant le premier cycle sur environ 2 700 jeux (voir le passation d'origine sur l'API de WillyJL, section 8.1).

## 9. Suivi et logs

Le scraper écrit des logs JSON (format ECS) sur la sortie standard, destinés à l'ELK de la v5 : pas de table de logs en base. Événements utiles : `sync.started` / `sync.finished` (avec `outcome` : `success`, `partial`, `aborted`, `failed`), `sync.game.updated`, `sync.game.not_found`, `sync.game.failed`, `game.refreshed`, `indexer.request` (latence de l'API de WillyJL). La liste complète et des requêtes Kibana sont dans le README du scraper.

## 10. Checklist côté principal

- [ ] Appliquer les migrations `last_change` et `f95checker_data` en production.
- [ ] Ajouter `SCRAPER_URL` et `SCRAPER_TOKEN` (et `.env.example`).
- [ ] Écrire un petit client serveur pour les deux routes utiles (`refresh` et `threads`), avec timeout d'environ 150 s et validation Valibot des réponses.
- [ ] Étape « Thread » de l'assistant : appeler `GET /threads/:threadId` et pré-remplir.
- [ ] Après création d'un jeu F95zone : `POST /games/:gameId/refresh` avec `updateName: true`.
- [ ] Bouton « Actualiser » (droits vérifiés, limite d'appels, gestion des erreurs de la section 4).
- [ ] Lire `last_updated` en UTC.
- [ ] Afficher (ou non) `developer`, `last_updated`, `score`, `votes`, `downloads`, `reviews` dans la page d'un jeu.
- [ ] Trancher les points 2 à 5 de la section 8.

## 11. Références (dépôt du scraper)

| Sujet | Fichier |
|---|---|
| Routes et codes de réponse | `src/server/app.ts` |
| Conversion des valeurs écrites en base | `src/db/columns.ts` |
| Requêtes SQL (tables et colonnes touchées) | `src/db/games.ts` |
| Mapping des statuts | `src/mapping.ts` |
| Actualisation manuelle | `src/sync/refresh.ts` |
| Format des réponses de l'API de WillyJL | `docs/api.md` |
| Configuration, déploiement Coolify, logs | `README.md` |
