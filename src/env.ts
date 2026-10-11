import { defineEnvVars } from '@sveltejs/kit/env';
import * as v from 'valibot';

//? Variables d'environnement de l'application, validées au démarrage et lues via `$app/env/private`.
//? Toutes privées (serveur uniquement) et lues à l'exécution, pas figées à la compilation.
export const variables = defineEnvVars({
  DATABASE_URL: { schema: v.pipe(v.string(), v.minLength(1)) },

  REDIS_URL: { schema: v.optional(v.string()) },

  ZITADEL_DOMAIN: { schema: v.optional(v.string()) },

  ZITADEL_CLIENT_ID: { schema: v.optional(v.string()) },

  ZITADEL_CLIENT_SECRET: { schema: v.optional(v.string()) },

  //? Projet Zitadel qui porte les rôles communs à tous les services, et jeton du compte de service
  //? autorisé à les attribuer (voir `auth/zitadel-roles.ts`).
  ZITADEL_PROJECT_ID: { schema: v.optional(v.string()) },

  ZITADEL_SERVICE_TOKEN: { schema: v.optional(v.string()) },

  SCRAPER_URL: { schema: v.optional(v.string()) },

  SCRAPER_AUTH_TOKEN: { schema: v.optional(v.string()) },

  LIBRETRANSLATE_URL: { schema: v.optional(v.string()) },

  LIBRETRANSLATE_API_KEY: { schema: v.optional(v.string()) },

  LOG_LEVEL: {
    schema: v.optional(v.picklist(['debug', 'info', 'warn', 'error']), 'info'),
  },
});
