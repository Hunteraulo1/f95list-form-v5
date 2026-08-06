import { defineRelations } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/mysql2';
import { createPool } from 'mysql2';
import { envConfig } from '$lib/server/env';
import * as schema from './schema';

const relations = defineRelations(schema);

// drizzle-orm@1.0.0-rc.4's mysql2 driver assumes a callback-style `Pool` (`client.config` set directly);
// passing a plain connection string internally goes through mysql2/promise's `createPool`, whose returned
// `PromisePool` only exposes `.config` via `.pool.config`, and drizzle crashes on the direct assignment.
const client = createPool(envConfig.DATABASE_URL);

export const db = drizzle({ client, relations });
