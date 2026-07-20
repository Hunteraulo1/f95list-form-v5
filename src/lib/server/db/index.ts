import { envConfig } from '$lib/server/env';
import { drizzle } from 'drizzle-orm/mysql2';

export const db = drizzle({
	connection: {
		uri: envConfig.DATABASE_URL,
	},
});
