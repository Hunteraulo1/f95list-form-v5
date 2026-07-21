import * as v from 'valibot';

export const envSchema = v.object({
  DATABASE_URL: v.pipe(v.string(), v.minLength(1)),

  REDIS_URL: v.optional(v.string()),

  ZITADEL_DOMAIN: v.optional(v.string()),

  ZITADEL_CLIENT_ID: v.optional(v.string()),

  ZITADEL_CLIENT_SECRET: v.optional(v.string()),

  LOG_LEVEL: v.optional(v.picklist(['debug', 'info', 'warn', 'error']), 'info'),
});

export type Env = v.InferOutput<typeof envSchema>;
