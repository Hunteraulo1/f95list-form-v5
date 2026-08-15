import { defineRelations } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/mysql2';
import { createPool } from 'mysql2';
import { envConfig } from '$lib/server/env';
import * as schema from './schema';

const relations = defineRelations(schema);

const client = createPool(envConfig.DATABASE_URL);

export const db = drizzle({ client, relations });
