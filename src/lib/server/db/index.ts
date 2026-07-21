import { drizzle } from 'drizzle-orm/mysql2';
import { envConfig } from '$lib/server/env';

export const db = drizzle({
  connection: {
    uri: envConfig.DATABASE_URL,
  },
});
