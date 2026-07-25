import { drizzle } from 'drizzle-orm/mysql2';
import { envConfig } from '$lib/server/env';
import * as schema from './schema';

export const db = drizzle({
  connection: {
    uri: envConfig.DATABASE_URL,
  },
  schema,
  mode: 'default',
});
