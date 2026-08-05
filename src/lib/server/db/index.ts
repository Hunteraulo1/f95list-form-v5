import { defineRelations } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/mysql2';
import { envConfig } from '$lib/server/env';
import * as schema from './schema';

const relations = defineRelations(schema);

export const db = drizzle(envConfig.DATABASE_URL, { relations });
